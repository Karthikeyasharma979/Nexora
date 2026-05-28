import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllTests, saveTest, getAllReports } from '../utils/db';
import { ClipboardList, Users, AlertOctagon, Plus, Copy, Eye, EyeOff, LayoutTemplate, Settings, Trash2, Edit2 } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setActiveTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };
  
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [reports, setReports] = useState([]);
  
  // Test Builder State
  const [tests, setTests] = useState([]);
  const [editingTestId, setEditingTestId] = useState(null);
  const [newTestName, setNewTestName] = useState('');
  const [newTestDuration, setNewTestDuration] = useState(900); // 15 mins default
  const [newTestRequireCamera, setNewTestRequireCamera] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [currentSectionName, setCurrentSectionName] = useState('Section 1');
  const [builderMode, setBuilderMode] = useState('manual'); // 'manual' or 'bulk'
  const [bulkText, setBulkText] = useState('');

  const handleBulkParse = () => {
    if (!bulkText.trim()) {
      alert("Please paste some text first.");
      return;
    }
    const newParsed = parsePastedQuestions(bulkText);
    if (newParsed.length === 0) {
      alert("Could not parse any questions. Please make sure options start with letters (A, B, C, D) and correct answers are defined using the 'Answer: C' format.");
      return;
    }
    
    const updated = [...questions];
    newParsed.forEach(q => {
      updated.push({
        ...q,
        id: updated.length + 1,
        sectionName: currentSectionName
      });
    });
    setQuestions(updated);
    setBulkText(''); // Clear
    alert(`Successfully extracted and imported ${newParsed.length} questions!`);
  };
  
  // Current question being added
  const [currentQuestion, setCurrentQuestion] = useState({ text: '', options: ['', '', '', ''], correctOption: 0 });

  useEffect(() => {
    getAllTests()
      .then(data => setTests(data))
      .catch(err => console.error("Error loading tests:", err));
      
    getAllReports()
      .then(data => setReports(data))
      .catch(err => console.error("Error loading reports:", err));
  }, []);

  const handleDeleteTest = async (id) => {
    if (window.confirm("Are you sure you want to delete this test? This action cannot be undone.")) {
      try {
        const { deleteTest } = await import('../utils/db');
        await deleteTest(id);
        const data = await getAllTests();
        setTests(data);
      } catch (err) {
        console.error("Error deleting test:", err);
        alert("Failed to delete test.");
      }
    }
  };

  const handleEditTest = (test) => {
    setEditingTestId(test.id);
    setNewTestName(test.name);
    setNewTestDuration(test.duration);
    setNewTestRequireCamera(test.requireCamera !== false);
    setQuestions([...test.questions]);
    if (test.questions.length > 0) {
      setCurrentSectionName(test.questions[0].sectionName || 'Section 1');
    }
    setActiveTab('builder');
  };

  const handleCancelEdit = () => {
    setEditingTestId(null);
    setNewTestName('');
    setNewTestRequireCamera(true);
    setQuestions([]);
    setActiveTab('tests');
  };

  const handleOptionChange = (idx, value) => {
    const updatedOptions = [...currentQuestion.options];
    updatedOptions[idx] = value;
    setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (editingQuestionIndex !== null) {
      const updated = [...questions];
      updated[editingQuestionIndex] = { ...currentQuestion, sectionName: currentSectionName };
      setQuestions(updated);
      setEditingQuestionIndex(null);
    } else {
      setQuestions([...questions, { ...currentQuestion, id: questions.length + 1, sectionName: currentSectionName }]);
    }
    setCurrentQuestion({ text: '', options: ['', '', '', ''], correctOption: 0 }); // reset
  };

  const handleEditQuestion = (index) => {
    setEditingQuestionIndex(index);
    setCurrentQuestion({ ...questions[index] });
    setCurrentSectionName(questions[index].sectionName || 'Section 1');
    setBuilderMode('manual');
  };

  const handleDeleteQuestion = (index) => {
    if (window.confirm("Are you sure you want to remove this question?")) {
      const updated = questions.filter((_, i) => i !== index);
      setQuestions(updated);
      if (editingQuestionIndex === index) {
        handleCancelEditQuestion();
      } else if (editingQuestionIndex !== null && editingQuestionIndex > index) {
        setEditingQuestionIndex(editingQuestionIndex - 1);
      }
    }
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionIndex(null);
    setCurrentQuestion({ text: '', options: ['', '', '', ''], correctOption: 0 });
  };

  const handleSaveTest = () => {
    if (!newTestName || questions.length === 0) {
      alert('Please provide a test name and at least one question.');
      return;
    }
    const newTest = {
      id: editingTestId || ('test-' + Math.random().toString(36).substr(2, 9)),
      name: newTestName,
      duration: parseInt(newTestDuration, 10),
      requireCamera: newTestRequireCamera,
      questions: questions
    };
    
    let savePromise;
    if (editingTestId) {
      import('../utils/db').then(({ updateTest }) => {
        updateTest(editingTestId, newTest)
          .then(() => getAllTests())
          .then(data => {
            setTests(data);
            setEditingTestId(null);
            setNewTestName('');
            setNewTestRequireCamera(true);
            setQuestions([]);
            alert('Test updated successfully!');
            setActiveTab('tests');
          })
          .catch(err => {
            console.error("Error updating test:", err);
            alert('Failed to update test. Please try again.');
          });
      });
      return;
    }

    saveTest(newTest)
      .then(() => {
        return getAllTests();
      })
      .then(data => {
        setTests(data);
        setNewTestName('');
        setNewTestRequireCamera(true);
        setQuestions([]);
        alert('Test created successfully!');
        setActiveTab('tests');
      })
      .catch(err => {
        console.error("Error saving test:", err);
        alert('Failed to save test. Please try again.');
      });
  };

  const getTestLink = (testId) => {
    return `${window.location.origin}/pre-test/${testId}`;
  };

  const copyToClipboard = (link) => {
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  // Glance Metrics
  const totalTests = tests.length;
  const activeCandidates = reports.length;
  const totalViolations = reports.reduce((acc, curr) => acc + (curr.violations?.length || 0), 0);

  return (
    <div className="dashboard-container">
      {/* Modern Sub-Header tabs for sub-navigation in the workspace */}
      <div className="modern-tabs">
        <button 
          className={`modern-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutTemplate size={16} /> Overview
        </button>
        <button 
          className={`modern-tab ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
        >
          <ClipboardList size={16} /> Manage Tests
        </button>
        <button 
          className={`modern-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <Users size={16} /> Candidates
        </button>
        <button 
          className={`modern-tab ${activeTab === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          <Plus size={16} /> Test Builder
        </button>
        <button 
          className={`modern-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} /> Settings
        </button>
      </div>

      <div className="dashboard-content-area">
        {activeTab === 'dashboard' && (
          <div className="dashboard-home-view fade-in">
            <div className="dashboard-header">
              <div>
                <h1>Dashboard Overview</h1>
                <p className="text-secondary">Welcome back! Here's what's happening today.</p>
              </div>
              <button className="btn-primary" onClick={() => setActiveTab('builder')}>
                <Plus size={18} />
                Create New Test
              </button>
            </div>

            {/* Glance Metrics Row */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <ClipboardList size={24} />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Total Tests</p>
                  <h3 className="metric-value">{totalTests}</h3>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Users size={24} />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Active Candidates</p>
                  <h3 className="metric-value">{activeCandidates}</h3>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <AlertOctagon size={24} />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Violations Detected</p>
                  <h3 className="metric-value">{totalViolations}</h3>
                </div>
              </div>
            </div>

            {/* Overview Widgets */}
            <div className="widgets-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div className="content-card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>Recent Tests</h2>
                  <button className="btn-text" onClick={() => setActiveTab('tests')} style={{ color: '#0056b3', fontWeight: '600' }}>View All</button>
                </div>
                <div style={{ marginTop: '15px' }}>
                  {tests.slice(0, 3).map(test => (
                    <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f3f5' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{test.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{test.questions.length} questions • {test.duration / 60} mins</div>
                      </div>
                      <div className="copy-link-wrapper" style={{ width: '180px' }}>
                        <input type="text" readOnly value={getTestLink(test.id)} className="link-input" style={{ fontSize: '11px' }} />
                        <button className="icon-btn-action" onClick={() => copyToClipboard(getTestLink(test.id))}>
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {tests.length === 0 && <p className="text-secondary" style={{ padding: '15px 0' }}>No tests created yet.</p>}
                </div>
              </div>

              <div className="content-card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>Recent Candidate Activity</h2>
                  <button className="btn-text" onClick={() => setActiveTab('reports')} style={{ color: '#0056b3', fontWeight: '600' }}>View All</button>
                </div>
                <div style={{ marginTop: '15px' }}>
                  {MOCK_CANDIDATES.slice(0, 3).map(candidate => (
                    <div key={candidate.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f3f5' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{candidate.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Score: {candidate.score}</div>
                      </div>
                      <div>
                        <span className={`status-pill ${candidate.status.toLowerCase()}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
                          {candidate.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="content-card fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Created Tests</h2>
                <p className="text-secondary">Share these unique links with your candidates.</p>
              </div>
              <button className="btn-primary btn-sm" onClick={() => setActiveTab('builder')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', fontSize: '13px' }}>
                <Plus size={14} /> New Test
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Duration</th>
                    <th>Camera/Proctoring</th>
                    <th>Questions</th>
                    <th>Candidate Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map(test => (
                    <tr key={test.id}>
                      <td className="font-medium text-primary">{test.name}</td>
                      <td>
                        <span className="duration-pill">{test.duration / 60} mins</span>
                      </td>
                      <td>
                        {test.requireCamera !== false ? (
                          <span className="violation-pill text-success" style={{ fontSize: '11px' }}>Enabled</span>
                        ) : (
                          <span className="violation-pill text-secondary" style={{ fontSize: '11px' }}>Disabled</span>
                        )}
                      </td>
                      <td>{test.questions.length}</td>
                      <td>
                        <div className="copy-link-wrapper">
                          <input 
                            type="text" 
                            readOnly 
                            value={getTestLink(test.id)} 
                            className="link-input" 
                          />
                          <button className="icon-btn-action" onClick={() => copyToClipboard(getTestLink(test.id))} title="Copy Link">
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="icon-btn-action" style={{ color: '#3b82f6' }} onClick={() => handleEditTest(test)} title="Edit Test">
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-btn-action" style={{ color: '#ef4444' }} onClick={() => handleDeleteTest(test.id)} title="Delete Test">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tests.length === 0 && <tr><td colSpan="6" className="empty-state">No tests created yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="content-card fade-in">
            <div className="card-header">
              <h2>Proctoring Reports</h2>
              <p className="text-secondary">Review candidate scores and proctoring violations.</p>
            </div>
            
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Candidate Name</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Violations</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((candidate, idx) => (
                    <React.Fragment key={candidate._id || candidate.id || idx}>
                      <tr>
                        <td className="font-medium text-primary">{candidate.candidateName}</td>
                        <td>
                          <span className={`status-pill ${candidate.status.toLowerCase()}`}>
                            {candidate.status}
                          </span>
                        </td>
                        <td className="font-semibold">{candidate.score}</td>
                        <td>
                          {candidate.violations.length > 0 ? (
                            <span className="violation-pill text-danger">
                              <AlertOctagon size={14} /> {candidate.violations.length} Violations
                            </span>
                          ) : (
                            <span className="violation-pill text-success">
                              Clean
                            </span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn-text" 
                            onClick={() => setExpandedCandidate(expandedCandidate === (candidate._id || candidate.id || idx) ? null : (candidate._id || candidate.id || idx))}
                          >
                            {expandedCandidate === (candidate._id || candidate.id || idx) ? <><EyeOff size={16} /> Hide Logs</> : <><Eye size={16} /> View Logs</>}
                          </button>
                        </td>
                      </tr>
                      {expandedCandidate === (candidate._id || candidate.id || idx) && (
                        <tr className="logs-row">
                          <td colSpan="5">
                            <div className="logs-container-modern">
                              {candidate.violations.length > 0 ? (
                                <ul className="logs-timeline">
                                  {candidate.violations.map((v, idx) => (
                                    <li key={idx} className="timeline-item">
                                      <div className="timeline-dot"></div>
                                      <div className="timeline-content">
                                        <span className="timeline-time">{v.time || new Date(v.timestamp).toLocaleTimeString()}</span>
                                        <span className="timeline-type">{v.type}</span>
                                        <span className="timeline-msg">{v.message}</span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-success timeline-empty">No proctoring violations recorded for this candidate.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'builder' && (
          <div className="content-card fade-in">
            <div className="card-header border-bottom">
              <h2>Test Builder</h2>
              <p className="text-secondary">Create a new test and add multiple-choice questions.</p>
            </div>
            
            <div className="builder-layout">
              <div className="builder-form-section">
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Test Name</label>
                    <input type="text" className="modern-input" value={newTestName} onChange={e => setNewTestName(e.target.value)} placeholder="e.g. Midterm Exam" />
                  </div>
                  <div className="form-group flex-1">
                    <label>Duration</label>
                    <select className="modern-input" value={newTestDuration} onChange={e => setNewTestDuration(e.target.value)}>
                      <option value="900">15 Minutes</option>
                      <option value="1800">30 Minutes</option>
                      <option value="2700">45 Minutes</option>
                      <option value="3600">60 Minutes (1 Hour)</option>
                      <option value="5400">90 Minutes (1.5 Hours)</option>
                      <option value="7200">120 Minutes (2 Hours)</option>
                      <option value="10800">180 Minutes (3 Hours)</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-row mb-4">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                    <input 
                      type="checkbox" 
                      checked={newTestRequireCamera} 
                      onChange={e => setNewTestRequireCamera(e.target.checked)} 
                      style={{ width: '16px', height: '16px' }}
                    />
                    Require Webcam & AI Proctoring
                  </label>
                </div>
                
                <div className="form-group mb-4">
                  <label>Current Section Name</label>
                  <input type="text" className="modern-input" value={currentSectionName} onChange={e => setCurrentSectionName(e.target.value)} placeholder="e.g. Aptitude, Technical, Section 1" />
                  <p className="text-secondary" style={{ fontSize: '12px', marginTop: '4px' }}>Questions added below will be assigned to this section.</p>
                </div>
                
                               <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <button 
                    type="button"
                    onClick={() => setBuilderMode('manual')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: builderMode === 'manual' ? '#1e56a0' : 'transparent',
                      color: builderMode === 'manual' ? 'white' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >
                    Manual Form
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBuilderMode('bulk')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: builderMode === 'bulk' ? '#1e56a0' : 'transparent',
                      color: builderMode === 'bulk' ? 'white' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >
                    ✨ Smart Bulk Paste
                  </button>
                </div>
                
                {builderMode === 'manual' ? (
                  <form onSubmit={handleAddQuestion} className="question-form">
                    <div className="form-group">
                      <label>Question Text</label>
                      <textarea 
                        className="modern-input" rows="2" 
                        value={currentQuestion.text} onChange={(e) => setCurrentQuestion({...currentQuestion, text: e.target.value})}
                        placeholder="Type your question here..."
                        required
                      />
                    </div>
                    
                    <div className="options-grid mt-4">
                      <label className="full-width">Options (Select correct one)</label>
                      {currentQuestion.options.map((opt, idx) => (
                        <div key={idx} className={`option-card ${currentQuestion.correctOption === idx ? 'selected' : ''}`}>
                          <div className="radio-wrapper">
                            <input 
                              type="radio" name="correctOption" 
                              checked={currentQuestion.correctOption === idx}
                              onChange={() => setCurrentQuestion({...currentQuestion, correctOption: idx})}
                            />
                          </div>
                          <input 
                            type="text" className="option-input" 
                            value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`} required
                          />
                        </div>
                      ))}
                    </div>

                    <div className="form-group mt-4" style={{ marginTop: '15px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Correct Option *</label>
                      <select 
                        className="modern-input"
                        value={currentQuestion.correctOption}
                        onChange={(e) => setCurrentQuestion({...currentQuestion, correctOption: parseInt(e.target.value, 10)})}
                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="0">Option 1 is the Correct Answer</option>
                        <option value="1">Option 2 is the Correct Answer</option>
                        <option value="2">Option 3 is the Correct Answer</option>
                        <option value="3">Option 4 is the Correct Answer</option>
                      </select>
                    </div>
                    <div className="form-actions mt-4" style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" className="btn-secondary">
                        <Plus size={16} /> {editingQuestionIndex !== null ? 'Update Question' : 'Add Question'}
                      </button>
                      {editingQuestionIndex !== null && (
                        <button type="button" className="btn-secondary" onClick={handleCancelEditQuestion} style={{ backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="bulk-paste-section fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '13px', color: '#0369a1', lineHeight: '1.5' }}>
                      <strong>💡 Pro-Tip for Smart Paste:</strong> Paste one or multiple questions. Each question must be separated by a blank line. Options can start with A, B, C, D (e.g. <code>A) Paris</code> or <code>A. Paris</code>). Explicitly specify the correct answer using <code>Answer: C</code> at the end of the question block.
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Paste Questions & Answers Here</label>
                      <textarea
                        className="modern-input"
                        rows="12"
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        placeholder={`Example Format:

1. What is the capital of France?
A) Berlin
B) London
C) Paris
D) Madrid
Answer: C

2. Which planet is known as the Red Planet?
A. Earth
B. Mars
C. Jupiter
D. Saturn
Answer: B`}
                        style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6', width: '100%', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <button 
                        type="button" 
                        className="btn-primary" 
                        onClick={handleBulkParse}
                        style={{ padding: '10px 18px', fontSize: '14px' }}
                      >
                        Extract & Import Questions
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="builder-summary-section">
                <div className="summary-box">
                  <h3>Questions in Test <span className="badge">{questions.length}</span></h3>
                  <div className="questions-list">
                    {questions.length === 0 && (
                      <div className="empty-questions">
                        <ClipboardList size={32} className="text-muted" />
                        <p>No questions added yet.</p>
                      </div>
                    )}
                    {questions.map((q, i) => (
                      <div key={i} className="question-summary-item" style={{ position: 'relative', paddingRight: '40px' }}>
                        <div style={{ fontSize: '11px', color: '#1e56a0', fontWeight: '600', marginBottom: '4px' }}>{q.sectionName || 'Section 1'}</div>
                        <div>
                          <span className="q-num">Q{i+1}</span>
                          <span className="q-text" style={{ display: 'inline' }}>{q.text}</span>
                        </div>
                        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                          <button type="button" onClick={() => handleEditQuestion(i)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '2px' }} title="Edit Question">
                            <Edit2 size={14} />
                          </button>
                          <button type="button" onClick={() => handleDeleteQuestion(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }} title="Delete Question">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {questions.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      {editingTestId && (
                        <button className="btn-secondary w-full" onClick={handleCancelEdit}>
                          Cancel Edit
                        </button>
                      )}
                      <button className="btn-primary w-full" onClick={handleSaveTest}>
                        {editingTestId ? 'Update Test' : 'Save Full Test'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="content-card fade-in">
            <div className="card-header border-bottom">
              <h2>System Settings</h2>
              <p className="text-secondary">Configure admin preferences, security thresholds, and integration parameters.</p>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Profile Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Administrator Profile</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Manage your global personal credentials and authorization status.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Full Name</label>
                      <input type="text" className="modern-input" readOnly value="Admin User" style={{ backgroundColor: '#f8fafc' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Role</label>
                      <input type="text" className="modern-input" readOnly value="Super Admin" style={{ backgroundColor: '#f8fafc' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Email Address</label>
                    <input type="email" className="modern-input" readOnly value="admin@mettlassessments.com" style={{ backgroundColor: '#f8fafc' }} />
                  </div>
                </div>
              </div>

              {/* Database Status Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Database Configuration</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Active persistent storage server and Mongoose connection parameters.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Database Driver</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>MongoDB Atlas Cluster Connected (or Memory Fail-Safe)</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Active Connection String</label>
                    <input type="text" className="modern-input" readOnly value="mongodb+srv://karthikeyasharma888_db_user:bcFea7ZySw1Dcoll@cluster0.gvcdx8s.mongodb.net/TaskioDB" style={{ fontFamily: 'monospace', fontSize: '12px', backgroundColor: '#f8fafc' }} />
                  </div>
                </div>
              </div>

              {/* Proctoring Settings Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>Global Proctoring Strictness</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Tolerances and system automated thresholds for candidate test terminations.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Max Tab Switches Allowed</label>
                      <select className="modern-input" style={{ width: '100%' }}>
                        <option value="3">3 Warnings (Standard)</option>
                        <option value="1">1 Warning (Strict)</option>
                        <option value="5">5 Warnings (Moderate)</option>
                        <option value="999">Unlimited (Disabled)</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Integrity Check Sensitivity</label>
                      <select className="modern-input" style={{ width: '100%' }}>
                        <option value="high">High (Strict Face Detection)</option>
                        <option value="medium">Medium (Standard)</option>
                        <option value="low">Low (Tab and Window Focus Only)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

// Highly resilient smart past parser helper function
const parsePastedQuestions = (rawText) => {
  // Normalize line endings to standard \n
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Try splitting by blank lines first
  let segments = normalized.split(/\n\s*\n/);
  
  // If we only got 1 segment and there are multiple numbered questions,
  // let's split by the question number at the beginning of a line!
  if (segments.length <= 1) {
    const matches = normalized.split(/(?=\n\d+[\.\)])|^(?=\d+[\.\)])/);
    if (matches.length > 1) {
      segments = matches;
    }
  }

  const parsedQuestions = [];

  segments.forEach(segment => {
    const lines = segment.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 3) return; // Need at least question, options, and answer

    let questionText = '';
    let options = [];
    let correctOption = 0;
    
    // Find answer line
    let answerLineIndex = -1;
    let answerVal = '';
    
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(?:correct\s+)?answer:\s*(.*)$/i);
      if (match) {
        answerLineIndex = i;
        answerVal = match[1].trim().toUpperCase();
        break;
      }
    }

    if (answerLineIndex === -1) {
      const lastLine = lines[lines.length - 1];
      if (/^[A-D1-4]$/i.test(lastLine)) {
        answerLineIndex = lines.length - 1;
        answerVal = lastLine.toUpperCase();
      }
    }

    // Identify options vs question
    let possibleOptions = [];
    let questionLines = [];

    lines.forEach((line, idx) => {
      if (idx === answerLineIndex) return;

      // Matches option prefixes: e.g. "a. ", "A) ", "1- ", or even just "A " (followed by space)
      const optionMatch = line.match(/^(?:([A-D]|[a-d]|[1-4]))(?:[\.\)\-]?\s+)(.*)$/);
      if (optionMatch) {
        possibleOptions.push({
          label: optionMatch[1].toUpperCase(),
          text: optionMatch[2].trim()
        });
      } else {
        if (possibleOptions.length === 0) {
          questionLines.push(line);
        } else {
          possibleOptions[possibleOptions.length - 1].text += ' ' + line;
        }
      }
    });

    if (possibleOptions.length >= 2) {
      questionText = questionLines.join(' ').replace(/^\d+[\.\)]\s*/, '');
      options = possibleOptions.slice(0, 4).map(o => o.text);
      
      let ansIdx = -1;
      if (answerVal) {
        // Strip decorative prefixes like "Option " or "Choice "
        let cleanAns = answerVal.replace(/^(?:OPTION|CHOICE)\s*/i, '').trim();
        
        if (['A', 'B', 'C', 'D'].includes(cleanAns)) {
          ansIdx = ['A', 'B', 'C', 'D'].indexOf(cleanAns);
        } else if (['1', '2', '3', '4'].includes(cleanAns)) {
          ansIdx = parseInt(cleanAns, 10) - 1;
        } else {
          // Check literal text matches against options
          const matchedOpt = options.findIndex(opt => opt.toLowerCase() === answerVal.toLowerCase());
          if (matchedOpt !== -1) {
            ansIdx = matchedOpt;
          } else {
            const matchedOptClean = options.findIndex(opt => opt.toLowerCase() === cleanAns.toLowerCase());
            if (matchedOptClean !== -1) ansIdx = matchedOptClean;
          }
        }
      }
      correctOption = ansIdx !== -1 ? ansIdx : 0;
    } else {
      // Fallback: If no headers exist, treat first line as question and next as options
      const linesWithoutAnswer = lines.filter((_, idx) => idx !== answerLineIndex);
      if (linesWithoutAnswer.length >= 3) {
        questionText = linesWithoutAnswer[0].replace(/^\d+[\.\)]\s*/, '');
        options = linesWithoutAnswer.slice(1, 5);
        
        let ansIdx = -1;
        if (answerVal) {
          let cleanAns = answerVal.replace(/^(?:OPTION|CHOICE)\s*/i, '').trim();
          if (['A', 'B', 'C', 'D'].includes(cleanAns)) {
            ansIdx = ['A', 'B', 'C', 'D'].indexOf(cleanAns);
          } else if (['1', '2', '3', '4'].includes(cleanAns)) {
            ansIdx = parseInt(cleanAns, 10) - 1;
          } else {
            const matchedOpt = options.findIndex(opt => opt.toLowerCase() === answerVal.toLowerCase());
            if (matchedOpt !== -1) {
              ansIdx = matchedOpt;
            } else {
              const matchedOptClean = options.findIndex(opt => opt.toLowerCase() === cleanAns.toLowerCase());
              if (matchedOptClean !== -1) ansIdx = matchedOptClean;
            }
          }
        }
        correctOption = ansIdx !== -1 ? ansIdx : 0;
      }
    }

    if (questionText && options.length >= 2) {
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }
      parsedQuestions.push({
        text: questionText,
        options,
        correctOption
      });
    }
  });

  return parsedQuestions;
};
