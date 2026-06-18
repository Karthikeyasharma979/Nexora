import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, FileText, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
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
        setError('Unable to load test results.');
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
