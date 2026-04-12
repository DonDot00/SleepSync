import { useState, useRef } from "react";
import "./App.css";

// Font: Outfit (body) + Syne (headings/accents)

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const EVENTS_THIS_MONTH = [3, 7, 9, 11, 14, 17, 20, 23];

const TODAY_EVENTS = [
  { time: "7:00am", duration: "7:00 – 7:45am", title: "Morning run", type: "teal", badge: null },
  { time: "9:00am", duration: "9:00am – 12:00pm", title: "Hackathon kickoff", type: "purple", badge: "High focus window" },
  { time: "12:00pm", duration: "12:00 – 1:00pm", title: "Lunch break", type: "gray", badge: null },
  { time: "1:00pm", duration: "1:00 – 6:00pm", title: "Build sprint", type: "purple", badge: "Wind down by 10pm" },
  { time: "7:00pm", duration: "7:00 – 8:30pm", title: "Team dinner", type: "pink", badge: null },
];

const INITIAL_MESSAGES = [
  { from: "ai", text: "Hey! You have a big day ahead. I've protected your wind-down window — aim to wrap up by 10pm tonight." },
  { from: "user", text: "Can you move my run to 6am?" },
  { from: "ai", text: "Done! I've shifted the run to 6:00–6:45am. That gives you more focus time before kickoff." },
];

function MonthCalendar() {
  const [selected, setSelected] = useState(12);
  const blanks = 2;
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="panel left-panel">
      <div className="panel-title">April 2026</div>
      <div className="month-grid">
        {DAYS.map((d, i) => (
          <div key={i} className="day-label">{d}</div>
        ))}
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`blank-${i}`} className="day-cell empty" />
        ))}
        {days.map((d) => (
          <div
            key={d}
            className={`day-cell ${d === selected ? "today" : ""} ${EVENTS_THIS_MONTH.includes(d) ? "has-event" : ""}`}
            onClick={() => setSelected(d)}
          >
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
        <div className="panel-title" style={{marginTop: "14px"}}>This week</div>
        <div className="stat-row">
          <span className="stat-label">Avg sleep</span>
          <span className="stat-val">6h 52m</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Best night</span>
          <span className="stat-val">8h 10m</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Goal hit</span>
          <span className="stat-val purple">3 / 7</span>
        </div>
        <div className="week-bar-row">
          {["M","T","W","T","F","S","S"].map((d, i) => {
            const heights = [65, 80, 50, 90, 70, 45, 75];
            const isGoal = heights[i] >= 75;
            return (
              <div key={i} className="week-bar-wrap">
                <div className="week-bar-track">
                  <div className="week-bar-fill" style={{height: `${heights[i]}%`, background: isGoal ? "#7f77dd" : "#2a2050"}} />
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

function TodaySchedule() {
  const [events, setEvents] = useState(TODAY_EVENTS);
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (i) => {
    dragIndex.current = i;
  };

  const handleDragOver = (e, i) => {
    e.preventDefault();
    setDragOver(i);
  };

  const handleDrop = (i) => {
    if (dragIndex.current === null || dragIndex.current === i) {
      setDragOver(null);
      return;
    }
    const updated = [...events];
    const [moved] = updated.splice(dragIndex.current, 1);
    updated.splice(i, 0, moved);
    setEvents(updated);
    dragIndex.current = null;
    setDragOver(null);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOver(null);
  };

  return (
    <div className="center-panel">
      <div className="today-header">
        <span className="today-label">Today</span>
        <span className="today-sub">4 events · Bedtime by 11:00pm</span>
      </div>
      <div className="timeline">
        {events.map((ev, i) => (
          <div
            key={ev.title}
            className={`time-row${dragOver === i ? " drag-over" : ""}`}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
          >
            <div className="time-label">{ev.time}</div>
            <div className={`event-block ev-${ev.type}`}>
              <div className="event-title">{ev.title}</div>
              <div className="event-time">{ev.duration}</div>
              {ev.badge && <div className="sleep-badge">{ev.badge}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIChat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    setMessages((prev) => [...prev, { from: "user", text: txt }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { from: "ai", text: "Got it! I'll factor that into your schedule and adjust your sleep recommendations." },
      ]);
    }, 600);
  };

  return (
    <div className="chat-section">
      <div className="panel-title">AI assistant</div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.from}`}>{m.text}</div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder="Ask SleepSync..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="send-btn" onClick={send}>↑</button>
      </div>
    </div>
  );
}

function SleepHealth() {
  const score = 74;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="sleep-section">
      <div className="panel-title">Sleep health</div>
      <div className="sleep-ring-row">
        <div className="ring-wrap">
          <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="28" cy="28" r={radius} fill="none" stroke="#1e1830" strokeWidth="5" />
            <circle
              cx="28" cy="28" r={radius}
              fill="none" stroke="#7f77dd" strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="ring-center">{score}</div>
        </div>
        <div className="sleep-meta">
          <div className="sleep-meta-val">6h 40m</div>
          <div className="sleep-meta-label">Last night</div>
          <div className="sleep-meta-label goal">Goal: 8h</div>
        </div>
      </div>
      <div className="sleep-bars">
        {[
          { label: "Deep", pct: 55, color: "#534ab7", val: "1h 50m" },
          { label: "REM", pct: 40, color: "#7f77dd", val: "1h 20m" },
          { label: "Light", pct: 70, color: "#3c3489", val: "3h 30m" },
        ].map((b) => (
          <div key={b.label} className="bar-row">
            <span className="bar-label">{b.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${b.pct}%`, background: b.color }} />
            </div>
            <span className="bar-val">{b.val}</span>
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

export default function App() {
  return (
    <div className="app">
      <div className="topbar">
        <span className="logo">SleepSync</span>
        <span className="topbar-date">Saturday, April 12 2026</span>
        <div className="topbar-score">
          <span className="score-dot" />
          Sleep score: 74
        </div>
      </div>
      <div className="main">
        <MonthCalendar />
        <TodaySchedule />
        <div className="right-panel">
          <AIChat />
          <SleepHealth />
        </div>
      </div>
    </div>
  );
}