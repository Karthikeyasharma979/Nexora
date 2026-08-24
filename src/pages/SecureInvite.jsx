import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, ExternalLink, ShieldCheck, Download } from 'lucide-react';
import { API_URL } from '../utils/db';

const SecureInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [isBrowserAndRequiredSEB, setIsBrowserAndRequiredSEB] = useState(false);

  useEffect(() => {
    // 1. Check if we are running inside the regular web browser or the Electron app
    const isElectron = window.secure?.isNexoraKiosk === true;

    // 2. Verify the token first
    const verifyToken = async () => {
      try {
        let isJwtToken = token.length > 50 && token.includes('.');

        let requiresSEB = true;
        let testId = token;

        if (isJwtToken) {
          // Using centralized API_URL
          const response = await fetch(`${API_URL}/invite/verify/${token}`);
          
          if (response.ok) {
            const data = await response.json();
            requiresSEB = data.requireSEB !== false; // defaults to true
            testId = data.testId;
            if (data.candidateEmail) {
              sessionStorage.setItem('candidateEmail', data.candidateEmail);
            }
          } else {
            const errData = await response.json();
            setError(errData.error || 'Invalid or Expired Invite Link');
            setVerifying(false);
            return;
          }
        } else {
          setError('Invalid Access Key or Test not found.');
          setVerifying(false);
          return;
        }

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
        sessionStorage.setItem('secure_invite_token', testId);
        navigate(`/pre-test/${testId}`, { replace: true });
      } catch (err) {
        console.error("Error verifying invite link:", err);
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
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
        <style>
          {`
            @keyframes pulseShadow {
              0% { box-shadow: 0 0 0 0 rgba(0, 180, 216, 0.3); }
              70% { box-shadow: 0 0 0 20px rgba(0, 180, 216, 0); }
              100% { box-shadow: 0 0 0 0 rgba(0, 180, 216, 0); }
            }
          `}
        </style>
        <div style={{
          width: '90px',
          height: '90px',
          backgroundColor: 'white',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          animation: 'pulseShadow 2s infinite',
          marginBottom: '28px'
        }}>
          <Loader2 className="lucide-spin" size={40} color="#00b4d8" />
        </div>
        <h2 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>Verifying Security Token</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Establishing a secure connection for your assessment...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #fff5f5 0%, #fdf2f2 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      <style>
        {`
          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulseError {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(229, 62, 62, 0.4); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(229, 62, 62, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(229, 62, 62, 0); }
          }
        `}
      </style>
      <div style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.85)', 
        padding: '50px 40px', 
        borderRadius: '24px', 
        boxShadow: '0 20px 40px rgba(229, 62, 62, 0.08), 0 1px 3px rgba(0,0,0,0.05)', 
        textAlign: 'center', 
        maxWidth: '420px',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        animation: 'slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#fff5f5',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          animation: 'pulseError 2s infinite',
          border: '2px solid #fed7d7'
        }}>
          <AlertTriangle size={36} color="#e53e3e" strokeWidth={2.5} />
        </div>
        <h2 style={{ color: '#1a202c', margin: '0 0 12px', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>Access Denied</h2>
        <div style={{ width: '40px', height: '4px', backgroundColor: '#e53e3e', margin: '0 auto 24px', borderRadius: '2px' }}></div>
        <p style={{ color: '#4a5568', margin: '0 0 28px', lineHeight: '1.6', fontSize: '16px', fontWeight: '400' }}>
          {error}
        </p>
        
        <div style={{
          backgroundColor: '#f7fafc',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ fontSize: '13.5px', color: '#718096', margin: 0, lineHeight: '1.5' }}>
            If you believe this is a mistake, please reach out to <a href="mailto:s06699201@gmail.com" style={{ color: '#00b4d8', textDecoration: 'none', fontWeight: '500' }}>s06699201@gmail.com</a> for a new secure link.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecureInvite;
