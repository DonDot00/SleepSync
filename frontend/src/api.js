const BASE = "";

async function checked(res) {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Translators ──
// changes backend variables to frontend ones
export function toFrontend(task) {
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
    repeat:         task.repeat      || { enabled:false, days:[], end_date:null },
    repeatGroupId:  task.repeat_group_id || null,   // links all copies of a recurring series
    is_completed:   task.is_completed,
    is_missed:      task.is_missed,
    miss_count:     task.miss_count,
    complete_count: task.complete_count,
  };
}
// changes frontend variables to backend ones
export function toBackend(ev) {
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
    repeat:      ev.repeat      || { enabled:false, days:[], end_date:null },
  };
}

// ── Task CRUD ──
// !!!
export async function fetchTasks() {
  const res  = await fetch(`${BASE}/tasks/`);
  const data = await checked(res);
  return data.map(toFrontend);
}
// !!!
export async function createTask(ev) {
  const res  = await fetch(`${BASE}/tasks/`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(toBackend(ev)),
  });
  const data = await checked(res);
  return toFrontend(data);
}
// !!!
export async function updateTask(id, changes) {
  const res  = await fetch(`${BASE}/tasks/${id}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(changes),
  });
  const data = await checked(res);
  return toFrontend(data);
}
// !!!
export async function deleteTask(id) {
  await fetch(`${BASE}/tasks/${id}`, { method:"DELETE" });
}

// cancel all occurrences in a recurring series from `fromDay` onwards
// fromDay = task.day to cancel "this and future", 0 to cancel the whole series
export async function deleteRecurringGroup(groupId, fromDay = 0) {
  await fetch(`${BASE}/tasks/group/${groupId}?from_day=${fromDay}`, { method:"DELETE" });
}

// ── Chat ──

export async function sendChatMessage(message, wakeTime="07:00", sleepTime="23:00", energyLevel=3) {
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
  return await checked(res);
}

// ── Sleep ──

export async function fetchLatestSleep() {
  const res  = await fetch(`${BASE}/sleep/recent`);
  const data = await checked(res);
  return data[0] || null;
}

export async function saveSleepData(data) {
  try {
    await fetch(`${BASE}/sleep/`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
  } catch { /* intentionally silent — never blocks the UI */ }
}