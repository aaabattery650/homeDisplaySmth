// Widgets that should deflect rain register a getter that returns their
// current bounding rect in viewport coordinates. The RainSystem reads these
// each frame and runs simple AABB collision against droplets.
//
// Why a getter (not a static rect): widgets resize, fade in/out, and move
// during rotation crossfades. The getter lets us re-read DOMRect cheaply.

const getters = new Set();

export function registerRect(getter) {
  getters.add(getter);
  return () => getters.delete(getter);
}

export function getAllRects() {
  const out = [];
  for (const g of getters) {
    const r = g();
    if (r && r.width > 0 && r.height > 0) out.push(r);
  }
  return out;
}
