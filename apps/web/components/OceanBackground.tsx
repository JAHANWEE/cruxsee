"use client";

import React, { useEffect, useRef } from "react";
import "./OceanBackground.css";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  type: "dust" | "glass" | "bokeh";
  angle: number;
  spinSpeed: number;
  baseOpacity: number;
}

export default function OceanBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseLeave);

    const resize = () => {
      // Use offsetWidth to match the floating window's bounds
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 15000); // Responsive density
      
      for (let i = 0; i < numParticles; i++) {
        const typeRand = Math.random();
        let type: "dust" | "glass" | "bokeh" = "dust";
        let size = Math.random() * 2 + 0.5;
        let baseOpacity = Math.random() * 0.5 + 0.2;
        let color = "rgba(255, 255, 255, ";
        
        if (typeRand > 0.8) {
          type = "bokeh";
          size = Math.random() * 20 + 10;
          baseOpacity = Math.random() * 0.15 + 0.05;
          color = Math.random() > 0.5 ? "rgba(255, 218, 185, " : "rgba(255, 255, 255, ";
        } else if (typeRand > 0.7) {
          type = "glass";
          size = Math.random() * 4 + 2;
          baseOpacity = Math.random() * 0.6 + 0.4;
          color = "rgba(220, 240, 255, ";
        }

        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5 - 0.2, // General upward drift
          color,
          type,
          angle: Math.random() * Math.PI * 2,
          spinSpeed: (Math.random() - 0.5) * 0.05,
          baseOpacity
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p) continue;

        // Mouse interaction
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 150;
        
        let targetSpeedX = p.speedX;
        let targetSpeedY = p.speedY;

        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          targetSpeedX += (dx / dist) * force * 2;
          targetSpeedY += (dy / dist) * force * 2;
          
          // Stretch effect for bokeh when near mouse
          if (p.type === "bokeh") {
            ctx.save();
            ctx.translate(p.x, p.y);
            const stretchAngle = Math.atan2(dy, dx);
            ctx.rotate(stretchAngle);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * (1 + force * 0.5), p.size * (1 - force * 0.2), 0, 0, Math.PI * 2);
            ctx.fillStyle = p.color + (p.baseOpacity + force * 0.2) + ")";
            ctx.fill();
            ctx.restore();
            continue;
          }
        }

        // Apply movement
        p.x += targetSpeedX;
        p.y += targetSpeedY;
        p.angle += p.spinSpeed;

        // Wrap around edges smoothly
        if (p.x < -50) p.x = canvas.width + 50;
        if (p.x > canvas.width + 50) p.x = -50;
        if (p.y < -50) p.y = canvas.height + 50;
        if (p.y > canvas.height + 50) p.y = -50;

        // Draw particle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        ctx.fillStyle = p.color + p.baseOpacity + ")";
        
        if (p.type === "glass") {
          // Draw geometric shard
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.8, p.size);
          ctx.lineTo(-p.size * 0.8, p.size);
          ctx.closePath();
          // Add a sparkle occasionally
          if (Math.random() > 0.98) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "white";
            ctx.fillStyle = "rgba(255,255,255,0.9)";
          }
          ctx.fill();
        } else {
          // Draw circle (dust or bokeh)
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    // Add small delay to ensure parent is measured properly
    setTimeout(resize, 100); 
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="ocean-env-container">
      {/* Background Base */}
      <div className="ocean-base-gradient" />
      
      {/* Volumetric Light Blobs */}
      <div className="blob blob-peach" />
      <div className="blob blob-champagne" />
      <div className="blob blob-blue" />
      
      {/* Aurora Bands */}
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />

      {/* Light Ribbons */}
      <div className="light-ribbon ribbon-1" />
      <div className="light-ribbon ribbon-2" />

      {/* Interactive Particles Canvas */}
      <canvas ref={canvasRef} className="ocean-canvas" />

      {/* Noise Texture */}
      <div className="ocean-noise" />

      {/* Bottom Mystery Fade */}
      <div className="ocean-bottom-fade" />
    </div>
  );
}
