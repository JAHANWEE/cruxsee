"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { signIn } from "~/lib/auth-client";
import OceanBackground from "../components/OceanBackground";
import InteractiveChat from "../components/InteractiveChat";
import "./landing.css";

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Hero Sphere animations (0 to 0.15)
  const heroSphereScale = useTransform(scrollYProgress, [0, 0.1, 0.15], [1, 5, 50]);
  const heroSphereOpacity = useTransform(scrollYProgress, [0, 0.1, 0.15], [1, 1, 0]);
  const heroTextOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

  // Window animations (starts after sphere scales up, ends by scaling down into the final sphere)
  const windowScale = useTransform(scrollYProgress, [0.1, 0.15, 0.9, 0.95], [0.8, 1, 1, 0.5]);
  const windowOpacity = useTransform(scrollYProgress, [0.1, 0.15, 0.9, 0.95], [0, 1, 1, 0]);

  // Environments
  // Ocean: 0.15 to 0.30
  const opOcean = useTransform(scrollYProgress, [0.15, 0.25, 0.3], [1, 1, 0]);
  // Memory: 0.25 to 0.45
  const opMemory = useTransform(scrollYProgress, [0.25, 0.3, 0.4, 0.45], [0, 1, 1, 0]);
  // Knowledge: 0.4 to 0.6
  const opKnowledge = useTransform(scrollYProgress, [0.4, 0.45, 0.55, 0.6], [0, 1, 1, 0]);
  // Workspace: 0.55 to 0.75
  const opWorkspace = useTransform(scrollYProgress, [0.55, 0.6, 0.7, 0.75], [0, 1, 1, 0]);
  // Daily: 0.7 to 0.9
  const opDaily = useTransform(scrollYProgress, [0.7, 0.75, 0.85, 0.9], [0, 1, 1, 0]);
  // Research: 0.85 to 0.95
  const opResearch = useTransform(scrollYProgress, [0.85, 0.9, 0.95], [0, 1, 1]);

  // Text animations inside environments
  const oceanTextY = useTransform(scrollYProgress, [0.15, 0.25], [0, -100]);
  const oceanTextOpacity = useTransform(scrollYProgress, [0.15, 0.25], [1, 0]);

  const memTextY = useTransform(scrollYProgress, [0.25, 0.3, 0.4, 0.45], [50, 0, 0, -50]);
  const knoTextY = useTransform(scrollYProgress, [0.4, 0.45, 0.55, 0.6], [50, 0, 0, -50]);
  const workTextY = useTransform(scrollYProgress, [0.55, 0.6, 0.7, 0.75], [50, 0, 0, -50]);
  const dailyTextY = useTransform(scrollYProgress, [0.7, 0.75, 0.85, 0.9], [50, 0, 0, -50]);
  const resTextY = useTransform(scrollYProgress, [0.85, 0.9, 0.95], [50, 0, 0]);

  // Final Sphere animations (0.95 to 1.0)
  const finalSphereScale = useTransform(scrollYProgress, [0.95, 0.98, 1], [0.5, 1, 1]);
  const finalSphereOpacity = useTransform(scrollYProgress, [0.9, 0.95, 1], [0, 1, 1]);

  return (
    <div className="scroll-container" ref={containerRef} style={{ height: "800vh" }}>
      
      {/* Interactive overlay (Nav + CTA) */}
      <div className="interactive-layer">
        <nav className="landing-nav">
          <div className="brand-minimal">
            <span className="brand-minimal-icon"></span>
            <span>cruxsee</span>
          </div>
          <button 
            onClick={() => signIn.social({ provider: "google", callbackURL: window.location.origin + "/chat" })} 
            className="cta-button"
          >
            Sign In
          </button>
        </nav>
        
        <div className="scroll-indicator">
          Scroll down
        </div>
      </div>

      {/* The cinematic fixed viewport */}
      <div className="viewport">
        
        {/* Hero Sphere (Initial Scene) */}
        <motion.div 
          style={{ 
            position: 'absolute',
            zIndex: 20, 
            opacity: heroSphereOpacity,
            scale: heroSphereScale,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
           <div className="glowing-sphere" style={{
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             justifyContent: 'center'
           }}>
             <motion.div style={{ opacity: heroTextOpacity, textAlign: 'center' }}>
               <h1 style={{ fontSize: '3vw', fontWeight: 600, letterSpacing: '-0.05em', color: '#fff', margin: 0 }}>Cruxsee</h1>
               <p style={{ opacity: 0.8, fontSize: '1vw', color: '#fff', marginTop: '0.5rem' }}>The future of work.</p>
             </motion.div>
           </div>
        </motion.div>

        {/* The massive floating window containing the worlds */}
        <motion.div 
          className="floating-window"
          style={{ 
            scale: windowScale,
            opacity: windowOpacity,
            zIndex: 10
          }}
        >
          {/* Ocean */}
          <motion.div className="environment env-ocean" style={{ opacity: opOcean }}>
            <OceanBackground />
            <motion.div style={{ y: oceanTextY, opacity: oceanTextOpacity, position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
              <h1 className="world-title" style={{ textShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>Cruxsee<span className="world-subtitle">See the Crux, Ignore the fluff</span></h1>
            </motion.div>
          </motion.div>

          {/* Memory World (The Interaction) */}
          <motion.div className="environment env-memory flex flex-col items-center justify-center pt-4" style={{ opacity: opMemory }}>
            <motion.div style={{ y: memTextY, opacity: opMemory, position: 'relative', zIndex: 20, marginBottom: '2rem' }}>
              <h1 className="world-title" style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none', color: '#000', textShadow: '0 4px 30px rgba(255,255,255,0.6)', fontSize: '4vw' }}>
                Conversational Workspace
                <span className="world-subtitle" style={{ fontSize: '1.2vw', marginTop: '0.8rem' }}>Just ask. Cruxsee connects the dots.</span>
              </h1>
            </motion.div>
            <div className="relative z-10 w-full flex justify-center transform scale-90 origin-top">
              <InteractiveChat />
            </div>
          </motion.div>

          {/* Knowledge Universe (The Integrations) */}
          <motion.div className="environment env-knowledge" style={{ opacity: opKnowledge }}>
            <motion.div style={{ y: knoTextY, opacity: opKnowledge }}>
              <h1 className="world-title" style={{ color: '#fff' }}>Omniscient Memory<span className="world-subtitle">Gmail, Calendar, and Notes. All in one mind.</span></h1>
            </motion.div>
            <div className="particle" style={{ width: 4, height: 4, top: '40%', left: '30%', boxShadow: '0 0 10px white' }}></div>
            <div className="particle" style={{ width: 3, height: 3, top: '70%', left: '60%', boxShadow: '0 0 10px white' }}></div>
            <div className="particle" style={{ width: 5, height: 5, top: '20%', left: '80%', boxShadow: '0 0 10px white' }}></div>
          </motion.div>

          {/* Workspace Dimension (The Execution) */}
          <motion.div className="environment env-workspace" style={{ opacity: opWorkspace }}>
            <motion.div style={{ y: workTextY, opacity: opWorkspace }}>
              <h1 className="world-title" style={{ color: '#fff' }}>Stop Organizing. Start Doing.<span className="world-subtitle">Cruxsee doesn't just read. It acts on your behalf.</span></h1>
            </motion.div>
            <div className="ui-card" style={{ top: '30%', left: '10%', width: '300px', height: '200px', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#fff', fontSize: '0.9rem', opacity: 0.8 }}>Email Sent Successfully</div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}></div>
              <div style={{ width: '80%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px' }}></div>
            </div>
            <div className="ui-card" style={{ bottom: '20%', right: '15%', width: '250px', height: '120px', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#fff', fontSize: '0.9rem', opacity: 0.8 }}>Event Added to Calendar</div>
            </div>
          </motion.div>

          {/* Daily Briefing (The Clarity) */}
          <motion.div className="environment env-daily" style={{ opacity: opDaily }}>
             <motion.div style={{ y: dailyTextY, opacity: opDaily, position: 'relative', zIndex: 20 }}>
              <h1 className="world-title" style={{ color: '#000', textShadow: '0 4px 30px rgba(255,255,255,0.6)' }}>Zero Noise<span className="world-subtitle">Start your morning with absolute clarity.</span></h1>
            </motion.div>
            <div className="ui-card absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white/40 border-white/40 shadow-xl z-10">
              <div style={{ color: '#000', fontSize: '1rem', fontWeight: 500, opacity: 0.9 }}>Good morning.</div>
              <div style={{ color: '#000', fontSize: '0.9rem', opacity: 0.6 }}>You have 2 important emails and 1 meeting today.</div>
            </div>
          </motion.div>

          {/* Research Galaxy (The Horizon) */}
          <motion.div className="environment env-research" style={{ opacity: opResearch }}>
             <motion.div style={{ y: resTextY, opacity: opResearch }}>
              <h1 className="world-title" style={{ color: '#fff' }}>Ready to see the Crux?<span className="world-subtitle">Join the future of work.</span></h1>
            </motion.div>
          </motion.div>
          
        </motion.div>

        {/* Final Scene (Overlay to close out the experience) */}
        <motion.div 
          style={{ 
            position: 'absolute',
            zIndex: 30, 
            opacity: finalSphereOpacity,
            scale: finalSphereScale,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
           <div className="glowing-sphere" style={{
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             justifyContent: 'center'
           }}>
             <div style={{ textAlign: 'center' }}>
               <h1 style={{ fontSize: '3vw', fontWeight: 600, letterSpacing: '-0.05em', color: '#fff', margin: 0 }}>Cruxsee</h1>
               <p style={{ opacity: 0.8, fontSize: '1vw', color: '#fff', marginTop: '0.5rem' }}>You have arrived.</p>
             </div>
           </div>
        </motion.div>
        
      </div>
    </div>
  );
}
