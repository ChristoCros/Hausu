'use client';

import { useState, useEffect } from 'react';
import ShellyDashboard from '../components/ShellyDashboard';
import ClimateTornado from '../components/ClimateTornado';
import Sidebar from '../components/shared/Sidebar';
import SettingsModal from '../components/shared/SettingsModal';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'climate'>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [data, setData] = useState<ShellyLiveData | null>(null);
  const [shellyIp, setShellyIp] = useState(() => {
    if (typeof window === 'undefined') return '192.168.1.68';
    return window.localStorage.getItem('shellyIp') || '192.168.1.68';
  });

  const saveSettings = () => {
    window.localStorage.setItem('shellyIp', shellyIp);
    setShowSettings(false);
  };

  useEffect(() => {
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
  }, [shellyIp]);

  return (
    <div className="main-layout">
      {showSettings && (
        <SettingsModal
          shellyIp={shellyIp}
          setShellyIp={setShellyIp}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        data={data}
      />

      <div className="content-area">
        {activeTab === 'dashboard' ? (
          <ShellyDashboard shellyIp={shellyIp} data={data} />
        ) : (
          <ClimateTornado />
        )}
      </div>
    </div>
  );
}
