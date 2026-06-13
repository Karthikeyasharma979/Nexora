import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as faceapi from '@vladmandic/face-api';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { playViolationWarning } from '../utils/audioUtils';
import { ShieldCheck, Maximize2, Minimize2, AlertTriangle } from 'lucide-react';
import './ProctoringEngine.css';

const ProctoringEngine = ({ children, requireCamera = true }) => {
  const isElectron = /electron/i.test(navigator.userAgent);
  const [violations, setViolations] = useState([]);
  const violationsRef = useRef([]);
  const [isFullscreen, setIsFullscreen] = useState(isElectron || !!document.fullscreenElement);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraMinimized, setIsCameraMinimized] = useState(false);
  const [activeWarning, setActiveWarning] = useState(null); // Custom alert overlay
  const [proctoringStatus, setProctoringStatus] = useState('Monitoring Active');
  const [violationLevel, setViolationLevel] = useState(null); // 'warning', 'severe', null
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [showPreCrimeWarning, setShowPreCrimeWarning] = useState(false);
  const lastMousePos = useRef({ y: 0, time: Date.now() });
  const videoRef = useRef(null);

  // Forensic Watermark Info
  const candidateName = sessionStorage.getItem('candidateName') || 'Candidate';
  const sessionId = useMemo(() => Math.random().toString(36).substring(2, 10).toUpperCase(), []);
  const dateStr = new Date().toISOString().split('T')[0];
  const watermarkText = `${candidateName} • ${sessionId} • ${dateStr} • NEXORA SECURE`;
  
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="13" fill="#000000" opacity="1" transform="rotate(-30 150 100)">${watermarkText}</text></svg>`;
  const svgWatermark = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;

  // --- PRE-CRIME MOUSE TRACKING ---
  useEffect(() => {
    let warningTimeout;
    const handleMouseMove = (e) => {
      const now = Date.now();
      const dt = now - lastMousePos.current.time;
      
      if (dt > 25) { 
        const dy = e.clientY - lastMousePos.current.y;
        const velocityY = dy / dt; // Negative is UP
        
        // Rapid upward movement towards the top URL bar/tabs area
        if (velocityY < -1.2 && e.clientY < 80) {
          setShowPreCrimeWarning(true);
          
          clearTimeout(warningTimeout);
          warningTimeout = setTimeout(() => {
            setShowPreCrimeWarning(false);
          }, 3000); 
        }
        
        lastMousePos.current = { y: e.clientY, time: now };
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(warningTimeout);
    };
  }, []);
  // --------------------------------

  // --- MOBILE ---

  const MAX_VIOLATIONS = 10; // Increased strikes as requested


  const addViolation = (type, message, alertText = null) => {
    const newViolation = { type, message, timestamp: new Date() };
    const latestViolations = [...violationsRef.current, newViolation];
    violationsRef.current = latestViolations;
    setViolations(latestViolations);

    // Synchronously save to session storage so the final strike isn't lost if we navigate immediately
    sessionStorage.setItem('violations', JSON.stringify(latestViolations));

    if (type === 'ELECTRONIC_DEVICE') {
      window.dispatchEvent(new CustomEvent('test-terminated', { detail: { reason: 'Severe violation: Mobile phone or electronic device detected.', violations: latestViolations } }));
    } else if (latestViolations.length >= MAX_VIOLATIONS) {
      window.dispatchEvent(new CustomEvent('test-terminated', { detail: { reason: `Excessive violations threshold reached (${MAX_VIOLATIONS} strikes).`, violations: latestViolations } }));
    }
    console.warn(`PROCTORING VIOLATION: ${message}`);
    if (
      type === 'TAB_SWITCH' || 
      type === 'FULLSCREEN_EXIT' || 
      type === 'TOO_MUCH_NOISE' || 
      type === 'MULTIPLE_FACES' ||
      type === 'NO_FACE_DETECTED' ||
      type === 'ELECTRONIC_DEVICE' ||
      type === 'WINDOW_BLUR' ||
      type === 'GAZE_AWAY' ||
      type === 'LIVENESS_FAILED'
    ) {
      playViolationWarning();
    }
    
    if (alertText) {
      const strikeCount = latestViolations.length;
      setActiveWarning(alertText);
      setProctoringStatus(`Strike ${strikeCount}/${MAX_VIOLATIONS} - ${type}`);
      setViolationLevel(type === 'MULTIPLE_FACES' || type === 'NO_FACE_DETECTED' || type === 'ELECTRONIC_DEVICE' || type === 'TAB_SWITCH' || type === 'WINDOW_BLUR' || type === 'LIVENESS_FAILED' ? 'severe' : 'warning');
      
      // Only auto-dismiss minor violations. Tab switching and blurring should be manually acknowledged.
      if (type !== 'TAB_SWITCH' && type !== 'WINDOW_BLUR') {
        setTimeout(() => {
          setActiveWarning(null);
          setProctoringStatus('Monitoring Active');
          setViolationLevel(null);
        }, 5000);
      }
    }
  };

  useEffect(() => {
    sessionStorage.setItem('violations', JSON.stringify(violations));
  }, [violations]);

  const dismissWarning = () => {
    setActiveWarning(null);
    setProctoringStatus('Monitoring Active');
    setViolationLevel(null);
    
    // Automatically enforce fullscreen if they dropped out of it, saving them a second click
    if (!isElectron && !document.fullscreenElement) {
      enforceFullscreen();
    }
  };

  useEffect(() => {
    // 1. Tab Switching Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation('TAB_SWITCH', 'Candidate navigated away from the test tab.', 'WARNING: Navigating away from the test is prohibited. This violation has been recorded.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange, { capture: true });

    const handleBlur = (e) => {
      // Ensure the blur event is actually for the window itself, 
      // not just an internal element losing focus (due to capture: true)
      if (e.target !== window) {
        return;
      }
      
      // Check if the document actually lost focus to avoid false positives 
      // from clicking internal UI elements like SVGs or absolute buttons
      if (document.hasFocus && document.hasFocus()) {
        return;
      }
      addViolation('WINDOW_BLUR', 'Candidate switched to another application or window.', 'WARNING: You must remain focused on the exam window. This violation has been recorded.');
    };
    window.addEventListener('blur', handleBlur, { capture: true });

    // 2. Disable Right-Click
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      addViolation('RIGHT_CLICK', 'Right-click is disabled during the test.');
    };
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });

    // 3. Disable Copy/Paste and Key Combinations
    const handleCopyPaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      addViolation('COPY_PASTE', 'Copy/Paste operations are disabled.');
    };
    document.addEventListener('copy', handleCopyPaste, { capture: true });
    document.addEventListener('paste', handleCopyPaste, { capture: true });

    const handleKeyDown = (e) => {
      // Block F5 (Refresh), F12 (DevTools), Ctrl+C/V/X, Alt+Tab (can't block fully, but can catch modifiers)
      if (
        e.key === 'F5' || 
        e.key === 'F12' || 
        (e.ctrlKey && ['c', 'v', 'x', 'p', 's', 'r'].includes(e.key.toLowerCase())) ||
        (e.metaKey && ['c', 'v', 'x', 'p', 's', 'r'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        addViolation('KEYBOARD_SHORTCUT', `Keyboard shortcut ${e.key} is disabled.`);
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    // 4. Anti-Navigation Warning
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your test will be automatically submitted.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange, { capture: true });
      window.removeEventListener('blur', handleBlur, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('copy', handleCopyPaste, { capture: true });
      document.removeEventListener('paste', handleCopyPaste, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
    };
  }, []);

  // 5. Fullscreen Enforcement
  const enforceFullscreen = () => {
    if (isElectron) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  useEffect(() => {
    if (isElectron) return;
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        // Removed FULLSCREEN_EXIT violation as it was triggering falsely on some browser configurations
        
        // Unlock keyboard when exiting fullscreen
        if (navigator.keyboard && navigator.keyboard.unlock) {
          navigator.keyboard.unlock();
        }
      } else {
        setIsFullscreen(true);
        // Lock keyboard shortcuts (Alt+Tab, Windows Key, etc.) when in fullscreen
        if (navigator.keyboard && navigator.keyboard.lock) {
          navigator.keyboard.lock().catch(err => console.warn("Keyboard Lock API not supported or failed:", err));
        }
      }
    };

    // If already in fullscreen on mount, lock immediately
    if (document.fullscreenElement && navigator.keyboard && navigator.keyboard.lock) {
      navigator.keyboard.lock().catch(err => console.warn("Keyboard Lock API not supported or failed:", err));
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (navigator.keyboard && navigator.keyboard.unlock) {
        navigator.keyboard.unlock();
      }
    };
  }, []);

  // 6. Webcam & Face/Audio Tracking Initialization
  useEffect(() => {
    if (!requireCamera) return;

    let audioContext;
    let analyser;
    let microphone;
    let noiseInterval;
    let faceInterval;

    const startTracking = (stream) => {
      // Audio Processing
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      microphone.connect(analyser);

      // Check audio volume every second
      noiseInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / bufferLength;
        
        // Threshold for 'too much noise' (tune as needed)
        if (averageVolume > 60) {
          if (!window._lastNoiseWarnTime || Date.now() - window._lastNoiseWarnTime > 10000) {
            addViolation('TOO_MUCH_NOISE', 'Loud noise detected in the background.', 'WARNING: High ambient noise detected. Please ensure a quiet environment.');
            window._lastNoiseWarnTime = Date.now();
          }
        }
      }, 2000); // Check every 2 seconds to avoid spamming

      // Face Detection
      let missingFaceCount = 0;
      let multipleFaceCount = 0;
      let gazeAwayCount = 0;
      let lastBlinkTime = Date.now();
      
      if (videoRef.current) {
        faceInterval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            
            try {
              // 1. Electronic Device Detection (Phones/Laptops)
              if (window.cocoSsdModel) {
                const objectDetections = await window.cocoSsdModel.detect(videoRef.current);
                const hasDevice = objectDetections.some(obj => ['cell phone', 'laptop', 'tv'].includes(obj.class));
                if (hasDevice) {
                  if (!window._lastDeviceWarnTime || Date.now() - window._lastDeviceWarnTime > 10000) {
                    addViolation('ELECTRONIC_DEVICE', 'Electronic device detected in the camera frame.', 'WARNING: Electronic devices (phones/tablets) are strictly prohibited.');
                    window._lastDeviceWarnTime = Date.now();
                  }
                }
              }

              // 2. Face Detection using TinyFaceDetector with Landmarks
              const detections = await faceapi.detectAllFaces(
                videoRef.current, 
                new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.15 })
              ).withFaceLandmarks();
              
              if (detections.length === 0) {
                missingFaceCount++;
                if (missingFaceCount === 4) {
                  // Only trigger violation exactly once at the 4-second mark
                  addViolation('NO_FACE_DETECTED', 'Candidate face is not visible in the camera frame.', 'WARNING: Your face is not visible. Please return to the frame immediately.');
                }
              } else {
                missingFaceCount = 0; // Reset if face is found
                
                if (detections.length > 1) {
                  multipleFaceCount++;
                  if (multipleFaceCount === 2) {
                    addViolation('MULTIPLE_FACES', 'Multiple faces detected in the camera frame.', 'WARNING: Multiple people detected. This is a strict violation.');
                  }
                } else {
                  multipleFaceCount = 0;
                  
                  // LIVENESS & GAZE TRACKING (Single Face)
                  const landmarks = detections[0].landmarks;
                  
                  // 2A. Gaze Tracking (Yaw Approximation)
                  const nose = landmarks.getNose();
                  const jawOutline = landmarks.getJawOutline();
                  const distLeft = nose[3].x - jawOutline[0].x;
                  const distRight = jawOutline[16].x - nose[3].x;
                  const yawRatio = distLeft / distRight;
                  
                  // Normal ratio is ~1. > 2.5 means looking far left, < 0.4 means far right
                  if (yawRatio > 2.5 || yawRatio < 0.4) {
                    gazeAwayCount++;
                    if (gazeAwayCount === 5) { // 5 consecutive seconds looking away
                      addViolation('GAZE_AWAY', 'Candidate is consistently looking away from the screen.', 'WARNING: Keep your eyes focused on the screen.');
                    }
                  } else {
                    gazeAwayCount = 0;
                  }
                  
                  // 2B. Liveness Detection (Blink / Eye Aspect Ratio)
                  const leftEye = landmarks.getLeftEye();
                  const rightEye = landmarks.getRightEye();
                  
                  const getDist = (pt1, pt2) => Math.sqrt(Math.pow(pt1.x - pt2.x, 2) + Math.pow(pt1.y - pt2.y, 2));
                  const calcEAR = (eye) => {
                    const v1 = getDist(eye[1], eye[5]);
                    const v2 = getDist(eye[2], eye[4]);
                    const h = getDist(eye[0], eye[3]);
                    return (v1 + v2) / (2.0 * h);
                  };
                  
                  const avgEAR = (calcEAR(leftEye) + calcEAR(rightEye)) / 2;
                  
                  if (avgEAR < 0.22) {
                    lastBlinkTime = Date.now(); // Blink registered!
                  }
                  
                  // If no blink detected for 60 seconds, flag as possible printed photo
                  if (Date.now() - lastBlinkTime > 60000) {
                    if (!window._lastLivenessWarnTime || Date.now() - window._lastLivenessWarnTime > 60000) {
                      addViolation('LIVENESS_FAILED', 'No natural eye movement/blinking detected. Possible photo spoofing.', 'WARNING: Liveness check failed. Ensure your face is clearly visible.');
                      window._lastLivenessWarnTime = Date.now();
                      lastBlinkTime = Date.now(); // Reset to prevent spam
                    }
                  }
                }
              }
            } catch (e) {
              // Ignore errors if models aren't loaded or video is paused
              console.warn("Face detection error:", e);
            }
          }
        }, 1000); // Check every 1 second
      }
    };

    const startVideo = () => {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsCameraActive(true);
            
            // Start biometric scanning phase
            setIsScanning(true);
            setTimeout(() => {
              setIsScanning(false);
              setScanComplete(true);
              setTimeout(() => {
                setScanComplete(false);
                startTracking(stream); // Start tracking only after verification is done
              }, 2500);
            }, 3000);

            // Listen for hardware disconnects (e.g. unplugging external webcam)
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              videoTrack.onended = () => {
                addViolation('CAMERA_DISCONNECTED', 'Hardware camera feed disconnected.', 'WARNING: Camera disconnected! Please plug your camera back in immediately.');
                setIsCameraActive(false);
              };
            }
          }
        })
        .catch((err) => {
          console.error("Error accessing webcam/mic:", err);
          addViolation('CAMERA_DENIED', 'Camera/Mic access was denied or failed.', 'WARNING: Camera access failed. Please ensure it is plugged in and permissions are granted.');
        });
    };

    // Forcefully restart video on device change, cleaning up old tracks/intervals to prevent leaks
    const handleDeviceChange = () => {
      if (videoRef.current) {
        // Log a warning that hardware changed
        addViolation('DEVICE_CHANGED', 'Hardware devices were plugged or unplugged.', 'WARNING: Device change detected. Attempting to restore camera feed.');
        
        // Clean up old intervals
        if (noiseInterval) clearInterval(noiseInterval);
        if (faceInterval) clearInterval(faceInterval);
        
        // Clean up old stream tracks
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        }
        
        // Restart the camera system
        startVideo();
      }
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    // Load models from CDN and NPM
    const loadModels = async () => {
      try {
        console.log("Loading AI models (Face API & COCO-SSD)...");
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
        
        window.cocoSsdModel = await cocoSsd.load();
        
        console.log("AI models loaded successfully");
      } catch (e) {
        console.warn("Failed to load AI models. Some proctoring features may be degraded.", e);
      }
    };

    startVideo();
    loadModels();

    return () => {
      if (noiseInterval) clearInterval(noiseInterval);
      if (faceInterval) clearInterval(faceInterval);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [requireCamera]);

  return (
    <>
      <div 
        className="forensic-watermark" 
        style={{ backgroundImage: `url("${svgWatermark}")` }}
      />

      
      {/* Pre-Crime Warning Overlay */}
      {showPreCrimeWarning && (
        <div className="pre-crime-overlay">
          <div className="pre-crime-modal">
            <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 15px auto', display: 'block' }} />
            <h3>Focus Warning</h3>
            <p>Please keep your mouse within the test area.</p>
          </div>
        </div>
      )}

      {/* Massive Full-Screen Violation Lock removed as requested */}

      {/* Floating Proctoring Camera Widget */}
      {requireCamera && (
        <div className="proctoring-hud-container" style={{ display: isCameraActive ? 'flex' : 'none' }}>
          
          <div className={`floating-orb ${isCameraMinimized ? 'minimized' : ''} ${violationLevel === 'severe' ? 'violation-severe' : violationLevel === 'warning' ? 'violation-warning' : ''}`}>
            
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
            />
            
            {isScanning && !isCameraMinimized && (
              <div className="biometric-scanner">
                <div className="scan-line"></div>
                <span>Scanning...</span>
              </div>
            )}
            
            {scanComplete && !isCameraMinimized && (
              <div className="environment-verified">
                <ShieldCheck size={48} />
              </div>
            )}

            <div className="hud-controls" onClick={() => setIsCameraMinimized(!isCameraMinimized)}>
              {isCameraMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </div>
          </div>



          {activeWarning && !isCameraMinimized && (
             <div className={`proctoring-toast ${violationLevel === 'severe' ? 'severe' : 'warning'}`}>
               <AlertTriangle size={24} color={violationLevel === 'severe' ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0 }} />
               <div>
                 <strong style={{ display: 'block', marginBottom: '4px' }}>{proctoringStatus}</strong>
                 <div style={{ fontSize: '13px', opacity: 0.9 }}>{activeWarning}</div>
                 {(activeWarning.includes('WARNING: Navigating') || activeWarning.includes('WARNING: You must remain')) && (
                   <button 
                     onClick={dismissWarning}
                     style={{
                       marginTop: '10px', padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.15)', 
                       border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '12px',
                       fontWeight: '500', transition: 'all 0.2s', width: '100%'
                     }}
                     onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.25)'}
                     onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                   >
                     Acknowledge & Return
                   </button>
                 )}
               </div>
             </div>
          )}

        </div>
      )}

      {!isFullscreen ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a1d47', color: 'white' }}>
          <h2>Fullscreen Required</h2>
          <p style={{ margin: '20px 0', textAlign: 'center', maxWidth: '600px', lineHeight: '1.6' }}>
            This is a proctored exam. You must remain in fullscreen mode to continue. Any attempt to exit fullscreen will be recorded as a violation.
          </p>
          <button 
            onClick={enforceFullscreen} 
            style={{ padding: '12px 24px', backgroundColor: '#1e56a0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
          >
            Enter Fullscreen & Return to Test
          </button>
        </div>
      ) : (
        children
      )}
    </>
  );
};

export default ProctoringEngine;
