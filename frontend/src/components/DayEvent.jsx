import { useDraggable } from "@dnd-kit/core";
import { HOUR_PX } from "../constants";
import { getColor, fmtH, deriveBadge } from "../utils";

// ghost shown under the cursor while dragging
export function DragGhost({ ev }) {
  const c = getColor(ev.color);
  return (
    <div className="cal-event" style={{
      height: Math.max(ev.durH * HOUR_PX - 3, 26),
      opacity: 0.9,
      width: 200,
      pointerEvents: "none",
      background: c.bg,
      borderLeft: `2px solid ${c.border}`,
      color: c.text,
      borderTop: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(ev.startH + ev.durH)}</div>
    </div>
  );
}

// draggable event block rendered inside a day column
export default function DayEvent({ ev, colIndex, totalCols, dimmed, onClickEvent, bedtimeH }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id:ev.id });

  const c          = getColor(ev.color);
  const GAP        = 3;
  const widthPct   = totalCols > 1 ? `calc(${100 / totalCols}% - ${GAP}px)` : "calc(100% - 4px)";
  const leftOffset = totalCols > 1 ? `calc(${(colIndex / totalCols) * 100}% + ${colIndex * (GAP / totalCols)}px)` : "2px";
  const heightPx   = Math.max(ev.durH * HOUR_PX - 3, 26);
  const isCompact  = heightPx < 48;
  const badge      = deriveBadge(ev.priority, ev.taskType);
  const evEnd      = ev.startH + ev.durH;
  const showWindown = bedtimeH > 0 && ev.startH < bedtimeH && evEnd > bedtimeH;

  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className="cal-event"
      style={{
        top:       ev.startH * HOUR_PX,
        height:    heightPx,
        width:     widthPct,
        left:      leftOffset,
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity:   dimmed ? 0.3 : 1,
        zIndex:    isDragging ? 50 : colIndex + 2,
        cursor:    isDragging ? "grabbing" : "pointer",
        background:  c.bg,
        borderLeft:  `2px solid ${c.border}`,
        color:       c.text,
        borderTop:   "1px solid rgba(255,255,255,0.06)",
      }}
      onClick={() => { if (!transform) onClickEvent(ev); }}
    >
      <div className="cal-event-title">{ev.title}</div>
      {!isCompact && <div className="cal-event-time">{fmtH(ev.startH)} – {fmtH(evEnd)}</div>}
      {!isCompact && badge && !showWindown && <div className="sleep-badge">{badge}</div>}
      {!isCompact && showWindown && <div className="winddown-badge">Wind down by {fmtH(bedtimeH)}</div>}
    </div>
  );
}