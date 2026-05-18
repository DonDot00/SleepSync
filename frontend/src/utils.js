import { EVENT_COLORS, SLEEP_TIPS } from "./constants";

// ── Time helpers ──

// format a decimal hour like 9.5 → "9:30am"
export function fmtH(h) {
  const hrs=Math.floor(h)%24, mins=Math.round((h%1)*60);
  const p=hrs>=12?"pm":"am", d=hrs%12===0?12:hrs%12;
  return mins===0?`${d}${p}`:`${d}:${String(mins).padStart(2,"0")}${p}`;
}

// snap a time to the nearest 15-minute increment
export function snap(h) { return Math.round(h*4)/4; }

// convert decimal hour to HH:MM string for time inputs
export function hToInput(h) {
  const hrs=Math.floor(h)%24, mins=Math.round((h%1)*60);
  return `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}`;
}

// convert HH:MM string to decimal hour
export function inputToH(str) {
  if(!str) return 9;
  const [h,m]=str.split(":").map(Number);
  return h+m/60;
}

// ── Date helpers ──

export function dateToIso(d)  { return d.toISOString().split("T")[0]; }

// get the number of days between a given Date and today (0=today, 1=tomorrow, etc.)
export function dateToDayOffset(date) {
  const today=new Date(); today.setHours(0,0,0,0);
  const sel=new Date(date); sel.setHours(0,0,0,0);
  return Math.round((sel-today)/(1000*60*60*24));
}

// get a Date object that is `offset` days from today
export function offsetToDate(offset) {
  const d=new Date(); d.setDate(d.getDate()+offset); return d;
}

// human-readable column header label for a given day offset
export function dayLabel(offset) {
  return offsetToDate(offset).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
}

// convert an ISO date string to a day offset from today
export function isoToOffset(iso) {
  const sel=new Date(iso+"T00:00:00"), t=new Date(); t.setHours(0,0,0,0);
  return Math.max(0,Math.round((sel-t)/(1000*60*60*24)));
}

// convert a day offset to an ISO date string
export function offsetToIso(offset) { return dateToIso(offsetToDate(offset)); }

// ── Sleep helpers ──

export function calcSleepHours(bed,wake) {
  const b=inputToH(bed),w=inputToH(wake);
  return w>b?w-b:(24-b)+w;
}

export function estimateStages(h) {
  const m=h*60;
  return { light:Math.round(m*0.50), deep:Math.round(m*0.18), rem:Math.round(m*0.22) };
}

export function fmtMins(m) {
  const h=Math.floor(m/60),mn=m%60;
  return mn===0?`${h}h`:`${h}h ${mn}m`;
}

// ── Event helpers ──

export function getColor(id)  { return EVENT_COLORS.find(c=>c.id===id)||EVENT_COLORS[0]; }
export function randomTip()   { return SLEEP_TIPS[Math.floor(Math.random()*SLEEP_TIPS.length)]; }
export function makeDefaultRepeat() { return { enabled:false, days:[], end_date:null }; }

// derive a badge label from priority and task type
export function deriveBadge(priority, taskType) {
  if(priority==="high"&&taskType==="fixed") return "High priority · Fixed";
  if(priority==="high")  return "High priority";
  if(taskType==="fixed") return "Fixed task";
  if(taskType==="free")  return "Free time";
  return null;
}

// ── Layout — prevents events from rendering on top of each other ──
export function layoutEvents(events) {
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