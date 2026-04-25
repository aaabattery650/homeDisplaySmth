import { Application, Container, Graphics, BlurFilter } from 'pixi.js';
import { getAllRects } from './collision.js';

// Per-kind config drives every visual layer at once. Each layer reads only
// the slice it cares about; an unset slice means "off."
//
//   particles: { type, rate, ... }   precipitation
//   clouds:    { opacity, speed, tint }   drifting puffs
//   sun:       { intensity, x, y }   warm glow (x/y as 0..1 of screen)
//   lightning: true                  enables strike + thunder scheduling
const KINDS = {
  clear: {
    particles: null,
    clouds: { opacity: 0.05, speed: 6, tint: 0xffffff },
    sun:    { intensity: 1.0, x: 0.18, y: 0.22 },
  },
  partly_cloudy: {
    particles: null,
    clouds: { opacity: 0.22, speed: 8, tint: 0xffffff },
    sun:    { intensity: 0.6, x: 0.18, y: 0.22 },
  },
  overcast: {
    particles: null,
    clouds: { opacity: 0.45, speed: 6, tint: 0xc4cfdf },
    sun:    null,
  },
  fog: {
    particles: null,
    clouds: { opacity: 0.55, speed: 3, tint: 0xb6becc },
    sun:    null,
  },
  drizzle: {
    particles: { type: 'streak', rate: 30, vy: 480, vx: -25, len: 9, color: 0x9ec6ff, alpha: 0.45, width: 1.0 },
    clouds:   { opacity: 0.35, speed: 9, tint: 0xb8c4d8 },
    sun:      null,
  },
  rain: {
    particles: { type: 'streak', rate: 110, vy: 720, vx: -55, len: 14, color: 0x9ec6ff, alpha: 0.55, width: 1.4 },
    clouds:   { opacity: 0.45, speed: 11, tint: 0xa8b6cd },
    sun:      null,
  },
  thunderstorm: {
    particles: { type: 'streak', rate: 280, vy: 950, vx: -90, len: 22, color: 0xb8d3ff, alpha: 0.70, width: 1.8 },
    clouds:   { opacity: 0.6, speed: 14, tint: 0x8a96b0 },
    sun:      null,
    lightning: true,
  },
  snow: {
    particles: { type: 'flake', rate: 50, vy: 60, vx: -10, color: 0xffffff, alpha: 0.85 },
    clouds:   { opacity: 0.4, speed: 5, tint: 0xd6dde8 },
    sun:      null,
  },
};

const GRAVITY = 950;
const SPLASH_LIFE = 0.45;
const SPLASH_COUNT = 5;
const SPLASH_COLOR = 0xc0dcff;
const FLAKE_FADE = 0.30; // seconds for a flake to fade out after impact

// Lightning timing (seconds between strikes)
const STRIKE_INTERVAL_MIN = 5;
const STRIKE_INTERVAL_MAX = 14;

// Thunder follows lightning by this many seconds (sound-vs-light delay).
// Closer strikes (smaller delay) roll faster and shake harder.
const THUNDER_DELAY_MIN = 1.2;
const THUNDER_DELAY_MAX = 3.8;

const CLOUD_COUNT = 8;

export class WeatherFx {
  /**
   * @param {HTMLElement} mountEl
   * @param {{ onFlash?: (alpha: number) => void, onShake?: (dx: number, dy: number) => void }} [opts]
   */
  constructor(mountEl, opts = {}) {
    this.mountEl = mountEl;
    this.onFlash = opts.onFlash ?? (() => {});
    this.onShake = opts.onShake ?? (() => {});
    this.app = new Application();
    this.kind = 'clear';
    this.dimmed = false;

    this.particles = [];
    this._spawnAccumulator = 0;

    this._strikeQueue = [];
    this._thunderQueue = [];
    this._activeShake = null;
    this._nextStrikeAt = 0;
    this._currentFlash = 0;

    this.clouds = [];
  }

