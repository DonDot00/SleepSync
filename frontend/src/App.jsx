import React, { useState, useEffect, useRef } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";
import "./App.css";

const HOUR_PX = 60;
const TOTAL_HOURS = 24;

/* ---------- Draggable Event ---------- */
function DraggableEvent({ ev }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: ev.id
  });

  const style = {
    top: ev.startH * HOUR_PX,
    height: ev.durH * HOUR_PX,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cal-event ev-${ev.type}`}
      style={style}
    >
      <div className="cal-event-title">{ev.title}</div>
    </div>
  );
}

/* ---------- Droppable Grid ---------- */
function DroppableGrid({ children }) {
  const { setNodeRef } = useDroppable({ id: "calendar" });

  return (
    <div ref={setNodeRef} className="events-layer">
      {children}
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [events, setEvents] = useState([
    { id:1, title:'Morning run', type:'teal', startH:7, durH:0.75 },
    { id:2, title:'Hackathon kickoff', type:'purple', startH:9, durH:3 },
    { id:3, title:'Lunch break', type:'gray', startH:12, durH:1 },
    { id:4, title:'Build sprint', type:'purple', startH:13, durH:5 },
    { id:5, title:'Team dinner', type:'pink', startH:19, durH:1.5 },
  ]);

  const [messages, setMessages] = useState([
    { type: "ai", text: "Hey! You have a big day ahead." }
  ]);
  const [input, setInput] = useState("");

  const nowLineRef = useRef();

  /* ---------- Time Line ---------- */
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const decH = now.getHours() + now.getMinutes() / 60;
      if (nowLineRef.current) {
        nowLineRef.current.style.top = `${decH * HOUR_PX}px`;
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ---------- Drag Logic ---------- */
  const handleDragEnd = (event) => {
    const { active, delta } = event;

    setEvents(prev =>
      prev.map(ev => {
        if (ev.id === active.id) {
          let newStart = ev.startH + delta.y / HOUR_PX;

          // snap to 15 min
          newStart = Math.round(newStart * 4) / 4;

          // clamp
          newStart = Math.max(0, Math.min(TOTAL_HOURS - ev.durH, newStart));

          return { ...ev, startH: newStart };
        }
        return ev;
      })
    );
  };

  /* ---------- Chat ---------- */
  const sendMsg = () => {
    if (!input.trim()) return;

    setMessages(prev => [
      ...prev,
      { type: "user", text: input },
      { type: "ai", text: "Got it! I updated your schedule 👍" }
    ]);

    setInput("");
  };

  const fmtHour = (h) => {
    const hh = Math.floor(h) % 24;
    const mm = Math.round((h - Math.floor(h)) * 60);
    const ampm = hh < 12 ? "am" : "pm";
    const disp = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    return mm === 0 ? `${disp}${ampm}` : `${disp}:${mm}${ampm}`;
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="app">

        {/* TOP BAR */}
        <div className="topbar">
          <span className="logo">SleepSync</span>
          <span className="topbar-date">Saturday, April 12 2026</span>
          <div className="topbar-score">
            <span className="score-dot"></span>Sleep score: 74
          </div>
        </div>

        <div className="main">

          {/* LEFT PANEL */}
          <div className="left-panel">
            <div className="panel-title">April 2026</div>
            <div className="month-grid">
              {Array.from({ length: 30 }, (_, i) => (
                <div key={i} className="day-cell">{i + 1}</div>
              ))}
            </div>
          </div>

          {/* CENTER PANEL */}
          <div className="center-panel">
            <div className="center-header">
              <span className="today-label">Today</span>
            </div>

            <div className="cal-scroll">
              <div
                className="hour-grid"
                style={{ height: TOTAL_HOURS * HOUR_PX }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="hour-row">
                    <div className="hour-label">
                      {h === 0 ? "" : `${h > 12 ? h - 12 : h}${h < 12 ? "am" : "pm"}`}
                    </div>
                    <div className="hour-slot"></div>
                  </div>
                ))}

                {/* EVENTS */}
                <DroppableGrid>
                  {events.map(ev => (
                    <DraggableEvent key={ev.id} ev={ev} />
                  ))}
                </DroppableGrid>

                {/* CURRENT TIME */}
                <div ref={nowLineRef} className="time-now-line">
                  <div className="time-now-dot"></div>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">

            {/* Sleep */}
            <div className="sleep-section">
              <div className="panel-title">Sleep health</div>
              <div className="sleep-meta-val">6h 40m</div>
            </div>

            {/* Chat */}
            <div className="chat-section">
              <div className="panel-title">AI assistant</div>

              <div className="chat-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`msg msg-${m.type}`}>
                    {m.text}
                  </div>
                ))}
              </div>

              <div className="chat-input-row">
                <input
                  className="chat-input"
                  placeholder="Ask SleepSync..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                />
                <button className="send-btn" onClick={sendMsg}>
                  ↑
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DndContext>
  );
}