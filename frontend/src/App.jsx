import { useState, useRef, useEffect, useMemo } from "react";
import { DndContext, useDraggable, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import "./App.css";

const HOUR_PX = 64;
const TOTAL_HOURS = 24;
const DAYS = ["S","M","T","W","T","F","S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

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

const PRIORITY_LABELS = { high:"🔴 High", medium:"🟡 Medium", low:"🟢 Low" };
const TASK_TYPE_LABELS = { fixed:"Fixed", flexible:"Flexible", free:"Free time" };

// Days of week for repetition picker
const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const today = new Date();

function makeDefaultRepeat() {
  return { enabled: false, days: [] };
}

const INITIAL_EVENTS = [
  { id:1, title:"Morning run",       color:"teal",   startH:7,  durH:0.75, day:0, location:"Riverside Park",  description:"5K easy pace.", priority:"medium", taskType:"flexible", repeat:makeDefaultRepeat() },
  { id:2, title:"Hackathon kickoff", color:"purple", startH:9,  durH:3,    day:0, location:"Room 4B",         description:"Team intro, sprint planning.", priority:"high", taskType:"fixed", repeat:makeDefaultRepeat() },
  { id:3, title:"Lunch break",       color:"gray",   startH:12, durH:1,    day:0, location:"Cafeteria",       description:"Step away and recharge.", priority:"low", taskType:"free", repeat:{ enabled:true, days:[1,2,3,4,5] } },
  { id:4, title:"Build sprint",      color:"purple", startH:13, durH:5,    day:0, location:"Room 4B",         description:"Core build time.", priority:"high", taskType:"fixed", repeat:makeDefaultRepeat() },
  { id:5, title:"Team dinner",       color:"pink",   startH:19, durH:1.5,  day:0, location:"The Rustic Table",description:"Casual dinner.", priority:"medium", taskType:"flexible", repeat:makeDefaultRepeat() },
  { id:6, title:"Morning standup",   color:"blue",   startH:9,  durH:0.5,  day:1, location:"Zoom",            description:"Daily team sync.", priority:"high", taskType:"fixed", repeat:{ enabled:true, days:[1,2,3,4,5] } },
  { id:7, title:"Design review",     color:"amber",  startH:11, durH:2,    day:1, location:"Room 2A",         description:"Review final designs.", priority:"medium", taskType:"flexible", repeat:makeDefaultRepeat() },
  { id:8, title:"Gym",               color:"teal",   startH:17, durH:1,    day:1, location:"Fitness Center",  description:"Strength session.", priority:"medium", taskType:"flexible", repeat:{ enabled:true, days:[1,3,5] } },
];

const INITIAL_MESSAGES = [
  { from:"ai",   text:"Hey! You have a big day ahead. I've protected your wind-down window — aim to wrap up by your bedtime tonight." },
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
function calcSleepHours(bed,wake) { const b=inputToH(bed),w=inputToH(wake); return w>b?w-b:(24-b)+w; }
function estimateStages(h) { const m=h*60; return {light:Math.round(m*0.50),deep:Math.round(m*0.18),rem:Math.round(m*0.22)}; }
function fmtMins(m)  { const h=Math.floor(m/60),mn=m%60; return mn===0?`${h}h`:`${h}h ${mn}m`; }
function dayLabel(d) {
  const n=new Date(); n.setDate(n.getDate()+d);
  return n.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
}

// badge text derived from priority + taskType
function deriveBadge(priority, taskType) {
  if(priority==="high" && taskType==="fixed") return "High priority · Fixed";
  if(priority==="high") return "High priority";
  if(taskType==="fixed") return "Fixed task";
  if(taskType==="free") return "Free time";
  return null;
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

// ── Repetition Picker ──
function RepeatPicker({ repeat, onChange }) {
  const toggle=(d)=>{
    const days=repeat.days.includes(d)?repeat.days.filter(x=>x!==d):[...repeat.days,d].sort((a,b)=>a-b);
    onChange({...repeat,days});
  };
  return (
    <div className="repeat-section">
      <div className="repeat-toggle-row">
        <label className="repeat-label">Repeat</label>
        <label className="toggle-switch">
          <input type="checkbox" checked={repeat.enabled} onChange={e=>onChange({...repeat,enabled:e.target.checked})}/>
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
  const [form,setForm]=useState({...ev, priority:ev.priority||"medium", taskType:ev.taskType||"flexible", repeat:ev.repeat||makeDefaultRepeat()});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const endH=form.startH+form.durH;
  const setEnd=(val)=>{ const e=inputToH(val); setForm(f=>({...f,durH:Math.max(0.25,e-f.startH)})); };
  const cd=getColor(form.color);
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

          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location||""} onChange={e=>set("location",e.target.value)} placeholder="Add location..."/>

          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description||""} onChange={e=>set("description",e.target.value)} placeholder="Add description..." rows={2}/>

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

          {/* Priority + Task type */}
          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Priority</label>
              <div className="pill-group">
                {["high","medium","low"].map(p=>(
                  <button key={p} onClick={()=>set("priority",p)}
                    className={`pill-btn${form.priority===p?" pill-active":""}`}
                    data-priority={p}>
                    {p.charAt(0).toUpperCase()+p.slice(1)}
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

          {/* Repeat */}
          <RepeatPicker repeat={form.repeat} onChange={v=>set("repeat",v)}/>

          {/* Color */}
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
function AddEventModal({ onClose, onAdd }) {
  const [form,setForm]=useState({title:"",color:"purple",startH:9,durH:1,day:0,location:"",description:"",priority:"medium",taskType:"flexible",repeat:makeDefaultRepeat()});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const endH=form.startH+form.durH;
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

          <label className="modal-label">Day</label>
          <select className="modal-input" value={form.day} onChange={e=>set("day",parseInt(e.target.value))}>
            <option value={0}>Today — {dayLabel(0)}</option>
            <option value={1}>Tomorrow — {dayLabel(1)}</option>
          </select>

          <label className="modal-label">Location</label>
          <input className="modal-input" value={form.location} onChange={e=>set("location",e.target.value)} placeholder="Add location..."/>

          <label className="modal-label">Description</label>
          <textarea className="modal-textarea" value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Add description..." rows={2}/>

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

          <div className="modal-row">
            <div className="modal-col">
              <label className="modal-label">Priority</label>
              <div className="pill-group">
                {["high","medium","low"].map(p=>(
                  <button key={p} onClick={()=>set("priority",p)}
                    className={`pill-btn${form.priority===p?" pill-active":""}`}
                    data-priority={p}>
                    {p.charAt(0).toUpperCase()+p.slice(1)}
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
          <button className="modal-btn-save" onClick={()=>{if(!form.title.trim())return;onAdd({...form,id:Date.now()});onClose();}}>Add event</button>
        </div>
      </div>
    </div>
  );
}

// ── Draggable Event Block ──
function DayEvent({ ev, colIndex, totalCols, dimmed, onClickEvent, bedtimeH }) {
  const {attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:ev.id});
  const c=getColor(ev.color);
  const GAP=3;
  const widthPct  = totalCols>1?`calc(${100/totalCols}% - ${GAP}px)`:"calc(100% - 4px)";
  const leftOffset= totalCols>1?`calc(${(colIndex/totalCols)*100}% + ${colIndex*(GAP/totalCols)}px)`:"2px";

  const badge = deriveBadge(ev.priority, ev.taskType);

  // Check if this event overlaps with bedtime
  const evEnd=ev.startH+ev.durH;
  const showWindown = bedtimeH>0 && ev.startH<bedtimeH && evEnd>bedtimeH;

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cal-event"
      style={{
        top:ev.startH*HOUR_PX, height:Math.max(ev.durH*HOUR_PX-3,26),
        width:widthPct, left:leftOffset,
        transform:transform?`translate3d(${transform.x}px,${transform.y}px,0)`:undefined,
        opacity:dimmed?0.3:1, zIndex:isDragging?50:colIndex+2,
        cursor:isDragging?"grabbing":"pointer",
        background:c.bg, borderLeft:`2px solid ${c.border}`, color:c.text,
      }}
      onClick={()=>{if(!transform) onClickEvent(ev);}}>
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(ev.startH+ev.durH)}</div>
      {badge&&!showWindown&&<div className="sleep-badge">{badge}</div>}
      {showWindown&&<div className="winddown-badge">Wind down by {fmtH(bedtimeH)}</div>}
    </div>
  );
}

function DragGhost({ ev }) {
  const c=getColor(ev.color);
  return (
    <div className="cal-event" style={{height:Math.max(ev.durH*HOUR_PX-3,26),opacity:0.9,width:200,
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

// ── Sleep Health ──
function SleepHealth({ showTip, tip, onDismissTip, onDontShowTip }) {
  const [bedtime,   setBedtime]   = useState("23:00");
  const [waketime,  setWaketime]  = useState("06:40");
  const [goalHours, setGoalHours] = useState(8);
  const totalHours=calcSleepHours(bedtime,waketime);
  const stages=estimateStages(totalHours);
  const totalMin=Math.round(totalHours*60);
  const score=Math.min(100,Math.round((totalHours/goalHours)*100));
  const r=34,circ=2*Math.PI*r,offset=circ-(score/100)*circ;
  const avgDiff=Math.round((totalHours-6.47)*60);
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
          <div className="sleep-meta-val" style={{fontSize:22}}>{fmtMins(totalMin)}</div>
          <div className="sleep-meta-label">Last night</div>
        </div>
      </div>
      <div className="sleep-bars">
        {[
          {label:"Deep",  mins:stages.deep,  color:"#534ab7"},
          {label:"REM",   mins:stages.rem,   color:"#7f77dd"},
          {label:"Light", mins:stages.light, color:"#3c3489"},
        ].map(b=>(
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

// ── Day Column (renders hour lines + events + bedtime line) ──
function DayColumn({ dayOffset, events, activeId, onClickEvent, bedtimeH, nowRef }) {
  const laid = useMemo(()=>layoutEvents(events),[events]);
  const hasEventAtBedtime = events.some(ev=>bedtimeH>0&&ev.startH<bedtimeH&&ev.startH+ev.durH>bedtimeH);
  return (
    <div className="day-col-wrap" style={{height:TOTAL_HOURS*HOUR_PX}}>
      {/* hour bg lines */}
      {Array.from({length:TOTAL_HOURS},(_,h)=>(
        <div key={h} style={{position:"absolute",top:h*HOUR_PX,left:0,right:0,pointerEvents:"none"}}>
          <div className="hour-bg-line"/>
          <div className="half-bg-line"/>
        </div>
      ))}
      {/* events */}
      {laid.map(({ev,colIndex,totalCols})=>(
        <DayEvent key={ev.id} ev={ev} colIndex={colIndex} totalCols={totalCols}
          dimmed={ev.id===activeId} onClickEvent={onClickEvent} bedtimeH={bedtimeH}/>
      ))}
      {/* bedtime line */}
      {bedtimeH>0&&(
        <div className="bedtime-line" style={{top:bedtimeH*HOUR_PX}}>
          <span className="bedtime-line-label">{fmtH(bedtimeH)} bedtime</span>
        </div>
      )}
      {/* now line — only on today (dayOffset===0) */}
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
  const [events,      setEvents]      = useState(INITIAL_EVENTS);
  const [activeId,    setActiveId]    = useState(null);
  const [modalEv,     setModalEv]     = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [energy,      setEnergy]      = useState(3);
  const [showEnWarn,  setShowEnWarn]  = useState(true);
  const [tip]                         = useState(()=>randomTip());
  const [showTip,     setShowTip]     = useState(true);
  const [bedtime,     setBedtime]     = useState("23:00");
  const [numDays,     setNumDays]     = useState(2); // responsive

  const scrollRef=useRef(), nowRef=useRef(), centerRef=useRef();
  const activeEv=events.find(e=>e.id===activeId);
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}));
  const bedtimeH = inputToH(bedtime);
  const todayDate=new Date();
  const eventDays=[todayDate.getDate()];

  // Responsive: watch center panel width
  useEffect(()=>{
    if(!centerRef.current) return;
    const ro=new ResizeObserver(entries=>{
      const w=entries[0].contentRect.width;
      if(w>=580) setNumDays(2);
      else setNumDays(1);
    });
    ro.observe(centerRef.current);
    return()=>ro.disconnect();
  },[]);

  useEffect(()=>{
    if(scrollRef.current){
      const h=todayDate.getHours()+todayDate.getMinutes()/60;
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

  const handleSave  =(u)=>{setEvents(p=>p.map(ev=>ev.id===u.id?u:ev));setModalEv(null);};
  const handleDelete=(id)=>{setEvents(p=>p.filter(ev=>ev.id!==id));setModalEv(null);};
  const handleAdd   =(nev)=>setEvents(p=>[...p,nev]);

  const todayEvents    = events.filter(e=>e.day===0);
  const tomorrowEvents = events.filter(e=>e.day===1);

  // Build array of columns to show
  const dayCols = numDays===2
    ? [{offset:0,label:"Today",    evs:todayEvents},
       {offset:1,label:"Tomorrow", evs:tomorrowEvents}]
    : [{offset:0,label:"Today",    evs:todayEvents}];

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="app">
        <div className="topbar">
          <span className="logo">SleepSync</span>
          <span className="topbar-date">
            {todayDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
          </span>
          <div className="topbar-score"><span className="score-dot"/>Sleep score: {Math.min(100,Math.round((calcSleepHours("23:00","06:40")/8)*100))}</div>
        </div>

        <div className="main">
          <div className="panel left-panel">
            <MonthCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} eventDays={eventDays}/>
          </div>

          <div className="center-panel" ref={centerRef}>
            <div className="today-header">
              <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
                <span className="today-label">Today</span>
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

            {/* Calendar: hour labels + day columns in a flex row */}
            <div className="cal-scroll-area" ref={scrollRef}>
              <div className="cal-grid-inner">
                {/* Hour labels */}
                <div className="hour-labels-col">
                  {Array.from({length:TOTAL_HOURS},(_,h)=>(
                    <div key={h} className="hour-label-row" style={{height:HOUR_PX}}>
                      <span className="hour-label">{fmtH(h)}</span>
                    </div>
                  ))}
                </div>

                {/* Day columns — flex:1 each so they split space evenly */}
                <div className="day-cols-flex">
                  {/* Column headers row */}
                  <div className="day-headers-row">
                    {dayCols.map(col=>(
                      <div key={col.offset} className="day-col-header-cell">
                        {col.label} — {dayLabel(col.offset)}
                      </div>
                    ))}
                  </div>
                  {/* Columns */}
                  <div className="day-cols-body">
                    {dayCols.map((col,i)=>(
                      <div key={col.offset} className={`day-col-flex-item${i>0?" day-col-divider":""}`}
                        style={{height:TOTAL_HOURS*HOUR_PX,position:"relative"}}>
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