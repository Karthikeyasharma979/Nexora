import React, { useState } from 'react';
import { Outlet, Link, useLocation, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, Bell, Search, LogOut, Home, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AdminLayout.css';
import '../pages/HomePage.css'; // For cyber grid

const AdminLayout = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Resolve current active tab from query parameters, defaulting to 'dashboard'
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="admin-layout-wrapper">
      <div className="cyber-grid-bg"></div>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="admin-sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <div className="brand-logo">N</div>
          <span className="brand-name">Nexora Admin</span>
        </div>
        
        <nav className="admin-nav">
          <p className="nav-label">MAIN MENU</p>
          <ul className="nav-list">
            <li>
              <Link to="/admin?tab=dashboard" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/admin?tab=tests" className={`nav-item ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                <FileText size={20} />
                <span>Manage Tests</span>
              </Link>
            </li>
            <li>
              <Link to="/admin?tab=reports" className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                <Users size={20} />
                <span>Candidates</span>
              </Link>
            </li>
            <li>
              <Link to="/admin?tab=builder" className={`nav-item ${activeTab === 'builder' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                <FileText size={20} />
                <span>Test Builder</span>
              </Link>
            </li>
            <li>
              <Link to="/admin?tab=settings" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                <Settings size={20} />
                <span>Settings</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="admin-user-profile" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="user-avatar" style={{ background: 'transparent' }}><Home size={20} /></div>
          <div className="user-info">
            <span className="user-name">Site Home</span>
            <span className="user-role">Return to public site</span>
          </div>
        </div>
      </aside>
      
      <div className="admin-main-wrapper">
        <header className="admin-topbar">
          <div className="topbar-left-actions">
            <button className="admin-mobile-menu-btn" onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
            <div className="topbar-search">
              <Search size={18} className="search-icon" />
              <input type="text" placeholder="Search tests, candidates..." />
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn">
              <Bell size={20} />
              <span className="notification-badge"></span>
            </button>
            <button className="icon-btn" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </header>
        
        <main className="admin-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
