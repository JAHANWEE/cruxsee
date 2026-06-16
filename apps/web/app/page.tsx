"use client";

import { useEffect } from "react";
import "./waitlist.css";

export default function WaitlistPage() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        document.getElementById('emailInput')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailInput = document.getElementById('emailInput') as HTMLInputElement;
    if (emailInput && emailInput.value) {
      alert(`Thanks for joining the waitlist, ${emailInput.value}!`);
      emailInput.value = "";
    }
  };

  return (
    <div className="waitlist-theme">
      <div className="noise-overlay"></div>
      <div className="ambient-glow"></div>
      
      <div className="focus-backdrop" id="focusBackdrop"></div>

      <div className="page-container">
        <nav className="expert-nav">
          <div className="brand">
            <span className="brand-icon">✦</span>
            <span className="brand-name">cruxsee</span>
          </div>
          <div className="nav-badge">
            <span className="pulse-indicator"></span>
            Coming Soon
          </div>
        </nav>

        <main className="hero-center">
          <div className="hero-pill">
            <span className="pill-highlight">NEW</span>
            <div className="pill-divider"></div>
            <span className="pill-text">Powered by Corsair MCP Integrations</span>
          </div>
          
          <h1 className="hero-display">
            The email workflow <br /> you've always wanted.
          </h1>
          
          <p className="hero-description">
            Cruxsee gives you complete control over Gmail and Google Calendar. <br /> Keyboard-first. AI-native. Built on Corsair.
          </p>

          <div className="waitlist-wrapper">
            <form id="expertWaitlistForm" className="magnetic-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <svg className="mail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input type="email" id="emailInput" placeholder="Enter your email to join waitlist" required autoComplete="email" />
              </div>
              <button type="submit" className="magnetic-button" id="magneticBtn">
                <span className="btn-text">Get Access</span>
                <svg className="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12,5 19,12 12,19"></polyline>
                </svg>
              </button>
            </form>
            <div className="shortcut-hint">
              Press <kbd>W</kbd> to focus
            </div>
          </div>
        </main>

        <div className="interface-showcase">
          <div className="showcase-ambient-glow"></div>
          <div className="expert-mockup">
            <div className="mockup-top-bar">
              <div className="traffic-lights"><span></span><span></span><span></span></div>
              <div className="mockup-title">cruxsee://command-center</div>
            </div>
            <div className="mockup-content">
              <div className="cmd-palette">
                <div className="cmd-input">
                  <span className="cmd-icon">⌘</span>
                  <span>Draft meeting invite to team for next Thursday...</span>
                </div>
                <div className="cmd-results">
                  <div className="cmd-item active">
                    <span className="item-tag mcp">MCP Agent</span>
                    <span className="item-desc">Scheduling meeting via Google Calendar API...</span>
                  </div>
                  <div className="cmd-item">
                    <span className="item-tag gmail">Gmail API</span>
                    <span className="item-desc">Drafting notification email...</span>
                  </div>
                  <div className="cmd-item">
                    <span className="item-tag filter">Priority LLM</span>
                    <span className="item-desc">Filtering incoming responses...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="expert-footer">
          <div className="footer-content">
            <span>© 2026 Cruxsee. Built on Corsair.</span>
            <div className="footer-links">
              <a href="#">X / Twitter</a>
              <a href="#">LinkedIn</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
