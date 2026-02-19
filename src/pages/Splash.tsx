// src/pages/Splash.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO SET UP THE IMAGE:
//
// 1. Copy  C:\Users\CREATIONS_CONSOL\Documents\BLECA.jpg
//    into your project's  public/  folder  (same level as src/)
//    so the path becomes:  <your-project>/public/BLECA.jpg
//
// 2. That's it — Vite / CRA will serve it automatically at /BLECA.jpg
// ─────────────────────────────────────────────────────────────────────────────

const Splash: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const token = localStorage.getItem('authToken');
      const user  = localStorage.getItem('currentUser');
      const isLoggedIn = !!token && !!user;
      navigate(isLoggedIn ? '/dashboard' : '/login', { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f2f2f2',   /* matches the light grey in your image */
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Logo image ── */}
      <img
        src="/BLECA.jpg"
        alt="aXess — from BLECA smartlabs"
        style={{
          width: 'clamp(260px, 55vw, 540px)',
          height: 'auto',
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none',
          /* subtle fade-in so it doesn't just hard-cut on arrival */
          animation: 'splashFadeIn 0.6s ease both',
        }}
      />

      {/* ── Bouncing dots below the image ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="splash-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default Splash;