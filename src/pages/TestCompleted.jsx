import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Star, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './TestCompleted.css';

const TestCompleted = () => {
  const [rating, setRating] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const location = useLocation();

  const score = location.state?.score || 'N/A';
  const candidateName = location.state?.candidateName || 'Candidate';
  const testDetails = location.state?.testDetails || null;
  const answers = location.state?.answers || {};
  const status = location.state?.status || 'Completed';
  const terminationReason = location.state?.terminationReason || 'Your exam was forcefully terminated due to excessive proctoring violations.';

  useEffect(() => {
    // Trap the back button to prevent returning to the exam
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="tc-container">
      {/* Top Card */}
      <div className="tc-card tc-top-card">
        {status === 'Terminated' ? (
          <>
            <div className="tc-illustration">
              <AlertCircle size={64} style={{ color: '#ef4444' }} />
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
            </div>
          </>
        )}
      </div>

      {/* Bottom Card */}
      <div className="tc-card tc-bottom-card">
        <p className="tc-disclaimer">
          Dear Candidate, Nexora | sync and its employees do not use your personally 
          identifiable information like Aadhar card, PAN card details, Credit card, Debit card, 
          Bank account numbers etc. for any purpose.
        </p>
        <p className="tc-disclaimer mt-3">
          If anyone posing to be Nexora | sync employee/representative contacts you with 
          a request to share any such information, we urge you not to entertain such requests 
          and alert us on <strong>support@nexora.com</strong> immediately.
        </p>

        <div className="tc-rating-section">
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
                const candidateAnswerIdx = answers[q.id];
                const isCorrect = candidateAnswerIdx === q.correctOption;
                const isAttempted = candidateAnswerIdx !== undefined;

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
                        if (optIdx === q.correctOption) optClass += ' correct';
                        else if (optIdx === candidateAnswerIdx && !isCorrect) optClass += ' incorrect';

                        return (
                          <div key={optIdx} className={optClass}>
                            {opt}
                            {optIdx === candidateAnswerIdx && <span className="tc-report-your-ans"> (Your Answer)</span>}
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
