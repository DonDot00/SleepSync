import { useState } from "react";
import { getColor, inputToH, makeDefaultRepeat } from "../utils";
import { RepeatPicker, ModalFields } from "./ModalShared";

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