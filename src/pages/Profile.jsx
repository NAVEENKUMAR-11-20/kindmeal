import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, MapPin, LogOut, Award, Heart, Camera, Trash2, RefreshCw, AlertTriangle, Edit3, Save, X, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFoodPosts, getRequests } from '../services/api';

// ─── helpers ──────────────────────────────────────────────────────────────────
const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

const defaultProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 234 567 8900',
  address: '123 Main St, New York, NY',
};

const CountUp = ({ end, duration = 1 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const endValue = parseFloat(end) || 0;
    if (start === endValue) return;

    const totalFrames = duration * 60;
    const increment = endValue / totalFrames;
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      start += increment;
      if (frame >= totalFrames) {
        setCount(endValue);
        clearInterval(counter);
      } else {
        setCount(start);
      }
    }, 1000 / 60);

    return () => clearInterval(counter);
  }, [end, duration]);

  return <span>{typeof end === 'number' && end % 1 !== 0 ? count.toFixed(1) : Math.floor(count)}</span>;
};

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // ─── State ──────────────────────────────────────────────────────────────
  const [profileData, setProfileData]     = useState(() => load('profileData', defaultProfile));
  const [profileImage, setProfileImage]   = useState(() => localStorage.getItem('profileImage') || null);
  const [isEditing, setIsEditing]         = useState(false);
  const [editForm, setEditForm]           = useState(profileData);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu]   = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);

  // ─── Role ────────────────────────────────────────────────────────────────
  const storedRole = localStorage.getItem('userRole');
  const roleLabel  = storedRole === 'orphanage' ? 'Orphanage / NGO' : 'Food Provider';
  const roleBadge  = storedRole === 'orphanage'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-green-100 text-green-700';


  const [dynamicStats, setDynamicStats] = useState({ s1: 0, s2: 0, s3: 4.8 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // ─── Stats Calculation ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsStatsLoading(true);
        if (storedRole === 'orphanage') {
          // Orphanage stats
          const res = await getRequests({ orphanageId: '000000000000000000000001' }); // matches demo
          const requests = res.data || [];
          const uniqueProviders = new Set(requests.map(r => r.food?.provider?._id || r.food?.provider)).size;
          const accepted = requests.filter(r => r.status === 'accepted' || r.status === 'delivered').length;
          
          setDynamicStats({
            s1: requests.length, // Total Requests
            s2: accepted,        // Meals Received (Confirmed)
            s3: uniqueProviders  // Partners Helped
          });
        } else {
          // Food Provider stats
          const res = await getFoodPosts({ providerId: 'null' }); // matches demo
          const posts = res.data || [];
          const totalDonations = posts.length;
          
          setDynamicStats({
            s1: totalDonations,
            s2: totalDonations * 7, // Estimated people fed (e.g. 7 people per post)
            s3: 4.8 // Platform Rating
          });
        }
      } catch (err) {
        console.error('Error fetching profile stats:', err);
        // Fallback to defaults if API fails
        setDynamicStats({ s1: 0, s2: 0, s3: 0 });
      } finally {
        setIsStatsLoading(false);
      }
    };

    fetchStats();
  }, [storedRole]);

  // Define stat cards based on role
  const statCards = storedRole === 'orphanage' 
    ? [
        { label: 'Total Requests',    value: dynamicStats.s1, icon: RefreshCw, color: 'text-blue-500',   bg: 'bg-blue-50' },
        { label: 'Meals Received',     value: dynamicStats.s2, icon: Heart,     color: 'text-red-500',    bg: 'bg-red-50' },
        { label: 'Partner Providers',  value: dynamicStats.s3, icon: Building2, color: 'text-green-500', bg: 'bg-green-50' },
      ]
    : [
        { label: 'Total Donations',   value: dynamicStats.s1, icon: Heart,     color: 'text-red-500',    bg: 'bg-red-50' },
        { label: 'People Fed (Est.)',  value: dynamicStats.s2, icon: User,      color: 'text-green-500',  bg: 'bg-green-50' },
        { label: 'Platform Rating',   value: dynamicStats.s3, icon: Award,     color: 'text-orange-500', bg: 'bg-orange-50' },
      ];

  // ─── Profile edit / save ─────────────────────────────────────────────────
  const startEdit = () => { setEditForm(profileData); setIsEditing(true); };
  const cancelEdit = () => setIsEditing(false);

  const saveProfile = () => {
    setProfileData(editForm);
    localStorage.setItem('profileData', JSON.stringify(editForm));
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // ─── Avatar ──────────────────────────────────────────────────────────────
  const openFilePicker = () => { setShowAvatarMenu(false); fileInputRef.current?.click(); };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setProfileImage(dataUrl);
      localStorage.setItem('profileImage', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePicture = () => {
    setProfileImage(null);
    localStorage.removeItem('profileImage');
    setShowAvatarMenu(false);
  };

  // ─── Logout ──────────────────────────────────────────────────────────────
  const handleLogoutConfirm = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6" onClick={() => showAvatarMenu && setShowAvatarMenu(false)}>
      <input ref={fileInputRef} type="file" accept="image/jpg,image/jpeg,image/png" className="hidden" onChange={handleFileChange} />

      {/* Save success toast */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="fixed top-5 right-5 z-50 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-medium text-sm"
          >
            <Save className="h-4 w-4" /> Profile saved successfully!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main card ── */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4 w-full md:w-auto">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <div
                className="h-32 w-32 rounded-3xl bg-gray-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden cursor-pointer relative group"
                onClick={() => setShowAvatarMenu((v) => !v)}
                title="Click to manage profile picture"
              >
                {profileImage
                  ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  : <User className="h-14 w-14 text-gray-400" />
                }
                <div className="absolute inset-0 rounded-3xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-7 w-7 text-white" />
                </div>
              </div>

              <AnimatePresence>
                {showAvatarMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }} transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                  >
                    <button onClick={openFilePicker} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      {profileImage ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {profileImage && (
                      <button onClick={handleDeletePicture} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
                        <Trash2 className="h-4 w-4" /> Delete Photo
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <span className={`px-4 py-1.5 text-xs font-bold rounded-full ${roleBadge}`}>{roleLabel}</span>
          </div>

          {/* Info */}
          <div className="flex-1 w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-gray-100 pb-6">
              <div>
                {isEditing
                  ? <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-3xl font-bold font-poppins text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  : <h1 className="text-3xl font-bold font-poppins text-gray-900">{profileData.name}</h1>
                }
                {isEditing
                  ? <input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="Address"
                      className="mt-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  : <p className="text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                      <MapPin className="h-4 w-4" /> {profileData.address}
                    </p>
                }
              </div>

              {/* Edit / Save / Cancel buttons */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <X className="h-4 w-4" /> Cancel
                    </button>
                    <button onClick={saveProfile} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-green-600 rounded-xl shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all">
                      <Save className="h-4 w-4" /> Save
                    </button>
                  </>
                ) : (
                  <button onClick={startEdit} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <Edit3 className="h-4 w-4" /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-2.5 bg-white rounded-xl shadow-sm text-gray-400 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email Address</p>
                  {isEditing
                    ? <input
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        type="email"
                        className="text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 w-full mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    : <p className="text-sm font-semibold text-gray-900 line-clamp-1">{profileData.email}</p>
                  }
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-2.5 bg-white rounded-xl shadow-sm text-gray-400 shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Phone Number</p>
                  {isEditing
                    ? <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        type="tel"
                        className="text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 w-full mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    : <p className="text-sm font-semibold text-gray-900">{profileData.phone}</p>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <h3 className="font-poppins font-bold text-xl text-gray-900 px-2 mt-8 mb-4">Impact</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <motion.div key={i} whileHover={{ y: -5 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group h-32">
            {isStatsLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">{stat.label}</p>
                  <h4 className="text-3xl font-bold font-poppins text-gray-900">
                    <CountUp end={stat.value} duration={1.5} />
                  </h4>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Logout ── */}
      <div className="mt-8">
        <button onClick={() => setShowLogoutModal(true)} className="flex items-center gap-2 text-red-500 px-4 py-2 hover:bg-red-50 transition-colors rounded-xl font-medium">
          <LogOut className="h-5 w-5" /> Log out of account
        </button>
      </div>

      {/* ── Logout Confirmation Modal ── */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-red-100 rounded-2xl"><AlertTriangle className="h-8 w-8 text-red-500" /></div>
                <h2 className="text-xl font-bold font-poppins text-gray-900">Confirm Logout</h2>
                <p className="text-gray-500 font-medium">Are you sure you want to log out?</p>
                <div className="flex gap-3 w-full mt-2">
                  <button onClick={() => setShowLogoutModal(false)} className="flex-1 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors">No</button>
                  <button onClick={handleLogoutConfirm} className="flex-1 px-5 py-3 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/30 hover:-translate-y-0.5 transition-all">Yes, Logout</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
