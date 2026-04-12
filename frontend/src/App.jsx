import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { DndContext, useDraggable, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import "./App.css";

// ── Constants ──
const HOUR_PX     = 64;
const TOTAL_HOURS = 24;
const DAYS        = ["S","M","T","W","T","F","S"];
const MONTHS      = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
  "REM sleep peaks in the last third of the night.",
  "Stress is the #1 cause of insomnia. A 5-minute body scan reduces cortisol.",
  "Reading a physical book before bed is one of the most effective wind-down habits.",
  "Avoid large meals within 2–3 hours of bedtime.",
  "Even one night of poor sleep reduces cognitive performance by up to 30%.",
  "Blue light from screens suppresses melatonin by up to 3 hours.",
  "If you can't sleep after 20 minutes, get up and do something calm.",
  "Journaling 3 things you're grateful for before bed reduces anxiety.",
  "Your chronotype is largely genetic — work with it, not against it.",
];

const EVENT_COLORS = [
  { id:"purple", bg:"#2a2050", border:"#7f77dd", text:"#a78fff" },
  { id:"teal",   bg:"#0d2820", border:"#1d9e75", text:"#5dcaa5" },
  { id:"pink",   bg:"#2a1020", border:"#d4537e", text:"#ed93b1" },
  { id:"gray",   bg:"#1a1828", border:"#444441", text:"#888780" },
  { id:"blue",   bg:"#0d1a30", border:"#3b82f6", text:"#60a5fa" },
  { id:"amber",  bg:"#2a1a00", border:"#d97706", text:"#fbbf24" },
  { id:"red",    bg:"#2a0a10", border:"#ef4444", text:"#f87171" },
  { id:"green",  bg:"#0a2010", border:"#22c55e", text:"#4ade80" },
];

const PRIORITY_LABELS  = { high:"High", medium:"Medium", low:"Low" };
const TASK_TYPE_LABELS = { fixed:"Fixed", flexible:"Flexible", free:"Free time" };
const DOW              = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const todayDate        = new Date();

// ── API Layer ──
const BASE = "http://localhost:8000";

// converts backend snake_case to frontend camelCase
function toFrontend(task) {
  return {
    id:             task.id,
    title:          task.title,
    color:          task.color,
    startH:         task.start_h,
    durH:           task.dur_h,
    day:            task.day,
    location:       task.location    || "",
    description:    task.description || "",
    priority:       task.priority,
    taskType:       task.task_type,
    fixed_time:     task.fixed_time,
    repeat:         task.repeat      || { enabled: false, days: [] },
    is_completed:   task.is_completed,
    is_missed:      task.is_missed,
    miss_count:     task.miss_count,
    complete_count: task.complete_count,
  };
}

// converts frontend camelCase to backend snake_case
function toBackend(ev) {
  return {
    title:       ev.title,
    color:       ev.color,
    start_h:     ev.startH,
    dur_h:       ev.durH,
    day:         ev.day,
    location:    ev.location    || null,
    description: ev.description || null,
    priority:    ev.priority,
    task_type:   ev.taskType,
    fixed_time:  ev.fixed_time  || null,
    repeat:      ev.repeat      || { enabled: false, days: [] },
  };
}

async function fetchTasks() {
  const res  = await fetch(`${BASE}/tasks/`);
  const data = await res.json();
  return data.map(toFrontend);
}

async function createTask(ev) {
  const res  = await fetch(`${BASE}/tasks/`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(toBackend(ev)),
  });
  const data = await res.json();
  return toFrontend(data);
}

