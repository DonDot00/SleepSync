export default function EnergySlider({ value, onChange }) {
  const labels = ["Exhausted","Low","Moderate","Good","Peak"];
  const colors = ["#ef4444","#f97316","#eab308","#84cc16","#22c55e"];

  return (
    <div className="energy-panel">
      <span className="energy-title">Energy</span>
      <input
        type="range" min="1" max="5" step="1" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="energy-slider"
        style={{ "--thumb-color": colors[value - 1] }}
      />
      <span className="energy-label" style={{ color: colors[value - 1] }}>
        {labels[value - 1]}
      </span>
    </div>
  );
}