  async init() {
    await this.app.init({
      resizeTo: this.mountEl,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.mountEl.appendChild(this.app.canvas);

    this.skyLayer = new Container();
    this.cloudLayer = new Container();
    this.particleLayer = new Container();
    this.app.stage.addChild(this.skyLayer);
    this.app.stage.addChild(this.cloudLayer);
    this.app.stage.addChild(this.particleLayer);

    this._initSun();
    this._initClouds();

    this.app.ticker.add(this._tick);
  }

  setWeather(kind) {
    const next = (kind && KINDS[kind]) ? kind : 'clear';
    if (next !== this.kind) {
      this.kind = next;
      this._strikeQueue = [];
      this._thunderQueue = [];
      this._nextStrikeAt = performance.now() / 1000 + 1.5;
    }
  }

  setDimmed(d) {
    this.dimmed = !!d;
  }

  _config() {
    return KINDS[this.kind];
  }

  // ─── Sun ──────────────────────────────────────────────────────────────────
  _initSun() {
    const sun = new Container();

    // Rays sit *behind* the disk — long thin streaks radiating outward, blurred
    // soft. The whole rays container slowly rotates so the sun feels alive.
    const rays = new Container();
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const long = i % 2 === 0;
      const len = long ? 240 : 170;
      const ray = new Graphics()
        .moveTo(0, 0)
        .lineTo(len, 0)
        .stroke({ color: 0xffe2a8, width: long ? 9 : 6, alpha: long ? 0.32 : 0.20 });
      ray.rotation = angle;
      rays.addChild(ray);
    }
    rays.filters = [new BlurFilter({ strength: 8, quality: 4 })];
    this.sunRays = rays;
    sun.addChild(rays);

    // Halo + disk. Outer layers are warm orange (atmospheric scattering),
    // inner layers ramp to a crisp white core. The defined core is what makes
    // it read as a *sun* rather than a vague glow.
    const layers = [
      { r: 420, color: 0xffa850, alpha: 0.04 },  // far warm haze
      { r: 300, color: 0xffc070, alpha: 0.09 },
      { r: 200, color: 0xffd488, alpha: 0.16 },
      { r: 130, color: 0xffe2a8, alpha: 0.28 },
      { r:  85, color: 0xfff0c8, alpha: 0.50 },
      { r:  55, color: 0xfff8e8, alpha: 0.78 },
      { r:  34, color: 0xffffff, alpha: 1.00 },  // crisp white core
    ];
    for (const l of layers) {
      const g = new Graphics().circle(0, 0, l.r).fill({ color: l.color, alpha: l.alpha });
      sun.addChild(g);
    }

    sun.alpha = 0;
    this.sun = sun;
    this.skyLayer.addChild(sun);
  }

  _updateSun(dt) {
    const cfg = this._config().sun;
    const target = cfg ? cfg.intensity * (this.dimmed ? 0.4 : 1) : 0;
    this.sun.alpha += (target - this.sun.alpha) * Math.min(1, dt * 0.7);

    if (cfg) {
      this.sun.x = this.app.screen.width * cfg.x;
      this.sun.y = this.app.screen.height * cfg.y;
    }

    const t = performance.now() / 1000;
    // Slow ray rotation gives a subtle shimmer.
    if (this.sunRays) this.sunRays.rotation = t * 0.05;
    // Subtle disk pulse so the sun feels alive.
    this.sun.scale.set(1 + Math.sin(t * 0.4) * 0.015);
  }

  // ─── Clouds ───────────────────────────────────────────────────────────────
  _initClouds() {
    const w = this.app.screen.width || window.innerWidth;
    const h = this.app.screen.height || window.innerHeight;

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const cloud = makeCloud();
      // Spread initial x across the screen so kind-changes don't reveal a
      // wave of clouds entering from one edge.
      cloud.container.x = Math.random() * w;
      cloud.container.y = 60 + Math.random() * (h * 0.45);
      cloud.container.alpha = 0;
      this.cloudLayer.addChild(cloud.container);
      this.clouds.push(cloud);
    }
  }

  _updateClouds(dt) {
    const cfg = this._config().clouds;
    const targetAlpha = cfg ? cfg.opacity * (this.dimmed ? 0.6 : 1) : 0;
    const speedFactor = cfg ? cfg.speed : 6;
    const tint = cfg ? cfg.tint : 0xffffff;

    const w = this.app.screen.width;

    for (const c of this.clouds) {
      const ct = c.container;
      ct.alpha += (targetAlpha - ct.alpha) * Math.min(1, dt * 0.6);
      ct.tint = tint;

      ct.x += c.baseSpeed * speedFactor * dt;
      if (ct.x - c.halfWidth > w) {
        ct.x = -c.halfWidth;
        ct.y = 60 + Math.random() * (this.app.screen.height * 0.45);
      }
    }
  }

  // ─── Tick ─────────────────────────────────────────────────────────────────
  _tick = (ticker) => {
    const dt = ticker.deltaMS / 1000;
    this._spawn(dt);
    this._updateParticles(dt);
    this._updateClouds(dt);
    this._updateSun(dt);
    this._tickLightning(dt);
    this._tickThunder(dt);
  };

