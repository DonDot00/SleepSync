import { useState, useRef, useEffect } from "react";
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
  "A 10–20 minute nap before 3pm restores alertness without disrupting nighttime sleep.",
  "Avoid alcohol within 3 hours of bedtime — it fragments your sleep cycles.",
  "Write a to-do list before bed to offload mental chatter.",
  "Exercise improves sleep quality, but avoid intense workouts within 2 hours of bedtime.",
  "Expose yourself to bright light within 30 minutes of waking to set your circadian clock.",
  "Keep your bedroom for sleep only — no work, no scrolling.",
  "A consistent bedtime matters more than total hours for sleep quality.",
  "REM sleep peaks in the last third of the night — cutting sleep short loses the most restorative phase.",
  "Stress is the #1 cause of insomnia. A 5-minute body scan before bed reduces cortisol.",
  "Reading a physical book before bed is one of the most effective wind-down habits.",
  "Avoid large meals within 2–3 hours of bedtime.",
  "Even one night of poor sleep reduces cognitive performance by up to 30%.",
  "Blue light from screens suppresses melatonin by up to 3 hours.",
  "If you can't sleep after 20 minutes, get up and do something calm until you feel sleepy.",
  "Journaling 3 things you're grateful for before bed reduces anxiety and improves sleep onset.",
  "Your chronotype is largely genetic — work with it, not against it.",
  "Napping longer than 30 minutes can cause sleep inertia — set an alarm.",
  "Deep breathing (4-7-8 method) activates the parasympathetic nervous system before sleep.",
  "Establish a pre-sleep ritual — your brain will learn to associate it with sleep.",
  "Sleeping on your side is better for brain waste clearance.",
  "Avoid napping after 4pm — it will delay your sleep onset.",
  "Even 15 minutes of morning sunlight improves sleep onset time at night.",
  "A warm bath 1–2 hours before bed lowers core body temperature and promotes sleep.",
  "Pink noise (like rain) has shown stronger sleep benefits than white noise.",
  "Your body repairs muscle during deep sleep — prioritize it after hard workouts.",
  "Limit water intake 2 hours before bed to reduce nighttime waking.",
  "Going to bed slightly earlier than usual is one of the fastest ways to improve your sleep score.",
  "Power down devices 30 minutes before bed and use that time for stretching or breathing.",
  "Sleep quality matters more than quantity — 7 hours of deep sleep beats 9 hours of light sleep.",
  "Keep a sleep log for two weeks — patterns often reveal surprising causes of poor sleep.",
  "The first 90 minutes of sleep contain the most deep slow-wave sleep of the night.",
  "Morning light exposure advances your circadian rhythm — useful if you want to sleep earlier.",
  "Sleep deprivation impairs emotional regulation more than almost any other cognitive function.",
  "A short walk after dinner improves blood sugar and can improve sleep quality.",
  "Weighted blankets have shown measurable improvements in sleep for people with anxiety.",
  "Melatonin works best for shifting your sleep schedule, not for staying asleep.",
];

const EVENT_COLORS = [
  { id:"purple", label:"Purple", bg:"#2a2050", border:"#7f77dd", text:"#a78fff" },
  { id:"teal",   label:"Teal",   bg:"#0d2820", border:"#1d9e75", text:"#5dcaa5" },
  { id:"pink",   label:"Pink",   bg:"#2a1020", border:"#d4537e", text:"#ed93b1" },
  { id:"gray",   label:"Gray",   bg:"#1a1828", border:"#444441", text:"#888780" },
  { id:"blue",   label:"Blue",   bg:"#0d1a30", border:"#3b82f6", text:"#60a5fa" },
  { id:"amber",  label:"Amber",  bg:"#2a1a00", border:"#d97706", text:"#fbbf24" },
  { id:"red",    label:"Red",    bg:"#2a0a10", border:"#ef4444", text:"#f87171" },
  { id:"green",  label:"Green",  bg:"#0a2010", border:"#22c55e", text:"#4ade80" },
];

