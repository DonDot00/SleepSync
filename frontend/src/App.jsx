import { useState, useRef, useEffect, useCallback } from "react";
import { DndContext, useDraggable, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import "./App.css";

const HOUR_PX = 64;
const TOTAL_HOURS = 24;
const DAYS = ["S","M","T","W","T","F","S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SLEEP_TIPS = [
  "Keep your wake-up time consistent, even on weekends.",
  "Avoid caffeine after 2pm — it has a half-life of 5–6 hours.",
  "Cool your room to 65–68°F for optimal deep sleep.",
  "Dim your lights an hour before bed to trigger melatonin.",
  "A 10–20 minute nap before 3pm can restore alertness without disrupting nighttime sleep.",
  "Avoid alcohol within 3 hours of bedtime — it fragments your sleep cycles.",
  "Write a to-do list before bed to offload mental chatter.",
  "Exercise improves sleep quality, but avoid intense workouts within 2 hours of bedtime.",
  "Expose yourself to bright light within 30 minutes of waking to set your circadian clock.",
  "Keep your bedroom for sleep only — no work, no scrolling.",
  "Magnesium glycinate before bed may help you fall asleep faster.",
  "A consistent bedtime is more important than total hours for sleep quality.",
  "REM sleep peaks in the last third of the night — cutting sleep short loses the most restorative phase.",
  "Stress is the #1 cause of insomnia. A 5-minute body scan before bed can reduce cortisol.",
  "Reading a physical book before bed is one of the most effective wind-down habits.",
  "Avoid large meals within 2–3 hours of bedtime.",
  "Mouth tape or nasal breathing can improve sleep quality significantly.",
  "Even one night of poor sleep reduces cognitive performance by up to 30%.",
  "Cold showers in the morning, not at night — they raise alertness.",
  "Consistent sleep debt accumulates — you can't fully catch up on weekends.",
  "Blue light from screens suppresses melatonin by up to 3 hours.",
  "Sleeping 7–9 hours is strongly correlated with lower risk of heart disease.",
  "If you can't sleep after 20 minutes, get up and do something calm until you feel sleepy.",
  "Journaling 3 things you're grateful for before bed reduces anxiety and improves sleep onset.",
  "Your chronotype (morning vs night person) is largely genetic — work with it, not against it.",
  "Napping longer than 30 minutes can cause sleep inertia — set an alarm.",
  "Avoid checking your phone first thing in the morning — it spikes cortisol immediately.",
  "Weighted blankets have shown measurable improvements in sleep for people with anxiety.",
  "Deep breathing (4-7-8 method) activates the parasympathetic nervous system before sleep.",
  "Lavender scent has been shown in studies to improve sleep quality.",
  "Establish a pre-sleep ritual — your brain will learn to associate it with sleep.",
  "Sleeping on your side reduces snoring and is better for brain waste clearance.",
  "Avoid napping after 4pm — it will delay your sleep onset.",
  "Even 15 minutes of morning sunlight improves sleep onset time at night.",
  "Chronic sleep deprivation is linked to increased appetite and weight gain.",
  "A warm bath 1–2 hours before bed lowers core body temperature and promotes sleep.",
  "Melatonin works best for shifting your sleep schedule, not for staying asleep.",
  "Pink noise (like rain) has shown stronger sleep benefits than white noise.",
  "Sleep tracking wearables are most useful for spotting trends, not single nights.",
  "Your body repairs muscle during deep sleep — prioritize it after hard workouts.",
  "Limit water intake 2 hours before bed to reduce nighttime waking.",
  "Anxiety about sleep makes it worse — remind yourself that rest is still valuable even awake.",
  "Going to bed slightly earlier than usual is one of the fastest ways to improve your sleep score.",
  "Eating tryptophan-rich foods (turkey, eggs, nuts) supports serotonin and melatonin production.",
  "Power down your devices 30 minutes before bed and use that time for stretching or breathing.",
  "Sleep quality matters more than quantity — 7 hours of deep sleep beats 9 hours of light sleep.",
  "Keep a sleep log for two weeks — patterns often reveal surprising causes of poor sleep.",
  "Pets in the bed can reduce sleep quality — consider a pet bed nearby instead.",
  "Overthinking at night? Do a brain dump — write everything down and give yourself permission to stop.",
  "The first 90 minutes of sleep contain the most deep (slow-wave) sleep of the night.",
  "Avoiding screens isn't just about blue light — the mental stimulation delays sleep onset.",
  "Alcohol may help you fall asleep but dramatically reduces REM sleep in the second half of the night.",
  "Your sleep need is genetic — stop comparing your hours to others.",
  "A cold bedroom and warm blanket is the optimal sleep environment for most people.",
  "If you wake at the same time every night, check what you ate or drank 6 hours prior.",
  "Deep sleep declines with age — strength training can partially offset this decline.",
  "Morning light exposure advances your circadian rhythm — useful if you want to sleep earlier.",
  "Evening light exposure delays your circadian rhythm — useful if you want to sleep later.",
  "Sleep deprivation impairs emotional regulation more than almost any other cognitive function.",
  "A short walk after dinner improves blood sugar regulation and can improve sleep quality.",
];

const INITIAL_EVENTS = [
  { id:1, title:"Morning run",       type:"teal",   startH:7,  durH:0.75, badge:null,                  location:"Riverside Park", description:"5K easy pace along the river trail." },
  { id:2, title:"Hackathon kickoff", type:"purple", startH:9,  durH:3,    badge:"High focus window",   location:"Room 4B",        description:"Team intro, problem statement reveal, sprint planning." },
  { id:3, title:"Lunch break",       type:"gray",   startH:12, durH:1,    badge:null,                  location:"Cafeteria",      description:"Step away from the screen and recharge." },
  { id:4, title:"Build sprint",      type:"purple", startH:13, durH:5,    badge:"Wind down by 10pm",   location:"Room 4B",        description:"Core build time. No meetings, deep focus." },
  { id:5, title:"Team dinner",       type:"pink",   startH:19, durH:1.5,  badge:null,                  location:"The Rustic Table",description:"Casual dinner with the team before the final push." },
];

const INITIAL_MESSAGES = [
  { from:"ai",   text:"Hey! You have a big day ahead. I've protected your wind-down window — aim to wrap up by 10pm tonight." },
  { from:"user", text:"Can you move my run to 6am?" },
  { from:"ai",   text:"Done! Shifted to 6:00–6:45am. That gives you more focus time before kickoff." },
];

const TYPE_OPTIONS = ["purple","teal","pink","gray"];
const TYPE_LABELS  = { purple:"Work", teal:"Exercise", pink:"Personal", gray:"Rest" };

function fmtH(h) {
  const hrs  = Math.floor(h) % 24;
  const mins = Math.round((h % 1) * 60);
  const p    = hrs >= 12 ? "pm" : "am";
  const d    = hrs % 12 === 0 ? 12 : hrs % 12;
  return mins === 0 ? `${d}${p}` : `${d}:${String(mins).padStart(2,"0")}${p}`;
}
function snap(h) { return Math.round(h * 4) / 4; }
function hToInput(h) {
  const hrs = Math.floor(h) % 24, mins = Math.round((h % 1) * 60);
  return `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}`;
}
function inputToH(str) { const [h,m] = str.split(":").map(Number); return h + m/60; }
function randomTip() { return SLEEP_TIPS[Math.floor(Math.random() * SLEEP_TIPS.length)]; }

/* ── Event Modal ── */
function EventModal({ ev, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...ev });
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`modal-color-bar ev-${form.type}`} />
          <span style={{ flex:1, paddingLeft:12, fontSize:13, fontWeight:600, color:"#e8e4f0" }}>{form.title || "Event"}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="modal-label">Title</label>
          <input className="modal-input" value={form.title} onChange={e => set("title",e.target.value)} />
          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location||""} onChange={e => set("location",e.target.value)} placeholder="Add location..." />
          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description||""} onChange={e => set("description",e.target.value)} placeholder="Add description..." rows={3} />
          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Start time</label>
              <input className="modal-input" type="time" value={hToInput(form.startH)} onChange={e => set("startH",inputToH(e.target.value))} />
            </div>
            <div className="modal-col">
              <label className="modal-label">Duration (hrs)</label>
              <input className="modal-input" type="number" step="0.25" min="0.25" max="24" value={form.durH} onChange={e => set("durH",parseFloat(e.target.value))} />
            </div>
          </div>
          <label className="modal-label">Type</label>
          <div className="modal-type-row">
            {TYPE_OPTIONS.map(t => (
              <button key={t} onClick={() => set("type",t)}
                className={`modal-type-btn ev-${t} ${form.type===t?"selected":""}`}>
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

/* ── Add Event Modal ── */
function AddEventModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ title:"", type:"purple", startH:9, durH:1, location:"", description:"", badge:null });
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));
  const handleAdd = () => { if (!form.title.trim()) return; onAdd({ ...form, id:Date.now() }); onClose(); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`modal-color-bar ev-${form.type}`} />
          <span style={{ flex:1, paddingLeft:12, fontSize:13, fontWeight:600, color:"#e8e4f0" }}>New event</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="modal-label">Title</label>
          <input className="modal-input" value={form.title} onChange={e => set("title",e.target.value)} placeholder="Event title..." autoFocus />
          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location} onChange={e => set("location",e.target.value)} placeholder="Add location..." />
          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description} onChange={e => set("description",e.target.value)} placeholder="Add description..." rows={3} />
          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Start time</label>
              <input className="modal-input" type="time" value={hToInput(form.startH)} onChange={e => set("startH",inputToH(e.target.value))} />
            </div>
            <div className="modal-col">
              <label className="modal-label">Duration (hrs)</label>
              <input className="modal-input" type="number" step="0.25" min="0.25" max="24" value={form.durH} onChange={e => set("durH",parseFloat(e.target.value))} />
            </div>
          </div>
          <label className="modal-label">Type</label>
          <div className="modal-type-row">
            {TYPE_OPTIONS.map(t => (
              <button key={t} onClick={() => set("type",t)}
                className={`modal-type-btn ev-${t} ${form.type===t?"selected":""}`}>
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

/* ── Draggable Event — fixed with activation constraint ── */
function CalEvent({ ev, dimmed, onClickEvent }) {
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
        cursor:    isDragging ? "grabbing" : "pointer",
      }}
      onClick={() => { if (!transform) onClickEvent(ev); }}
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
      style={{ height:Math.max(ev.durH*HOUR_PX-3,26), opacity:0.9, width:230, pointerEvents:"none" }}>
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(ev.startH+ev.durH)}</div>
    </div>
  );
}