  // ─── Particles ────────────────────────────────────────────────────────────
  _spawn(dt) {
    const p = this._config().particles;
    if (!p) return;
    const rate = this.dimmed ? p.rate * 0.35 : p.rate;
    this._spawnAccumulator += rate * dt;
    const n = Math.floor(this._spawnAccumulator);
    this._spawnAccumulator -= n;
    for (let i = 0; i < n; i++) {
      if (p.type === 'streak') this._spawnStreak(p);
      else if (p.type === 'flake') this._spawnFlake(p);
    }
  }

  _spawnStreak(p) {
    const w = this.app.screen.width;
    const g = new Graphics()
      .moveTo(0, 0)
      .lineTo(2, p.len)
      .stroke({ color: p.color, width: p.width, alpha: p.alpha });
    g.x = Math.random() * (w + 200) - 100;
    g.y = -p.len;
    g.vx = p.vx + (Math.random() - 0.5) * 30;
    g.vy = p.vy + (Math.random() - 0.5) * 100;
    g.kind = 'streak';
    g.len = p.len;
    this.particleLayer.addChild(g);
    this.particles.push(g);
  }

  _spawnFlake(p) {
    const w = this.app.screen.width;
    const radius = 1.6 + Math.random() * 2.6;
    const g = new Graphics().circle(0, 0, radius).fill({ color: p.color, alpha: p.alpha });
    g.x = Math.random() * (w + 200) - 100;
    g.y = -10;
    g.vx = p.vx + (Math.random() - 0.5) * 12;
    g.vy = p.vy + (Math.random() - 0.5) * 20;
    g.kind = 'flake';
    g.phase = Math.random() * Math.PI * 2;
    g.driftFreq = 0.4 + Math.random() * 0.7;
    g.driftAmp = 18 + Math.random() * 24;
    g.baseAlpha = p.alpha;
    g.dying = false;
    g.life = 0;
    this.particleLayer.addChild(g);
    this.particles.push(g);
  }

