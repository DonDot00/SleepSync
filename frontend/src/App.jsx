import { useState, useRef, useEffect } from "react";
import { DndContext, useDraggable, DragOverlay } from "@dnd-kit/core";
import "./App.css";

const HOUR_PX = 64;
const TOTAL_HOURS = 24;
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const EVENTS_THIS_MONTH = [3, 7, 9, 11, 14, 17, 20, 23];

const INITIAL_EVENTS = [
  { id: 1, title: "Morning run",       type: "teal",   startH: 7,  durH: 0.75, badge: null,     location: "Riverside Park",    description: "5K easy pace along the river trail." },
  { id: 2, title: "Hackathon kickoff", type: "purple", startH: 9,  durH: 3,    badge: "High focus window", location: "Room 4B", description: "Team intro, problem statement reveal, sprint planning." },
  { id: 3, title: "Lunch break",       type: "gray",   startH: 12, durH: 1,    badge: null,     location: "Cafeteria",         description: "Step away from the screen and recharge." },
  { id: 4, title: "Build sprint",      type: "purple", startH: 13, durH: 5,    badge: "Wind down by 10pm", location: "Room 4B", description: "Core build time. No meetings, deep focus." },
  { id: 5, title: "Team dinner",       type: "pink",   startH: 19, durH: 1.5,  badge: null,     location: "The Rustic Table",  description: "Casual dinner with the team before the final push." },
];

const INITIAL_MESSAGES = [
  { from: "ai",   text: "Hey! You have a big day ahead. I've protected your wind-down window — aim to wrap up by 10pm tonight." },
  { from: "user", text: "Can you move my run to 6am?" },
  { from: "ai",   text: "Done! I've shifted the run to 6:00–6:45am. That gives you more focus time before kickoff." },
];

const TYPE_OPTIONS = ["purple","teal","pink","gray"];
const TYPE_LABELS  = { purple: "Work", teal: "Exercise", pink: "Personal", gray: "Rest" };

function fmtH(h) {
  const hrs  = Math.floor(h) % 24;
  const mins = Math.round((h % 1) * 60);
  const period = hrs >= 12 ? "pm" : "am";
  const disp   = hrs % 12 === 0 ? 12 : hrs % 12;
  return mins === 0 ? `${disp}${period}` : `${disp}:${String(mins).padStart(2,"0")}${period}`;
}

function snap(h) { return Math.round(h * 4) / 4; }

function hToInput(h) {
  const hrs  = Math.floor(h) % 24;
  const mins = Math.round((h % 1) * 60);
  return `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}`;
}

function inputToH(str) {
  const [h, m] = str.split(":").map(Number);
  return h + m / 60;
}

