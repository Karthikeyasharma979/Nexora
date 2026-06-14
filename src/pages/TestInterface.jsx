import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Cloud, Clock, Maximize, Minimize, Settings, ChevronDown, 
  Grid, Calculator, Flag, Bookmark, X, AlertTriangle, MessageSquare,
  Info, ChevronLeft, ChevronRight, Wifi, StopCircle, XCircle,
  ShieldCheck, ClipboardList, List, Sun, Moon, Lock, Bell, LogOut,
  Camera, Play, Pause
} from 'lucide-react';
import { playTimerWarning } from '../utils/audioUtils';
import { getTestById, saveReport } from '../utils/db';
import './TestInterface.css';

const AnimatedDonutChart = ({ percentage }) => {
  const [animatedPct, setAnimatedPct] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);
  
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPct / 100) * circumference;
  
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="75" cy="75" r={radius} fill="transparent" stroke="var(--mettl-gray-border)" strokeWidth="30" />
      <circle 
        cx="75" cy="75" r={radius} fill="transparent" stroke="var(--mettl-blue)" strokeWidth="30"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="butt"
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
    </svg>
  );
};

const TestInterface = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [testDetails, setTestDetails] = useState(null);
  const [errorReason, setErrorReason] = useState(null);
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revisited, setRevisited] = useState({});
  const [viewed, setViewed] = useState({});
  const [showFinishPanel, setShowFinishPanel] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [filterType, setFilterType] = useState('All'); // All, Attempted, Revisited, Unattempted
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [secondsSinceSave, setSecondsSinceSave] = useState(0);
  const lastSavedTimeRef = useRef(Date.now());

  useEffect(() => {
    lastSavedTimeRef.current = Date.now();
    setSecondsSinceSave(0);
  }, [answers, revisited]);
  
  // New Functional States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoTab, setInfoTab] = useState('Test');
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.warn(e));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    getTestById(testId)
      .then(test => {
        if (test) {
          // --- Cryptographic Shuffling Logic ---
          const shuffleArray = (array) => {
            const newArr = [...array];
            for (let i = newArr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
            }
            return newArr;
          };

          const randomizedTest = { ...test };
          
          // 1. Shuffle options for each question
          randomizedTest.questions = randomizedTest.questions.map(q => {
            const originalOptions = [...q.options];
            const shuffledOptions = shuffleArray(originalOptions);
            
            return {
              ...q,
              options: shuffledOptions
            };
          });

          // 2. Shuffle questions within their respective sections
          const sectionsMap = new Map();
          randomizedTest.questions.forEach(q => {
            const sName = q.sectionName || 'Section 1';
            if (!sectionsMap.has(sName)) sectionsMap.set(sName, []);
            sectionsMap.get(sName).push(q);
          });

          const finalQuestions = [];
          for (let qs of sectionsMap.values()) {
            finalQuestions.push(...shuffleArray(qs));
          }

          randomizedTest.questions = finalQuestions;
          // --- End Shuffling ---

          setTestDetails(randomizedTest);
          setTimeRemaining(test.duration || 3600);
        } else {
          setErrorReason(`Test not found for ID: "${testId}"`);
        }
      })
      .catch(err => {
        console.error("Error fetching test details:", err);
        setErrorReason(`Fetch Error: ${err.message}. ID: "${testId}"`);
      });
  }, [testId, navigate]);


  // Format time (HH:MM:SS)
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    if (testDetails && testDetails.questions[currentQuestionIdx]) {
      const qId = testDetails.questions[currentQuestionIdx].id;
      setViewed(prev => {
        if (prev[qId]) return prev;
        return { ...prev, [qId]: true };
      });
    }

    // Auto-scroll the active pagination button into view
    setTimeout(() => {
      const activeBtn = document.querySelector('.ti-pagination .ti-page-num.active');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50); // slight delay to allow React to apply the 'active' class
  }, [currentQuestionIdx, testDetails]);

  useEffect(() => {
    if (!testDetails) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev > 0 ? prev - 1 : 0;
        if (newTime === 600) { // Exactly 10 minutes left
          playTimerWarning();
        }
        return newTime;
      });
      setSecondsSinceSave(Math.floor((Date.now() - lastSavedTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [testDetails]);

  const handleSubmitExam = useCallback(async (status = 'Completed', terminationReason = null) => {
    if (!testDetails) return;
    
    const candidateName = sessionStorage.getItem('candidateName') || 'Harry';
    const candidateEmail = sessionStorage.getItem('candidateEmail') || '';
    const storedViolations = JSON.parse(sessionStorage.getItem('violations') || '[]');

    const res = await saveReport({
      candidateName,
      candidateEmail,
      testId: testId,
      answers: answers, // Send actual answers to backend for evaluation
      status: status,
      violations: storedViolations
    });

    let score = 'Evaluating...';
    let percentage = '0.00';
    if (res && res.score) {
      score = res.score;
      const [correct, total] = score.split('/').map(Number);
      if (total > 0) percentage = ((correct / total) * 100).toFixed(2);
    }

    navigate('/completed', { 
      replace: true, 
      state: { 
        score: percentage,
        candidateName: candidateName,
        testDetails: testDetails,
        answers: answers,
        correctAnswers: res?.correctAnswers || {},
        status: status,
        terminationReason: terminationReason
      } 
    });
  }, [testDetails, testId, answers, navigate]);

  useEffect(() => {
    const handleTermination = (e) => {
      const reason = e.detail?.reason || 'Excessive proctoring violations.';
      handleSubmitExam('Terminated', reason);
    };
    window.addEventListener('test-terminated', handleTermination);
    return () => window.removeEventListener('test-terminated', handleTermination);
  }, [handleSubmitExam]);

  useEffect(() => {
    if (testDetails && timeRemaining === 0) {
      handleSubmitExam('Completed', 'Time up');
    }
  }, [timeRemaining, testDetails, handleSubmitExam]);

  const handleSelectOption = useCallback((optText) => {
    if (!testDetails) return;
    const currentQ = testDetails.questions[currentQuestionIdx];
    setAnswers(prev => ({ ...prev, [currentQ.id]: optText }));
  }, [testDetails, currentQuestionIdx]);

  const handleClearResponse = useCallback(() => {
    if (!testDetails) return;
    const currentQ = testDetails.questions[currentQuestionIdx];
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[currentQ.id];
      return newAnswers;
    });
  }, [testDetails, currentQuestionIdx]);

  const toggleRevisit = useCallback(() => {
    if (!testDetails) return;
    const currentQ = testDetails.questions[currentQuestionIdx];
    setRevisited(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  }, [testDetails, currentQuestionIdx]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (!testDetails || showSettingsDropdown || showFinishPanel || showInfoModal) return;

      const totalQ = testDetails.questions.length;
      const currentQ = testDetails.questions[currentQuestionIdx];

      switch (e.key) {
        case 'ArrowRight':
          setCurrentQuestionIdx(prev => Math.min(totalQ - 1, prev + 1));
          break;
        case 'ArrowLeft':
          setCurrentQuestionIdx(prev => Math.max(0, prev - 1));
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          const optionIndex = parseInt(e.key) - 1;
          if (currentQ.options && currentQ.options[optionIndex]) {
            handleSelectOption(currentQ.options[optionIndex]);
          }
          break;
        case 'c':
        case 'C':
          handleClearResponse();
          break;
        case 'r':
        case 'R':
          toggleRevisit();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [testDetails, currentQuestionIdx, showSettingsDropdown, showFinishPanel, showInfoModal, handleSelectOption, handleClearResponse, toggleRevisit]);

  if (errorReason) {
    return (
      <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>
        <h2>Failed to Load Test</h2>
        <p style={{fontFamily: 'monospace', color: '#ff6b6b'}}>{errorReason}</p>
        <p>Current URL: {window.location.href}</p>
      </div>
    );
  }

  if (!testDetails) return <div style={{padding: '50px', textAlign: 'center'}}>Loading test environment...</div>;


  const currentQ = testDetails.questions[currentQuestionIdx];
  const attemptedCount = Object.keys(answers).length;
  const revisitCount = Object.keys(revisited).filter(k => revisited[k]).length;
  const totalQ = testDetails.questions.length;

  // Derive Sections
  const sections = [];
  testDetails.questions.forEach((q, idx) => {
    const sName = q.sectionName || 'Section 1';
    if (sections.length === 0 || sections[sections.length - 1].name !== sName) {
      sections.push({ name: sName, startIndex: idx, count: 1 });
    } else {
      sections[sections.length - 1].count++;
    }
  });
  
  const currentSectionIndex = sections.findIndex(s => currentQuestionIdx >= s.startIndex && currentQuestionIdx < s.startIndex + s.count);
  const currentSectionName = sections[currentSectionIndex]?.name || 'Section 1';

  // Filtered question logic for the grid dropdown
  let displayedQuestions = testDetails.questions
    .map((q, i) => ({ q, originalIndex: i }))
    .filter(({ originalIndex }) => 
      originalIndex >= sections[currentSectionIndex].startIndex && 
      originalIndex < sections[currentSectionIndex].startIndex + sections[currentSectionIndex].count
    );

  if (filterType === 'Attempted') {
    displayedQuestions = displayedQuestions.filter(item => answers[item.q.id] !== undefined);
  } else if (filterType === 'Revisited') {
    displayedQuestions = displayedQuestions.filter(item => revisited[item.q.id]);
  } else if (filterType === 'Unattempted') {
    displayedQuestions = displayedQuestions.filter(item => answers[item.q.id] === undefined);
  }

  return (
    <div className={`ti-container ${highContrast ? 'high-contrast' : ''} fade-in`}>
      {/* Global Header */}
      <header className="ti-header">
        <div className="ti-header-left">
          <div className="ti-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
            <img src="/favicon.svg" alt="Nexora Icon" style={{ width: '24px', height: '24px' }} /> Nexora
          </div>
          <div className="ti-user-info">
            <span className="ti-user-name">{sessionStorage.getItem('candidateName') || 'Harry'}</span>
            <div className="ti-test-meta">
              <span>{testDetails.name} /</span>
              <Cloud size={14} className="ml-2 mr-1" /> 
              <span>Saved: {secondsSinceSave < 60 ? `${secondsSinceSave} seconds` : `${Math.floor(secondsSinceSave / 60)} minute${Math.floor(secondsSinceSave / 60) !== 1 ? 's' : ''}`} ago</span>
            </div>
          </div>
        </div>
        
        <div className="ti-header-right">
          <div className="flex-center" style={{ fontSize: '14px', color: '#ffffff', marginRight: '20px' }}>
            <Clock size={18} className="mr-2" style={{ color: '#e2e8f0' }} /> 
            <span style={{ marginRight: '6px', color: '#e2e8f0' }}>Test Time:</span> 
            <strong style={{ fontSize: '15px', letterSpacing: '0.5px' }}>{formatTime(timeRemaining)}</strong>
          </div>
          
          <button className="ti-icon-btn text-white mr-3" onClick={toggleFullscreen} title="Fullscreen">
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          
          <div style={{ position: 'relative' }}>
            <button className="ti-icon-btn text-white mr-4" onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} title="Settings">
              <Settings size={18} />
            </button>

            {showSettingsDropdown && (
              <div className="slide-in-right" style={{
                position: 'absolute', top: 'calc(100% + 5px)', right: '15px', width: '240px', 
                backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                padding: '16px', zIndex: 100, color: '#475569', border: '1px solid #e2e8f0'
              }}>
                {/* Font Size Settings */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Adjust Font Size</div>
                  <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <button type="button" onClick={() => setFontSize(14)} style={{ flex: 1, padding: '8px 0', border: 'none', background: fontSize === 14 ? '#1e56a0' : 'white', color: fontSize === 14 ? 'white' : '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>Aa</button>
                    <button type="button" onClick={() => setFontSize(16)} style={{ flex: 1, padding: '8px 0', border: 'none', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', background: fontSize === 16 ? '#1e56a0' : 'white', color: fontSize === 16 ? 'white' : '#94a3b8', fontSize: '14px', cursor: 'pointer' }}>Aa</button>
                    <button type="button" onClick={() => setFontSize(18)} style={{ flex: 1, padding: '8px 0', border: 'none', background: fontSize === 18 ? '#1e56a0' : 'white', color: fontSize === 18 ? 'white' : '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>Aa</button>
                  </div>
                </div>
                
                {/* Theme Settings */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>Change Theme</div>
                  <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <button type="button" onClick={() => setHighContrast(false)} style={{ flex: 1, padding: '8px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', border: 'none', background: !highContrast ? '#1e56a0' : 'white', color: !highContrast ? 'white' : '#94a3b8', cursor: 'pointer' }}>
                      <Sun size={16} />
                    </button>
                    <button type="button" onClick={() => setHighContrast(true)} style={{ flex: 1, padding: '8px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', border: 'none', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', background: highContrast ? '#1e56a0' : 'white', color: highContrast ? 'white' : '#94a3b8', cursor: 'pointer' }}>
                      <Moon size={16} />
                    </button>
                    <button type="button" style={{ flex: 1, padding: '8px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', border: 'none', background: 'white', color: '#94a3b8', cursor: 'pointer', opacity: 0.5 }} disabled>
                      <Settings size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              onClick={() => setShowFinishPanel(true)} 
              className="ti-finish-btn"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '8px 20px', 
                backgroundColor: '#dc3545', 
                border: 'none', 
                borderRadius: '4px', 
                color: 'white',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Finish Test
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="ti-nav">
        <div className="ti-nav-left" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', position: 'relative' }}>
          <div className="ti-section-dropdown" tabIndex={0} onClick={() => setShowSectionDropdown(!showSectionDropdown)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', border: '1px solid #e2e8f0', background: 'white', color: '#334155', padding: '0 12px', height: '34px', fontSize: '14px', fontWeight: 500, borderRadius: '4px', outline: 'none' }}>
            <span style={{ marginRight: '16px' }}>{currentSectionIndex + 1}. {currentSectionName}</span>
            <ChevronDown size={14} strokeWidth={2.5} />
          </div>
          <button onClick={() => setShowInfoModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', flexShrink: 0, outline: 'none' }}>
            <Info size={18} fill="#334155" color="white" />
          </button>
          
          {showSectionDropdown && (
            <div className="ti-filter-dropdown slide-in-right" style={{ left: 0, right: 'auto', top: '100%', marginTop: '10px', minWidth: '280px', zIndex: 100, padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sections.map((s, idx) => {
                  // Calculate completion percentage
                  let answered = 0;
                  for (let i = s.startIndex; i < s.startIndex + s.count; i++) {
                    const qId = testDetails.questions[i].id;
                    if (answers[qId] !== undefined) answered++;
                  }
                  const percentage = Math.round((answered / s.count) * 100);
                  const isActive = currentSectionName === s.name;

                  return (
                    <button 
                      key={idx}
                      type="button"
                      style={{
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: isActive ? 'white' : '#cbd5e1',
                        border: 'none',
                        borderBottom: '1px solid white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onClick={() => {
                        setCurrentQuestionIdx(s.startIndex);
                        setShowSectionDropdown(false);
                      }}
                    >
                      {/* Left Icon Block */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isActive ? '#1e56a0' : '#e2e8f0',
                        color: isActive ? 'white' : '#1e293b',
                        fontWeight: 'bold',
                        fontSize: '15px',
                        flexShrink: 0
                      }}>
                        {isActive ? (idx + 1) : <Lock size={16} color="#1e293b" />}
                      </div>

                      {/* Right Content Block */}
                      <div style={{ marginLeft: '16px', flex: 1 }}>
                        <div style={{ 
                          fontSize: '15px', 
                          color: isActive ? '#334155' : 'white', 
                          marginBottom: '6px'
                        }}>
                          {s.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            color: isActive ? '#64748b' : 'white'
                          }}>
                            {percentage}% done
                          </span>
                          <div style={{ 
                            flex: 1, 
                            height: '4px', 
                            backgroundColor: isActive ? '#e2e8f0' : '#f8fafc',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${percentage}%`, 
                              height: '100%', 
                              backgroundColor: isActive ? '#1e293b' : '#cbd5e1',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <div className="ti-nav-center-wrapper" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', overflow: 'visible', padding: '0 20px', minWidth: 0 }}>
          
          <div className="ti-nav-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '100%', minWidth: 0 }}>
            <button type="button" className="ti-page-btn flex-center" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev-1))}>
              <ChevronLeft size={16} />
            </button>

            <div className="ti-pagination" style={{ gap: '2px', display: 'flex', margin: '0 10px' }}>
              {Array.from({ length: sections[currentSectionIndex].count }).map((_, i) => {
                const idx = sections[currentSectionIndex].startIndex + i;
                const q = testDetails.questions[idx];
                let statusClass = 'unattempted';
                if (revisited[q.id]) statusClass = 'revisited';
                else if (answers[q.id] !== undefined) statusClass = 'attempted';
                else if (viewed[q.id] && currentQuestionIdx !== idx) statusClass = 'skipped';
                
                return (
                  <button 
                    type="button"
                    key={q.id} 
                    className={`ti-page-num ${statusClass} ${currentQuestionIdx === idx ? 'active' : ''}`}
                    onClick={() => setCurrentQuestionIdx(idx)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <button type="button" className="ti-page-btn flex-center" disabled={currentQuestionIdx === totalQ - 1} onClick={() => setCurrentQuestionIdx(prev => Math.min(totalQ-1, prev+1))}>
              <ChevronRight size={16} />
            </button>

            {/* Filter / Grid Menu Button */}
            <div style={{ position: 'relative', marginLeft: '8px' }}>
              <button 
                type="button" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              >
                <List size={18} color="#1e293b" />
              </button>

              {/* Filter Dropdown Popup */}
              {showFilterDropdown && (
                <div className="ti-filter-dropdown slide-in-right" style={{ right: 0, left: 'auto', transform: 'none', top: '100%', marginTop: '10px', zIndex: 100, position: 'absolute', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '20px', width: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div className="ti-filter-header" style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>Filter by</div>
                  <X size={18} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => setShowFilterDropdown(false)} />
                </div>
                <div className="ti-filter-tabs" style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
                  {['All', 'Attempted', 'Revisited', 'Unattempted'].map((tab, idx) => (
                    <div 
                      key={tab} 
                      className={`ti-filter-tab ${filterType === tab ? 'active' : ''}`}
                      onClick={() => setFilterType(tab)}
                      style={{ 
                        flex: 1, 
                        textAlign: 'center', 
                        padding: '10px 0', 
                        fontSize: '13px', 
                        cursor: 'pointer',
                        borderRight: idx !== 3 ? '1px solid #cbd5e1' : 'none',
                        backgroundColor: filterType === tab ? '#1e56a0' : 'white',
                        color: filterType === tab ? 'white' : '#1e293b'
                      }}
                    >
                      {tab}
                    </div>
                  ))}
                </div>
                <div className="ti-filter-grid" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {displayedQuestions.map(({ q, originalIndex }) => {
                    let statusClass = 'unattempted';
                    if (revisited[q.id]) statusClass = 'revisited';
                    else if (answers[q.id] !== undefined) statusClass = 'attempted';
                    
                    return (
                      <button 
                        type="button"
                        key={q.id} 
                        className={`ti-page-num ${statusClass} ${currentQuestionIdx === originalIndex ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentQuestionIdx(originalIndex);
                          setShowFilterDropdown(false);
                        }}
                        style={{ 
                          width: '45px', 
                          height: '45px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          borderRadius: '8px', 
                          fontSize: '16px',
                          cursor: 'pointer',
                        }}
                      >
                        {originalIndex - sections[currentSectionIndex].startIndex + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="ti-filter-legend mt-4" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '25px', fontSize: '13px', color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#1e56a0', marginRight: '6px' }}></span> Attempted</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', marginRight: '6px' }}></span> Revisited</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#64748b', marginRight: '6px' }}></span> Unattempted</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
          
        <div className="ti-nav-right-wrapper" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', border: '1px solid #1e3a8a', borderRadius: '4px', overflow: 'hidden' }}>
            <button type="button" className="ti-btn-outline" style={{ border: 'none', borderRight: '1px solid #1e3a8a', color: '#1e3a8a', background: 'white', padding: '6px 16px', borderRadius: 0, fontSize: '13px' }} disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev-1))}>
              Previous
            </button>
            {currentQuestionIdx === totalQ - 1 ? (
              <button type="button" className="ti-btn-next" style={{ color: '#1e3a8a', background: 'white', border: 'none', padding: '6px 20px', borderRadius: 0, fontSize: '13px' }} onClick={() => setShowFinishPanel(true)}>Submit</button>
            ) : (
              <button type="button" className="ti-btn-next" style={{ color: '#1e3a8a', background: 'white', border: 'none', padding: '6px 20px', borderRadius: 0, fontSize: '13px' }} onClick={() => setCurrentQuestionIdx(prev => Math.min(totalQ-1, prev+1))}>Next</button>
            )}
          </div>
        </div>
        
        <div className="ti-attempt-count" style={{ 
          position: 'absolute', 
          top: '100%', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          height: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '0 30px', 
          marginTop: '-1px',
          zIndex: 10,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}>
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 24" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, width: '100%', height: '100%' }}>
            <path d="M0 0 L10 21 Q12 24 16 24 L84 24 Q88 24 90 21 L100 0" fill="white" stroke="#e2e8f0" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="0" x2="100" y2="0" stroke="white" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155', zIndex: 1, paddingBottom: '2px' }}>
            Attempted: {attemptedCount}/{totalQ}
          </span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main key={currentQuestionIdx} className="ti-main fade-in">
        <div className="ti-watermark-overlay"></div>
        {/* Floating Side Arrows */}
        <button 
          type="button"
          className="ti-float-arrow left" 
          disabled={currentQuestionIdx === 0}
          onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev-1))}
        >
          <ChevronLeft size={20} />
        </button>

        <button 
          type="button"
          className="ti-float-arrow right" 
          disabled={currentQuestionIdx === totalQ - 1}
          onClick={() => setCurrentQuestionIdx(prev => Math.min(totalQ-1, prev+1))}
        >
          <ChevronRight size={20} />
        </button>

        <div className="ti-pane-left">
          <div className="ti-question-header">
            <div className="ti-q-number" style={{ fontSize: '18px', color: '#1e3a8a', display: 'flex', alignItems: 'center' }}>
              Question {currentQuestionIdx - sections[currentSectionIndex].startIndex + 1}
              <Flag 
                size={14} 
                className={`ml-2 cursor-pointer ${revisited[currentQ.id] ? 'fill-current' : ''}`} 
                style={{ color: '#3b82f6' }} 
                onClick={toggleRevisit}
              />
            </div>
          </div>
          <div className="ti-question-text" style={{ fontSize: `${fontSize}px`, marginTop: '15px' }}>
            {currentQ.text}
          </div>
        </div>
        
        <div className="ti-pane-right">
          <div className="ti-options-header">
            <span style={{ fontSize: '15px', color: '#1e293b' }}>Select an option</span>
            <button type="button" className="ti-clear-btn" onClick={handleClearResponse}>Clear Response</button>
          </div>
          <div className="ti-options-list">
            {currentQ.options.map((opt, idx) => (
              <label 
                key={idx} 
                className={`ti-option-label ${answers[currentQ.id] === opt ? 'selected' : ''}`}
              >
                <input 
                  type="radio" 
                  name={`q-${currentQ.id}`} 
                  checked={answers[currentQ.id] === opt}
                  onChange={() => handleSelectOption(opt)}
                />
                <span className="ti-option-text" style={{ fontSize: `${fontSize - 1}px` }}>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="ti-footer">
        <div className="ti-footer-left">
          Nexora Online Assessment © 2021-2031
          <Wifi size={14} className="ml-4 mr-2 text-success" style={{ color: '#28a745' }} />
          <span className="ti-recorded-tag">
            <span className="recording-dot"></span> Recorded Session
          </span>
        </div>
        <div className="ti-footer-center">
          Need Help? Contact us: 🇺🇸 +1 (800) 265-6038 🇮🇳 +91 80471-89190
        </div>
        <div className="ti-footer-right">
          Powered By <strong>Nexora</strong>
        </div>
      </footer>


      {/* Finish Test Side Panel */}
      {showFinishPanel && (
        <div className="ti-finish-overlay">
          <div className="ti-finish-panel slide-in-right">
            <div className="ti-finish-header">
              <div className="flex-center">
                <AlertTriangle size={18} className="text-danger mr-2" />
                <span>Finish Test</span>
              </div>
              <div className="flex-center text-sm">
                <Clock size={14} className="mr-2" /> Remaining Time: {formatTime(timeRemaining)}
                <XCircle size={24} className="ml-6 cursor-pointer" strokeWidth={1.5} color="#94a3b8" onClick={() => setShowFinishPanel(false)} />
              </div>
            </div>

            <div className="ti-finish-body">
              <div className="ti-summary-section">
                <div className="ti-donut-chart">
                  <AnimatedDonutChart percentage={totalQ > 0 ? (attemptedCount / totalQ) * 100 : 0} />
                </div>
                <div className="ti-summary-stats">
                  <div className="text-sm text-secondary">Your Test Summary</div>
                  <div className="text-2xl font-bold">{totalQ} <span className="text-sm font-normal text-secondary">Total Questions</span></div>
                  
                  <ul className="ti-legend mt-4">
                    <li><span className="legend-dot bg-blue"></span> Attempted: {attemptedCount}/{totalQ}</li>
                    <li><span className="legend-dot bg-orange"></span> Marked for Revisit: {revisitCount}/{totalQ}</li>
                    <li><span className="legend-dot bg-gray"></span> Unattempted: {totalQ - attemptedCount}/{totalQ}</li>
                  </ul>
                </div>
              </div>

              <div className="ti-section-summary">
                <div className="font-bold mb-4">Section Summary</div>
                <table className="ti-summary-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>SECTION NAME</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((sec, idx) => {
                      let secAttempted = 0;
                      for (let i = sec.startIndex; i < sec.startIndex + sec.count; i++) {
                        if (answers[testDetails.questions[i].id] !== undefined) secAttempted++;
                      }
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{sec.name}<br/><span className="text-xs text-secondary">Questions {sec.startIndex + 1} - {sec.startIndex + sec.count}</span></td>
                          <td>
                            <div className="ti-progress-bar">
                              <div className="ti-progress-fill" style={{ width: `${(secAttempted/sec.count)*100}%` }}>
                                {secAttempted}
                              </div>
                            </div>
                            <div className="text-right text-xs text-secondary mt-1">Total: {sec.count} Questions</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ti-finish-footer" style={{ display: 'flex', gap: '15px' }}>
              <button 
                type="button" 
                style={{ backgroundColor: '#e63946', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                onClick={() => handleSubmitExam('Completed')}
              >
                Yes, End Test!
              </button>
              <button 
                type="button" 
                style={{ backgroundColor: 'white', color: '#64748b', padding: '12px 24px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                onClick={() => setShowFinishPanel(false)}
              >
                No, Back to Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Side Panel */}
      {showInfoModal && (
        <>
          <div className="ti-finish-overlay" style={{ zIndex: 999 }} onClick={() => setShowInfoModal(false)}></div>
          <div className="slide-in-right ti-info-panel" style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '450px',
            backgroundColor: 'white',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 15px rgba(0,0,0,0.1)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e56a0', fontWeight: 'bold', fontSize: '18px' }}>
                <Info size={20} />
                Instructions
              </div>
              <button onClick={() => setShowInfoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
              <button 
                onClick={() => setInfoTab('Section')}
                style={{ 
                  flex: 1, 
                  padding: '16px 0', 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: infoTab === 'Section' ? '2px solid #1e56a0' : '2px solid transparent',
                  color: infoTab === 'Section' ? '#1e56a0' : '#64748b',
                  fontWeight: infoTab === 'Section' ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Section Instructions
              </button>
              <button 
                onClick={() => setInfoTab('Test')}
                style={{ 
                  flex: 1, 
                  padding: '16px 0', 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: infoTab === 'Test' ? '2px solid #1e56a0' : '2px solid transparent',
                  color: infoTab === 'Test' ? '#1e56a0' : '#64748b',
                  fontWeight: infoTab === 'Test' ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Test Instructions
              </button>
            </div>

            {/* Content */}
            <div className="ti-info-panel-content" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
              
              {/* Only show test stats if we are on the Test Instructions tab */}
              {infoTab === 'Test' && (
                <div style={{ width: '100%', marginBottom: '40px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ flex: 1, padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e56a0' }}>{totalQ}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px', fontWeight: '600' }}>Questions</div>
                    </div>
                    <div style={{ flex: 1, padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e56a0' }}>{testDetails.duration / 60}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px', fontWeight: '600' }}>Minutes</div>
                    </div>
                  </div>
                  
                  <div style={{ padding: '16px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: '4px', display: 'flex', gap: '12px' }}>
                    <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#92400e', fontSize: '14px', display: 'block', marginBottom: '4px' }}>Important Instructions</strong>
                      <p style={{ fontSize: '13px', margin: 0, color: '#b45309', lineHeight: '1.5' }}>
                        Do not refresh the page or attempt to leave the full-screen mode. Doing so may result in your test being terminated automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#64748b', margin: 'auto 0' }}>
                <ClipboardList size={64} color="#cbd5e1" strokeWidth={1} style={{ marginBottom: '20px' }} />
                <p style={{ fontSize: '14px', margin: 0, fontWeight: 500 }}>No specific Instructions for this {infoTab === 'Test' ? 'Test' : 'Section'}</p>
              </div>
              
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default TestInterface;
