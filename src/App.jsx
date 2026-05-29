import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import TestLayout from './layouts/TestLayout';
import PreTestWelcome from './pages/PreTestWelcome';
import Diagnostics from './pages/Diagnostics';
import TestInterface from './pages/TestInterface';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import TestCompleted from './pages/TestCompleted';
import InvalidLink from './pages/InvalidLink';
import HomePage from './pages/HomePage';
import KioskLogin from './pages/KioskLogin';
import AdminLogin from './pages/AdminLogin';
import SecureInvite from './pages/SecureInvite';
import ProtectedRoute from './components/ProtectedRoute';
import { initializeDB } from './utils/db';

initializeDB();

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<HomePage />} />
        
        {/* Kiosk Login Route */}
        <Route path="/kiosk-login" element={<KioskLogin />} />
        
        {/* Candidate Routes */}
        <Route path="/pre-test/:testId" element={<PreTestWelcome />} />
        <Route path="/diagnostics/:testId" element={<Diagnostics />} />
        
        {/* Secure Invite Route */}
        <Route path="/invite/:token" element={<SecureInvite />} />
        
        {/* Candidate Routes */}
        <Route path="/test/:testId" element={<TestLayout />}>
          <Route index element={<TestInterface />} />
        </Route>
        
        {/* Post-Test Route */}
        <Route path="/completed" element={<TestCompleted />} />

        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Fallback for invalid URLs */}
        <Route path="*" element={<InvalidLink />} />
      </Routes>
    </Router>
  );
}

export default App;
