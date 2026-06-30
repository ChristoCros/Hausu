'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudDrizzle, 
  Snowflake, 
  CloudLightning, 
  Thermometer, 
  Droplets, 
  Wind, 
  Info, 
  MapPin, 
  Navigation,
  Calendar
} from 'lucide-react';
import Panel from './ui/Panel';

interface WeatherForecastProps {
  theme: 'classic' | 'nier';
}

interface HourlyData {
  time: string;
  temp: number;
  apparentTemp: number;
  precip: number;
  etp: number;
  humidity: number;
  soilTemp: number;
  windSpeed: number;
  windGusts: number;
  windDir: number;
  weatherCode: number;
}

// Convert WMO weather codes to French text & icons
const getWeatherInfo = (code: number) => {
  if (code === 0) return { text: "Ensoleillé", icon: Sun, color: "#ffd54f" };
  if ([1, 2].includes(code)) return { text: "Peu nuageux", icon: CloudSun, color: "#ffd54f" };
  if (code === 3) return { text: "Nuageux", icon: Cloud, color: "var(--text-secondary)" };
  if ([45, 48].includes(code)) return { text: "Brouillard", icon: Cloud, color: "var(--text-secondary)" };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: "Bruine", icon: CloudDrizzle, color: "#4fc3f7" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { text: "Pluie", icon: CloudRain, color: "#00b0ff" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: "Neige", icon: Snowflake, color: "#e0f7fa" };
  if ([95, 96, 99].includes(code)) return { text: "Orage", icon: CloudLightning, color: "#b39ddb" };
  return { text: "Nuageux", icon: Cloud, color: "var(--text-secondary)" };
};

// Convert degrees to cardinal direction
const getWindDirection = (degree: number) => {
  const sectors = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(((degree % 360) / 45)) % 8;
  return sectors[index];
};