  _updateParticles(dt) {
    const rects = getAllRects();
    const h = this.app.screen.height;
    const now = performance.now() / 1000;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.kind === 'splash') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += GRAVITY * dt;
        p.life -= dt;
        p.alpha = Math.max(0, p.life / SPLASH_LIFE);
        if (p.life <= 0) this._removeParticle(i);
        continue;
      }

      if (p.kind === 'streak') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      } else {
        // flake
        const swing = Math.sin(now * p.driftFreq * Math.PI * 2 + p.phase) * p.driftAmp;
        p.x += (p.vx + swing) * dt;
        p.y += p.vy * dt;
      }

      // Soft-dying flakes: fade and remove.
      if (p.dying) {
        p.life -= dt;
        p.alpha = Math.max(0, (p.life / FLAKE_FADE) * p.baseAlpha);
        if (p.life <= 0) this._removeParticle(i);
        continue;
      }

      let hit = null;
      for (const r of rects) {
        const top = r.top;
        if (
          p.x >= r.left &&
          p.x <= r.right &&
          p.y + (p.kind === 'streak' ? p.len : 4) >= top &&
          p.y <= top + 8
        ) {
          hit = r;
          break;
        }
      }

      if (hit) {
        if (p.kind === 'streak') {
          this._spawnSplash(p.x, hit.top);
          this._removeParticle(i);
        } else {
          // Flakes settle softly — no splash, just a brief fade.
          p.dying = true;
          p.life = FLAKE_FADE;
          p.vx = 0;
          p.vy = 0;
        }
      } else if (p.y > h) {
        if (p.kind === 'streak' && Math.random() < 0.4) this._spawnSplash(p.x, h - 2);
        this._removeParticle(i);
      }
    }
  }

  _removeParticle(i) {
    const p = this.particles[i];
    this.particleLayer.removeChild(p);
    p.destroy();
    this.particles.splice(i, 1);
  }

  _spawnSplash(x, y) {
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const s = new Graphics().circle(0, 0, 1.2).fill({ color: SPLASH_COLOR, alpha: 0.85 });
      s.x = x;
      s.y = y;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 90 + Math.random() * 90;
      s.vx = Math.cos(ang) * speed;
      s.vy = Math.sin(ang) * speed;
      s.life = SPLASH_LIFE;
      s.kind = 'splash';
      this.particleLayer.addChild(s);
      this.particles.push(s);
    }
  }

  // ─── Lightning ────────────────────────────────────────────────────────────
  _tickLightning(dt) {
    const stormy = this._config().lightning;

    if (!stormy) {
      if (this._currentFlash > 0) {
        this._currentFlash = Math.max(0, this._currentFlash - dt * 4);
        this.onFlash(this._currentFlash);
      }
      return;
    }

    if (this._currentFlash > 0) {
      this._currentFlash = Math.max(0, this._currentFlash - dt * 3.5);
    }

    const now = performance.now() / 1000;

    while (this._strikeQueue.length && this._strikeQueue[0].at <= now) {
      const next = this._strikeQueue.shift();
      this._currentFlash = Math.max(this._currentFlash, next.alpha);
    }

    if (this._strikeQueue.length === 0 && now >= this._nextStrikeAt) {
      const t = now;
      // Multi-pulse strike: faint leader → quick dim → bright return.
      this._strikeQueue.push({ at: t + 0.00, alpha: 0.55 });
      this._strikeQueue.push({ at: t + 0.08, alpha: 0.30 });
      this._strikeQueue.push({ at: t + 0.18, alpha: 0.95 });

      // Schedule the matching thunder. Closer strikes (shorter delay) shake
      // harder and roll a hair longer.
      const delay = THUNDER_DELAY_MIN + Math.random() * (THUNDER_DELAY_MAX - THUNDER_DELAY_MIN);
      const closeness = 1 - (delay - THUNDER_DELAY_MIN) / (THUNDER_DELAY_MAX - THUNDER_DELAY_MIN);
      const intensity = 0.35 + closeness * 0.65;
      const duration  = 0.7 + closeness * 0.6;
      this._thunderQueue.push({ at: t + delay, intensity, duration });

      const gap = STRIKE_INTERVAL_MIN + Math.random() * (STRIKE_INTERVAL_MAX - STRIKE_INTERVAL_MIN);
      this._nextStrikeAt = t + gap;
    }

    this.onFlash(this._currentFlash);
  }

  // ─── Thunder (screen shake) ───────────────────────────────────────────────
  _tickThunder(dt) {
    const now = performance.now() / 1000;

    while (this._thunderQueue.length && this._thunderQueue[0].at <= now) {
      const t = this._thunderQueue.shift();
      this._activeShake = { startedAt: now, duration: t.duration, intensity: t.intensity };
    }

    if (!this._activeShake) {
      this.onShake(0, 0);
      return;
    }

    const t = now - this._activeShake.startedAt;
    if (t >= this._activeShake.duration) {
      this._activeShake = null;
      this.onShake(0, 0);
      return;
    }

    // Quadratic decay → strong initial slam, fast settle.
    const linearDecay = 1 - t / this._activeShake.duration;
    const decay = linearDecay * linearDecay;
    const peak = this._activeShake.intensity * 14;

    const fx = 22, fy = 28;
    const x = Math.sin(t * fx * Math.PI * 2) * peak * decay
            + (Math.random() - 0.5) * peak * decay * 0.4;
    const y = Math.cos(t * fy * Math.PI * 2) * peak * decay * 0.7
            + (Math.random() - 0.5) * peak * decay * 0.3;

    this.onShake(x, y);
  }

  destroy() {
    this.app.ticker.remove(this._tick);
    this.app.destroy(true, { children: true });
  }
}

// Build a fluffy cloud from overlapping white lobes inside a Container, then
// blur the whole thing. Container alpha is what we cross-fade — never the
// per-lobe alpha — so transitions stay smooth.
function makeCloud() {
  const c = new Container();
  const lobes = 7 + Math.floor(Math.random() * 5);
  const baseR = 40 + Math.random() * 35;
  const spread = 130 + Math.random() * 120;

  for (let i = 0; i < lobes; i++) {
    const r = baseR * (0.6 + Math.random() * 0.7);
    const x = (i / Math.max(1, lobes - 1) - 0.5) * spread;
    const y = (Math.random() - 0.5) * baseR * 0.6;
    const lobe = new Graphics().circle(0, 0, r).fill({ color: 0xffffff });
    lobe.x = x;
    lobe.y = y;
    c.addChild(lobe);
  }

  c.filters = [new BlurFilter({ strength: 18, quality: 4 })];

  return {
    container: c,
    halfWidth: spread / 2 + baseR,
    baseSpeed: 0.4 + Math.random() * 0.6,
  };
}
