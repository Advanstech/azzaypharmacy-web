'use client';

import { useMemo, useState, useEffect, useRef } from 'react';

interface DataPoint {
  day: string;
  amount: number;
}

interface PharmaChartProps {
  data: DataPoint[];
  isDark: boolean;
  accent: string;
  height?: number;
}

export function PharmaChart({ data, isDark, accent, height = 200 }: PharmaChartProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animatedValues, setAnimatedValues] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setMounted(true);
    // Animate values from 0
    const zeros = data.map(() => 0);
    setAnimatedValues(zeros);
    const timers = data.map((d, i) =>
      setTimeout(() => {
        setAnimatedValues(prev => {
          const next = [...prev];
          next[i] = d.amount;
          return next;
        });
      }, 150 + i * 120)
    );
    return () => timers.forEach(clearTimeout);
  }, [data]);

  // Guard against empty data
  const safeData = data && data.length > 0 ? data : [{ day: 'N/A', amount: 0 }];
  const maxVal = Math.max(...safeData.map(d => d.amount), 1);
  const width = 600;
  const padding = { top: 30, right: 20, bottom: 40, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const n = safeData.length;
  const step = n > 1 ? chartW / (n - 1) : chartW;

  // Smooth cubic bezier points
  const points = useMemo(() => {
    return animatedValues.map((val, i) => ({
      x: padding.left + i * step,
      y: padding.top + chartH - (val / maxVal) * chartH,
      val,
      day: safeData[i]?.day ?? '',
    }));
  }, [animatedValues, maxVal, step, chartH, safeData]);

  // Build smooth path (cubic bezier spline)
  const pathD = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (!pathD) return '';
    const bottomY = padding.top + chartH;
    return `${pathD} L ${points[points.length - 1]?.x || 0} ${bottomY} L ${points[0]?.x || 0} ${bottomY} Z`;
  }, [pathD, points, chartH]);

  // Stroke animation
  const [pathLength, setPathLength] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    if (pathRef.current && mounted) {
      const len = pathRef.current.getTotalLength();
      setPathLength(len);
    }
  }, [pathD, mounted]);

  const now = new Date();
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const todayStrShort = dayNames[now.getDay()];
  const todayStrDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height, overflow: 'visible' }}>
      <defs>
        {/* Gradient fill like liquid */}
        <linearGradient id="pharmaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity={isDark ? 0.35 : 0.25} />
          <stop offset="60%" stopColor={accent} stopOpacity={isDark ? 0.12 : 0.08} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </linearGradient>
        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowStrong" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Background grid dots - molecular feel */}
        <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill={isDark ? 'rgba(0,217,255,0.06)' : 'rgba(14,165,233,0.06)'} />
        </pattern>
      </defs>

      {/* Molecular background */}
      <rect x={padding.left} y={padding.top} width={chartW} height={chartH} fill="url(#dots)" rx="8" />

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = padding.top + chartH * t;
        return (
          <line key={t} x1={padding.left} y1={y} x2={width - padding.right} y2={y}
            stroke={isDark ? 'rgba(148,163,184,0.08)' : 'rgba(203,213,225,0.15)'}
            strokeWidth={1} strokeDasharray="4 6" />
        );
      })}

      {/* Area fill */}
      {mounted && areaD && (
        <path d={areaD} fill="url(#pharmaFill)"
          style={{ opacity: mounted ? 1 : 0, transition: 'opacity 1.2s ease' }} />
      )}

      {/* Stroke line */}
      {mounted && pathD && (
        <path ref={pathRef} d={pathD} fill="none" stroke={accent} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round"
          filter="url(#glow)"
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: mounted ? 0 : pathLength,
            transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
      )}

      {/* Data points */}
      {points.map((p, i) => {
        const isToday = p.day === todayStrShort || p.day === todayStrDate || (points.length > 7 && p.day.startsWith('W') && i === points.length - 1);
        const isHovered = hoveredIndex === i;
        const radius = isToday ? 6 : isHovered ? 5 : 3.5;
        return (
          <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: 'pointer' }}>
            {/* Outer glow ring for today */}
            {isToday && (
              <circle cx={p.x} cy={p.y} r={14} fill="none" stroke={accent} strokeWidth={1}
                opacity={0.3}>
                <animate attributeName="r" values="12;16;12" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Point */}
            <circle cx={p.x} cy={p.y} r={radius}
              fill={isDark ? '#0A0E1A' : '#FFFFFF'}
              stroke={isToday ? accent : isHovered ? accent : isDark ? 'rgba(148,163,184,0.4)' : 'rgba(203,213,225,0.6)'}
              strokeWidth={isToday ? 2.5 : 2}
              filter={isToday || isHovered ? 'url(#glow)' : undefined}
              style={{ transition: 'all 0.3s ease' }} />
            {/* Tooltip on hover */}
            {(isHovered || isToday) && p.val > 0 && (
              <g>
                <rect x={p.x - 35} y={p.y - 42} width={70} height={28} rx={8}
                  fill={isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)'}
                  stroke={accent} strokeWidth={1} strokeOpacity={0.3}
                  style={{ backdropFilter: 'blur(8px)' }} />
                <text x={p.x} y={p.y - 23} textAnchor="middle"
                  fill={isDark ? '#F8FAFC' : '#0F172A'}
                  fontSize="11" fontWeight="600" fontFamily="monospace">
                  GH₵{p.val.toLocaleString('en-GH')}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* X-axis labels */}
      {points.map((p, i) => {
        const isToday = p.day === todayStrShort || p.day === todayStrDate || (points.length > 7 && p.day.startsWith('W') && i === points.length - 1);
        
        const tooMany = points.length > 10;
        const interval = Math.ceil(points.length / 7);
        
        let show = !tooMany;
        if (tooMany) {
          if (i === points.length - 1 || i === 0) {
            show = true;
          } else if (i % interval === 0 && (points.length - 1 - i) >= (interval * 0.7)) {
            show = true;
          }
        }

        if (!show) return null;

        return (
          <text key={`label-${i}`} x={p.x} y={height - 12} textAnchor="middle"
            fill={isToday ? accent : isDark ? '#64748B' : '#94A3B8'}
            fontSize="10" fontWeight={isToday ? 600 : 500}
            style={{ transition: 'all 0.3s ease' }}>
            {p.day}
          </text>
        );
      })}
    </svg>
  );
}

// Animated counter component
export function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1500, isDark }: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  isDark: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const startTime = useRef<number>(Date.now());
  const raf = useRef<number>(0);

  useEffect(() => {
    startTime.current = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  const formatted = display.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <span className="font-mono tabular-nums" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// Molecular particle background
export function MolecularBg({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }

    let anim = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(0,217,255,${p.alpha})`
          : `rgba(14,165,233,${p.alpha})`;
        ctx.fill();

        // Connect nearby particles
        particles.slice(i + 1).forEach(p2 => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = isDark
              ? `rgba(0,217,255,${0.08 * (1 - dist / 100)})`
              : `rgba(14,165,233,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      anim = requestAnimationFrame(draw);
    };
    anim = requestAnimationFrame(draw);

    const handleResize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDark]);

  return (
    <canvas ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
  );
}

export default PharmaChart;
