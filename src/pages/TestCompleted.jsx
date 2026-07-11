import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './TestCompleted.css';

const TestCompleted = () => {
  const [rating, setRating] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const stateSource = location.state || JSON.parse(sessionStorage.getItem('last_test_completion_state')) || {};
  const score = stateSource.score || 'N/A';
  const candidateName = stateSource.candidateName || 'Candidate';
  const testDetails = stateSource.testDetails || null;
  const answers = stateSource.answers || {};
  const correctAnswers = stateSource.correctAnswers || {};
  const status = stateSource.status || 'Completed';
  const terminationReason = stateSource.terminationReason || 'Your exam was forcefully terminated due to excessive proctoring violations.';

  useEffect(() => {
    // Trap the back button to prevent returning to the exam
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (testDetails && testDetails.pageRedirect && status !== 'Terminated') {
      const url = testDetails.pageRedirect.startsWith('http') ? testDetails.pageRedirect : `https://${testDetails.pageRedirect}`;
      const timer = setTimeout(() => {
        window.location.href = url;
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [testDetails, status]);

  return (
    <div className="tc-container">
      {/* Top Card */}
      <div className="tc-card tc-top-card">
        {status === 'Terminated' ? (
          <>
            <div className="tc-illustration tc-illustration-terminated">
              <AlertCircle size={80} style={{ color: '#ef4444' }} />
            </div>
            <div className="tc-content">
              <h2 className="tc-congratulations" style={{ color: '#ef4444' }}>
                Test Terminated
              </h2>
              <p className="tc-subtitle">{terminationReason} Your answers have been submitted for review.</p>
            </div>
          </>
        ) : (
          <>
            <div className="tc-illustration">
              <img src="/clapping_hands.png" alt="Celebration" />
            </div>
            <div className="tc-content">
              <h2 className="tc-congratulations">
                Congratulations {candidateName} for completing the test, you have scored {score}%
              </h2>
              <p className="tc-subtitle">Your responses have been submitted</p>
              <button 
                className="tc-view-report-btn" 
                onClick={() => setShowReport(true)}
                disabled={!testDetails}
              >
                {testDetails ? 'View Report' : 'Report Unavailable'}
              </button>
              {testDetails && testDetails.pageRedirect && (
                <button
                  className="tc-view-report-btn"
                  style={{ marginLeft: '10px', backgroundColor: '#f1f5f9', color: '#0052cc', border: '1px solid #0052cc' }}
                  onClick={() => window.location.href = testDetails.pageRedirect.startsWith('http') ? testDetails.pageRedirect : `https://${testDetails.pageRedirect}`}
                >
                  Continue to Next Steps
                </button>
              )}
              {testDetails && testDetails.pageRedirect && (
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                  Redirecting to next steps in 10 seconds...
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Card */}
      <div className="tc-card tc-bottom-card">
        <p className="tc-disclaimer">
          Dear Candidate, Nexora and its employees do not use your personally 
          identifiable information like Aadhar card, PAN card details, Credit card, Debit card, 
          Bank account numbers etc. for any purpose.
        </p>
        <p className="tc-disclaimer mt-3">
          If anyone posing to be Nexora employee/representative contacts you with 
          a request to share any such information, we urge you not to entertain such requests 
          and alert us on <strong>support@nexora.com</strong> immediately.
        </p>

        <div className="tc-rating-section">
          {!feedbackSubmitted ? (
            <>
              <h4>How was your test taking experience?</h4>
              <div className="tc-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={28} 
                    className={`tc-star ${rating >= star ? 'filled' : ''}`} 
                    onClick={() => setRating(star)} 
                  />
                ))}
              </div>
              <div style={{ marginTop: '20px' }}>
                <button 
                  className="tc-submit-feedback-btn" 
                  onClick={() => setFeedbackSubmitted(true)}
                  disabled={rating === 0}
                  style={{ opacity: rating === 0 ? 0.5 : 1 }}
                >
                  Submit Feedback
                </button>
              </div>
            </>
          ) : (
            <div className="tc-feedback-success">
              <CheckCircle size={40} color="#28a745" style={{ marginBottom: '10px' }} />
              <h4 style={{ color: '#28a745' }}>Thank you for your feedback!</h4>
              <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '20px' }}>Your response has been recorded successfully.</p>
              <button 
                className="tc-return-home-btn" 
                onClick={() => navigate('/')}
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReport && testDetails && (
        <div className="tc-report-overlay">
          <div className="tc-report-modal">
            <div className="tc-report-header">
              <h3>Detailed Test Report</h3>
              <X className="tc-close-btn" onClick={() => setShowReport(false)} />
            </div>
            <div className="tc-report-body">
              {testDetails.questions.map((q, idx) => {
                const candidateAnswerText = answers[q.id];
                const correctText = correctAnswers[q.id];
                const isCorrect = candidateAnswerText !== undefined && candidateAnswerText === correctText;
                const isAttempted = candidateAnswerText !== undefined;

                return (
                  <div key={q.id} className="tc-report-question">
                    <div className="tc-report-q-header">
                      <span className="font-bold">Q{idx + 1}.</span> {q.text}
                      {isAttempted ? (
                        isCorrect ? <CheckCircle className="text-success ml-2" size={18} /> : <XCircle className="text-danger ml-2" size={18} />
                      ) : (
                        <span className="text-secondary ml-2 text-sm">(Unattempted)</span>
                      )}
                    </div>
                    <div className="tc-report-options">
                      {q.options.map((opt, optIdx) => {
                        let optClass = 'tc-report-opt';
                        if (opt === correctText) optClass += ' correct';
                        else if (opt === candidateAnswerText && !isCorrect) optClass += ' incorrect';

                        return (
                          <div key={optIdx} className={optClass}>
                            {opt}
                            {opt === candidateAnswerText && <span className="tc-report-your-ans"> (Your Answer)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCompleted;
