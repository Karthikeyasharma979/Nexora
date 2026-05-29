import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play, Wifi, Monitor, Lock, Camera } from 'lucide-react';
import { getTestById } from '../utils/db';
import './PreTestWelcome.css';

const CAROUSEL_SLIDES = [
  {
    icon: <Wifi size={100} color="#607d8b" />,
    title: 'Internet Connectivity',
    desc: 'Ensure that you have a stable internet connection with a minimum speed of 512 kbps'
  },
  {
    icon: <Monitor size={100} color="#607d8b" />,
    title: 'Supported Browsers',
    desc: 'Please use the latest version of Google Chrome or Mozilla Firefox for the best experience.'
  },
  {
    icon: <Camera size={100} color="#607d8b" />,
    title: 'Webcam & Audio',
    desc: 'Make sure your webcam and microphone are working and you are in a well-lit room.'
  }
];

const PreTestWelcome = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [testDetails, setTestDetails] = useState(null);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselPlaying, setIsCarouselPlaying] = useState(true);
  const [showCookieBanner, setShowCookieBanner] = useState(true);
  const [timeError, setTimeError] = useState(null);

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
        <div className="pt-mercer-logo">
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
              <span className="pt-stat-value">{testDetails.duration / 60} Minutes</span>
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

        {/* Right Side: Carousel Card */}
        <div className="pt-right-col">
          <div className="pt-carousel-card">
            <button 
              className="pt-carousel-nav left"
              onClick={() => setCurrentSlide(prev => prev === 0 ? CAROUSEL_SLIDES.length - 1 : prev - 1)}
            >
              <ChevronLeft size={30} color="#003b6e" />
            </button>

            <div className="pt-carousel-content">
              <div className="pt-carousel-icon">
                {CAROUSEL_SLIDES[currentSlide].icon}
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
                {isCarouselPlaying ? <Pause size={14} color="#0056b3" /> : <Play size={14} color="#0056b3" />}
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
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-footer">
        <div className="pt-footer-col">
          Nexora Online Assessment ©<br/>2021-2031
        </div>
        <div className="pt-footer-col">
          Need Help? Contact us (Please add<br/>country code while dialing)
        </div>
        <div className="pt-footer-col contacts">
          <span>🇺🇸 +1 (800) 265-6038</span>
          <span>🇮🇳 +91 80471-89190</span>
        </div>
        <div className="pt-footer-links">
          <a href="#">Manage cookies</a>
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
            <button className="pt-cookie-btn secondary">Manage Cookies</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreTestWelcome;
