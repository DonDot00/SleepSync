import { useState } from "react";
import { DAYS, MONTHS } from "../constants";
import { offsetToDate, dateToIso } from "../utils";

export default function MonthCalendar({ selectedDate, onSelectDate, eventDays }) {
  const now         = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const isCurrent   = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const prevMonth = () => viewMonth === 0  ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0),  setViewYear(y => y + 1)) : setViewMonth(m => m + 1);

  const isSelected = (d) =>
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth()    === viewMonth &&
    selectedDate.getDate()     === d;

  return (
    <div>
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={() => setViewYear(y => y - 1)}>«</button>
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-nav-label">{MONTHS[viewMonth]} {viewYear}</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        <button className="cal-nav-btn" onClick={() => setViewYear(y => y + 1)}>»</button>
      </div>

      <div className="month-grid">
        {DAYS.map((d, i) => <div key={i} className="day-label">{d}</div>)}
        <div className="day-label-underline"/>
        {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} className="day-cell empty"/>)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const isToday  = isCurrent && d === now.getDate();
          const isSel    = isSelected(d);
          const cellIso  = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const hasEvent = eventDays.includes(cellIso);
          return (
            <div key={d}
              onClick={() => onSelectDate(new Date(viewYear, viewMonth, d))}
              className={`day-cell${isSel ? " today" : ""}${hasEvent ? " has-event" : ""}`}
              style={isToday && !isSel ? { color:"#a78fff", fontWeight:600 } : {}}>
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
        <div className="panel-title" style={{ marginTop:14 }}>This week</div>
        <div className="stat-row"><span className="stat-label">Avg sleep</span><span className="stat-val">6h 52m</span></div>
        <div className="stat-row"><span className="stat-label">Best night</span><span className="stat-val">8h 10m</span></div>
        <div className="stat-row"><span className="stat-label">Goal hit</span><span className="stat-val purple">3 / 7</span></div>
        <div className="week-bar-row">
          {["M","T","W","T","F","S","S"].map((d, i) => {
            const h = [65,80,50,90,70,45,75][i];
            return (
              <div key={i} className="week-bar-wrap">
                <div className="week-bar-track">
                  <div className="week-bar-fill" style={{ height:`${h}%`, background:h>=75?"#7f77dd":"#2a2050" }}/>
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