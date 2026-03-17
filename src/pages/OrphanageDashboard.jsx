import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Check, ShieldCheck, AlertCircle, X, Users, Box } from 'lucide-react';
import { getFoodPosts, createRequest, getRequests } from '../services/api';
import socket from '../services/socket';

const OrphanageDashboard = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [foodPosts, setFoodPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [requestQuantity, setRequestQuantity] = useState('');
  const [requestMembers, setRequestMembers] = useState('');

  useEffect(() => {
    fetchFood();
    loadRequests();

    // Listen for new food posts
    socket.on('new_food_available', (newFood) => {
      console.log('New food available:', newFood);
      setFoodPosts(prev => [newFood, ...prev]);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: `New food available: ${newFood.title}`,
        timestamp: new Date()
      }]);
    });

    // Listen for food status updates
    socket.on('food_status_updated', (updatedFood) => {
      console.log('Food status updated:', updatedFood);
      if (updatedFood) {
        setFoodPosts(prev => prev.map(food =>
          food._id === updatedFood._id ? updatedFood : food
        ));
      } else {
        fetchFood();
      }
    });

    // Listen for request updates
    socket.on('request_updated', (updatedRequest) => {
      setMyRequests(prev => prev.map(req =>
        req._id === updatedRequest._id ? updatedRequest : req
      ));
      fetchFood(); // Refresh food list to get the latest status
    });

    return () => {
      socket.off('new_food_available');
      socket.off('food_status_updated');
      socket.off('request_updated');
    };
  }, []);

  const loadRequests = async () => { // Renamed from fetchRequests
    try {
      const currentUserId = localStorage.getItem('userId'); // Get userId from localStorage
      // In a real app, use the actual orphanage ID from auth
      // For this demo, we're fetching all requests or hardcoding the ID used in createRequest
      const res = await getRequests({ orphanageId: currentUserId || 'demo' }); // Use getRequests service
      setMyRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  const fetchFood = async () => {
    try {
      setLoading(true);
      const res = await getFoodPosts();
      setFoodPosts(res.data);
    } catch (err) {
      setError('Could not load food posts. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = (food) => {
    // Don't allow requests on mock data
    if (food._id.startsWith('mock')) {
      alert('This is demo data. Please wait for real food posts from providers.');
      return;
    }

    setSelectedFood(food);
    setRequestQuantity(''); // Start with empty so user explicitly enters desired amount
    setRequestMembers('');
    setIsModalOpen(true);
  };

  const submitRequest = async () => {
    if (!requestQuantity || !requestMembers) {
      alert('Please fill in both quantity and number of members.');
      return;
    }

    const foodId = selectedFood._id;
    setRequestingId(foodId);
    setIsModalOpen(false);

    try {
      const orphanageId = localStorage.getItem('userId'); // Get orphanageId from localStorage
      
      await createRequest({
        food: foodId,
        orphanage: orphanageId, // Use real ID if available
        quantity: requestQuantity,
        membersCount: requestMembers,
        message: `We need food for ${requestMembers} members. Requested quantity: ${requestQuantity}.`,
      });
      setSuccessId(foodId);
      setTimeout(() => setSuccessId(null), 3000);
      loadRequests(); // Refresh requests list
    } catch (err) {
      alert('Failed to submit request. Please try again.');
    } finally {
      setRequestingId(null);
    }
  };

  const categories = ['All', 'Vegetarian', 'Non-Vegetarian'];

  // Build display list — use mock data if no real posts yet
  const mockFallback = [
    {
      _id: 'mock1',
      title: 'Freshly Baked Bread (20 Loaves)',
      provider: { name: 'Sunrise Bakery' },
      expiryTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      type: 'Vegetarian',
      quantity: '20 loaves',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    },
    {
      _id: 'mock2',
      title: 'Mixed Veg Curry & Rice (50 Meals)',
      provider: { name: 'Grand Hotel Events' },
      expiryTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
      type: 'Vegetarian',
      quantity: '50 meals',
      imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=400&q=80',
    },
    {
      _id: 'mock3',
      title: 'Assorted Sandwiches (30 Boxes)',
      provider: { name: 'Corporate Catering' },
      expiryTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      type: 'Non-Vegetarian',
      quantity: '30 boxes',
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
    },
  ];

  const displayPosts = foodPosts.length > 0 
    ? foodPosts.filter(p => p.status === 'available' || myRequests.some(r => r.food && r.food._id === p._id && (r.status === 'pending' || r.status === 'accepted'))) 
    : mockFallback;

  const filtered =
    selectedFilter === 'All'
      ? displayPosts
      : displayPosts.filter((p) => p.type === selectedFilter);

  const getTimeLeft = (expiryTime) => {
    const diffMs = new Date(expiryTime) - new Date();
    if (diffMs <= 0) return 'Expired';
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const isExpiringSoon = (expiryTime) => {
    const diffHrs = (new Date(expiryTime) - new Date()) / 3600000;
    return diffHrs < 3;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-poppins text-gray-900 tracking-tight flex items-center gap-3">
              Find Food
              <span className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                {filtered.length} available
              </span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Discover surplus food donations near your location.</p>
          </div>

        </div>

      </div>

      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-5 py-4 text-sm font-medium flex items-center gap-3"
          >
            <Check className="h-5 w-5" />
            {notification.message}
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-2xl px-5 py-4 text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error} Showing demo data.
        </div>
      )}

      {/* Info Banner for Demo Data */}
      {!error && foodPosts.length === 0 && !loading && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl px-5 py-4 text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          No food posts available yet. Showing demo data for testing. Real food posts from providers will appear here automatically.
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden border border-gray-100 animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded-xl w-3/4" />
                <div className="h-3 bg-gray-200 rounded-xl w-1/2" />
                <div className="h-10 bg-gray-200 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Food Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filtered.map((item, idx) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.08 }}
                key={item._id}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm ${
                      item.type === 'Vegetarian' ? 'bg-green-500/90 text-white' :
                      'bg-orange-500/90 text-white'
                    }`}>
                      {item.type}
                    </span>

                  </div>
                  {/* Title overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white font-poppins leading-snug">{item.title}</h3>
                    <div className="flex flex-col gap-1.5 text-gray-300 text-sm mt-1">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-blue-400" />
                        <span>{item.provider?.name || 'Unknown Provider'}</span>
                      </div>
                      {item.mobileNumber && (
                        <div className="flex items-center gap-1.5 font-medium text-emerald-300/90">
                          <span className="text-xs">📞</span>
                          <span>{item.mobileNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="flex gap-3 mb-5">
                    <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center">
                      <MapPin className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <span className="text-sm font-semibold text-gray-800 block">
                        {item.quantity || '—'}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">Quantity</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRequest(item)}
                    disabled={
                      requestingId === item._id || 
                      successId === item._id || 
                      item._id.startsWith('mock') || 
                      item.status !== 'available' ||
                      myRequests.some(r => r.food && r.food._id === item._id && (r.status === 'pending' || r.status === 'accepted'))
                    }
                    className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:-translate-y-0.5 transition-all ${
                      successId === item._id
                        ? 'bg-green-500 text-white shadow-green-500/30'
                        : item._id.startsWith('mock')
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : myRequests.some(r => r.food && r.food._id === item._id && r.status === 'accepted')
                        ? 'bg-emerald-500 text-white cursor-not-allowed border outline outline-2 outline-emerald-300'
                        : myRequests.some(r => r.food && r.food._id === item._id && r.status === 'pending')
                        ? 'bg-orange-500 text-white cursor-not-allowed'
                        : item.status !== 'available'
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-900 hover:bg-primary text-white shadow-gray-900/20 hover:shadow-primary/30'
                    }`}
                  >
                    {requestingId === item._id ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : successId === item._id ? (
                      <>
                        <Check className="h-5 w-5" />
                        Request Sent!
                      </>
                    ) : item._id.startsWith('mock') ? (
                      <>
                        <Check className="h-5 w-5" />
                        Demo Data
                      </>
                     ) : myRequests.some(r => {
                         const foodId = r.food?._id || r.food;
                         return String(foodId) === String(item._id) && r.status === 'accepted';
                       }) ? (
                       <>
                         <Check className="h-5 w-5" />
                         {(() => {
                           const req = myRequests.find(r => {
                             const foodId = r.food?._id || r.food;
                             return String(foodId) === String(item._id) && r.status === 'accepted';
                           });
                           if (!req) return 'Accepted';
                           const totalStr = String(item.quantity || '0').split(' ')[0];
                           const total = parseInt(totalStr) || 0;
                           const requested = parseInt(req.quantity) || 0;
                           if (requested >= total && total > 0) return 'Full items Accepted';
                           return `${requested}/${total} Accepted`;
                         })()}
                       </>
                     ) : myRequests.some(r => {
                         const foodId = r.food?._id || r.food;
                         return String(foodId) === String(item._id) && r.status === 'pending';
                       }) ? (
                       <>
                         <Check className="h-5 w-5" />
                         {(() => {
                           const req = myRequests.find(r => {
                             const foodId = r.food?._id || r.food;
                             return String(foodId) === String(item._id) && r.status === 'pending';
                           });
                           if (!req) return 'Requested';
                           const totalStr = String(item.quantity || '0').split(' ')[0];
                           const total = parseInt(totalStr) || 0;
                           const requested = parseInt(req.quantity) || 0;
                           if (requested >= total && total > 0) return 'Full items Requested';
                           return `${requested}/${total} Requested`;
                         })()}
                       </>
                    ) : item.status !== 'available' ? (
                      <>
                        <Check className="h-5 w-5" />
                        Unavailable
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        Request Food
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
    </div>
      )}

      {/* Request Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold font-poppins text-gray-900">Request Food</h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Selected Item Info */}
                  <div className="bg-green-50 rounded-2xl p-4 border border-green-100 flex items-center gap-4">
                    <img 
                      src={selectedFood?.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80'} 
                      alt="" 
                      className="h-16 w-16 rounded-xl object-cover shadow-sm"
                    />
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{selectedFood?.title}</p>
                      <p className="text-sm text-green-700 font-medium">Available: {selectedFood?.quantity}</p>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 px-1 flex items-center gap-2">
                       <Box className="h-4 w-4 text-primary" /> Quantity Needed
                    </label>
                    <input
                      type="number"
                      value={requestQuantity}
                      onChange={(e) => setRequestQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                    />
                  </div>

                  {/* Members Input */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 px-1 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Number of Members
                    </label>
                    <input
                      type="number"
                      value={requestMembers}
                      onChange={(e) => setRequestMembers(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 px-6 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all font-poppins"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRequest}
                    className="flex-[2] py-4 px-6 bg-primary hover:bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all font-poppins"
                  >
                    Confirm Request
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrphanageDashboard;
