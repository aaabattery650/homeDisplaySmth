// Quiet hours: 23:00 → 06:00 local. During this window the rotation engine
// pauses and ambient animations dim/slow.
export function isQuietHours(now = new Date()) {
  const h = now.getHours();
  return h >= 23 || h < 6;
}

// 0..1 progress through the day, used for palette/atmosphere shifts.
export function dayProgress(now = new Date()) {
  return (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
}
