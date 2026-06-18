
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import './InvalidLink.css';

function InvalidLink() {
  return (
    <div className="invalid-link-container">
      <div className="invalid-link-glass">
        <div className="icon-wrapper">
          <div className="pulse-ring"></div>
          <AlertCircle size={64} className="error-icon" />
        </div>
        
        <h1 className="error-title">Link Not Valid</h1>
        <p className="error-description">
          The test link you are trying to access is either expired, incorrectly typed, or no longer active. 
          Please verify the link with your administrator.
        </p>

        <div className="action-buttons">
          <button className="btn-return" onClick={() => window.history.back()}>
            <ArrowLeft size={18} />
            Go Back
          </button>
          <a href="/admin" className="btn-home">
            <Home size={18} />
            Admin Portal
          </a>
        </div>
      </div>
      
      {/* Decorative background elements */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>
    </div>
  );
}

export default InvalidLink;
