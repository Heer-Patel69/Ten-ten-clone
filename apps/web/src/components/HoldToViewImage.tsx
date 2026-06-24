'use client';

import { useState, useRef } from 'react';

export default function HoldToViewImage({ 
  base64Image, 
  onViewed 
}: { 
  base64Image: string; 
  onViewed: () => void; 
}) {
  const [isViewing, setIsViewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startViewing = () => {
    setIsViewing(true);
    setProgress(0);

    // Progress bar for 3 seconds
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) return 100;
        return p + (100 / 30); // 100% over 30 ticks (3 seconds at 100ms/tick)
      });
    }, 100);

    // Auto-delete after 3 seconds
    timerRef.current = setTimeout(() => {
      stopViewing();
      onViewed(); // Trigger delete
    }, 3000);
  };

  const stopViewing = () => {
    setIsViewing(false);
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <div 
      style={{
        position: 'relative',
        width: '200px',
        height: '250px',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#000'
      }}
      onMouseDown={startViewing}
      onMouseUp={stopViewing}
      onMouseLeave={stopViewing}
      onTouchStart={startViewing}
      onTouchEnd={stopViewing}
    >
      {/* The actual image */}
      <img 
        src={base64Image} 
        alt="Secret Media"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: isViewing ? 'none' : 'blur(20px)',
          transition: 'filter 0.3s ease'
        }}
        draggable="false"
        onContextMenu={(e) => e.preventDefault()} // Block right click
      />

      {/* Overlay instruction */}
      {!isViewing && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-playfair)',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: '1.2rem',
          pointerEvents: 'none'
        }}>
          Tap & Hold to View
        </div>
      )}

      {/* Progress Bar (Snapchat style circle or bar) */}
      {isViewing && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '4px',
          background: 'var(--color-danger)',
          width: `${progress}%`,
          transition: 'width 0.1s linear'
        }} />
      )}
    </div>
  );
}
