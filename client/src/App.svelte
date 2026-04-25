<script>
  import { onMount, onDestroy } from 'svelte';
  import Clock from './widgets/topbar/Clock.svelte';
  import WeatherSummary from './widgets/topbar/WeatherSummary.svelte';
  import CalendarSlide from './widgets/slides/CalendarSlide.svelte';
  import LaunchesSlide from './widgets/slides/LaunchesSlide.svelte';
  import FlightsSlide from './widgets/slides/FlightsSlide.svelte';
  import { rotation, startRotation, stopRotation, nextSlide, prevSlide } from './lib/rotation.svelte.js';
  import { applyPalette } from './lib/palettes.js';

  function onWeather(data) {
    const kind = data?.condition?.kind ?? 'clear';
    const isDay = data?.isDay ?? true;
    applyPalette(kind, isDay);
  }

  function handleKeydown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); nextSlide(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
  }

  onMount(() => {
    startRotation();
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    stopRotation();
    window.removeEventListener('keydown', handleKeydown);
  });

  let activeSlide = $derived(rotation.slides[rotation.index].id);
</script>

<main
  class="screen"
  class:quiet={rotation.quiet}
>
  <header class="topbar">
    <Clock />
    <WeatherSummary {onWeather} />
    <a href="/admin/" target="_blank" class="admin-link" aria-label="Admin">⚙</a>
  </header>

  <section class="stage">
    <button class="nav nav-left" onclick={prevSlide} aria-label="Previous slide">&#8249;</button>
    {#key activeSlide}
      {#if activeSlide === 'calendar'}
        <CalendarSlide />
      {:else if activeSlide === 'launches'}
        <LaunchesSlide />
      {:else if activeSlide === 'flights'}
        <FlightsSlide />
      {/if}
    {/key}
    <button class="nav nav-right" onclick={nextSlide} aria-label="Next slide">&#8250;</button>
  </section>
</main>

<style>
  .screen {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-rows: var(--topbar-height) 1fr;
    padding: var(--stage-padding);
    gap: var(--stage-padding);
  }

  .topbar {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 48px;
  }

  .admin-link {
    font-size: 1.8rem;
    color: var(--text-tertiary);
    opacity: 0.5;
    text-decoration: none;
    transition: opacity 200ms ease;
  }
  .admin-link:hover { opacity: 0.8; }

  .stage {
    min-height: 0;
    display: flex;
    position: relative;
    align-items: stretch;
  }

  .nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 3;
    background: var(--surface-bg, rgba(255, 255, 255, 0.08));
    border: 1px solid var(--surface-border, rgba(255, 255, 255, 0.12));
    color: var(--text-secondary, rgba(255, 255, 255, 0.6));
    font-size: 2rem;
    width: 44px;
    height: 64px;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.4;
    transition: opacity 200ms ease, background 200ms ease;
    backdrop-filter: blur(3px);
  }
  .nav:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.14);
  }
  .nav-left { left: 12px; }
  .nav-right { right: 12px; }

  /* Quiet hours: dim everything, slow motion. WeatherFx handles its own
     dimming via setDimmed; this class is for the DOM layer. */
  .screen.quiet {
    filter: brightness(0.55) saturate(0.85);
    transition: filter 1200ms var(--ease-soft);
  }
</style>
