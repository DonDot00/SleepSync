import { useState, useRef, useEffect, useCallback } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import "./App.css";

import { fetchTasks, createTask, updateTask, deleteTask, deleteRecurringGroup } from "./api";
import { HOUR_PX, TOTAL_HOURS, INITIAL_EVENTS } from "./constants";
import { snap, inputToH, calcSleepHours, dateToDayOffset, offsetToDate, dayLabel, randomTip, dateToIso } from "./utils";
import { useNowLine } from "./hooks/useNowLine";

import MonthCalendar  from "./components/MonthCalendar";
import EnergySlider   from "./components/EnergySlider";
import SleepHealth    from "./components/SleepHealth";
import AIChat         from "./components/AIChat";
import DayColumn      from "./components/DayColumn";
import EventModal     from "./components/EventModal";
import AddEventModal  from "./components/AddEventModal";
import { DragGhost }  from "./components/DayEvent";

const todayDate = new Date();

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" fill="#a78fff" opacity="0.9"/>
    </svg>
  );
}

export default function App() {
  const [events,       setEvents]       = useState([]); // all events loaded from backend
  const [activeId,     setActiveId]     = useState(null); // id of event currently being dragged
  const [modalEv,      setModalEv]      = useState(null); // event being edited in the modal — null if no modal open
  const [showAdd,      setShowAdd]      = useState(false); // whether the add event modal is open
  const [selectedDate, setSelectedDate] = useState(new Date()); // Which date is selected on the mini calendar
  const [energy,       setEnergy]       = useState(3); // 1-5 slider of how energetic user feels today
  const [showEnWarn,   setShowEnWarn]   = useState(true); // show energy warning on first load
  const [tip]                           = useState(() => randomTip()); // pick a random tip on load and stick to it
  const [showTip,      setShowTip]      = useState(true); // show AI tip on first load
  const [bedtime,      setBedtime]      = useState("23:00"); // default bedtime — can be changed by user or AI suggestions
  const [numDays,      setNumDays]      = useState(2); // Whether to show 1 or 2 day columns

  const scrollRef  = useRef(); // !!!
  const centerRef  = useRef(); // !!!
  const activeEv   = events.find(e => e.id === activeId); // !!!event currently being dragged
  const sensors    = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:8 } })); // drag sensors
  const bedtimeH   = inputToH(bedtime); // bedtime in hours, e.g. 23.5 for 11:30pm
  const nowRef     = useNowLine(scrollRef); // current time in hours, updated every minute by useNowLine hook

  const selectedOffset = dateToDayOffset(selectedDate); // how many days the selected date is from today — 0=today, 1=tomorrow, -1=yesterday, etc.
  const eventDays      = [...new Set(events.map(ev => dateToIso(offsetToDate(ev.day))))];

  // load all tasks from backend on mount — fall back to hardcoded if backend is down
  useEffect(() => {
    fetchTasks().then(setEvents).catch(() => setEvents(INITIAL_EVENTS));
  }, []);

  // re-fetch all tasks — called after AI creates events or after any mutation that adds rows
  const refreshEvents = useCallback(() => {
    fetchTasks().then(setEvents).catch(() => {});
  }, []);

  // watch center panel width and switch between 1 and 2 day columns
  useEffect(() => {
    if (!centerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setNumDays(entries[0].contentRect.width >= 580 ? 2 : 1);
    });
    ro.observe(centerRef.current);
    return () => ro.disconnect();
  }, []);

  // re-show energy warning whenever the slider moves
  useEffect(() => { setShowEnWarn(true); }, [energy]);

  const onDragStart = ({ active }) => setActiveId(active.id);

  // !!! on drag end — optimistically update UI then sync new startH to backend
  const onDragEnd = async ({ active, delta }) => {
    setActiveId(null);
    const ev = events.find(e => e.id === active.id);
    if (!ev) return;
    let s = snap(ev.startH + delta.y / HOUR_PX);
    s = Math.max(0, Math.min(TOTAL_HOURS - ev.durH, s));
    setEvents(prev => prev.map(e => e.id === active.id ? { ...e, startH:s } : e));
    try { await updateTask(ev.id, { start_h:s }); } catch {}
  };

  // !!! save edits from EventModal — syncs all changed fields to backend
  const handleSave = async (u) => {
    try {
      const saved = await updateTask(u.id, {
        title:u.title, color:u.color, start_h:u.startH, dur_h:u.durH,
        day:u.day, location:u.location, description:u.description,
        priority:u.priority, task_type:u.taskType,
        fixed_time:u.fixed_time || null, repeat:u.repeat,
      });
      setEvents(p => p.map(ev => ev.id === saved.id ? saved : ev));
    } catch {
      setEvents(p => p.map(ev => ev.id === u.id ? u : ev));
    }
    setModalEv(null);
  };

  // !!! delete a single task
  const handleDelete = async (id) => {
    try { await deleteTask(id); } catch {}
    setEvents(p => p.filter(ev => ev.id !== id));
    setModalEv(null);
  };

  // !!! cancel a recurring series — cancelAll=true removes all, false removes this + future
  const handleCancelRecurring = async (ev, cancelAll) => {
    if (!ev.repeatGroupId) { handleDelete(ev.id); return; }
    const fromDay = cancelAll ? 0 : ev.day;
    try { await deleteRecurringGroup(ev.repeatGroupId, fromDay); } catch {}
    refreshEvents();
  };

  // !!! create task in backend — backend expands repeat rows — then refresh so copies appear
  const handleAdd = async (nev) => {
    try {
      await createTask(nev);
      refreshEvents();
    } catch {
      alert("Failed to save event — is the backend running?");
    }
  };

  // !!! first column = selected date, second = the day after
  const dayCols = numDays === 2
    ? [
        { offset:selectedOffset,     evs:events.filter(e => e.day === selectedOffset) },
        { offset:selectedOffset + 1, evs:events.filter(e => e.day === selectedOffset + 1) },
      ]
    : [{ offset:selectedOffset, evs:events.filter(e => e.day === selectedOffset) }];

  const sleepScore = Math.min(100, Math.round((calcSleepHours(bedtime, "06:40") / 8) * 100));

  // main render. Think of a wireframe or html.
  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="app">

        {/* ── Topbar ── */}
        <div className="topbar">
          <span className="logo">SleepSync</span>
          <span className="topbar-date">
            {todayDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}
          </span>
          <div className="topbar-score"><MoonIcon/>Sleep score: {sleepScore}</div>
        </div>

        <div className="main">

          {/* ── Left panel — mini calendar + weekly stats ── */}
          <div className="panel left-panel">
            <MonthCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              eventDays={eventDays}
            />
          </div>

          {/* ── Center panel — calendar grid ── */}
          <div className="center-panel" ref={centerRef}>
            <div className="today-header">
              <div style={{ display:"flex", alignItems:"baseline", gap:10, flexWrap:"wrap" }}>
                <span className="today-label">
                  {selectedOffset === 0
                    ? "Today"
                    : selectedDate.toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric" })}
                </span>
                <div className="header-bedtime">
                  <span className="header-bedtime-label">Bedtime</span>
                  <input className="header-bedtime-input" type="time" value={bedtime}
                    onChange={e => setBedtime(e.target.value)}/>
                </div>
                <span className="today-sub">{events.length} events</span>
              </div>
              <button className="add-event-btn" onClick={() => setShowAdd(true)}>+ Add event</button>
            </div>

            <EnergySlider value={energy} onChange={setEnergy}/>

            {energy <= 2 && showEnWarn && (
              <div className="energy-warning">
                <span>Low energy today — I'll suggest lighter tasks and extra breaks.</span>
                <button className="energy-warn-close" onClick={() => setShowEnWarn(false)}>✕</button>
              </div>
            )}

            {/* scrollable calendar grid */}
            <div className="cal-scroll-area" ref={scrollRef}>
              <div className="cal-grid-inner">

                {/* hour labels on the left */}
                <div className="hour-labels-col">
                  {Array.from({ length:TOTAL_HOURS }, (_, h) => (
                    <div key={h} className="hour-label-row" style={{ height:HOUR_PX }}>
                      <span className="hour-label">
                        {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* day columns */}
                <div className="day-cols-flex">
                  <div className="day-headers-row">
                    {dayCols.map((col, i) => (
                      <div key={col.offset} className="day-col-header-cell">
                        {i === 0
                          ? (selectedOffset === 0 ? "Today" : "Selected")
                          : "Next day"} — {dayLabel(col.offset)}
                      </div>
                    ))}
                  </div>
                  <div className="day-cols-body">
                    {dayCols.map((col, i) => (
                      <div key={col.offset}
                        className={`day-col-flex-item${i > 0 ? " day-col-divider" : ""}`}>
                        <DayColumn
                          dayOffset={col.offset}
                          events={col.evs}
                          activeId={activeId}
                          onClickEvent={setModalEv}
                          bedtimeH={bedtimeH}
                          nowRef={col.offset === 0 ? nowRef : null}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right panel — sleep health + AI chat ── */}
          <div className="right-panel">
            <SleepHealth
              showTip={showTip} tip={tip}
              onDismissTip={() => setShowTip(false)}
              onDontShowTip={() => setShowTip(false)}
              bedtime={bedtime}
              onBedtimeChange={setBedtime}
            />
            <AIChat
              energy={energy}
              bedtime={bedtime}
              onEventCreated={refreshEvents}
            />
          </div>
        </div>
      </div>

      {/* drag ghost overlay */}
      <DragOverlay dropAnimation={null}>
        {activeEv ? <DragGhost ev={activeEv}/> : null}
      </DragOverlay>

      {/* edit event modal */}
      {modalEv && (
        <EventModal
          ev={modalEv}
          onClose={() => setModalEv(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancelRecurring={handleCancelRecurring}
        />
      )}

      {/* add event modal — defaults to currently selected day */}
      {showAdd && (
        <AddEventModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
          defaultDayOffset={selectedOffset}
        />
      )}
    </DndContext>
  );
}