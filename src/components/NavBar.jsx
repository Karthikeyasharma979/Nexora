import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { ShieldCheck, Lock, Menu, X } from 'lucide-react';
import './NavBar.css';

const NavBar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

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
      
      <div className={`nav-links ${isMenuOpen ? 'mobile-open' : ''}`}>
        <NavLink to="/features" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>Features</NavLink>
        <NavLink to="/workflow" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>Workflow</NavLink>
      </div>

      <div className="nav-actions">
        <button 
          className="btn-nav-action magnetic-btn"
          onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}
          aria-label="Open Admin Portal"
        >
          <Lock size={14} className="glow-icon" />
          <span className="admin-portal-text">Admin Portal</span>
        </button>
        <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle Menu">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