const INITIAL_EVENTS = [
  { id:1, title:"Morning run",       color:"teal",   startH:7,  durH:0.75, badge:null,               location:"Riverside Park",  description:"5K easy pace along the river trail." },
  { id:2, title:"Hackathon kickoff", color:"purple", startH:9,  durH:3,    badge:"High focus window", location:"Room 4B",         description:"Team intro, problem statement, sprint planning." },
  { id:3, title:"Lunch break",       color:"gray",   startH:12, durH:1,    badge:null,               location:"Cafeteria",       description:"Step away from the screen and recharge." },
  { id:4, title:"Build sprint",      color:"purple", startH:13, durH:5,    badge:"Wind down by 10pm", location:"Room 4B",        description:"Core build time. No meetings, deep focus." },
  { id:5, title:"Team dinner",       color:"pink",   startH:19, durH:1.5,  badge:null,               location:"The Rustic Table",description:"Casual dinner with the team before the final push." },
];

const INITIAL_MESSAGES = [
  { from:"ai",   text:"Hey! You have a big day ahead. I've protected your wind-down window — aim to wrap up by 10pm tonight." },
  { from:"user", text:"Can you move my run to 6am?" },
  { from:"ai",   text:"Done! Shifted to 6:00–6:45am. That gives you more focus time before kickoff." },
];

// ── Helpers ──
function fmtH(h) {
  const hrs=Math.floor(h)%24, mins=Math.round((h%1)*60);
  const p=hrs>=12?"pm":"am", d=hrs%12===0?12:hrs%12;
  return mins===0?`${d}${p}`:`${d}:${String(mins).padStart(2,"0")}${p}`;
}
function snap(h)       { return Math.round(h*4)/4; }
function hToInput(h)   { const hrs=Math.floor(h)%24,mins=Math.round((h%1)*60); return `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}`; }
function inputToH(str) { const [h,m]=str.split(":").map(Number); return h+m/60; }
function randomTip()   { return SLEEP_TIPS[Math.floor(Math.random()*SLEEP_TIPS.length)]; }
function getColor(id)  { return EVENT_COLORS.find(c=>c.id===id)||EVENT_COLORS[0]; }

// Given bedtime and wake time strings (HH:MM), compute total sleep hours
function calcSleepHours(bedtime, waketime) {
  const b = inputToH(bedtime);
  const w = inputToH(waketime);
  // handle crossing midnight
  return w > b ? w - b : (24 - b) + w;
}

// Estimate sleep stages from total hours (adult averages)
function estimateStages(totalHours) {
  const totalMin = totalHours * 60;
  return {
    light: Math.round(totalMin * 0.50),  // ~50%
    deep:  Math.round(totalMin * 0.18),  // ~18%
    rem:   Math.round(totalMin * 0.22),  // ~22%
  };
}

function fmtMins(mins) {
  const h=Math.floor(mins/60), m=mins%60;
  return m===0?`${h}h`:`${h}h ${m}m`;
}

