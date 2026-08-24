import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, FileText, AlertTriangle, ShieldCheck, ChevronRight, CheckCircle, XCircle, Image } from 'lucide-react';
import { API_URL } from '../utils/db';
import './ResultPage.css';

const ResultPage = () => {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`${API_URL}/reports/${reportId}`);
        if (!response.ok) {
          throw new Error('Report not found or unable to fetch.');
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        console.error(err);
        setError('Report not found or expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <div className="rp-container centered">
        <div className="rp-loader"></div>
        <p>Loading your results...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rp-container centered">
        <AlertTriangle size={50} color="#e53e3e" />
        <h2>Result Not Found</h2>
        <p>{error}</p>
        <Link to="/" className="rp-btn">Return Home</Link>
      </div>
    );
  }

  // Calculate percentage
  const [correct, total] = report.score.split('/').map(Number);
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  let grade = 'Needs Improvement';
  let colorClass = 'danger';
  if (percentage >= 80) { grade = 'Excellent'; colorClass = 'success'; }
  else if (percentage >= 60) { grade = 'Good'; colorClass = 'warning'; }

  return (
    <div className="rp-container">
      <header className="rp-header">
        <div className="rp-logo">
          <ShieldCheck size={28} /> Nexora
        </div>
      </header>

      <main className="rp-main">
        <div className="rp-card slide-up">
          <div className="rp-card-header">
            <Award size={40} className={`rp-icon-${colorClass}`} />
            <h1>Test Results</h1>
            <p className="rp-subtitle">Assessment details for <strong>{report.candidateName}</strong></p>
          </div>

          <div className="rp-score-section">
            <div className={`rp-score-circle-container ${colorClass}`}>
              <svg className="rp-progress-ring" width="120" height="120">
                <circle className="rp-progress-ring-bg" strokeWidth="6" cx="60" cy="60" r="54" fill="transparent" />
                <circle 
                  className="rp-progress-ring-fill" 
                  strokeWidth="6" 
                  cx="60" 
                  cy="60" 
                  r="54" 
                  fill="transparent" 
                  style={{ strokeDasharray: `${2 * Math.PI * 54}`, strokeDashoffset: `${2 * Math.PI * 54 * (1 - percentage / 100)}` }}
                />
              </svg>
              <div className="rp-score-content">
                <span className="rp-score-number">{percentage}%</span>
                <span className="rp-score-text">Score</span>
              </div>
            </div>
            
            <div className="rp-stats">
              <div className="rp-stat-item">
                <span className="rp-stat-label">Correct Answers</span>
                <span className="rp-stat-value">{correct} / {total}</span>
              </div>
              <div className="rp-stat-item">
                <span className="rp-stat-label">Performance</span>
                <span className={`rp-stat-value text-${colorClass}`}>{grade}</span>
              </div>
              <div className="rp-stat-item">
                <span className="rp-stat-label">Status</span>
                <span className="rp-stat-value">{report.status}</span>
              </div>
            </div>
          </div>

          <div className="rp-ai-section">
            <div className="rp-ai-header">
              <div className="rp-ai-icon">✨</div>
              <h3>AI Performance Recommendation</h3>
            </div>
            <div className="rp-ai-body">
              <p>{report.aiRecommendation || 'No recommendation available at this time.'}</p>
            </div>
          </div>

          {report.violations && report.violations.length > 0 && (
            <div className="rp-violations-section">
              <h3><AlertTriangle size={18} className="mr-2" /> Test Violations Recorded</h3>
              <p>The following proctoring events were recorded during your session:</p>
              <ul>
                {report.violations.map((v, i) => (
                  <li key={i}>{v.type || v}</li>
                ))}
              </ul>
            </div>
          )}

          {report.questions && report.questions.length > 0 && (
            <div className="rp-detailed-report">
              <h3 style={{ marginTop: '30px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>Detailed Test Report</h3>
              {report.questions.map((q, idx) => {
                const candidateAnswerText = report.answers ? report.answers[q.id] : undefined;
                const correctText = report.correctAnswers ? report.correctAnswers[q.id] : undefined;
                const isCorrect = candidateAnswerText !== undefined && candidateAnswerText === correctText;
                const isAttempted = candidateAnswerText !== undefined;

                return (
                  <div key={q.id} style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: '600', marginBottom: '12px', color: '#334155', display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ marginRight: '8px' }}>Q{idx + 1}.</span> 
                      <span style={{ flex: 1 }}>{q.text}</span>
                      {isAttempted ? (
                        isCorrect ? <CheckCircle style={{ color: '#10b981', marginLeft: '10px', flexShrink: 0 }} size={18} /> : <XCircle style={{ color: '#ef4444', marginLeft: '10px', flexShrink: 0 }} size={18} />
                      ) : (
                        <span style={{ color: '#94a3b8', marginLeft: '10px', fontSize: '12px', flexShrink: 0 }}>(Unattempted)</span>
                      )}
                    </div>
                    
                    {q.referenceImage && (
                      <div style={{ margin: '10px 0 15px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                          <Image size={16} /> Reference Image
                        </div>
                        <img 
                          src={q.referenceImage} 
                          alt="Question Reference" 
                          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px', border: '1px solid #e2e8f0', objectFit: 'contain' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {q.options.map((opt, optIdx) => {
                        let optBg = 'white';
                        let optBorder = '1px solid #cbd5e1';
                        let optColor = '#475569';
                        let fw = 'normal';

                        if (opt === correctText) {
                          optBg = '#d1fae5';
                          optBorder = '1px solid #34d399';
                          optColor = '#065f46';
                          fw = '500';
                        } else if (opt === candidateAnswerText && !isCorrect) {
                          optBg = '#fee2e2';
                          optBorder = '1px solid #f87171';
                          optColor = '#991b1b';
                          fw = '500';
                        }

                        return (
                          <div key={optIdx} style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: optBg, border: optBorder, color: optColor, fontSize: '14px', fontWeight: fw }}>
                            {opt}
                            {opt === candidateAnswerText && <span style={{ marginLeft: '6px', fontSize: '12px', fontWeight: '600' }}> (Your Answer)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rp-actions">
            <button className="rp-btn outline" onClick={() => window.print()}>
              <FileText size={18} className="mr-2" /> Download Report
            </button>
            <Link to="/" className="rp-btn primary">
              Back to Home <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="rp-footer">
        &copy; 2026 Nexora Secure Assessments. All rights reserved.
      </footer>
    </div>
  );
};

export default ResultPage;
