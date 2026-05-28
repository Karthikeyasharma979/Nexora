import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  BrainCircuit, 
  BarChart3, 
  ArrowRight, 
  Lock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();

  // Simple intersection observer to trigger fade-in animations on scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          entry.target.style.opacity = 1;
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card').forEach(el => {
      el.style.opacity = 0;
      el.style.animation = 'slideUpFade 0.6s ease-out forwards';
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-container">
      {/* Dynamic Background */}
      <div className="orb-wrapper">
        <div className="bg-gradient-orb orb-1"></div>
        <div className="bg-gradient-orb orb-2"></div>
      </div>

      {/* Navigation */}
      <nav className="home-nav">
        <div className="nav-brand">
          <ShieldCheck size={28} className="text-blue-500" style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Nexora <span style={{ color: '#60a5fa' }}>| sync</span>
          </span>
        </div>
        
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#security" className="nav-link">Security</a>
          <a href="#enterprise" className="nav-link">Enterprise</a>
        </div>

        <button 
          className="btn-nav-action"
          onClick={() => navigate('/admin')}
        >
          <Lock size={16} />
          Admin Portal
        </button>
      </nav>

      {/* Hero Section */}
      <main className="hero-section">
        <div className="badge">
          <Sparkles size={14} />
          Next-Generation Assessment Platform
        </div>
        
        <h1 className="hero-title">
          Secure, AI-Proctored Exams <br/>
          <span className="text-gradient">Done Right.</span>
        </h1>
        
        <p className="hero-subtitle">
          Conduct high-stakes assessments globally with military-grade security, 
          real-time AI proctoring, and a completely locked-down testing environment.
        </p>

        <div className="hero-actions">
          <button 
            className="btn-primary-large"
            onClick={() => navigate('/admin')}
          >
            Go to Admin Dashboard
            <ArrowRight size={18} />
          </button>
          
          <button 
            className="btn-secondary-large"
            onClick={() => {
              // Scroll to features or open a demo modal
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Explore Features
            <ChevronRight size={18} />
          </button>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-grid">
          
          <div className="feature-card">
            <div className="feature-icon-wrapper icon-blue">
              <ShieldCheck size={24} />
            </div>
            <h3 className="feature-title">Secure Desktop Browser</h3>
            <p className="feature-description">
              Our custom Electron-based Kiosk browser locks down the candidate's OS, preventing tab-switching, keyboard shortcuts, screen recording, and unauthorized applications.
            </p>
          </div>

          <div className="feature-card" style={{ animationDelay: '0.1s' }}>
            <div className="feature-icon-wrapper icon-purple">
              <BrainCircuit size={24} />
            </div>
            <h3 className="feature-title">Live AI Proctoring</h3>
            <p className="feature-description">
              Real-time facial recognition and object detection powered by TensorFlow. Automatically flags missing faces, multiple persons, cell phones, and suspicious audio.
            </p>
          </div>

          <div className="feature-card" style={{ animationDelay: '0.2s' }}>
            <div className="feature-icon-wrapper icon-emerald">
              <BarChart3 size={24} />
            </div>
            <h3 className="feature-title">Instant Analytics</h3>
            <p className="feature-description">
              Get immediate, comprehensive reports on candidate performance and proctoring violations. Review auto-graded results and violation snapshots in one dashboard.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
};

export default HomePage;