export default function WeatherForecast({ theme }: WeatherForecastProps) {
  const [hourlyList, setHourlyList] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const lat = process.env.NEXT_PUBLIC_LATITUDE || '48.8566';
        const lon = process.env.NEXT_PUBLIC_LONGITUDE || '2.3522';
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation,et0_fao_evapotranspiration,relative_humidity_2m,soil_temperature_0_to_10cm,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code&timezone=Europe/Paris&forecast_days=5`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Erreur de communication avec Open-Meteo");
        const json = await res.json();
        
        const hourly = json.hourly;
        if (!hourly) throw new Error("Format de données invalide");

        const formatted: HourlyData[] = hourly.time.map((t: string, idx: number) => ({
          time: t,
          temp: Math.round(hourly.temperature_2m[idx]),
          apparentTemp: Math.round(hourly.apparent_temperature[idx]),
          precip: parseFloat(hourly.precipitation[idx].toFixed(1)),
          etp: parseFloat(hourly.et0_fao_evapotranspiration[idx].toFixed(2)),
          humidity: Math.round(hourly.relative_humidity_2m[idx]),
          soilTemp: Math.round(hourly.soil_temperature_0_to_10cm[idx]),
          windSpeed: Math.round(hourly.wind_speed_10m[idx]),
          windGusts: Math.round(hourly.wind_gusts_10m[idx]),
          windDir: Math.round(hourly.wind_direction_10m[idx]),
          weatherCode: hourly.weather_code[idx],
        }));

        setHourlyList(formatted);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch agricultural weather:", err);
        setError("Impossible de charger les prévisions météorologiques.");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  // Group data by day (each day will contain 24 hours of data)
  const daysData = useMemo(() => {
    if (hourlyList.length === 0) return [];
    const grouped: { [key: string]: HourlyData[] } = {};
    
    hourlyList.forEach(item => {
      const dateStr = item.time.split('T')[0];
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(item);
    });

    return Object.entries(grouped).map(([date, hours]) => {
      const d = new Date(date);
      const name = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      return {
        date,
        dayName: capitalized,
        hours
      };
    });
  }, [hourlyList]);

  // Filter 3-hourly steps matching Meteo60 agricultural steps (8h, 11h, 14h, 17h, 20h, 23h, 2h, 5h)
  const activeDayHours = useMemo(() => {
    if (daysData.length === 0) return [];
    const activeDay = daysData[selectedDayIndex];
    if (!activeDay) return [];
    
    // Return specific hours
    return activeDay.hours.filter(h => {
      const hour = new Date(h.time).getHours();
      return [2, 5, 8, 11, 14, 17, 20, 23].includes(hour);
    });
  }, [daysData, selectedDayIndex]);

  // Aggregate daily summaries for the selected day
  const dailySummary = useMemo(() => {
    if (daysData.length === 0) return null;
    const activeDay = daysData[selectedDayIndex];
    if (!activeDay) return null;

    const temps = activeDay.hours.map(h => h.temp);
    const precips = activeDay.hours.map(h => h.precip);
    const etps = activeDay.hours.map(h => h.etp);

    return {
      tempMin: Math.min(...temps),
      tempMax: Math.max(...temps),
      totalPrecip: precips.reduce((sum, current) => sum + current, 0).toFixed(1),
      totalETP: etps.reduce((sum, current) => sum + current, 0).toFixed(2),
    };
  }, [daysData, selectedDayIndex]);

  // Chart data formatted for Recharts
  const chartData = useMemo(() => {
    if (daysData.length === 0) return [];
    const activeDay = daysData[selectedDayIndex];
    if (!activeDay) return [];

    return activeDay.hours.map(h => {
      const timeStr = new Date(h.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return {
        time: timeStr,
        "Température (°C)": h.temp,
        "Ressenti (°C)": h.apparentTemp,
        "Pluie (mm)": h.precip,
        "ETP (mm)": h.etp,
        "T°C Sol (°C)": h.soilTemp
      };
    });
  }, [daysData, selectedDayIndex]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '15px' }}>
        <div className="core-orbit-spinner">
          <div className="orbit-spinner-ring"></div>
        </div>
        <div className="title-font" style={{ color: 'var(--text-secondary)', letterSpacing: '1px' }}>
          {theme === 'nier' ? 'CHARGEMENT PREVISIONS METEO // SYSTEM...' : 'Chargement de la météo agricole...'}
        </div>
      </div>
    );
  }

  if (error || daysData.length === 0) {
    return (
      <Panel style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', padding: '30px', textAlign: 'center' }}>
        <Info size={40} className="text-orange" style={{ marginBottom: '15px' }} />
        <h3 className="title-font" style={{ margin: '0 0 10px 0' }}>SYSTEM ERROR</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>{error || "Données indisponibles."}</p>
      </Panel>
    );
  }

  return (
    <div className="weather-dashboard-container">
      {/* Styles injected to avoid external dependencies */}
      <style jsx global>{`
        .weather-dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .weather-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 20px;
        }

        .weather-header-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .weather-location-icon {
          background: rgba(255, 136, 0, 0.1);
          border: 1px solid var(--accent-orange);
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .weather-title-meta {
          display: flex;
          flex-direction: column;
        }

        .weather-title-meta h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .weather-meta-badge-row {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .weather-meta-badge {
          font-size: 10px;
          font-weight: 600;
          background: var(--panel-bg-alt);
          border: 1px solid var(--border-color);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        /* Day Selection Navigation */
        .weather-day-tabs {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .weather-day-tab {
          background: var(--panel-bg);
          border: 1px solid var(--border-color);
          padding: 10px 16px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 110px;
        }

        .weather-day-tab.active {
          border-color: var(--accent-orange);
          background: rgba(255, 136, 0, 0.05);
          color: var(--text-primary);
          box-shadow: 0 0 10px rgba(255, 136, 0, 0.1);
        }

        .theme-nier .weather-day-tab {
          border-radius: 0px !important;
          font-family: monospace;
          text-transform: uppercase;
        }

        .theme-nier .weather-day-tab.active {
          background: #B4B1A7;
          border-color: #3b3a36;
          color: #3b3a36;
        }

        /* Main Dashboard Grid */
        .weather-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
        }

        @media (max-width: 1200px) {
          .weather-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Table CSS styling matching Meteo60 */
        .weather-table-container {
          overflow-x: auto;
          width: 100%;
        }

        .agri-table {
          width: 100%;
          border-collapse: collapse;
          text-align: center;
          font-size: 13px;
        }

        .agri-table th {
          background: var(--panel-bg-alt);
          color: var(--text-secondary);
          font-weight: 600;
          padding: 10px 6px;
          border-bottom: 2px solid var(--border-color);
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }

        .agri-table td {
          padding: 12px 6px;
          border-bottom: 1px solid var(--border-color);
          vertical-align: middle;
        }

        .agri-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .theme-nier .agri-table {
          font-family: monospace;
        }

        .theme-nier .agri-table th {
          border-bottom: 2px solid var(--text-primary);
        }

        .theme-nier .agri-table td {
          border-bottom: 1px solid var(--text-primary);
        }

        /* Value highlights */
        .value-temp {
          font-weight: 700;
          border-radius: 4px;
          padding: 2px 6px;
          display: inline-block;
        }

        .value-apparent {
          font-size: 11px;
          color: var(--text-secondary);
          display: block;
          margin-top: 2px;
        }

        .value-precip {
          font-weight: 600;
          color: #00b0ff;
        }

        .value-etp {
          font-weight: 600;
          color: #81c784;
        }

        .value-soil {
          font-weight: 600;
          color: #ffd54f;
        }

        .wind-direction-arrow {
          display: inline-block;
          margin-right: 6px;
          font-weight: bold;
        }

        .picto-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        /* Highlight cards on right side */
        .weather-detail-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .weather-detail-card {
          background: var(--panel-bg);
          border: 1px solid var(--border-color);
          padding: 12px 15px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .weather-card-icon {
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .weather-card-meta {
          display: flex;
          flex-direction: column;
        }

        .weather-card-meta .label {
          font-size: 10px;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .weather-card-meta .value {
          font-size: 16px;
          font-weight: 700;
          margin-top: 2px;
        }

        /* Spin animation for spinner */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .core-orbit-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 136, 0, 0.1);
          border-top-color: var(--accent-orange);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* Header Panel */}
      <Panel className="weather-header">
        <div className="weather-header-info">
          <div className="weather-location-icon">
            <MapPin size={22} className="text-orange" />
          </div>
          <div className="weather-title-meta">
            <h2 className="title-font">{theme === 'nier' ? `01 / COMMUNE - ${(process.env.NEXT_PUBLIC_CITY_NAME || 'PARIS').toUpperCase()}` : (process.env.NEXT_PUBLIC_CITY_NAME || 'Paris')}</h2>
            <div className="weather-meta-badge-row">
              <span className="weather-meta-badge">Alt: 32m</span>
              <span className="weather-meta-badge">Lat: {process.env.NEXT_PUBLIC_LATITUDE ? parseFloat(process.env.NEXT_PUBLIC_LATITUDE).toFixed(2) : '48.86'}°N</span>
              <span className="weather-meta-badge">Lon: {process.env.NEXT_PUBLIC_LONGITUDE ? parseFloat(process.env.NEXT_PUBLIC_LONGITUDE).toFixed(2) : '2.35'}°E</span>
              <span className="weather-meta-badge">Modèle: ICON (5j)</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Calendar size={14} />
          <span>Prévisions Météo Agricole</span>
        </div>
      </Panel>

      {/* Day Selector Navigation */}
      <div className="weather-day-tabs">
        {daysData.map((day, idx) => (
          <div
            key={day.date}
            onClick={() => setSelectedDayIndex(idx)}
            className={`weather-day-tab panel ${selectedDayIndex === idx ? 'active' : ''}`}
          >
            <span>{day.dayName.split(' ')[0]}</span>
            <span style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0' }}>
              {day.dayName.match(/\d+/) ? day.dayName.match(/\d+/)![0] : ''}
            </span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              {day.dayName.split(' ').slice(2).join(' ')}
            </span>
          </div>
        ))}
      </div>

      {/* Layout Grid */}
      <div className="weather-grid">
        {/* Left Side: Meteorological Table */}
        <Panel style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 className="title-font" style={{ margin: 0, fontSize: '16px', letterSpacing: '1px' }}>
              {theme === 'nier' ? 'RELEVES HORAIRES // DETAIL' : `DÉTAILS DES PRÉVISIONS - ${daysData[selectedDayIndex]?.dayName}`}
            </h3>
          </div>

          <div className="weather-table-container">
            <table className="agri-table">
              <thead>
                <tr>
                  <th>Heure</th>
                  <th>Temps</th>
                  <th>Température</th>
                  <th>Vent (vitesse / rafales)</th>
                  <th>Pluie</th>
                  <th>Cumul ETP</th>
                  <th>Humidité</th>
                  <th>T°C Sol (0-10cm)</th>
                </tr>
              </thead>
              <tbody>
                {activeDayHours.map(hour => {
                  const dateObj = new Date(hour.time);
                  const displayTime = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const info = getWeatherInfo(hour.weatherCode);
                  const Icon = info.icon;
                  const dir = hour.windDir;
                  const cardinalDir = getWindDirection(dir);
                  
                  // Color temperature matching standard colors
                  let tempColor = 'var(--text-primary)';
                  let tempBg = 'transparent';
                  if (hour.temp >= 35) { tempColor = '#fff'; tempBg = '#ef5350'; }
                  else if (hour.temp >= 30) { tempColor = '#3b3a36'; tempBg = '#ffd54f'; }
                  else if (hour.temp >= 20) { tempColor = '#3b3a36'; tempBg = '#81c784'; }
                  else if (hour.temp >= 10) { tempColor = '#fff'; tempBg = '#26a69a'; }
                  else { tempColor = '#fff'; tempBg = '#29b6f6'; }

                  // If theme is Nier, ignore background highlighting to fit retro theme
                  if (theme === 'nier') {
                    tempBg = 'transparent';
                    tempColor = 'var(--text-primary)';
                  }

                  return (
                    <tr key={hour.time}>
                      <td style={{ fontWeight: 600 }}>{displayTime}</td>
                      <td className="picto-cell">
                        <Icon size={20} color={info.color} />
                        <span>{info.text}</span>
                      </td>
                      <td>
                        <span 
                          className="value-temp" 
                          style={{ backgroundColor: tempBg, color: tempColor }}
                        >
                          {hour.temp}°C
                        </span>
                        <span className="value-apparent">ressenti {hour.apparentTemp}°C</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <span 
                            className="wind-direction-arrow" 
                            style={{ transform: `rotate(${dir}deg)`, display: 'inline-block' }}
                            title={`${dir}° (${cardinalDir})`}
                          >
                            <Navigation size={12} fill="var(--text-secondary)" strokeWidth={1} />
                          </span>
                          <span style={{ fontWeight: 500 }}>{cardinalDir}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {hour.windSpeed} / <strong style={{ color: 'var(--accent-orange)' }}>{hour.windGusts}</strong> km/h
                          </span>
                        </div>
                      </td>
                      <td className="value-precip">{hour.precip > 0 ? `${hour.precip} mm` : '-'}</td>
                      <td className="value-etp">{hour.etp > 0 ? `${hour.etp} mm` : '-'}</td>
                      <td>{hour.humidity}%</td>
                      <td className="value-soil">{hour.soilTemp}°C</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Right Side: Key Indicators & Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Daily summaries */}
          {dailySummary && (
            <div className="weather-detail-cards">
              <div className="weather-detail-card panel">
                <div className="weather-card-icon" style={{ background: 'rgba(239, 83, 80, 0.1)', border: '1px solid #ef5350' }}>
                  <Thermometer size={18} color="#ef5350" />
                </div>
                <div className="weather-card-meta">
                  <span className="label">Extrêmes Jour</span>
                  <span className="value" style={{ fontFamily: theme === 'nier' ? 'monospace' : 'inherit' }}>
                    {dailySummary.tempMin}°C / <span style={{ color: 'var(--accent-orange)' }}>{dailySummary.tempMax}°C</span>
                  </span>
                </div>
              </div>

              <div className="weather-detail-card panel">
                <div className="weather-card-icon" style={{ background: 'rgba(0, 176, 255, 0.1)', border: '1px solid #00b0ff' }}>
                  <CloudRain size={18} color="#00b0ff" />
                </div>
                <div className="weather-card-meta">
                  <span className="label">Total Pluie</span>
                  <span className="value" style={{ color: '#00b0ff', fontFamily: theme === 'nier' ? 'monospace' : 'inherit' }}>
                    {dailySummary.totalPrecip} mm
                  </span>
                </div>
              </div>

              <div className="weather-detail-card panel">
                <div className="weather-card-icon" style={{ background: 'rgba(129, 199, 132, 0.1)', border: '1px solid #81c784' }}>
                  <Droplets size={18} color="#81c784" />
                </div>
                <div className="weather-card-meta">
                  <span className="label">Total ETP</span>
                  <span className="value" style={{ color: '#81c784', fontFamily: theme === 'nier' ? 'monospace' : 'inherit' }}>
                    {dailySummary.totalETP} mm
                  </span>
                </div>
              </div>

              <div className="weather-detail-card panel">
                <div className="weather-card-icon" style={{ background: 'rgba(255, 213, 79, 0.1)', border: '1px solid #ffd54f' }}>
                  <Wind size={18} color="#ffd54f" />
                </div>
                <div className="weather-card-meta">
                  <span className="label">Coordonnées</span>
                  <span className="value" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: theme === 'nier' ? 'monospace' : 'inherit' }}>
                    44522 Pouillé-l-C
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recharts Chart Panel */}
          <Panel style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 className="title-font" style={{ margin: 0, fontSize: '15px', letterSpacing: '0.5px' }}>
                {theme === 'nier' ? '02 / GRAPHIC // TRENDS' : 'ÉVOLUTION DE LA JOURNÉE'}
              </h3>
            </div>

            <div style={{ flexGrow: 1, width: '100%', height: '260px', position: 'relative' }}>
              <ResponsiveContainer width="99%" height="99%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-orange)" stopOpacity={theme === 'nier' ? 0.05 : 0.25} />
                      <stop offset="95%" stopColor="var(--accent-orange)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-solar)" stopOpacity={theme === 'nier' ? 0.05 : 0.2} />
                      <stop offset="95%" stopColor="var(--accent-solar)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'nier' ? '#C5C2BB' : 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: theme === 'nier' ? '0px' : '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="Température (°C)" stroke="var(--accent-orange)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTemp)" />
                  <Area type="monotone" dataKey="T°C Sol (°C)" stroke="var(--accent-solar)" strokeWidth={2} fillOpacity={1} fill="url(#colorSoil)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
