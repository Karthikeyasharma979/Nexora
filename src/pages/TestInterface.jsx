import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Cloud, Clock, Maximize, Settings, ChevronDown, 
  Grid, Calculator, Flag, Bookmark, X, AlertTriangle, MessageSquare,
  Info, ChevronLeft, ChevronRight, Wifi, StopCircle,
  ShieldCheck
} from 'lucide-react';
import { playTimerWarning } from '../utils/audioUtils';
import { getTestById, saveReport } from '../utils/db';
import './TestInterface.css';

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


  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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

  const handleSelectOption = (optText) => {
    if (!testDetails) return;
    const currentQ = testDetails.questions[currentQuestionIdx];
    setAnswers(prev => ({ ...prev, [currentQ.id]: optText }));
  };

  const handleClearResponse = () => {
    if (!testDetails) return;
    const currentQ = testDetails.questions[currentQuestionIdx];
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[currentQ.id];
      return newAnswers;
    });
  };

  const toggleRevisit = () => {
    if (!testDetails) return;
    const currentQ = testDetails.questions[currentQuestionIdx];
    setRevisited(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

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
    <div className="ti-container">
      {/* Global Header */}
      <header className="ti-header">
        <div className="ti-header-left">
          <div className="ti-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
            <ShieldCheck size={24} style={{ color: '#4ade80' }} /> Nexora
          </div>
          <div className="ti-user-info">
            <span className="ti-user-name">{sessionStorage.getItem('candidateName') || 'Harry'}</span>
            <div className="ti-test-meta">
              <span>{testDetails.name} /</span>
              <Cloud size={14} className="ml-2 mr-1" /> 
              <span>Saved: 0 seconds ago</span>
            </div>
          </div>
        </div>
        
        <div className="ti-header-right">
          <div className="ti-timer">
            <Clock size={16} className="mr-2" /> Test Time: {formatTime(timeRemaining)}
          </div>
          <button type="button" className="ti-icon-btn" onClick={() => setFontSize(prev => Math.max(12, prev - 2))} title="Decrease Font Size" style={{ fontWeight: 'bold', fontSize: '12px' }}>A-</button>
          <button type="button" className="ti-icon-btn" onClick={() => setFontSize(prev => Math.min(24, prev + 2))} title="Increase Font Size" style={{ fontWeight: 'bold', fontSize: '14px' }}>A+</button>
          <button className="ti-icon-btn"><Maximize size={18} /></button>
          <button className="ti-icon-btn"><Settings size={18} /></button>
          <button className="ti-btn-finish" onClick={() => setShowFinishPanel(true)}>Finish Test</button>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="ti-nav">
        <div className="flex-center gap-4" style={{ position: 'relative' }}>
          <div className="ti-section-dropdown" onClick={() => setShowSectionDropdown(!showSectionDropdown)} style={{ cursor: 'pointer' }}>
            <span>{currentSectionIndex + 1}. {currentSectionName}</span>
            <ChevronDown size={16} className="ml-2" />
          </div>
          
          {showSectionDropdown && (
            <div className="ti-filter-dropdown slide-in-right" style={{ left: 0, right: 'auto', top: '100%', marginTop: '10px', minWidth: '200px', zIndex: 100 }}>
              <div className="ti-filter-header">Jump to Section</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sections.map((s, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      backgroundColor: currentSectionName === s.name ? '#f0f9ff' : 'white',
                      border: 'none',
                      borderBottom: '1px solid #eaeaea',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: currentSectionName === s.name ? '#1e56a0' : '#495057',
                      fontWeight: currentSectionName === s.name ? '600' : '400'
                    }}
                    onClick={() => {
                      setCurrentQuestionIdx(s.startIndex);
                      setShowSectionDropdown(false);
                    }}
                  >
                    {idx + 1}. {s.name} <span style={{ fontSize: '11px', color: '#6c757d', marginLeft: '8px' }}>({s.count} Qs)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="button" className="ti-icon-btn" style={{ color: '#1e56a0', border: '1px solid #dcdfe4', padding: '2px 6px', borderRadius: '4px' }}>
            <Info size={14} />
          </button>
        </div>
        
        <div className="ti-pagination-wrapper">
          <div className="ti-pagination">
            <button type="button" className="ti-page-btn" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev-1))}>&lt;</button>
            {Array.from({ length: sections[currentSectionIndex].count }).map((_, i) => {
              const idx = sections[currentSectionIndex].startIndex + i;
              const q = testDetails.questions[idx];
              let statusClass = 'unattempted';
              if (answers[q.id] !== undefined) {
                statusClass = 'attempted';
              } else if (revisited[q.id]) {
                statusClass = 'revisited';
              } else if (viewed[q.id] && currentQuestionIdx !== idx) {
                statusClass = 'skipped';
              }
              
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
            <button type="button" className="ti-page-btn" disabled={currentQuestionIdx === totalQ - 1} onClick={() => setCurrentQuestionIdx(prev => Math.min(totalQ-1, prev+1))}>&gt;</button>
            
            <div className="ti-filter-tools">
              <button type="button" className="ti-icon-btn" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
                <Grid size={16} />
              </button>
              <button type="button" className="ti-icon-btn">
                <Calculator size={16} />
              </button>
            </div>
            <div className="ti-attempt-count">Attempted: {attemptedCount}/{totalQ}</div>
          </div>

          {/* Filter Dropdown Popup */}
          {showFilterDropdown && (
            <div className="ti-filter-dropdown slide-in-right">
              <div className="ti-filter-header">Filter by</div>
              <div className="ti-filter-tabs">
                {['All', 'Attempted', 'Revisited', 'Unattempted'].map(tab => (
                  <div 
                    key={tab} 
                    className={`ti-filter-tab ${filterType === tab ? 'active' : ''}`}
                    onClick={() => setFilterType(tab)}
                  >
                    {tab}
                  </div>
                ))}
              </div>
              <div className="ti-filter-grid">
                {displayedQuestions.map(({ q, originalIndex }) => {
                  let statusClass = 'unattempted';
                  if (answers[q.id] !== undefined) statusClass = 'attempted';
                  else if (revisited[q.id]) statusClass = 'revisited';
                  
                  return (
                    <button 
                      type="button"
                      key={q.id} 
                      className={`ti-page-num ${statusClass} ${currentQuestionIdx === originalIndex ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentQuestionIdx(originalIndex);
                        setShowFilterDropdown(false);
                      }}
                      style={{ border: '1px solid #dcdfe4' }}
                    >
                      {originalIndex - sections[currentSectionIndex].startIndex + 1}
                    </button>
                  );
                })}
              </div>
              <div className="ti-filter-legend mt-4">
                <div className="flex-center"><span className="legend-dot bg-blue"></span> Attempted</div>
                <div className="flex-center"><span className="legend-dot bg-orange"></span> Revisited</div>
                <div className="flex-center"><span className="legend-dot bg-gray"></span> Unattempted</div>
              </div>
            </div>
          )}
        </div>

        <div className="ti-nav-right">
          <button type="button" className="ti-btn-outline" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev-1))}>
            Previous
          </button>
          {currentQuestionIdx === totalQ - 1 ? (
            <button type="button" className="ti-btn-next" style={{ backgroundColor: '#1e56a0', color: 'white' }} onClick={() => setShowFinishPanel(true)}>Submit</button>
          ) : (
            <button type="button" className="ti-btn-next" onClick={() => setCurrentQuestionIdx(prev => Math.min(totalQ-1, prev+1))}>Next</button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="ti-main">
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
            <div className="ti-q-number">
              Question {currentQuestionIdx - sections[currentSectionIndex].startIndex + 1}
              <Flag size={14} className="ml-2 text-primary cursor-pointer" />
            </div>
            <div className="ti-revisit-flag" onClick={toggleRevisit}>
              <Bookmark size={14} className={`mr-1 ${revisited[currentQ.id] ? 'fill-current text-orange' : ''}`} /> Revisit Later
            </div>
          </div>
          <div className="ti-question-text" style={{ fontSize: `${fontSize}px` }}>
            {currentQ.text}
          </div>
        </div>
        
        <div className="ti-pane-right">
          <div className="ti-options-header">
            <span>Select an option</span>
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
                <X size={20} className="ml-4 cursor-pointer" onClick={() => setShowFinishPanel(false)} />
              </div>
            </div>

            <div className="ti-finish-body">
              <div className="ti-summary-section">
                <div className="ti-donut-chart">
                  {/* CSS Donut Chart */}
                  <div className="donut" style={{ '--percentage': (attemptedCount / totalQ) * 100 }}></div>
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

            <div className="ti-finish-footer">
              <button 
                type="button" 
                className="btn-primary w-full" 
                onClick={() => handleSubmitExam('Completed')}
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TestInterface;
