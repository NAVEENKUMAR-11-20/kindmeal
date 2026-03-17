import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Building2, Utensils, ArrowRight, AlertCircle } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { createUser } from '../services/api';

const handleLogin = async () => {
  console.log('Login button clicked. Role:', role);
  if (!role) return;

  setIsLoading(true);
  setError('');

  try {
    console.log('Initiating Firebase signInWithPopup...');
    
    // 🔴 ERROR HAPPENS HERE
    import { signInWithRedirect } from "firebase/auth";
    await signInWithRedirect(auth, googleProvider);
    

    console.log('Sign-in result:', result);
    const user = result.user;
    console.log('Authenticated User:', user.email);

    // Sync with backend
    const syncRes = await createUser({
      name: user.displayName || 'Anonymous User',
      email: user.email,
      role: role,
      phone: user.phoneNumber || '',
      address: 'Not provided'
    });

    const dbUser = syncRes.data;

    // (your remaining code...)
    
  } catch (err) {   // 👈 ✅ THIS IS THE CATCH PART
    console.error("FULL ERROR:", err);
    console.error("ERROR CODE:", err.code);
    console.error("ERROR MESSAGE:", err.message);

    setError(err.message); // show real error on UI
  } finally {       // 👈 optional but good
    setIsLoading(false);
  }
};
      // Save user details for Profile and session management
      localStorage.setItem('userRole', role);
      localStorage.setItem('userId', dbUser._id);
      localStorage.setItem('profileData', JSON.stringify({
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        address: dbUser.address || 'Not provided'
      }));
      localStorage.setItem('profileImage', user.photoURL || '');

      // Redirect based on role
      if (role === 'provider') {
        navigate('/provider-dashboard');
      } else {
        navigate('/orphanage-dashboard');
      }
    } catch (err) {
      console.error('Firebase Auth Error:', err);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    {
      id: 'provider',
      title: 'Food Provider',
      description: 'Donate surplus food from your restaurant, event, or home.',
      icon: Utensils,
      color: 'bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-500',
    },
    {
      id: 'orphanage',
      title: 'Orphanage / NGO',
      description: 'Receive fresh food donations for your organization.',
      icon: Building2,
      color: 'bg-green-50 text-green-600 border-green-200 hover:border-green-500',
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10"
      >
        <div className="mx-auto h-16 w-16 bg-white rounded-2xl shadow-xl flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform">
          <Utensils className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 font-poppins tracking-tight">
          Welcome to <span className="text-primary">Kind</span>Meal
        </h2>
        <p className="mt-2 text-sm text-gray-600 font-medium">
          Share Food. Spread Kindness.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/50">
          
          <div className="mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 text-center">
              Select your role
            </h3>
            <div className="space-y-4">
              {roles.map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex gap-4 ${
                      isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className={`p-3 rounded-xl flex-shrink-0 ${isSelected ? 'bg-primary text-white' : r.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-base font-semibold text-gray-900">{r.title}</h4>
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </motion.div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{r.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500 rounded-full">Continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleLogin}
              disabled={!role || isLoading}
              className={`w-full flex justify-center items-center gap-3 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all ${
                (!role || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 shadow-lg shadow-primary/30'
              }`}
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </button>
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-xs text-red-500 mt-3 font-medium bg-red-50 p-2 rounded-lg border border-red-100"
                    >
                        <AlertCircle className="h-3.5 w-3.5" />
                        {error}
                    </motion.div>
                )}
                {!role && !error && (
                    <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-center text-xs text-red-500 mt-3 font-medium"
                    >
                        Please select a role to continue
                    </motion.p>
                )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
