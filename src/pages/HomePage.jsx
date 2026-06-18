import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
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
        </div>

        {/* Interactive Showcase Card */}
        <div className="showcase-wrap animate-on-scroll" style={{ animationDelay: '0.4s' }}>
          <InteractiveShowcase />
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

const InteractiveShowcase = () => {
  const ref = useRef(null);
  const [style, setStyle] = useState({ transform: 'rotateX(0deg) rotateY(0deg) scale(1)' });

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 18; // -9 to 9
    const rotateX = (0.5 - y) * 12; // -6 to 6
    setStyle({ transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)` });
  };

  const handleLeave = () => setStyle({ transform: 'rotateX(0deg) rotateY(0deg) scale(1)' });

  return (
    <div
      className="showcase-card"
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={style}
    >
      <div className="showcase-left">
        <div className="showcase-title">Live Test Lockdown Preview</div>
        <div className="showcase-desc">See the secure browser in action — real-time watermark, tamper-resistant UI, and live proctor feed.</div>
      </div>
      <div className="showcase-viz">
        <div className="mini-browser-mock">
          <div className="mini-browser-header">
            <span className="dot dot-red" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
            <div className="mini-search mono-text">nexora://preview/test/123</div>
          </div>
          <div className="mini-browser-content">
            <div className="mini-watermark">NEXORA • DEMO</div>
            <div className="mini-feed" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

