import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TestLayout from './layouts/TestLayout';
import PreTestWelcome from './pages/PreTestWelcome';
import Diagnostics from './pages/Diagnostics';
import TestInterface from './pages/TestInterface';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import TestCompleted from './pages/TestCompleted';
import InvalidLink from './pages/InvalidLink';
import { initializeDB } from './utils/db';

initializeDB();

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to the pre-test welcome screen */}
        <Route path="/" element={<InvalidLink />} />
        <Route path="/pre-test/:testId" element={<PreTestWelcome />} />
        <Route path="/diagnostics/:testId" element={<Diagnostics />} />
        
        {/* Candidate Routes */}
        <Route element={<TestLayout />}>
          <Route path="/test/:testId" element={<TestInterface />} />
        </Route>
        
        {/* Post-Test Route */}
        <Route path="/completed" element={<TestCompleted />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
