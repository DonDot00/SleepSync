import { useState } from "react";
import { EVENT_COLORS, DOW, PRIORITY_LABELS, TASK_TYPE_LABELS } from "../constants";
import { getColor, hToInput, inputToH, offsetToIso, isoToOffset, makeDefaultRepeat, dateToIso } from "../utils";

// ── Repeat Picker — day-of-week selector + end date ──
function RepeatPicker({ repeat, onChange }) {
  const toggle = (d) => {
    const days = repeat.days.includes(d)
      ? repeat.days.filter(x => x !== d)
      : [...repeat.days, d].sort((a, b) => a - b);
    onChange({ ...repeat, days });
  };

  return (
    <div className="repeat-section">
      <div className="repeat-toggle-row">
        <label className="repeat-label">Repeat</label>
        <label className="toggle-switch">
          <input type="checkbox" checked={repeat.enabled}
            onChange={e => onChange({ ...repeat, enabled:e.target.checked })}/>
          <span className="toggle-track"><span className="toggle-thumb"/></span>
        </label>
      </div>
      {repeat.enabled && (
        <>
          <div className="repeat-days">
            {DOW.map((d, i) => (
              <button key={i} onClick={() => toggle(i)}
                className={`dow-btn${repeat.days.includes(i) ? " active" : ""}`}>
                {d}
              </button>
            ))}
          </div>
          <div style={{ marginTop:8 }}>
            <label className="modal-label">Repeat until</label>
            <input className="modal-input" type="date"
              value={repeat.end_date || ""}
              min={dateToIso(new Date())}
              onChange={e => onChange({ ...repeat, end_date:e.target.value || null })}
              style={{ colorScheme:"dark", marginTop:4 }}/>
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared modal body fields ──
function ModalFields({ form, set, endH, setEnd }) {
  return (
    <>
      <label className="modal-label">Title</label>
      <input className="modal-input" value={form.title}
        onChange={e => set("title", e.target.value)} placeholder="Event title..."/>

      <label className="modal-label">Date</label>
      <input className="modal-input" type="date"
        value={offsetToIso(form.day)} min={dateToIso(new Date())}
        onChange={e => set("day", isoToOffset(e.target.value))}
        style={{ colorScheme:"dark" }}/>

      <label className="modal-label">Location</label>
      <input className="modal-input" value={form.location || ""}
        onChange={e => set("location", e.target.value)} placeholder="Add location..."/>

      <label className="modal-label">Description</label>
      <textarea className="modal-textarea" value={form.description || ""}
        onChange={e => set("description", e.target.value)}
        placeholder="Add description..." rows={4}/>

      <div className="modal-row">
        <div className="modal-col">
          <label className="modal-label">Start time</label>
          <input className="modal-input" type="time" value={hToInput(form.startH)}
            onChange={e => set("startH", inputToH(e.target.value))}/>
        </div>
        <div className="modal-col">
          <label className="modal-label">End time</label>
          <input className="modal-input" type="time" value={hToInput(endH)}
            onChange={e => setEnd(e.target.value)}/>
        </div>
      </div>
      <div className="modal-duration-hint">
        Duration: {Math.floor(form.durH)}h {Math.round((form.durH % 1) * 60) > 0 ? `${Math.round((form.durH % 1) * 60)}m` : ""}
      </div>

      <div className="modal-row">
        <div className="modal-col">
          <label className="modal-label">Priority</label>
          <div className="pill-group">
            {["high","medium","low"].map(p => (
              <button key={p} onClick={() => set("priority", p)}
                className={`pill-btn${form.priority === p ? " pill-active" : ""}`} data-priority={p}>
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-col">
          <label className="modal-label">Task type</label>
          <div className="pill-group">
            {["fixed","flexible","free"].map(t => (
              <button key={t} onClick={() => set("taskType", t)}
                className={`pill-btn${form.taskType === t ? " pill-active" : ""}`}>
                {TASK_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <RepeatPicker repeat={form.repeat} onChange={v => set("repeat", v)}/>

      <label className="modal-label">Color</label>
      <div className="color-picker-row">
        {EVENT_COLORS.map(c => (
          <button key={c.id} onClick={() => set("color", c.id)}
            className={`color-swatch${form.color === c.id ? " selected" : ""}`}
            style={{ background:c.bg, borderColor:c.border }}>
            {form.color === c.id && <span className="color-swatch-check" style={{ color:c.text }}>✓</span>}
          </button>
        ))}
      </div>
    </>
  );
}

// ── Edit Event Modal ──
export default function EventModal({ ev, onClose, onSave, onDelete, onCancelRecurring }) {
  const [form, setForm] = useState({
    ...ev,
    priority: ev.priority || "medium",
    taskType: ev.taskType || "flexible",
    repeat:   ev.repeat   || makeDefaultRepeat(),
  });
  const [showCancelMenu, setShowCancelMenu] = useState(false);

  const set    = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const endH   = form.startH + form.durH;
  const setEnd = (val) => { const e = inputToH(val); setForm(f => ({ ...f, durH:Math.max(0.25, e - f.startH) })); };
  const cd     = getColor(form.color);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft:`4px solid ${cd.border}` }}>
          <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#e8e4f0" }}>{form.title || "Event"}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <ModalFields form={form} set={set} endH={endH} setEnd={setEnd}/>
        </div>

        <div className="modal-footer">
          {/* delete / cancel recurring menu */}
          <div style={{ position:"relative" }}>
            {ev.repeatGroupId ? (
              <>
                <button className="modal-btn-delete"
                  onClick={() => setShowCancelMenu(m => !m)}>
                  Delete ▾
                </button>
                {showCancelMenu && (
                  <div style={{
                    position:"absolute", bottom:"calc(100% + 6px)", left:0,
                    background:"#0d0c1a", border:"0.5px solid #2a2448",
                    borderRadius:8, overflow:"hidden", minWidth:210, zIndex:300,
                    boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
                  }}>
                    <button
                      onClick={() => { onDelete(ev.id); onClose(); }}
                      style={{ display:"block", width:"100%", textAlign:"left",
                        padding:"10px 14px", background:"none", border:"none",
                        color:"#c4b8e8", fontSize:12, cursor:"pointer" }}
                      onMouseEnter={e => e.target.style.background = "#1a1530"}
                      onMouseLeave={e => e.target.style.background = "none"}>
                      Delete this event only
                    </button>
                    <button
                      onClick={() => { onCancelRecurring(ev, false); onClose(); }}
                      style={{ display:"block", width:"100%", textAlign:"left",
                        padding:"10px 14px", background:"none", border:"none",
                        color:"#c4b8e8", fontSize:12, cursor:"pointer" }}
                      onMouseEnter={e => e.target.style.background = "#1a1530"}
                      onMouseLeave={e => e.target.style.background = "none"}>
                      Cancel this &amp; future events
                    </button>
                    <button
                      onClick={() => { onCancelRecurring(ev, true); onClose(); }}
                      style={{ display:"block", width:"100%", textAlign:"left",
                        padding:"10px 14px", background:"none", border:"none",
                        color:"#f87171", fontSize:12, cursor:"pointer" }}
                      onMouseEnter={e => e.target.style.background = "#1a1530"}
                      onMouseLeave={e => e.target.style.background = "none"}>
                      Cancel all events in series
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button className="modal-btn-delete" onClick={() => onDelete(ev.id)}>Delete</button>
            )}
          </div>

          <button className="modal-btn-save" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}