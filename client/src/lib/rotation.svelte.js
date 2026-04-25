import { isQuietHours } from './time.js';

// Per-slide durations tuned to reading load in a low-distraction home
// environment. Seconds.
const SLIDES = [
  { id: 'calendar', duration: 25_000 },
  { id: 'launches', duration: 20_000 },
  { id: 'flights',  duration: 12_000 },
];

export const rotation = $state({
  slides: SLIDES,
  index: 0,
  paused: false,
  quiet: isQuietHours(),
});

let timer = null;

export function startRotation() {
  stopRotation();
  schedule();
  // Re-evaluate quiet-hours each minute. Cheap, and avoids drift.
  setInterval(() => {
    rotation.quiet = isQuietHours();
  }, 60_000);
}

export function stopRotation() {
  if (timer) clearTimeout(timer);
  timer = null;
}

function schedule() {
  if (rotation.paused || rotation.quiet) {
    // Re-check in a few seconds rather than spinning a tight loop.
    timer = setTimeout(schedule, 5_000);
    return;
  }
  const cur = rotation.slides[rotation.index];
  timer = setTimeout(() => {
    rotation.index = (rotation.index + 1) % rotation.slides.length;
    schedule();
  }, cur.duration);
}

export function nextSlide() {
  rotation.index = (rotation.index + 1) % rotation.slides.length;
  restartTimer();
}

export function prevSlide() {
  rotation.index = (rotation.index - 1 + rotation.slides.length) % rotation.slides.length;
  restartTimer();
}

function restartTimer() {
  if (timer) clearTimeout(timer);
  schedule();
}

export function currentSlideId() {
  return rotation.slides[rotation.index].id;
}
