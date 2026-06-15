'use client';

import { useState, useEffect } from 'react';
import ShellyDashboard from '../components/ShellyDashboard';
import ClimateTornado from '../components/ClimateTornado';
import Sidebar from '../components/shared/Sidebar';
import SettingsModal from '../components/shared/SettingsModal';
import TodoDashboard from '../components/TodoDashboard';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'climate' | 'todo'>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [data, setData] = useState<ShellyLiveData | null>(null);
  const [shellyIp, setShellyIp] = useState(process.env.NEXT_PUBLIC_SHELLY_IP || '192.168.1.68');
  const [theme, setTheme] = useState<'classic' | 'nier'>('classic');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedIp = window.localStorage.getItem('shellyIp');
    if (savedIp) setShellyIp(savedIp);
    const savedTheme = window.localStorage.getItem('theme') as 'classic' | 'nier';
    if (savedTheme) setTheme(savedTheme);
    setMounted(true);
  }, []);

  const saveSettings = () => {
    window.localStorage.setItem('shellyIp', shellyIp);
    window.localStorage.setItem('theme', theme);
    setShowSettings(false);
  };

  useEffect(() => {
    if (!mounted) return;
    const fetchLive = async () => {
      try {
        const res = await fetch(`/api/shelly/live?shellyIp=${encodeURIComponent(shellyIp)}`);
        const json = await res.json();
        if (!json.error) setData(json);
      } catch (err) {
        console.error("Failed to fetch live Shelly data in page layout", err);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 2000);
    return () => clearInterval(interval);
  }, [shellyIp, mounted]);

  return (
    <div className={`main-layout ${theme === 'nier' ? 'theme-nier' : ''}`}>
      {showSettings && (
        <SettingsModal
          shellyIp={shellyIp}
          setShellyIp={setShellyIp}
          theme={theme}
          setTheme={setTheme}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        data={data}
        theme={theme}
      />

      <div className="content-area">
        {activeTab === 'dashboard' ? (
          <ShellyDashboard shellyIp={shellyIp} data={data} theme={theme} />
        ) : activeTab === 'climate' ? (
          <ClimateTornado />
        ) : (
          <TodoDashboard theme={theme} />
        )}
      </div>
    </div>
  );
}
