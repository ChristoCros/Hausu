'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Zap, Home, Sun, Droplets, ChevronLeft, ChevronRight, Cloud, CloudRain, CloudSun, CloudLightning, Snowflake, CloudDrizzle, Cable, Coffee, Flame, Bath, Microwave, BatteryCharging, WashingMachine, ChefHat, Fan, Sunrise, Sunset, Eclipse, Info, Thermometer } from 'lucide-react';
import SunCalc from 'suncalc';
import Panel from './ui/Panel';
import IconButton from './ui/IconButton';
import MetricDetail from './shared/MetricDetail';

interface ShellyLiveData {
  voltage_a: number;
  current_a: number;
  power_a: number;
  voltage_b: number;
  current_b: number;
  power_b: number;
  voltage_c: number;
  current_c: number;
  power_c: number;
  error?: string;
}

interface ShellyHistoryItem {
  time: string;
  Maison: number | null;
  Solaire: number | null;
  ChauffeEau: number | null;
}

interface WeatherData {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

interface NetatmoData {
  temp: number;
  humidity: number;
  pressure: number;
  rain_1h: number;
  rain_today: number;
  station_name: string;
  altitude: number;
  updated_at: string;
}

interface FlowNodeProps {
  title: string;
  power: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  color?: string;
  style?: React.CSSProperties;
  titleAttr?: string;
}

const getApplianceIcon = (iconName: string) => {
  switch (iconName) {
    case 'Coffee': return Coffee;
    case 'Flame': return Flame;
    case 'Bath': return Bath;
    case 'Microwave': return Microwave;
    case 'BatteryCharging': return BatteryCharging;
    case 'WashingMachine': return WashingMachine;
    case 'ChefHat': return ChefHat;
    case 'Fan': return Fan;
    default: return Zap;
  }
};

const APPLIANCES_LIST = [
  { id: 'aspirateur', name: 'Aspirateur chargeur', power: 15.2, icon: 'BatteryCharging' },
  { id: 'serviette_bas', name: 'Sèche-serviette SDB Bas', power: 750, icon: 'Bath' },
  { id: 'radiateur_couloir', name: 'Radiateur Couloir', power: 750, icon: 'Flame' },
  { id: 'microondes', name: 'Four micro-ondes', power: 800, icon: 'Microwave' },
  { id: 'rad_enfant1', name: 'Radiateur Enfant 1', power: 1250, icon: 'Flame' },
  { id: 'rad_enfant2', name: 'Radiateur Enfant 2', power: 1250, icon: 'Flame' },
  { id: 'serviette_haut', name: 'Sèche-serviette SDB Haut', power: 1400, icon: 'Bath' },
  { id: 'cafe', name: 'Machine Krups', power: 1450, icon: 'Coffee' },
  { id: 'rad_cuisine', name: 'Radiateur Cuisine', power: 1500, icon: 'Flame' },
  { id: 'lave_vaisselle', name: 'Lave-vaisselle', power: 1800, icon: 'WashingMachine' },
  { id: 'lave_linge', name: 'Lave-linge Samsung', power: 2000, icon: 'WashingMachine' },
  { id: 'bouilloire', name: 'Bouilloire', power: 2000, icon: 'Coffee' },
  { id: 'four', name: 'Four', power: 2725, icon: 'ChefHat' },
  { id: 'déshydrateur', name: 'Déshydrateur', power: 350, icon: 'Fan' },
];

const getWeatherIcon = (code: number) => {
  if (code === 0) return Sun;
  if ([1, 2, 3].includes(code)) return CloudSun;
  if ([45, 48].includes(code)) return Cloud;
  if ([51, 53, 55, 56, 57].includes(code)) return CloudDrizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return CloudRain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return Snowflake;
  if ([95, 96, 99].includes(code)) return CloudLightning;
  return Cloud;
};

const getWeatherDescription = (code: number) => {
  if (code === 0) return "Ensoleillé";
  if ([1, 2, 3].includes(code)) return "Nuageux";
  if ([45, 48].includes(code)) return "Brouillard";
  if ([51, 53, 55].includes(code)) return "Bruine";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "Pluie";
  if ([71, 73, 75].includes(code)) return "Neige";
  if ([95, 96, 99].includes(code)) return "Orage";
  return "Nuageux";
};

const getCountdown = (fromDate: Date, toDate: Date) => {
  const diffMs = toDate.getTime() - fromDate.getTime();
  if (diffMs <= 0) {
    return "Éclipse passée";
  }
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays}j ${diffHours}h ${diffMins}m`;
  }
  return `${diffHours}h ${diffMins}m`;
};

const FlowNode = ({ title, power, icon: Icon, color, style, titleAttr }: FlowNodeProps) => {
  const isGlowing = color && color !== 'var(--text-secondary)';
  const nodeBoxShadow = isGlowing
    ? `0 0 20px ${color}26, 0 8px 32px rgba(0, 0, 0, 0.4)`
    : '0 8px 32px rgba(0, 0, 0, 0.3)';
  const nodeBorderColor = isGlowing ? `${color}80` : 'var(--border-color)';
  const badgeBorderColor = isGlowing ? color : 'var(--border-color)';
  const badgeBoxShadow = isGlowing ? `0 0 12px ${color}4d` : 'none';

  return (
    <div
      className="flow-node"
      style={{
        position: 'absolute',
        ...style,
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#101223',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${nodeBorderColor}`,
        borderRadius: '16px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        minWidth: '125px',
        boxShadow: nodeBoxShadow,
        zIndex: 10,
        transition: 'all 0.3s ease'
      }}
      title={titleAttr}
    >
      <div style={{
        background: 'var(--bg-color)',
        borderRadius: '50%',
        padding: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${badgeBorderColor}`,
        boxShadow: badgeBoxShadow,
        transition: 'all 0.3s ease'
      }}>
        <Icon size={16} strokeWidth={1.5} color={color || 'var(--text-secondary)'} />
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{power}</div>
    </div>
  );
};

const LoadingScreen = ({ theme }: { theme: 'classic' | 'nier' }) => {
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = useMemo(() => [
    "DÉMARRAGE DU LOGICIEL HAUSU...",
    "CONNEXION AU MODULE SHELLY EN COURS...",
    "CHARGEMENT DE L'HISTORIQUE DE CONSOMMATION...",
    "RÉCUPÉRATION DES PRÉVISIONS MÉTÉO...",
    "CALIBRAGE DU DIAGRAMME DE FLUX...",
    "SYNCHRONISATION DES APPAREILS CONSEILLÉS...",
    "PRÉPARATION DU TABLEAU DE BORD..."
  ], []);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % steps.length);
    }, 1500);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        const remaining = 100 - prev;
        const step = Math.max(1, Math.min(remaining, Math.floor(Math.random() * 10) + 2));
        return prev + step;
      });
    }, 200);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [steps]);

  if (theme === 'nier') {
    return (
      <div className="flex-center nier-loading-container" style={{ height: '100%', minHeight: '400px', flexDirection: 'column', gap: '35px', width: '100%' }}>
        <div className="nier-loader-box">
          <div className="nier-corner tl"></div>
          <div className="nier-corner tr"></div>
          <div className="nier-corner bl"></div>
          <div className="nier-corner br"></div>

          <span className="nier-meta-label tl">SYS_INIT_V2.06</span>
          <span className="nier-meta-label tr">PORT_3000</span>
          <span className="nier-meta-label bl">CONN_SECURE</span>
          <span className="nier-meta-label br">HAUSU_SYS</span>

          <div className="nier-loader-center">
            <div className="nier-diamond-spin"></div>
            <div className="nier-diamond-inner"></div>
            <div className="nier-grid-dots">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="nier-dot" />
              ))}
            </div>
          </div>
        </div>

        <div className="nier-progress-wrapper" style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="nier-progress-bar-container">
            <div className="nier-progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
            <div className="nier-bar-split" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span className="nier-status-text">[ {steps[loadingStep]} ]</span>
            <span className="nier-percentage-text">{Math.min(progress, 100)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-center classic-loading-container" style={{ height: '100%', minHeight: '400px', flexDirection: 'column', gap: '30px', width: '100%' }}>
      <div className="classic-loader-wrapper">
        <svg viewBox="0 0 120 120" className="classic-loader-svg">
          <circle cx="60" cy="60" r="54" className="orbit-outer" />
          <circle cx="60" cy="60" r="44" className="orbit-middle" />
          <circle cx="60" cy="60" r="34" className="orbit-inner" />

          <circle cx="60" cy="60" r="54" className="ring-outer" />
          <circle cx="60" cy="60" r="44" className="ring-middle" />
          <circle cx="60" cy="60" r="34" className="ring-inner" />
        </svg>
        <div className="classic-loader-core">
          <Zap size={28} className="core-icon text-orange" />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div className="classic-loader-title">INITIALISATION SYSTÈME ÉNERGIE...</div>
        <div className="classic-loader-step">{steps[loadingStep]}</div>
        <div className="classic-progress-bar-container">
          <div className="classic-progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
        </div>
      </div>
    </div>
  );
};


type ShellyDashboardProps = {
  data: ShellyLiveData | null;
  theme: 'classic' | 'nier';
};

export default function ShellyDashboard({ data, theme }: ShellyDashboardProps) {
  const [history, setHistory] = useState<ShellyHistoryItem[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [netatmo, setNetatmo] = useState<NetatmoData | null>(null);
  const [viewedHour, setViewedHour] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const countdownStr = useMemo(() => {
    const eclipseDate = new Date('2026-08-12T19:23:00+02:00');
    return getCountdown(currentTime, eclipseDate);
  }, [currentTime]);

  const sunTimes = useMemo(() => {
    const lat = parseFloat(process.env.NEXT_PUBLIC_LATITUDE || '48.8566');
    const lon = parseFloat(process.env.NEXT_PUBLIC_LONGITUDE || '2.3522');
    return SunCalc.getTimes(viewedHour, lat, lon);
  }, [viewedHour]);

  const sunriseStr = useMemo(() => {
    return sunTimes.sunrise.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }, [sunTimes]);

  const sunsetStr = useMemo(() => {
    return sunTimes.sunset.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }, [sunTimes]);

  const sunPosition = useMemo(() => {
    const now = viewedHour.getTime();
    const rise = sunTimes.sunrise.getTime();
    const set = sunTimes.sunset.getTime();

    if (now >= rise && now <= set) {
      const pct = (now - rise) / (set - rise);
      const angle = pct * Math.PI;
      const x = 50 - 40 * Math.cos(angle);
      const y = 50 - 40 * Math.sin(angle);
      return { isDay: true, x, y, pct };
    } else {
      let pct = 0.5;
      if (now < rise) {
        const prevSet = rise - 8 * 3600 * 1000;
        pct = Math.max(0, Math.min(1, (now - prevSet) / (rise - prevSet)));
      } else {
        const nextRise = set + 8 * 3600 * 1000;
        pct = Math.max(0, Math.min(1, (now - set) / (nextRise - set)));
      }
      const angle = pct * Math.PI;
      const x = 50 - 40 * Math.cos(angle);
      const y = 50 - 40 * Math.sin(angle);
      return { isDay: false, x, y, pct };
    }
  }, [viewedHour, sunTimes]);

  const isCurrentHour = useCallback(() => {
    const now = new Date();
    return viewedHour.getFullYear() === now.getFullYear() &&
      viewedHour.getMonth() === now.getMonth() &&
      viewedHour.getDate() === now.getDate() &&
      viewedHour.getHours() === now.getHours();
  }, [viewedHour]);

  const changeHour = (offset: number) => {
    const newDate = new Date(viewedHour);
    newDate.setHours(newDate.getHours() + offset);
    setViewedHour(newDate);
  };

  useEffect(() => {
    // 1. Fetch History Data
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/shelly?hour=${viewedHour.toISOString()}&t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.history) setHistory(json.history);
      } catch (err) {
        console.error("Failed to fetch Shelly history", err);
      }
    };

    // 2. Fetch Weather Data
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather');
        const json = await res.json();
        if (json.daily) setWeather(json.daily);
        if (json.netatmo) setNetatmo(json.netatmo);
      } catch (err) {
        console.error("Failed to fetch weather data", err);
      }
    };

    fetchHistory();
    fetchWeather();

    let historyInterval: ReturnType<typeof setInterval> | undefined;

    // Only auto-refresh history if viewing current hour
    if (isCurrentHour()) {
      historyInterval = setInterval(fetchHistory, 10000); // 10s
    }

    // Auto-refresh weather (includes Netatmo) every 60 seconds
    const weatherInterval = setInterval(fetchWeather, 60000);

    return () => {
      if (historyInterval) clearInterval(historyInterval);
      if (weatherInterval) clearInterval(weatherInterval);
    };
  }, [viewedHour, isCurrentHour]);

  // Power Flow calculations
  const rawSolar = data ? Math.round(Math.abs(data.power_b)) : 0;
  const solarVal = rawSolar > 5 ? rawSolar : 0;
  const hasSolar = solarVal > 0;

  // Grid power (Réseau) is measured directly on Phase A.
  const gridPower = data ? Math.round(data.power_a) : 0;
  const isImporting = gridPower > 5;
  const isReinjecting = gridPower < -5;

  const hasGridFlow = isImporting || isReinjecting;

  // House consumption is: Grid + Solar - Chauffe-eau.
  // We use the absolute value of solar to avoid issues if the clamp is inverted or not.
  const maisonVal = data ? Math.max(0, Math.round(data.power_a + solarVal - data.power_c)) : 0;
  const hasMaisonFlow = maisonVal > 5;
  const hasChauffeFlow = data ? data.power_c > 5 : false;

  const surplus = isReinjecting && data ? Math.round(Math.abs(data.power_a)) : 0;

  const sortedAppliances = useMemo(() => {
    return [...APPLIANCES_LIST].map(app => {
      let status: 'free' | 'partial' | 'unavailable' = 'unavailable';
      let statusLabel = 'Indisponible';
      if (app.power <= surplus) {
        status = 'free';
        statusLabel = 'Lançable';
      } else if (app.power <= solarVal) {
        status = 'partial';
        statusLabel = 'Partiel';
      }
      return { ...app, status, statusLabel };
    }).sort((a, b) => {
      const statusWeight = { free: 0, partial: 1, unavailable: 2 };
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[a.status] - statusWeight[b.status];
      }
      return a.power - b.power;
    });
  }, [surplus, solarVal]);

  if (!data) return <LoadingScreen theme={theme} />;

  // Count non-null history entries to display dots if there is only one data point
  const maisonCount = history.filter(item => item.Maison !== null).length;
  const solaireCount = history.filter(item => item.Solaire !== null).length;
  const chauffeCount = history.filter(item => item.ChauffeEau !== null).length;

  return (
    <div className="dashboard-grid">

      {/* Top Left: Power Flow Diagram */}
      <Panel style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 className="title-font" style={{ fontSize: '24px', letterSpacing: '2px', margin: 0 }}>POWER FLOW</h2>
        </div>

        {/* Energy Flow Visualization Container */}
        <div className="power-flow-container">
          <div className="power-flow-wrapper">

            {/* SVG paths overlays with animated dashes */}
            <svg viewBox="0 0 500 320" style={{ position: 'absolute', width: '500px', height: '320px', pointerEvents: 'none', top: 0, left: 0 }}>
              <defs>
                <style>{`
                  @keyframes flow-forward {
                    from { stroke-dashoffset: 24; }
                    to { stroke-dashoffset: 0; }
                  }
                  @keyframes flow-backward {
                    from { stroke-dashoffset: 0; }
                    to { stroke-dashoffset: 24; }
                  }
                  .flow-solar {
                    stroke-dasharray: 6, 8;
                    animation: flow-forward 1.2s linear infinite;
                  }
                  .flow-reinjection-blue {
                    stroke-dasharray: 6, 8;
                    animation: flow-forward 1.2s linear infinite;
                  }
                  .flow-grid-import {
                    stroke-dasharray: 6, 8;
                    animation: flow-forward 1.2s linear infinite;
                  }
                  .flow-grid-export {
                    stroke-dasharray: 6, 8;
                    animation: flow-backward 1.2s linear infinite;
                  }
                  .flow-maison {
                    stroke-dasharray: 6, 8;
                    animation: flow-forward 1.2s linear infinite;
                  }
                  .flow-chauffe {
                    stroke-dasharray: 6, 8;
                    animation: flow-forward 1.2s linear infinite;
                  }
                `}</style>
              </defs>

              {/* Solaire (Top-Left) to Hub */}
              <path d="M 90,75 C 170,75 200,160 250,160" stroke={isReinjecting ? "rgba(0, 176, 255, 0.12)" : (hasSolar ? "rgba(255, 213, 79, 0.12)" : "var(--border-color)")} strokeWidth="4" fill="none" />
              {(isReinjecting || hasSolar) && (
                <>
                  <path d="M 90,75 C 170,75 200,160 250,160" stroke={isReinjecting ? "#00b0ff" : "#ffd54f"} strokeWidth="12" opacity="0.15" strokeLinecap="round" fill="none" />
                  <path
                    d="M 90,75 C 170,75 200,160 250,160"
                    stroke={isReinjecting ? "#00b0ff" : "#ffd54f"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    className={isReinjecting ? "flow-reinjection-blue" : "flow-solar"}
                  />
                </>
              )}

              {/* Grid (Top-Right) to Hub */}
              <path d="M 410,75 C 330,75 300,160 250,160" stroke={hasGridFlow ? (isImporting ? "rgba(79, 195, 247, 0.12)" : "rgba(0, 176, 255, 0.12)") : "var(--border-color)"} strokeWidth="4" fill="none" />
              {hasGridFlow && (
                <>
                  <path d="M 410,75 C 330,75 300,160 250,160" stroke={isImporting ? "#4fc3f7" : "#00b0ff"} strokeWidth="12" opacity="0.15" strokeLinecap="round" fill="none" />
                  <path
                    d="M 410,75 C 330,75 300,160 250,160"
                    stroke={isImporting ? "#4fc3f7" : "#00b0ff"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    className={isImporting ? "flow-grid-import" : "flow-grid-export"}
                  />
                </>
              )}

              {/* Hub to Maison (Bottom-Left) */}
              <path d="M 250,160 C 200,160 170,245 90,245" stroke={isReinjecting ? "rgba(0, 176, 255, 0.12)" : (hasMaisonFlow ? "rgba(129, 199, 132, 0.12)" : "var(--border-color)")} strokeWidth="4" fill="none" />
              {(isReinjecting || hasMaisonFlow) && (
                <>
                  <path d="M 250,160 C 200,160 170,245 90,245" stroke={isReinjecting ? "#00b0ff" : "#81c784"} strokeWidth="12" opacity="0.15" strokeLinecap="round" fill="none" />
                  <path
                    d="M 250,160 C 200,160 170,245 90,245"
                    stroke={isReinjecting ? "#00b0ff" : "#81c784"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    className={isReinjecting ? "flow-reinjection-blue" : "flow-maison"}
                  />
                </>
              )}

              {/* Hub to Chauffe-eau (Bottom-Right) */}
              <path d="M 250,160 C 300,160 330,245 410,245" stroke={hasChauffeFlow ? "rgba(77, 182, 172, 0.12)" : "var(--border-color)"} strokeWidth="4" fill="none" />
              {hasChauffeFlow && (
                <>
                  <path d="M 250,160 C 300,160 330,245 410,245" stroke="#4db6ac" strokeWidth="12" opacity="0.15" strokeLinecap="round" fill="none" />
                  <path d="M 250,160 C 300,160 330,245 410,245" stroke="#4db6ac" strokeWidth="4" strokeLinecap="round" fill="none" className="flow-chauffe" />
                </>
              )}
            </svg>

            {/* Hub node */}
            <div style={{
              position: 'absolute',
              left: '250px',
              top: '160px',
              transform: 'translate(-50%, -50%)',
              background: 'var(--accent-orange)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px var(--accent-orange-glow)',
              border: '2px solid white',
              zIndex: 15
            }}>
              <Zap size={20} strokeWidth={1.5} color="white" />
            </div>

            {/* Nodes */}
            <FlowNode
              title="Solaire (Phase B)"
              power={`${solarVal} W`}
              icon={Sun}
              color={hasSolar ? "#ffd54f" : "var(--text-secondary)"}
              style={{ left: '90px', top: '75px' }}
              titleAttr="solar-node"
            />

            <FlowNode
              title={isImporting ? "Réseau (Import)" : (isReinjecting ? "Réseau (Export)" : "Réseau")}
              power={`${gridPower} W`}
              icon={Cable}
              color={isImporting ? "#4fc3f7" : (isReinjecting ? "#00b0ff" : "var(--text-secondary)")}
              style={{ left: '410px', top: '75px' }}
              titleAttr="grid-node"
            />

            <FlowNode
              title="Maison"
              power={`${maisonVal} W`}
              icon={Home}
              color={isReinjecting ? "#00b0ff" : "#81c784"}
              style={{ left: '90px', top: '245px' }}
              titleAttr="maison-node"
            />

            <FlowNode
              title="Chauffe-eau (Phase C)"
              power={`${Math.round(data.power_c)} W`}
              icon={Droplets}
              color="#4db6ac"
              style={{ left: '410px', top: '245px' }}
              titleAttr="chauffe-node"
            />

          </div>
        </div>
      </Panel>

      {/* Top Right: Graphique */}
      <Panel className="history-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 className="title-font" style={{ fontSize: '20px', letterSpacing: '2px', margin: 0 }}>
              {theme === 'nier' ? '[ HISTORIQUE ]' : 'HISTORIQUE'}
            </h2>
            <div style={{ display: 'flex', gap: '15px', fontSize: '11px', marginTop: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '3px', backgroundColor: 'var(--accent-blue)', borderRadius: theme === 'nier' ? '0' : '2px' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Maison</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '3px', backgroundColor: 'var(--accent-solar)', borderRadius: theme === 'nier' ? '0' : '2px' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Solaire</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '3px', backgroundColor: 'var(--accent-teal)', borderRadius: theme === 'nier' ? '0' : '2px' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Chauffe-eau</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <IconButton onClick={() => changeHour(-1)}>
              <ChevronLeft size={18} strokeWidth={1.5} />
            </IconButton>

            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '130px', textAlign: 'center' }}>
              {viewedHour.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - {viewedHour.getHours().toString().padStart(2, '0')}:00
            </div>

            <IconButton
              onClick={() => changeHour(1)}
              disabled={isCurrentHour()}
            >
              <ChevronRight size={18} strokeWidth={1.5} />
            </IconButton>
          </div>
        </div>
        <div style={{ flexGrow: 1, position: 'relative', width: '100%', minHeight: '200px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <ResponsiveContainer width="99%" height="99%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorMaison" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={theme === 'nier' ? 0.05 : 0.25} />
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSolaire" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-solar)" stopOpacity={theme === 'nier' ? 0.05 : 0.25} />
                    <stop offset="95%" stopColor="var(--accent-solar)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorChauffeEau" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-teal)" stopOpacity={theme === 'nier' ? 0.05 : 0.25} />
                    <stop offset="95%" stopColor="var(--accent-teal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'nier' ? '#C5C2BB' : 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: theme === 'nier' ? '0px' : '8px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Area type="monotone" dataKey="Maison" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorMaison)" dot={maisonCount === 1 ? { r: 4, fill: 'var(--accent-blue)', strokeWidth: 0 } : false} activeDot={{ r: 8, fill: 'var(--accent-blue)' }} connectNulls={false} />
                <Area type="monotone" dataKey="Solaire" stroke="var(--accent-solar)" strokeWidth={2} fillOpacity={1} fill="url(#colorSolaire)" dot={solaireCount === 1 ? { r: 4, fill: 'var(--accent-solar)', strokeWidth: 0 } : false} connectNulls={false} />
                <Area type="monotone" dataKey="ChauffeEau" stroke="var(--accent-teal)" strokeWidth={2} fillOpacity={1} fill="url(#colorChauffeEau)" dot={chauffeCount === 1 ? { r: 4, fill: 'var(--accent-teal)', strokeWidth: 0 } : false} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>

      {/* Bottom Layout: Details & Weather */}
      <div className="details-weather-container">
        {/* Far Left: Appliances suggestion Panel */}
        <Panel className="appliances-panel">
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', letterSpacing: '1px', marginBottom: '8px' }}>
            {theme === 'nier' ? 'EQUIPMENT // RECOMMENDATION' : 'APPAREILS CONSEILLÉS'}
          </div>

          {/* Quick horizontal view of launchable appliances (fully covered by surplus) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)', minHeight: '45px', alignItems: 'center' }}>
            {sortedAppliances.filter(app => app.status === 'free').length > 0 ? (
              sortedAppliances.filter(app => app.status === 'free').map((app, index) => {
                const Icon = getApplianceIcon(app.icon);
                return (
                  <div
                    key={app.id}
                    data-tooltip={`${app.name} (${app.power} W)`}
                    className={`appliance-icon-badge tooltip-trigger ${index === 0 ? 'tooltip-left' : ''}`}
                    style={{
                      borderColor: theme === 'nier' ? 'var(--border-color)' : 'rgba(129, 199, 132, 0.5)',
                      cursor: 'help',
                      background: theme === 'nier' ? 'var(--panel-bg)' : 'rgba(129, 199, 132, 0.05)'
                    }}
                  >
                    <Icon size={16} color={theme === 'nier' ? 'var(--accent-green)' : '#81c784'} strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                  </div>
                );
              })
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Aucun appareil gratuit actuellement</span>
            )}
          </div>

          <div className="appliances-list">
            {sortedAppliances.map(app => {
              const Icon = getApplianceIcon(app.icon);
              const isFree = app.status === 'free';
              const isPartial = app.status === 'partial';

              let statusClass = 'appliance-status-unavailable';
              let iconColor = 'var(--text-secondary)';
              let iconBorderColor = 'var(--border-color)';

              if (isFree) {
                statusClass = 'appliance-status-free';
                iconColor = theme === 'nier' ? 'var(--accent-green)' : '#81c784';
                iconBorderColor = theme === 'nier' ? 'var(--border-color)' : 'rgba(129, 199, 132, 0.4)';
              } else if (isPartial) {
                statusClass = 'appliance-status-partial';
                iconColor = theme === 'nier' ? 'var(--accent-solar)' : '#ffd54f';
                iconBorderColor = theme === 'nier' ? 'var(--border-color)' : 'rgba(255, 213, 79, 0.4)';
              }

              return (
                <div key={app.id} className="appliance-item">
                  <div className="appliance-info">
                    <div
                      className="appliance-icon-badge"
                      style={{ borderColor: iconBorderColor }}
                    >
                      <Icon size={16} strokeWidth={1.5} color={iconColor} />
                    </div>
                    <div>
                      <div className="appliance-name">{app.name}</div>
                      <div className="appliance-power">{app.power} W</div>
                    </div>
                  </div>
                  <div className={`appliance-status ${statusClass}`}>
                    {theme === 'nier' ? `[ ${app.statusLabel.toUpperCase()} ]` : app.statusLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Center: Details & Solar Ephemeris */}
        <div className="details-wrapper">
          <Panel className="details-panel">
            <MetricDetail
              title={theme === 'nier' ? '01 / MAISON' : 'MAISON'}
              voltage={data.voltage_a}
              current={data.current_a}
            />

            <div className="divider"></div>

            <MetricDetail
              title={theme === 'nier' ? '02 / SOLAIRE' : 'SOLAIRE'}
              voltage={data.voltage_b}
              current={data.current_b}
            />

            <div className="divider"></div>

            <MetricDetail
              title={theme === 'nier' ? '03 / CHAUFFE-EAU' : 'CHAUFFE-EAU'}
              voltage={data.voltage_c}
              current={data.current_c}
            />
          </Panel>

          <Panel className="ephemeride-panel">
            {/* Left: Soleil */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="metric-detail-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <Sun size={16} strokeWidth={1.5} color="var(--accent-solar)" className="spin-slow" />
                <span>{theme === 'nier' ? 'SOLEIL // EPHEMERIDE' : 'SOLEIL & ÉPHÉMÉRIDE'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexGrow: 1 }}>
                {/* Arc SVG */}
                <div style={{ width: '100px', height: '60px', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <svg viewBox="0 0 100 50" style={{ width: '100%', height: '100%' }}>
                    <path
                      d="M 10,50 A 40,40 0 0,1 90,50"
                      fill="none"
                      stroke={sunPosition.isDay ? "rgba(255, 213, 79, 0.15)" : "rgba(100, 110, 180, 0.15)"}
                      strokeWidth="3"
                      strokeDasharray="4,4"
                    />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="var(--border-color)" strokeWidth="2" />

                    {sunPosition.isDay ? (
                      <circle
                        cx={sunPosition.x}
                        cy={sunPosition.y}
                        r="5"
                        fill={theme === 'nier' ? 'var(--accent-solar)' : '#ffd54f'}
                        style={theme === 'nier' ? {} : { filter: 'drop-shadow(0 0 6px #ffd54f)' }}
                      />
                    ) : (
                      <circle
                        cx={sunPosition.x}
                        cy={sunPosition.y}
                        r="4.5"
                        fill={theme === 'nier' ? 'var(--accent-blue)' : '#9fa8da'}
                        style={theme === 'nier' ? {} : { filter: 'drop-shadow(0 0 6px #9fa8da)' }}
                      />
                    )}
                  </svg>
                </div>

                {/* Sunrise/Sunset Texts */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="appliance-icon-badge" style={{ borderColor: 'var(--border-color)', padding: '6px', background: 'var(--panel-bg)' }}>
                      <Sunrise size={16} strokeWidth={1.5} color="var(--accent-solar)" />
                    </div>
                    <div>
                      <div className="metric-detail-label">Lever</div>
                      <div className="metric-detail-value">{sunriseStr}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="appliance-icon-badge" style={{ borderColor: 'var(--border-color)', padding: '6px', background: 'var(--panel-bg)' }}>
                      <Sunset size={16} strokeWidth={1.5} color="var(--accent-orange)" />
                    </div>
                    <div>
                      <div className="metric-detail-label">Coucher</div>
                      <div className="metric-detail-value">{sunsetStr}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Right: Eclipse */}
            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
              <div className="metric-detail-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <Eclipse size={16} strokeWidth={1.5} color={theme === 'nier' ? 'var(--accent-blue)' : '#b39ddb'} />
                <span>{theme === 'nier' ? 'SYSTEM // PROCHAINE ECLIPSE' : 'PROCHAINE ÉCLIPSE (FRANCE)'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', flexGrow: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>12 Août 2026</div>
                    <div style={{ fontSize: '10px', color: theme === 'nier' ? 'var(--text-secondary)' : '#b39ddb', fontWeight: 500 }}>Solaire Totale (Partielle en FR)</div>
                  </div>

                  <div style={{
                    background: theme === 'nier' ? 'var(--panel-bg-alt)' : 'rgba(179, 157, 219, 0.1)',
                    border: `1px solid ${theme === 'nier' ? 'var(--border-color)' : 'rgba(179, 157, 219, 0.3)'}`,
                    color: theme === 'nier' ? 'var(--text-primary)' : '#b39ddb',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: theme === 'nier' ? '0px' : '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {countdownStr}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyItems: 'space-between', gap: '10px 15px', background: 'var(--bg-color)', padding: '8px 12px', borderRadius: theme === 'nier' ? '0px' : '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span className="metric-detail-label" style={{ fontSize: '9px' }}>Début</span>
                    <span className="metric-detail-value" style={{ fontSize: '11px' }}>19:23</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1.5 }}>
                    <span className="metric-detail-label" style={{ fontSize: '9px' }}>Maximum</span>
                    <span className="metric-detail-value" style={{ fontSize: '11px', color: 'var(--accent-solar)' }}>20:20 <span style={{ fontSize: '9px', fontWeight: 400, color: 'var(--text-secondary)' }}>(~93%)</span></span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span className="metric-detail-label" style={{ fontSize: '9px' }}>Fin</span>
                    <span className="metric-detail-value" style={{ fontSize: '11px' }}>21:12</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9.5px', color: theme === 'nier' ? 'var(--text-primary)' : '#ffb74d', background: theme === 'nier' ? 'var(--panel-bg-alt)' : 'rgba(255, 183, 77, 0.05)', padding: '5px 8px', borderRadius: theme === 'nier' ? '0px' : '6px', border: `1px solid ${theme === 'nier' ? 'var(--border-color)' : 'rgba(255, 183, 77, 0.2)'}` }}>
                  <Info size={12} style={{ flexShrink: 0 }} />
                  <span>Observation : lunettes spéciales certifiées obligatoires !</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right: 3-Day Weather (1/3 width) */}
        <Panel className="weather-panel">
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', letterSpacing: '1px', marginBottom: '15px' }}>
            {theme === 'nier' ? `METEO // ${(process.env.NEXT_PUBLIC_CITY_NAME || 'Paris').toUpperCase()}` : `MÉTÉO - ${(process.env.NEXT_PUBLIC_CITY_NAME || 'Paris').toUpperCase()}`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'flex-start' }}>
            {netatmo && (
              <div style={{
                background: 'var(--bg-color)',
                borderRadius: theme === 'nier' ? '0px' : '8px',
                border: '1px solid var(--border-color)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-orange)' }}>
                    {theme === 'nier' ? 'VALLONS-DE-L\'ERDRE // TEMPS REEL' : 'Vallons-de-l\'Erdre (Temps réel)'}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                    {new Date(netatmo.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '4px', background: 'var(--panel-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Thermometer size={14} color="var(--accent-orange)" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Température</div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{netatmo.temp}°C</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '4px', background: 'var(--panel-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Droplets size={14} color="var(--accent-teal)" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Humidité</div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{netatmo.humidity}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '4px', background: 'var(--panel-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Info size={14} color="var(--accent-blue)" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Pression</div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>{netatmo.pressure} mb</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '4px', background: 'var(--panel-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CloudRain size={14} color="var(--accent-solar)" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Pluie (1h / 24h)</div>
                      <div style={{ fontSize: '11px', fontWeight: 700 }}>{netatmo.rain_1h} / {netatmo.rain_today} mm</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {weather ? (
              weather.time.slice(0, 3).map((day: string, idx: number) => {
                const code = weather.weathercode[idx];
                const Icon = getWeatherIcon(code);
                const desc = getWeatherDescription(code);
                const maxTemp = Math.round(weather.temperature_2m_max[idx]);
                const minTemp = Math.round(weather.temperature_2m_min[idx]);
                const dateObj = new Date(day);
                const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
                const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

                return (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-color)', borderRadius: theme === 'nier' ? '0px' : '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '6px', background: 'var(--panel-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} strokeWidth={1.5} color="var(--accent-orange)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{capitalizedDay}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{desc}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{maxTemp}°</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px' }}>{minTemp}°</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center' }}>Chargement météo...</div>
            )}
          </div>
        </Panel>
      </div>

    </div>
  );
}
