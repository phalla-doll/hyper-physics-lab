import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Settings2, Sliders } from 'lucide-react';

interface TesseractProps {
  isActive: boolean;
}

// 4D Vertex definition
type Point4D = [number, number, number, number];
type Point3D = { x: number; y: number; z: number };

export default function Tesseract({ isActive }: TesseractProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.01);
  const [showControls, setShowControls] = useState(true);
  
  // Rotation angles for different planes
  const anglesRef = useRef({
    xy: 0, xz: 0, xw: 0,
    yz: 0, yw: 0, zw: 0
  });

  // Active rotation planes
  const [activeRotations, setActiveRotations] = useState({
    xy: false, xz: false, xw: true,
    yz: false, yw: true, zw: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Tesseract vertices (Hypercube)
    // 16 vertices: (+-1, +-1, +-1, +-1)
    const vertices: Point4D[] = [];
    for (let i = 0; i < 16; i++) {
      vertices.push([
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1
      ]);
    }

    // Edges connect vertices that differ by exactly 1 coordinate
    const edges: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) {
          if (vertices[i][k] !== vertices[j][k]) diff++;
        }
        if (diff === 1) edges.push([i, j]);
      }
    }

    const project = (point: Point4D) => {
      // 4D to 3D projection
      // Using perspective projection: w affects the scale
      const distance = 3; // Camera distance from 4D object in w-axis
      const wScale = 1 / (distance - point[3]);
      
      const p3d = {
        x: point[0] * wScale,
        y: point[1] * wScale,
        z: point[2] * wScale
      };

      // 3D to 2D projection (standard perspective)
      const fov = 300;
      const zDistance = 4;
      const zScale = 1 / (zDistance - p3d.z);
      
      return {
        x: p3d.x * fov * zScale,
        y: p3d.y * fov * zScale,
        z: p3d.z,
        scale: zScale,
        w: point[3] // Pass original W for 4D depth cues
      };
    };

    const rotate = (p: Point4D, angles: typeof anglesRef.current): Point4D => {
      let [x, y, z, w] = p;
      
      // Rotation matrices logic
      // XY Plane
      if (angles.xy !== 0) {
        const c = Math.cos(angles.xy);
        const s = Math.sin(angles.xy);
        const nx = x * c - y * s;
        const ny = x * s + y * c;
        x = nx; y = ny;
      }
      
      // XZ Plane
      if (angles.xz !== 0) {
        const c = Math.cos(angles.xz);
        const s = Math.sin(angles.xz);
        const nx = x * c - z * s;
        const nz = x * s + z * c;
        x = nx; z = nz;
      }

      // XW Plane
      if (angles.xw !== 0) {
        const c = Math.cos(angles.xw);
        const s = Math.sin(angles.xw);
        const nx = x * c - w * s;
        const nw = x * s + w * c;
        x = nx; w = nw;
      }

      // YZ Plane
      if (angles.yz !== 0) {
        const c = Math.cos(angles.yz);
        const s = Math.sin(angles.yz);
        const ny = y * c - z * s;
        const nz = y * s + z * c;
        y = ny; z = nz;
      }

      // YW Plane
      if (angles.yw !== 0) {
        const c = Math.cos(angles.yw);
        const s = Math.sin(angles.yw);
        const ny = y * c - w * s;
        const nw = y * s + w * c;
        y = ny; w = nw;
      }

      // ZW Plane
      if (angles.zw !== 0) {
        const c = Math.cos(angles.zw);
        const s = Math.sin(angles.zw);
        const nz = z * c - w * s;
        const nw = z * s + w * c;
        z = nz; w = nw;
      }

      return [x, y, z, w];
    };

    const render = () => {
      if (!canvas || !ctx) return;
      
      // Update dimensions
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Center origin
      const cx = width / 2;
      const cy = height / 2;

      // Update angles
      if (isPlaying) {
        if (activeRotations.xy) anglesRef.current.xy += rotationSpeed;
        if (activeRotations.xz) anglesRef.current.xz += rotationSpeed;
        if (activeRotations.xw) anglesRef.current.xw += rotationSpeed;
        if (activeRotations.yz) anglesRef.current.yz += rotationSpeed;
        if (activeRotations.yw) anglesRef.current.yw += rotationSpeed;
        if (activeRotations.zw) anglesRef.current.zw += rotationSpeed;
      }

      // Transform and Project Vertices
      const projectedPoints = vertices.map(v => {
        const rotated = rotate(v, anglesRef.current);
        return project(rotated);
      });

      // Sort edges by depth (painters algorithm approximation)
      // We'll use the average Z of the two points
      const sortedEdges = edges.map(([i, j]) => {
        const p1 = projectedPoints[i];
        const p2 = projectedPoints[j];
        return { i, j, z: (p1.z + p2.z) / 2 };
      }).sort((a, b) => b.z - a.z); // Draw back to front

      // Draw Edges
      ctx.lineCap = 'round';

      sortedEdges.forEach(({ i, j }) => {
        const p1 = projectedPoints[i];
        const p2 = projectedPoints[j];

        // Calculate depth cues
        // Scale factor: larger = closer
        const avgScale = (p1.scale + p2.scale) / 2;
        
        // 4D Depth factor (W coordinate): -1 to 1
        // We use this to shift hue
        const avgW = (p1.w + p2.w) / 2;
        
        // Map W to Hue: -1 (inner/far in 4D) -> Purple/Blue, 1 (outer/close in 4D) -> Cyan/Green
        // We want a subtle shift.
        // Base hue: 190 (Cyan)
        // Shift: +/- 40
        const hue1 = 190 + p1.w * 60; 
        const hue2 = 190 + p2.w * 60;

        // Opacity based on Z-depth (scale)
        // Scale typically ranges 0.2 (far) to 0.5 (close) in this setup
        const alpha = Math.min(1, Math.max(0.1, avgScale * 2.5));
        
        // Line width based on scale
        const lineWidth = Math.max(0.5, avgScale * 8);

        // Create gradient
        const grad = ctx.createLinearGradient(cx + p1.x, cy + p1.y, cx + p2.x, cy + p2.y);
        grad.addColorStop(0, `hsla(${hue1}, 100%, 60%, ${alpha})`);
        grad.addColorStop(1, `hsla(${hue2}, 100%, 60%, ${alpha})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = lineWidth;
        
        // Blur effect for depth of field
        // If scale is very small (far away) or very large (too close), blur it
        // Focus plane is at some middle scale
        const focusScale = 0.35;
        const blurAmount = Math.abs(avgScale - focusScale) * 10;
        ctx.filter = `blur(${Math.max(0, blurAmount)}px)`;
        
        // Glow
        ctx.shadowBlur = avgScale * 20;
        ctx.shadowColor = `hsla(${hue1}, 80%, 60%, ${alpha * 0.5})`;
        
        ctx.beginPath();
        ctx.moveTo(cx + p1.x, cy + p1.y);
        ctx.lineTo(cx + p2.x, cy + p2.y);
        ctx.stroke();
      });
      
      // Reset filter for vertices
      ctx.filter = 'none';

      // Draw Vertices
      projectedPoints.forEach(p => {
        // Size based on scale
        const radius = Math.max(1, p.scale * 10);
        const alpha = Math.min(1, Math.max(0.2, p.scale * 3));
        const hue = 190 + p.w * 60;

        ctx.fillStyle = '#fff';
        ctx.shadowBlur = radius * 2;
        ctx.shadowColor = `hsla(${hue}, 100%, 70%, 1)`;
        ctx.globalAlpha = alpha;
        
        ctx.beginPath();
        ctx.arc(cx + p.x, cy + p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, isPlaying, rotationSpeed, activeRotations]);

  const toggleRotation = (axis: keyof typeof activeRotations) => {
    setActiveRotations(prev => ({ ...prev, [axis]: !prev[axis] }));
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
      
      {/* Info Overlay */}
      <div className="absolute top-8 left-8 max-w-xs">
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">4D Tesseract</h2>
        <p className="text-sm text-white/60 leading-relaxed">
          A projection of a 4-dimensional hypercube into 3D space. 
          Rotate along the W-axis (XW, YW, ZW) to see the structure fold through itself—a phenomenon impossible in standard 3D geometry.
        </p>
      </div>

      {/* Overlay Controls */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <div className="flex flex-col gap-6 w-[320px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">4D Controls</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  anglesRef.current = { xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0 };
                }}
                className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                title="Reset Orientation"
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
              <label className="text-xs text-white/40 mb-2 block">Rotation Speed</label>
              <input 
                type="range" 
                min="0" 
                max="0.05" 
                step="0.001" 
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Object.keys(activeRotations).map((axis) => (
                <button
                  key={axis}
                  onClick={() => toggleRotation(axis as keyof typeof activeRotations)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono transition-all border ${
                    activeRotations[axis as keyof typeof activeRotations]
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                  }`}
                >
                  {axis.toUpperCase()}
                </button>
              ))}
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
