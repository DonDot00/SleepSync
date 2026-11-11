export const HOUR_PX     = 64;
export const TOTAL_HOURS = 24;
export const DAYS        = ["S","M","T","W","T","F","S"];
export const MONTHS      = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const DOW         = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export const SLEEP_TIPS = [
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

export const EVENT_COLORS = [
  { id:"purple", bg:"#2a2050", border:"#7f77dd", text:"#a78fff" },
  { id:"teal",   bg:"#0d2820", border:"#1d9e75", text:"#5dcaa5" },
  { id:"pink",   bg:"#2a1020", border:"#d4537e", text:"#ed93b1" },
  { id:"gray",   bg:"#1a1828", border:"#444441", text:"#888780" },
  { id:"blue",   bg:"#0d1a30", border:"#3b82f6", text:"#60a5fa" },
  { id:"amber",  bg:"#2a1a00", border:"#d97706", text:"#fbbf24" },
  { id:"red",    bg:"#2a0a10", border:"#ef4444", text:"#f87171" },
  { id:"green",  bg:"#0a2010", border:"#22c55e", text:"#4ade80" },
];

export const PRIORITY_LABELS  = { high:"High", medium:"Medium", low:"Low" };
export const TASK_TYPE_LABELS = { fixed:"Fixed", flexible:"Flexible", free:"Free time" };

export const INITIAL_EVENTS = [
  { id:1, title:"Morning run",       color:"teal",   startH:7,  durH:0.75, day:0, location:"Riverside Park",  description:"5K easy pace.",               priority:"medium", taskType:"flexible", repeat:{ enabled:false, days:[], end_date:null } },
  { id:2, title:"Hackathon kickoff", color:"purple", startH:9,  durH:3,    day:0, location:"Room 4B",          description:"Team intro, sprint planning.", priority:"high",   taskType:"fixed",    repeat:{ enabled:false, days:[], end_date:null } },
  { id:3, title:"Lunch break",       color:"gray",   startH:12, durH:1,    day:0, location:"Cafeteria",        description:"Step away and recharge.",      priority:"low",    taskType:"free",     repeat:{ enabled:true,  days:[1,2,3,4,5], end_date:null } },
  { id:4, title:"Build sprint",      color:"purple", startH:13, durH:5,    day:0, location:"Room 4B",          description:"Core build time.",             priority:"high",   taskType:"fixed",    repeat:{ enabled:false, days:[], end_date:null } },
  { id:5, title:"Team dinner",       color:"pink",   startH:19, durH:1.5,  day:0, location:"The Rustic Table", description:"Casual dinner.",               priority:"medium", taskType:"flexible", repeat:{ enabled:false, days:[], end_date:null } },
  { id:6, title:"Morning standup",   color:"blue",   startH:9,  durH:0.5,  day:1, location:"Zoom",             description:"Daily team sync.",             priority:"high",   taskType:"fixed",    repeat:{ enabled:true,  days:[1,2,3,4,5], end_date:null } },
  { id:7, title:"Design review",     color:"amber",  startH:11, durH:2,    day:1, location:"Room 2A",          description:"Review final designs.",        priority:"medium", taskType:"flexible", repeat:{ enabled:false, days:[], end_date:null } },
  { id:8, title:"Gym",               color:"teal",   startH:17, durH:1,    day:1, location:"Fitness Center",   description:"Strength session.",            priority:"medium", taskType:"flexible", repeat:{ enabled:true,  days:[1,3,5], end_date:null } },
];

export const INITIAL_MESSAGES = [
  { from:"ai", text:"Hey! I'm your SleepSync assistant. Ask me to add events, reschedule tasks, or get advice on your day." },
];