/* ── Event modal ── */
function EventModal({ ev, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...ev });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`modal-color-bar ev-${form.type}`} />
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="modal-label">Title</label>
          <input className="modal-input" value={form.title}
            onChange={e => set("title", e.target.value)} />

          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location || ""}
            onChange={e => set("location", e.target.value)} placeholder="Add location..." />

          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description || ""}
            onChange={e => set("description", e.target.value)} placeholder="Add description..." rows={3} />

          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Start time</label>
              <input className="modal-input" type="time" value={hToInput(form.startH)}
                onChange={e => set("startH", inputToH(e.target.value))} />
            </div>
            <div className="modal-col">
              <label className="modal-label">Duration (hrs)</label>
              <input className="modal-input" type="number" step="0.25" min="0.25" max="24"
                value={form.durH} onChange={e => set("durH", parseFloat(e.target.value))} />
            </div>
          </div>

          <label className="modal-label">Type</label>
          <div className="modal-type-row">
            {TYPE_OPTIONS.map(t => (
              <button key={t} onClick={() => set("type", t)}
                className={`modal-type-btn ev-${t} ${form.type === t ? "selected" : ""}`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn-delete" onClick={() => onDelete(ev.id)}>Delete</button>
          <button className="modal-btn-save" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Event modal ── */
function AddEventModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    title: "", type: "purple", startH: 9, durH: 1,
    location: "", description: "", badge: null,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = () => {
    if (!form.title.trim()) return;
    onAdd({ ...form, id: Date.now() });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`modal-color-bar ev-${form.type}`} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e8e4f0", flex: 1, paddingLeft: 12 }}>New event</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="modal-label">Title</label>
          <input className="modal-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Event title..." autoFocus />

          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location} onChange={e => set("location", e.target.value)} placeholder="Add location..." />

          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Add description..." rows={3} />

          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Start time</label>
              <input className="modal-input" type="time" value={hToInput(form.startH)} onChange={e => set("startH", inputToH(e.target.value))} />
            </div>
            <div className="modal-col">
              <label className="modal-label">Duration (hrs)</label>
              <input className="modal-input" type="number" step="0.25" min="0.25" max="24" value={form.durH} onChange={e => set("durH", parseFloat(e.target.value))} />
            </div>
          </div>

          <label className="modal-label">Type</label>
          <div className="modal-type-row">
            {TYPE_OPTIONS.map(t => (
              <button key={t} onClick={() => set("type", t)}
                className={`modal-type-btn ev-${t} ${form.type === t ? "selected" : ""}`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn-delete" onClick={onClose}>Cancel</button>
          <button className="modal-btn-save" onClick={handleAdd}>Add event</button>
        </div>
      </div>
    </div>
  );
}

/* ── Draggable event block ── */
function CalEvent({ ev, dimmed, onClickEvent }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ev.id });

  const dragStartPos = useRef(null);
  const hasDragged   = useRef(false);

  const handlePointerDown = (e) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current   = false;
  };

  const handlePointerMove = (e) => {
    if (!dragStartPos.current) return;
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if (dx > 4 || dy > 4) hasDragged.current = true;
  };

  const handlePointerUp = () => {
    if (!hasDragged.current) onClickEvent(ev);
    dragStartPos.current = null;
    hasDragged.current   = false;
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cal-event ev-${ev.type}`}
      style={{
        top:       ev.startH * HOUR_PX,
        height:    Math.max(ev.durH * HOUR_PX - 3, 26),
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity:   dimmed ? 0.3 : 1,
        zIndex:    isDragging ? 50 : 2,
        cursor:    "pointer",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(ev.startH + ev.durH)}</div>
      {ev.badge && <div className="sleep-badge">{ev.badge}</div>}
    </div>
  );
}

function DragGhost({ ev }) {
  return (
    <div className={`cal-event ev-${ev.type}`}
      style={{ height: Math.max(ev.durH * HOUR_PX - 3, 26), opacity: 0.9, width: 230, pointerEvents: "none" }}>
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(ev.startH + ev.durH)}</div>
    </div>
  );
}

/* ── Mini calendar with month/year nav ── */
function MonthCalendar({ selectedDay, onSelectDay }) {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const prevYear  = () => setViewYear(y => y - 1);
  const nextYear  = () => setViewYear(y => y + 1);

  return (
    <div>
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevYear}  title="Previous year">«</button>
        <button className="cal-nav-btn" onClick={prevMonth} title="Previous month">‹</button>
        <span className="cal-nav-label">{MONTHS[viewMonth]} {viewYear}</span>
        <button className="cal-nav-btn" onClick={nextMonth} title="Next month">›</button>
        <button className="cal-nav-btn" onClick={nextYear}  title="Next year">»</button>
      </div>
      <div className="month-grid">
        {DAYS.map((d, i) => <div key={i} className="day-label">{d}</div>)}
        {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} className="day-cell empty" />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const isToday   = isCurrentMonth && d === now.getDate();
          const isSelected = isCurrentMonth && d === selectedDay;
          return (
            <div key={d} onClick={() => onSelectDay(d)}
              className={`day-cell ${isSelected ? "today" : ""} ${EVENTS_THIS_MONTH.includes(d) ? "has-event" : ""}`}
              style={isToday && !isSelected ? { color: "#a78fff", fontWeight: 600 } : {}}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="mini-legend">
        <div className="legend-item"><span className="legend-dot purple" />Work / deadline</div>
        <div className="legend-item"><span className="legend-dot teal" />Exercise</div>
        <div className="legend-item"><span className="legend-dot pink" />Personal</div>
        <div className="legend-item"><span className="legend-dot gray" />Rest day</div>
      </div>
      <div className="weekly-stats">
        <div className="panel-title" style={{ marginTop: 14 }}>This week</div>
        <div className="stat-row"><span className="stat-label">Avg sleep</span><span className="stat-val">6h 52m</span></div>
        <div className="stat-row"><span className="stat-label">Best night</span><span className="stat-val">8h 10m</span></div>
        <div className="stat-row"><span className="stat-label">Goal hit</span><span className="stat-val purple">3 / 7</span></div>
        <div className="week-bar-row">
          {["M","T","W","T","F","S","S"].map((d, i) => {
            const h = [65,80,50,90,70,45,75][i];
            return (
              <div key={i} className="week-bar-wrap">
                <div className="week-bar-track">
                  <div className="week-bar-fill" style={{ height: `${h}%`, background: h >= 75 ? "#7f77dd" : "#2a2050" }} />
                </div>
                <span className="week-bar-label">{d}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Sleep Health (top right — larger) ── */
function SleepHealth() {
  const score = 74;
  const r     = 34;
  const circ  = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="sleep-section">
      <div className="panel-title">Sleep health</div>
      <div className="sleep-ring-row">
        <div className="ring-wrap" style={{ width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#1e1830" strokeWidth="6" />
            <circle cx="40" cy="40" r={r} fill="none" stroke="#7f77dd" strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <div className="ring-center" style={{ fontSize: 18 }}>{score}</div>
        </div>
        <div className="sleep-meta">
          <div className="sleep-meta-val" style={{ fontSize: 24 }}>6h 40m</div>
          <div className="sleep-meta-label">Last night</div>
          <div className="sleep-meta-label goal">Goal: 8h</div>
          <div style={{ marginTop: 5, fontSize: 11, color: "#534ab7" }}>↑ 12 min from avg</div>
        </div>
      </div>
      <div className="sleep-bars">
        {[
          { label: "Deep",  pct: 55, color: "#534ab7", val: "1h 50m" },
          { label: "REM",   pct: 40, color: "#7f77dd", val: "1h 20m" },
          { label: "Light", pct: 70, color: "#3c3489", val: "3h 30m" },
        ].map(b => (
          <div key={b.label} className="bar-row">
            <span className="bar-label">{b.label}</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${b.pct}%`, background: b.color }} /></div>
            <span className="bar-val">{b.val}</span>
          </div>
        ))}
      </div>
      <div className="sleep-chips">
        {[
          { label: "Bedtime",    val: "11:22pm" },
          { label: "Wake",       val: "6:58am"  },
          { label: "Efficiency", val: "91%"      },
          { label: "Restless",   val: "3×"       },
        ].map(s => (
          <div key={s.label} className="sleep-chip">
            <div className="sleep-chip-val">{s.val}</div>
            <div className="sleep-chip-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="suggestion">
        <div className="suggestion-label">Suggestion</div>
        <div className="suggestion-text">
          You slept 1h 20m less than your goal. Consider a 20min nap between 2–3pm to recover focus.
        </div>
      </div>
    </div>
  );
}

/* ── AI Chat (bottom right — compact) ── */
function AIChat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput]       = useState("");
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    setMessages(p => [...p, { from: "user", text: txt }]);
    setInput("");
    setTimeout(() => {
      setMessages(p => [...p, { from: "ai", text: "Got it! I'll factor that into your schedule and keep your sleep protected." }]);
    }, 600);
  };

  return (
    <div className="chat-section">
      <div className="panel-title">AI assistant</div>
      <div className="chat-messages">
        {messages.map((m, i) => <div key={i} className={`msg msg-${m.from}`}>{m.text}</div>)}
        <div ref={endRef} />
      </div>
      <div className="chat-input-row">
        <input className="chat-input" placeholder="Ask SleepSync..."
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()} />
        <button className="send-btn" onClick={send}>↑</button>
      </div>
    </div>
  );
}

