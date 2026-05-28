import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { playViolationWarning } from '../utils/audioUtils';

const ProctoringEngine = ({ children, requireCamera = true }) => {
  const [violations, setViolations] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraMinimized, setIsCameraMinimized] = useState(false);
  const [activeWarning, setActiveWarning] = useState(null); // Custom alert overlay
  const [proctoringStatus, setProctoringStatus] = useState('Monitoring Active');
  const videoRef = useRef(null);

  const MAX_VIOLATIONS = 3;

  const addViolation = (type, message, alertText = null) => {
    setViolations(prev => {
      const newViolations = [...prev, { type, message, timestamp: new Date() }];
      if (type === 'ELECTRONIC_DEVICE') {
        window.dispatchEvent(new CustomEvent('test-terminated', { detail: { reason: 'Severe violation: Mobile phone or electronic device detected.' } }));
      } else if (newViolations.length >= MAX_VIOLATIONS) {
        window.dispatchEvent(new CustomEvent('test-terminated', { detail: { reason: 'Excessive violations threshold reached (3 strikes).' } }));
      }
      return newViolations;
    });
    console.warn(`PROCTORING VIOLATION: ${message}`);
    if (
      type === 'TAB_SWITCH' || 
      type === 'FULLSCREEN_EXIT' || 
      type === 'TOO_MUCH_NOISE' || 
      type === 'MULTIPLE_FACES' ||
      type === 'NO_FACE_DETECTED' ||
      type === 'ELECTRONIC_DEVICE' ||
      type === 'WINDOW_BLUR'
    ) {
      playViolationWarning();
    }
    
    if (alertText) {
      setActiveWarning(alertText);
      setProctoringStatus(`Warning: ${type}`);
      
      // Only auto-dismiss minor violations. Tab switching and blurring should be manually acknowledged.
      if (type !== 'TAB_SWITCH' && type !== 'WINDOW_BLUR') {
        setTimeout(() => {
          setActiveWarning(null);
          setProctoringStatus('Monitoring Active');
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
    
    // Automatically enforce fullscreen if they dropped out of it, saving them a second click
    if (!document.fullscreenElement) {
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
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  useEffect(() => {
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

              // 2. Face Detection using TinyFaceDetector
              const detections = await faceapi.detectAllFaces(
                videoRef.current, 
                new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 })
              );
              
              if (detections.length === 0) {
                missingFaceCount++;
                if (missingFaceCount === 3) {
                  // Only trigger violation exactly once at the 3-second mark
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
            
            // Listen for hardware disconnects (e.g. unplugging external webcam)
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              videoTrack.onended = () => {
                addViolation('CAMERA_DISCONNECTED', 'Hardware camera feed disconnected.', 'WARNING: Camera disconnected! Please plug your camera back in immediately.');
                setIsCameraActive(false);
              };
            }

            startTracking(stream);
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
        
        window.cocoSsdModel = await cocoSsd.load();
        
        console.log("AI models loaded successfully");
        startVideo();
      } catch (e) {
        console.warn("Failed to load AI models. Starting camera anyway.", e);
        startVideo();
      }
    };

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
      {/* Massive Full-Screen Violation Lock removed as requested */}

      {/* Floating Proctoring Camera Widget */}
      {requireCamera && (
        <div 
          style={{ 
            position: 'fixed', 
          bottom: '20px', 
          right: '20px', 
          zIndex: 99999,
          display: isCameraActive ? 'block' : 'none',
          backgroundColor: '#1e293b',
          borderRadius: '6px',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          border: '1px solid #334155'
        }}
      >
        <div 
          style={{ 
            backgroundColor: '#0f172a', 
            color: 'white', 
            padding: '8px 12px', 
            fontSize: '12px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            fontWeight: '500'
          }}
          onClick={() => setIsCameraMinimized(!isCameraMinimized)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
            Live Proctoring
          </span>
          <span style={{ fontSize: '16px', lineHeight: '1' }}>{isCameraMinimized ? '+' : '−'}</span>
        </div>
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          style={{ 
            width: '200px', 
            height: isCameraMinimized ? '0px' : 'auto', 
            display: isCameraMinimized ? 'none' : 'block',
            transform: 'scaleX(-1)', // Mirror effect
            backgroundColor: '#000'
          }}
        />
        {!isCameraMinimized && (
          <div style={{ 
            backgroundColor: activeWarning ? '#7f1d1d' : '#064e3b', 
            color: activeWarning ? '#fca5a5' : '#6ee7b7', 
            padding: '4px 12px', 
            fontSize: '11px', 
            textAlign: 'center',
            borderTop: '1px solid #1e293b'
          }}>
            {proctoringStatus}
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
