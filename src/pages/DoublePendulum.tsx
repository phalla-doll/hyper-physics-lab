import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Settings2, Trash2 } from 'lucide-react';

interface PendulumProps {
  isActive: boolean;
}

// Physics constants
const G = 1; // Gravity (scaled for visual)

interface PendulumState {
  a1: number; // Angle 1
  a2: number; // Angle 2
  v1: number; // Velocity 1
  v2: number; // Velocity 2
  color: string;
  path: {x: number, y: number}[];
}

export default function DoublePendulum({ isActive }: PendulumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [pendulumCount, setPendulumCount] = useState(50);
  const [traceLength, setTraceLength] = useState(100);
  const [showControls, setShowControls] = useState(true);
  
  // Simulation state
  const pendulumsRef = useRef<PendulumState[]>([]);
  const paramsRef = useRef({
    m1: 10, // Mass 1
    m2: 10, // Mass 2
    l1: 100, // Length 1
    l2: 100, // Length 2
    damping: 0.999 // Air resistance
  });

  const initPendulums = React.useCallback(() => {
    const newPendulums: PendulumState[] = [];
    const baseHue = Math.random() * 360;
    
    for (let i = 0; i < pendulumCount; i++) {
      // Tiny variations in initial angle
      const variance = 0.0001 * i;
      
      newPendulums.push({
        a1: Math.PI / 2 + variance,
        a2: Math.PI / 2 + variance,
        v1: 0,
        v2: 0,
        color: `hsla(${(baseHue + i * 2) % 360}, 80%, 60%, 0.6)`,
        path: []
      });
    }
    pendulumsRef.current = newPendulums;
  }, [pendulumCount]);

  useEffect(() => {
    initPendulums();
  }, [initPendulums]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const updatePhysics = () => {
      const { m1, m2, l1, l2, damping } = paramsRef.current;

      pendulumsRef.current.forEach(p => {
        // Lagrangian mechanics for double pendulum
        // Numerator for acceleration 1
        let num1 = -G * (2 * m1 + m2) * Math.sin(p.a1);
        let num2 = -m2 * G * Math.sin(p.a1 - 2 * p.a2);
        let num3 = -2 * Math.sin(p.a1 - p.a2) * m2;
        let num4 = p.v2 * p.v2 * l2 + p.v1 * p.v1 * l1 * Math.cos(p.a1 - p.a2);
        let den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * p.a1 - 2 * p.a2));
        
        let a1_acc = (num1 + num2 + num3 * num4) / den;

        // Numerator for acceleration 2
        num1 = 2 * Math.sin(p.a1 - p.a2);
        num2 = (p.v1 * p.v1 * l1 * (m1 + m2));
        num3 = G * (m1 + m2) * Math.cos(p.a1);
        num4 = p.v2 * p.v2 * l2 * m2 * Math.cos(p.a1 - p.a2);
        den = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * p.a1 - 2 * p.a2));
        
        let a2_acc = (num1 * (num2 + num3 + num4)) / den;

        // Update velocity
        p.v1 += a1_acc;
        p.v2 += a2_acc;

        // Apply damping
        p.v1 *= damping;
        p.v2 *= damping;

        // Update position
        p.a1 += p.v1;
        p.a2 += p.v2;

        // Calculate cartesian coordinates for path
        // Note: We calculate this relative to origin (0,0)
        // The render function will translate to center
        const x1 = l1 * Math.sin(p.a1);
        const y1 = l1 * Math.cos(p.a1);
        const x2 = x1 + l2 * Math.sin(p.a2);
        const y2 = y1 + l2 * Math.cos(p.a2);

        p.path.push({ x: x2, y: y2 });

        // Limit path length
        if (p.path.length > traceLength) {
          p.path.shift();
        }
      });
    };

    const render = () => {
      if (!canvas || !ctx) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Fade effect for trails
      // Instead of clearing completely, we draw a semi-transparent black rect
      // This creates a "motion blur" effect for the moving parts, but for the static trails we want them to persist
      // Actually, for this specific "chaos" viz, clearing and redrawing the path array is cleaner
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 3; // Start pendulums a bit higher up

      if (isPlaying) {
        updatePhysics();
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw trails
      // We draw trails first so the pendulum arms are on top
      pendulumsRef.current.forEach(p => {
        if (p.path.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        
        // Draw the path
        for (let i = 0; i < p.path.length - 1; i++) {
          // Fade out tail
          const alpha = i / p.path.length;
          ctx.globalAlpha = alpha;
          
          // We need to beginPath/stroke for each segment if we want gradient alpha along the line
          // Or we can just use a global alpha for the whole line if we accept it looking uniform
          // Let's do segment drawing for better fade effect
          ctx.beginPath();
          ctx.moveTo(cx + p.path[i].x, cy + p.path[i].y);
          ctx.lineTo(cx + p.path[i+1].x, cy + p.path[i+1].y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });

      // Draw pendulum arms (only for the last one to avoid clutter, or maybe all with low opacity?)
      // Let's draw the arms for the first few to show the structure, or just the "average" one?
      // Actually, drawing 50 arms is messy. Let's draw just the masses as dots.
      
      pendulumsRef.current.forEach((p, index) => {
        // Only draw arms for the first one to show the mechanism
        if (index === 0) {
            const x1 = paramsRef.current.l1 * Math.sin(p.a1);
            const y1 = paramsRef.current.l1 * Math.cos(p.a1);
            const x2 = x1 + paramsRef.current.l2 * Math.sin(p.a2);
            const y2 = y1 + paramsRef.current.l2 * Math.cos(p.a2);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + x1, cy + y1);
            ctx.lineTo(cx + x2, cy + y2);
            ctx.stroke();

            // Joints
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + x1, cy + y1, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw the end mass for all
        const lastPos = p.path[p.path.length - 1];
        if (lastPos) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(cx + lastPos.x, cy + lastPos.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, isPlaying, traceLength, pendulumCount]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />

      {/* Info Overlay */}
      <div className="absolute top-8 left-8 max-w-xs">
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Double Pendulum Chaos</h2>
        <p className="text-sm text-white/60 leading-relaxed">
          A demonstration of the Butterfly Effect. 
          {pendulumCount} pendulums start with nearly identical conditions, but microscopic differences amplify over time, causing their paths to diverge wildly into beautiful chaos.
        </p>
      </div>

      {/* Overlay Controls */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <div className="flex flex-col gap-6 w-[320px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">Chaos Controls</h3>
            <div className="flex gap-2">
              <button 
                onClick={initPendulums}
                className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                title="Restart Simulation"
              >
                <RotateCcw size={16} />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-full text-white transition-colors shadow-lg shadow-indigo-500/20"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs text-white/40">Pendulum Count</label>
                <span className="text-xs font-mono text-white/60">{pendulumCount}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                step="1" 
                value={pendulumCount}
                onChange={(e) => setPendulumCount(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs text-white/40">Trail Length</label>
                <span className="text-xs font-mono text-white/60">{traceLength}</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="500" 
                step="10" 
                value={traceLength}
                onChange={(e) => setTraceLength(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Controls Button */}
      <button 
        onClick={() => setShowControls(!showControls)}
        className="absolute bottom-8 right-8 p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white/60 hover:text-white transition-all"
      >
        <Settings2 size={20} />
      </button>
    </div>
  );
}
