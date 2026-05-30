import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
        <Link to="/demo" className="nav-link">Interactive Demo</Link>
        <Link to="/features" className="nav-link">Features</Link>
        <Link to="/workflow" className="nav-link">Workflow</Link>
      </div>

      <div className="nav-actions">
        <Link to="/request-demo" style={{ textDecoration: 'none' }}>
          <button className="magnetic-btn btn-demo-cta">
            Request Demo
          </button>
        </Link>
        <button 
          className="btn-nav-action magnetic-btn"
          onClick={() => navigate('/admin')}
        >
          <Lock size={14} className="glow-icon" />
          Admin Portal
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
