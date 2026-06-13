import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, ChevronRight, Home } from 'lucide-react';
import './AdminLogin.css';
import './HomePage.css';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'; // Using localhost for dev fallback
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('admin_token', data.token);
        navigate('/admin');
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="cyber-grid-bg"></div>
      
      <button className="btn-back-home" onClick={() => navigate('/')}>
        <Home size={18} /> Back to Home
      </button>

      <div className="admin-login-card animate-in">
        <div className="admin-login-header">
          <div className="admin-icon-wrapper">
            <ShieldCheck size={40} color="#d8b4fe" />
          </div>
          <h2 className="text-gradient">Nexora Admin</h2>
          <p>Enter your credentials to access the secure portal</p>
        </div>
        
        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="input-group">
            <Lock className="input-icon" size={20} />
            <input 
              type="password" 
              placeholder="Admin Password"
              className="glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          
          {error && <div className="admin-error-message">{error}</div>}
          
          <button type="submit" className="admin-login-btn magnetic-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Secure Login'} 
            {!loading && <ChevronRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
