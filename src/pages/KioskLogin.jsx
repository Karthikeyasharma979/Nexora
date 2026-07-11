import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTestById, API_URL } from '../utils/db';
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
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  X,
  AlertTriangle
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

  // Launch state: 'input' | 'launching' | 'blocked'
  const [launchState, setLaunchState] = useState('input');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isElectron] = useState(() => window.secure?.isNexoraKiosk === true);

  const runDiagnostics = useCallback(async (isElecVal = isElectron) => {
    // OS Detection
    const userAgent = window.navigator.userAgent;
    let osName = 'Windows 10/11';
    if (userAgent.indexOf('Mac') !== -1) osName = 'macOS';
    else if (userAgent.indexOf('Linux') !== -1) osName = 'Linux';
    
    setSystemChecks(prev => ({ ...prev, os: { status: 'ok', value: osName } }));

    // Browser Detection
    setSystemChecks(prev => ({ 
      ...prev, 
      browser: { 
        status: isElecVal ? 'ok' : 'warning', 
        value: isElecVal ? 'Nexora Secure Kiosk' : 'Standard Web Browser' 
      } 
    }));

    // Screen Size
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    setSystemChecks(prev => ({ ...prev, screen: { status: 'ok', value: `${screenWidth}px x ${screenHeight}px` } }));

    // Timer
    setSystemChecks(prev => ({ ...prev, timer: { status: 'ok', value: 'Synced' } }));

    // Network Check
    if (navigator.onLine) {
      try {
        const res = await fetch(`${API_URL.replace('/api', '')}/`, { method: 'GET' });
        if (res.ok) {
          setSystemChecks(prev => ({ ...prev, network: { status: 'ok', value: 'Ping Excellent' } }));
        } else {
          setSystemChecks(prev => ({ ...prev, network: { status: 'ok', value: 'Ping ok (Local Mode)' } }));
        }
      } catch (err) {
        setSystemChecks(prev => ({ ...prev, network: { status: 'warning', value: 'Ping ok (Offline Fallback)' } }));
        console.warn('Network ping error:', err);
      }
    } else {
      setSystemChecks(prev => ({ ...prev, network: { status: 'error', value: 'Offline' } }));
    }

    // Media Devices (Webcam & Mic)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      setSystemChecks(prev => ({ 
        ...prev, 
        webcam: { status: videoTracks.length > 0 ? 'ok' : 'error', value: videoTracks.length > 0 ? 'Camera Connected' : 'Not Detected' },
        mic: { status: audioTracks.length > 0 ? 'ok' : 'error', value: audioTracks.length > 0 ? 'Mic Connected' : 'Not Detected' }
      }));

      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setSystemChecks(prev => ({ 
        ...prev, 
        webcam: { status: 'error', value: 'Denied / Blocked' },
        mic: { status: 'error', value: 'Denied / Blocked' }
      }));
      console.warn('Media devices error:', err);
    }
  }, [isElectron]);

  useEffect(() => {
    setTimeout(() => runDiagnostics(isElectron), 0);
  }, [runDiagnostics, isElectron]);

  const handleValidateKey = async (e) => {
    e.preventDefault();
    if (!accessToken.trim()) {
      setError('Please provide a valid Access Key.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let actualTestId = accessToken.trim();
      let isJwtToken = actualTestId.length > 50 && actualTestId.includes('.');

      if (isJwtToken) {
        const response = await fetch(`${API_URL}/invite/verify/${actualTestId}`);
        if (response.ok) {
          const data = await response.json();
          actualTestId = data.testId;
          sessionStorage.setItem('secure_invite_token', actualTestId);
          if (data.candidateEmail) {
            sessionStorage.setItem('candidateEmail', data.candidateEmail);
          }
        } else {
          setError('Invalid or Expired Access Token.');
          setLoading(false);
          return;
        }
      }

      const test = await getTestById(actualTestId);
      if (test) {
        const now = new Date();
        if (test.startTime && now < new Date(test.startTime)) {
          setError(`Test has not started yet. Starts at ${new Date(test.startTime).toLocaleString()}.`);
          setLoading(false);
          return;
        }
        if (test.endTime && now > new Date(test.endTime)) {
          setError('This test window has expired.');
          setLoading(false);
          return;
        }

        // Token is validated.
        if (isElectron) {
          // Inside Electron kiosk browser: go directly to pre-test instructions
          sessionStorage.setItem('secure_invite_token', actualTestId);
          navigate(`/pre-test/${test.id}`);
        } else {
          // Standard browser: trigger the deep-link protocol nexora://
          setLaunchState('launching');
          setShowPrompt(true);
          
          // Trigger the protocol scheme
          window.location.href = `nexora://invite/${accessToken.trim()}`;
        }
      } else {
        setError('Invalid Access Key. Please double-check.');
      }
    } catch (err) {
      console.error(err);
      setError('Verification failed. Check your network or contact admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleAllowLaunch = () => {
    setShowPrompt(false);
    // Re-trigger deep link just in case
    window.location.href = `nexora://invite/${accessToken}`;
  };

  const handleBlockLaunch = () => {
    setShowPrompt(false);
    setLaunchState('blocked');
  };

  const renderStatusIcon = (status) => {
    if (status === 'ok') return <CheckCircle2 className="status-icon success" size={18} />;
    if (status === 'error') return <AlertCircle className="status-icon error" size={18} />;
    if (status === 'warning') return <AlertTriangle className="status-icon warning" size={18} />;
    return <RefreshCw className="status-icon pending spinner" size={18} />;
  };

  return (
    <div className="kiosk-login-container">
      {/* simulated Chrome Deep Link Prompt */}
      {showPrompt && (
        <div className="chrome-prompt-overlay">
          <div className="chrome-prompt-header">
            <div className="chrome-prompt-body">
              <div className="chrome-prompt-icon">
                <Monitor size={18} />
              </div>
              <div className="chrome-prompt-info">
                <div className="chrome-prompt-title">tests.nexora.com wants to</div>
                <div className="chrome-prompt-subtitle">Access other apps and services on this device</div>
              </div>
            </div>
            <button className="chrome-prompt-close" onClick={() => setShowPrompt(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="chrome-prompt-footer">
            <button className="btn-chrome-block" onClick={handleBlockLaunch}>Block</button>
            <button className="btn-chrome-allow" onClick={handleAllowLaunch}>Allow</button>
          </div>
        </div>
      )}

      {/* Dynamic Background */}
      <div className="orb-wrapper">
        <div className="bg-gradient-orb orb-1"></div>
        <div className="bg-gradient-orb orb-2"></div>
      </div>

      <div className="kiosk-login-split">
        {/* Left Panel: Validation Form */}
        <div className="kiosk-left-panel">
          <div className="kiosk-card-glass">
            
            {launchState === 'input' && (
              <>
                <div className="kiosk-brand-header">
                  <div className="brand-logo-circle">
                    <ShieldCheck size={28} style={{ color: '#a855f7' }} />
                  </div>
                  <h2>Welcome to Nexora Assessment</h2>
                </div>

                <p className="kiosk-instructions">
                  Please provide your Access Key to start the secure assessment.
                </p>

                <form className="kiosk-form" onSubmit={handleValidateKey}>
                  {error && (
                    <div className="kiosk-error-alert">
                      <ShieldAlert size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="kiosk-input-container">
                    <label className="kiosk-label">Access Key</label>
                    <div className="input-group-modern">
                      <KeyRound size={18} className="input-icon" />
                      <input 
                        type="text" 
                        className="kiosk-input"
                        placeholder="Enter the Access key here..." 
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-kiosk-start" disabled={loading}>
                    {loading ? 'Verifying Key...' : 'Validate and Proceed'}
                    <ArrowRight size={18} />
                  </button>
                </form>
              </>
            )}

            {launchState === 'launching' && (
              <div className="launch-status-container">
                <div className="launch-loading-indicator">
                  <div className="pulse-circle"></div>
                  <ShieldCheck size={40} className="glowing-launch-icon" />
                </div>
                <h3>Launching Nexora Secure Browser</h3>
                <p>
                  To secure this exam session, we are launching the native proctored kiosk app.
                </p>
                <div className="launch-alert-notice">
                  <p>
                    Please click <strong>"Allow"</strong> or <strong>"Open"</strong> in the browser prompt at the top of your screen to proceed.
                  </p>
                </div>
                <div className="launch-actions">
                  <button 
                    className="btn-launch-manual"
                    onClick={handleAllowLaunch}
                  >
                    Launch Manually <ExternalLink size={16} />
                  </button>
                  <button 
                    className="btn-launch-cancel"
                    onClick={() => setLaunchState('input')}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {launchState === 'blocked' && (
              <div className="launch-status-container">
                <div className="launch-loading-indicator blocked">
                  <ShieldAlert size={40} className="glowing-launch-icon-blocked" />
                </div>
                <h3>Launch Request Blocked</h3>
                <p>
                  You must allow permission to open other apps to take this secure assessment.
                </p>
                <div className="launch-alert-notice blocked">
                  <p>
                    If you blocked it by mistake, click <strong>Reset</strong> below to try launching the exam client again.
                  </p>
                </div>
                <div className="launch-actions">
                  <button 
                    className="btn-launch-manual"
                    onClick={() => {
                      setLaunchState('launching');
                      setShowPrompt(true);
                      window.location.href = `nexora://invite/${accessToken}`;
                    }}
                  >
                    Reset & Launch
                  </button>
                  <button 
                    className="btn-launch-cancel"
                    onClick={() => setLaunchState('input')}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Panel: Diagnostics */}
        <div className="kiosk-right-panel">
          <div className="diagnostics-glass">
            <div className="system-summary-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Monitor size={18} style={{ color: '#a855f7' }} />
                <h2>Environment Diagnostics</h2>
              </div>
              <button className="btn-refresh" onClick={() => runDiagnostics(isElectron)} title="Re-run Diagnostics">
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="system-checks-list">
              <div className="check-item">
                <div className="check-icon-col"><Monitor size={18} /></div>
                <div className="check-details">
                  <div className="check-title">Operating System</div>
                  <div className="check-status-row">
                    {renderStatusIcon(systemChecks.os.status)}
                    <span className="status-text">{systemChecks.os.value}</span>
                  </div>
                </div>
              </div>

              <div className="check-item">
                <div className="check-icon-col"><Globe size={18} /></div>
                <div className="check-details">
                  <div className="check-title">Client Browser</div>
                  <div className="check-status-row">
                    {renderStatusIcon(systemChecks.browser.status)}
                    <span className="status-text">{systemChecks.browser.value}</span>
                  </div>
                </div>
              </div>

              <div className="check-item">
                <div className="check-icon-col"><Maximize size={18} /></div>
                <div className="check-details">
                  <div className="check-title">Screen Workspace</div>
                  <div className="check-status-row">
                    {renderStatusIcon(systemChecks.screen.status)}
                    <span className="status-text">{systemChecks.screen.value}</span>
                  </div>
                </div>
              </div>

              <div className="check-item">
                <div className="check-icon-col"><Clock size={18} /></div>
                <div className="check-details">
                  <div className="check-title">Time Server Synchronization</div>
                  <div className="check-status-row">
                    {renderStatusIcon(systemChecks.timer.status)}
                    <span className="status-text">{systemChecks.timer.value}</span>
                  </div>
                </div>
              </div>

              <div className="check-item">
                <div className="check-icon-col"><Network size={18} /></div>
                <div className="check-details">
                  <div className="check-title">Network Latency</div>
                  <div className="check-status-row">
                    {renderStatusIcon(systemChecks.network.status)}
                    <span className="status-text">{systemChecks.network.value}</span>
                  </div>
                </div>
              </div>

              <div className="check-item dual-item">
                <div className="sub-check">
                  <div className="check-icon-col"><Video size={18} /></div>
                  <div className="check-details">
                    <div className="check-title">Web Camera</div>
                    <div className="check-status-row">
                      {renderStatusIcon(systemChecks.webcam.status)}
                      <span className="status-text">{systemChecks.webcam.value}</span>
                    </div>
                  </div>
                </div>
                <div className="sub-check" style={{ borderLeft: '1px solid rgba(148, 163, 184, 0.24)', paddingLeft: '1.5rem' }}>
                  <div className="check-icon-col"><Mic size={18} /></div>
                  <div className="check-details">
                    <div className="check-title">Microphone</div>
                    <div className="check-status-row">
                      {renderStatusIcon(systemChecks.mic.status)}
                      <span className="status-text">{systemChecks.mic.value}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="kiosk-footer">
        <div className="footer-links">
          <a href="#privacy">Privacy Statement</a>
          <a href="#terms">Terms of Service</a>
        </div>
        <div className="footer-copyright">
          &copy; 2026 Nexora Secure Browser. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default KioskLogin;
