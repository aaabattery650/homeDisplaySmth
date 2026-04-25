<script>
  import { onMount, onDestroy } from 'svelte';
  import Clock from './widgets/topbar/Clock.svelte';
  import WeatherSummary from './widgets/topbar/WeatherSummary.svelte';
  import CalendarSlide from './widgets/slides/CalendarSlide.svelte';
  import LaunchesSlide from './widgets/slides/LaunchesSlide.svelte';
  import FlightsSlide from './widgets/slides/FlightsSlide.svelte';
  import { rotation, startRotation, stopRotation } from './lib/rotation.svelte.js';
  import { WeatherFx } from './lib/weatherFx/WeatherFx.js';

  let bgEl;
  let fx;
  let flashAlpha = $state(0);
  let shakeX = $state(0);
  let shakeY = $state(0);

  // URL aliases so memorable values still work in dev. The canonical kinds
  // mirror Open-Meteo's WMO categories.
  const ALIASES = {
    sunny: 'clear',
    cloudy: 'overcast',
    storm: 'thunderstorm',
    thunder: 'thunderstorm',
    1: 'rain',
    on: 'rain',
    0: 'clear',
    off: 'clear',
  };

  // Accepts ?weather=<kind> (preferred) or legacy ?rain=<kind>.
  function devOverride() {
    const p = new URLSearchParams(location.search);
    const raw = p.get('weather') ?? p.get('rain');
    if (raw == null) return null;
    if (raw === '') return 'rain';
    return ALIASES[raw] ?? raw;
  }

  function onWeather(data) {
    const override = devOverride();
    fx?.setWeather(override ?? data?.condition?.kind ?? 'clear');
  }

  onMount(async () => {
    fx = new WeatherFx(bgEl, {
      onFlash: (a) => (flashAlpha = a),
      onShake: (x, y) => { shakeX = x; shakeY = y; },
    });
    await fx.init();
    // Use override at boot if present, otherwise hold on 'clear' until the
    // real weather lands.
    fx.setWeather(devOverride() ?? 'clear');
    startRotation();
  });

  onDestroy(() => {
    stopRotation();
    fx?.destroy();
  });

  let activeSlide = $derived(rotation.slides[rotation.index].id);
</script>

<div class="bg" bind:this={bgEl}></div>

<div class="lightning" style="opacity: {flashAlpha}"></div>

<main
  class="screen"
  class:quiet={rotation.quiet}
  style="transform: translate3d({shakeX}px, {shakeY}px, 0)"
>
  <header class="topbar">
    <Clock />
    <WeatherSummary {onWeather} />
  </header>

  <section class="stage">
    {#key activeSlide}
      {#if activeSlide === 'calendar'}
        <CalendarSlide />
      {:else if activeSlide === 'launches'}
        <LaunchesSlide />
      {:else if activeSlide === 'flights'}
        <FlightsSlide />
      {/if}
    {/key}
  </section>
</main>

<style>
  .bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  /* Lightning flash sits above all widgets so a strike illuminates the whole
     screen, not just gaps between cards. mix-blend-mode: screen keeps the
     gradient additive, so the flash brightens rather than overwrites. */
  .lightning {
    position: fixed;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 35% 15%,
        rgba(232, 240, 255, 0.95) 0%,
        rgba(180, 210, 255, 0.55) 35%,
        rgba(100, 140, 200, 0.15) 70%,
        transparent 100%);
    mix-blend-mode: screen;
    will-change: opacity;
  }

  .screen {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-rows: var(--topbar-height) 1fr;
    padding: var(--stage-padding);
    gap: var(--stage-padding);
    will-change: transform;
  }

  .topbar {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 48px;
  }

  .stage {
    min-height: 0;
    display: flex;
  }

  /* Quiet hours: dim everything, slow motion. WeatherFx handles its own
     dimming via setDimmed; this class is for the DOM layer. */
  .screen.quiet {
    filter: brightness(0.55) saturate(0.85);
    transition: filter 1200ms var(--ease-soft);
  }
</style>
