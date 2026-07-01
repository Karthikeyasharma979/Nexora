import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllTests, saveTest, getAllReports, generateInviteLink, sendEmailInvite } from '../utils/db';
import { ClipboardList, Users, AlertOctagon, Plus, Copy, Eye, EyeOff, Trash2, Edit2, Mail, X, Send, CheckCircle, Link as LinkIcon, ChevronDown, ChevronsUpDown, BarChart2, FolderPlus, Search, Check } from 'lucide-react';
import './AdminDashboard.css';
import testBcImage from '../assets/test-bc.png';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [editingTestId, setEditingTestId] = useState(null);
  const [newTestName, setNewTestName] = useState('');
  const [newTestStartTime, setNewTestStartTime] = useState('');
  const [newTestEndTime, setNewTestEndTime] = useState('');
  const [newTestDuration, setNewTestDuration] = useState(15);
  const [newTestType, setNewTestType] = useState('timed');
  const [timeMode, setTimeMode] = useState('overall');
  const [sectionDurations, setSectionDurations] = useState({});
  const [newTestRequireCamera, setNewTestRequireCamera] = useState(true);
  const [newTestRequireSEB, setNewTestRequireSEB] = useState(true);
  const [browsingToleranceMode, setBrowsingToleranceMode] = useState('custom');
  const [browsingToleranceCount, setBrowsingToleranceCount] = useState(3);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  const [makeAllQuestionsMandatory, setMakeAllQuestionsMandatory] = useState(false);
  const [watermark, setWatermark] = useState(true);
  const [allowCopyPaste, setAllowCopyPaste] = useState(false);
  const [disconnectionDuration, setDisconnectionDuration] = useState('5');
  const [showMultipleQuestionsPerPage, setShowMultipleQuestionsPerPage] = useState(false);
  const [unidirectional, setUnidirectional] = useState(false);
  const [minimumQuestionTime, setMinimumQuestionTime] = useState(false);
  const [questionsToBeAttempted, setQuestionsToBeAttempted] = useState(false);
  const [questionsToAttemptCount, setQuestionsToAttemptCount] = useState('');
  const [questions, setQuestions] = useState([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [currentSectionName, setCurrentSectionName] = useState('Section 1');
  const [selectedStep2Section, setSelectedStep2Section] = useState(null);
  const [sectionScoring, setSectionScoring] = useState({});
  const [builderMode, setBuilderMode] = useState('manual');
  const [bulkText, setBulkText] = useState('');
  const [builderStep, setBuilderStep] = useState('type-selection');

  const [testLanguage, setTestLanguage] = useState('English');
  const [testUseCase, setTestUseCase] = useState('');
  const [testInstructions, setTestInstructions] = useState('');
  const [pageRedirect, setPageRedirect] = useState('');
  const [compensatoryTime, setCompensatoryTime] = useState(false);
  const [fixedSectionOrder, setFixedSectionOrder] = useState(true);
  const [uploadAnswerImages, setUploadAnswerImages] = useState(false);
  const [showMarksInTest, setShowMarksInTest] = useState(true);
  const [isSectionSettingsOpen, setIsSectionSettingsOpen] = useState(false);

  const [currentSettingsSection, setCurrentSettingsSection] = useState('Section 1');
  const [isStep3SettingsExpanded, setIsStep3SettingsExpanded] = useState(true);
  const [isRegistrationFieldsExpanded, setIsRegistrationFieldsExpanded] = useState(true);
  const [registrationFields, setRegistrationFields] = useState([
    { id: 'email', name: 'Email Address', isEnabled: true },
    { id: 'firstName', name: 'First Name', isEnabled: true },
    { id: 'lastName', name: 'Last Name', isEnabled: false }
  ]);

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTestId, setEmailTestId] = useState('');
  const [emailTestName, setEmailTestName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailFormat, setEmailFormat] = useState('link');

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
    setBulkText('');
    alert(`Successfully extracted and imported ${newParsed.length} questions!`);
  };
  
  const [currentQuestion, setCurrentQuestion] = useState({ text: '', type: 'single', options: ['', '', '', ''], correctOption: 0, correctOptions: [0] });

  const fetchDashboardData = () => {
    getAllTests()
      .then(data => setTests(data))
      .catch(err => console.error("Error loading tests:", err));
      
    getAllReports()
      .then(data => setReports(data))
      .catch(err => console.error("Error loading reports:", err));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh when tab gains focus
    window.addEventListener('focus', fetchDashboardData);
    
    // Auto-refresh every 30 seconds to keep data fresh
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => {
      window.removeEventListener('focus', fetchDashboardData);
      clearInterval(interval);
    };
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

  const handleDeleteReport = async (id) => {
    if (window.confirm("Are you sure you want to delete this proctoring report? This action cannot be undone.")) {
      try {
        const { deleteReport } = await import('../utils/db');
        await deleteReport(id);
        const data = await getAllReports();
        setReports(data);
      } catch (err) {
        console.error("Error deleting report:", err);
        alert("Failed to delete report.");
      }
    }
  };

  const handleEditTest = (t) => {
    setEditingTestId(t.id);
    setNewTestName(t.name);
    setNewTestStartTime(t.startTime || '');
    setNewTestEndTime(t.endTime || '');
    setNewTestDuration(t.duration ? t.duration / 60 : 15);
    setNewTestType(t.type || 'timed');
    setNewTestRequireCamera(t.requireCamera ?? true);
    setNewTestRequireSEB(t.requireSEB ?? true);
    setBrowsingToleranceMode(t.browsingToleranceMode || 'custom');
    setBrowsingToleranceCount(t.browsingToleranceCount ?? 3);
    setShuffleQuestions(t.shuffleQuestions || false);
    setShuffleOptions(t.shuffleOptions || false);
    setQuestions(t.questions || []);
    setTimeMode(t.timeMode || 'overall');
    setSectionDurations(t.sectionDurations || {});
    
    // New fields
    setTestLanguage(t.language || 'English');
    setTestUseCase(t.useCase || '');
    setTestInstructions(t.testInstructions || '');
    setPageRedirect(t.pageRedirect || '');
    setCompensatoryTime(t.compensatoryTime || false);
    setFixedSectionOrder(t.fixedSectionOrder ?? true);
    setUploadAnswerImages(t.uploadAnswerImages || false);
    setShowMarksInTest(t.showMarksInTest ?? true);
    setWatermark(t.watermark ?? true);
    setAllowCopyPaste(t.allowCopyPaste || false);
    setDisconnectionDuration(t.disconnectionDuration || '5');
    
    if (t.registrationFields && t.registrationFields.length > 0) {
      setRegistrationFields(t.registrationFields);
    } else {
      setRegistrationFields([
        { id: 'email', name: 'Email Address', isEnabled: true },
        { id: 'firstName', name: 'First Name', isEnabled: true },
        { id: 'lastName', name: 'Last Name', isEnabled: false }
      ]);
    }
    
    setBuilderStep('step-1'); // skip directly to step 1 for editing
    setActiveTab('builder');
  };

  const handleCancelEdit = () => {
    setEditingTestId(null);
    setNewTestName('');
    setNewTestStartTime('');
    setNewTestEndTime('');
    setNewTestDuration(15);
    setNewTestType('timed');
    setTimeMode('overall');
    setSectionDurations({});
    setNewTestRequireCamera(true);
    setNewTestRequireSEB(true);
    setBrowsingToleranceMode('custom');
    setBrowsingToleranceCount(3);
    setShuffleQuestions(false);
    setShuffleOptions(false);
    setQuestions([]);
    
    // Reset all new fields to defaults
    setTestLanguage('English');
    setTestUseCase('');
    setTestInstructions('');
    setPageRedirect('');
    setCompensatoryTime(false);
    setFixedSectionOrder(true);
    setUploadAnswerImages(false);
    setShowMarksInTest(true);
    setWatermark(true);
    setAllowCopyPaste(false);
    setDisconnectionDuration('5');
    setRegistrationFields([
      { id: 'email', name: 'Email Address', isEnabled: true },
      { id: 'firstName', name: 'First Name', isEnabled: true },
      { id: 'lastName', name: 'Last Name', isEnabled: false }
    ]);
    
    setActiveTab('tests');
  };

  const handleCreateNewTestClick = () => {
    handleCancelEdit(); // Clears all state
    setActiveTab('builder');
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
    setCurrentQuestion({ text: '', type: 'single', options: ['', '', '', ''], correctOption: 0, correctOptions: [0] });
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
    setCurrentQuestion({ text: '', type: 'single', options: ['', '', '', ''], correctOption: 0, correctOptions: [0] });
  };

  const handleSaveTest = () => {
    if (!newTestName) {
      alert('Please provide a test name.');
      return;
    }
    if (questions.length === 0) {
      alert('Please provide at least one question for the quiz.');
      return;
    }
    
    const activeSections = Array.from(new Set(questions.map(q => q.sectionName || 'Section 1')));
    const cleanedSectionDurations = {};
    activeSections.forEach(sec => {
      cleanedSectionDurations[sec] = sectionDurations[sec] || 15;
    });

    const calculatedDuration = timeMode === 'section' 
      ? Object.values(cleanedSectionDurations).reduce((acc, curr) => acc + curr, 0) * 60
      : parseInt(newTestDuration, 10) * 60;

    const newTest = {
      id: editingTestId || ('test-' + Math.random().toString(36).substr(2, 9)),
      name: newTestName,
      startTime: newTestStartTime || null,
      endTime: newTestEndTime || null,
      duration: calculatedDuration,
      timeMode: timeMode,
      sectionDurations: cleanedSectionDurations,
      requireCamera: newTestRequireCamera,
      requireSEB: newTestRequireSEB,
      browsingToleranceMode,
      browsingToleranceCount: browsingToleranceMode === 'custom' ? browsingToleranceCount : null,
      shuffleQuestions,
      shuffleOptions,
      moduleType: 'quiz',
      questions: questions,
      language: testLanguage,
      useCase: testUseCase,
      testInstructions,
      pageRedirect,
      compensatoryTime,
      fixedSectionOrder,
      uploadAnswerImages,
      showMarksInTest,
      watermark,
      allowCopyPaste,
      disconnectionDuration,
      registrationFields,
      type: newTestType
    };
    

    if (editingTestId) {
      import('../utils/db').then(({ updateTest }) => {
        updateTest(editingTestId, newTest)
          .then(() => getAllTests())
          .then(data => {
            setTests(data);
            setEditingTestId(null);
            setNewTestName('');
            setNewTestStartTime('');
            setNewTestEndTime('');
            setNewTestDuration(15);
            setNewTestType('timed');
            setTimeMode('overall');
            setSectionDurations({});
            setNewTestRequireCamera(true);
            setNewTestRequireSEB(true);
            setBrowsingToleranceMode('custom');
            setBrowsingToleranceCount(3);
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
        setNewTestStartTime('');
        setNewTestEndTime('');
        setNewTestDuration(15);
        setNewTestType('timed');
        setTimeMode('overall');
        setSectionDurations({});
        setNewTestRequireCamera(true);
        setNewTestRequireSEB(true);
        setBrowsingToleranceMode('custom');
        setBrowsingToleranceCount(3);
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
    return `${window.location.origin}/#/pre-test/${testId}`;
  };

  const copyToClipboard = (link) => {
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  // Email Functions
  const openEmailModal = (test) => {
    setEmailTestId(test.id);
    setEmailTestName(test.name);
    setCandidateEmail('');
    setEmailError('');
    setEmailFormat('link');
    setEmailSuccess(false);
    setIsEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setIsEmailModalOpen(false);
    setCandidateEmail('');
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!candidateEmail) return;
    
    setIsSendingEmail(true);
    setEmailError('');
    
    try {
      await sendEmailInvite(emailTestId, emailTestName, candidateEmail, emailFormat);
      setEmailSuccess(true);
      setTimeout(() => closeEmailModal(), 2000);
    } catch (err) {
      console.error(err);
      setEmailError('Failed to send email. Please check your SMTP settings.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGenerateSecureLink = async (testId) => {
    const dummyEmail = prompt("Enter a candidate email to map this token to (for tracking):", "guest@example.com");
    if (!dummyEmail) return;
    try {
      const data = await generateInviteLink(testId, dummyEmail);
      const inviteLink = `${window.location.origin}/#/invite/${data.token}`;
      navigator.clipboard.writeText(inviteLink);
      alert('Link copied to clipboard!\n\nCandidates can click this link to start the test.');
    } catch(err) {
      alert('Error generating secure token.');
    }
  };

  const totalTests = tests.length;
  const activeCandidates = reports.length;
  const totalViolations = reports.reduce((acc, curr) => acc + (curr.violations?.length || 0), 0);

  // Derived filtered & sorted tests
  const filteredAndSortedTests = useMemo(() => {
    let result = [...tests];
    if (searchQuery) {
      result = result.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'duration-asc') {
      result.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    } else if (sortBy === 'duration-desc') {
      result.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }
    return result;
  }, [tests, searchQuery, sortBy]);

  return (
    <>
      <div className={activeTab === 'builder' ? "" : (activeTab === 'reports' ? "full-width-container" : "dashboard-container")}>
        <div className={activeTab === 'builder' || activeTab === 'reports' ? "" : "dashboard-content-area"}>
        {/* ... dashboard overview view ... */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-home-view fade-in">
            <div className="dashboard-header">
              <div>
                <h1>Dashboard Overview</h1>
                <p className="text-secondary">Welcome back! Here's what's happening today.</p>
              </div>
              <button className="btn-primary" onClick={() => setActiveTab('builder')}>
                <Plus size={18} /> Create New Test
              </button>
            </div>
            
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><ClipboardList size={24} /></div>
                <div className="metric-content"><p className="metric-label">Total Tests</p><h3 className="metric-value">{totalTests}</h3></div>
              </div>
              <div className="metric-card">
                <div className="metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Users size={24} /></div>
                <div className="metric-content"><p className="metric-label">Active Candidates</p><h3 className="metric-value">{activeCandidates}</h3></div>
              </div>
              <div className="metric-card">
                <div className="metric-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><AlertOctagon size={24} /></div>
                <div className="metric-content"><p className="metric-label">Violations Detected</p><h3 className="metric-value">{totalViolations}</h3></div>
              </div>
            </div>

            <div className="widgets-grid">
              <div className="content-card">
                <div className="card-header flex-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Recent Tests</h2>
                  <button className="btn-text" onClick={() => setActiveTab('tests')} style={{ color: '#0056b3', fontWeight: '600' }}>View All</button>
                </div>
                <div className="widget-card-body">
                  {tests.slice(0, 3).map(test => (
                    <div key={test.id} className="widget-list-item">
                      <div className="widget-item-info">
                        <div className="widget-item-title">{test.name}</div>
                        <div className="widget-item-subtitle">{test.questions?.length || 0} questions • {test.duration / 60} mins</div>
                      </div>
                      <div className="widget-item-action">
                        <button className="btn-primary btn-sm" onClick={() => openEmailModal(test)}><Mail size={14}/> Send</button>
                      </div>
                    </div>
                  ))}
                  {tests.length === 0 && <p className="text-secondary" style={{ padding: '15px 0' }}>No tests created yet.</p>}
                </div>
              </div>

              <div className="content-card">
                <div className="card-header flex-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Recent Candidate Activity</h2>
                  <button className="btn-text" onClick={() => setActiveTab('reports')} style={{ color: '#0056b3', fontWeight: '600' }}>View All</button>
                </div>
                <div className="widget-card-body">
                  {reports.slice(0, 3).map((candidate, idx) => (
                    <div key={candidate._id || candidate.id || idx} className="widget-list-item">
                      <div className="widget-item-info">
                        <div className="widget-item-title">{candidate.candidateName}</div>
                        <div className="widget-item-subtitle">Score: {candidate.score}</div>
                      </div>
                      <div className="widget-item-action">
                        <span className={`status-pill ${candidate.status.toLowerCase()}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
                          {candidate.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && <p className="text-secondary" style={{ padding: '15px 0' }}>No candidates have taken a test yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ... tests view ... */}
        {activeTab === 'tests' && (
          <div className="mettl-tests-view fade-in">
            <div className="mettl-subheader">
              <div className="mettl-subheader-left">
                <div className="mettl-dropdown-btn">
                  TEST NAME <ChevronDown size={14} />
                </div>
                <div className="mettl-search-bar">
                  <Search size={14} style={{ color: '#999' }} />
                  <input type="text" placeholder="Search By Test Name" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="mettl-subheader-right">
                <div className="mettl-dropdown-text">
                  Sort By <ChevronsUpDown size={14} />
                </div>
                <select 
                  className="mettl-dropdown-btn" 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ appearance: 'none', minWidth: '130px', outline: 'none' }}
                >
                  <option value="">Default</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="duration-asc">Duration (Short-Long)</option>
                  <option value="duration-desc">Duration (Long-Short)</option>
                </select>
                <button className="btn-primary" onClick={handleCreateNewTestClick} style={{ padding: '8px 16px', borderRadius: '6px' }}>
                  <Plus size={16} /> Create Test
                </button>
              </div>
            </div>

            <div className="mettl-tests-content">
              <div style={{
                backgroundImage: `url(${testBcImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'right center',
                backgroundRepeat: 'no-repeat',
                borderRadius: '8px',
                padding: '32px 40px',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '40px',
                minHeight: '130px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>Create a New</div>
                  <div style={{ color: 'white', fontSize: '32px', fontWeight: '600', letterSpacing: '0.5px' }}>Assessment</div>
                </div>
              </div>

              {filteredAndSortedTests.length === 0 ? (
                <div className="mettl-empty-state">
                  <div className="mettl-empty-icon">
                    <ClipboardList size={48} color="#8b5cf6" />
                  </div>
                  <p>{tests.length === 0 ? "No tests are available" : "No matching tests found"}</p>
                  {tests.length === 0 && (
                    <button className="btn-primary" onClick={() => setActiveTab('builder')} style={{ borderRadius: '4px', background: '#0052cc', border: 'none', padding: '8px 16px', fontWeight: '500' }}>
                      Create Test
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive mettl-table-container">
                  <table className="modern-table mettl-table">
                    <thead>
                      <tr>
                        <th style={{color: '#666', background: '#f8f9fa'}}>Test Name</th>
                        <th style={{color: '#666', background: '#f8f9fa'}}>Duration</th>
                        <th style={{color: '#666', background: '#f8f9fa'}}>Questions</th>
                        <th style={{color: '#666', background: '#f8f9fa'}}>Share (Secure)</th>
                        <th style={{color: '#666', background: '#f8f9fa'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedTests.map(test => (
                        <tr key={test.id} style={{background: 'white'}}>
                          <td className="font-medium" style={{color: '#333'}}>{test.name}</td>
                          <td><span className="duration-pill" style={{color: '#333', background: '#f1f5f9'}}>{test.duration / 60} mins</span></td>
                          <td><span style={{color: '#333'}}>{test.questions?.length || 0} Qs</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn-action email-btn" onClick={() => openEmailModal(test)} title="Email Secure Link" style={{color: '#0052cc', background: 'transparent', border: '1px solid #0052cc', padding: '4px 8px', borderRadius: '4px'}}>
                                <Mail size={16} /> Email
                              </button>
                              <button className="btn-action token-btn" onClick={() => handleGenerateSecureLink(test.id)} title="Generate Token Link" style={{color: '#0052cc', background: 'transparent', border: '1px solid #0052cc', padding: '4px 8px', borderRadius: '4px'}}>
                                <Copy size={16} /> Token
                              </button>
                              <button className="btn-action token-btn" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px' }} onClick={() => copyToClipboard(getTestLink(test.id))} title="Copy Direct Link">
                                <LinkIcon size={16} /> Direct Link
                              </button>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="icon-btn-action" style={{ color: '#0052cc', background: 'transparent' }} onClick={() => handleEditTest(test)} title="Edit Test"><Edit2 size={16} /></button>
                              <button className="icon-btn-action" style={{ color: '#ef4444', background: 'transparent' }} onClick={() => handleDeleteTest(test.id)} title="Delete Test"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ... reports view ... */}
        {activeTab === 'reports' && (
          <div className="content-card fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Proctoring Reports</h2>
                <p className="text-secondary">Review candidate scores and proctoring violations.</p>
              </div>
              <button 
                className="btn-danger" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete ALL proctoring reports? This action cannot be undone.")) {
                    try {
                      const { clearAllReports } = await import('../utils/db');
                      await clearAllReports();
                      const { getAllReports } = await import('../utils/db');
                      const data = await getAllReports();
                      setReports(data);
                    } catch (err) {
                      console.error("Error deleting all reports:", err);
                      alert("Failed to delete all reports.");
                    }
                  }
                }}
              >
                <Trash2 size={16} /> Delete All Reports
              </button>
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
                        <td><span className={`status-pill ${candidate.status.toLowerCase()}`}>{candidate.status}</span></td>
                        <td className="font-semibold">{candidate.score}</td>
                        <td>
                          {candidate.violations.length > 0 ? (
                            <span className="violation-pill text-danger"><AlertOctagon size={14} /> {candidate.violations.length} Violations</span>
                          ) : (
                            <span className="violation-pill text-success">Clean</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button className="btn-text" onClick={() => setExpandedCandidate(expandedCandidate === (candidate._id || candidate.id || idx) ? null : (candidate._id || candidate.id || idx))}>
                              {expandedCandidate === (candidate._id || candidate.id || idx) ? <><EyeOff size={16} /> Hide Logs</> : <><Eye size={16} /> View Logs</>}
                            </button>
                            <button className="icon-btn-action" style={{ color: '#ef4444' }} onClick={() => handleDeleteReport(candidate._id || candidate.id)} title="Delete Report">
                              <Trash2 size={16} />
                            </button>
                          </div>
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

        {/* ... builder view (same logic just styled better if needed) ... */}
        
        {/* --- WIZARD BUILDER VIEW --- */}
        {activeTab === 'builder' && (
          <div className="wizard-container fade-in">
            
            {/* STEP 0: TYPE SELECTION */}
            {builderStep === 'type-selection' && (
              <div className="wizard-step-type-selection" style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>
                <h2 style={{ color: '#0f172a', fontWeight: '600', fontSize: '1.5rem', marginBottom: '24px' }}>What kind of test you wish to create?</h2>
                
                <div className="wizard-type-cards" style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
                  
                  <div className={`wizard-type-card ${newTestType === 'timed' ? 'active' : ''}`} onClick={() => setNewTestType('timed')} style={{ flex: '1', border: newTestType === 'timed' ? '2px solid #0052cc' : '1px solid #e2e8f0', borderRadius: '8px', padding: '32px 24px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: newTestType === 'timed' ? '#f8fafc' : 'white' }}>
                    <div style={{ position: 'absolute', top: '16px', left: '16px', color: newTestType === 'timed' ? '#0052cc' : '#cbd5e1' }}>
                      {newTestType === 'timed' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>
                      )}
                    </div>
                    <div style={{ fontSize: '3rem', color: '#0ea5e9', marginBottom: '16px' }}>⏱️</div>
                    <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: '12px' }}>Timed</h3>
                    <p style={{ color: newTestType === 'timed' ? '#0052cc' : '#64748b', fontSize: '0.9rem' }}>Test with a defined duration.</p>
                  </div>

                  <div className={`wizard-type-card ${newTestType === 'deadline' ? 'active' : ''}`} onClick={() => setNewTestType('deadline')} style={{ flex: '1', border: newTestType === 'deadline' ? '2px solid #0052cc' : '1px solid #e2e8f0', borderRadius: '8px', padding: '32px 24px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: newTestType === 'deadline' ? '#f8fafc' : 'white' }}>
                    <div style={{ position: 'absolute', top: '16px', left: '16px', color: newTestType === 'deadline' ? '#0052cc' : '#cbd5e1' }}>
                      {newTestType === 'deadline' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>
                      )}
                    </div>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
                    <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: '12px' }}>Deadline Based</h3>
                    <p style={{ color: newTestType === 'deadline' ? '#0052cc' : '#64748b', fontSize: '0.9rem' }}>Test with a submission deadline.</p>
                  </div>

                  <div className={`wizard-type-card ${newTestType === 'practice' ? 'active' : ''}`} onClick={() => setNewTestType('practice')} style={{ flex: '1', border: newTestType === 'practice' ? '2px solid #0052cc' : '1px solid #e2e8f0', borderRadius: '8px', padding: '32px 24px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: newTestType === 'practice' ? '#f8fafc' : 'white' }}>
                    <div style={{ position: 'absolute', top: '16px', left: '16px', color: newTestType === 'practice' ? '#0052cc' : '#cbd5e1' }}>
                      {newTestType === 'practice' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>
                      )}
                    </div>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💻</div>
                    <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: '12px' }}>Practice</h3>
                    <p style={{ color: newTestType === 'practice' ? '#0052cc' : '#64748b', fontSize: '0.9rem' }}>Test to familiarize with the test-taking interface. Reports will not be generated.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" style={{ color: '#0052cc !important', border: '1px solid #0052cc !important', background: 'white !important', padding: '10px 32px !important', borderRadius: '4px !important', fontSize: '1.1rem !important' }} onClick={() => setBuilderStep('initial-details')}>Proceed</button>
                </div>
              </div>
            )}

            {/* STEP 0.5: INITIAL DETAILS */}
            {builderStep === 'initial-details' && (
              <div className="wizard-step-initial-details" style={{ maxWidth: '800px', margin: '40px auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', overflow: 'hidden' }}>
                <div style={{ backgroundImage: `url(${testBcImage})`, backgroundSize: 'cover', backgroundPosition: 'right center', padding: '40px 32px', color: 'white', position: 'relative' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '8px', opacity: '0.9', position: 'relative', zIndex: 2 }}>Create a New</div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: '600', margin: '0', position: 'relative', zIndex: 2, letterSpacing: '0.5px' }}>Assessment</h2>
                </div>
                
                <div style={{ padding: '32px' }}>
                  <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: '8px' }}>What kind of test you wish to create?</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Start with the key details about your test</p>

                  <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ flex: '1' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>Test Name <span style={{color: '#ef4444'}}>*</span></label>
                      <input type="text" className="modern-input" placeholder="Enter Test Name" value={newTestName} onChange={(e) => setNewTestName(e.target.value)} style={{ padding: '12px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ flex: '1' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>Time Duration (mins) <span style={{color: '#ef4444'}}>*</span></label>
                      <input type="number" min="1" className="modern-input" placeholder="e.g. 60" value={newTestDuration === '' ? '' : newTestDuration} onChange={(e) => { const val = e.target.value; setNewTestDuration(val === '' ? '' : Math.max(1, parseInt(val, 10))); }} style={{ padding: '12px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-primary" style={{ background: '#0052cc !important', color: 'white !important', borderRadius: '4px !important', padding: '10px 32px !important' }} onClick={() => { if(!newTestName) { alert('Test Name is required'); return; } setBuilderStep('step-1'); }}>Proceed</button>
                  </div>
                </div>
              </div>
            )}

            {/* MAIN WIZARD INTERFACE (STEPS 1-4) */}
            {builderStep.startsWith('step-') && (
              <div className="wizard-main-interface" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f5f7' }}>
                
                {/* WIZARD TOP BAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => setBuilderStep('initial-details')} style={{ background: 'transparent', border: 'none', color: '#0052cc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                      Back
                    </button>
                    <h2 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {newTestName || 'Untitled Test'} <Edit2 size={14} color="#64748b" style={{cursor: 'pointer'}} />
                    </h2>
                    <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>Draft</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      Test Duration: 
                      {timeMode === 'section' ? (
                        <span style={{ fontWeight: '600', padding: '0 8px', color: '#0f172a' }}>{Object.values(sectionDurations || {}).reduce((a, b) => a + b, 0)}</span>
                      ) : (
                        <input type="number" value={newTestDuration} onChange={e => setNewTestDuration(e.target.value)} style={{ width: '50px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', marginLeft: '6px', marginRight: '6px' }} />
                      )}
                      min
                    </div>
                    <button style={{ background: 'white', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }} onClick={handleSaveTest}>Save as Draft</button>
                    <button style={{ background: '#0052cc', border: 'none', color: 'white', padding: '6px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => {
                      if(builderStep === 'step-1') setBuilderStep('step-2');
                      else if(builderStep === 'step-2') setBuilderStep('step-3');
                      else if(builderStep === 'step-3') setBuilderStep('step-4');
                      else if(builderStep === 'step-4') handleSaveTest();
                    }}>
                      {builderStep === 'step-4' ? 'Publish' : 'Next'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                </div>

                {/* STEPPER */}
                <div style={{ background: 'white', padding: '0 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '32px' }}>
                  {['Add Questions', 'Structure your test', 'Test Settings', 'Finalize'].map((stepName, idx) => {
                    const stepNum = idx + 1;
                    const isActive = builderStep === `step-${stepNum}`;
                    const isCompleted = parseInt(builderStep.split('-')[1]) > stepNum;
                    return (
                      <div key={stepNum} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0', position: 'relative', cursor: 'pointer' }} onClick={() => setBuilderStep(`step-${stepNum}`)}>
                        <div style={{ 
                          width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold',
                          background: isCompleted ? '#10b981' : (isActive ? '#0052cc' : '#f1f5f9'),
                          color: (isActive || isCompleted) ? 'white' : '#94a3b8'
                        }}>
                          {isCompleted ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg> : stepNum}
                        </div>
                        <span style={{ color: isActive ? '#0052cc' : (isCompleted ? '#0f172a' : '#94a3b8'), fontWeight: isActive ? '600' : '400', fontSize: '0.9rem' }}>{stepName}</span>
                        {idx < 3 && <div style={{ position: 'absolute', right: '-24px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></div>}
                      </div>
                    );
                  })}
                </div>

                {/* CONTENT AREA */}
                <div style={{ flex: '1', display: 'flex', overflow: 'hidden' }}>
                  
                  {/* STEP 1: SELECT CONTENT */}
                  {builderStep === 'step-1' && (
                    <>


                      {/* Right Main Area */}
                      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                          <button 
                            className={`builder-mode-tab ${builderMode === 'manual' ? 'active' : ''}`} 
                            onClick={() => setBuilderMode('manual')} 
                            style={{ 
                              flex: 1, 
                              padding: '16px', 
                              background: 'white', 
                              border: '1px solid #e2e8f0', 
                              borderBottom: builderMode === 'manual' ? '3px solid #0052cc' : '1px solid #e2e8f0', 
                              borderRadius: '8px', 
                              fontWeight: '600', 
                              color: builderMode === 'manual' ? '#0052cc' : '#64748b', 
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                            Manual Entry
                          </button>
                          <button 
                            className={`builder-mode-tab ${builderMode === 'bulk' ? 'active' : ''}`} 
                            onClick={() => setBuilderMode('bulk')} 
                            style={{ 
                              flex: 1, 
                              padding: '16px', 
                              background: 'white', 
                              border: '1px solid #e2e8f0', 
                              borderBottom: builderMode === 'bulk' ? '3px solid #0052cc' : '1px solid #e2e8f0', 
                              borderRadius: '8px', 
                              fontWeight: '600', 
                              color: builderMode === 'bulk' ? '#0052cc' : '#64748b', 
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                            Bulk Import AI
                          </button>
                        </div>
                        <div style={{ marginBottom: '32px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
                            {builderMode === 'manual' ? (
                              <div className="manual-entry-section fade-in">
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>Question Type</label>
                                  <select className="modern-input" value={currentQuestion.type || 'single'} onChange={e => setCurrentQuestion({...currentQuestion, type: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                                    <option value="single">Single Choice</option>
                                    <option value="multiple">Multiple Choice</option>
                                  </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>Question Text</label>
                                  <input type="text" className="modern-input" value={currentQuestion.text} onChange={e => setCurrentQuestion({...currentQuestion, text: e.target.value})} placeholder="What is the capital of France?" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                </div>
                                <div className="options-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                  {currentQuestion.options.map((opt, idx) => (
                                    <div key={idx} className="form-group">
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: '#334155' }}>
                                        {(!currentQuestion.type || currentQuestion.type === 'single') ? (
                                          <input type="radio" name="correctOpt" checked={currentQuestion.correctOption === idx} onChange={() => setCurrentQuestion({...currentQuestion, correctOption: idx})} />
                                        ) : (
                                          <input type="checkbox" checked={currentQuestion.correctOptions?.includes(idx)} onChange={(e) => {
                                            const opts = currentQuestion.correctOptions || [];
                                            const newOpts = e.target.checked ? [...opts, idx] : opts.filter(o => o !== idx);
                                            setCurrentQuestion({...currentQuestion, correctOptions: newOpts});
                                          }} />
                                        )}
                                        Option {String.fromCharCode(65 + idx)}
                                      </label>
                                      <input type="text" className="modern-input" value={opt} onChange={e => {
                                        const newOpts = [...currentQuestion.options];
                                        newOpts[idx] = e.target.value;
                                        setCurrentQuestion({...currentQuestion, options: newOpts});
                                      }} placeholder={`Option ${String.fromCharCode(65 + idx)}`} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                    </div>
                                  ))}
                                </div>
                                <div className="form-group" style={{ marginBottom: '24px' }}>
                                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>Section Name</label>
                                  <input type="text" className="modern-input" value={currentSectionName} onChange={e => setCurrentSectionName(e.target.value)} placeholder="e.g. General Aptitude" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                </div>
                                <button className="btn-primary" onClick={handleAddQuestion} style={{ background: '#0052cc !important', color: 'white !important', padding: '10px 24px !important', borderRadius: '4px !important' }}>
                                  {editingQuestionIndex !== null ? 'Update Question' : 'Add Question'} <Plus size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="bulk-paste-section fade-in">
                                <div className="bulk-paste-inner">
                                  <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>Section Name</label>
                                    <input type="text" className="modern-input" value={currentSectionName} onChange={e => setCurrentSectionName(e.target.value)} placeholder="e.g. General Aptitude" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label style={{ color: '#334155', display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem' }}>Paste Questions & Answers Here</label>
                                    <textarea className="modern-input" rows="10" value={bulkText} onChange={e => setBulkText(e.target.value)} style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px' }} placeholder={"Example:\n1. What is React?\nA) A library\nB) A framework\nC) A database\nD) A language\nAnswer: A"} />
                                  </div>
                                  <div>
                                    <button type="button" className="btn-primary" onClick={handleBulkParse} style={{ background: '#0052cc !important', color: 'white !important', padding: '10px 24px !important', borderRadius: '4px !important' }}>Extract & Import Questions</button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                        {questions.length === 0 ? null : (
                          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#0f172a' }}>Questions ({questions.length})</h3>
                            <div className="questions-list">
                              {questions.map((q, idx) => (
                                <div key={idx} className="question-card" style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', background: '#f8fafc' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a' }}>Q{idx + 1}. {q.text}</h4>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button className="icon-btn-action" onClick={() => { setEditingQuestionIndex(idx); setCurrentQuestion(q); setCurrentSectionName(q.sectionName || 'Section 1'); setBuilderMode('manual'); }} style={{ color: '#0052cc', background: 'transparent' }}><Edit2 size={16} /></button>
                                      <button className="icon-btn-action" onClick={() => handleDeleteQuestion(idx)} style={{ color: '#ef4444', background: 'transparent' }}><Trash2 size={16} /></button>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {q.options.map((opt, oIdx) => {
                                      const isCorrect = (!q.type || q.type === 'single') ? (oIdx === q.correctOption) : (q.correctOptions?.includes(oIdx));
                                      return (
                                        <div key={oIdx} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: isCorrect ? '#dcfce3' : 'white', border: '1px solid #e2e8f0', borderRadius: '4px', color: isCorrect ? '#166534' : '#334155' }}>
                                          {String.fromCharCode(65 + oIdx)}. {opt} {isCorrect && <Check size={14} style={{marginLeft: '8px'}}/>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>Section: <strong>{q.sectionName || 'Section 1'}</strong></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* STEP 2: STRUCTURE YOUR TEST */}
                  {builderStep === 'step-2' && (() => {
                    const uniqueSections = Array.from(new Set(questions.map(q => q.sectionName || 'Section 1')));
                    const activeSection = selectedStep2Section || uniqueSections[0];
                    const activeQuestions = questions.filter(q => (q.sectionName || 'Section 1') === activeSection);
                    
                    return (
                    <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#0f172a' }}>Test Structure</h3>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Organize sections and configure timing for each.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <label style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '600' }}>Time Mode:</label>
                          <select className="modern-input" value={timeMode} onChange={e => setTimeMode(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <option value="overall">Overall Test Time</option>
                            <option value="section">Per-Section Time</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
                      {/* Left Sidebar */}
                      <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                        {uniqueSections.map((sec, idx) => {
                          const secQuestions = questions.filter(q => (q.sectionName || 'Section 1') === sec);
                          const isSelected = activeSection === sec;
                          return (
                            <div key={idx} onClick={() => setSelectedStep2Section(sec)} style={{ background: isSelected ? '#f8fafc' : 'white', border: isSelected ? '1px solid #0052cc' : '1px solid #e2e8f0', borderLeft: isSelected ? '4px solid #0052cc' : '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', cursor: 'pointer' }}>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.5px' }}>SECTION {idx + 1}</div>
                              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {sec} 
                                <span onClick={(e) => {
                                  e.stopPropagation();
                                  const newName = window.prompt("Enter new section name:", sec);
                                  if (newName && newName.trim() !== "" && newName !== sec) {
                                    const updatedName = newName.trim();
                                    const updated = questions.map(q => (q.sectionName || 'Section 1') === sec ? { ...q, sectionName: updatedName } : q);
                                    setQuestions(updated);
                                    if (activeSection === sec) setSelectedStep2Section(updatedName);
                                    if (sectionScoring[sec]) setSectionScoring(prev => { const n = {...prev}; n[updatedName] = n[sec]; delete n[sec]; return n; });
                                    if (sectionDurations[sec]) setSectionDurations(prev => { const n = {...prev}; n[updatedName] = n[sec]; delete n[sec]; return n; });
                                  }
                                }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                  <Edit2 size={14} color="#0052cc" />
                                </span>
                              </h4>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span>{secQuestions.length} Qs</span>
                                <span>• 1 Skill</span>
                                <span>• {secQuestions.length * (sectionScoring[sec]?.positive !== undefined ? sectionScoring[sec].positive : 1)} Marks</span>
                                <span>• {timeMode === 'section' && sectionDurations[sec] ? `${sectionDurations[sec]} Min` : 'No Time Set'}</span>
                              </div>
                              <button style={{ background: 'transparent', border: 'none', color: '#0052cc', padding: '0', marginTop: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setCurrentSettingsSection(sec); setIsSectionSettingsOpen(true); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                                Add Section Instructions
                              </button>
                            </div>
                          );
                        })}
                        {uniqueSections.length === 0 && (
                          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>Please add questions in Step 1 to see sections here.</div>
                        )}
                      </div>

                      {/* Right Main Area */}
                      <div style={{ flex: 1, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.9rem' }}>
                          Organize skills/questions in sections and define order and scoring
                        </div>
                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                          {activeQuestions.length > 0 ? (
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                              <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#0f172a' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                                  MCQ
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.8rem', color: '#334155', flexWrap: 'wrap' }}>
                                  {timeMode === 'section' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontWeight: '500' }}>Duration (min):</span>
                                      <input type="number" min="1" value={sectionDurations[activeSection] || ''} onChange={e => setSectionDurations({...sectionDurations, [activeSection]: parseInt(e.target.value) || 0})} style={{ width: '50px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }} />
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: '500' }}>Positive:</span>
                                    <input type="number" step="0.01" value={sectionScoring[activeSection]?.positive !== undefined ? sectionScoring[activeSection].positive : 1} onChange={e => setSectionScoring({...sectionScoring, [activeSection]: {...(sectionScoring[activeSection] || {}), positive: parseFloat(e.target.value) || 0}})} style={{ width: '60px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }} />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: '500' }}>Negative:</span>
                                    <input type="number" step="0.01" value={sectionScoring[activeSection]?.negative !== undefined ? sectionScoring[activeSection].negative : -0.25} onChange={e => setSectionScoring({...sectionScoring, [activeSection]: {...(sectionScoring[activeSection] || {}), negative: parseFloat(e.target.value) || 0}})} style={{ width: '60px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }} />
                                  </div>
                                </div>
                              </div>
                              <div style={{ padding: '0', background: '#ffffff' }}>
                                {activeQuestions.map((q, idx) => (
                                  <div key={idx} style={{ padding: '16px 24px', borderBottom: idx < activeQuestions.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                    <div style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500', width: '28px' }}>{idx + 1}.</div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ color: '#0f172a', fontSize: '1.15rem', marginBottom: '12px', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: q.text || '<em>Empty question</em>' }}></div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {q.options.map((opt, oIdx) => {
                                          const isCorrect = (!q.type || q.type === 'single') ? (oIdx === q.correctOption) : (q.correctOptions?.includes(oIdx));
                                          return (
                                            <div key={oIdx} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '1rem', color: isCorrect ? '#15803d' : '#334155', background: isCorrect ? '#f0fdf4' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              {isCorrect && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                              <span style={{ lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: opt || '<em>Empty option</em>' }}></span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', color: '#64748b', marginLeft: '16px' }}>
                                      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0052cc' }} onClick={() => {
                                          const globalIdx = questions.indexOf(q);
                                          if (globalIdx !== -1) {
                                            setEditingQuestionIndex(globalIdx);
                                            setCurrentQuestion(q);
                                            setCurrentSectionName(q.sectionName || 'Section 1');
                                            setBuilderMode('manual');
                                            setBuilderStep('step-1');
                                          }
                                        }} title="Edit Question">
                                        <Edit2 size={16} />
                                      </div>
                                      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }} onClick={() => {
                                          const globalIdx = questions.indexOf(q);
                                          if (globalIdx !== -1) {
                                            handleDeleteQuestion(globalIdx);
                                          }
                                        }} title="Delete Question">
                                        <Trash2 size={16} />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>1 Skills Selected</div>
                          <div style={{ display: 'flex', gap: '16px', color: '#0f172a', fontWeight: '500', fontSize: '0.95rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ef4444' }} onClick={() => {
                              if (window.confirm(`Are you sure you want to delete the section "${activeSection}" and ALL its ${activeQuestions.length} questions?`)) {
                                const updated = questions.filter(q => (q.sectionName || 'Section 1') !== activeSection);
                                setQuestions(updated);
                                const remainingSections = [...new Set(updated.map(q => q.sectionName || 'Section 1'))];
                                setSelectedStep2Section(remainingSections.length > 0 ? remainingSections[0] : null);
                                setSectionScoring(prev => { const n = {...prev}; delete n[activeSection]; return n; });
                                setSectionDurations(prev => { const n = {...prev}; delete n[activeSection]; return n; });
                              }
                            }}><Trash2 size={16} /> Delete Section</span>
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                    );
                  })()}

                  {/* STEP 3: TEST SETTINGS */}
                  {builderStep === 'step-3' && (
                    <div style={{ flex: 1, padding: '32px 64px', overflowY: 'auto' }}>
                      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '32px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px' }}>Test Taker Registration Fields</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                Define the registration fields to be filled by the test taker
                            </p>
                          </div>
                          <div onClick={() => setIsRegistrationFieldsExpanded(!isRegistrationFieldsExpanded)} style={{ color: '#0052cc', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isRegistrationFieldsExpanded ? 'Hide Settings' : 'View Settings'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isRegistrationFieldsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="18 15 12 9 6 15"></polyline></svg>
                          </div>
                        </div>

                        {isRegistrationFieldsExpanded && (
                            <div>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
                                    Please make sure that the fields marked as verify on this screen are available in Candidate registration field settings(Global Settings). The system will not allow the test-taker to proceed with the test if you mark a field as verify on this screen while it is not present in individual test-taker data and it has been deleted in the candidate registration field settings (global settings). <a href="#" style={{ color: '#0052cc', textDecoration: 'none' }}>CRF Settings</a>
                                </p>
                                
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                                        <div style={{ flex: 1 }}>Name</div>
                                        <div style={{ width: '200px', textAlign: 'right' }}>Actions</div>
                                    </div>
                                    {registrationFields.map((field, idx) => (
                                        <div key={field.id} style={{ display: 'flex', padding: '16px', borderBottom: idx < registrationFields.length - 1 ? '1px solid #e2e8f0' : 'none', alignItems: 'center' }}>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', color: '#334155' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                                                {field.name}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ padding: '4px 12px', background: '#f8fafc', color: '#cbd5e1', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>Mandatory</div>
                                                <div style={{ padding: '4px 12px', background: '#f8fafc', color: '#cbd5e1', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500' }}>Verify</div>
                                                <button type="button" role="switch" onClick={() => {
                                                    const newFields = [...registrationFields];
                                                    newFields[idx].isEnabled = !newFields[idx].isEnabled;
                                                    setRegistrationFields(newFields);
                                                }} style={{ position: 'relative', display: 'inline-flex', height: '24px', width: '44px', alignItems: 'center', borderRadius: '9999px', backgroundColor: field.isEnabled ? '#818cf8' : '#e2e8f0', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out' }}>
                                                    <span style={{ display: 'inline-block', height: '18px', width: '18px', borderRadius: '9999px', backgroundColor: 'white', transform: field.isEnabled ? 'translateX(22px)' : 'translateX(3px)', transition: 'transform 0.2s ease-in-out', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                      </div>

                      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                          <div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px' }}>Test Taker Instructions & Actions</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Define setting for test takers actions</p>
                          </div>
                          <div onClick={() => setIsStep3SettingsExpanded(!isStep3SettingsExpanded)} style={{ color: '#0052cc', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isStep3SettingsExpanded ? 'Hide Settings' : 'View Settings'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isStep3SettingsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="18 15 12 9 6 15"></polyline></svg>
                          </div>
                        </div>

                        {isStep3SettingsExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Test Window</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Define the date and time range during which test takers can start the test.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Start Time</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', paddingRight: '8px' }}>
                                  <input type="datetime-local" className="modern-input" value={newTestStartTime} onChange={e => setNewTestStartTime(e.target.value)} style={{ padding: '8px 12px', border: 'none', background: 'transparent', outline: 'none', flex: 1, cursor: 'pointer' }} onClick={(e) => e.target.showPicker && e.target.showPicker()} />
                                  {newTestStartTime && <X size={16} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setNewTestStartTime('')} />}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>End Time</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white', paddingRight: '8px' }}>
                                  <input type="datetime-local" className="modern-input" value={newTestEndTime} onChange={e => setNewTestEndTime(e.target.value)} style={{ padding: '8px 12px', border: 'none', background: 'transparent', outline: 'none', flex: 1, cursor: 'pointer' }} onClick={(e) => e.target.showPicker && e.target.showPicker()} />
                                  {newTestEndTime && <X size={16} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setNewTestEndTime('')} />}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Test Instructions</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Show instructions before test start</p>
                            </div>
                            <div style={{ flex: 1 }}>
                              <input type="text" className="modern-input" placeholder="Custom message (optional)" value={testInstructions} onChange={e => setTestInstructions(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Page Re-direct</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Re-direct Test Takers after test finish</p>
                            </div>
                            <div style={{ flex: 1 }}>
                              <input type="text" className="modern-input" placeholder="https://example.com" value={pageRedirect} onChange={e => setPageRedirect(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>Compensatory Test time ⓘ</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Enable Compensatory test time</p>
                            </div>
                            <div>
                              <button type="button" role="switch" aria-checked={compensatoryTime} onClick={() => setCompensatoryTime(!compensatoryTime)} style={{ position: 'relative', display: 'inline-flex', height: '24px', width: '44px', alignItems: 'center', borderRadius: '9999px', backgroundColor: compensatoryTime ? '#22c55e' : '#cbd5e1', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out' }}>
                                <span style={{ display: 'inline-block', height: '18px', width: '18px', borderRadius: '9999px', backgroundColor: 'white', transform: compensatoryTime ? 'translateX(22px)' : 'translateX(3px)', transition: 'transform 0.2s ease-in-out', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Section Order for Test Takers</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Fixed Section Order for Test Takers</p>
                            </div>
                            <div>
                              <button type="button" role="switch" aria-checked={fixedSectionOrder} onClick={() => setFixedSectionOrder(!fixedSectionOrder)} style={{ position: 'relative', display: 'inline-flex', height: '24px', width: '44px', alignItems: 'center', borderRadius: '9999px', backgroundColor: fixedSectionOrder ? '#22c55e' : '#cbd5e1', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out' }}>
                                <span style={{ display: 'inline-block', height: '18px', width: '18px', borderRadius: '9999px', backgroundColor: 'white', transform: fixedSectionOrder ? 'translateX(22px)' : 'translateX(3px)', transition: 'transform 0.2s ease-in-out', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Marks in Test</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Show Marks in Test</p>
                            </div>
                            <div>
                              <button type="button" role="switch" aria-checked={showMarksInTest} onClick={() => setShowMarksInTest(!showMarksInTest)} style={{ position: 'relative', display: 'inline-flex', height: '24px', width: '44px', alignItems: 'center', borderRadius: '9999px', backgroundColor: showMarksInTest ? '#22c55e' : '#cbd5e1', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out' }}>
                                <span style={{ display: 'inline-block', height: '18px', width: '18px', borderRadius: '9999px', backgroundColor: 'white', transform: showMarksInTest ? 'translateX(22px)' : 'translateX(3px)', transition: 'transform 0.2s ease-in-out', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Webcam & Audio Proctoring</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Enable webcam and audio monitoring during the test</p>
                            </div>
                            <div>
                              <button type="button" role="switch" aria-checked={newTestRequireCamera} onClick={() => setNewTestRequireCamera(!newTestRequireCamera)} style={{ position: 'relative', display: 'inline-flex', height: '24px', width: '44px', alignItems: 'center', borderRadius: '9999px', backgroundColor: newTestRequireCamera ? '#22c55e' : '#cbd5e1', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out' }}>
                                <span style={{ display: 'inline-block', height: '18px', width: '18px', borderRadius: '9999px', backgroundColor: 'white', transform: newTestRequireCamera ? 'translateX(22px)' : 'translateX(3px)', transition: 'transform 0.2s ease-in-out', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Secure Browser / Lock Down</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Force test takers to use full screen secure browser environment</p>
                            </div>
                            <div>
                              <button type="button" role="switch" aria-checked={newTestRequireSEB} onClick={() => setNewTestRequireSEB(!newTestRequireSEB)} style={{ position: 'relative', display: 'inline-flex', height: '24px', width: '44px', alignItems: 'center', borderRadius: '9999px', backgroundColor: newTestRequireSEB ? '#22c55e' : '#cbd5e1', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out' }}>
                                <span style={{ display: 'inline-block', height: '18px', width: '18px', borderRadius: '9999px', backgroundColor: 'white', transform: newTestRequireSEB ? 'translateX(22px)' : 'translateX(3px)', transition: 'transform 0.2s ease-in-out', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Watermark</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Show a unique ID in the background to prevent cheating via images.</p>
                            </div>
                            <div>
                              <button type="button" role="switch" aria-checked={watermark} onClick={() => setWatermark(!watermark)} style={{ position: 'relative', display: 'inline-flex', height: '24px', width: '44px', alignItems: 'center', borderRadius: '9999px', backgroundColor: watermark ? '#22c55e' : '#cbd5e1', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out' }}>
                                <span style={{ display: 'inline-block', height: '18px', width: '18px', borderRadius: '9999px', backgroundColor: 'white', transform: watermark ? 'translateX(22px)' : 'translateX(3px)', transition: 'transform 0.2s ease-in-out', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Copy Paste Action</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Allow copy/paste on or from the test window.</p>
                            </div>
                            <div>
                              <button type="button" role="switch" aria-checked={allowCopyPaste} onClick={() => setAllowCopyPaste(!allowCopyPaste)} style={{ position: 'relative', display: 'inline-flex', height: '24px', width: '44px', alignItems: 'center', borderRadius: '9999px', backgroundColor: allowCopyPaste ? '#22c55e' : '#cbd5e1', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease-in-out' }}>
                                <span style={{ display: 'inline-block', height: '18px', width: '18px', borderRadius: '9999px', backgroundColor: 'white', transform: allowCopyPaste ? 'translateX(22px)' : 'translateX(3px)', transition: 'transform 0.2s ease-in-out', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Disconnection Duration</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Stop the test after a certain duration of internet disconnection.</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="number" className="modern-input" value={disconnectionDuration} onChange={e => setDisconnectionDuration(e.target.value)} style={{ width: '80px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} min="1" max="60" />
                              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>mins</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>Browsing Tolerance</h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Action to take when a candidate navigates away from the test window.</p>
                            </div>
                            <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
                              <select className="modern-input" value={browsingToleranceMode} onChange={e => setBrowsingToleranceMode(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1 }}>
                                <option value="strict">Strict (Auto-submit on first violation)</option>
                                <option value="custom">Custom (Allow X warnings)</option>
                                <option value="lenient">Lenient (Warn only, do not submit)</option>
                              </select>
                              {browsingToleranceMode === 'custom' && (
                                <input type="number" min="1" max="10" className="modern-input" value={browsingToleranceCount} onChange={e => setBrowsingToleranceCount(parseInt(e.target.value))} style={{ width: '80px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} title="Warnings allowed" />
                              )}
                            </div>
                          </div>

                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 4: FINALIZE */}
                  {builderStep === 'step-4' && (
                    <div style={{ flex: 1, padding: '32px 64px', overflowY: 'auto' }}>
                      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '32px', marginBottom: '40px' }}>
                        
                        {/* Top Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>TEST NAME</div>
                            <div style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {newTestName || 'Untitled Test'}
                              <Edit2 size={14} color="#64748b" style={{cursor: 'pointer'}} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>TEST DURATION</div>
                            <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500' }}>
                              {timeMode === 'overall' ? `${Math.floor(newTestDuration / 60)} hr ${newTestDuration % 60} min` : `${Math.floor(Object.values(sectionDurations).reduce((a,b)=>a+b,0) / 60)} hr ${Object.values(sectionDurations).reduce((a,b)=>a+b,0) % 60} min`}
                            </div>
                          </div>
                          <div>
                            <button style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#0052cc', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              Preview
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </button>
                          </div>
                        </div>

                        {/* Overall Summary */}
                        <div style={{ marginBottom: '32px' }}>
                          <h3 style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: '400', margin: '0 0 16px 0' }}>Overall Summary</h3>
                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '32px', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                            <div>
                              <div style={{ fontSize: '2.5rem', fontWeight: '300', color: '#0f172a', marginBottom: '8px' }}>{Array.from(new Set(questions.map(q => q.sectionName || 'Section 1'))).length}</div>
                              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Sections</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '2.5rem', fontWeight: '300', color: '#0f172a', marginBottom: '8px' }}>1</div>
                              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>skills</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '2.5rem', fontWeight: '300', color: '#0f172a', marginBottom: '8px' }}>{questions.length}</div>
                              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Questions</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '2.5rem', fontWeight: '300', color: '#0f172a', marginBottom: '8px' }}>{questions.reduce((sum, q) => sum + (q.points || 1), 0)}</div>
                              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Marks</div>
                            </div>
                          </div>
                        </div>

                        {/* Section Details */}
                        <div>
                          <h3 style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: '400', margin: '0 0 16px 0' }}>Section Details</h3>
                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                            {Array.from(new Set(questions.map(q => q.sectionName || 'Section 1'))).map((sec, idx) => {
                              const secQuestions = questions.filter(q => (q.sectionName || 'Section 1') === sec);
                              const secMarks = secQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
                              return (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', marginBottom: '8px', borderRadius: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                                    <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '500' }}>{sec}</span>
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span>Section Time : {sectionDurations[sec] || 0} Mins</span>
                                    <span style={{ color: '#cbd5e1' }}>|</span>
                                    <span>Questions to be Attempted : {secQuestions.length}/{secQuestions.length} Questions</span>
                                    <span style={{ color: '#cbd5e1' }}>|</span>
                                    <span>{secMarks} Marks</span>
                                    <span style={{ color: '#cbd5e1' }}>|</span>
                                    <span>1 Skills</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '8px' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <button className="btn-primary" style={{ background: '#0052cc !important', color: 'white !important', padding: '12px 32px !important', fontSize: '1rem !important', borderRadius: '4px !important', boxShadow: '0 4px 12px rgba(0, 82, 204, 0.3) !important' }} onClick={handleSaveTest}>
                            Publish Test
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
            
            {/* SECTION SETTINGS MODAL */}
            {isSectionSettingsOpen && (
              <div className="modal-overlay" style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.6)' }}>
                <div className="modal-content fade-in" style={{ width: '600px', background: 'white', borderRadius: '8px', padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{currentSettingsSection} Settings</h3>
                    <button onClick={() => setIsSectionSettingsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
                  </div>
                  
                  <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                      <input type="checkbox" checked={timeMode === 'section'} onChange={e => {
                        setSectionTiming(e.target.checked);
                        setTimeMode(e.target.checked ? 'section' : 'overall');
                      }} style={{ marginTop: '4px', width: '16px', height: '16px' }} />
                      <div>
                        <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>Section Timing ⓘ</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Add structured allocation of time intervals for section</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                      <input type="checkbox" checked={makeAllQuestionsMandatory} onChange={e => setMakeAllQuestionsMandatory(e.target.checked)} style={{ marginTop: '4px', width: '16px', height: '16px' }} />
                      <div>
                        <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500' }}>Make All Questions Mandatory</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Allow the setting to make all the questions mandatory</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                      <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} style={{ marginTop: '4px', width: '16px', height: '16px' }} />
                      <div>
                        <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500' }}>Shuffle Questions</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Allow setting to shuffle the questions within the section</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '8px' }}>
                      <input type="checkbox" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} style={{ marginTop: '4px', width: '16px', height: '16px' }} />
                      <div>
                        <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500' }}>Shuffle Options</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Allow setting to shuffle the options</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                      <input type="checkbox" checked={showMultipleQuestionsPerPage} onChange={e => setShowMultipleQuestionsPerPage(e.target.checked)} disabled={unidirectional} style={{ marginTop: '4px', width: '16px', height: '16px' }} />
                      <div>
                        <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>Show Multiple Questions Per Page ⓘ</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>By default, the view is set to display one question per page. Select this option to view multiple questions on a single screen in a scrollable format.</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                      <input type="checkbox" checked={unidirectional} onChange={e => {
                        setUnidirectional(e.target.checked);
                        if (e.target.checked) setShowMultipleQuestionsPerPage(false);
                      }} style={{ marginTop: '4px', width: '16px', height: '16px' }} />
                      <div>
                        <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>Unidirectional ⓘ</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>On selecting this option, the candidate will be attempting all the questions in one go by moving forward towards the next question or section. Candidate wouldn't be able to move to the previous question.<br/>Show multiple questions per page settings will be disabled by default for unidirectional section.</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                      <input type="checkbox" checked={minimumQuestionTime} onChange={e => setMinimumQuestionTime(e.target.checked)} style={{ marginTop: '4px', width: '16px', height: '16px' }} />
                      <div>
                        <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500' }}>Minimum Question Time</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Allow setting to give minimum question time</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '8px' }}>
                      <input type="checkbox" checked={questionsToBeAttempted} onChange={e => setQuestionsToBeAttempted(e.target.checked)} style={{ marginTop: '4px', width: '16px', height: '16px' }} />
                      <div style={{ width: '100%' }}>
                        <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>Questions to be Attempted ⓘ</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', marginBottom: '16px' }}>This setting allows one to set the number of questions that needs to be attempted.</div>
                        
                        {questionsToBeAttempted && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input type="number" min="1" max={questions.filter(q => (q.sectionName || 'Section 1') === currentSettingsSection).length} value={questionsToAttemptCount} onChange={e => {
                              const maxQ = questions.filter(q => (q.sectionName || 'Section 1') === currentSettingsSection).length;
                              let val = parseInt(e.target.value);
                              if (isNaN(val)) {
                                setQuestionsToAttemptCount('');
                              } else if (val > maxQ) {
                                setQuestionsToAttemptCount(maxQ);
                              } else if (val < 1) {
                                setQuestionsToAttemptCount(1);
                              } else {
                                setQuestionsToAttemptCount(val);
                              }
                            }} placeholder="4" style={{ width: '60px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }} />
                            <span style={{ fontSize: '0.9rem', color: '#334155' }}>Out of {questions.filter(q => (q.sectionName || 'Section 1') === currentSettingsSection).length} Questions</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                    <button style={{ background: 'transparent', border: '1px solid #0052cc', color: '#0052cc', padding: '8px 24px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }} onClick={() => setIsSectionSettingsOpen(false)}>Discard</button>
                    <button style={{ background: '#0052cc', border: 'none', color: 'white', padding: '8px 24px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }} onClick={() => setIsSectionSettingsOpen(false)}>Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- Email Modal Overlay --- */}
      {isEmailModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content email-modal">
            <div className="modal-header">
              <h3>Send Secure Invite Link</h3>
              <button className="icon-btn-action" onClick={closeEmailModal}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <p className="modal-subtitle">Generate a secure, single-use token and dispatch it to the candidate via email.</p>
              
              <div className="info-row">
                <span className="info-label">Test Name:</span>
                <span className="info-value">{emailTestName}</span>
              </div>
              
              <form onSubmit={handleSendEmail} className="email-form">
                <div className="form-group">
                  <label>Candidate Email Address</label>
                  <input 
                    type="email" 
                    className="modern-input" 
                    value={candidateEmail} 
                    onChange={e => setCandidateEmail(e.target.value)} 
                    placeholder="candidate@example.com"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Format</label>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input 
                        type="radio" 
                        name="emailFormat" 
                        value="link" 
                        checked={emailFormat === 'link'} 
                        onChange={() => setEmailFormat('link')} 
                      />
                      Direct Link
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input 
                        type="radio" 
                        name="emailFormat" 
                        value="token" 
                        checked={emailFormat === 'token'} 
                        onChange={() => setEmailFormat('token')} 
                      />
                      Access Token
                    </label>
                  </div>
                </div>
                
                {emailError && <div className="error-alert">{emailError}</div>}
                {emailSuccess && <div className="success-alert"><CheckCircle size={16}/> Email dispatched successfully!</div>}
                
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeEmailModal}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isSendingEmail || emailSuccess}>
                    {isSendingEmail ? 'Sending...' : <><Send size={16}/> Dispatch Email</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;

const parsePastedQuestions = (rawText) => {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let segments = normalized.split(/\n\s*\n/);
  if (segments.length <= 1) {
    const matches = normalized.split(/(?=\n\d+[.)])|^(?=\d+[.)])/);
    if (matches.length > 1) segments = matches;
  }
  const parsedQuestions = [];
  segments.forEach(segment => {
    const lines = segment.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 3) return; 

    let questionText = '';
    let options = [];
    let correctOption = 0;
    
    let answerLineIndex = -1;
    let answerVal = '';
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(?:correct\s+)?answer:\s*(.*)$/i);
      if (match) { answerLineIndex = i; answerVal = match[1].trim().toUpperCase(); break; }
    }
    if (answerLineIndex === -1) {
      const lastLine = lines[lines.length - 1];
      if (/^[A-D1-4]$/i.test(lastLine)) { answerLineIndex = lines.length - 1; answerVal = lastLine.toUpperCase(); }
    }

    let possibleOptions = [];
    let questionLines = [];

    lines.forEach((line, idx) => {
      if (idx === answerLineIndex) return;
      const optionMatch = line.match(/^(?:([A-D]|[a-d]|[1-4]))(?:[.)-]?\s+)(.*)$/);
      if (optionMatch) {
        possibleOptions.push({ label: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() });
      } else {
        if (possibleOptions.length === 0) questionLines.push(line);
        else possibleOptions[possibleOptions.length - 1].text += ' ' + line;
      }
    });

    if (possibleOptions.length >= 2) {
      questionText = questionLines.join(' ').replace(/^\d+[.)]\s*/, '');
      options = possibleOptions.slice(0, 4).map(o => o.text);
      let ansIdx = -1;
      let ansIndices = [];
      let type = 'single';
      if (answerVal) {
        let cleanAns = answerVal.replace(/^(?:OPTION|CHOICE|ANSWERS?)\s*/i, '').replace(/and/gi, ',').trim();
        const parts = cleanAns.split(/[,\s]+/).filter(Boolean);
        parts.forEach(part => {
          if (['A', 'B', 'C', 'D'].includes(part)) ansIndices.push(['A', 'B', 'C', 'D'].indexOf(part));
          else if (['1', '2', '3', '4'].includes(part)) ansIndices.push(parseInt(part, 10) - 1);
          else {
            const matchedOpt = options.findIndex(opt => opt.toLowerCase() === part.toLowerCase());
            if (matchedOpt !== -1) ansIndices.push(matchedOpt);
            else {
              const matchedOptClean = options.findIndex(opt => opt.toLowerCase() === cleanAns.toLowerCase());
              if (matchedOptClean !== -1) ansIndices.push(matchedOptClean);
            }
          }
        });
        if (ansIndices.length > 1) type = 'multiple';
        else if (ansIndices.length === 1) ansIdx = ansIndices[0];
      }
      correctOption = ansIndices.length > 0 ? ansIndices[0] : 0;
      let correctOptions = ansIndices.length > 0 ? ansIndices : [0];
    }

    if (questionText && options.length >= 2) {
      while (options.length < 4) options.push(`Option ${options.length + 1}`);
      parsedQuestions.push({ text: questionText, type, options, correctOption, correctOptions });
    }
  });

  return parsedQuestions;
};
