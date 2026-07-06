/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';

import './ServerDashboard.css';

interface ServerDashboardProps {
  theme?: 'classic' | 'nier';
}

interface SystemData {
  cpu: any;
  cpuTemp: any;
  mem: any;
  fsSize: any[];
  osInfo: any;
  networkStats: any[];
  dockerContainers: any[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ServerDashboard({ theme }: ServerDashboardProps) {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rxSpeed, setRxSpeed] = useState(0);
  const [txSpeed, setTxSpeed] = useState(0);
  
  const prevNetwork = useRef<{ rx: number; tx: number; time: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchSystemData = async () => {
      try {
        const res = await fetch('/api/system');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        
        if (mounted) {
          setData(json);
          setLoading(false);

          const statsArray = Array.isArray(json.networkStats) ? json.networkStats : (json.networkStats ? [json.networkStats] : []);
          const currentRx = statsArray.reduce((acc: number, curr: any) => acc + (curr.rx_bytes || curr.rx || 0), 0);
          const currentTx = statsArray.reduce((acc: number, curr: any) => acc + (curr.tx_bytes || curr.tx || 0), 0);
          const now = Date.now();

          if (prevNetwork.current) {
            const timeDiff = (now - prevNetwork.current.time) / 1000;
            if (timeDiff > 0) {
              setRxSpeed(Math.max(0, (currentRx - prevNetwork.current.rx) / timeDiff));
              setTxSpeed(Math.max(0, (currentTx - prevNetwork.current.tx) / timeDiff));
            }
          }
          
          prevNetwork.current = { rx: currentRx, tx: currentTx, time: now };
        }
      } catch (err) {
        console.error(err);
        if (mounted) setLoading(false);
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-center" style={{ height: '100%', minHeight: '300px' }}>
        <div className="sd-minimal-loader" />
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const { cpu, cpuTemp, mem, fsSize, osInfo, dockerContainers } = data;
  
  const hostname = osInfo.hostname || "Unknown_Host";

  // Drives mapping
  const rawDrives = fsSize && fsSize.length > 0 ? fsSize : [];
  
  // Filter out noisy docker mounts and temp filesystems
  const filteredDrives = rawDrives.filter((d: any) => {
    if (d.mount.startsWith('/etc/')) return false;
    if (d.fs === 'tmpfs' || d.fs === 'devtmpfs' || d.fs === 'shm') return false;
    if (d.mount.startsWith('/sys/') || d.mount.startsWith('/proc/')) return false;
    return true;
  });

  // Deduplicate by size and used (removes duplicate overlay/host mappings)
  const uniqueDrivesMap = new Map();
  filteredDrives.forEach((d: any) => {
    const key = `${d.size}-${d.used}`;
    if (!uniqueDrivesMap.has(key)) {
      uniqueDrivesMap.set(key, d);
    }
  });
  const drives = Array.from(uniqueDrivesMap.values());

  const totalSize = drives.reduce((acc, d: any) => acc + (d.size || 0), 0);
  const totalUsed = drives.reduce((acc, d: any) => acc + (d.used || 0), 0);
  const totalCapacityPct = totalSize > 0 ? Math.round((totalUsed / totalSize) * 100) : 0;

  // RAM Usage mapping (0-100) 
  const ramUsed = mem.active || mem.used;
  const ramUsedPct = mem.total > 0 ? Math.round((ramUsed / mem.total) * 100) : 0;

  // Speed mapping (0 to 180 degrees)
  const maxSpeed = 100 * 1024 * 1024; // 100MB/s visual max
  const getRotation = (speed: number) => {
    let pct = speed / maxSpeed;
    if (pct > 1) pct = 1;
    return 135 + (pct * 270);
  };

  // Temperature
  const temp = cpuTemp.main;
  const tempPct = temp ? Math.min(Math.max((temp - 20) / (90 - 20) * 100, 0), 100) : 0;

  // Render Horizontal Segments (Drives)
  const renderDriveSegments = (pct: number) => {
    const totalSegments = 16;
    const activeCount = Math.round((pct / 100) * totalSegments);
    return Array.from({ length: totalSegments }).map((_, i) => (
      <div key={i} className={`sd-segment-h ${i < activeCount ? 'active' : ''}`} />
    ));
  };

  // Render Vertical Segments (RAM Usage)
  const renderHealthSegments = (pct: number) => {
    const totalSegments = 20;
    const activeCount = Math.round((pct / 100) * totalSegments);
    return Array.from({ length: totalSegments }).map((_, i) => {
      const isActive = i < activeCount;
      // Gradient from cyan (bottom) to yellow (middle) to red (top)
      const r = i < 10 ? 77 + (178 * (i/10)) : 255;
      const g = i < 10 ? 182 + (31 * (i/10)) : 213 - (126 * ((i-10)/10));
      const b = i < 10 ? 172 - (93 * (i/10)) : 79 - (45 * ((i-10)/10));
      const color = `rgb(${r}, ${g}, ${b})`;
      
      return (
        <div key={i} className="sd-health-segment" style={{
          backgroundColor: isActive ? color : '#2a2a2c',
          boxShadow: isActive ? `0 0 5px ${color}` : 'none'
        }} />
      );
    });
  };

  return (
    <div className="sd-container">
      {/* Header */}
      <div className="sd-header">
        <h1 className="sd-header-title">{hostname}</h1>
      </div>

      {/* Tabs */}
      <div className="sd-tabs">
        <div className="sd-tab active">Server Info</div>
      </div>

      {/* Top Section */}
      <div className="sd-top-section">
        {/* Summary */}
        <div className="sd-card">
          <div className="sd-section-title">Summary</div>
          <div className="sd-summary-grid">
            <div>
              <div className="sd-label">Name</div>
              <div className="sd-value">{hostname}</div>
            </div>
            <div>
              <div className="sd-label">CPU</div>
              <div className="sd-value">{cpu.brand.replace('Intel(R) Core(TM) ', '').replace('Processor', '')}</div>
            </div>
            <div>
              <div className="sd-label">OS</div>
              <div className="sd-value">{osInfo.distro} {osInfo.release}</div>
            </div>
            <div>
              <div className="sd-label">Serial Number</div>
              <div className="sd-value">{osInfo.serial || 'N/A'}</div>
            </div>
            <div>
              <div className="sd-label">RAM</div>
              <div className="sd-value">{formatBytes(mem.total)}</div>
            </div>
            <div>
              <div className="sd-label">Platform</div>
              <div className="sd-value">{osInfo.platform}</div>
            </div>
          </div>
        </div>

        {/* Capacity */}
        <div className="sd-card">
          <div className="sd-capacity-header">
            <div className="sd-capacity-title-area">
              <div className="sd-section-title" style={{margin:0}}>Capacity</div>
              <div className="sd-capacity-total">{formatBytes(totalUsed)} / {formatBytes(totalSize)}</div>
            </div>
            <div className="sd-capacity-pct">
              {totalCapacityPct}%
              <div className="sd-capacity-mini-bar" />
            </div>
          </div>

          <div className="sd-drives-grid">
            {drives.map((drive: any, i: number) => (
              <div key={i} className="sd-drive-item">
                <div className="sd-drive-name">[{drive.mount}] {drive.fs}</div>
                <div className="sd-drive-size">{formatBytes(drive.used)} / {formatBytes(drive.size)}</div>
                <div className="sd-segmented-bar-h">
                  {renderDriveSegments(drive.use)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="sd-bottom-section">
        
        {/* RAM Usage */}
        <div className="sd-card">
          <div className="sd-section-title">RAM Usage</div>
          <div className="sd-health-container">
            <div className="sd-health-label">100%<br/><br/><br/><br/><br/>0%</div>
            <div className="sd-health-bar">
              {renderHealthSegments(ramUsedPct)}
            </div>
            <div className="sd-health-stats">
              <div className="sd-health-pct">{ramUsedPct}<span style={{fontSize:'1rem'}}>%</span></div>
              <div className="sd-health-status">{formatBytes(ramUsed)}</div>
              <div className="sd-health-desc">/ {formatBytes(mem.total)}</div>
            </div>
          </div>
        </div>

        {/* Temperature */}
        <div className="sd-card">
          <div className="sd-section-title">Temperature</div>
          <div className="sd-temp-container">
            <div className="sd-temp-scale">
              <span>°C</span>
              <span>35°C</span>
              <span>40°C</span>
              <span>45°C</span>
              <span>50°C</span>
            </div>
            <div className="sd-temp-ticks">
              {Array.from({length: 25}).map((_, i) => <div key={i} className="sd-temp-tick" />)}
            </div>
            <div className="sd-temp-slider">
              {temp != null && (
                <div className="sd-temp-thumb" style={{ left: `${tempPct}%` }} />
              )}
            </div>
            <div className="sd-temp-value-large">{temp != null ? temp : 'N/A'} <span style={{fontSize:'1rem'}}>°C</span></div>
            <div className="sd-temp-value-sub">{temp != null ? 'Medium' : 'Unknown'}</div>
          </div>
        </div>

        {/* Speedometers */}
        <div className="sd-card">
          <div className="sd-section-title">Real time performance <span style={{fontSize:'0.8rem', color:'#8a92b2'}}>MB/s</span></div>
          <div className="sd-speed-container">
            {/* Read */}
            <div className="sd-speedometer">
              <div className="sd-speed-ring sd-speed-ring-read" />
              <div className="sd-speed-inner" />
              <div className="sd-speed-needle" style={{ transform: `rotate(${getRotation(rxSpeed)}deg)` }} />
              <div className="sd-speed-val">{(rxSpeed / 1024 / 1024).toFixed(0)}</div>
              <div className="sd-speed-lbl">Read</div>
            </div>
            {/* Write */}
            <div className="sd-speedometer">
              <div className="sd-speed-ring sd-speed-ring-write" />
              <div className="sd-speed-inner" />
              <div className="sd-speed-needle write" style={{ transform: `rotate(${getRotation(txSpeed)}deg)` }} />
              <div className="sd-speed-val">{(txSpeed / 1024 / 1024).toFixed(0)}</div>
              <div className="sd-speed-lbl">Write</div>
            </div>
          </div>
        </div>
        
        {/* Docker Containers */}
        <div className="sd-card" style={{ gridColumn: '1 / -1' }}>
          <div className="sd-section-title">Docker Containers</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', alignContent: 'start', gap: '16px', marginTop: '0.5rem', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            {dockerContainers && dockerContainers.filter((c: any) => c.state === 'running' || c.state === 'up').length > 0 ? (
              dockerContainers.filter((c: any) => c.state === 'running' || c.state === 'up').map((container: any, idx: number) => (
                <div key={idx} style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', borderLeft: '4px solid #4db6ac', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '500', fontSize: '1rem', color: '#ffffff' }}>{container.name}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#4db6ac', backgroundColor: 'rgba(77, 182, 172, 0.1)', padding: '4px 8px', borderRadius: '12px', letterSpacing: '0.5px' }}>RUNNING</div>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: '#8a92b2' }}>{container.image}</div>
                  
                  {container.stats && (
                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '0.85rem', color: '#e0e0e0' }}>
                      <div><span style={{ color: '#8a92b2' }}>CPU</span> {container.stats.cpuPercent?.toFixed(1) || '0.0'}%</div>
                      <div><span style={{ color: '#8a92b2' }}>RAM</span> {container.stats.memPercent?.toFixed(1) || '0.0'}% <span style={{fontSize: '0.75rem'}}>({(container.stats.memUsage / 1024 / 1024).toFixed(0)} MB)</span></div>
                    </div>
                  )}

                  {container.ports && container.ports.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {container.ports.map((p: any, i: number) => p.PublicPort ? (
                        <div key={i} style={{ fontSize: '0.7rem', color: '#b388ff', backgroundColor: 'rgba(179, 136, 255, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(179, 136, 255, 0.2)' }}>
                          {p.PublicPort}:{p.PrivatePort}
                        </div>
                      ) : null)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: '#888', fontSize: '13px', gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                No running containers
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
