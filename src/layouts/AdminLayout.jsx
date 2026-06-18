import { useState } from 'react';
import { Outlet, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Globe, Download, Type, HelpCircle, Menu, X, ShieldCheck } from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Resolve current active tab from query parameters, defaulting to 'dashboard'
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="mettl-layout-wrapper">
      <header className="mettl-top-nav">
        <div className="mettl-nav-left">
          <div className="mettl-brand" onClick={() => navigate('/admin')}>
            <img src="/favicon.svg" alt="Nexora Logo" className="mettl-brand-icon" style={{ height: '28px', width: '28px' }} />
            <span className="mettl-brand-text">Nexora</span>
          </div>
          
          <nav className={`mettl-nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <Link to="/admin?tab=dashboard" className={`mettl-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
              Dashboard
            </Link>
            <Link to="/admin?tab=tests" className={`mettl-nav-link ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
              My Tests
            </Link>
            <Link to="/admin?tab=builder" className={`mettl-nav-link ${activeTab === 'builder' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
              Question Bank
            </Link>
            <Link to="/admin?tab=reports" className={`mettl-nav-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
              Report+
            </Link>

          </nav>
        </div>

        <div className="mettl-nav-right">

          
          <div className="mettl-avatar-circle" title="Logout" onClick={handleLogout}>
            S
          </div>

          <button className="mettl-mobile-toggle" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      
      <main className="mettl-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
