import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as faceapi from '@vladmandic/face-api';
import { getTestById } from '../utils/db';
import { CheckCircle2, Circle, Laptop, Info, User, Book, MessageSquare, Check, X as XIcon, AlertTriangle, Send } from 'lucide-react';
import './Diagnostics.css';

const Diagnostics = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [testDetails, setTestDetails] = useState(null);
  
  const [permissionsStatus, setPermissionsStatus] = useState('requesting'); // 'requesting', 'granted', 'denied'
  const [errorMessage, setErrorMessage] = useState('');
  
  const [screenStatus, setScreenStatus] = useState('pending'); // 'pending', 'requesting', 'granted', 'denied'
  const [screenErrorMessage, setScreenErrorMessage] = useState('');
  
  const [currentPhase, setCurrentPhase] = useState(0); // 0: Permissions, 1: Instructions, 2: Identity Capture, 3: Modal
  const [activeTab, setActiveTab] = useState(1); // 1: Terms, 2: Face, 3: ID
  const [termsAgreed, setTermsAgreed] = useState(false);
  
  const [faceImageSrc, setFaceImageSrc] = useState(null);
  const [idImageSrc, setIdImageSrc] = useState(null);
  const [candidateName, setCandidateName] = useState('');
  const [candidateLastName, setCandidateLastName] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ text: 'Hi! How can we help you today?', sender: 'agent' }]);
  const [chatInput, setChatInput] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(err => {
        console.error("Error fetching test details:", err);
        navigate('/', { replace: true });
      });
  }, [testId, navigate]);

  const requestPermissions = useCallback(async () => {
    try {
      setPermissionsStatus('requesting');
      setErrorMessage('');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in your browser.");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Stop the tracks immediately so the camera light goes off until the test actually begins
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionsStatus('granted');
      
      // Do not automatically request screen share, wait for user click
    } catch (error) {
      console.error("Permission denied or error:", error);
      
      if (error.name === 'NotFoundError' || error.message.includes('Requested device not found')) {
        setErrorMessage("No camera or microphone found. Please connect a device and try again.");
      } else if (error.name === 'NotAllowedError') {
        setErrorMessage("Permission denied by browser. Please click the camera icon in your address bar and select 'Allow'.");
      } else {
        setErrorMessage(`Error: ${error.message}`);
      }
      
      setPermissionsStatus('denied');
    }
  }, []);

  useEffect(() => {
    if (!testDetails) return;

    if (testDetails.requireCamera !== false) {
      // Simulate checking system compatibility first, then ask for permissions
      const timer = setTimeout(() => {
        requestPermissions();
      }, 1000);
      
      // Pre-load face-api models for registration verification
      const loadFaceModels = async () => {
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
          window.isFaceApiLoaded = true;
        } catch (e) {
          console.warn("Diagnostics: Failed to pre-load face models", e);
        }
      };
      loadFaceModels();

      return () => clearTimeout(timer);
    } else {
      // If camera not required, simulate permissions granted so they can proceed immediately
      setTimeout(() => setPermissionsStatus('granted'), 0);
      // Do not automatically grant screenStatus so that screen sharing (proctoring) still works
    }
  }, [testDetails, requestPermissions]);



  const requestScreenShare = async () => {
    try {
      setScreenStatus('requesting');
      setScreenErrorMessage('');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen sharing is not supported in your browser.");
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "monitor" } 
      });
      // Keep the stream active for the duration of the test
      window.globalScreenStream = stream; // Store globally if needed later
      
      setScreenStatus('granted');
    } catch (error) {
      console.error("Screen share denied:", error);
      if (error.name === 'NotAllowedError') {
        setScreenErrorMessage("Screen sharing permission was denied. Please allow it to proceed.");
      } else {
        setScreenErrorMessage(`Error: ${error.message}`);
      }
      setScreenStatus('denied');
    }
  };

  // Electron-specific secure screen capture request via preload IPC
  const requestScreenCaptureElectron = async () => {
    try {
      setScreenStatus('requesting');
      setScreenErrorMessage('');

      if (window && window.secure && typeof window.secure.requestScreenCapture === 'function') {
        const result = await window.secure.requestScreenCapture();
        if (result && result.allowed) {
          setScreenStatus('granted');
        } else {
          setScreenStatus('denied');
          setScreenErrorMessage('Screen capture was denied or not available.');
        }
      } else {
        setScreenStatus('denied');
        setScreenErrorMessage('Secure IPC not available. Falling back to browser flow.');
      }
    } catch (e) {
      console.error('Electron screen capture error:', e);
      setScreenStatus('denied');
      setScreenErrorMessage(e.message || 'Unknown error');
    }
  };

  const handleProceed = () => {
    if (currentPhase === 0) {
      if (permissionsStatus === 'granted' && screenStatus === 'granted') {
        setCurrentPhase(1); // Move to Instructions phase
      } else {
        alert("You must grant both camera/microphone and screen sharing permissions to proceed.");
      }
    } else if (currentPhase === 1) {
      setCurrentPhase(2); // Move to Registration phase
    } else if (currentPhase === 2) {
      const isEmailEnabled = testDetails?.registrationFields?.find(f => f.id === 'email')?.isEnabled ?? true;
      const isFirstNameEnabled = testDetails?.registrationFields?.find(f => f.id === 'firstName')?.isEnabled ?? true;
      const isLastNameEnabled = testDetails?.registrationFields?.find(f => f.id === 'lastName')?.isEnabled ?? false;

      const isDetailsValid = 
        (!isFirstNameEnabled || candidateName.trim()) &&
        (!isLastNameEnabled || candidateLastName.trim()) &&
        (!isEmailEnabled || candidateEmail.trim().includes('@')) && 
        termsAgreed;

      const isCaptureValid = testDetails.requireCamera === false || (faceImageSrc && idImageSrc);
      
      if (isDetailsValid && isCaptureValid) {
        // Save registration details
        const firstName = isFirstNameEnabled ? candidateName.trim() : '';
        const lastName = isLastNameEnabled ? candidateLastName.trim() : '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Anonymous';
        sessionStorage.setItem('candidateName', fullName);
        
        sessionStorage.setItem('candidateEmail', isEmailEnabled ? candidateEmail.trim() : '');
        
        setCurrentPhase(3); // Move to "Ready to start" phase
      }
    } else if (currentPhase === 3) {
      const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
      const requireSEB = testDetails.requireSEB !== false; // Default true

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      if (isElectron || !requireSEB) {
        // If we are in the Secure Browser, OR the test doesn't require it, go straight to the test
        if (!isElectron && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => console.warn("Fullscreen request failed:", err));
        }
        navigate(`/test/${testId}`);
      } else {
        // Move to Monitored Session Gateway for web users to launch the app
        setCurrentPhase(4);
      }
    }
  };

  const finalizeAndStartTest = useCallback(async () => {

    // Save registration details to sessionStorage for the test environment to read
    const isEmailEnabled = testDetails?.registrationFields?.find(f => f.id === 'email')?.isEnabled ?? true;
    const isFirstNameEnabled = testDetails?.registrationFields?.find(f => f.id === 'firstName')?.isEnabled ?? true;
    const isLastNameEnabled = testDetails?.registrationFields?.find(f => f.id === 'lastName')?.isEnabled ?? false;

    const firstName = isFirstNameEnabled ? candidateName.trim() : '';
    const lastName = isLastNameEnabled ? candidateLastName.trim() : '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Anonymous';
    sessionStorage.setItem('candidateName', fullName);
    sessionStorage.setItem('candidateEmail', isEmailEnabled ? candidateEmail.trim() : '');

    // Stop any active video stream before navigating
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    
    // Launch the custom protocol to trigger the Secure Browser prompt
    const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
    if (isElectron) {
      navigate(`/test/${testId}`);
    } else {
      window.location.href = `nexora://test/${testId}`;
    }
  }, [testDetails, candidateName, candidateLastName, candidateEmail, navigate, testId]);

  const handleWebFallback = () => {
    if (!window.navigator.userAgent.toLowerCase().includes('electron') && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn("Fullscreen request failed:", err));
    }
    navigate(`/test/${testId}`);
  };

  useEffect(() => {
    if (currentPhase === 4) {
      // Automatically attempt to launch the secure browser when entering phase 4
      finalizeAndStartTest();
    }
  }, [currentPhase, finalizeAndStartTest]);

  useEffect(() => {
    if (currentPhase === 2 && (activeTab === 3 || activeTab === 4)) {
      if (!streamRef.current) {
        const startCamera = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (e) {
            console.error("Failed to start camera for capture:", e);
          }
        };
        startCamera();
      } else if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        // Stream is already active, just attach it to the newly rendered video element
        videoRef.current.srcObject = streamRef.current;
      }
    } else {
      // Clean up stream if not on capture tabs
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
    
    // We only clean up when the component unmounts entirely
    return () => {
      // Empty cleanup here so we don't kill the camera between tabs 2 and 3.
      // The else block above handles cleanup when moving out of phase 2.
    };
  }, [currentPhase, activeTab, faceImageSrc, idImageSrc]);

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    }
    return null;
  };

  const handleCaptureFace = async () => {
    setCaptureError('');
    if (faceImageSrc) {
      setFaceImageSrc(null); // Retake
    } else {
      if (videoRef.current && window.isFaceApiLoaded) {
        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current, 
            new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 })
          );
          if (detections.length === 0) {
            setCaptureError("No face detected! Please ensure your face is clearly visible in the camera frame.");
            return;
          }
          if (detections.length > 1) {
            setCaptureError("Multiple faces detected! Please ensure only you are in the frame.");
            return;
          }
        } catch (e) {
          console.warn("Face detection error during capture:", e);
        }
      }
      
      const img = captureImage();
      if (img) setFaceImageSrc(img);
    }
  };

  const handleCaptureId = () => {
    if (idImageSrc) {
      setIdImageSrc(null); // Retake
    } else {
      const img = captureImage();
      if (img) setIdImageSrc(img);
    }
  };

  if (!testDetails) return <div className="diag-loading">Loading Test Details...</div>;

  const sectionsMap = new Map();
  testDetails.questions.forEach(q => {
    const sName = q.sectionName || 'Section 1';
    if (!sectionsMap.has(sName)) sectionsMap.set(sName, 0);
    sectionsMap.set(sName, sectionsMap.get(sName) + 1);
  });
  const sectionsList = Array.from(sectionsMap.entries()).map(([name, count]) => ({ name, count }));

  if (currentPhase === 4) {
    return (
      <div className="diag-fullscreen-gateway">
          <div className="diag-monitor-modal-container">
            <div className="diag-monitor-bg-text">NEXORA</div>
            <div className="diag-monitor-modal" style={{ maxWidth: '600px' }}>
              <div className="diag-monitor-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '20px 30px' }}>
                <h3 style={{ fontSize: '18px', color: '#1e293b' }}>Launch Nexora Secure Browser</h3>
              </div>
              <div className="diag-monitor-body" style={{ textAlign: 'left', flexDirection: 'column', gap: '0', padding: '30px' }}>
                <p style={{ marginBottom: '15px', color: '#475569' }}>Please keep this in mind before starting the test:</p>
                
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '20px', marginBottom: '20px' }}>
                  <strong style={{ color: '#0f172a', display: 'block', marginBottom: '10px' }}>Quick Note:</strong>
                  <ul style={{ paddingLeft: '20px', color: '#334155', margin: '0 0 20px 0', lineHeight: '1.6' }}>
                    <li style={{ marginBottom: '8px' }}>Nexora Secure Browser (NSB) will lock down your system. Please save your work before starting the test.</li>
                    <li>Once NSB is launched, you will not be able to move out of the test window and open other applications / programs.</li>
                  </ul>
                  
                  <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '15px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '13px', color: '#475569' }}>
                      Not able to launch test? Please <a href="#" onClick={(e) => { e.preventDefault(); finalizeAndStartTest(); }} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>click here to refresh</a> and try again.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <button className="diag-btn-primary" onClick={finalizeAndStartTest} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Launch Test <Laptop size={16} />
                  </button>
                  <button onClick={handleWebFallback} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                    Take test in standard web browser (Fallback)
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
    );
  }

  return (
    <div className="diag-container">
      {/* Header */}
      <header className="diag-header">
        <div className="diag-logo">
          <strong>Nexora</strong>
        </div>
      </header>

      <div className="diag-main">
        {/* Left Column */}
        <div className="diag-left">
          {currentPhase === 0 || currentPhase === 1 || currentPhase === 3 ? (
            <div className="diag-test-info">
              <p className="diag-hi">Hi Candidate,</p>
              <h2 className="diag-welcome">Welcome to</h2>
              <h1 className="diag-title">{testDetails.name}</h1>

              <div className="diag-stats" style={{marginTop: '40px'}}>
                <div className="diag-stat-item">
                  <span className="diag-stat-label">Question count:</span>
                  <span className="diag-stat-value">{testDetails.questions.length} Questions</span>
                </div>
                <div className="diag-stat-item">
                  <span className="diag-stat-label">Section count:</span>
                  <div className="diag-stat-value" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>{sectionsList.length} Section{sectionsList.length !== 1 ? 's' : ''}</span>
                    {testDetails.timeMode === 'section' && (
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {sectionsList.map((sec, idx) => (
                          <div key={idx}>• {sec.name}: {testDetails.sectionDurations?.[sec.name] || 15} mins ({sec.count} qs)</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="diag-stat-item">
                  <span className="diag-stat-label">Test Duration:</span>
                  <span className="diag-stat-value">
                    {testDetails.duration / 60} Minutes
                    {testDetails.timeMode === 'section' ? ' (Strictly Section-timed)' : ''}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="diag-instructions-box">
              <div className="diag-inst-header">
                <Info size={16} className="mr-2" /> Instructions
              </div>
              <ul className="diag-inst-list">
                <li>Photo needs to be taken correctly.</li>
                <li>Light needs to be proper.</li>
              </ul>
              
              <div className="diag-scenarios">
                {/* Electron secure capture example */}
                {window && window.navigator && window.navigator.userAgent.toLowerCase().includes('electron') && (
                  <div style={{ marginBottom: '16px', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
                    <strong>Secure Browser Screen Capture</strong>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: screenStatus === 'granted' ? '#16a34a' : screenStatus === 'denied' ? '#ef4444' : '#64748b' }}>{screenStatus}</span>
                      <button className="diag-btn-secondary" onClick={requestScreenCaptureElectron} style={{ padding: '6px 12px' }}>
                        Request Screen Capture
                      </button>
                      {screenErrorMessage && <div style={{ color: '#ef4444', fontSize: '12px' }}>{screenErrorMessage}</div>}
                    </div>
                  </div>
                )}
                <div className="diag-scenario-group">
                  <h4 className="text-success">GOOD SCENARIOS</h4>
                  <div className="diag-scenario-item">
                    <div className="diag-silhouette good">
                      <Check size={16} className="scenario-icon text-success" />
                      <User size={30} />
                    </div>
                    <span>Face Straight</span>
                  </div>
                </div>
                
                <div className="diag-scenario-group">
                  <h4 className="text-danger">BAD SCENARIOS</h4>
                  <div className="diag-scenario-row">
                    <div className="diag-scenario-item">
                      <div className="diag-silhouette bad blurred">
                        <XIcon size={16} className="scenario-icon text-danger" />
                        <User size={30} />
                      </div>
                      <span>Blurred Image</span>
                    </div>
                    <div className="diag-scenario-item">
                      <div className="diag-silhouette bad cut">
                        <XIcon size={16} className="scenario-icon text-danger" />
                        <User size={30} />
                      </div>
                      <span>Face Cut</span>
                    </div>
                    <div className="diag-scenario-item">
                      <div className="diag-silhouette bad dark">
                        <XIcon size={16} className="scenario-icon text-danger" />
                        <User size={30} />
                      </div>
                      <span>No Proper Light</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center Vertical Stepper */}
        <div className="diag-stepper">
          <div className="diag-stepper-inner">
            <div className="diag-line"></div>
            <div className="diag-line-progress" style={{ 
              height: currentPhase === 0 ? '0px' : 
                      currentPhase === 1 ? '116px' : 
                      currentPhase === 2 ? '232px' : 
                      '348px'
            }}></div>
            <div className={`diag-step-icon ${currentPhase >= 0 ? 'active' : ''}`}><Laptop size={24} /></div>
            <div className={`diag-step-icon ${currentPhase >= 1 ? 'active' : ''}`}><Info size={24} /></div>
            <div className={`diag-step-icon ${currentPhase >= 2 ? 'active' : ''}`}><User size={24} /></div>
            <div className={`diag-step-icon ${currentPhase > 2 ? 'active' : ''}`}><Book size={24} /></div>
          </div>
        </div>

        {/* Right Column */}
        <div className="diag-right">
          {currentPhase === 0 ? (
            <>
              <h2 className="diag-right-title" style={{ fontSize: '22px', color: '#142b51', marginBottom: '20px' }}>
                {permissionsStatus !== 'granted' ? 'Requesting Webcam & Audio permission' : 
                 screenStatus !== 'granted' ? 'Requesting Screen Share permission' : 
                 'All Set. Please Proceed'}
              </h2>
              
              <div className="diag-checklist" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                {/* Step 1 */}
                <div className="diag-check-item success" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                  <CheckCircle2 size={24} fill="#1f9d55" color="white" className="diag-check-icon" style={{ marginTop: '2px', alignSelf: 'flex-start' }} />
                  <div className="diag-check-text">
                    <strong style={{ color: '#142b51', fontSize: '15px' }}>1. System Compatibility</strong>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '10px', color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                      <Info size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>Please make sure Grammar or Spell check plugins are not installed in your system, for example Grammarly, LanguageTool, etc. Please disable/uninstall such plugin(s) as your response might not get saved.</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className={`diag-check-item ${permissionsStatus === 'requesting' ? 'active' : ''}`} style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                  {permissionsStatus === 'granted' ? (
                    <CheckCircle2 size={24} fill="#1f9d55" color="white" className="diag-check-icon" style={{ alignSelf: 'flex-start', marginTop: '2px' }} />
                  ) : permissionsStatus === 'denied' ? (
                    <Circle size={24} color="#dc3545" className="diag-check-icon" style={{ alignSelf: 'flex-start', marginTop: '2px' }} />
                  ) : (
                    <div className="diag-spinner-icon" style={{ alignSelf: 'flex-start', marginTop: '2px' }}></div>
                  )}
                  <div className="diag-check-text">
                    <strong style={{ color: '#142b51', fontSize: '15px' }}>2. Webcam & Audio Permissions</strong>
                    <span className="diag-check-sub">
                      {permissionsStatus === 'requesting' && "Requesting Webcam & Audio Permissions..."}
                      {permissionsStatus === 'granted' && ""}
                      {permissionsStatus === 'denied' && (
                        <div style={{ marginTop: '10px' }}>
                          <span style={{ color: '#dc3545', display: 'block', marginBottom: '8px' }}>
                            {errorMessage || "Permissions Denied. Please allow to continue."}
                          </span>
                          <button 
                            onClick={requestPermissions} 
                            style={{
                              padding: '6px 12px', 
                              fontSize: '12px', 
                              cursor: 'pointer', 
                              border: '1px solid #0056b3', 
                              borderRadius: '4px', 
                              background: 'white',
                              color: '#0056b3',
                              fontWeight: '500'
                            }}
                          >
                            Retry Connection
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className={`diag-check-item ${screenStatus === 'requesting' || screenStatus === 'pending' ? 'active' : ''} ${screenStatus === 'pending' && permissionsStatus !== 'granted' ? 'disabled' : ''}`} style={{ padding: '20px' }}>
                  {screenStatus === 'granted' ? (
                    <CheckCircle2 size={24} fill="#1f9d55" color="white" className="diag-check-icon" style={{ alignSelf: 'flex-start', marginTop: '2px' }} />
                  ) : screenStatus === 'denied' ? (
                    <Circle size={24} color="#dc3545" className="diag-check-icon" style={{ alignSelf: 'flex-start', marginTop: '2px' }} />
                  ) : screenStatus === 'requesting' || (screenStatus === 'pending' && permissionsStatus === 'granted') ? (
                    <div className="diag-spinner-icon" style={{ width: '24px', height: '24px', alignSelf: 'flex-start', marginTop: '2px', borderColor: '#2980b9', borderTopColor: 'transparent' }}></div>
                  ) : (
                    <span className="diag-number-placeholder" style={{ alignSelf: 'flex-start', marginTop: '2px', width: '24px' }}>3.</span>
                  )}
                  
                  <div className="diag-check-text">
                    <strong style={{ color: '#142b51', fontSize: '15px' }}>3. Screen Permissions</strong>
                    <span className="diag-check-sub">
                      {screenStatus === 'pending' && permissionsStatus === 'granted' && (
                        <div style={{ marginTop: '10px' }}>
                          <span style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', display: 'block', marginBottom: '15px' }}>
                            Requesting Screen Share Permissions. Please click on <strong>Start Screen Capture</strong> below.
                          </span>
                          <button 
                            onClick={window?.navigator?.userAgent?.toLowerCase()?.includes('electron') ? requestScreenCaptureElectron : requestScreenShare}
                            style={{
                              padding: '10px 20px', 
                              fontSize: '14px', 
                              cursor: 'pointer', 
                              border: 'none', 
                              borderRadius: '4px', 
                              background: '#2980b9',
                              color: 'white',
                              fontWeight: '500'
                            }}
                          >
                            Start Screen Capture
                          </button>
                        </div>
                      )}
                      {screenStatus === 'requesting' && "Requesting Screen Share Permission..."}
                      {screenStatus === 'granted' && (
                        <div style={{ marginTop: '10px' }}>
                          <span style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
                            Screen Share Permissions available.<br/>
                            Click on the <strong>'Hide'</strong> Button shown below for better visibility.
                          </span>
                          
                          <div style={{ border: '2px solid #bcd2e5', padding: '10px 15px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', width: 'fit-content', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', gap: '2px', marginRight: '5px' }}>
                              <div style={{ width: '3px', height: '14px', background: '#6c757d' }}></div>
                              <div style={{ width: '3px', height: '14px', background: '#6c757d' }}></div>
                            </div>
                            <span style={{ fontSize: '13px', color: '#142b51', fontWeight: '500' }}>nexora.com is sharing your screen.</span>
                            <button style={{ backgroundColor: '#1441a3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: '500', marginLeft: '10px', cursor: 'default' }}>Stop sharing</button>
                            <button style={{ backgroundColor: 'transparent', color: '#1441a3', border: 'none', padding: '6px 12px', fontSize: '13px', fontWeight: '500', cursor: 'default' }}>Hide</button>
                          </div>
                        </div>
                      )}
                      {screenStatus === 'denied' && (
                        <div style={{ marginTop: '10px' }}>
                          <span style={{ color: '#dc3545', display: 'block', marginBottom: '8px' }}>
                            {screenErrorMessage || "Screen Share Denied. Please allow to continue."}
                          </span>
                          <button 
                            onClick={window?.navigator?.userAgent?.toLowerCase()?.includes('electron') ? requestScreenCaptureElectron : requestScreenShare}
                            style={{
                              padding: '6px 12px', 
                              fontSize: '12px', 
                              cursor: 'pointer', 
                              border: '1px solid #0056b3', 
                              borderRadius: '4px', 
                              background: 'white',
                              color: '#0056b3',
                              fontWeight: '500'
                            }}
                          >
                            Retry Screen Share
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : currentPhase === 1 ? (
            <div className="diag-things-to-remember">
              <h2 className="diag-right-title" style={{color: '#003b6e', fontSize: '18px', fontWeight: 'bold'}}>Things to remember before starting the Test:</h2>
              
              <ol className="diag-remember-list">
                <li>Before starting the test, please close all the chat windows, screen-saver etc and make sure that you would have a stable internet connection.</li>
                <li>Do not press the "F5" key while giving the test as this make the test end suddenly and you will not be able to continue the test.</li>
                <li>If your computer system shuts down suddenly due to power supply being disconnected, you can resume the test from the same question that you were attempting earlier. All your previous answers are already saved.</li>
                <li>When resuming the test, follow the same steps which you took to start the test in the beginning using the same registration details.</li>
              </ol>
            </div>
          ) : currentPhase === 2 ? (
            <>
              <div className="diag-registration-header">
                <Info size={14} className="mr-2" /> Fields marked with * are mandatory
              </div>
              
              <div className="diag-tabs">
                <div className={`diag-tab ${activeTab === 1 ? 'active' : ''}`}>1. Candidate Details</div>
                <div className={`diag-tab ${activeTab === 2 ? 'active' : ''}`}>2. Terms and Conditions</div>
                {testDetails.requireCamera !== false && (
                  <>
                    <div className={`diag-tab ${activeTab === 3 ? 'active' : ''}`}>3. Capture Face</div>
                    <div className={`diag-tab ${activeTab === 4 ? 'active' : ''}`}>4. Capture ID card</div>
                  </>
                )}
              </div>

              <div className="diag-tab-content">
                {activeTab === 1 && (() => {
                  const isEmailEnabled = testDetails?.registrationFields?.find(f => f.id === 'email')?.isEnabled ?? true;
                  const isFirstNameEnabled = testDetails?.registrationFields?.find(f => f.id === 'firstName')?.isEnabled ?? true;
                  const isLastNameEnabled = testDetails?.registrationFields?.find(f => f.id === 'lastName')?.isEnabled ?? false;
                  
                  const isTab1Valid = 
                    (!isFirstNameEnabled || candidateName.trim()) &&
                    (!isLastNameEnabled || candidateLastName.trim()) &&
                    (!isEmailEnabled || candidateEmail.trim().includes('@'));

                  return (
                  <div className="diag-terms" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
                    <p style={{ fontWeight: '500', color: '#1e293b' }}>Please enter your details to register for the assessment:</p>
                    {isFirstNameEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>First Name *</label>
                      <input 
                        type="text" 
                        value={candidateName} 
                        onChange={(e) => setCandidateName(e.target.value)} 
                        placeholder="e.g. John"
                        style={{ border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '6px', width: '100%', outline: 'none', color: '#1e293b', backgroundColor: '#ffffff', fontSize: '14px' }}
                      />
                    </div>
                    )}
                    {isLastNameEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Last Name *</label>
                      <input 
                        type="text" 
                        value={candidateLastName} 
                        onChange={(e) => setCandidateLastName(e.target.value)} 
                        placeholder="e.g. Doe"
                        style={{ border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '6px', width: '100%', outline: 'none', color: '#1e293b', backgroundColor: '#ffffff', fontSize: '14px' }}
                      />
                    </div>
                    )}
                    {isEmailEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Email Address *</label>
                      <input 
                        type="email" 
                        value={candidateEmail} 
                        onChange={(e) => setCandidateEmail(e.target.value)} 
                        placeholder="e.g. john@example.com"
                        style={{ border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '6px', width: '100%', outline: 'none', color: '#1e293b', backgroundColor: '#ffffff', fontSize: '14px' }}
                      />
                    </div>
                    )}
                    <button 
                      className={`diag-btn-primary ${isTab1Valid ? 'enabled' : 'disabled'}`}
                      onClick={() => isTab1Valid && setActiveTab(2)}
                      disabled={!isTab1Valid}
                      style={{ marginTop: '10px' }}
                    >
                      Next
                    </button>
                  </div>
                  );
                })()}

                {activeTab === 2 && (
                  <div className="diag-terms">
                    <p>By proceeding, you agree to the terms and conditions of this assessment. Your camera, microphone, and screen will be monitored for proctoring purposes.</p>
                    <label className="diag-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={termsAgreed} 
                        onChange={(e) => setTermsAgreed(e.target.checked)} 
                      />
                      I have read and agree to the Terms and Conditions *
                    </label>
                    <button 
                      className={`diag-btn-primary ${termsAgreed ? 'enabled' : 'disabled'}`}
                      onClick={() => termsAgreed && (testDetails.requireCamera !== false ? setActiveTab(3) : handleProceed())}
                      disabled={!termsAgreed}
                    >
                      {testDetails.requireCamera !== false ? 'Next' : 'Proceed to Test'}
                    </button>
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="diag-capture-area">
                    <p className="diag-capture-instruction">Please align yourself to the center of the screen and press 'Capture Your Face' button.</p>
                    
                    {captureError && (
                      <div className="diag-capture-error">
                        <AlertTriangle size={16} /> {captureError}
                      </div>
                    )}

                    <div className="diag-video-container">
                      {faceImageSrc ? (
                        <img src={faceImageSrc} alt="Captured Face" className="diag-video" />
                      ) : (
                        <>
                          <video ref={videoRef} autoPlay muted playsInline className="diag-video" />
                          <div className="diag-overlay face-outline"></div>
                        </>
                      )}
                    </div>
                    <div>
                      <button className="diag-btn-primary enabled" onClick={handleCaptureFace}>
                        {faceImageSrc ? 'Retake Photo' : 'Capture Your Face'}
                      </button>
                      {faceImageSrc && (
                        <button className="diag-btn-secondary ml-4" onClick={() => setActiveTab(4)} style={{marginLeft: '15px'}}>Next</button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 4 && (
                  <div className="diag-capture-area">
                    <p className="diag-capture-instruction">Please hold your ID card up to the camera within the frame.</p>
                    <div className="diag-video-container">
                      {idImageSrc ? (
                        <img src={idImageSrc} alt="Captured ID" className="diag-video" />
                      ) : (
                        <>
                          <video ref={videoRef} autoPlay muted playsInline className="diag-video" />
                          <div className="diag-overlay id-outline"></div>
                        </>
                      )}
                    </div>
                    <div>
                      <button className="diag-btn-primary enabled" onClick={handleCaptureId}>
                        {idImageSrc ? 'Retake ID' : 'Capture ID card'}
                      </button>
                      {idImageSrc && (
                        <button className="diag-btn-secondary ml-4" onClick={handleProceed} style={{marginLeft: '15px'}}>Proceed to Test</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : currentPhase === 3 ? (
            <div className="diag-ready-start">
              <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#1e293b', marginBottom: '8px' }}>All done. Ready to start?</h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Select the section you would like to attempt first and then click on Start Test button.</p>
              
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '600' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>SECTION NAME</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>NO. OF QUESTIONS</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>DURATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionsList.map((sec, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="radio" checked={idx === 0} readOnly style={{ accentColor: '#1e40af', width: '16px', height: '16px', cursor: 'pointer' }} />
                            {sec.name}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>{sec.count} Questions</td>
                        {testDetails.timeMode === 'section' ? (
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '500' }}>
                            {testDetails.sectionDurations?.[sec.name] || 15} Minutes
                          </td>
                        ) : (
                          idx === 0 && (
                            <td 
                              rowSpan={sectionsList.length} 
                              style={{ 
                                padding: '12px 16px', 
                                borderBottom: '1px solid #e2e8f0', 
                                color: '#475569', 
                                verticalAlign: 'middle', 
                                borderLeft: '1px dashed #cbd5e1', 
                                textAlign: 'center',
                                backgroundColor: '#f8fafc'
                              }}
                            >
                              <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{testDetails.duration / 60} Mins</div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Time</div>
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="diag-btn-primary" onClick={handleProceed}>Start Test</button>
            </div>
          ) : null}

          {currentPhase === 0 && (
            <div style={{ marginTop: '20px' }}>
              <button 
                className={`diag-proceed-btn ${
                  permissionsStatus === 'granted' && screenStatus === 'granted' ? 'enabled' : 'disabled'
                }`}
                onClick={handleProceed}
                disabled={permissionsStatus !== 'granted' || screenStatus !== 'granted'}
              >
                Proceed
              </button>
            </div>
          )}

          {currentPhase === 1 && (
            <button className="diag-btn-primary" onClick={handleProceed} style={{marginTop: '30px'}}>
              Agree & Proceed
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="diag-footer">
        <div className="diag-footer-left">
          Nexora Online Assessment © 2021-2031 <span style={{color: '#28a745'}}>●</span>
        </div>
        <div className="diag-footer-center">
          Facing technical difficulties taking this test? : <a href="#">Chat Now</a> Or <a href="#">Call Now</a>
        </div>
        <div className="diag-footer-right">
          Powered By <strong>Nexora</strong>
        </div>
      </footer>

      {/* Floating Chat */}
      {showChat ? (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '300px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 5px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden' }}>
          <div style={{ padding: '15px', backgroundColor: '#1e56a0', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} /> <strong style={{ fontSize: '14px' }}>Live Support</strong>
            </div>
            <XIcon size={18} style={{ cursor: 'pointer' }} onClick={() => setShowChat(false)} />
          </div>
          
          <div style={{ padding: '15px', height: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'user' ? '#1e56a0' : '#e2e8f0', color: msg.sender === 'user' ? 'white' : '#1e293b', padding: '8px 12px', borderRadius: '12px', fontSize: '13px', maxWidth: '80%' }}>
                {msg.text}
              </div>
            ))}
          </div>
          
          <div style={{ padding: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', backgroundColor: 'white' }}>
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (!chatInput.trim()) return;
                  const newMsg = { text: chatInput, sender: 'user' };
                  setChatMessages(prev => [...prev, newMsg]);
                  setChatInput('');
                  setTimeout(() => {
                    setChatMessages(prev => [...prev, { text: 'Our support agents are currently busy. Please wait, or email support@nexora.com', sender: 'agent' }]);
                  }, 1000);
                }
              }}
              placeholder="Type a message..." 
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '20px', outline: 'none', fontSize: '13px' }}
            />
            <button 
              onClick={() => {
                if (!chatInput.trim()) return;
                const newMsg = { text: chatInput, sender: 'user' };
                setChatMessages(prev => [...prev, newMsg]);
                setChatInput('');
                setTimeout(() => {
                  setChatMessages(prev => [...prev, { text: 'Our support agents are currently busy. Please wait, or email support@nexora.com', sender: 'agent' }]);
                }, 1000);
              }}
              style={{ background: '#1e56a0', color: 'white', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button className="diag-chat-fab" onClick={() => setShowChat(true)}>
          Chat Now <MessageSquare size={16} className="ml-2" />
        </button>
      )}
    </div>
  );
};

export default Diagnostics;
