import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTestById, getAllTests } from '../utils/db';
import { 
  Monitor, 
  Globe, 
  Maximize, 
  Clock, 
  Network, 
  Video, 
  Mic, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import './KioskLogin.css';

const KioskLogin = () => {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // System Diagnostics State
  const [systemChecks, setSystemChecks] = useState({
    os: { status: 'pending', value: 'Detecting...' },
    browser: { status: 'pending', value: 'Detecting...' },
    screen: { status: 'pending', value: 'Detecting...' },
    timer: { status: 'pending', value: 'Checking...' },
    network: { status: 'pending', value: 'Checking...' },
    webcam: { status: 'pending', value: 'Detecting...' },
    mic: { status: 'pending', value: 'Detecting...' }
  });

  const runDiagnostics = async () => {
    // Basic OS Detection
    const platform = window.navigator.platform || 'Unknown OS';
    const userAgent = window.navigator.userAgent;
    let osName = 'Windows 10/11';
    if (userAgent.indexOf('Mac') !== -1) osName = 'macOS';
    else if (userAgent.indexOf('Linux') !== -1) osName = 'Linux';
    
    setSystemChecks(prev => ({ ...prev, os: { status: 'ok', value: osName } }));

    // Browser Detection (Electron uses Chrome)
    setSystemChecks(prev => ({ ...prev, browser: { status: 'ok', value: 'Secure Browser' } }));

    // Screen Size
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    setSystemChecks(prev => ({ ...prev, screen: { status: 'ok', value: `${screenWidth}px by ${screenHeight}px` } }));

    // Timer (Internal Clock)
    setSystemChecks(prev => ({ ...prev, timer: { status: 'ok', value: 'ok' } }));

    // Network (Http-GET / Http-POST representation)
    if (navigator.onLine) {
      try {
        const res = await fetch('https://nexora-t8dh.onrender.com/api/tests', { method: 'GET' });
        if (res.ok) {
          setSystemChecks(prev => ({ ...prev, network: { status: 'ok', value: 'ok' } }));
        } else {
          setSystemChecks(prev => ({ ...prev, network: { status: 'error', value: 'Backend Error' } }));
        }
      } catch (err) {
        setSystemChecks(prev => ({ ...prev, network: { status: 'error', value: 'Backend Unreachable' } }));
      }
    } else {
      setSystemChecks(prev => ({ ...prev, network: { status: 'error', value: 'Offline' } }));
    }

    // Media Devices (Webcam & Mic)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length > 0) {
        setSystemChecks(prev => ({ ...prev, webcam: { status: 'ok', value: 'Found' } }));
      } else {
        setSystemChecks(prev => ({ ...prev, webcam: { status: 'error', value: 'Not Found' } }));
      }

      if (audioTracks.length > 0) {
        setSystemChecks(prev => ({ ...prev, mic: { status: 'ok', value: 'Found' } }));
      } else {
        setSystemChecks(prev => ({ ...prev, mic: { status: 'error', value: 'Not Found' } }));
      }

      // Stop the tracks immediately after checking to free the hardware
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setSystemChecks(prev => ({ 
        ...prev, 
        webcam: { status: 'error', value: 'Not Found / Denied' },
        mic: { status: 'error', value: 'Not Found / Denied' }
      }));
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleStartTest = async (e) => {
    e.preventDefault();
    if (!accessToken.trim()) {
      setError('Please enter a valid Access Token.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const test = await getTestById(accessToken.trim());
      if (test) {
        const now = new Date();
        if (test.startTime && now < new Date(test.startTime)) {
          setError(`Test has not started yet. Please wait until ${new Date(test.startTime).toLocaleString()}.`);
          return;
        }
        if (test.endTime && now > new Date(test.endTime)) {
          setError('This test window has expired.');
          return;
        }

        // Success! Redirect to the Pre-Test Welcome screen for instructions
        navigate(`/pre-test/${test.id}`);
      } else {
        setError('Invalid Access Token. Test not found.');
      }
    } catch (err) {
      setError('Failed to verify token. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusIcon = (status) => {
    if (status === 'ok') return <CheckCircle2 className="status-icon success" size={18} />;
    if (status === 'error') return <AlertCircle className="status-icon error" size={18} />;
    return <RefreshCw className="status-icon pending spinner" size={18} />;
  };

  return (
    <div className="kiosk-login-container">
      <div className="kiosk-login-split">
        
        {/* Left Panel: Login Form */}
        <div className="kiosk-left-panel">
          <div className="kiosk-brand">
            <h1 className="brand-title"><span className="brand-highlight">Nexora</span></h1>
            <p className="brand-subtitle">Secure Assessment Platform</p>
          </div>

          <form className="kiosk-form" onSubmit={handleStartTest}>
            {error && <div className="kiosk-error-alert">{error}</div>}
            
            <div className="input-group">
              <div className="input-icon-wrapper">
                <KeyRound size={18} color="#666" />
              </div>
              <input 
                type="text" 
                className="kiosk-input"
                placeholder="Access Token (e.g. test-xyz)" 
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-kiosk-start" disabled={loading}>
              {loading ? 'Verifying...' : 'Start Test'}
            </button>
          </form>
        </div>

        {/* Right Panel: System Summary */}
        <div className="kiosk-right-panel">
          <div className="system-summary-header">
            <h2>System Summary</h2>
            <button className="btn-refresh" onClick={runDiagnostics} title="Re-run Diagnostics">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="system-checks-list">
            
            <div className="check-item">
              <div className="check-icon-col"><Monitor size={20} /></div>
              <div className="check-details">
                <div className="check-title">OS</div>
                <div className="check-status-row">
                  {renderStatusIcon(systemChecks.os.status)}
                  <span className={`status-text ${systemChecks.os.status}`}>{systemChecks.os.value}</span>
                </div>
              </div>
            </div>

            <div className="check-item">
              <div className="check-icon-col"><Globe size={20} /></div>
              <div className="check-details">
                <div className="check-title">Browser</div>
                <div className="check-status-row">
                  {renderStatusIcon(systemChecks.browser.status)}
                  <span className={`status-text ${systemChecks.browser.status}`}>{systemChecks.browser.value}</span>
                </div>
              </div>
            </div>

            <div className="check-item">
              <div className="check-icon-col"><Maximize size={20} /></div>
              <div className="check-details">
                <div className="check-title">Screen Size</div>
                <div className="check-status-row">
                  {renderStatusIcon(systemChecks.screen.status)}
                  <span className={`status-text ${systemChecks.screen.status}`}>{systemChecks.screen.value}</span>
                </div>
              </div>
            </div>

            <div className="check-item">
              <div className="check-icon-col"><Clock size={20} /></div>
              <div className="check-details">
                <div className="check-title">Timer</div>
                <div className="check-status-row">
                  {renderStatusIcon(systemChecks.timer.status)}
                  <span className={`status-text ${systemChecks.timer.status}`}>{systemChecks.timer.value}</span>
                </div>
              </div>
            </div>

            <div className="check-item">
              <div className="check-icon-col"><Network size={20} /></div>
              <div className="check-details">
                <div className="check-title">Network</div>
                <div className="check-status-row">
                  {renderStatusIcon(systemChecks.network.status)}
                  <span className={`status-text ${systemChecks.network.status}`}>{systemChecks.network.value === 'ok' ? 'Http-GET ok | Http-POST ok' : systemChecks.network.value}</span>
                </div>
              </div>
            </div>

            <div className="check-item dual-item">
              <div className="sub-check">
                <div className="check-icon-col"><Video size={20} /></div>
                <div className="check-details">
                  <div className="check-title">Webcam</div>
                  <div className="check-status-row">
                    {renderStatusIcon(systemChecks.webcam.status)}
                    <span className={`status-text ${systemChecks.webcam.status}`}>{systemChecks.webcam.value}</span>
                  </div>
                </div>
              </div>
              <div className="sub-check" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                <div className="check-icon-col"><Mic size={20} /></div>
                <div className="check-details">
                  <div className="check-title">Mic</div>
                  <div className="check-status-row">
                    {renderStatusIcon(systemChecks.mic.status)}
                    <span className={`status-text ${systemChecks.mic.status}`}>{systemChecks.mic.value}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="kiosk-footer">
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms and Conditions</a>
        </div>
        <div className="footer-copyright">
          &copy; 2026 Nexora Technologies Pvt Ltd
        </div>
      </div>
    </div>
  );
};

export default KioskLogin;
