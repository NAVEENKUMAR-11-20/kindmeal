import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, Truck, AlertCircle, X, Check, Trash2 } from 'lucide-react';
import { createFoodPost, getFoodPosts, updateFoodStatus, getRequests, updateRequest } from '../services/api';
import socket from '../services/socket';


const ProviderDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Fallback demo data
  const MOCK_FOOD_POSTS = [
    { _id: 'mock1', title: '10 Boxes of Veg Biryani', type: 'Vegetarian', quantity: '10 Boxes', status: 'available', createdAt: new Date().toISOString() },
    { _id: 'mock2', title: '5 kg Rice & Curry', type: 'Vegetarian', quantity: '5 kg', status: 'requested', createdAt: new Date().toISOString() },
    { _id: 'mock3', title: 'Assorted Breads & Pastries', type: 'Vegetarian', quantity: '20 pieces', status: 'delivered', createdAt: new Date().toISOString() },
  ];

  const MOCK_REQUESTS = [
    { _id: 'req1', food: { _id: 'mock2', title: '5 kg Rice & Curry' }, orphanage: { name: 'Sunshine Orphanage', email: 'sunshine@example.com' }, status: 'pending', createdAt: new Date().toISOString() }
  ];



  const [form, setForm] = useState({
    title: '',
    type: 'Vegetarian',
    quantity: '',
    expiryTime: '',
    address: '',
    mobileNumber: '',
    notes: '',
    imageUrl: '',
  });

  useEffect(() => {
    loadPosts();
    loadRequests();

    // Listen for new requests
    socket.on('new_request', (newRequest) => {
      console.log('New request received:', newRequest);
      setIncomingRequests(prev => [newRequest, ...prev]);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'info',
        message: `New request from ${newRequest.orphanage?.name || 'an orphanage'} for ${newRequest.food?.title || 'food'}`,
        timestamp: new Date()
      }]);
    });

    // Listen for request updates
    socket.on('request_updated', (updatedRequest) => {
      setIncomingRequests(prev => prev.map(req =>
        req._id === updatedRequest._id ? updatedRequest : req
      ));
      loadPosts(); // Refresh posts to see status changes
    });

    // Listen for food status updates
    socket.on('food_status_updated', (updatedFood) => {
      console.log('Incoming food_status_updated:', updatedFood?._id, updatedFood?.status);
      if (updatedFood) {
        setMyPosts(prev => {
          const newPosts = prev.map(p => p._id === updatedFood._id ? updatedFood : p);
          console.log('Updated myPosts state. Match found:', prev.some(p => p._id === updatedFood._id));
          return newPosts;
        });
      } else {
        loadPosts();
      }
    });

    return () => {
      socket.off('new_request');
      socket.off('request_updated');
      socket.off('food_status_updated');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpenId]);

  const loadRequests = async () => {
    try {
      const currentUserId = localStorage.getItem('userId');
      const res = await getRequests({ providerId: currentUserId || 'null' });
      setIncomingRequests(res.data);
    } catch (err) {
      console.error('Error loading requests, switching to demo mode:', err);
      setIsDemoMode(true);
      setIncomingRequests(MOCK_REQUESTS);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const currentUserId = localStorage.getItem('userId');
      console.log('Fetching posts for providerId:', currentUserId || 'null');
      const res = await getFoodPosts({ providerId: currentUserId || 'null' });
      console.log('Posts fetched:', res.data.length);
      setMyPosts(res.data);
    } catch (err) {
      console.error('Error loading posts, switching to demo mode:', err);
      setIsDemoMode(true);
      setMyPosts(MOCK_FOOD_POSTS);
    } finally {
      setLoading(false);
    }
  };


  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setFormError('Image size should be less than 5MB');
        return;
      }
      setFormError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.quantity || !form.expiryTime) {
      setFormError('Please fill in Title, Quantity, and Expiry Time.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      await createFoodPost({
        ...form,
        provider: localStorage.getItem('userId') || null,
      });
      setSuccessMsg('Food posted successfully! Orphanages are being notified.');
      setForm({ title: '', type: 'Vegetarian', quantity: '', expiryTime: '', address: '', mobileNumber: '', notes: '', imageUrl: '' });
      loadPosts();
      setTimeout(() => {
        setSuccessMsg('');
        setIsModalOpen(false);
      }, 2000);
    } catch (err) {
      setFormError('Failed to post. Make sure the backend server is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFoodStatusUpdate = async (foodId, status) => {
    try {
      await updateFoodStatus(foodId, status);
      loadPosts();
    } catch {
      alert('Failed to update food status.');
    }
  };

  const handleDeletePost = async (foodId) => {
    try {
      // Assuming a delete function exists or creating a generic API call if not
      // This is using a generic fetch as `deleteFoodPost` is not in api.js based on previous imports
      await fetch(`http://localhost:5000/api/food/${foodId}`, {
        method: 'DELETE',
      });
      loadPosts();
    } catch {
      alert('Failed to delete food post.');
    }
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      await updateRequest(requestId, status);
      loadRequests();
      loadPosts();
    } catch {
      alert('Failed to update request status.');
    }
  };


  const stats = [
    { label: 'Total Posts', value: myPosts.length || 0, icon: Plus, color: 'text-primary', bg: 'bg-green-50' },
    { label: 'Active Posts', value: myPosts.filter(p => p.status === 'available' || p.status === 'requested' || p.status === 'accepted').length || 0, icon: CheckCircle2, color: 'text-secondary', bg: 'bg-orange-50' },

    { label: 'Delivered', value: myPosts.filter(p => p.status === 'delivered').length || 0, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-poppins text-gray-900 tracking-tight">Provider Dashboard</h1>
            {isDemoMode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                <AlertCircle className="h-3.5 w-3.5" /> Demo Mode Enabled (DB Disconnected)
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">Manage your food donations and requests</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-5 py-3 rounded-2xl shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Post Surplus Food</span>
        </button>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl px-5 py-4 text-sm font-medium flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5" />
            {notification.message}
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="ml-auto text-blue-500 hover:text-blue-700"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group"
          >
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</h3>
            </div>
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </motion.div>
        ))}
      </div>



      {/* Recent Posts from MongoDB */}
      {!loading && myPosts.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 font-poppins">
              Your Food Posts {isDemoMode ? '(Demo Data)' : '(from DB)'}
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {myPosts.map((post) => (
              <div key={post._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="font-semibold text-gray-800">{post.title}</p>
                  <div className="flex flex-col gap-1 mt-0.5">
                    <p className="text-sm text-gray-500">{post.quantity} Total · {post.type}</p>
                    {(() => {
                      const req = incomingRequests.find(r => {
                        const foodId = r.food?._id || r.food;
                        return String(foodId) === String(post._id) && (r.status === 'pending' || r.status === 'accepted');
                      });
                      if (req) {
                        const totalStr = String(post.quantity || '0').split(' ')[0];
                        const total = parseInt(totalStr) || 0;
                        const reqQty = parseInt(req.quantity) || 0;
                        return (
                          <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg w-fit">
                            <span>Requested: {reqQty}/{total} units</span>
                            <span className="w-1 h-1 bg-primary/40 rounded-full" />
                            <span>For {req.membersCount || '—'} members</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>                <div className="flex items-center gap-3">
                  {/* Find if there's an accepted request for this food */}
                  {(() => {
                    const acceptedReq = incomingRequests.find(r => {
                      const foodId = r.food?._id || r.food;
                      return String(foodId) === String(post._id) && r.status === 'accepted';
                    });
                    const pendingReq = incomingRequests.find(r => {
                      const foodId = r.food?._id || r.food;
                      return String(foodId) === String(post._id) && r.status === 'pending';
                    });

                    if (acceptedReq || post.status === 'accepted') {
                      // Use the ID from the request if found, otherwise could be a matching accepted request for this post
                      const currentMenuId = acceptedReq?._id || post._id; 
                      return (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === currentMenuId ? null : currentMenuId);
                            }}
                            className="px-4 py-2 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm border border-green-600 hover:bg-green-600 transition-all flex items-center gap-1.5"
                          >
                            <Check className="h-4 w-4" /> Accepted
                          </button>
                          
                          <AnimatePresence>
                            {menuOpenId === currentMenuId && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden"
                              >
                                <button
                                  onClick={() => {
                                    console.log('Marking as delivered. post:', post._id, 'acceptedReq:', acceptedReq?._id);
                                    if (acceptedReq) {
                                      handleRequestAction(acceptedReq._id, 'completed');
                                    } else {
                                      // Fallback for demo mode or edge cases where request is missing
                                      handleFoodStatusUpdate(post._id, 'delivered');
                                    }
                                    setMenuOpenId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-2 transition-colors"
                                >
                                  <Truck className="h-4 w-4" /> Delivered
                                </button>
                                <button
                                  onClick={() => setMenuOpenId(null)}
                                  className="w-full px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                >
                                  <AlertCircle className="h-4 w-4" /> Not yet delivered
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (pendingReq || post.status === 'requested') {
                      const targetReq = pendingReq || incomingRequests.find(r => String(r.food?._id || r.food) === String(post._id));
                      
                      return (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              alert('delivered or not yet to delivered');
                              console.log('Accepting request for post:', post._id, 'targetReq:', targetReq?._id);
                              if (targetReq) {
                                handleRequestAction(targetReq._id, 'accepted');
                              } else {
                                handleFoodStatusUpdate(post._id, 'accepted');
                              }
                            }}
                            className="px-4 py-2 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                          >
                            <Check className="h-4 w-4" /> Accept
                          </button>
                          <button
                            onClick={() => {
                              if (targetReq) {
                                handleRequestAction(targetReq._id, 'rejected');
                              } else {
                                handleFoodStatusUpdate(post._id, 'available');
                              }
                            }}
                            className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                          >
                            <X className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      );
                    }

                    // For all other statuses (picked, delivered, etc)
                    if (post.status !== 'available') {
                      return (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${post.status === 'picked' ? 'bg-yellow-100 text-yellow-700' :
                            post.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                          }`}>{post.status}</span>
                      );
                    }

                    return (
                      <button
                        onClick={() => handleDeletePost(post._id)}
                        className="px-4 py-2 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    );
                  })()}
                </div>

              </div>

            ))}
          </div>
        </div>
      )}

      {/* Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900 font-poppins">Post Surplus Food</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
              {successMsg && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
                  <CheckCircle2 className="h-5 w-5" />
                  {successMsg}
                </div>
              )}
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                  <AlertCircle className="h-5 w-5" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food Title *</label>
                <input
                  name="title" value={form.title} onChange={handleChange} required
                  type="text" placeholder="e.g. 50 Boxes of Veg Biryani"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    name="type" value={form.type} onChange={handleChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm appearance-none"
                  >
                    <option>Vegetarian</option>
                    <option>Non-Vegetarian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    name="quantity" value={form.quantity} onChange={handleChange} required
                    type="text" placeholder="e.g. 20 kg or 50 meals"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food Posted date/time</label>
                <input
                  name="expiryTime" value={form.expiryTime} onChange={handleChange} required
                  type="datetime-local"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
                <input
                  name="address" value={form.address} onChange={handleChange}
                  type="text" placeholder="Full address for pickup"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input
                  name="mobileNumber" value={form.mobileNumber} onChange={handleChange} required
                  type="tel" placeholder="e.g. +91 9876543210"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Food Image</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="flex items-center justify-center w-full h-12 px-4 transition bg-white border-2 border-dashed border-gray-300 rounded-xl appearance-none cursor-pointer hover:border-primary focus:outline-none">
                      <span className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="font-medium text-gray-500 text-sm">
                          Drop an image or <span className="text-primary underline">browse</span>
                        </span>
                      </span>
                      <input type="file" name="file_upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                  {form.imageUrl && (
                    <div className="relative w-16 h-16 rounded-xl border border-gray-200 overflow-hidden shadow-sm flex-shrink-0">
                      <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setForm(prev => ({...prev, imageUrl: ''}))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  name="notes" value={form.notes} onChange={handleChange}
                  rows={3} placeholder="Allergens, storage instructions, etc."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-primary hover:bg-green-600 rounded-xl shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Post Food Now <Plus className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;
