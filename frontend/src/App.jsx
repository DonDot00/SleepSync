import React, { useState, useEffect, useRef } from "react";
import { DndContext, useDraggable } from "@dnd-kit/core";

// ─── Constants ───────────────────────────────────────────────
const HOUR_PX = 64;
const TOTAL_HOURS = 24;
const BASE = "http://localhost:8000";

const DAYS = ["S","M","T","W","T","F","S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TYPE_COLORS = {
  teal:   { bg: "#0d3d3a", border: "#2dd4bf", text: "#2dd4bf" },
  purple: { bg: "#1e1040", border: "#8b5cf6", text: "#a78bfa" },
  pink:   { bg: "#3b0d2a", border: "#ec4899", text: "#f472b6" },
  gray:   { bg: "#1a1a2e", border: "#4b5563", text: "#9ca3af" },
  blue:   { bg: "#0d1f3d", border: "#3b82f6", text: "#60a5fa" },
  sleep:  { bg: "#0a0a1a", border: "#312e81", text: "#6366f1" },
};

// ─── API helpers ─────────────────────────────────────────────
const api = {
  getSchedule: (wake = "07:00", sleep = "23:00") =>
    fetch(`${BASE}/schedule/generate?wake_time=${wake}&sleep_time=${sleep}`).then(r => r.json()),
  getTasks: () => fetch(`${BASE}/tasks/`).then(r => r.json()),
  createTask: (task) => fetch(`${BASE}/tasks/`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task)
  }).then(r => r.json()),
  updateTask: (id, update) => fetch(`${BASE}/tasks/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update)
  }).then(r => r.json()),
  chat: (message, wake, sleep) => fetch(`${BASE}/chat/`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, wake_time: wake, sleep_time: sleep })
  }).then(r => r.json()),
};

// ─── Helpers ─────────────────────────────────────────────────
function timeStrToH(str) {
  if (!str) return 0;
  const [h, m] = str.split(":").map(Number);
  return h + m / 60;
}

function hToTimeStr(h) {
  const hrs = Math.floor(h) % 24;
  const mins = Math.round((h % 1) * 60);
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatHour(h) {
  const period = h >= 12 ? "pm" : "am";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
}

// ─── Draggable Event Block ────────────────────────────────────
function DraggableEvent({ ev, onComplete, onMiss }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ev.id });
  const colors = TYPE_COLORS[ev.type] || TYPE_COLORS.gray;

  const style = {
    top: ev.startH * HOUR_PX,
    height: Math.max(ev.durH * HOUR_PX - 3, 28),
    position: "absolute",
    left: 6,
    right: 6,
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.85 : 1,
    background: colors.bg,
    borderLeft: `3px solid ${colors.border}`,
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "grab",
    boxShadow: isDragging ? `0 8px 32px ${colors.border}44` : `0 2px 8px #00000044`,
    transition: isDragging ? "none" : "box-shadow 0.2s",
    overflow: "hidden",
    userSelect: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, letterSpacing: "0.02em", marginBottom: 2 }}>
        {ev.title}
      </div>
      {ev.durH >= 0.75 && (
        <div style={{ fontSize: 10, color: colors.text + "99" }}>
          {hToTimeStr(ev.startH)} – {hToTimeStr(ev.startH + ev.durH)}
        </div>
      )}
      {ev.durH >= 1 && ev.task_id && (
        <div style={{ display: "flex", gap: 4, marginTop: 6 }} onPointerDown={e => e.stopPropagation()}>
          <button onClick={() => onComplete(ev.task_id)}
            style={{ fontSize: 11, background: "#ffffff11", border: "none", borderRadius: 4, padding: "2px 7px", color: "#fff", cursor: "pointer" }}>
            ✅ Done
          </button>
          <button onClick={() => onMiss(ev.task_id)}
            style={{ fontSize: 11, background: "#ffffff11", border: "none", borderRadius: 4, padding: "2px 7px", color: "#fff", cursor: "pointer" }}>
            ❌ Miss
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Mini Month Calendar ──────────────────────────────────────
function MiniCalendar({ selectedDay, onSelect, eventDays }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div style={{ padding: "0 0 16px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 12, letterSpacing: "0.05em" }}>
        {MONTHS[month]} {year}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#4b5563", fontWeight: 600, padding: "2px 0" }}>{d}</div>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const isToday = d === now.getDate();
          const isSelected = d === selectedDay;
          const hasEvent = eventDays.includes(d);
          return (
            <div key={d} onClick={() => onSelect(d)} style={{
              textAlign: "center", fontSize: 11, padding: "4px 2px", borderRadius: 6, cursor: "pointer",
              background: isSelected ? "#7c3aed" : isToday ? "#1e1040" : "transparent",
              color: isSelected ? "#fff" : isToday ? "#a78bfa" : "#9ca3af",
              fontWeight: isToday || isSelected ? 700 : 400,
              position: "relative",
            }}>
              {d}
              {hasEvent && !isSelected && (
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#7c3aed", margin: "1px auto 0" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sleep Stats ─────────────────────────────────────────────
function SleepStats() {
  const score = 74;
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: 16, marginTop: 8 }}>
      <div style={{ fontSize: 11, color: "#4b5563", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>SLEEP HEALTH</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{ position: "relative", width: 48, height: 48 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="24" cy="24" r={r} fill="none" stroke="#1a1a2e" strokeWidth="4" />
            <circle cx="24" cy="24" r={r} fill="none" stroke="#7c3aed" strokeWidth="4"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#a78bfa" }}>{score}</div>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>6h 40m</div>
          <div style={{ fontSize: 10, color: "#4b5563" }}>Last night · Goal: 8h</div>
        </div>
      </div>
      {[
        { label: "Deep", pct: 55, color: "#5b21b6", val: "1h 50m" },
        { label: "REM",  pct: 40, color: "#7c3aed", val: "1h 20m" },
        { label: "Light",pct: 70, color: "#4338ca", val: "3h 30m" },
      ].map(b => (
        <div key={b.label} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginBottom: 3 }}>
            <span>{b.label}</span><span>{b.val}</span>
          </div>
          <div style={{ height: 4, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${b.pct}%`, background: b.color, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Add Task Form ────────────────────────────────────────────
function AddTaskForm({ onAdd }) {
  const [form, setForm] = useState({ name: "", duration_minutes: 30, priority: "medium", task_type: "flexible", fixed_time: "" });
  const [open, setOpen] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return;
    await api.createTask(form);
    setForm({ name: "", duration_minutes: 30, priority: "medium", task_type: "flexible", fixed_time: "" });
    setOpen(false);
    onAdd();
  };

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid #1a1a2e", paddingTop: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "#1e1040", border: "1px solid #7c3aed44", borderRadius: 8,
        color: "#a78bfa", fontSize: 12, fontWeight: 600, padding: "8px", cursor: "pointer",
        letterSpacing: "0.05em"
      }}>
        {open ? "✕ Cancel" : "+ Add Task"}
      </button>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Task name" onKeyDown={e => e.key === "Enter" && submit()}
            style={inputStyle} />
          <div style={{ display: "flex", gap: 6 }}>
            <input type="number" value={form.duration_minutes}
              onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
              style={{ ...inputStyle, width: 70 }} placeholder="Min" />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <select value={form.task_type} onChange={e => setForm({ ...form, task_type: e.target.value })} style={inputStyle}>
            <option value="flexible">Flexible</option>
            <option value="fixed">Fixed time</option>
            <option value="free">Free time</option>
          </select>
          {form.task_type === "fixed" && (
            <input type="time" value={form.fixed_time}
              onChange={e => setForm({ ...form, fixed_time: e.target.value })} style={inputStyle} />
          )}
          <button onClick={submit} style={{
            background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff",
            fontSize: 12, fontWeight: 700, padding: "9px", cursor: "pointer"
          }}>Add to Schedule</button>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  flex: 1, background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: 7,
  padding: "8px 10px", color: "#e2e8f0", fontSize: 12, outline: "none", width: "100%",
};

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [events, setEvents] = useState([]);
  const [messages, setMessages] = useState([
    { type: "ai", text: "Hey! I'm SleepSync. Add tasks and I'll build your optimal schedule. You can also ask me to adjust things anytime." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [wake, setWake] = useState("07:00");
  const [sleep, setSleep] = useState("23:00");
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const nowLineRef = useRef();
  const chatEndRef = useRef();

  // Load schedule from backend
  const loadSchedule = async () => {
    try {
      const data = await api.getSchedule(wake, sleep);
      const blocks = (data.schedule || []).map((b, i) => ({
        id: b.task_id ?? `sleep-${i}`,
        task_id: b.task_id,
        title: b.name,
        type: b.type === "sleep" ? "sleep" : b.type === "fixed" ? "purple" : b.type === "free" ? "teal" : "blue",
        startH: timeStrToH(b.start),
        durH: b.end === "07:00" && b.type === "sleep"
          ? (24 - timeStrToH(b.start))
          : timeStrToH(b.end) - timeStrToH(b.start),
      }));
      setEvents(blocks);
    } catch {
      console.log("Backend not connected — showing demo data");
      setEvents([
        { id: 1, task_id: 1, title: "Morning run", type: "teal", startH: 7, durH: 0.75 },
        { id: 2, task_id: 2, title: "Deep work", type: "purple", startH: 9, durH: 3 },
        { id: 3, task_id: 3, title: "Lunch", type: "gray", startH: 12, durH: 1 },
        { id: 4, task_id: null, title: "Sleep", type: "sleep", startH: 23, durH: 8 },
      ]);
    }
  };

  useEffect(() => { loadSchedule(); }, [wake, sleep]);

  // Now line
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60;
      if (nowLineRef.current) nowLineRef.current.style.top = `${h * HOUR_PX}px`;
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Drag end
  const handleDragEnd = ({ active, delta }) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== active.id) return ev;
      let newStart = ev.startH + delta.y / HOUR_PX;
      newStart = Math.round(newStart * 4) / 4;
      newStart = Math.max(0, Math.min(TOTAL_HOURS - ev.durH, newStart));
      return { ...ev, startH: newStart };
    }));
  };

  // Mark complete / missed
  const markComplete = async (taskId) => {
    await api.updateTask(taskId, { is_completed: true });
    setMessages(p => [...p, { type: "ai", text: "Great job completing that task! 🎉 Keep it up." }]);
    loadSchedule();
  };

  const markMissed = async (taskId) => {
    await api.updateTask(taskId, { is_missed: true });
    setMessages(p => [...p, { type: "ai", text: "No worries — I've noted this miss. If it keeps happening I'll help adjust your schedule." }]);
    loadSchedule();
  };

  // AI Chat
  const sendMsg = async () => {
    const txt = input.trim();
    if (!txt || loading) return;
    setMessages(p => [...p, { type: "user", text: txt }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chat(txt, wake, sleep);
      setMessages(p => [...p, { type: "ai", text: res.message }]);
      if (res.warning) {
        setTimeout(() => setMessages(p => [...p, { type: "ai", text: `⚠️ ${res.warning}` }]), 500);
      }
      if (res.action !== "none") loadSchedule();
    } catch {
      setMessages(p => [...p, { type: "ai", text: "I couldn't connect to the backend right now. Make sure your server is running." }]);
    }
    setLoading(false);
  };

  const now = new Date();

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{ display: "grid", gridTemplateRows: "52px 1fr", height: "100vh", background: "#060610", color: "#e2e8f0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* ── Topbar ── */}
        <div style={{ background: "#0a0a18", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", padding: "0 24px", gap: 24 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#a78bfa", letterSpacing: "-0.02em" }}>SleepSync</span>
          <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 11, color: "#4b5563" }}>Wake</label>
            <input type="time" value={wake} onChange={e => setWake(e.target.value)}
              style={{ ...inputStyle, padding: "4px 8px", fontSize: 11, width: "auto" }} />
            <label style={{ fontSize: 11, color: "#4b5563" }}>Sleep</label>
            <input type="time" value={sleep} onChange={e => setSleep(e.target.value)}
              style={{ ...inputStyle, padding: "4px 8px", fontSize: 11, width: "auto" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#1e1040", borderRadius: 20, padding: "4px 12px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed" }} />
            <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>Sleep score: 74</span>
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 280px", overflow: "hidden" }}>

          {/* ── Left Panel ── */}
          <div style={{ borderRight: "1px solid #1a1a2e", padding: "16px 14px", overflowY: "auto", background: "#07070f" }}>
            <MiniCalendar selectedDay={selectedDay} onSelect={setSelectedDay} eventDays={[3,7,11,14,17,20,23]} />
            <SleepStats />
            <AddTaskForm onAdd={loadSchedule} />
          </div>

          {/* ── Center: Calendar ── */}
          <div style={{ position: "relative", overflowY: "auto", background: "#060610" }}>
            <div style={{ position: "relative", height: TOTAL_HOURS * HOUR_PX }}>

              {/* Hour rows */}
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ position: "absolute", top: h * HOUR_PX, left: 0, right: 0, height: HOUR_PX, display: "flex", borderBottom: "1px solid #0f0f1e" }}>
                  <div style={{ width: 52, fontSize: 10, color: "#374151", paddingTop: 6, paddingLeft: 10, flexShrink: 0, fontWeight: 500 }}>
                    {formatHour(h)}
                  </div>
                  <div style={{ flex: 1, borderLeft: "1px solid #0f0f1e" }} />
                </div>
              ))}

              {/* Events layer */}
              <div style={{ position: "absolute", top: 0, left: 52, right: 0 }}>
                {events.map(ev => (
                  <DraggableEvent key={ev.id} ev={ev} onComplete={markComplete} onMiss={markMissed} />
                ))}
              </div>

              {/* Now line */}
              <div ref={nowLineRef} style={{ position: "absolute", left: 52, right: 0, height: 2, background: "#7c3aed", zIndex: 10, pointerEvents: "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", position: "absolute", left: -4, top: -3, boxShadow: "0 0 6px #7c3aed" }} />
              </div>

            </div>
          </div>

          {/* ── Right Panel: AI Chat ── */}
          <div style={{ borderLeft: "1px solid #1a1a2e", display: "flex", flexDirection: "column", background: "#07070f" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a2e" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", letterSpacing: "0.1em" }}>AI ASSISTANT</div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.type === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: m.type === "user" ? "#1e1040" : "#0d0d1a",
                  border: `1px solid ${m.type === "user" ? "#7c3aed44" : "#1a1a2e"}`,
                  borderRadius: m.type === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  padding: "9px 12px",
                  fontSize: 12,
                  color: m.type === "user" ? "#c4b5fd" : "#9ca3af",
                  lineHeight: 1.5,
                }}>
                  {m.text}
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: "flex-start", background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "14px 14px 14px 4px", padding: "9px 14px", fontSize: 12, color: "#4b5563" }}>
                  Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: "12px 14px", borderTop: "1px solid #1a1a2e", display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMsg()}
                placeholder="Ask SleepSync..."
                style={{ ...inputStyle, fontSize: 12 }}
              />
              <button onClick={sendMsg} disabled={loading} style={{
                background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff",
                fontSize: 16, width: 38, cursor: "pointer", flexShrink: 0,
                opacity: loading ? 0.5 : 1
              }}>↑</button>
            </div>
          </div>

        </div>
      </div>
    </DndContext>
  );
}