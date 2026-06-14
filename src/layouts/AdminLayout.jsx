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
  const [showNotifications, setShowNotifications] = useState(false);
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
          <div className="topbar-actions" style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)} title="Notifications">
              <Bell size={20} />
              <span className="notification-badge" style={{ display: 'block' }}>2</span>
            </button>
            
            {showNotifications && (
              <div style={{ position: 'absolute', top: '100%', right: '40px', width: '300px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 50, marginTop: '10px' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>Notifications</h4>
                  <span style={{ fontSize: '12px', color: '#3b82f6', cursor: 'pointer' }} onClick={() => setShowNotifications(false)}>Mark all read</span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#334155', fontWeight: '500' }}>New candidate registered</p>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>2 minutes ago</span>
                  </div>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#334155', fontWeight: '500' }}>Test 'Software Engineering' completed</p>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>1 hour ago</span>
                  </div>
                </div>
                <div style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#3b82f6', cursor: 'pointer' }}>View all notifications</span>
                </div>
              </div>
            )}

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
