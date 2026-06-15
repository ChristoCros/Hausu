import { LayoutDashboard, Thermometer, Settings, Zap } from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'climate';
  setActiveTab: (tab: 'dashboard' | 'climate') => void;
  onOpenSettings: () => void;
  data: {
    power_b: number;
  } | null;
}

export default function Sidebar({ activeTab, setActiveTab, onOpenSettings, data }: SidebarProps) {
  // Compute solar production status
  const solarVal = data ? Math.round(Math.abs(data.power_b)) : 0;
  const hasSolar = data ? (data.power_b < 0 || solarVal > 0) : false;

  return (
    <aside className="panel sidebar-panel">
      <div className="sidebar-logo">
        <Zap color="var(--accent-orange)" size={22} strokeWidth={2} />
        <h1>HAUSU</h1>
      </div>

      {/* Dynamic Solar status block styled like the Dribbble mockup */}
      <div className="active-monitoring-section">
        <div className="active-monitoring-title">ACTIVE MONITORING</div>
        {data ? (
          hasSolar ? (
            <div className="solar-status-badge active" title="Production solaire en cours">
              <span className="solar-pulse-dot" />
              <span className="solar-status-text">SOLAR ACTIVE</span>
            </div>
          ) : (
            <div className="solar-status-badge inactive" title="Solaire en veille">
              <span className="solar-idle-dot" />
              <span className="solar-status-text">SOLAR IDLE</span>
            </div>
          )
        ) : (
          <div className="solar-status-badge loading" title="Connexion Shelly en cours">
            <span className="solar-loading-dot" />
            <span className="solar-status-text">CONNECTING...</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <div
          onClick={() => setActiveTab('dashboard')}
          className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} strokeWidth={1.5} />
          <span className="sidebar-link-text">DASHBOARD ÉNERGIE</span>
        </div>

        <div
          onClick={() => setActiveTab('climate')}
          className={`sidebar-link ${activeTab === 'climate' ? 'active' : ''}`}
        >
          <Thermometer size={18} strokeWidth={1.5} />
          <span className="sidebar-link-text">CLIMAT</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <button
          id="settings-btn"
          onClick={onOpenSettings}
          className="sidebar-settings-btn"
          title="Paramètres système"
        >
          <Settings size={18} strokeWidth={1.5} />
          <span className="sidebar-link-text">Settings</span>
        </button>
      </div>
    </aside>
  );
}
