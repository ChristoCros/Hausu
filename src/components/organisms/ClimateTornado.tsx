'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Thermometer, RefreshCw, AlertTriangle, Globe } from 'lucide-react';
import Panel from '../atoms/Panel';


// ============================================================
// Constants
// ============================================================
const CX = 400;
const CY = 400;
const MIN_RADIUS = 80;
const MAX_RADIUS = 330;
const TEMP_MIN = -1.0;
const TEMP_MAX = 2.0;
const TEMP_RANGE = TEMP_MAX - TEMP_MIN;
const MONTH_LABELS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

// ============================================================
// Seeded PRNG (Mulberry32) — deterministic across renders
// ============================================================
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================
// Data types & generation
// ============================================================
interface YearData {
  year: number;
  months: number[]; // 12 anomaly values (Jan=0 … Dec=11)
  avg: number;
}

function generateAllData(): YearData[] {
  const rand = mulberry32(42);
  const result: YearData[] = [];

  for (let y = 1926; y <= 2025; y++) {
    const t = (y - 1926) / 99;
    // Accelerating warming trend
    const baseTrend = -0.3 + Math.pow(t, 1.3) * 1.8;
    // Decadal oscillation (PDO / AMO - like)
    const decadal = Math.sin(((y - 1920) / 30) * Math.PI * 2) * 0.08;
    // Year-level noise
    const yearNoise = (rand() - 0.5) * 0.25;

    const months: number[] = [];
    for (let m = 0; m < 12; m++) {
      // Subtle seasonal modulation
      const seasonal = Math.sin(((m - 1) / 12) * Math.PI * 2) * 0.06;
      const monthNoise = (rand() - 0.5) * 0.14;
      const val = baseTrend + decadal + yearNoise + seasonal + monthNoise;
      months.push(parseFloat(val.toFixed(3)));
    }

    const avg = parseFloat((months.reduce((a, b) => a + b, 0) / 12).toFixed(3));
    result.push({ year: y, months, avg });
  }

  return result;
}

// Module-level so it's generated once
const INITIAL_DATA = generateAllData();

// ============================================================
// Geometry helpers
// ============================================================
function tempToRadius(temp: number): number {
  const clamped = Math.max(TEMP_MIN - 0.3, Math.min(TEMP_MAX + 0.3, temp));
  return MIN_RADIUS + ((clamped - TEMP_MIN) / TEMP_RANGE) * (MAX_RADIUS - MIN_RADIUS);
}

function monthToAngle(m: number): number {
  return (m / 12) * 2 * Math.PI - Math.PI / 2;
}

function polar(r: number, angle: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

// ============================================================
// Color scale  (blue → cyan → green → yellow → orange → red)
// ============================================================
const COLOR_STOPS = [
  { t: 0.0, r: 21, g: 101, b: 192 },
  { t: 0.2, r: 41, g: 182, b: 246 },
  { t: 0.35, r: 77, g: 208, b: 180 },
  { t: 0.5, r: 255, g: 235, b: 100 },
  { t: 0.7, r: 255, g: 152, b: 0 },
  { t: 0.85, r: 239, g: 83, b: 80 },
  { t: 1.0, r: 183, g: 28, b: 28 },
];

function anomalyToColor(anomaly: number): string {
  const t = Math.max(0, Math.min(1, (anomaly - TEMP_MIN) / TEMP_RANGE));

  let lo = COLOR_STOPS[0],
    hi = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (t >= COLOR_STOPS[i].t && t <= COLOR_STOPS[i + 1].t) {
      lo = COLOR_STOPS[i];
      hi = COLOR_STOPS[i + 1];
      break;
    }
  }

  const f = hi.t === lo.t ? 0 : (t - lo.t) / (hi.t - lo.t);
  const r = Math.round(lo.r + (hi.r - lo.r) * f);
  const g = Math.round(lo.g + (hi.g - lo.g) * f);
  const b = Math.round(lo.b + (hi.b - lo.b) * f);
  return `rgb(${r},${g},${b})`;
}

