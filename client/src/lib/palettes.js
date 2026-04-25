// Body-background palettes per weather kind, day vs night.
//
// Constraint: every palette must stay dark enough for white text to remain
// legible — we do *not* swap text colors when weather changes, so the bg
// must always sit comfortably under foreground content.
//
// Each palette has:
//   top, bottom    — vertical sky gradient
//   accent1, accent2 — radial highlights at top-right and bottom-left,
//                      giving the bg some character beyond a flat gradient

const PALETTES = {
  clear: {
    day:   { top: '#4d80b8', bottom: '#2a4978', accent1: 'rgba(255, 200, 140, 0.40)', accent2: 'rgba(120, 165, 210, 0.28)' },
    night: { top: '#0a1428', bottom: '#050a18', accent1: 'rgba(40,  60, 110, 0.55)',  accent2: 'rgba(20,  35,  72, 0.55)' },
  },
  partly_cloudy: {
    day:   { top: '#5b88b0', bottom: '#34547a', accent1: 'rgba(220, 180, 140, 0.30)', accent2: 'rgba(120, 150, 195, 0.32)' },
    night: { top: '#0c1830', bottom: '#070f1f', accent1: 'rgba(38,  56,  98, 0.55)',  accent2: 'rgba(18,  30,  62, 0.55)' },
  },
  overcast: {
    day:   { top: '#5e6e80', bottom: '#3a4658', accent1: 'rgba(170, 185, 200, 0.25)', accent2: 'rgba(110, 124, 145, 0.28)' },
    night: { top: '#171c25', bottom: '#0a0d12', accent1: 'rgba(50,  62,  80, 0.50)',  accent2: 'rgba(28,  35,  48, 0.50)' },
  },
  fog: {
    day:   { top: '#6e7884', bottom: '#4c5460', accent1: 'rgba(190, 198, 208, 0.30)', accent2: 'rgba(140, 148, 158, 0.30)' },
    night: { top: '#1c2026', bottom: '#0e1014', accent1: 'rgba(58,  66,  78, 0.50)',  accent2: 'rgba(32,  38,  46, 0.50)' },
  },
  drizzle: {
    day:   { top: '#4d5e72', bottom: '#2c3848', accent1: 'rgba(130, 150, 175, 0.30)', accent2: 'rgba(80,  100, 125, 0.28)' },
    night: { top: '#0c121e', bottom: '#06090f', accent1: 'rgba(34,  46,  68, 0.55)',  accent2: 'rgba(18,  26,  42, 0.55)' },
  },
  rain: {
    day:   { top: '#3e4c5e', bottom: '#1f2734', accent1: 'rgba(105, 125, 150, 0.28)', accent2: 'rgba(65,  85,  108, 0.28)' },
    night: { top: '#0a0f1a', bottom: '#04080e', accent1: 'rgba(28,  40,  60, 0.55)',  accent2: 'rgba(15,  22,  38, 0.55)' },
  },
  thunderstorm: {
    day:   { top: '#2c3442', bottom: '#10141c', accent1: 'rgba(85,  100, 125, 0.32)', accent2: 'rgba(45,  60,  85, 0.32)' },
    night: { top: '#0a0d14', bottom: '#04060a', accent1: 'rgba(25,  34,  50, 0.65)',  accent2: 'rgba(12,  18,  28, 0.55)' },
  },
  snow: {
    day:   { top: '#6f7d8e', bottom: '#465264', accent1: 'rgba(210, 225, 240, 0.30)', accent2: 'rgba(170, 188, 210, 0.28)' },
    night: { top: '#101824', bottom: '#080c14', accent1: 'rgba(48,  68,  96, 0.55)',  accent2: 'rgba(24,  36,  58, 0.55)' },
  },
};

const FALLBACK = PALETTES.clear;

export function getPalette(kind, isDay) {
  const set = PALETTES[kind] ?? FALLBACK;
  return isDay ? set.day : set.night;
}

export function applyPalette(kind, isDay) {
  const p = getPalette(kind, isDay);
  const body = document.body;
  body.style.setProperty('--sky-top', p.top);
  body.style.setProperty('--sky-bottom', p.bottom);
  body.style.setProperty('--sky-accent-1', p.accent1);
  body.style.setProperty('--sky-accent-2', p.accent2);
}
