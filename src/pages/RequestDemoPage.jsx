import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { saveDemoRequest } from '../utils/db';
import NavBar from '../components/NavBar';
import './HomePage.css';
import './RequestDemoPage.css';

const RequestDemoPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    testVolume: '',
    useCase: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await saveDemoRequest(formData);
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="request-demo-container">
      <div className="cyber-grid-bg"></div>
      <NavBar />
      
      <main className="request-demo-main animate-in">
        <div className="demo-form-wrapper">
          {submitted ? (
            <div className="form-success-state" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={64} className="text-emerald" style={{ filter: 'drop-shadow(0 0 15px rgba(16, 185, 129, 0.4))' }} />
              </div>
              <h2 className="form-title" style={{ color: 'white' }}>Request Received</h2>
              <p className="form-subtitle" style={{ marginBottom: '2rem' }}>
                Thank you for your interest in Nexora. Our enterprise team will be in touch shortly to schedule your personalized demo.
              </p>
              <button 
                className="btn-submit-demo" 
                style={{ width: '100%' }}
                onClick={() => setSubmitted(false)}
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <>
              <div className="form-header">
                <h1 className="form-title text-gradient">Request a Demo</h1>
                <p className="form-subtitle">See how Nexora can secure your remote testing environment today.</p>
              </div>

              <form className="demo-form" onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="form-input" placeholder="Jane" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="form-input" placeholder="Doe" required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="jane@company.com" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" name="company" value={formData.company} onChange={handleChange} className="form-input" placeholder="Acme Corp" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Annual Test Volume</label>
                  <select name="testVolume" value={formData.testVolume} onChange={handleChange} className="form-input" required style={{ appearance: 'none', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <option value="" disabled style={{ color: '#000' }}>Select an option...</option>
                    <option value="1-500" style={{ color: '#000' }}>1 - 500 tests</option>
                    <option value="501-5000" style={{ color: '#000' }}>501 - 5,000 tests</option>
                    <option value="5000+" style={{ color: '#000' }}>5,000+ tests</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">How can we help?</label>
                  <textarea name="useCase" value={formData.useCase} onChange={handleChange} className="form-textarea" placeholder="Tell us about your specific use cases and requirements..." required></textarea>
                </div>

                <button type="submit" className="btn-submit-demo" disabled={loading}>
                  <Send size={18} />
                  <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default RequestDemoPage;
