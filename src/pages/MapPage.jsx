import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Navigation, Activity, Sliders, Navigation2, X } from 'lucide-react';

// Fix default Leaflet marker icons broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Mock pins – in production these come from the API
const mockPins = [
  {
    id: 1,
    type: 'food',
    name: 'Freshly Baked Bread (20 loaves)',
    provider: 'Sunrise Bakery',
    expiresIn: '4 hours',
    position: null, // will be offset from user
    offsetLat: 0.008,
    offsetLng: 0.004,
  },
  {
    id: 2,
    type: 'food',
    name: 'Surplus Rice & Curry (50 meals)',
    provider: 'Grand Hotel',
    expiresIn: '2.5 hours',
    position: null,
    offsetLat: -0.005,
    offsetLng: 0.009,
  },
  {
    id: 3,
    type: 'orphanage',
    name: 'Hope For All Orphanage',
    provider: null,
    expiresIn: null,
    position: null,
    offsetLat: 0.003,
    offsetLng: -0.007,
  },
  {
    id: 4,
    type: 'food',
    name: 'Assorted Sandwiches (30 boxes)',
    provider: 'Corporate Catering',
    expiresIn: '8 hours',
    position: null,
    offsetLat: -0.009,
    offsetLng: -0.003,
  },
];

const MapPage = () => {
  const [userPos, setUserPos] = useState([20.5937, 78.9629]); // Default: India center
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Center of the map viewport
  const [realOrphanages, setRealOrphanages] = useState([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [radius, setRadius] = useState(5); // Default 5km
  const [routePoints, setRoutePoints] = useState([]);
  const [showRoute, setShowRoute] = useState(false);
  const [totalDistance, setTotalDistance] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [isRouting, setIsRouting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Your Current Position');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          setUserPos(newPos);
          setMapCenter(newPos);
          setLocationLoading(false);
        },
        () => {
          setLocationLoading(false); // Use default location
        }
      );
    } else {
      setLocationLoading(false);
    }
  }, []);

  // Dynamic Overpass API fetching for orphanages based on the map's current center
  useEffect(() => {
    if (!mapCenter) return;

    const fetchOrphanages = async () => {
      try {
        const radiusInMeters = radius * 1000;
        // Search specifically for social_facility=orphanage or group_home or children's home
        const query = `[out:json];
          (
            node["amenity"="social_facility"]["social_facility"~"group_home|orphanage"](around:${radiusInMeters},${mapCenter[0]},${mapCenter[1]});
            way["amenity"="social_facility"]["social_facility"~"group_home|orphanage"](around:${radiusInMeters},${mapCenter[0]},${mapCenter[1]});
            node["social_facility"="orphanage"](around:${radiusInMeters},${mapCenter[0]},${mapCenter[1]});
            way["social_facility"="orphanage"](around:${radiusInMeters},${mapCenter[0]},${mapCenter[1]});
          );
          out center;`;
        
        const response = await fetch(`https://overpass-api.de/api/interpreter`, {
          method: 'POST',
          body: query
        });
        
        if (!response.ok) return; // Silent fail if API over capacity
        
        const data = await response.json();
        
        const newOrphanages = data.elements.map(el => {
          const lat = el.lat || el.center.lat;
          const lon = el.lon || el.center.lon;
          const name = el.tags?.name || "Verified Local Orphanage";
          
          return {
            id: `osm-${el.id}`,
            type: 'orphanage',
            name: name,
            provider: 'OpenStreetMap Data',
            position: [lat, lon],
            distance: 0 // Will be evaluated dynamically during render
          };
        });
        
        setRealOrphanages(prev => {
           // Accumulate unique orphanages so that as user pans, old ones aren't completely lost 
           // if they pan back. 'isWithinRadius' will automatically hide them if they fall out of range.
           const combined = [...prev, ...newOrphanages];
           const uniqueMap = new Map();
           combined.forEach(item => uniqueMap.set(item.id, item));
           return Array.from(uniqueMap.values());
        });
      } catch (error) {
        console.error("Overpass API error:", error);
      }
    };

    // Debounce to prevent spamming API on fast scrolls/slider movements
    const timer = setTimeout(fetchOrphanages, 800);
    return () => clearTimeout(timer);
  }, [mapCenter, radius]);

  // Build resolved positions from offsets and calculate distance for MOCK food
  const foodPins = mockPins.filter(p => p.type === 'food').map((p) => {
    const pos = [userPos[0] + p.offsetLat, userPos[1] + p.offsetLng]; // anchor fake food to userPos
    const dist = L.latLng(mapCenter).distanceTo(pos) / 1000; // calculate distance from search center
    return {
      ...p,
      position: pos,
      distance: dist
    };
  });

  // Calculate distance for dynamic real orphanages from search center
  const orphanagePins = realOrphanages.map(p => {
    const dist = L.latLng(mapCenter).distanceTo(p.position) / 1000;
    return { ...p, distance: dist };
  });

  const pins = [...foodPins, ...orphanagePins];

  // Radius filtering logic
  const isWithinRadius = (pin) => {
    return pin.distance <= radius;
  };

  const filtered = pins.filter(p => {
    const isSelected = showRoute && routePoints.length > 0 && 
                      routePoints[routePoints.length - 1][0] === p.position[0] && 
                      routePoints[routePoints.length - 1][1] === p.position[1];

    if (isSelected) return true;

    const typeMatch = activeFilter === 'All' || 
                    (activeFilter === 'Food' && p.type === 'food') || 
                    (activeFilter === 'Orphanages' && p.type === 'orphanage');
    return typeMatch && isWithinRadius(p);
  });

  const fetchRoadRoute = async (waypoints) => {
    setIsRouting(true);
    try {
      const coords = waypoints.map(w => `${w[1]},${w[0]}`).join(';');
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM returns [lng, lat], Leaflet needs [lat, lng]
        const roadPoints = route.geometry.coordinates.map(c => [c[1], c[0]]);
        setRoutePoints(roadPoints);
        setTotalDistance((route.distance / 1000).toFixed(2));
        setEstimatedTime(Math.round(route.duration / 60));
        setShowRoute(true);
      }
    } catch (error) {
      console.error("Routing error:", error);
      // Fallback to straight line if API fails
      setRoutePoints(waypoints);
      let dist = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        dist += L.latLng(waypoints[i]).distanceTo(waypoints[i+1]);
      }
      setTotalDistance((dist / 1000).toFixed(2));
      setEstimatedTime(Math.round((dist / 1000) * 2)); // Rough estimate
      setShowRoute(true);
    } finally {
      setIsRouting(false);
    }
  };

  const handleSelectDestination = (pin) => {
    fetchRoadRoute([userPos, pin.position]);
  };

  const clearRoute = () => {
    setShowRoute(false);
    setRoutePoints([]);
    setTotalDistance(0);
    setEstimatedTime(0);
  };

  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(newPos);
        setMapCenter(newPos);
        setLocationLabel('Your Current Position');
        setSearchQuery('');
        clearRoute();
        setIsDetectingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Please check browser permissions.");
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setUserPos([parseFloat(lat), parseFloat(lon)]);
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        // Extract a shorter name for the label (e.g., city name)
        const shortName = display_name.split(',')[0]; 
        setLocationLabel(shortName);
        clearRoute(); // Clear any existing route when moving to a new city
      } else {
        alert("Location not found. Please try a different search term.");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Failed to search location. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const generateOptimalRoute = () => {
    const viableFood = pins.filter(p => p.type === 'food' && p.distance <= radius)
                           .sort((a, b) => a.distance - b.distance);
    const orphanages = pins.filter(p => p.type === 'orphanage' && p.distance <= radius)
                           .sort((a, b) => a.distance - b.distance);
    
    if (viableFood.length > 0 && orphanages.length > 0) {
      fetchRoadRoute([userPos, viableFood[0].position, orphanages[0].position]);
    } else {
      alert("Need at least one food point in radius and one orphanage for an optimal suggestion!");
    }
  };

  const categories = ['All', 'Food', 'Orphanages'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-poppins text-gray-900 tracking-tight">
              Smart Network
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">
              Mapping kindness in your neighborhood
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Radius Slider */}
          <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200 flex items-center gap-3 shrink-0">
            <Sliders className="h-4 w-4 text-gray-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Search Radius</span>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="1" 
                  max="12" 
                  value={radius} 
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-24 accent-primary h-1.5"
                />
                <span className="text-sm font-bold text-gray-700 min-w-[3rem]">{radius} km</span>
              </div>
            </div>
          </div>

            {showRoute ? (
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 text-blue-600 px-4 py-2.5 rounded-2xl font-bold text-sm border border-blue-200 flex flex-col items-center">
                  <span className="text-[10px] uppercase opacity-60">Route Info</span>
                  <div className="flex gap-2">
                    <span>{totalDistance} km</span>
                    <span className="opacity-40">|</span>
                    <span>{estimatedTime} min</span>
                  </div>
                </div>
                <button
                  onClick={clearRoute}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-sm bg-blue-500 text-white shadow-blue-200 hover:bg-blue-600 self-stretch"
                >
                  <X className="h-4 w-4" /> Clear
                </button>
              </div>
            ) : (
              <button
                onClick={generateOptimalRoute}
                disabled={isRouting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-sm bg-white border border-gray-200 text-gray-700 hover:border-orange-200 hover:bg-orange-50 disabled:opacity-50"
              >
                <Navigation2 className={`h-4 w-4 ${isRouting ? 'animate-spin' : ''}`} />
                {isRouting ? 'Calculating...' : 'Suggest Optimal'}
              </button>
            )}

          {/* Search */}
          <form className="relative flex-1 lg:w-64" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search location (e.g., Chennai)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
            {isSearching ? (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            )}
          </form>
        </div>
      </div>

      {/* Filters & Legend */}
      <div className="flex gap-3 overflow-x-auto pb-1 items-center">
        <div className="flex gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveFilter(c)}
              className={`whitespace-nowrap px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeFilter === c
                  ? 'bg-gray-900 text-white shadow-lg scale-105'
                  : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4 bg-white/80 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-2.5 shrink-0 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-sm shadow-primary/40"></span> Food
          </span>
          <span className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-400/40"></span> Orphanage
          </span>
          <span className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-400/40"></span> You
          </span>
        </div>
      </div>

      {/* Map Implementation */}
      <div className="relative rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl bg-gray-100 group" style={{ height: 'calc(100vh - 360px)', minHeight: 450 }}>
        {locationLoading ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-gray-900 font-bold font-poppins text-lg">Pinpointing your location...</p>
            </div>
          </div>
        ) : (
          <>
            <MapContainer
              center={userPos}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Filtering Radius Circle */}
              <Circle
                center={mapCenter}
                radius={radius * 1000}
                pathOptions={{ 
                  color: '#22C55E', 
                  fillColor: '#22C55E', 
                  fillOpacity: 0.05, 
                  weight: 2, 
                  dashArray: '8, 8' 
                }}
              />

              {/* Recommended Route */}
              {showRoute && routePoints.length > 0 && (
                <Polyline 
                  positions={routePoints}
                  pathOptions={{ 
                    color: '#3B82F6', 
                    weight: 6, 
                    dashArray: '1, 10',
                    lineJoin: 'round',
                    opacity: 0.8
                  }}
                />
              )}

              {/* User Location */}
              <Marker
                position={userPos}
                icon={new L.DivIcon({
                  className: '',
                  html: `
                    <div style="position:relative;width:24px;height:24px;">
                      <div style="position:absolute;inset:0;background:#F97316;opacity:0.3;border-radius:50%;animation:ping 2s infinite;"></div>
                      <div style="position:absolute;inset:4px;background:#F97316;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);"></div>
                    </div>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                })}
              >
                <Popup>
                  <div className="p-1 font-bold text-gray-900 capitalize">📍 {locationLabel}</div>
                </Popup>
              </Marker>

              {/* Filtered Data Pins (Minimalist Circles - Only Orphanages or active destination) */}
              {filtered.map((pin) => {
                const isSelected = showRoute && routePoints.length > 0 && 
                                  pin.position[0] === routePoints[routePoints.length - 1][0] && 
                                  pin.position[1] === routePoints[routePoints.length - 1][1];
                
                if (pin.type !== 'orphanage' && !isSelected) return null;

                return (
                  <CircleMarker
                    key={pin.id}
                    center={pin.position}
                    radius={isSelected ? 10 : 8}
                    pathOptions={{
                      fillColor: '#3B82F6',
                      color: 'white',
                      weight: isSelected ? 3 : 2,
                      fillOpacity: 0.9
                    }}
                  >
                    <Popup>
                      <div className="p-1" style={{ minWidth: 200 }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-lg ${pin.type === 'food' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            <MapPin className="h-4 w-4" />
                          </div>
                          <p className="font-bold text-gray-900 truncate">{pin.name}</p>
                        </div>
                        
                        <div className="flex flex-col gap-1 text-xs text-gray-500 mb-2">
                          {pin.provider && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-400">Source:</span> {pin.provider}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 font-bold text-primary">
                            <Navigation2 className="h-3 w-3" />
                            <span>Distance: {pin.distance.toFixed(2)} km</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 gap-2">
                          <button className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all ${pin.type === 'food' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                            {pin.type === 'food' ? 'Request Pack' : 'View Hub'}
                          </button>
                          <button 
                            onClick={() => handleSelectDestination(pin)}
                            className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                          >
                            <Navigation className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              <MapUpdater center={userPos} />
              <CenterDetector onCenterChange={setMapCenter} />
              <RecenterControl center={userPos} onLiveLocation={handleLiveLocation} isDetecting={isDetectingLocation} />
            </MapContainer>

            {/* Float Info Card */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-xl p-4 rounded-3xl border border-white/50 shadow-2xl max-w-[200px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-primary/20 rounded-2xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Nearby</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{filtered.length} Points</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Showing {activeFilter} within {radius}km of your verified location.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Activity Feed Strip */}
      <div>
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-poppins font-bold text-gray-900 text-lg">In Your Radius</h3>
          <button className="text-sm font-bold text-primary hover:underline">View All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-400">
              <Search className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">No results found in this range.</p>
            </div>
          ) : (
            filtered.map((pin) => (
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                key={pin.id}
                className="min-w-[280px] bg-white border border-gray-100 rounded-[1.5rem] p-5 flex items-start gap-4 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer shadow-sm relative overflow-hidden group"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity ${pin.type === 'food' ? 'bg-primary' : 'bg-blue-500'}`} />
                
                <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${
                  pin.type === 'food' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-900 text-sm truncate pr-2 font-poppins">{pin.name}</h4>
                    <span className="text-[10px] font-bold text-gray-400">{pin.distance.toFixed(1)}km</span>
                  </div>
                  {pin.expiresIn && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider tabular-nums">Expires: {pin.expiresIn}</p>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2 font-medium bg-gray-50 px-2 py-0.5 rounded-md w-fit">{pin.provider || 'Verified NGO'}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Smooth map panning when center changes
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);
  return null;
};

// Detect map panning to update the search radius area
const CenterDetector = ({ onCenterChange }) => {
  useMapEvents({
    moveend: (e) => {
      onCenterChange([e.target.getCenter().lat, e.target.getCenter().lng]);
    }
  });
  return null;
};

// Wrapper component so we can use useMap hook
const RecenterControl = ({ center, onLiveLocation, isDetecting }) => {
  const map = useMap();
  return (
    <div className="leaflet-bottom leaflet-right" style={{ zIndex: 1000 }}>
      {/* Recenter Map Button */}
      <div className="leaflet-control" style={{ margin: 16, marginBottom: 8 }}>
        <button
          onClick={() => map.flyTo(center, 14, { duration: 1.5 })}
          title="Recenter Map"
          style={{
            background: '#22C55E',
            color: 'white',
            border: 'none',
            width: 44,
            height: 44,
            borderRadius: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(34,197,94,0.4)',
            fontSize: 18,
          }}
        >
          ◎
        </button>
      </div>

      {/* Live Geolocation Button */}
      <div className="leaflet-control" style={{ margin: 16, marginTop: 0 }}>
        <button
          onClick={onLiveLocation}
          title="My Live Location"
          disabled={isDetecting}
          style={{
            background: 'white',
            color: '#3B82F6',
            border: '2px solid #3B82F6',
            width: 44,
            height: 44,
            borderRadius: 12,
            cursor: isDetecting ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(59,130,246,0.2)',
          }}
        >
          {isDetecting ? (
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          ) : (
            <Navigation className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MapPage;