/* ── Mini Calendar ── */
function MonthCalendar({ selectedDay, onSelectDay, eventDays }) {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const isCurrent   = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const prevMonth = () => viewMonth===0 ? (setViewMonth(11),setViewYear(y=>y-1)) : setViewMonth(m=>m-1);
  const nextMonth = () => viewMonth===11 ? (setViewMonth(0),setViewYear(y=>y+1)) : setViewMonth(m=>m+1);
  return (
    <div>
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={()=>setViewYear(y=>y-1)} title="Previous year">«</button>
        <button className="cal-nav-btn" onClick={prevMonth} title="Previous month">‹</button>
        <span className="cal-nav-label">{MONTHS[viewMonth]} {viewYear}</span>
        <button className="cal-nav-btn" onClick={nextMonth} title="Next month">›</button>
        <button className="cal-nav-btn" onClick={()=>setViewYear(y=>y+1)} title="Next year">»</button>
      </div>
      <div className="month-grid">
        {DAYS.map((d,i) => <div key={i} className="day-label">{d}</div>)}
        {Array.from({length:firstDow}).map((_,i) => <div key={`b${i}`} className="day-cell empty" />)}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d => {
          const isToday    = isCurrent && d === now.getDate();
          const isSelected = isCurrent && d === selectedDay;
          const hasEvent   = isCurrent && eventDays.includes(d);
          return (
            <div key={d} onClick={()=>onSelectDay(d)}
              className={`day-cell${isSelected?" today":""}${hasEvent?" has-event":""}`}
              style={isToday&&!isSelected?{color:"#a78fff",fontWeight:600}:{}}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="mini-legend">
        <div className="legend-item"><span className="legend-dot purple"/>Work / deadline</div>
        <div className="legend-item"><span className="legend-dot teal"/>Exercise</div>
        <div className="legend-item"><span className="legend-dot pink"/>Personal</div>
        <div className="legend-item"><span className="legend-dot gray"/>Rest day</div>
      </div>
      <div className="weekly-stats">
        <div className="panel-title" style={{marginTop:14}}>This week</div>
        <div className="stat-row"><span className="stat-label">Avg sleep</span><span className="stat-val">6h 52m</span></div>
        <div className="stat-row"><span className="stat-label">Best night</span><span className="stat-val">8h 10m</span></div>
        <div className="stat-row"><span className="stat-label">Goal hit</span><span className="stat-val purple">3 / 7</span></div>
        <div className="week-bar-row">
          {["M","T","W","T","F","S","S"].map((d,i)=>{
            const h=[65,80,50,90,70,45,75][i];
            return (
              <div key={i} className="week-bar-wrap">
                <div className="week-bar-track">
                  <div className="week-bar-fill" style={{height:`${h}%`,background:h>=75?"#7f77dd":"#2a2050"}}/>
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

/* ── Energy Slider ── */
function EnergySlider({ value, onChange }) {
  const labels = ["Exhausted","Low","Moderate","Good","Peak"];
  const colors = ["#ef4444","#f97316","#eab308","#84cc16","#22c55e"];
  return (
    <div className="energy-panel">
      <div className="energy-header">
        <span className="panel-title" style={{marginBottom:0}}>Energy level</span>
        <span className="energy-label" style={{color:colors[value-1]}}>{labels[value-1]}</span>
      </div>
      <input type="range" min="1" max="5" step="1" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="energy-slider"
        style={{"--thumb-color": colors[value-1]}} />
      <div className="energy-ticks">
        {labels.map((l,i) => (
          <span key={i} style={{color: i+1===value ? colors[i] : "#3a3460", fontSize:9}}>{i+1}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Burnout Banner ── */
function BurnoutBanner({ nights, onDismiss }) {
  if (nights < 3) return null;
  return (
    <div className="burnout-banner">
      <div className="burnout-icon">⚠</div>
      <div className="burnout-text">
        <strong>Burnout risk detected</strong>
        <span>You've had under 7 hours of sleep for {nights} nights in a row. Consider a lighter schedule today.</span>
      </div>
      <button className="burnout-close" onClick={onDismiss}>✕</button>
    </div>
  );
}

/* ── Sleep Tip Card ── */
function SleepTip({ tip, onDismiss, onDontShow }) {
  if (!tip) return null;
  return (
    <div className="tip-card">
      <div className="tip-content">
        <div className="tip-label">Sleep tip</div>
        <div className="tip-text">{tip}</div>
      </div>
      <div className="tip-actions">
        <button className="tip-btn-dontshow" onClick={onDontShow}>Don't show again</button>
        <button className="tip-btn-close" onClick={onDismiss}>✕</button>
      </div>
    </div>
  );
}

/* ── Sleep Health ── */
function SleepHealth({ showTip, tip, onDismissTip, onDontShowTip }) {
  const score = 74;
  const r     = 34;
  const circ  = 2 * Math.PI * r;
  const offset = circ - (score/100)*circ;
  return (
    <div className="sleep-section">
      <div className="panel-title">Sleep health</div>
      <div className="sleep-ring-row">
        <div className="ring-wrap" style={{width:80,height:80}}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{transform:"rotate(-90deg)"}}>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#1e1830" strokeWidth="6"/>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#7f77dd" strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
          </svg>
          <div className="ring-center" style={{fontSize:18}}>{score}</div>
        </div>
        <div className="sleep-meta">
          <div className="sleep-meta-val" style={{fontSize:24}}>6h 40m</div>
          <div className="sleep-meta-label">Last night</div>
          <div className="sleep-meta-label goal">Goal: 8h</div>
          <div style={{marginTop:5,fontSize:11,color:"#534ab7"}}>↑ 12 min from avg</div>
        </div>
      </div>
      <div className="sleep-bars">
        {[
          {label:"Deep",  pct:55, color:"#534ab7", val:"1h 50m"},
          {label:"REM",   pct:40, color:"#7f77dd", val:"1h 20m"},
          {label:"Light", pct:70, color:"#3c3489", val:"3h 30m"},
        ].map(b => (
          <div key={b.label} className="bar-row">
            <span className="bar-label">{b.label}</span>
            <div className="bar-track"><div className="bar-fill" style={{width:`${b.pct}%`,background:b.color}}/></div>
            <span className="bar-val">{b.val}</span>
          </div>
        ))}
      </div>
      <div className="sleep-chips">
        {[
          {label:"Bedtime",     val:"11:22pm"},
          {label:"Wake",        val:"6:58am"},
          {label:"Sleep onset", val:"14 min"},
          {label:"Restless",    val:"3×"},
        ].map(s => (
          <div key={s.label} className="sleep-chip">
            <div className="sleep-chip-val">{s.val}</div>
            <div className="sleep-chip-label">{s.label}</div>
          </div>
        ))}
      </div>
      {showTip && (
        <SleepTip tip={tip} onDismiss={onDismissTip} onDontShow={onDontShowTip} />
      )}
    </div>
  );
}

/* ── AI Chat ── */
function AIChat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput]       = useState("");
  const endRef = useRef();
  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);
  const send = () => {
    const txt = input.trim(); if (!txt) return;
    setMessages(p => [...p, {from:"user",text:txt}]);
    setInput("");
    setTimeout(() => {
      setMessages(p => [...p, {from:"ai",text:"Got it! I'll factor that into your schedule and keep your sleep protected."}]);
    }, 600);
  };
  return (
    <div className="chat-section">
      <div className="panel-title">AI assistant</div>
      <div className="chat-messages">
        {messages.map((m,i) => <div key={i} className={`msg msg-${m.from}`}>{m.text}</div>)}
        <div ref={endRef}/>
      </div>
      <div className="chat-input-row">
        <input className="chat-input" placeholder="Ask SleepSync..."
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}/>
        <button className="send-btn" onClick={send}>↑</button>
      </div>
    </div>
  );
}

/* ── Root App ── */
export default function App() {
  const [events,      setEvents]      = useState(INITIAL_EVENTS);
  const [activeId,    setActiveId]    = useState(null);
  const [modalEv,     setModalEv]     = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [energy,      setEnergy]      = useState(3);
  const [burnoutNights] = useState(4); // demo: 4 nights under 7h
  const [showBurnout, setShowBurnout] = useState(true);
  const [tip,         setTip]         = useState(() => randomTip());
  const [showTip,     setShowTip]     = useState(true);

  const scrollRef = useRef();
  const nowRef    = useRef();
  const activeEv  = events.find(e => e.id === activeId);

  // Use PointerSensor with activation constraint so click works separately from drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Compute which days have events (for mini calendar dots)
  const today = new Date();
  // For demo we show dots on specific days; in production this comes from your events+date data
  const eventDays = [today.getDate(), 3, 7, 11, 14, 17, 20, 23];

  useEffect(() => {
    if (scrollRef.current) {
      const h = today.getHours() + today.getMinutes()/60;
      scrollRef.current.scrollTop = Math.max(0, h*HOUR_PX - 120);
    }
  }, []);

  useEffect(() => {
    const update = () => {
      const d = new Date(), h = d.getHours()+d.getMinutes()/60;
      if (nowRef.current) nowRef.current.style.top = `${h*HOUR_PX}px`;
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  // Energy-based AI message
  useEffect(() => {
    if (energy <= 2) {
      // Could trigger AI suggestion here
    }
  }, [energy]);

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

  const handleSaveModal  = (updated) => { setEvents(prev => prev.map(ev => ev.id===updated.id ? updated : ev)); setModalEv(null); };
  const handleDeleteModal = (id)     => { setEvents(prev => prev.filter(ev => ev.id!==id)); setModalEv(null); };
  const handleAddEvent    = (newEv)  => setEvents(prev => [...prev, newEv]);

  const handleDontShowTip = () => {
    setShowTip(false);
    // In production: localStorage.setItem("hideSleepTip","true")
  };

  const handleNewTip = () => {
    setTip(randomTip());
    setShowTip(true);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="app">

        {/* Topbar */}
        <div className="topbar">
          <span className="logo">SleepSync</span>
          <span className="topbar-date">
            {today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
          </span>
          <div className="topbar-score"><span className="score-dot"/>Sleep score: 74</div>
        </div>

        <div className="main">

          {/* LEFT */}
          <div className="panel left-panel">
            <MonthCalendar
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              eventDays={eventDays}
            />
          </div>

          {/* CENTER */}
          <div className="center-panel">
            {showBurnout && (
              <BurnoutBanner nights={burnoutNights} onDismiss={() => setShowBurnout(false)} />
            )}
            <div className="today-header">
              <div>
                <span className="today-label">Today</span>
                <span className="today-sub">{events.length} events · Bedtime by 11:00pm</span>
              </div>
              <button className="add-event-btn" onClick={() => setShowAdd(true)}>+ Add event</button>
            </div>

            <EnergySlider value={energy} onChange={setEnergy} />

            {energy <= 2 && (
              <div className="energy-warning">
                Low energy detected — I'll suggest lighter tasks and extra breaks today.
              </div>
            )}

            <div className="cal-scroll-area" ref={scrollRef}>
              <div className="hour-grid" style={{height:TOTAL_HOURS*HOUR_PX}}>
                {Array.from({length:TOTAL_HOURS},(_,h) => (
                  <div key={h} className="hour-row" style={{top:h*HOUR_PX}}>
                    <div className="hour-label">{fmtH(h)}</div>
                    <div className="hour-line"/>
                  </div>
                ))}
                {Array.from({length:TOTAL_HOURS},(_,h) => (
                  <div key={`hh${h}`} className="half-hour-line" style={{top:(h+0.5)*HOUR_PX}}/>
                ))}
                <div className="events-layer">
                  {events.map(ev => (
                    <CalEvent key={ev.id} ev={ev} dimmed={ev.id===activeId} onClickEvent={setModalEv}/>
                  ))}
                </div>
                <div ref={nowRef} className="now-line"><div className="now-dot"/></div>
              </div>
            </div>
          </div>

          {/* RIGHT — sleep top, chat bottom */}
          <div className="right-panel">
            <SleepHealth
              showTip={showTip}
              tip={tip}
              onDismissTip={() => setShowTip(false)}
              onDontShowTip={handleDontShowTip}
            />
            <AIChat/>
          </div>

        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeEv ? <DragGhost ev={activeEv}/> : null}
      </DragOverlay>

      {modalEv && (
        <EventModal ev={modalEv} onClose={() => setModalEv(null)}
          onSave={handleSaveModal} onDelete={handleDeleteModal}/>
      )}
      {showAdd && (
        <AddEventModal onClose={() => setShowAdd(false)} onAdd={handleAddEvent}/>
      )}
    </DndContext>
  );
}