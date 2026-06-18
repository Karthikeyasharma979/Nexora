import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getTestById } from '../utils/db';
import './PreTestWelcome.css';

const CAROUSEL_SLIDES = [
  {
    image: '/wifi.png',
    title: 'Internet Connectivity',
    desc: 'Ensure that you have a stable internet connection with a minimum speed of 512 kbps'
  },
  {
    image: '/f5.png',
    title: 'Don’t Refresh',
    desc: 'Don’t refresh the webpage during the assessment. This will lead to immediate submission of your responses.'
  },
  {
    image: '/savedisk.png',
    title: 'Auto Save',
    desc: 'All your responses are saved automatically. In case of disconnection or shutdown, you will still be able to resume easily.'
  }
];

const PreTestWelcome = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [testDetails, setTestDetails] = useState(null);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselPlaying, setIsCarouselPlaying] = useState(true);
  const [showCookieBanner, setShowCookieBanner] = useState(true);
  const [showCookieManager, setShowCookieManager] = useState(false);
  const [cookieSettings, setCookieSettings] = useState({
    essential: true,
    analytics: false,
    marketing: false
  });
  const [timeError, setTimeError] = useState(null);

  // Anti-zoom enforcement
  useEffect(() => {
    const preventZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.type === 'wheel') e.preventDefault();
        if (e.type === 'keydown' && (e.key === '=' || e.key === '-' || e.key === '0' || e.key === '+')) e.preventDefault();
      }
    };
    window.addEventListener('wheel', preventZoom, { passive: false });
    window.addEventListener('keydown', preventZoom, { passive: false });
    return () => {
      window.removeEventListener('wheel', preventZoom);
      window.removeEventListener('keydown', preventZoom);
    };
  }, []);

  useEffect(() => {
    getTestById(testId)
      .then(test => {
        if (test) {
          setTestDetails(test);
          const now = new Date();
          if (test.startTime && now < new Date(test.startTime)) {
            setTimeError(`Test has not started yet. Please wait until ${new Date(test.startTime).toLocaleString()}.`);
          } else if (test.endTime && now > new Date(test.endTime)) {
            setTimeError('This test window has expired.');
          }
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(err => {
        console.error("Error fetching test details:", err);
        navigate('/', { replace: true });
      });
  }, [testId, navigate]);

  useEffect(() => {
    let interval;
    if (isCarouselPlaying) {
      interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isCarouselPlaying]);

  const proceedToTest = () => {
    // Navigate to the intermediate diagnostics page to request permissions
    navigate(`/diagnostics/${testId}`);
  };

  if (!testDetails) return <div style={{padding: '50px', textAlign: 'center'}}>Loading test...</div>;

  // Calculate unique sections
  const uniqueSections = new Set(testDetails.questions.map(q => q.sectionName || 'Section 1'));
  const sectionCount = uniqueSections.size;

  return (
    <div className="pt-container">
      {/* Top Logo */}
      <div className="pt-logo-header">
        <div className="pt-mercer-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/favicon.svg" alt="Nexora Logo" style={{ height: '40px' }} />
          <strong>Nexora</strong>
        </div>
      </div>

      <div className="pt-main-content">
        {/* Left Side: Test Info */}
        <div className="pt-left-col">
          <p className="pt-hi-text">Hi,</p>
          <h2 className="pt-welcome-text">Welcome to</h2>
          <h1 className="pt-test-name">{testDetails.name}</h1>

          <div className="pt-test-stats">
            <div className="pt-stat-item">
              <span className="pt-stat-label">Question count:</span>
              <span className="pt-stat-value">{testDetails.questions.length} Questions</span>
            </div>
            <div className="pt-stat-item">
              <span className="pt-stat-label">Section count:</span>
              <span className="pt-stat-value">{sectionCount} Section{sectionCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="pt-stat-item">
              <span className="pt-stat-label">Test duration:</span>
              <span className="pt-stat-value">
                {testDetails.duration / 60} Minutes
                {testDetails.timeMode === 'section' ? ' (Strictly Section-timed)' : ''}
              </span>
            </div>
          </div>

          {timeError ? (
            <div style={{ color: '#d32f2f', backgroundColor: '#fdecea', padding: '15px', borderRadius: '4px', marginTop: '30px', fontWeight: '500', borderLeft: '4px solid #d32f2f' }}>
              {timeError}
            </div>
          ) : (
            <button className="pt-proceed-btn" onClick={proceedToTest}>
              Proceed
            </button>
          )}
        </div>

        {/* Right Side: Carousel Card or Custom Instructions */}
        <div className="pt-right-col">
          {testDetails.testInstructions ? (
            <div className="pt-carousel-card" style={{ padding: '30px', alignItems: 'flex-start', overflowY: 'auto', display: 'block' }}>
              <h3 className="pt-carousel-title" style={{ marginBottom: '20px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Test Instructions</h3>
              <div style={{ whiteSpace: 'pre-wrap', color: '#475569', fontSize: '15px', lineHeight: '1.6', textAlign: 'left' }}>
                {testDetails.testInstructions}
              </div>
            </div>
          ) : (
          <div className="pt-carousel-card">
            <button 
              className="pt-carousel-nav left"
              onClick={() => setCurrentSlide(prev => prev === 0 ? CAROUSEL_SLIDES.length - 1 : prev - 1)}
            >
              <ChevronLeft size={30} color="#003b6e" />
            </button>

            <div className="pt-carousel-content">
              <div className="pt-carousel-icon">
                {CAROUSEL_SLIDES[currentSlide].image ? (
                  <img src={CAROUSEL_SLIDES[currentSlide].image} alt={CAROUSEL_SLIDES[currentSlide].title} style={{ height: '100px', objectFit: 'contain' }} />
                ) : (
                  CAROUSEL_SLIDES[currentSlide].icon
                )}
              </div>
              <h3 className="pt-carousel-title">{CAROUSEL_SLIDES[currentSlide].title}</h3>
              <p className="pt-carousel-desc">{CAROUSEL_SLIDES[currentSlide].desc}</p>
            </div>

            <button 
              className="pt-carousel-nav right"
              onClick={() => setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length)}
            >
              <ChevronRight size={30} color="#003b6e" />
            </button>

            <div className="pt-carousel-controls">
              <button 
                className="pt-play-pause"
                onClick={() => setIsCarouselPlaying(!isCarouselPlaying)}
              >
                {isCarouselPlaying ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '16px', marginRight: '4px' }}>
                    <div style={{ width: '5px', height: '100%', backgroundColor: '#0f4c9c', borderRadius: '1px' }}></div>
                    <div style={{ width: '5px', height: '100%', backgroundColor: '#0f4c9c', borderRadius: '1px' }}></div>
                  </div>
                ) : (
                  <Play size={18} color="#0f4c9c" fill="#0f4c9c" style={{ marginRight: '4px' }} />
                )}
              </button>
              <div className="pt-dots">
                {CAROUSEL_SLIDES.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`pt-dot ${currentSlide === idx ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(idx)}
                  />
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-footer">
        <div className="pt-footer-col">
          Nexora Online Assessment ©<br/>2021-2031
        </div>
        <div className="pt-footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); setShowCookieManager(true); }}>Manage cookies</a>
          <a href="#">Privacy Notice</a>
          <a href="#">Terms of Services</a>
        </div>
        <div className="pt-footer-logo">
          Powered By <strong>Nexora</strong>
        </div>
      </footer>

      {/* Cookie Banner */}
      {showCookieBanner && (
        <div className="pt-cookie-banner">
          <div className="pt-cookie-text">
            We use cookies to optimize the performance of this site and give you the best user experience. By using the site, you accept our use of cookies.
          </div>
          <div className="pt-cookie-actions">
            <button className="pt-cookie-btn primary" onClick={() => setShowCookieBanner(false)}>Okay</button>
            <button className="pt-cookie-btn secondary" onClick={() => { setShowCookieBanner(false); setShowCookieManager(true); }}>Manage Cookies</button>
          </div>
        </div>
      )}

      {/* Cookie Manager Modal */}
      {showCookieManager && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>Manage Cookie Preferences</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
              We use cookies to help you navigate efficiently and perform certain functions. You will find detailed information about all cookies under each consent category below.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <strong style={{ color: '#1e293b', fontSize: '14px' }}>Essential Cookies</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Required for the website to function.</p>
                </div>
                <input type="checkbox" checked={true} disabled style={{ accentColor: '#1e56a0', width: '18px', height: '18px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <strong style={{ color: '#1e293b', fontSize: '14px' }}>Analytics Cookies</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Help us understand how visitors interact with the site.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={cookieSettings.analytics} 
                  onChange={(e) => setCookieSettings({...cookieSettings, analytics: e.target.checked})}
                  style={{ accentColor: '#1e56a0', width: '18px', height: '18px', cursor: 'pointer' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#1e293b', fontSize: '14px' }}>Marketing Cookies</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Used to deliver relevant advertisements.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={cookieSettings.marketing} 
                  onChange={(e) => setCookieSettings({...cookieSettings, marketing: e.target.checked})}
                  style={{ accentColor: '#1e56a0', width: '18px', height: '18px', cursor: 'pointer' }} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowCookieManager(false)}
                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', backgroundColor: 'transparent', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '500' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowCookieManager(false)}
                style={{ padding: '8px 16px', border: 'none', backgroundColor: '#1e56a0', borderRadius: '6px', cursor: 'pointer', color: 'white', fontWeight: '500' }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreTestWelcome;
