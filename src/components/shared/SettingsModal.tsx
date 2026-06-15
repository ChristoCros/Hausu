import Panel from '../ui/Panel';

interface SettingsModalProps {
  shellyIp: string;
  setShellyIp: (ip: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function SettingsModal({ shellyIp, setShellyIp, onSave, onClose }: SettingsModalProps) {
  return (
    <div className="modal-overlay">
      <Panel className="modal-content">
        <h2 className="title-font modal-title">PARAMETRES SYSTEME</h2>

        <div className="modal-section">
          <div className="modal-section-title">Connectivite Shelly</div>
          <label htmlFor="shelly-ip-input" className="modal-label">IP Locale Shelly 3EM Pro</label>
          <div className="modal-input-group">
            <input
              id="shelly-ip-input"
              type="text"
              value={shellyIp}
              onChange={(e) => setShellyIp(e.target.value)}
              className="modal-text-input"
            />
            <button
              id="save-settings-btn"
              onClick={onSave}
              className="modal-save-btn"
            >
              Sauver
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="modal-close-btn"
          >
            Fermer
          </button>
        </div>
      </Panel>
    </div>
  );
}