// ============================================================
// Catmull-Rom closed spline → SVG cubic bezier path
// ============================================================
function createYearPath(months: number[]): string {
  const pts: [number, number][] = months.map((temp, i) => {
    const angle = monthToAngle(i);
    return polar(tempToRadius(temp), angle);
  });

  const n = pts.length;
  const tension = 0.5;

  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    const cp1x = p1[0] + ((p2[0] - p0[0]) * tension) / 3;
    const cp1y = p1[1] + ((p2[1] - p0[1]) * tension) / 3;
    const cp2x = p2[0] - ((p3[0] - p1[0]) * tension) / 3;
    const cp2y = p2[1] - ((p3[1] - p1[1]) * tension) / 3;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }

  return d + ' Z';
}

// ============================================================
// Reference temperature circles
// ============================================================
const REF_TEMPS = [
  { temp: -0.5, label: '−0.5°C' },
  { temp: 0, label: '0°C' },
  { temp: 0.5, label: '+0.5°C' },
  { temp: 1.0, label: '+1.0°C' },
  { temp: 1.5, label: '+1.5°C' },
];

// ============================================================
// Component
// ============================================================
export default function ClimateTornado() {
  const [data, setData] = useState<YearData[]>(INITIAL_DATA);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [latestAnomaly, setLatestAnomaly] = useState(1.48);
  const [currentDate, setCurrentDate] = useState('Mai 2026');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    year: number;
    avg: number;
  } | null>(null);

  // Trigger staggered entrance animation
  useEffect(() => {
    const id = setTimeout(() => setIsLoaded(true), 80);
    return () => clearTimeout(id);
  }, []);

  // ── Simulation ──
  const simulationMonths = [
    'Juin 2026', 'Juillet 2026', 'Août 2026', 'Septembre 2026',
    'Octobre 2026', 'Novembre 2026', 'Décembre 2026', 'Janvier 2027',
    'Février 2027', 'Mars 2027', 'Avril 2027', 'Mai 2027',
  ];

  const triggerNextMonth = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const monthName = simulationMonths[currentMonthIndex % simulationMonths.length];
      const nextIdx = currentMonthIndex + 1;
      const simYear = 2026 + Math.floor(nextIdx / 12);
      const trend = -0.3 + Math.pow((simYear - 1926) / 99, 1.3) * 1.8;
      const noise = (Math.random() - 0.4) * 0.15;
      const newAnomaly = parseFloat((trend + noise).toFixed(2));

      setLatestAnomaly(newAnomaly);
      setCurrentDate(monthName);
      setCurrentMonthIndex(nextIdx);

      setData((prev) => {
        const copy = [...prev];
        const yIdx = copy.findIndex((d) => d.year === simYear);
        if (yIdx !== -1) {
          const mIdx = (nextIdx - 1) % 12;
          const newMonths = [...copy[yIdx].months];
          newMonths[mIdx] = newAnomaly;
          const avg = parseFloat((newMonths.reduce((a, b) => a + b, 0) / 12).toFixed(3));
          copy[yIdx] = { year: simYear, months: newMonths, avg };
        } else {
          const months = Array(12).fill(newAnomaly);
          copy.push({ year: simYear, months, avg: newAnomaly });
        }
        return copy;
      });

      setIsSimulating(false);
    }, 800);
  };

  // ── Hover handlers ──
  const handlePathHover = useCallback(
    (e: React.MouseEvent, yd: YearData) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const clientWidth = containerRef.current?.clientWidth ?? 600;
        const xPos = e.clientX - rect.left;
        const yPos = e.clientY - rect.top;
        setTooltip({
          x: Math.min(xPos + 16, clientWidth - 180),
          y: yPos - 15,
          year: yd.year,
          avg: yd.avg,
        });
      }
      setHoveredYear(yd.year);
    },
    [],
  );

  const handlePathLeave = useCallback(() => {
    setTooltip(null);
    setHoveredYear(null);
  }, []);

  // ── Memoised paths ──
  const yearPaths = useMemo(() => {
    return data.map((yd) => ({
      ...yd,
      d: createYearPath(yd.months),
      color: anomalyToColor(yd.avg),
    }));
  }, [data]);

  const latestYear = data.length > 0 ? data[data.length - 1].year : 2025;

  // ── Render ──
  return (
    <div className="climate-grid">
      {/* ───────── Spiral Panel ───────── */}
      <Panel data-testid="climate-spiral-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div>
            <h2
              className="title-font"
              style={{ fontSize: '22px', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Globe size={24} color="var(--accent-orange)" strokeWidth={1.5} />
              SPIRALE CLIMATIQUE
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Anomalies de température globale — 100 ans (1926–2025) vs moyenne 1951-1980
            </div>
          </div>

          {/* Inline color legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
            <span>−1°C</span>
            <div
              style={{
                width: '120px',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, ${anomalyToColor(-1)}, ${anomalyToColor(-0.3)}, ${anomalyToColor(0.2)}, ${anomalyToColor(0.8)}, ${anomalyToColor(1.3)}, ${anomalyToColor(2)})`,
              }}
            />
            <span>+2°C</span>
          </div>
        </div>

        {/* SVG container */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
          }}
        >
          <svg
            viewBox="0 0 800 800"
            data-testid="climate-spiral-svg"
            style={{ width: '100%', height: '100%', maxWidth: '680px', maxHeight: '680px' }}
          >
            {/* Defs */}
            <defs>
              <radialGradient id="spiralBgGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,87,34,0.04)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>

            {/* Subtle background glow */}
            <circle cx={CX} cy={CY} r={MAX_RADIUS + 30} fill="url(#spiralBgGlow)" />

            {/* Radial month guide lines */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = monthToAngle(i);
              const [x1, y1] = polar(MIN_RADIUS - 8, a);
              const [x2, y2] = polar(MAX_RADIUS + 12, a);
              return (
                <line
                  key={`rad-${i}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="var(--border-color)"
                  strokeWidth={0.4}
                  opacity={0.35}
                />
              );
            })}

            {/* Reference temperature circles */}
            {REF_TEMPS.map(({ temp, label }) => {
              const r = tempToRadius(temp);
              const isZero = temp === 0;
              return (
                <g key={`ref-${temp}`} data-testid={`ref-circle-${temp}`}>
                  <circle
                    cx={CX} cy={CY} r={r}
                    fill="none"
                    stroke={isZero ? 'rgba(255,255,255,0.25)' : 'var(--border-color)'}
                    strokeWidth={isZero ? 1.2 : 0.5}
                    strokeDasharray={isZero ? 'none' : '4 3'}
                    opacity={0.55}
                  />
                  {/* Label at ~1 o'clock position */}
                  <text
                    x={CX + 6}
                    y={CY - r + 3}
                    fill="var(--text-secondary)"
                    fontSize="9"
                    fontFamily="Inter, sans-serif"
                    opacity={0.6}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Month labels */}
            {MONTH_LABELS.map((name, i) => {
              const a = monthToAngle(i);
              const [x, y] = polar(MAX_RADIUS + 32, a);
              return (
                <text
                  key={`ml-${i}`}
                  data-testid={`month-label-${i}`}
                  x={x} y={y}
                  fill="var(--accent-orange)"
                  fontSize="11"
                  fontFamily="Space Grotesk, sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="central"
                  letterSpacing="1"
                  opacity={0.85}
                >
                  {name}
                </text>
              );
            })}

            {/* ── Year paths (the spiral) ── */}
            {yearPaths.map((yp, idx) => {
              const total = yearPaths.length;
              const isHovered = hoveredYear === yp.year;
              const baseOpacity = 0.25 + (idx / total) * 0.65;
              const delayS = idx * 0.018;

              return (
                <path
                  key={`yp-${yp.year}`}
                  data-testid={`year-path-${yp.year}`}
                  d={yp.d}
                  fill="none"
                  stroke={yp.color}
                  strokeWidth={isHovered ? 2.8 : idx > total - 10 ? 1.6 : 0.9}
                  strokeLinejoin="round"
                  opacity={
                    isLoaded
                      ? isHovered
                        ? 1
                        : hoveredYear !== null
                          ? 0.12
                          : baseOpacity
                      : 0
                  }
                  style={{
                    transition: `opacity 0.4s ease ${delayS}s, stroke-width 0.2s ease`,
                    filter: isHovered ? `drop-shadow(0 0 8px ${yp.color})` : 'none',
                    cursor: 'pointer',
                  }}
                  onMouseMove={(e) => handlePathHover(e, yp)}
                  onMouseLeave={handlePathLeave}
                />
              );
            })}

            {/* ── Center hub ── */}
            <circle cx={CX} cy={CY} r={42} fill="var(--panel-bg)" stroke="var(--border-color)" strokeWidth={1} />
            <circle
              cx={CX} cy={CY} r={40}
              fill="none"
              stroke="var(--accent-orange)"
              strokeWidth={1.8}
              opacity={0.7}
              strokeDasharray="3 3"
            />
            <text
              data-testid="center-year-label"
              x={CX} y={hoveredYear ? CY - 7 : CY}
              fill="var(--accent-orange)"
              fontSize="22"
              fontFamily="Space Grotesk, sans-serif"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {hoveredYear ?? latestYear}
            </text>
            {hoveredYear != null && (() => {
              const avg = data.find((d) => d.year === hoveredYear)?.avg ?? 0;
              return (
                <text
                  x={CX} y={CY + 13}
                  fill={anomalyToColor(avg)}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {avg >= 0 ? '+' : ''}{avg.toFixed(2)}°C
                </text>
              );
            })()}
          </svg>

          {/* ── Floating tooltip ── */}
          {tooltip && (
            <div
              data-testid="spiral-tooltip"
              style={{
                position: 'absolute',
                left: tooltip.x,
                top: tooltip.y,
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                pointerEvents: 'none',
                zIndex: 10,
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>
                Année {tooltip.year}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: anomalyToColor(tooltip.avg),
                    boxShadow: `0 0 6px ${anomalyToColor(tooltip.avg)}`,
                  }}
                />
                Anomalie moy.&nbsp;:&nbsp;
                <strong style={{ color: anomalyToColor(tooltip.avg) }}>
                  {tooltip.avg >= 0 ? `+${tooltip.avg.toFixed(2)}` : tooltip.avg.toFixed(2)}°C
                </strong>
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* ───────── Side Panel ───────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Monthly update bubble */}
        <Panel
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 87, 34, 0.05)',
              borderRadius: '50%',
            }}
          />

          {/* Thermometer orb */}
          <div
            data-testid="thermometer-orb"
            style={{
              position: 'relative',
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              background: 'var(--bg-color)',
              border: '2px solid var(--accent-orange)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(255, 87, 34, 0.15)',
              marginBottom: '20px',
            }}
          >
            <Thermometer size={32} color="var(--accent-orange)" strokeWidth={1.5} style={{ marginBottom: '4px' }} />
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              +{latestAnomaly}°C
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
              {currentDate}
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Mise à Jour Mensuelle</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
            Simuler le passage au mois suivant pour obtenir les dernières mesures d&apos;anomalies de température mondiale.
          </p>

          <button
            data-testid="next-month-btn"
            onClick={triggerNextMonth}
            disabled={isSimulating}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent-orange)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 10px var(--accent-orange-glow)',
              transition: 'transform 0.2s, opacity 0.2s',
            }}
            onMouseDown={(e) => {
              if (!isSimulating) e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'none';
            }}
          >
            <RefreshCw
              size={16}
              strokeWidth={1.5}
              style={{ animation: isSimulating ? 'spin 1s linear infinite' : 'none' }}
            />
            {isSimulating ? 'Mise à jour...' : 'Mois Suivant'}
          </button>
        </Panel>

        {/* Key findings */}
        <Panel style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3
            style={{
              fontSize: '14px',
              letterSpacing: '1px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={16} strokeWidth={1.5} color="#ffd54f" />
            CONSTATS CLÉS
          </h3>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <strong>Accélération :</strong> Plus de 80% du réchauffement s&apos;est produit depuis 1980.
              Les anneaux extérieurs de la spirale (rouges) dépassent nettement la ligne de référence +1°C.
            </div>
            <div>
              <strong>2025/2026 :</strong> L&apos;anomalie franchit régulièrement le cap critique des +1.5°C,
              soulignant l&apos;importance de suivre l&apos;autoconsommation énergétique en temps réel.
            </div>
            <div>
              <strong>Lecture :</strong> Survolez un anneau pour isoler une année. Le centre affiche l&apos;année
              et l&apos;anomalie moyenne correspondante.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
