import Panel from '../ui/Panel';

interface SettingsModalProps {
  shellyIp: string;
  setShellyIp: (ip: string) => void;
  theme: 'classic' | 'nier';
  setTheme: (t: 'classic' | 'nier') => void;
  onSave: () => void;
  onClose: () => void;
}

export default function SettingsModal({
  shellyIp,
  setShellyIp,
  theme,
  setTheme,
  onSave,
  onClose
}: SettingsModalProps) {
  return (
    <div className="modal-overlay">
      <Panel className="modal-content">
        <h2 className="title-font modal-title">
          {theme === 'nier' ? '[ PARAMETRES SYSTEME ]' : 'PARAMETRES SYSTEME'}
        </h2>

        <div className="modal-section">
          <div className="modal-section-title">
            {theme === 'nier' ? '01 / CONNECTIVITE SHELLY' : 'Connectivite Shelly'}
          </div>
          <label htmlFor="shelly-ip-input" className="modal-label">IP Locale Shelly 3EM Pro</label>
          <input
            id="shelly-ip-input"
            type="text"
            value={shellyIp}
            onChange={(e) => setShellyIp(e.target.value)}
            className="modal-text-input"
            style={{ width: '100%' }}
          />
        </div>

        <div className="modal-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div className="modal-section-title">
            {theme === 'nier' ? '02 / DESIGN VISUEL' : 'Design Visuel / Thème'}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              id="theme-classic-btn"
              type="button"
              onClick={() => setTheme('classic')}
              className="modal-theme-btn"
              style={{
                flex: 1,
                padding: '10px',
                background: theme === 'classic' ? 'var(--accent-orange)' : 'var(--bg-color)',
                color: theme === 'classic' ? 'white' : 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid var(--border-color)',
                borderRadius: theme === 'nier' ? '0' : '8px',
                transition: 'all 0.2s'
              }}
            >
              Classic (Sombre)
            </button>
            <button
              id="theme-nier-btn"
              type="button"
              onClick={() => setTheme('nier')}
              className="modal-theme-btn"
              style={{
                flex: 1,
                padding: '10px',
                background: theme === 'nier' ? 'var(--accent-orange)' : 'var(--bg-color)',
                color: theme === 'nier' ? 'white' : 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid var(--border-color)',
                borderRadius: theme === 'nier' ? '0' : '8px',
                transition: 'all 0.2s'
              }}
            >
              NieR:Automata
            </button>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="modal-close-btn"
          >
            Fermer
          </button>
          <button
            id="save-settings-btn"
            onClick={onSave}
            className="modal-save-btn"
          >
            Sauver
          </button>
        </div>
      </Panel>
    </div>
  );
}
