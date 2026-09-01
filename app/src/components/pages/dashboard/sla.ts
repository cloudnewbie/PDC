/**
 * SLA helpers shared by the dashboard mini-list and the escalations inbox.
 * The demo clock is anchored to page mount: `openedAgoMin` is "minutes before
 * mount", and every tick after mount eats into the remaining budget.
 */

/** Remaining SLA seconds given minutes-open at mount and elapsed ms since mount. */
export function slaRemainingSec(openedAgoMin: number, slaTargetMin: number, elapsedMs: number): number {
  return Math.round((slaTargetMin - openedAgoMin) * 60 - elapsedMs / 1000);
}

/** "6m 12s" · "1h 58m" · "1d 3h" — compact mono countdown text. */
export function formatCountdown(totalSec: number): string {
  const sec = Math.max(0, totalSec);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** Breach text: "+14m" over target. */
export function formatBreach(totalSec: number): string {
  const over = Math.abs(Math.min(0, totalSec));
  const d = Math.floor(over / 86400);
  const h = Math.floor((over % 86400) / 3600);
  const m = Math.floor((over % 3600) / 60);
  if (d > 0) return `+${d}d ${h}h`;
  if (h > 0) return `+${h}h ${String(m).padStart(2, "0")}m`;
  return `+${m}m`;
}

/** "24 min ago" · "3 h ago" · "1 d ago" */
export function formatAge(min: number): string {
  if (min < 60) return `${Math.max(1, Math.round(min))} min ago`;
  if (min < 1440) return `${Math.round(min / 60)} h ago`;
  return `${Math.round(min / 1440)} d ago`;
}