async function updateTask(id, changes) {
  const res  = await fetch(`${BASE}/tasks/${id}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(changes),
  });
  const data = await res.json();
  return toFrontend(data);
}

async function deleteTask(id) {
  await fetch(`${BASE}/tasks/${id}`, { method: "DELETE" });
}

async function sendChatMessage(message, wakeTime = "07:00", sleepTime = "23:00", energyLevel = 3) {
  const res = await fetch(`${BASE}/chat/`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      message,
      wake_time:    wakeTime,
      sleep_time:   sleepTime,
      energy_level: energyLevel,
    }),
  });
  return await res.json();
}

async function saveSleepData(data) {
  try {
    await fetch(`${BASE}/sleep/`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
  } catch { /* non-blocking */ }
}

// ── Fallback events if backend is unreachable ──
const INITIAL_EVENTS = [
  { id:1, title:"Morning run",       color:"teal",   startH:7,  durH:0.75, day:0, location:"Riverside Park",  description:"5K easy pace.",               priority:"medium", taskType:"flexible", repeat:{ enabled:false, days:[] } },
  { id:2, title:"Hackathon kickoff", color:"purple", startH:9,  durH:3,    day:0, location:"Room 4B",          description:"Team intro, sprint planning.", priority:"high",   taskType:"fixed",    repeat:{ enabled:false, days:[] } },
  { id:3, title:"Lunch break",       color:"gray",   startH:12, durH:1,    day:0, location:"Cafeteria",        description:"Step away and recharge.",      priority:"low",    taskType:"free",     repeat:{ enabled:true,  days:[1,2,3,4,5] } },
  { id:4, title:"Build sprint",      color:"purple", startH:13, durH:5,    day:0, location:"Room 4B",          description:"Core build time.",             priority:"high",   taskType:"fixed",    repeat:{ enabled:false, days:[] } },
  { id:5, title:"Team dinner",       color:"pink",   startH:19, durH:1.5,  day:0, location:"The Rustic Table", description:"Casual dinner.",               priority:"medium", taskType:"flexible", repeat:{ enabled:false, days:[] } },
  { id:6, title:"Morning standup",   color:"blue",   startH:9,  durH:0.5,  day:1, location:"Zoom",             description:"Daily team sync.",             priority:"high",   taskType:"fixed",    repeat:{ enabled:true,  days:[1,2,3,4,5] } },
  { id:7, title:"Design review",     color:"amber",  startH:11, durH:2,    day:1, location:"Room 2A",          description:"Review final designs.",        priority:"medium", taskType:"flexible", repeat:{ enabled:false, days:[] } },
  { id:8, title:"Gym",               color:"teal",   startH:17, durH:1,    day:1, location:"Fitness Center",   description:"Strength session.",            priority:"medium", taskType:"flexible", repeat:{ enabled:true,  days:[1,3,5] } },
];

const INITIAL_MESSAGES = [
  { from:"ai",   text:"Hey! You have a big day ahead. I've protected your wind-down window — aim to wrap up by your bedtime tonight." },
  { from:"user", text:"Can you move my run to 6am?" },
  { from:"ai",   text:"Done! Shifted to 6:00–6:45am. That gives you more focus time before kickoff." },
];

// ── Helpers ──
function makeDefaultRepeat() { return { enabled: false, days: [] }; }
function fmtH(h) {
  const hrs=Math.floor(h)%24, mins=Math.round((h%1)*60);
  const p=hrs>=12?"pm":"am", d=hrs%12===0?12:hrs%12;
  return mins===0?`${d}${p}`:`${d}:${String(mins).padStart(2,"0")}${p}`;
}
function snap(h)       { return Math.round(h*4)/4; }
function hToInput(h)   { const hrs=Math.floor(h)%24,mins=Math.round((h%1)*60); return `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}`; }
function inputToH(str) { if(!str) return 9; const [h,m]=str.split(":").map(Number); return h+m/60; }
function randomTip()   { return SLEEP_TIPS[Math.floor(Math.random()*SLEEP_TIPS.length)]; }
function getColor(id)  { return EVENT_COLORS.find(c=>c.id===id)||EVENT_COLORS[0]; }
function calcSleepHours(bed,wake) { const b=inputToH(bed),w=inputToH(wake); return w>b?w-b:(24-b)+w; }
function estimateStages(h) { const m=h*60; return {light:Math.round(m*0.50),deep:Math.round(m*0.18),rem:Math.round(m*0.22)}; }
function fmtMins(m)    { const h=Math.floor(m/60),mn=m%60; return mn===0?`${h}h`:`${h}h ${mn}m`; }
function dateToIso(d)  { return d.toISOString().split("T")[0]; }

// get day offset (0=today, 1=tomorrow ...) from a Date object
function dateToDayOffset(date) {
  const today=new Date(); today.setHours(0,0,0,0);
  const sel=new Date(date); sel.setHours(0,0,0,0);
  return Math.round((sel-today)/(1000*60*60*24));
}

// get a Date object that is `offset` days from today
function offsetToDate(offset) {
  const d=new Date(); d.setDate(d.getDate()+offset); return d;
}

// human-readable label for a day column header
function dayLabel(offset) {
  return offsetToDate(offset).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
}

function isoToOffset(iso) {
  const sel=new Date(iso+"T00:00:00");
  const t=new Date(); t.setHours(0,0,0,0);
  return Math.max(0,Math.round((sel-t)/(1000*60*60*24)));
}

function offsetToIso(offset) {
  const n=new Date(); n.setDate(n.getDate()+offset); return dateToIso(n);
}

function deriveBadge(priority, taskType) {
  if(priority==="high" && taskType==="fixed") return "High priority · Fixed";
  if(priority==="high")  return "High priority";
  if(taskType==="fixed") return "Fixed task";
  if(taskType==="free")  return "Free time";
  return null;
}

// ── Moon Icon ──
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" fill="#a78fff" opacity="0.9"/>
    </svg>
  );
}

// ── Overlap layout ──
function layoutEvents(events) {
  if(!events.length) return [];
  const sorted=[...events].sort((a,b)=>a.startH-b.startH);
  const columns=[];
  sorted.forEach(ev=>{
    let placed=false;
    for(let c=0;c<columns.length;c++){
      const last=columns[c][columns[c].length-1];
      if(last.startH+last.durH<=ev.startH){ columns[c].push(ev); placed=true; break; }
    }
    if(!placed) columns.push([ev]);
  });
  return events.map(ev=>{
    const evEnd=ev.startH+ev.durH;
    const overlapCols=columns.filter(col=>col.some(o=>o.startH<evEnd&&o.startH+o.durH>ev.startH));
    const colIndex=overlapCols.findIndex(col=>col.includes(ev));
    return {ev,colIndex,totalCols:overlapCols.length};
  });
}

// ── Repeat Picker ──
function RepeatPicker({ repeat, onChange }) {
  const toggle=(d)=>{
    const days=repeat.days.includes(d)
      ?repeat.days.filter(x=>x!==d)
      :[...repeat.days,d].sort((a,b)=>a-b);
    onChange({...repeat,days});
  };
  return (
    <div className="repeat-section">
      <div className="repeat-toggle-row">
        <label className="repeat-label">Repeat</label>
        <label className="toggle-switch">
          <input type="checkbox" checked={repeat.enabled}
            onChange={e=>onChange({...repeat,enabled:e.target.checked})}/>
          <span className="toggle-track"><span className="toggle-thumb"/></span>
        </label>
      </div>
      {repeat.enabled&&(
        <div className="repeat-days">
          {DOW.map((d,i)=>(
            <button key={i} onClick={()=>toggle(i)}
              className={`dow-btn${repeat.days.includes(i)?" active":""}`}>
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Event Modal ──
function EventModal({ ev, onClose, onSave, onDelete }) {
  const [form,setForm]=useState({
    ...ev,
    priority: ev.priority||"medium",
    taskType: ev.taskType||"flexible",
    repeat:   ev.repeat  ||makeDefaultRepeat(),
  });
  const set   =(k,v)=>setForm(f=>({...f,[k]:v}));
  const endH  =form.startH+form.durH;
  const setEnd=(val)=>{const e=inputToH(val);setForm(f=>({...f,durH:Math.max(0.25,e-f.startH)}));};
  const cd    =getColor(form.color);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header" style={{borderLeft:`4px solid ${cd.border}`}}>
          <span style={{flex:1,fontSize:13,fontWeight:600,color:"#e8e4f0"}}>{form.title||"Event"}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="modal-label">Title</label>
          <input className="modal-input" value={form.title} onChange={e=>set("title",e.target.value)}/>
          <label className="modal-label">Date</label>
          <input className="modal-input" type="date"
            value={offsetToIso(form.day)} min={dateToIso(new Date())}
            onChange={e=>set("day",isoToOffset(e.target.value))} style={{colorScheme:"dark"}}/>
          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location||""} onChange={e=>set("location",e.target.value)} placeholder="Add location..."/>
          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description||""} onChange={e=>set("description",e.target.value)} placeholder="Add description..." rows={5}/>
          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Start time</label>
              <input className="modal-input" type="time" value={hToInput(form.startH)}
                onChange={e=>setForm(f=>({...f,startH:inputToH(e.target.value)}))}/>
            </div>
            <div className="modal-col">
              <label className="modal-label">End time</label>
              <input className="modal-input" type="time" value={hToInput(endH)} onChange={e=>setEnd(e.target.value)}/>
            </div>
          </div>
          <div className="modal-duration-hint">Duration: {Math.floor(form.durH)}h {Math.round((form.durH%1)*60)>0?`${Math.round((form.durH%1)*60)}m`:""}</div>
          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Priority</label>
              <div className="pill-group">
                {["high","medium","low"].map(p=>(
                  <button key={p} onClick={()=>set("priority",p)}
                    className={`pill-btn${form.priority===p?" pill-active":""}`} data-priority={p}>
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-col">
              <label className="modal-label">Task type</label>
              <div className="pill-group">
                {["fixed","flexible","free"].map(t=>(
                  <button key={t} onClick={()=>set("taskType",t)}
                    className={`pill-btn${form.taskType===t?" pill-active":""}`}>
                    {TASK_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <RepeatPicker repeat={form.repeat} onChange={v=>set("repeat",v)}/>
          <label className="modal-label">Color</label>
          <div className="color-picker-row">
            {EVENT_COLORS.map(c=>(
              <button key={c.id} onClick={()=>set("color",c.id)}
                className={`color-swatch${form.color===c.id?" selected":""}`}
                style={{background:c.bg,borderColor:c.border}}>
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
function AddEventModal({ onClose, onAdd, defaultDayOffset=0 }) {
  const [form,setForm]=useState({
    title:"", color:"purple", startH:9, durH:1,
    day:defaultDayOffset, location:"", description:"",
    priority:"medium", taskType:"flexible", repeat:makeDefaultRepeat(),
  });
  const set   =(k,v)=>setForm(f=>({...f,[k]:v}));
  const endH  =form.startH+form.durH;
  const setEnd=(val)=>{const e=inputToH(val);setForm(f=>({...f,durH:Math.max(0.25,e-f.startH)}));};
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
          <label className="modal-label">Date</label>
          <input className="modal-input" type="date"
            value={offsetToIso(form.day)} min={dateToIso(new Date())}
            onChange={e=>set("day",isoToOffset(e.target.value))} style={{colorScheme:"dark"}}/>
          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location} onChange={e=>set("location",e.target.value)} placeholder="Add location..."/>
          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Add description..." rows={5}/>
          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Start time</label>
              <input className="modal-input" type="time" value={hToInput(form.startH)}
                onChange={e=>setForm(f=>({...f,startH:inputToH(e.target.value)}))}/>
            </div>
            <div className="modal-col">
              <label className="modal-label">End time</label>
              <input className="modal-input" type="time" value={hToInput(endH)} onChange={e=>setEnd(e.target.value)}/>
            </div>
          </div>
          <div className="modal-duration-hint">Duration: {Math.floor(form.durH)}h {Math.round((form.durH%1)*60)>0?`${Math.round((form.durH%1)*60)}m`:""}</div>
          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Priority</label>
              <div className="pill-group">
                {["high","medium","low"].map(p=>(
                  <button key={p} onClick={()=>set("priority",p)}
                    className={`pill-btn${form.priority===p?" pill-active":""}`} data-priority={p}>
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-col">
              <label className="modal-label">Task type</label>
              <div className="pill-group">
                {["fixed","flexible","free"].map(t=>(
                  <button key={t} onClick={()=>set("taskType",t)}
                    className={`pill-btn${form.taskType===t?" pill-active":""}`}>
                    {TASK_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <RepeatPicker repeat={form.repeat} onChange={v=>set("repeat",v)}/>
          <label className="modal-label">Color</label>
          <div className="color-picker-row">
            {EVENT_COLORS.map(c=>(
              <button key={c.id} onClick={()=>set("color",c.id)}
                className={`color-swatch${form.color===c.id?" selected":""}`}
                style={{background:c.bg,borderColor:c.border}}>
                {form.color===c.id&&<span className="color-swatch-check" style={{color:c.text}}>✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn-delete" onClick={onClose}>Cancel</button>
          <button className="modal-btn-save"
            onClick={()=>{if(!form.title.trim())return;onAdd(form);onClose();}}>
            Add event
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Draggable Event Block ──
function DayEvent({ ev, colIndex, totalCols, dimmed, onClickEvent, bedtimeH }) {
  const {attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:ev.id});
  const c          =getColor(ev.color);
  const GAP        =3;
  const widthPct   =totalCols>1?`calc(${100/totalCols}% - ${GAP}px)`:"calc(100% - 4px)";
  const leftOffset =totalCols>1?`calc(${(colIndex/totalCols)*100}% + ${colIndex*(GAP/totalCols)}px)`:"2px";
  const heightPx   =Math.max(ev.durH*HOUR_PX-3,26);
  const isCompact  =heightPx<48;
  const badge      =deriveBadge(ev.priority,ev.taskType);
  const evEnd      =ev.startH+ev.durH;
  const showWindown=bedtimeH>0&&ev.startH<bedtimeH&&evEnd>bedtimeH;
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cal-event"
      style={{
        top:ev.startH*HOUR_PX,height:heightPx,
        width:widthPct,left:leftOffset,
        transform:transform?`translate3d(${transform.x}px,${transform.y}px,0)`:undefined,
        opacity:dimmed?0.3:1,zIndex:isDragging?50:colIndex+2,
        cursor:isDragging?"grabbing":"pointer",
        background:c.bg,borderLeft:`2px solid ${c.border}`,color:c.text,
        borderTop:"1px solid rgba(255,255,255,0.06)",
      }}
      onClick={()=>{if(!transform)onClickEvent(ev);}}>
      <div className="cal-event-title">{ev.title}</div>
      {!isCompact&&<div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(evEnd)}</div>}
      {!isCompact&&badge&&!showWindown&&<div className="sleep-badge">{badge}</div>}
      {!isCompact&&showWindown&&<div className="winddown-badge">Wind down by {fmtH(bedtimeH)}</div>}
    </div>
  );
}

function DragGhost({ ev }) {
  const c=getColor(ev.color);
  return (
    <div className="cal-event" style={{height:Math.max(ev.durH*HOUR_PX-3,26),opacity:0.9,width:200,
      pointerEvents:"none",background:c.bg,borderLeft:`2px solid ${c.border}`,color:c.text,
      borderTop:"1px solid rgba(255,255,255,0.06)"}}>
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(ev.startH+ev.durH)}</div>
    </div>
  );
}

// ── Mini Calendar — clicking a date drives the center panel ──
function MonthCalendar({ selectedDate, onSelectDate, eventDays }) {
  const now        =new Date();
  const [viewYear, setViewYear] =useState(now.getFullYear());
  const [viewMonth,setViewMonth]=useState(now.getMonth());
  const firstDow   =new Date(viewYear,viewMonth,1).getDay();
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const isCurrent  =viewYear===now.getFullYear()&&viewMonth===now.getMonth();
  const prevMonth  =()=>viewMonth===0?(setViewMonth(11),setViewYear(y=>y-1)):setViewMonth(m=>m-1);
  const nextMonth  =()=>viewMonth===11?(setViewMonth(0),setViewYear(y=>y+1)):setViewMonth(m=>m+1);
  const isSelected =(d)=>selectedDate.getFullYear()===viewYear&&selectedDate.getMonth()===viewMonth&&selectedDate.getDate()===d;
  return (
    <div>
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={()=>setViewYear(y=>y-1)}>«</button>
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-nav-label">{MONTHS[viewMonth]} {viewYear}</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        <button className="cal-nav-btn" onClick={()=>setViewYear(y=>y+1)}>»</button>
      </div>
      <div className="month-grid">
        {DAYS.map((d,i)=><div key={i} className="day-label">{d}</div>)}
        <div className="day-label-underline"/>
        {Array.from({length:firstDow}).map((_,i)=><div key={`b${i}`} className="day-cell empty"/>)}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
          const isToday  =isCurrent&&d===now.getDate();
          const isSel    =isSelected(d);
          const hasEvent =isCurrent&&eventDays.includes(d);
          return (
            <div key={d}
              onClick={()=>onSelectDate(new Date(viewYear,viewMonth,d))}
              className={`day-cell${isSel?" today":""}${hasEvent?" has-event":""}`}
              style={isToday&&!isSel?{color:"#a78fff",fontWeight:600}:{}}>
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
      <span className="energy-title">Energy</span>
      <input type="range" min="1" max="5" step="1" value={value}
        onChange={e=>onChange(parseInt(e.target.value))}
        className="energy-slider" style={{"--thumb-color":colors[value-1]}}/>
      <span className="energy-label" style={{color:colors[value-1]}}>{labels[value-1]}</span>
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

// ── Sleep Health — auto-saves to backend, notifies parent of bedtime changes ──
function SleepHealth({ showTip, tip, onDismissTip, onDontShowTip, onBedtimeChange }) {
  const [bedtime,   setBedtime]   = useState("23:00");
  const [waketime,  setWaketime]  = useState("06:40");
  const [goalHours, setGoalHours] = useState(8);
  const totalHours = calcSleepHours(bedtime,waketime);
  const stages     = estimateStages(totalHours);
  const totalMin   = Math.round(totalHours*60);
  const score      = Math.min(100,Math.round((totalHours/goalHours)*100));
  const r=34,circ=2*Math.PI*r,offset=circ-(score/100)*circ;
  const avgDiff    = Math.round((totalHours-6.47)*60);
  const stageDefs  = [
    {label:"Deep",  mins:stages.deep,  color:"#4338ca"},
    {label:"REM",   mins:stages.rem,   color:"#7c3aed"},
    {label:"Light", mins:stages.light, color:"#3b82f6"},
  ];

  // auto-save sleep data and bubble bedtime up to parent whenever values change
  useEffect(()=>{
    onBedtimeChange&&onBedtimeChange(bedtime);
    saveSleepData({
      bedtime,
      wake_time:   waketime,
      goal_hours:  goalHours,
      total_hours: totalHours,
      score,
      deep_mins:   stages.deep,
      rem_mins:    stages.rem,
      light_mins:  stages.light,
    });
  },[bedtime,waketime,goalHours]);

  return (
    <div className="sleep-section">
      <div className="panel-title">Sleep health</div>
      <div className="sleep-ring-row">
        <div className="ring-wrap" style={{width:80,height:80}}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{transform:"rotate(-90deg)"}}>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#1e1830" strokeWidth="6"/>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#7c3aed" strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
          </svg>
          <div className="ring-center" style={{fontSize:18}}>{score}</div>
        </div>
        <div className="sleep-meta">
          <div className="sleep-meta-val" style={{fontSize:22}}>{fmtMins(totalMin)}</div>
          <div className="sleep-meta-label">Last night</div>
        </div>
      </div>
      <div className="sleep-bars">
        {stageDefs.map(b=>(
          <div key={b.label} className="bar-row">
            <span className="bar-label">{b.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{width:`${Math.round((b.mins/totalMin)*100)}%`,background:b.color}}/>
            </div>
            <span className="bar-val">{fmtMins(b.mins)}</span>
          </div>
        ))}
      </div>
      <div className="sleep-chips">
        <div className="sleep-chip sleep-chip-editable">
          <input className="sleep-time-chip-input" type="time" value={bedtime} onChange={e=>setBedtime(e.target.value)}/>
          <div className="sleep-chip-label">Bedtime</div>
        </div>
        <div className="sleep-chip sleep-chip-editable">
          <input className="sleep-time-chip-input" type="time" value={waketime} onChange={e=>setWaketime(e.target.value)}/>
          <div className="sleep-chip-label">Wake</div>
        </div>
        <div className="sleep-chip sleep-chip-editable" style={{alignItems:"center",textAlign:"center"}}>
          <div className="sleep-chip-goal-row" style={{justifyContent:"center"}}>
            <input className="sleep-goal-input" type="number" min="4" max="12" step="0.5"
              value={goalHours} onChange={e=>setGoalHours(parseFloat(e.target.value))}
              style={{textAlign:"center"}}/>
            <span className="sleep-goal-unit">h</span>
          </div>
          <div className="sleep-chip-label">Sleep goal</div>
        </div>
        <div className="sleep-chip">
          <div className="sleep-chip-val" style={{color:avgDiff>=0?"#84cc16":"#f87171"}}>
            {avgDiff>=0?"+":""}{avgDiff}m
          </div>
          <div className="sleep-chip-label">vs avg · 3× restless</div>
        </div>
      </div>
      {showTip&&<SleepTip tip={tip} onDismiss={onDismissTip} onDontShow={onDontShowTip}/>}
    </div>
  );
}

// ── AI Chat — sends energy + bedtime context to backend ──
function AIChat({ energy, bedtime, onEventCreated }) {
  const [messages,setMessages]=useState(INITIAL_MESSAGES);
  const [input,   setInput]   =useState("");
  const [loading, setLoading] =useState(false);
  const endRef=useRef();
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const send=async()=>{
    const txt=input.trim();
    if(!txt||loading) return;
    setMessages(p=>[...p,{from:"user",text:txt}]);
    setInput("");
    setLoading(true);
    try {
      const res=await sendChatMessage(txt,"07:00",bedtime,energy);
      setMessages(p=>[...p,{from:"ai",text:res.message}]);
      if(res.warning){
        setMessages(p=>[...p,{from:"ai",text:`⚠️ ${res.warning}`}]);
      }
      // if AI created a task in the backend, refresh events in the parent
      if(res.action==="add_task"&&res.created_task_id){
        onEventCreated&&onEventCreated();
      }
    } catch {
      setMessages(p=>[...p,{from:"ai",text:"I'm having trouble connecting right now. Try again in a moment."}]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-section">
      <div className="panel-title">AI assistant</div>
      <div className="chat-messages">
        {messages.map((m,i)=><div key={i} className={`msg msg-${m.from}`}>{m.text}</div>)}
        {loading&&<div className="msg msg-ai" style={{opacity:0.5}}>Thinking...</div>}
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

// ── Day Column ──
function DayColumn({ dayOffset, events, activeId, onClickEvent, bedtimeH, nowRef }) {
  const laid=useMemo(()=>layoutEvents(events),[events]);
  return (
    <div className="day-col-wrap" style={{height:TOTAL_HOURS*HOUR_PX,position:"relative"}}>
      {Array.from({length:TOTAL_HOURS},(_,h)=>(
        <div key={h} style={{position:"absolute",top:h*HOUR_PX,left:0,right:0,pointerEvents:"none"}}>
          <div className="hour-bg-line"/>
          <div className="half-bg-line"/>
        </div>
      ))}
      {laid.map(({ev,colIndex,totalCols})=>(
        <DayEvent key={ev.id} ev={ev} colIndex={colIndex} totalCols={totalCols}
          dimmed={ev.id===activeId} onClickEvent={onClickEvent} bedtimeH={bedtimeH}/>
      ))}
      {bedtimeH>0&&(
        <div className="bedtime-line" style={{top:bedtimeH*HOUR_PX}}>
          <span className="bedtime-line-label">{fmtH(bedtimeH)} bedtime</span>
        </div>
      )}
      {dayOffset===0&&nowRef&&(
        <div ref={nowRef} className="now-line" style={{position:"absolute",left:0,right:0}}>
          <div className="now-dot"/>
        </div>
      )}
    </div>
  );
}

// ── Root App ──
export default function App() {
  const [events,       setEvents]       = useState([]);
  const [activeId,     setActiveId]     = useState(null);
  const [modalEv,      setModalEv]      = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());  // drives both calendar and columns
  const [energy,       setEnergy]       = useState(3);
  const [showEnWarn,   setShowEnWarn]   = useState(true);
  const [tip]                           = useState(()=>randomTip());
  const [showTip,      setShowTip]      = useState(true);
  const [bedtime,      setBedtime]      = useState("23:00");     // shared between header + sleep panel + AI
  const [numDays,      setNumDays]      = useState(2);

  const scrollRef = useRef();
  const nowRef    = useRef();
  const centerRef = useRef();
  const activeEv  = events.find(e=>e.id===activeId);
  const sensors   = useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}));
  const bedtimeH  = inputToH(bedtime);

  // day offset of the currently selected calendar date (0=today, 1=tomorrow, etc.)
  const selectedOffset = dateToDayOffset(selectedDate);

  // which calendar days have events — used for dot indicators on mini calendar
  const eventDays = [...new Set(
    events.map(ev=>offsetToDate(ev.day).getDate())
  )];

  // load tasks from backend on mount
  useEffect(()=>{
    fetchTasks().then(setEvents).catch(()=>setEvents(INITIAL_EVENTS));
  },[]);

  // called by AIChat when the AI creates a task — re-fetches the full list
  const refreshEvents = useCallback(()=>{
    fetchTasks().then(setEvents).catch(()=>{});
  },[]);

  // responsive column count based on center panel width
  useEffect(()=>{
    if(!centerRef.current) return;
    const ro=new ResizeObserver(entries=>{
      setNumDays(entries[0].contentRect.width>=580?2:1);
    });
    ro.observe(centerRef.current);
    return()=>ro.disconnect();
  },[]);

  // scroll to current hour on load
  useEffect(()=>{
    if(scrollRef.current){
      const h=todayDate.getHours()+todayDate.getMinutes()/60;
      scrollRef.current.scrollTop=Math.max(0,h*HOUR_PX-120);
    }
  },[]);

  // tick the "now" line every minute
  useEffect(()=>{
    const update=()=>{
      const d=new Date(),h=d.getHours()+d.getMinutes()/60;
      if(nowRef.current) nowRef.current.style.top=`${h*HOUR_PX}px`;
    };
    update();
    const t=setInterval(update,60000);
    return()=>clearInterval(t);
  },[]);

  useEffect(()=>{setShowEnWarn(true);},[energy]);

  const onDragStart=({active})=>setActiveId(active.id);

  const onDragEnd=async({active,delta})=>{
    setActiveId(null);
    const ev=events.find(e=>e.id===active.id);
    if(!ev) return;
    let s=snap(ev.startH+delta.y/HOUR_PX);
    s=Math.max(0,Math.min(TOTAL_HOURS-ev.durH,s));
    setEvents(prev=>prev.map(e=>e.id===active.id?{...e,startH:s}:e));
    try { await updateTask(ev.id,{start_h:s}); } catch {}
  };

  const handleSave=async(u)=>{
    try {
      const saved=await updateTask(u.id,{
        title:u.title, color:u.color, start_h:u.startH, dur_h:u.durH,
        day:u.day, location:u.location, description:u.description,
        priority:u.priority, task_type:u.taskType,
        fixed_time:u.fixed_time||null, repeat:u.repeat,
      });
      setEvents(p=>p.map(ev=>ev.id===saved.id?saved:ev));
    } catch {
      setEvents(p=>p.map(ev=>ev.id===u.id?u:ev));
    }
    setModalEv(null);
  };

  const handleDelete=async(id)=>{
    try { await deleteTask(id); } catch {}
    setEvents(p=>p.filter(ev=>ev.id!==id));
    setModalEv(null);
  };

  const handleAdd=async(nev)=>{
    try {
      const saved=await createTask(nev);
      setEvents(p=>[...p,saved]);
    } catch {
      setEvents(p=>[...p,{...nev,id:Date.now()}]);
    }
  };

  // first column = selected date, second column = the day after
  const dayCols=numDays===2
    ?[
        {offset:selectedOffset,   evs:events.filter(e=>e.day===selectedOffset)},
        {offset:selectedOffset+1, evs:events.filter(e=>e.day===selectedOffset+1)},
      ]
    :[{offset:selectedOffset, evs:events.filter(e=>e.day===selectedOffset)}];

  const sleepScore=Math.min(100,Math.round((calcSleepHours(bedtime,"06:40")/8)*100));

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="app">

        <div className="topbar">
          <span className="logo">SleepSync</span>
          <span className="topbar-date">
            {todayDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
          </span>
          <div className="topbar-score"><MoonIcon/>Sleep score: {sleepScore}</div>
        </div>

        <div className="main">

          <div className="panel left-panel">
            <MonthCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              eventDays={eventDays}
            />
          </div>

          <div className="center-panel" ref={centerRef}>
            <div className="today-header">
              <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
                <span className="today-label">
                  {selectedOffset===0
                    ?"Today"
                    :selectedDate.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}
                </span>
                <div className="header-bedtime">
                  <span className="header-bedtime-label">Bedtime</span>
                  <input className="header-bedtime-input" type="time" value={bedtime}
                    onChange={e=>setBedtime(e.target.value)}/>
                </div>
                <span className="today-sub">{events.length} events</span>
              </div>
              <button className="add-event-btn" onClick={()=>setShowAdd(true)}>+ Add event</button>
            </div>

            <EnergySlider value={energy} onChange={setEnergy}/>

            {energy<=2&&showEnWarn&&(
              <div className="energy-warning">
                <span>Low energy today — I'll suggest lighter tasks and extra breaks.</span>
                <button className="energy-warn-close" onClick={()=>setShowEnWarn(false)}>✕</button>
              </div>
            )}

            <div className="cal-scroll-area" ref={scrollRef}>
              <div className="cal-grid-inner">
                <div className="hour-labels-col">
                  {Array.from({length:TOTAL_HOURS},(_,h)=>(
                    <div key={h} className="hour-label-row" style={{height:HOUR_PX}}>
                      <span className="hour-label">{fmtH(h)}</span>
                    </div>
                  ))}
                </div>
                <div className="day-cols-flex">
                  <div className="day-headers-row">
                    {dayCols.map((col,i)=>(
                      <div key={col.offset} className="day-col-header-cell">
                        {i===0
                          ?(selectedOffset===0?"Today":"Selected")
                          :"Next day"} — {dayLabel(col.offset)}
                      </div>
                    ))}
                  </div>
                  <div className="day-cols-body">
                    {dayCols.map((col,i)=>(
                      <div key={col.offset}
                        className={`day-col-flex-item${i>0?" day-col-divider":""}`}>
                        <DayColumn
                          dayOffset={col.offset}
                          events={col.evs}
                          activeId={activeId}
                          onClickEvent={setModalEv}
                          bedtimeH={bedtimeH}
                          nowRef={col.offset===0?nowRef:null}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="right-panel">
            <SleepHealth
              showTip={showTip} tip={tip}
              onDismissTip={()=>setShowTip(false)}
              onDontShowTip={()=>setShowTip(false)}
              onBedtimeChange={setBedtime}
            />
            <AIChat energy={energy} bedtime={bedtime} onEventCreated={refreshEvents}/>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeEv?<DragGhost ev={activeEv}/>:null}
      </DragOverlay>

      {modalEv&&(
        <EventModal ev={modalEv} onClose={()=>setModalEv(null)}
          onSave={handleSave} onDelete={handleDelete}/>
      )}

      {showAdd&&(
        <AddEventModal onClose={()=>setShowAdd(false)}
          onAdd={handleAdd} defaultDayOffset={selectedOffset}/>
      )}
    </DndContext>
  );
}