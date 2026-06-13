import React from 'react';
import { ShieldCheck, BrainCircuit, BarChart3 } from 'lucide-react';
import NavBar from '../components/NavBar';
import './HomePage.css';
import './FeaturesPage.css';

const FeaturesPage = () => {
  return (
    <div className="features-page-container">
      <div className="cyber-grid-bg"></div>
      <NavBar />
      
      <main className="features-main">
        <h1 className="page-title">Enterprise-Grade <span className="text-gradient">Features</span></h1>
        <p className="page-subtitle">Built for high-stakes assessments with zero-trust architecture.</p>
        
        <div className="features-grid animate-in" style={{ marginTop: '3rem' }}>
          
          <div className="feature-card card-rose spotlight-card">
            <div className="feature-icon-wrapper icon-rose">
              <ShieldCheck size={24} />
            </div>
            <h3 className="feature-title">Secure Desktop Shell</h3>
            <p className="feature-description">
              Our custom Electron-based Kiosk browser locks down the candidate's OS, preventing tab-switching, keyboard shortcuts, screen recording, and unauthorized applications.
            </p>
          </div>

          <div className="feature-card card-violet spotlight-card" style={{ animationDelay: '0.1s' }}>
            <div className="feature-icon-wrapper icon-violet">
              <BrainCircuit size={24} />
            </div>
            <h3 className="feature-title">Live AI Proctoring</h3>
            <p className="feature-description">
              Real-time facial recognition and object detection powered by TensorFlow. Automatically flags missing faces, multiple persons, cell phones, and suspicious audio.
            </p>
          </div>

          <div className="feature-card card-amber spotlight-card" style={{ animationDelay: '0.2s' }}>
            <div className="feature-icon-wrapper icon-amber">
              <BarChart3 size={24} />
            </div>
            <h3 className="feature-title">Instant Analytics</h3>
            <p className="feature-description">
              Get immediate, comprehensive reports on candidate performance and proctoring violations. Review auto-graded results and violation snapshots in one dashboard.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default FeaturesPage;
