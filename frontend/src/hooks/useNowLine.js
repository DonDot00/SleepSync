import { useEffect, useRef } from "react";
import { HOUR_PX } from "../constants";

// Tracks the current time and keeps the "now" line positioned correctly.
// Also scrolls the calendar to the current hour on first mount.
export function useNowLine(scrollRef) {
  const nowRef = useRef();

  // scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const d   = new Date();
      const h   = d.getHours() + d.getMinutes() / 60;
      scrollRef.current.scrollTop = Math.max(0, h * HOUR_PX - 120);
    }
  }, []);

  // update now line position every minute
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const h = d.getHours() + d.getMinutes() / 60;
      if (nowRef.current) nowRef.current.style.top = `${h * HOUR_PX}px`;
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  return nowRef;
}