// ── Event Modal ──
function EventModal({ ev, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({...ev});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const endH=form.startH+form.durH;
  const setEnd=(val)=>{ const e=inputToH(val); setForm(f=>({...f,durH:Math.max(0.25,e-f.startH)})); };
  const colorDef=getColor(form.color);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header" style={{borderLeft:`4px solid ${colorDef.border}`}}>
          <span style={{flex:1,fontSize:13,fontWeight:600,color:"#e8e4f0"}}>{form.title||"Event"}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="modal-label">Title</label>
          <input className="modal-input" value={form.title} onChange={e=>set("title",e.target.value)}/>
          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location||""} onChange={e=>set("location",e.target.value)} placeholder="Add location..."/>
          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description||""} onChange={e=>set("description",e.target.value)} placeholder="Add description..." rows={3}/>
          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Start time</label>
              <input className="modal-input" type="time" value={hToInput(form.startH)} onChange={e=>setForm(f=>({...f,startH:inputToH(e.target.value)}))}/>
            </div>
            <div className="modal-col">
              <label className="modal-label">End time</label>
              <input className="modal-input" type="time" value={hToInput(endH)} onChange={e=>setEnd(e.target.value)}/>
            </div>
          </div>
          <div className="modal-duration-hint">Duration: {Math.floor(form.durH)}h {Math.round((form.durH%1)*60)>0?`${Math.round((form.durH%1)*60)}m`:""}</div>
          <label className="modal-label">Color</label>
          <div className="color-picker-row">
            {EVENT_COLORS.map(c=>(
              <button key={c.id} onClick={()=>set("color",c.id)}
                className={`color-swatch${form.color===c.id?" selected":""}`}
                style={{background:c.bg,borderColor:c.border}} title={c.label}>
                {form.color===c.id&&<span className="color-swatch-check" style={{color:c.text}}>✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn-delete" onClick={()=>onDelete(ev.id)}>Delete</button>
          <button className="modal-btn-save" onClick={()=>onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Event Modal ──
function AddEventModal({ onClose, onAdd }) {
  const [form,setForm]=useState({title:"",color:"purple",startH:9,durH:1,location:"",description:"",badge:null});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const endH=form.startH+form.durH;
  const setEnd=(val)=>{const e=inputToH(val);setForm(f=>({...f,durH:Math.max(0.25,e-f.startH)}));};
  const handleAdd=()=>{if(!form.title.trim())return;onAdd({...form,id:Date.now()});onClose();};
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header" style={{borderLeft:`4px solid ${getColor(form.color).border}`}}>
          <span style={{flex:1,fontSize:13,fontWeight:600,color:"#e8e4f0"}}>New event</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="modal-label">Title</label>
          <input className="modal-input" value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Event title..." autoFocus/>
          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location} onChange={e=>set("location",e.target.value)} placeholder="Add location..."/>
          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Add description..." rows={3}/>
          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Start time</label>
              <input className="modal-input" type="time" value={hToInput(form.startH)} onChange={e=>setForm(f=>({...f,startH:inputToH(e.target.value)}))}/>
            </div>
            <div className="modal-col">
              <label className="modal-label">End time</label>
              <input className="modal-input" type="time" value={hToInput(endH)} onChange={e=>setEnd(e.target.value)}/>
            </div>
          </div>
          <div className="modal-duration-hint">Duration: {Math.floor(form.durH)}h {Math.round((form.durH%1)*60)>0?`${Math.round((form.durH%1)*60)}m`:""}</div>
          <label className="modal-label">Color</label>
          <div className="color-picker-row">
            {EVENT_COLORS.map(c=>(
              <button key={c.id} onClick={()=>set("color",c.id)}
                className={`color-swatch${form.color===c.id?" selected":""}`}
                style={{background:c.bg,borderColor:c.border}} title={c.label}>
                {form.color===c.id&&<span className="color-swatch-check" style={{color:c.text}}>✓</span>}
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

// ── Draggable Event ──
function CalEvent({ ev, dimmed, onClickEvent }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id:ev.id });
  const c=getColor(ev.color);
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cal-event"
      style={{
        top:ev.startH*HOUR_PX, height:Math.max(ev.durH*HOUR_PX-3,26),
        transform:transform?`translate3d(${transform.x}px,${transform.y}px,0)`:undefined,
        opacity:dimmed?0.3:1, zIndex:isDragging?50:2,
        cursor:isDragging?"grabbing":"pointer",
        background:c.bg, borderLeft:`2px solid ${c.border}`, color:c.text,
      }}
      onClick={()=>{ if(!transform) onClickEvent(ev); }}>
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(ev.startH+ev.durH)}</div>
      {ev.badge&&<div className="sleep-badge">{ev.badge}</div>}
    </div>
  );
}

function DragGhost({ ev }) {
  const c=getColor(ev.color);
  return (
    <div className="cal-event" style={{height:Math.max(ev.durH*HOUR_PX-3,26),opacity:0.9,width:230,
      pointerEvents:"none",background:c.bg,borderLeft:`2px solid ${c.border}`,color:c.text}}>
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(ev.startH+ev.durH)}</div>
    </div>
  );
}

// ── Mini Calendar ──
function MonthCalendar({ selectedDay, onSelectDay, eventDays }) {
  const now=new Date();
  const [viewYear,setViewYear]=useState(now.getFullYear());
  const [viewMonth,setViewMonth]=useState(now.getMonth());
  const firstDow=new Date(viewYear,viewMonth,1).getDay();
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const isCurrent=viewYear===now.getFullYear()&&viewMonth===now.getMonth();
  const prevMonth=()=>viewMonth===0?(setViewMonth(11),setViewYear(y=>y-1)):setViewMonth(m=>m-1);
  const nextMonth=()=>viewMonth===11?(setViewMonth(0),setViewYear(y=>y+1)):setViewMonth(m=>m+1);
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
        {DAYS.map((d,i)=><div key={i} className="day-label">{d}</div>)}
        {Array.from({length:firstDow}).map((_,i)=><div key={`b${i}`} className="day-cell empty"/>)}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
          const isToday=isCurrent&&d===now.getDate();
          const isSelected=isCurrent&&d===selectedDay;
          const hasEvent=isCurrent&&eventDays.includes(d);
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

// ── Energy Slider ──
function EnergySlider({ value, onChange }) {
  const labels=["Exhausted","Low","Moderate","Good","Peak"];
  const colors=["#ef4444","#f97316","#eab308","#84cc16","#22c55e"];
  return (
    <div className="energy-panel">
      <div className="energy-header">
        <span className="energy-title">Energy</span>
        <input type="range" min="1" max="5" step="1" value={value}
          onChange={e=>onChange(parseInt(e.target.value))}
          className="energy-slider"
          style={{"--thumb-color":colors[value-1]}}/>
        <span className="energy-label" style={{color:colors[value-1]}}>{labels[value-1]}</span>
      </div>
    </div>
  );
}

// ── Sleep Tip ──
function SleepTip({ tip, onDismiss, onDontShow }) {
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

// ── Sleep Health Panel ──
function SleepHealth({ showTip, tip, onDismissTip, onDontShowTip }) {
  // User-editable sleep times
  const [bedtime,  setBedtime]  = useState("23:00");
  const [waketime, setWaketime] = useState("06:40");
  // User-editable sleep goal (hours)
  const [goalHours, setGoalHours] = useState(8);

  const totalHours = calcSleepHours(bedtime, waketime);
  const stages     = estimateStages(totalHours);
  const score      = Math.min(100, Math.round((totalHours / goalHours) * 100 * 0.74)); // simple score
  const r=34, circ=2*Math.PI*r, offset=circ-(Math.min(score,100)/100)*circ;

  // avg diff for "vs avg" chip — hardcoded demo
  const avgDiff = Math.round((totalHours - 6.47) * 60); // mins vs 6h28m avg

  return (
    <div className="sleep-section">
      <div className="panel-title">Sleep health</div>

      {/* Ring + meta */}
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
          <div className="sleep-meta-val" style={{fontSize:22}}>{fmtMins(Math.round(totalHours*60))}</div>
          <div className="sleep-meta-label">Last night</div>

          {/* Editable bedtime / wake */}
          <div className="sleep-time-row">
            <div className="sleep-time-field">
              <span className="sleep-time-label">Bed</span>
              <input className="sleep-time-input" type="time" value={bedtime}
                onChange={e=>setBedtime(e.target.value)}/>
            </div>
            <div className="sleep-time-sep">→</div>
            <div className="sleep-time-field">
              <span className="sleep-time-label">Wake</span>
              <input className="sleep-time-input" type="time" value={waketime}
                onChange={e=>setWaketime(e.target.value)}/>
            </div>
          </div>
        </div>
      </div>

      {/* Sleep stage bars — update based on inputs */}
      <div className="sleep-bars">
        {[
          {label:"Deep",  mins:stages.deep,  total:Math.round(totalHours*60), color:"#534ab7"},
          {label:"REM",   mins:stages.rem,   total:Math.round(totalHours*60), color:"#7f77dd"},
          {label:"Light", mins:stages.light, total:Math.round(totalHours*60), color:"#3c3489"},
        ].map(b=>(
          <div key={b.label} className="bar-row">
            <span className="bar-label">{b.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{width:`${Math.round((b.mins/b.total)*100)}%`,background:b.color}}/>
            </div>
            <span className="bar-val">{fmtMins(b.mins)}</span>
          </div>
        ))}
      </div>

      {/* Chips — goal is editable, avg diff moved into chip */}
      <div className="sleep-chips">
        <div className="sleep-chip">
          <div className="sleep-chip-val">{bedtime}</div>
          <div className="sleep-chip-label">Bedtime</div>
        </div>
        <div className="sleep-chip">
          <div className="sleep-chip-val">{waketime}</div>
          <div className="sleep-chip-label">Wake</div>
        </div>
        {/* Editable sleep goal chip */}
        <div className="sleep-chip sleep-chip-editable">
          <div className="sleep-chip-goal-row">
            <input
              className="sleep-goal-input"
              type="number" min="4" max="12" step="0.5"
              value={goalHours}
              onChange={e=>setGoalHours(parseFloat(e.target.value))}
            />
            <span className="sleep-goal-unit">h goal</span>
          </div>
          <div className="sleep-chip-label">Sleep goal</div>
        </div>
        {/* vs avg chip — includes the +12 from avg */}
        <div className="sleep-chip">
          <div className="sleep-chip-val" style={{color: avgDiff>=0?"#84cc16":"#f87171"}}>
            {avgDiff>=0?"+":""}{avgDiff}m
          </div>
          <div className="sleep-chip-label">vs avg · 3× restless</div>
        </div>
      </div>

      {showTip&&<SleepTip tip={tip} onDismiss={onDismissTip} onDontShow={onDontShowTip}/>}
    </div>
  );
}

// ── AI Chat ──
function AIChat() {
  const [messages,setMessages]=useState(INITIAL_MESSAGES);
  const [input,setInput]=useState("");
  const endRef=useRef();
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[messages]);
  const send=()=>{
    const txt=input.trim();if(!txt)return;
    setMessages(p=>[...p,{from:"user",text:txt}]);
    setInput("");
    setTimeout(()=>setMessages(p=>[...p,{from:"ai",text:"Got it! I'll factor that into your schedule and keep your sleep protected."}]),600);
  };
  return (
    <div className="chat-section">
      <div className="panel-title">AI assistant</div>
      <div className="chat-messages">
        {messages.map((m,i)=><div key={i} className={`msg msg-${m.from}`}>{m.text}</div>)}
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

// ── Root App ──
export default function App() {
  const [events,      setEvents]      = useState(INITIAL_EVENTS);
  const [activeId,    setActiveId]    = useState(null);
  const [modalEv,     setModalEv]     = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [energy,      setEnergy]      = useState(3);
  const [showEnWarn,  setShowEnWarn]  = useState(true);
  const [tip,         setTip]         = useState(()=>randomTip());
  const [showTip,     setShowTip]     = useState(true);

  const scrollRef=useRef(), nowRef=useRef();
  const activeEv=events.find(e=>e.id===activeId);

  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}));

  const today=new Date();
  const eventDays=[...new Set(events.map(()=>today.getDate()))];

  useEffect(()=>{
    if(scrollRef.current){
      const h=today.getHours()+today.getMinutes()/60;
      scrollRef.current.scrollTop=Math.max(0,h*HOUR_PX-120);
    }
  },[]);

  useEffect(()=>{
    const update=()=>{
      const d=new Date(),h=d.getHours()+d.getMinutes()/60;
      if(nowRef.current) nowRef.current.style.top=`${h*HOUR_PX}px`;
    };
    update();
    const t=setInterval(update,60000);
    return()=>clearInterval(t);
  },[]);

  // reset warning visibility when energy changes
  useEffect(()=>{ setShowEnWarn(true); },[energy]);

  const onDragStart=({active})=>setActiveId(active.id);
  const onDragEnd=({active,delta})=>{
    setActiveId(null);
    setEvents(prev=>prev.map(ev=>{
      if(ev.id!==active.id) return ev;
      let s=snap(ev.startH+delta.y/HOUR_PX);
      s=Math.max(0,Math.min(TOTAL_HOURS-ev.durH,s));
      return {...ev,startH:s};
    }));
  };

  const handleSave   =(updated)=>{setEvents(p=>p.map(ev=>ev.id===updated.id?updated:ev));setModalEv(null);};
  const handleDelete =(id)=>{setEvents(p=>p.filter(ev=>ev.id!==id));setModalEv(null);};
  const handleAdd    =(newEv)=>setEvents(p=>[...p,newEv]);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="app">
        <div className="topbar">
          <span className="logo">SleepSync</span>
          <span className="topbar-date">
            {today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
          </span>
          <div className="topbar-score"><span className="score-dot"/>Sleep score: 74</div>
        </div>

        <div className="main">
          <div className="panel left-panel">
            <MonthCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} eventDays={eventDays}/>
          </div>

          <div className="center-panel">
            <div className="today-header">
              <div>
                <span className="today-label">Today</span>
                <span className="today-sub">{events.length} events · Bedtime by 11:00pm</span>
              </div>
              <button className="add-event-btn" onClick={()=>setShowAdd(true)}>+ Add event</button>
            </div>

            <EnergySlider value={energy} onChange={setEnergy}/>

            {energy<=2 && showEnWarn && (
              <div className="energy-warning">
                <span>Low energy today — I'll suggest lighter tasks and extra breaks.</span>
                <button className="energy-warn-close" onClick={()=>setShowEnWarn(false)}>✕</button>
              </div>
            )}

            <div className="cal-scroll-area" ref={scrollRef}>
              <div className="hour-grid" style={{height:TOTAL_HOURS*HOUR_PX}}>
                {Array.from({length:TOTAL_HOURS},(_,h)=>(
                  <div key={h} className="hour-row" style={{top:h*HOUR_PX}}>
                    <div className="hour-label">{fmtH(h)}</div>
                    <div className="hour-line"/>
                  </div>
                ))}
                {Array.from({length:TOTAL_HOURS},(_,h)=>(
                  <div key={`hh${h}`} className="half-hour-line" style={{top:(h+0.5)*HOUR_PX}}/>
                ))}
                <div className="events-layer">
                  {events.map(ev=>(
                    <CalEvent key={ev.id} ev={ev} dimmed={ev.id===activeId} onClickEvent={setModalEv}/>
                  ))}
                </div>
                <div ref={nowRef} className="now-line"><div className="now-dot"/></div>
              </div>
            </div>
          </div>

          <div className="right-panel">
            <SleepHealth showTip={showTip} tip={tip}
              onDismissTip={()=>setShowTip(false)}
              onDontShowTip={()=>setShowTip(false)}/>
            <AIChat/>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeEv?<DragGhost ev={activeEv}/>:null}
      </DragOverlay>
      {modalEv&&<EventModal ev={modalEv} onClose={()=>setModalEv(null)} onSave={handleSave} onDelete={handleDelete}/>}
      {showAdd&&<AddEventModal onClose={()=>setShowAdd(false)} onAdd={handleAdd}/>}
    </DndContext>
  );
}