import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ChevronRight } from 'lucide-react';
import NavBar from '../components/NavBar';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-container">
      {/* Dynamic Cyber Background */}
      <div className="cyber-grid-bg"></div>
      <div className="orb-wrapper">
        <div className="bg-gradient-orb orb-1"></div>
        <div className="bg-gradient-orb orb-2"></div>
        <div className="bg-gradient-orb orb-3"></div>
      </div>

      <NavBar />

      {/* Hero Section */}
      <main className="hero-section">
        <div className="badge animate-on-scroll">
          <Sparkles size={14} className="sparkle-icon" />
          <span className="shimmer-text">Next-Generation Proctored Browser</span>
        </div>
        
        <h1 className="hero-title animate-on-scroll" style={{ animationDelay: '0.1s' }}>
          Secure, AI-Proctored Exams <br/>
          <span className="text-gradient hover-glow-text">Done Right.</span>
        </h1>
        
        <p className="hero-subtitle animate-on-scroll" style={{ animationDelay: '0.2s' }}>
          Conduct high-stakes assessments globally with military-grade security, 
          real-time AI biometric proctoring, and a completely locked-down Kiosk testing environment.
        </p>

        <div className="hero-actions animate-on-scroll" style={{ animationDelay: '0.3s' }}>
          <button 
            className="btn-primary-large"
            onClick={() => navigate('/admin')}
          >
            <span className="btn-content">
              Go to Admin Dashboard
              <ArrowRight size={18} className="arrow-icon" />
            </span>
          </button>
          
          <button 
            className="btn-secondary-large"
            onClick={() => navigate('/demo')}
          >
            <span className="btn-content">
              Explore Interactive Demo
              <ChevronRight size={18} className="arrow-icon" />
            </span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-glow"></div>
        <p className="footer-text">
          &copy; {new Date().getFullYear()} Nexora Secure Browser. Built with military-grade assessment security.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;

