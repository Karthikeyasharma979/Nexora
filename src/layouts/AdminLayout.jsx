import React from 'react';
import { Outlet, Link, useLocation, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, Bell, Search } from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Resolve current active tab from query parameters, defaulting to 'dashboard'
  const activeTab = searchParams.get('tab') || 'dashboard';

  return (
    <div className="admin-layout-wrapper">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="brand-logo">N</div>
          <span className="brand-name">Nexora Admin</span>
        </div>
        
        <nav className="admin-nav">
          <p className="nav-label">MAIN MENU</p>
          <ul className="nav-list">
            <li>
              <Link to="/admin?tab=dashboard" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link to="/admin?tab=tests" className={`nav-item ${activeTab === 'tests' ? 'active' : ''}`}>
                <FileText size={20} />
                <span>Manage Tests</span>
              </Link>
            </li>
            <li>
              <Link to="/admin?tab=reports" className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}>
                <Users size={20} />
                <span>Candidates</span>
              </Link>
            </li>
            <li>
              <Link to="/admin?tab=settings" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}>
                <Settings size={20} />
                <span>Settings</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="admin-user-profile">
          <div className="user-avatar">AD</div>
          <div className="user-info">
            <span className="user-name">Admin User</span>
            <span className="user-role">Super Admin</span>
          </div>
        </div>
      </aside>
      
      <div className="admin-main-wrapper">
        <header className="admin-topbar">
          <div className="topbar-search">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Search tests, candidates..." />
          </div>
          <div className="topbar-actions">
            <button className="icon-btn">
              <Bell size={20} />
              <span className="notification-badge"></span>
            </button>
            <div className="topbar-avatar">AD</div>
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
