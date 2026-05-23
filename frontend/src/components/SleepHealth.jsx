import { useState, useEffect } from "react";
import { saveSleepData } from "../api";
import { calcSleepHours, estimateStages, fmtMins } from "../utils";

function SleepTip({ tip, onDismiss, onDontShow }) {
  return (
    <div className="tip-card">
      <div className="tip-label">Sleep tip</div>
      <div className="tip-text">{tip}</div>
      <div className="tip-actions">
        <button className="tip-btn-dontshow" onClick={onDontShow}>Don't show again</button>
        <button className="tip-btn-close" onClick={onDismiss}>✕</button>
      </div>
    </div>
  );
}

export default function SleepHealth({ showTip, tip, onDismissTip, onDontShowTip, bedtime, onBedtimeChange, waketime, onWaketimeChange }) {
  const [goalHours, setGoalHours] = useState(8);

  const totalHours = calcSleepHours(bedtime, waketime);
  const stages     = estimateStages(totalHours);
  const totalMin   = Math.round(totalHours * 60);
  const score      = Math.min(100, Math.round((totalHours / goalHours) * 100));
  const avgDiff    = Math.round((totalHours - 6.47) * 60);

  const r     = 34;
  const circ  = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const stageDefs = [
    { label:"Deep",  mins:stages.deep,  color:"#4338ca" },
    { label:"REM",   mins:stages.rem,   color:"#7c3aed" },
    { label:"Light", mins:stages.light, color:"#3b82f6" },
  ];

  // auto-save sleep data and bubble bedtime up whenever any value changes
  useEffect(() => {
    saveSleepData({
      bedtime,
      wake_time:   waketime,
      goal_hours:  goalHours,
      total_hours: totalHours,
      score,
      deep_mins:   stages.deep,
      rem_mins:    stages.rem,
      light_mins:  stages.light,
    });
  }, [bedtime, waketime, goalHours]);

  return (
    <div className="sleep-section">
      <div className="panel-title">Sleep health</div>

      {/* sleep score ring */}
      <div className="sleep-ring-row">
        <div className="ring-wrap" style={{ width:80, height:80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#1e1830" strokeWidth="6"/>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#7c3aed" strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
          </svg>
          <div className="ring-center" style={{ fontSize:18 }}>{score}</div>
        </div>
        <div className="sleep-meta">
          <div className="sleep-meta-val" style={{ fontSize:22 }}>{fmtMins(totalMin)}</div>
          <div className="sleep-meta-label">Last night</div>
        </div>
      </div>

      {/* Deep / REM / Light stage bars */}
      <div className="sleep-bars">
        {stageDefs.map(b => (
          <div key={b.label} className="bar-row">
            <span className="bar-label">{b.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width:`${Math.round((b.mins/totalMin)*100)}%`, background:b.color }}/>
            </div>
            <span className="bar-val">{fmtMins(b.mins)}</span>
          </div>
        ))}
      </div>

      {/* editable bedtime, wake time, and sleep goal chips */}
      <div className="sleep-chips">
        <div className="sleep-chip sleep-chip-editable">
          <input className="sleep-time-chip-input" type="time" value={bedtime}
            onChange={e => onBedtimeChange(e.target.value)}/>
          <div className="sleep-chip-label">Bedtime</div>
        </div>
        <div className="sleep-chip sleep-chip-editable">
          <input className="sleep-time-chip-input" type="time" value={waketime}
            onChange={e => onWaketimeChange(e.target.value)}/>
          <div className="sleep-chip-label">Wake</div>
        </div>
        <div className="sleep-chip sleep-chip-editable" style={{ alignItems:"center", textAlign:"center" }}>
          <div className="sleep-chip-goal-row" style={{ justifyContent:"center" }}>
            <input className="sleep-goal-input" type="number" min="4" max="12" step="0.5"
              value={goalHours} onChange={e => setGoalHours(parseFloat(e.target.value))}
              style={{ textAlign:"center" }}/>
            <span className="sleep-goal-unit">h</span>
          </div>
          <div className="sleep-chip-label">Sleep goal</div>
        </div>
        <div className="sleep-chip">
          <div className="sleep-chip-val" style={{ color:avgDiff >= 0 ? "#84cc16" : "#f87171" }}>
            {avgDiff >= 0 ? "+" : ""}{avgDiff}m
          </div>
          <div className="sleep-chip-label">vs avg · 3× restless</div>
        </div>
      </div>

      {showTip && (
        <SleepTip tip={tip} onDismiss={onDismissTip} onDontShow={onDontShowTip}/>
      )}
    </div>
  );
}