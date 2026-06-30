import { LayoutDashboard, Thermometer, Settings, Zap, ClipboardList, CloudSun } from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'climate' | 'todo' | 'weather';
  setActiveTab: (tab: 'dashboard' | 'climate' | 'todo' | 'weather') => void;
  onOpenSettings: () => void;
  data: {
    power_b: number;
  } | null;
  theme: 'classic' | 'nier';
}

export default function Sidebar({ activeTab, setActiveTab, onOpenSettings, data, theme }: SidebarProps) {
  // Compute solar production status
  const rawSolar = data ? Math.round(Math.abs(data.power_b)) : 0;
  const solarVal = rawSolar > 5 ? rawSolar : 0;
  const hasSolar = solarVal > 0;

  return (
    <aside className="panel sidebar-panel">
      <div className="sidebar-logo">
        <Zap color="var(--accent-orange)" size={22} strokeWidth={2} />
        <h1>{theme === 'nier' ? 'HAUSU // SYSTEM' : 'HAUSU'}</h1>
      </div>

      {/* Dynamic Solar status block styled like the Dribbble mockup */}
      <div className="active-monitoring-section">
        <div className="active-monitoring-title">
          {theme === 'nier' ? 'ACTIVE MONITORING' : 'ACTIVE MONITORING'}
        </div>
        {data ? (
          hasSolar ? (
            <div className="solar-status-badge active" title="Production solaire en cours">
              {theme === 'nier' ? (
                <span className="solar-status-text">[ SOLAR // ACTIVE ]</span>
              ) : (
                <>
                  <span className="solar-pulse-dot" />
                  <span className="solar-status-text">SOLAR ACTIVE</span>
                </>
              )}
            </div>
          ) : (
            <div className="solar-status-badge inactive" title="Solaire en veille">
              {theme === 'nier' ? (
                <span className="solar-status-text">[ SOLAR // IDLE ]</span>
              ) : (
                <>
                  <span className="solar-idle-dot" />
                  <span className="solar-status-text">SOLAR IDLE</span>
                </>
              )}
            </div>
          )
        ) : (
          <div className="solar-status-badge loading" title="Connexion Shelly en cours">
            {theme === 'nier' ? (
              <span className="solar-status-text">[ CONNECTING... ]</span>
            ) : (
              <>
                <span className="solar-loading-dot" />
                <span className="solar-status-text">CONNECTING...</span>
              </>
            )}
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <div
          onClick={() => setActiveTab('dashboard')}
          className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} strokeWidth={1.5} />
          <span className="sidebar-link-text">
            {theme === 'nier' ? '[ 01 / DASHBOARD ]' : 'DASHBOARD ÉNERGIE'}
          </span>
        </div>

        <div
          onClick={() => setActiveTab('climate')}
          className={`sidebar-link ${activeTab === 'climate' ? 'active' : ''}`}
        >
          <Thermometer size={18} strokeWidth={1.5} />
          <span className="sidebar-link-text">
            {theme === 'nier' ? '[ 02 / CLIMAT ]' : 'CLIMAT'}
          </span>
        </div>

        <div
          onClick={() => setActiveTab('todo')}
          className={`sidebar-link ${activeTab === 'todo' ? 'active' : ''}`}
        >
          <ClipboardList size={18} strokeWidth={1.5} />
          <span className="sidebar-link-text">
            {theme === 'nier' ? '[ 03 / TÂCHES ]' : 'PLANIFICATEUR'}
          </span>
        </div>

        <div
          onClick={() => setActiveTab('weather')}
          className={`sidebar-link ${activeTab === 'weather' ? 'active' : ''}`}
        >
          <CloudSun size={18} strokeWidth={1.5} />
          <span className="sidebar-link-text">
            {theme === 'nier' ? '[ 04 / METEO ]' : 'MÉTÉO AGRICOLE'}
          </span>
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
          <span className="sidebar-link-text">
            {theme === 'nier' ? 'SETTINGS' : 'Settings'}
          </span>
        </button>
      </div>
    </aside>
  );
}
