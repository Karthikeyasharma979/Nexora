
import NavBar from '../components/NavBar';
import './HomePage.css';
import './WorkflowPage.css';

const WorkflowPage = () => {
  return (
    <div className="workflow-page-container">
      <div className="cyber-grid-bg"></div>
      <NavBar />
      
      <main className="workflow-main">
        <h1 className="page-title">Secure <span className="text-gradient">Workflow</span></h1>
        <p className="page-subtitle">A seamless, multi-layered approach to exam integrity.</p>
        
        <div className="timeline-container animate-in" style={{ marginTop: '4rem', maxWidth: '1000px', width: '100%' }}>
          <div className="timeline-line-wrapper">
            <div className="timeline-line"></div>
          </div>
          
          <div className="timeline-item">
            <div className="timeline-node node-violet">1</div>
            <div className="timeline-card">
              <div className="timeline-card-title text-violet">System Diagnostics Check</div>
              <p className="timeline-card-desc">
                Nexora scans the candidate's environment, checking network performance, webcam clarity, and microphone availability before the test begins.
              </p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-node node-rose">2</div>
            <div className="timeline-card">
              <div className="timeline-card-title text-rose">Biometric Identification</div>
              <p className="timeline-card-desc">
                Facial capture and ID checks enroll the candidate in the AI model, ensuring the registered test-taker matches the person sitting at the terminal.
              </p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-node node-amber">3</div>
            <div className="timeline-card">
              <div className="timeline-card-title text-amber">Operating System Lockdown</div>
              <p className="timeline-card-desc">
                The Electron Kiosk browser locks down keyboard shortcuts, mouse gestures, multi-monitor display outputs, and blocks screen-sharing software.
              </p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-node node-emerald">4</div>
            <div className="timeline-card">
              <div className="timeline-card-title text-emerald">Real-Time Integrity Proctored Feed</div>
              <p className="timeline-card-desc">
                AI visual & audio proctoring works continuously. Incidents like missing faces, cellphones, or vocal cues are instantly logged with screenshots in the admin dashboard.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkflowPage;
