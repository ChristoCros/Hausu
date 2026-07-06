'use client';

import { useState, useEffect } from 'react';
import ShellyDashboard from '../components/organisms/ShellyDashboard';
import ClimateTornado from '../components/organisms/ClimateTornado';
import Sidebar from '../components/organisms/Sidebar';
import SettingsModal from '../components/organisms/SettingsModal';
import TodoDashboard from '../components/organisms/TodoDashboard';
import WeatherForecast from '../components/organisms/WeatherForecast';
import ServerDashboard from '../components/organisms/ServerDashboard';

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

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'climate' | 'todo' | 'weather' | 'server'>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [data, setData] = useState<ShellyLiveData | null>(null);
  const [theme, setTheme] = useState<'classic' | 'nier'>('classic');
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('theme') as 'classic' | 'nier';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedTheme) setTheme(savedTheme);
    setMounted(true);
  }, []);

  const saveSettings = () => {
    window.localStorage.setItem('theme', theme);
    setShowSettings(false);
  };

  useEffect(() => {
    if (!mounted) return;
    const fetchLive = async () => {
      try {
        const res = await fetch('/api/shelly/live');
        const json = await res.json();
        if (!json.error) setData(json);
      } catch (err) {
        console.error("Failed to fetch live Shelly data in page layout", err);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 2000);
    return () => clearInterval(interval);
  }, [mounted]);

  return (
    <div className={`main-layout ${theme === 'nier' ? 'theme-nier' : ''} ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      {showSettings && (
        <SettingsModal
          theme={theme}
          setTheme={setTheme}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false); // Close menu on selection
        }}
        onOpenSettings={() => setShowSettings(true)}
        data={data}
        theme={theme}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <div className="content-area">
        {(() => {
          switch (activeTab) {
            case 'dashboard': return <ShellyDashboard data={data} theme={theme} />;
            case 'climate': return <ClimateTornado />;
            case 'todo': return <TodoDashboard theme={theme} />;
            case 'weather': return <WeatherForecast theme={theme} />;
            case 'server': return <ServerDashboard theme={theme} />;
            default: return null;
          }
        })()}
      </div>
    </div>
  );
}
