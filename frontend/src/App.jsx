import { useState, useEffect } from "react"

const BASE = "http://localhost:8000"

const api = {
  getTasks: () => fetch(`${BASE}/tasks/`).then(r => r.json()),
  createTask: (task) => fetch(`${BASE}/tasks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task)
  }).then(r => r.json()),
  updateTask: (id, update) => fetch(`${BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update)
  }).then(r => r.json()),
  getSchedule: (wake, sleep) =>
    fetch(`${BASE}/schedule/generate?wake_time=${wake}&sleep_time=${sleep}`).then(r => r.json())
}

const PRIORITY_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" }
const TYPE_COLORS = { fixed: "#5b5ef4", flexible: "#22c55e", free: "#facc15", sleep: "#60a5fa" }

export default function App() {
  const [schedule, setSchedule] = useState([])
  const [wake, setWake] = useState("07:00")
  const [sleep, setSleep] = useState("23:00")
  const [form, setForm] = useState({
    name: "", duration_minutes: 30,
    priority: "medium", task_type: "flexible", fixed_time: ""
  })

  const refresh = async () => {
    const s = await api.getSchedule(wake, sleep)
    setSchedule(s.schedule || [])
  }

  useEffect(() => { refresh() }, [])

  const addTask = async () => {
    if (!form.name) return
    await api.createTask(form)
    setForm({ name: "", duration_minutes: 30, priority: "medium", task_type: "flexible", fixed_time: "" })
    refresh()
  }

  const mark = async (id, type) => {
    if (!id) return
    await api.updateTask(id, { [type]: true })
    refresh()
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f13", color: "#f0f0f0", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>REM AI</h1>
        <p style={{ color: "#666", marginBottom: "2rem" }}>Your intelligent daily scheduler</p>

        {/* Wake/Sleep */}
        <div style={{ background: "#1a1a24", borderRadius: 12, padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "#888" }}>
            WAKE UP
            <input type="time" value={wake} onChange={e => setWake(e.target.value)}
              style={{ background: "#0f0f13", border: "1px solid #333", borderRadius: 6, padding: "0.4rem", color: "#f0f0f0" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "#888" }}>
            SLEEP
            <input type="time" value={sleep} onChange={e => setSleep(e.target.value)}
              style={{ background: "#0f0f13", border: "1px solid #333", borderRadius: 6, padding: "0.4rem", color: "#f0f0f0" }} />
          </label>
          <button onClick={refresh}
            style={{ marginTop: "1rem", background: "#5b5ef4", border: "none", borderRadius: 8, padding: "0.5rem 1.25rem", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
            Generate Schedule
          </button>
        </div>

        {/* Add Task */}
        <div style={{ background: "#1a1a24", borderRadius: 12, padding: "1rem", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.75rem" }}>ADD TASK</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input placeholder="Task name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              onKeyDown={e => e.key === "Enter" && addTask()}
              style={{ flex: 2, minWidth: 150, background: "#0f0f13", border: "1px solid #333", borderRadius: 6, padding: "0.5rem", color: "#f0f0f0" }} />
            <input type="number" placeholder="Min" value={form.duration_minutes}
              onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
              style={{ width: 70, background: "#0f0f13", border: "1px solid #333", borderRadius: 6, padding: "0.5rem", color: "#f0f0f0" }} />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
              style={{ background: "#0f0f13", border: "1px solid #333", borderRadius: 6, padding: "0.5rem", color: "#f0f0f0" }}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={form.task_type} onChange={e => setForm({ ...form, task_type: e.target.value })}
              style={{ background: "#0f0f13", border: "1px solid #333", borderRadius: 6, padding: "0.5rem", color: "#f0f0f0" }}>
              <option value="flexible">Flexible</option>
              <option value="fixed">Fixed Time</option>
              <option value="free">Free Time</option>
            </select>
            {form.task_type === "fixed" && (
              <input type="time" value={form.fixed_time}
                onChange={e => setForm({ ...form, fixed_time: e.target.value })}
                style={{ background: "#0f0f13", border: "1px solid #333", borderRadius: 6, padding: "0.5rem", color: "#f0f0f0" }} />
            )}
            <button onClick={addTask}
              style={{ background: "#5b5ef4", border: "none", borderRadius: 8, padding: "0.5rem 1.25rem", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              + Add
            </button>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.75rem" }}>TODAY'S SCHEDULE</p>
          {schedule.length === 0 && (
            <div style={{ color: "#444", textAlign: "center", padding: "2rem" }}>Add tasks and hit Generate Schedule</div>
          )}
          {schedule.map((block, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "0.875rem 1rem", borderRadius: 10, marginBottom: "0.5rem",
              background: "#1a1a24", borderLeft: `4px solid ${TYPE_COLORS[block.type] || "#333"}`
            }}>
              <span style={{ fontSize: "0.75rem", color: "#666", minWidth: 110 }}>{block.start} – {block.end}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{block.name}</span>
              {block.priority !== "non-negotiable" && (
                <span style={{ fontSize: "0.7rem", color: PRIORITY_COLORS[block.priority], textTransform: "uppercase" }}>{block.priority}</span>
              )}
              {block.task_id && (
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button onClick={() => mark(block.task_id, "is_completed")}
                    style={{ background: "transparent", border: "1px solid #333", borderRadius: 6, padding: "0.2rem 0.5rem", cursor: "pointer", fontSize: "1rem" }}>✅</button>
                  <button onClick={() => mark(block.task_id, "is_missed")}
                    style={{ background: "transparent", border: "1px solid #333", borderRadius: 6, padding: "0.2rem 0.5rem", cursor: "pointer", fontSize: "1rem" }}>❌</button>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
