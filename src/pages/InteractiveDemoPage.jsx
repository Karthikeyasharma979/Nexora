import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Video, ScanFace, Lock, Activity, Globe } from 'lucide-react';
import NavBar from '../components/NavBar';
import './HomePage.css'; // Inherits shared layout and animation styles
import './InteractiveDemoPage.css';

const InteractiveDemoPage = () => {
  const [logTime, setLogTime] = useState(new Date().toLocaleTimeString());
  const mockupRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setLogTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!mockupRef.current) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const xPos = (clientX / innerWidth) * 2 - 1;
      const yPos = (clientY / innerHeight) * 2 - 1;
      const rotX = yPos * -8; 
      const rotY = xPos * 8;
      mockupRef.current.style.transform = `perspective(1200px) rotateX(${8 + rotX}deg) rotateY(${-2 + rotY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const container = document.querySelector('.demo-page-container');
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', () => {
        if (mockupRef.current) {
          mockupRef.current.style.transform = `perspective(1200px) rotateX(8deg) rotateY(-2deg) scale3d(1, 1, 1)`;
        }
      });
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  return (
    <div className="demo-page-container">
      <div className="cyber-grid-bg"></div>
      <NavBar />
      
      <main className="demo-main">
        <h1 className="page-title">Interactive <span className="text-gradient">Demo</span></h1>
        <p className="page-subtitle">Experience the secure, locked-down environment your candidates will see.</p>
        
        <section className="browser-mockup-container animate-in">
          <div className="hologram-base"></div>
          <div className="browser-frame" ref={mockupRef}>
            <div className="screen-reflection"></div>
            <div className="browser-header">
              <div className="browser-dots">
                <div className="dot dot-red"></div>
                <div className="dot dot-yellow"></div>
                <div className="dot dot-green"></div>
              </div>
              <div className="browser-search-bar">
                <ShieldCheck size={14} className="browser-ssl-icon" />
                <span>https://nexora.secure/kiosk-session/exam-302</span>
              </div>
            </div>
            
            <div className="browser-content">
              {/* Webcam Feed Box */}
              <div className="proctor-feed-box">
                <div className="feed-scan-line"></div>
                <div className="feed-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Video size={16} className="recording-icon" />
                    <span className="feed-title">PROCTOR FEED</span>
                  </div>
                  <div className="feed-status-badge">
                    <span className="pulse-dot"></span>
                    <span>AI Monitoring</span>
                  </div>
                </div>
                
                <div className="feed-visual-container">
                  <div className="radar-sweep"></div>
                  <div className="detection-box">
                    <span className="detection-label">CANDIDATE: VERIFIED (99.8%)</span>
                    <div className="corner corner-tl"></div>
                    <div className="corner corner-tr"></div>
                    <div className="corner corner-bl"></div>
                    <div className="corner corner-br"></div>
                  </div>
                  <svg viewBox="0 0 100 100" className="face-wireframe-svg">
                    <path className="face-outline" d="M50 15 C20 15 20 60 20 70 C20 85 35 95 50 95 C65 95 80 85 80 70 C80 60 80 15 50 15 Z" />
                    <path className="grid-lines" d="M20 40 L80 40 M20 60 L80 60 M40 15 L40 90 M60 15 L60 90" />
                    <circle cx="35" cy="45" r="4" className="eye-node" />
                    <circle cx="65" cy="45" r="4" className="eye-node" />
                    <path className="mouth-node" d="M40 75 Q50 85 60 75" />
                    <circle cx="50" cy="50" r="1.5" className="tracking-point" />
                    <circle cx="50" cy="65" r="1.5" className="tracking-point" />
                  </svg>
                  <div className="hud-overlay">
                    <div className="hud-text top-left">LAT: 12ms</div>
                    <div className="hud-text top-right">FPS: 60</div>
                    <div className="hud-text bottom-left">RES: 1080p</div>
                    <div className="hud-text bottom-right"><ScanFace size={12}/></div>
                  </div>
                </div>
                
                <div className="feed-diagnostics-text">
                  <div className="diagnostic-row">
                    <span>Status:</span>
                    <span className="diagnostic-value-green glitch-text" data-text="Lockdown Active">Lockdown Active</span>
                  </div>
                  <div className="diagnostic-row">
                    <span>Time:</span>
                    <span className="mono-text">{logTime}</span>
                  </div>
                  <div className="diagnostic-row">
                    <span>Integrity Score:</span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>100/100</span>
                  </div>
                </div>
              </div>

              {/* Sidebar Active Policy Card */}
              <div className="browser-lock-sidebar">
                <div className="sidebar-header">
                  Active Kiosk Policies
                </div>

                <div className="lock-card magnetic-hover">
                  <div className="lock-card-icon icon-violet-solid">
                    <Lock size={18} />
                  </div>
                  <div className="lock-card-details">
                    <div className="lock-card-title">OS Shell Lockdown</div>
                    <div className="lock-card-subtitle">Desktop access restricted</div>
                  </div>
                  <div className="lock-indicator-glow secured"></div>
                </div>

                <div className="lock-card magnetic-hover">
                  <div className="lock-card-icon icon-rose-solid">
                    <Activity size={18} />
                  </div>
                  <div className="lock-card-details">
                    <div className="lock-card-title">Input Restriction</div>
                    <div className="lock-card-subtitle">Key combos & paste blocked</div>
                  </div>
                  <div className="lock-indicator-glow secured"></div>
                </div>

                <div className="lock-card magnetic-hover">
                  <div className="lock-card-icon icon-amber-solid">
                    <Globe size={18} />
                  </div>
                  <div className="lock-card-details">
                    <div className="lock-card-title">Multi-Display Block</div>
                    <div className="lock-card-subtitle">Auxiliary screens restricted</div>
                  </div>
                  <div className="lock-indicator-glow secured"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default InteractiveDemoPage;
