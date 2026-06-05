import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import './NavBar.css';

const NavBar = () => {
  const navigate = useNavigate();

  return (
    <nav className="home-nav">
      <div className="nav-brand" onClick={() => navigate('/')}>
        <div className="brand-icon-glowing">
          <ShieldCheck size={28} />
        </div>
        <span className="brand-text">
          Nexora
        </span>
        <span className="brand-status-chip">
          <span className="pulse-dot"></span>
          ACTIVE LOCKDOWN
        </span>
      </div>
      
      <div className="nav-links">
        <NavLink to="/features" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Features</NavLink>
        <NavLink to="/workflow" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Workflow</NavLink>
      </div>

      <div className="nav-actions">
        <button 
          className="btn-nav-action magnetic-btn"
          onClick={() => navigate('/admin')}
          aria-label="Open Admin Portal"
        >
          <Lock size={14} className="glow-icon" />
          <span>Admin Portal</span>
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
