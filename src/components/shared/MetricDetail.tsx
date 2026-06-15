interface MetricDetailProps {
  title: string;
  voltage: number;
  current: number;
}

export default function MetricDetail({ title, voltage, current }: MetricDetailProps) {
  return (
    <div className="metric-detail">
      <div className="metric-detail-title">{title}</div>
      <div className="metric-detail-row">
        <span className="metric-detail-label">Tension</span>
        <span className="metric-detail-value">{voltage.toFixed(1)} V</span>
      </div>
      <div className="metric-detail-row">
        <span className="metric-detail-label">Courant</span>
        <span className="metric-detail-value">{current.toFixed(2)} A</span>
      </div>
    </div>
  );
}
