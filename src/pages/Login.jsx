import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Utensils } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { createUser } from '../services/api';

const Login = () => {
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!role) {
      setError("Please select a role");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Backend sync
      const syncRes = await createUser({
        name: user.displayName || 'Anonymous User',
        email: user.email,
        role: role,
        phone: user.phoneNumber || '',
        address: 'Not provided'
      });

      const dbUser = syncRes.data;

      // Save data
      localStorage.setItem('userRole', role);
      localStorage.setItem('userId', dbUser._id);
      localStorage.setItem('profileData', JSON.stringify({
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        address: dbUser.address || 'Not provided'
      }));
      localStorage.setItem('profileImage', user.photoURL || '');

      // Redirect
      if (role === 'provider') {
        navigate('/provider-dashboard');
      } else {
        navigate('/orphanage-dashboard');
      }

    } catch (err) {
      console.error("ERROR CODE:", err.code);
      console.error("ERROR MESSAGE:", err.message);
      setError(err.message);
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
    },
    {
      id: 'orphanage',
      title: 'Orphanage / NGO',
      description: 'Receive fresh food donations for your organization.',
      icon: Building2,
    }
  ];

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
      
      <h2 className="text-3xl font-bold mb-6">
        Welcome to <span className="text-green-600">KindMeal</span>
      </h2>

      <div className="bg-white p-6 rounded-xl shadow-md w-80">
        <h3 className="text-lg mb-4 text-center">Select your role</h3>

        {roles.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`p-3 border rounded-lg mb-3 cursor-pointer flex items-center gap-3 ${
                role === r.id ? 'border-green-500 bg-green-50' : ''
              }`}
            >
              <Icon />
              <div>
                <h4>{r.title}</h4>
                <p className="text-xs text-gray-500">{r.description}</p>
              </div>
            </div>
          );
        })}

        <button
          onClick={handleLogin}
          className="w-full bg-green-600 text-white py-2 rounded-lg mt-4"
        >
          Sign in with Google
        </button>

        {error && (
          <p className="text-red-500 text-xs mt-3">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Login;