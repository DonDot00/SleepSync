import React, { useState, useEffect, useRef } from "react";
import { DndContext, useDraggable } from "@dnd-kit/core";
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
    position: "absolute",
    left: 4,
    right: 4,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
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

/* ---------- App ---------- */
export default function App() {
  const [events, setEvents] = useState([
    { id:1, title:'Morning run', type:'teal', startH:7, durH:0.75 },
    { id:2, title:'Hackathon kickoff', type:'purple', startH:9, durH:3 },
    { id:3, title:'Lunch break', type:'gray', startH:12, durH:1 },
  ]);

  const [messages, setMessages] = useState([]);
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

  /* ---------- Drag End ---------- */
  const handleDragEnd = (event) => {
    const { active, delta } = event;

    setEvents(prev =>
      prev.map(ev => {
        if (ev.id === active.id) {
          let newStart = ev.startH + delta.y / HOUR_PX;

          newStart = Math.round(newStart * 4) / 4; // snap
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
      { type: "ai", text: "Updated 👍" }
    ]);

    setInput("");
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="app">

        {/* TOP */}
        <div className="topbar">
          <span className="logo">SleepSync</span>
        </div>

        <div className="main">

          {/* LEFT */}
          <div className="left-panel">
            <div className="panel-title">April 2026</div>
            <div className="month-grid">
              {Array.from({ length: 30 }, (_, i) => (
                <div key={i} className="day-cell">{i + 1}</div>
              ))}
            </div>
          </div>

          {/* CENTER */}
          <div className="center-panel">
            <div className="cal-scroll">
              <div
                className="hour-grid"
                style={{ height: TOTAL_HOURS * HOUR_PX }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="hour-row">
                    <div className="hour-label">{h}</div>
                    <div className="hour-slot"></div>
                  </div>
                ))}

                {/* EVENTS */}
                <div className="events-layer">
                  {events.map(ev => (
                    <DraggableEvent key={ev.id} ev={ev} />
                  ))}
                </div>

                {/* NOW LINE */}
                <div ref={nowLineRef} className="time-now-line">
                  <div className="time-now-dot"></div>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-panel">
            <div className="chat-section">

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