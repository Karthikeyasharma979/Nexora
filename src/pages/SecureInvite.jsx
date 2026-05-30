import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, ExternalLink, ShieldCheck, Download } from 'lucide-react';

const SecureInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [isBrowserAndRequiredSEB, setIsBrowserAndRequiredSEB] = useState(false);

  useEffect(() => {
    // 1. Check if we are running inside the regular web browser or the Electron app
    const userAgent = navigator.userAgent.toLowerCase();
    const isElectron = userAgent.indexOf(' electron/') > -1;

    // 2. Verify the token first
    const verifyToken = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_URL}/invite/verify/${token}`);
        
        if (response.ok) {
          const data = await response.json();
          const requiresSEB = data.requireSEB !== false; // defaults to true

          if (requiresSEB && !isElectron) {
            // The test strictly requires the Secure Browser, but they opened it in Chrome.
            // We must bounce them to the native app using the custom protocol handler.
            setIsBrowserAndRequiredSEB(true);
            setVerifying(false);
            
            // Attempt to automatically trigger the deep link
            window.location.href = `nexora://invite/${token}`;
            return;
          }

          // Token is valid and they are either in the Secure Browser, 
          // OR the test doesn't require it. Forward securely to the test!
          sessionStorage.setItem('secure_invite_token', token);
          navigate(`/pre-test/${data.testId}`, { replace: true });
        } else {
          const errData = await response.json();
          setError(errData.error || 'Invalid or Expired Invite Link');
          setVerifying(false);
        }
      } catch (err) {
        console.error("Error verifying token from backend, trying offline fallback...", err);
        try {
          const decodedStr = atob(token);
          const decoded = JSON.parse(decodedStr);
          if (decoded.type === 'invite' && decoded.testId) {
             const data = localStorage.getItem('mettl_clone_tests');
             const tests = data ? JSON.parse(data) : [];
             const test = tests.find(t => t.id === decoded.testId);
             if (test) {
               const requiresSEB = test.requireSEB !== false;
               if (requiresSEB && !isElectron) {
                 setIsBrowserAndRequiredSEB(true);
                 setVerifying(false);
                 window.location.href = `nexora://invite/${token}`;
                 return;
               }
               sessionStorage.setItem('secure_invite_token', token);
               navigate(`/pre-test/${decoded.testId}`, { replace: true });
               return;
             } else {
               setError('Test not found locally (offline mode).');
               setVerifying(false);
               return;
             }
          }
        } catch (fallbackErr) {
          // If fallback parsing fails, proceed to generic error
        }
        setError('Connection error verifying invite link.');
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

  if (isBrowserAndRequiredSEB) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '450px' }}>
          <div style={{ backgroundColor: 'rgba(0, 180, 216, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px' }}>
            <ShieldCheck size={40} color="#00b4d8" />
          </div>
          <h2 style={{ color: '#0f172a', margin: '0 0 15px', fontSize: '22px' }}>Opening Secure Browser</h2>
          <p style={{ color: '#475569', margin: '0 0 25px', lineHeight: '1.6', fontSize: '15px' }}>
            To maintain test integrity, this assessment must be taken inside the <strong>Nexora Secure Browser</strong>. 
          </p>
          <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
            <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>If your browser asks for permission to open the application, please click <strong>"Open"</strong> or <strong>"Allow"</strong>.</p>
          </div>
          
          <a 
            href={`nexora://invite/${token}`}
            style={{ backgroundColor: '#4f46e5', color: 'white', textDecoration: 'none', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'background-color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
          >
            Launch Secure Browser <ExternalLink size={18} />
          </a>

          <div style={{ marginTop: '30px', paddingTop: '25px', borderTop: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 15px', fontSize: '14px', color: '#64748b' }}>Don't have the app installed?</p>
            <a 
              href="https://drive.google.com/file/d/1a8neyskcGHfm7md0ESZXtg1UOd3xgyJy/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: 'transparent', color: '#00b4d8', border: '2px solid #00b4d8', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', margin: '0 auto', textDecoration: 'none' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 180, 216, 0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Download size={16} /> Download Secure Browser
            </a>
            <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Windows 10/11 • macOS 12+</p>
          </div>
        </div>
      </div>
    );
  }

  if (verifying) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8' }}>
        <Loader2 className="lucide-spin" size={50} color="#0056b3" style={{ animation: 'spin 2s linear infinite' }} />
        <h2 style={{ marginTop: '20px', color: '#333' }}>Verifying Secure Link...</h2>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdf2f2' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px' }}>
        <AlertTriangle size={60} color="#e53e3e" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ color: '#e53e3e', margin: '0 0 15px' }}>Access Denied</h2>
        <p style={{ color: '#4a5568', margin: '0 0 20px', lineHeight: '1.5' }}>{error}</p>
        <p style={{ fontSize: '13px', color: '#a0aec0' }}>If you believe this is a mistake, please contact your administrator for a new link.</p>
      </div>
    </div>
  );
};

export default SecureInvite;
