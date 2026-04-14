import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Bacterium {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  type: "rod" | "coccus" | "spiral" | "vibrio" | "bacillus";
  opacity: number;
  drift: { x: number; y: number };
  rotationSpeed: number;
}

const generateBacteria = (count: number): Bacterium[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 10 + Math.random() * 24,
    rotation: Math.random() * 360,
    type: (["rod", "coccus", "spiral", "vibrio", "bacillus"] as const)[
      Math.floor(Math.random() * 5)
    ],
    opacity: 0.4 + Math.random() * 0.5,
    drift: { x: (Math.random() - 0.5) * 0.25, y: (Math.random() - 0.5) * 0.25 },
    rotationSpeed: (Math.random() - 0.5) * 2,
  }));

const BacteriaShape = ({ type, size }: { type: string; size: number }) => {
  if (type === "rod") {
    return (
      <svg width={size * 2.5} height={size} viewBox="0 0 50 20">
        <rect x="5" y="3" width="40" height="14" rx="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="25" y1="3" x2="25" y2="17" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      </svg>
    );
  }
  if (type === "coccus") {
    return (
      <svg width={size * 1.5} height={size * 1.5} viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="15" cy="15" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      </svg>
    );
  }
  if (type === "spiral") {
    return (
      <svg width={size * 3} height={size} viewBox="0 0 60 20">
        <path d="M5 10 Q15 2 25 10 Q35 18 45 10 Q55 2 58 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "vibrio") {
    return (
      <svg width={size * 2} height={size * 1.5} viewBox="0 0 40 30">
        <path d="M5 25 Q20 -5 35 15" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="35" cy="15" r="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      </svg>
    );
  }
  // bacillus — chain of rods
  return (
    <svg width={size * 3.5} height={size} viewBox="0 0 70 20">
      <rect x="3" y="4" width="18" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="25" y="4" width="18" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="47" y="4" width="18" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -300, y: -300 });
  const [bacteria] = useState(() => generateBacteria(60));
  const [positions, setPositions] = useState<{ x: number; y: number; rotation: number }[]>([]);

  useEffect(() => {
    setPositions(bacteria.map((b) => ({ x: b.x, y: b.y, rotation: b.rotation })));
    const interval = setInterval(() => {
      setPositions((prev) =>
        prev.map((p, i) => ({
          x: (p.x + bacteria[i].drift.x + 100) % 100,
          y: (p.y + bacteria[i].drift.y + 100) % 100,
          rotation: p.rotation + bacteria[i].rotationSpeed,
        }))
      );
    }, 60);
    return () => clearInterval(interval);
  }, [bacteria]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const torchRadius = 220;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos({ x: -300, y: -300 })}
      className="relative min-h-screen overflow-hidden bg-background cursor-none"
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-bg opacity-50" />

      {/* Torch glow */}
      <div
        className="pointer-events-none fixed z-10 rounded-full"
        style={{
          left: mousePos.x - torchRadius,
          top: mousePos.y - torchRadius,
          width: torchRadius * 2,
          height: torchRadius * 2,
          background: `radial-gradient(circle, hsl(24 100% 50% / 0.1) 0%, hsl(24 100% 50% / 0.03) 50%, transparent 70%)`,
        }}
      />

      {/* Bacteria layer */}
      <div className="absolute inset-0 pointer-events-none z-[5]">
        {bacteria.map((b, i) => {
          if (!positions[i]) return null;
          const bx = (positions[i].x / 100) * (containerRef.current?.clientWidth || 1);
          const by = (positions[i].y / 100) * (containerRef.current?.clientHeight || 1);
          const dist = Math.sqrt((bx - mousePos.x) ** 2 + (by - mousePos.y) ** 2);
          const visible = dist < torchRadius;
          const intensity = visible ? Math.max(0, 1 - dist / torchRadius) : 0;

          return (
            <div
              key={b.id}
              className="absolute transition-opacity duration-300 text-primary"
              style={{
                left: `${positions[i].x}%`,
                top: `${positions[i].y}%`,
                transform: `rotate(${positions[i].rotation}deg)`,
                opacity: intensity * b.opacity,
              }}
            >
              <BacteriaShape type={b.type} size={b.size} />
            </div>
          );
        })}
      </div>

      {/* Content — simple and clean */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-6">
        <h1 className="font-serif italic text-7xl md:text-9xl text-foreground text-center leading-none mb-6">
          Resist<span className="text-primary">AI</span>
        </h1>

        <p className="text-muted-foreground font-body text-lg md:text-xl text-center max-w-lg mb-3 font-light">
          Predict antibiotic resistance from genomic sequences — instantly.
        </p>

        <p className="text-muted-foreground/40 font-mono text-[11px] mb-12 tracking-wider">
          [ hover to reveal bacteria ]
        </p>

        <Button
          size="lg"
          className="font-display text-xs tracking-wider uppercase gap-2 px-8"
        >
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
