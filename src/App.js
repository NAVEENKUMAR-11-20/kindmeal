import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import ProviderDashboard from './pages/ProviderDashboard';
import OrphanageDashboard from './pages/OrphanageDashboard';
import MapPage from './pages/MapPage';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes using Layout */}
        <Route element={<Layout />}>
          <Route path="/provider-dashboard" element={<ProviderDashboard />} />
          <Route path="/orphanage-dashboard" element={<OrphanageDashboard />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