/* ── Root App ── */
export default function App() {
  const [events,     setEvents]     = useState(INITIAL_EVENTS);
  const [activeId,   setActiveId]   = useState(null);
  const [modalEv,    setModalEv]    = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const scrollRef = useRef();
  const nowRef    = useRef();

  const activeEv = events.find(e => e.id === activeId);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const h   = now.getHours() + now.getMinutes() / 60;
      scrollRef.current.scrollTop = Math.max(0, h * HOUR_PX - 120);
    }
  }, []);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const h = d.getHours() + d.getMinutes() / 60;
      if (nowRef.current) nowRef.current.style.top = `${h * HOUR_PX}px`;
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  const onDragStart = ({ active }) => setActiveId(active.id);

  const onDragEnd = ({ active, delta }) => {
    setActiveId(null);
    setEvents(prev => prev.map(ev => {
      if (ev.id !== active.id) return ev;
      let s = snap(ev.startH + delta.y / HOUR_PX);
      s = Math.max(0, Math.min(TOTAL_HOURS - ev.durH, s));
      return { ...ev, startH: s };
    }));
  };

  const handleSaveModal = (updated) => {
    setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev));
    setModalEv(null);
  };

  const handleDeleteModal = (id) => {
    setEvents(prev => prev.filter(ev => ev.id !== id));
    setModalEv(null);
  };

  const handleAddEvent = (newEv) => {
    setEvents(prev => [...prev, newEv]);
  };

  const today = new Date();

  return (
    <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="app">

        {/* Topbar */}
        <div className="topbar">
          <span className="logo">SleepSync</span>
          <span className="topbar-date">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
          <div className="topbar-score"><span className="score-dot" />Sleep score: 74</div>
        </div>

        <div className="main">

          {/* LEFT */}
          <div className="panel left-panel">
            <MonthCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          </div>

          {/* CENTER */}
          <div className="center-panel">
            <div className="today-header">
              <div>
                <span className="today-label">Today</span>
                <span className="today-sub">{events.length} events · Bedtime by 11:00pm</span>
              </div>
              <button className="add-event-btn" onClick={() => setShowAdd(true)}>+ Add event</button>
            </div>

            <div className="cal-scroll-area" ref={scrollRef}>
              <div className="hour-grid" style={{ height: TOTAL_HOURS * HOUR_PX }}>
                {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                  <div key={h} className="hour-row" style={{ top: h * HOUR_PX }}>
                    <div className="hour-label">{fmtH(h)}</div>
                    <div className="hour-line" />
                  </div>
                ))}
                {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                  <div key={`hh${h}`} className="half-hour-line" style={{ top: (h + 0.5) * HOUR_PX }} />
                ))}
                <div className="events-layer">
                  {events.map(ev => (
                    <CalEvent key={ev.id} ev={ev} dimmed={ev.id === activeId}
                      onClickEvent={setModalEv} />
                  ))}
                </div>
                <div ref={nowRef} className="now-line">
                  <div className="now-dot" />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — sleep on top, chat on bottom */}
          <div className="right-panel">
            <SleepHealth />
            <AIChat />
          </div>

        </div>
      </div>

      {/* Drag ghost */}
      <DragOverlay dropAnimation={null}>
        {activeEv ? <DragGhost ev={activeEv} /> : null}
      </DragOverlay>

      {/* Event detail modal */}
      {modalEv && (
        <EventModal
          ev={modalEv}
          onClose={() => setModalEv(null)}
          onSave={handleSaveModal}
          onDelete={handleDeleteModal}
        />
      )}

      {/* Add event modal */}
      {showAdd && (
        <AddEventModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAddEvent}
        />
      )}
    </DndContext>
  );
}