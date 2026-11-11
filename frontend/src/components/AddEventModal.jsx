import { useState } from "react";
import { getColor, inputToH, makeDefaultRepeat } from "../utils";
import { RepeatPicker, ModalFields } from "./ModalShared";

// ── Add Event Modal ──
export default function AddEventModal({ onClose, onAdd, defaultDayOffset = 0 }) {
  const [form, setForm] = useState({
    title:"", color:"purple", startH:9, durH:1,
    day:defaultDayOffset, location:"", description:"",
    priority:"medium", taskType:"flexible", repeat:makeDefaultRepeat(),
  });

  const set    = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const endH   = form.startH + form.durH;
  const setEnd = (val) => { const e = inputToH(val); setForm(f => ({ ...f, durH:Math.max(0.25, e - f.startH) })); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft:`4px solid ${getColor(form.color).border}` }}>
          <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#e8e4f0" }}>New event</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <ModalFields form={form} set={set} endH={endH} setEnd={setEnd}/>
        </div>
        <div className="modal-footer">
          <button className="modal-btn-delete" onClick={onClose}>Cancel</button>
          <button className="modal-btn-save"
            onClick={() => { if (!form.title.trim()) return; onAdd(form); onClose(); }}>
            Add event
          </button>
        </div>
      </div>
    </div>
  );
}