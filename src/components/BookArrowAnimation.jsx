import React from 'react';

export default function BookArrowAnimation() {
  const pages = Array.from({ length: 8 });

  return (
    <div className="big-book-container">
      <svg 
        viewBox="0 0 400 300" 
        className="big-book-svg" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="coverGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <linearGradient id="pageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="80%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          
          <filter id="coverShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000000" floodOpacity="0.6"/>
          </filter>
        </defs>

        {/* --- Covers --- */}
        <g filter="url(#coverShadow)">
          {/* Left Cover */}
          <path d="M 200 280 Q 100 280 20 230 L 20 30 Q 100 80 200 80 Z" fill="url(#coverGrad)" stroke="#1e3a8a" strokeWidth="3" strokeLinejoin="round" />
          {/* Right Cover */}
          <path d="M 200 280 Q 300 280 380 230 L 380 30 Q 300 80 200 80 Z" fill="url(#coverGrad)" stroke="#1e3a8a" strokeWidth="3" strokeLinejoin="round" />
        </g>

        {/* --- Static Thick Page Stacks --- */}
        {/* Left Stack */}
        <path d="M 200 270 Q 110 270 30 225 L 30 35 Q 110 80 200 80 Z" fill="#94a3b8" />
        <path d="M 200 268 Q 115 268 35 222 L 35 38 Q 115 82 200 82 Z" fill="#cbd5e1" />
        <path d="M 200 265 Q 120 265 40 220 L 40 42 Q 120 85 200 85 Z" fill="#e2e8f0" />
        <path d="M 200 262 Q 125 262 45 218 L 45 45 Q 125 88 200 88 Z" fill="#f8fafc" />

        {/* Right Stack (Stays put under the flipping pages) */}
        <path d="M 200 270 Q 290 270 370 225 L 370 35 Q 290 80 200 80 Z" fill="#94a3b8" />
        <path d="M 200 268 Q 285 268 365 222 L 365 38 Q 285 82 200 82 Z" fill="#cbd5e1" />
        <path d="M 200 265 Q 280 265 360 220 L 360 42 Q 280 85 200 85 Z" fill="#e2e8f0" />

        {/* --- Flipping Pages --- */}
        {pages.map((_, i) => (
          <g key={i} className={`flip-page fp-${i}`}>
            <path 
              d="M 200 262 Q 275 262 355 218 L 355 45 Q 275 88 200 88 Z" 
              fill="url(#pageGrad)" 
              stroke="#cbd5e1" 
              strokeWidth="0.5" 
            />
            {/* Elegant lines mapping text/graphics on the page */}
            <path 
              d="M 230 110 L 320 95 M 230 130 L 305 117 M 230 160 L 330 143 M 230 180 L 310 166 M 230 200 L 290 190" 
              stroke="url(#accentGrad)" 
              strokeWidth="4" 
              strokeLinecap="round" 
              opacity="0.4" 
            />
          </g>
        ))}

        {/* --- Center Spine Crease --- */}
        <path 
          d="M 197 275 L 197 85 Q 200 80 203 85 L 203 275 Q 200 280 197 275 Z" 
          fill="rgba(0,0,0,0.15)" 
        />
      </svg>
    </div>
  );
}
