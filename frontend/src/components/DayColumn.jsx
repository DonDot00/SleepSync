import { useMemo } from "react";
import { HOUR_PX, TOTAL_HOURS } from "../constants";
import { layoutEvents, fmtH } from "../utils";
import DayEvent from "./DayEvent";

export default function DayColumn({ dayOffset, events, activeId, onClickEvent, bedtimeH, nowRef }) {
  const laid = useMemo(() => layoutEvents(events), [events]);

  return (
    <div className="day-col-wrap" style={{ height:TOTAL_HOURS * HOUR_PX, position:"relative" }}>
      {/* hour and half-hour background lines */}
      {Array.from({ length:TOTAL_HOURS }, (_, h) => (
        <div key={h} style={{ position:"absolute", top:h * HOUR_PX, left:0, right:0, pointerEvents:"none" }}>
          <div className="hour-bg-line"/>
          <div className="half-bg-line"/>
        </div>
      ))}

      {/* render all events with overlap layout applied */}
      {laid.map(({ ev, colIndex, totalCols }) => (
        <DayEvent
          key={ev.id} ev={ev} colIndex={colIndex} totalCols={totalCols}
          dimmed={ev.id === activeId} onClickEvent={onClickEvent} bedtimeH={bedtimeH}
        />
      ))}

      {/* dashed bedtime line */}
      {bedtimeH > 0 && (
        <div className="bedtime-line" style={{ top:bedtimeH * HOUR_PX }}>
          <span className="bedtime-line-label">{fmtH(bedtimeH)} bedtime</span>
        </div>
      )}

      {/* live "now" indicator — only shown on today's column */}
      {dayOffset === 0 && nowRef && (
        <div ref={nowRef} className="now-line" style={{ position:"absolute", left:0, right:0 }}>
          <div className="now-dot"/>
        </div>
      )}
    </div>
  );
}