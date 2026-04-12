import { useState, useRef, useEffect } from "react";
import { DndContext, useDraggable, DragOverlay } from "@dnd-kit/core";
import "./App.css";

const HOUR_PX = 64;
const TOTAL_HOURS = 24;
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const EVENTS_THIS_MONTH = [3, 7, 9, 11, 14, 17, 20, 23];

const INITIAL_EVENTS = [
  { id: 1, title: "Morning run",       type: "teal",   startH: 7,  durH: 0.75, badge: null },
  { id: 2, title: "Hackathon kickoff", type: "purple", startH: 9,  durH: 3,    badge: "High focus window" },
  { id: 3, title: "Lunch break",       type: "gray",   startH: 12, durH: 1,    badge: null },
  { id: 4, title: "Build sprint",      type: "purple", startH: 13, durH: 5,    badge: "Wind down by 10pm" },
  { id: 5, title: "Team dinner",       type: "pink",   startH: 19, durH: 1.5,  badge: null },
];

const INITIAL_MESSAGES = [
  { from: "ai",   text: "Hey! You have a big day ahead. I've protected your wind-down window — aim to wrap up by 10pm tonight." },
  { from: "user", text: "Can you move my run to 6am?" },
  { from: "ai",   text: "Done! I've shifted the run to 6:00–6:45am. That gives you more focus time before kickoff." },
];

function fmtH(h) {
  const hrs  = Math.floor(h) % 24;
  const mins = Math.round((h % 1) * 60);
  const period = hrs >= 12 ? "pm" : "am";
  const disp   = hrs % 12 === 0 ? 12 : hrs % 12;
  return mins === 0
    ? `${disp}${period}`
    : `${disp}:${String(mins).padStart(2, "0")}${period}`;
}

function snap(h) {
  return Math.round(h * 4) / 4;
}

/* ── Draggable event ── */
function CalEvent({ ev, dimmed }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ev.id });
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
        cursor:    "grab",
      }}
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
      style={{ height: Math.max(ev.durH * HOUR_PX - 3, 26), opacity: 0.92, width: 230, pointerEvents: "none" }}>
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(ev.startH + ev.durH)}</div>
    </div>
  );
}

/* ── Mini calendar ── */
function MonthCalendar() {
  const [selected, setSelected] = useState(12);
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return (
    <div>
      <div className="panel-title">April 2026</div>
      <div className="month-grid">
        {DAYS.map((d, i) => <div key={i} className="day-label">{d}</div>)}
        {Array.from({ length: 2 }).map((_, i) => <div key={`b${i}`} className="day-cell empty" />)}
        {days.map(d => (
          <div key={d} onClick={() => setSelected(d)}
            className={`day-cell ${d === selected ? "today" : ""} ${EVENTS_THIS_MONTH.includes(d) ? "has-event" : ""}`}>
            {d}
          </div>
        ))}
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

/* ── AI Chat ── */
function AIChat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
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

/* ── Sleep Health ── */
function SleepHealth() {
  const score = 74;
  const r = 34;
  const circ = 2 * Math.PI * r;
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

/* ── Root App ── */
export default function App() {
  const [events, setEvents]     = useState(INITIAL_EVENTS);
  const [activeId, setActiveId] = useState(null);
  const scrollRef = useRef();  // only the scroll area moves
  const nowRef    = useRef();

  const activeEv = events.find(e => e.id === activeId);

  /* scroll to current time on mount */
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const h   = now.getHours() + now.getMinutes() / 60;
      scrollRef.current.scrollTop = Math.max(0, h * HOUR_PX - 120);
    }
  }, []);

  /* live now-line */
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

  return (
    <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="app">

        {/* Topbar */}
        <div className="topbar">
          <span className="logo">SleepSync</span>
          <span className="topbar-date">Saturday, April 12 2026</span>
          <div className="topbar-score"><span className="score-dot" />Sleep score: 74</div>
        </div>

        <div className="main">

          {/* LEFT */}
          <div className="panel left-panel">
            <MonthCalendar />
          </div>

          {/* CENTER */}
          <div className="center-panel">

            {/* sticky header — does NOT scroll */}
            <div className="today-header">
              <span className="today-label">Today</span>
              <span className="today-sub">{events.length} events · Bedtime by 11:00pm</span>
            </div>

            {/* scrollable grid — only this part scrolls */}
            <div className="cal-scroll-area" ref={scrollRef}>
              <div className="hour-grid" style={{ height: TOTAL_HOURS * HOUR_PX }}>

                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                  <div key={h} className="hour-row" style={{ top: h * HOUR_PX }}>
                    <div className="hour-label">{fmtH(h)}</div>
                    <div className="hour-line" />
                  </div>
                ))}

                {/* Half-hour dashes */}
                {Array.from({ length: TOTAL_HOURS }, (_, h) => (
                  <div key={`hh${h}`} className="half-hour-line" style={{ top: (h + 0.5) * HOUR_PX }} />
                ))}

                {/* Event blocks */}
                <div className="events-layer">
                  {events.map(ev => (
                    <CalEvent key={ev.id} ev={ev} dimmed={ev.id === activeId} />
                  ))}
                </div>

                {/* Now line */}
                <div ref={nowRef} className="now-line">
                  <div className="now-dot" />
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-panel">
            <AIChat />
            <SleepHealth />
          </div>

        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeEv ? <DragGhost ev={activeEv} /> : null}
      </DragOverlay>
    </DndContext>
  );
}