// src/components/BacteriaBackground.tsx
import React, { useMemo } from 'react';

interface Bacterium {
  id: number;
  x: number;
  y: number;
  rotation: number;
  type: 'rod' | 'coccus' | 'bacillus' | 'cluster';
  floatX: number;
  floatY: number;
  floatZ: number; // Added depth-like movement
  duration: number;
  delay: number;
  driftPattern: 'gentle' | 'active' | 'turbulent';
}

const BacteriaBackground: React.FC = () => {
  const bacteria: Bacterium[] = useMemo(() => {
    const types: Bacterium['type'][] = ['rod', 'coccus', 'bacillus', 'cluster'];
    const patterns: Bacterium['driftPattern'][] = ['gentle', 'active', 'turbulent'];
    
    return Array.from({ length: 35 }, (_, i) => {
      // Random drift pattern determines movement intensity
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      let floatRange = 15; // default
      
      if (pattern === 'gentle') floatRange = 10;
      if (pattern === 'active') floatRange = 25;
      if (pattern === 'turbulent') floatRange = 40;
      
      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        rotation: Math.random() * 360,
        type: types[Math.floor(Math.random() * types.length)],
        // More dramatic random movement (-range to +range)
        floatX: Math.random() * (floatRange * 2) - floatRange,
        floatY: Math.random() * (floatRange * 2) - floatRange,
        floatZ: Math.random() * 0.5 + 0.8, // Scale variation for depth effect (but keeping relative size uniform)
        duration: Math.random() * 25 + 20, // 20-45s for organic timing
        delay: Math.random() * 10, // Random start delay so they don't sync
        driftPattern: pattern,
      };
    });
  }, []);

  const renderBacterium = (b: Bacterium): React.ReactNode => {
    // Each bacterium gets unique movement characteristics
    const baseStyle: React.CSSProperties = {
      left: `${b.x}%`,
      top: `${b.y}%`,
      transform: `rotate(${b.rotation}deg)`,
      '--float-x': `${b.floatX}px`,
      '--float-y': `${b.floatY}px`,
      '--float-z': b.floatZ,
      '--duration': `${b.duration}s`,
      '--delay': `${b.delay}s`,
      '--initial-rotation': `${b.rotation}deg`,
    } as React.CSSProperties;

    // Different animation based on drift pattern
    const animationClass = {
      gentle: 'animate-float-gentle',
      active: 'animate-float-active',
      turbulent: 'animate-float-turbulent',
    }[b.driftPattern];

    switch (b.type) {
      case 'rod':
        return (
          <div
            key={b.id}
            className={`absolute ${animationClass} transition-opacity duration-1000`}
            style={baseStyle}
          >
            <div className="w-14 h-5 bg-brand-orange/40 rounded-full blur-[1px] shadow-[0_0_10px_rgba(241,90,36,0.2)]" />
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-brand-orange/20 rotate-[-15deg] origin-right" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-brand-orange/20 rotate-[15deg] origin-left" />
          </div>
        );

      case 'bacillus':
        return (
          <div
            key={b.id}
            className={`absolute ${animationClass} transition-opacity duration-1000`}
            style={baseStyle}
          >
            <div className="w-16 h-6 bg-brand-orange/30 rounded-full blur-[2px] relative">
              <div className="absolute inset-0 border border-brand-orange/20 rounded-full" />
            </div>
          </div>
        );

      case 'coccus':
        return (
          <div
            key={b.id}
            className={`absolute ${animationClass} transition-opacity duration-1000`}
            style={baseStyle}
          >
            <div className="w-8 h-8 bg-brand-orange/40 rounded-full blur-[1px] relative shadow-[0_0_8px_rgba(241,90,36,0.2)]">
              <div className="absolute top-2 left-2 w-2 h-2 bg-white/20 rounded-full" />
            </div>
          </div>
        );

      case 'cluster':
        return (
          <div
            key={b.id}
            className={`absolute ${animationClass} transition-opacity duration-1000`}
            style={baseStyle}
          >
            <div className="relative w-14 h-14 opacity-40">
              <div className="w-7 h-7 bg-brand-orange rounded-full absolute blur-[1px]" />
              <div className="w-7 h-7 bg-brand-orange rounded-full absolute left-5 top-1 blur-[1px]" />
              <div className="w-7 h-7 bg-brand-orange rounded-full absolute left-1 top-5 blur-[1px]" />
              <div className="w-7 h-7 bg-brand-orange rounded-full absolute left-5 top-5 blur-[1px]" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {bacteria.map(renderBacterium)}
      <style>{`
        /* Gentle floating - subtle movement */
        @keyframes float-gentle {
          0%, 100% { 
            transform: translate(0, 0) rotate(var(--initial-rotation)) scale(var(--float-z)); 
          }
          33% { 
            transform: translate(calc(var(--float-x) * 0.3), calc(var(--float-y) * -0.3)) rotate(calc(var(--initial-rotation) + 3deg)) scale(var(--float-z)); 
          }
          66% { 
            transform: translate(calc(var(--float-x) * -0.2), calc(var(--float-y) * 0.2)) rotate(calc(var(--initial-rotation) - 2deg)) scale(var(--float-z)); 
          }
        }
        
        /* Active floating - noticeable movement */
        @keyframes float-active {
          0%, 100% { 
            transform: translate(0, 0) rotate(var(--initial-rotation)) scale(var(--float-z)); 
          }
          25% { 
            transform: translate(calc(var(--float-x) * 0.6), calc(var(--float-y) * 0.4)) rotate(calc(var(--initial-rotation) + 5deg)) scale(var(--float-z)); 
          }
          50% { 
            transform: translate(calc(var(--float-x) * -0.4), calc(var(--float-y) * -0.6)) rotate(calc(var(--initial-rotation) - 3deg)) scale(var(--float-z)); 
          }
          75% { 
            transform: translate(calc(var(--float-x) * 0.2), calc(var(--float-y) * 0.5)) rotate(calc(var(--initial-rotation) + 2deg)) scale(var(--float-z)); 
          }
        }
        
        /* Turbulent floating - chaotic movement */
        @keyframes float-turbulent {
          0%, 100% { 
            transform: translate(0, 0) rotate(var(--initial-rotation)) scale(var(--float-z)); 
          }
          20% { 
            transform: translate(calc(var(--float-x) * 0.8), calc(var(--float-y) * -0.5)) rotate(calc(var(--initial-rotation) + 8deg)) scale(calc(var(--float-z) * 1.05)); 
          }
          40% { 
            transform: translate(calc(var(--float-x) * -0.6), calc(var(--float-y) * 0.8)) rotate(calc(var(--initial-rotation) - 5deg)) scale(calc(var(--float-z) * 0.95)); 
          }
          60% { 
            transform: translate(calc(var(--float-x) * 0.4), calc(var(--float-y) * 0.3)) rotate(calc(var(--initial-rotation) + 10deg)) scale(calc(var(--float-z) * 1.02)); 
          }
          80% { 
            transform: translate(calc(var(--float-x) * -0.7), calc(var(--float-y) * -0.4)) rotate(calc(var(--initial-rotation) - 8deg)) scale(calc(var(--float-z) * 0.98)); 
          }
        }

        .animate-float-gentle {
          animation: float-gentle var(--duration, 25s) ease-in-out var(--delay, 0s) infinite;
        }
        .animate-float-active {
          animation: float-active var(--duration, 20s) ease-in-out var(--delay, 0s) infinite;
        }
        .animate-float-turbulent {
          animation: float-turbulent var(--duration, 18s) ease-in-out var(--delay, 0s) infinite;
        }
      `}</style>
    </div>
  );
};

export default BacteriaBackground;
