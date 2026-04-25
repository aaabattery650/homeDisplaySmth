<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchWeather } from '../../lib/api.js';
  import { registerRect } from '../../lib/weatherFx/collision.js';

  let { onWeather } = $props();

  let data = $state(null);
  let error = $state(null);
  let cardEl;
  let unregister;
  let pollTimer;

  async function load() {
    try {
      data = await fetchWeather();
      error = null;
      onWeather?.(data);
    } catch (e) {
      error = String(e);
    }
  }

  onMount(() => {
    load();
    pollTimer = setInterval(load, 10 * 60 * 1000);
    unregister = registerRect(() => cardEl?.getBoundingClientRect());
  });

  onDestroy(() => {
    clearInterval(pollTimer);
    unregister?.();
  });

  function tempStr(c) {
    if (c == null) return '—';
    return `${Math.round(c)}°`;
  }
</script>

<section bind:this={cardEl} class="weather glass">
  {#if error}
    <div class="err">Weather offline</div>
  {:else if !data}
    <div class="loading">Loading…</div>
  {:else}
    <div class="primary">
      <div class="temp tabular">{tempStr(data.tempC)}</div>
      <div class="meta">
        <div class="condition">{data.condition.label}</div>
        <div class="hilo tabular">
          <span>H {tempStr(data.today?.maxC)}</span>
          <span class="dot">·</span>
          <span>L {tempStr(data.today?.minC)}</span>
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .weather {
    display: flex;
    align-items: center;
    padding: 22px 30px;
    min-width: 320px;
  }
  .primary {
    display: flex;
    align-items: baseline;
    gap: 22px;
    width: 100%;
  }
  .temp {
    font-family: var(--font-display);
    font-size: 4.5rem;
    font-weight: 500;
    line-height: 1;
    color: var(--text-primary);
  }
  .meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .condition {
    font-size: var(--fs-medium);
    color: var(--text-primary);
    font-weight: 500;
  }
  .hilo {
    font-size: var(--fs-small);
    color: var(--text-secondary);
    display: flex;
    gap: 8px;
  }
  .dot { color: var(--text-tertiary); }
  .loading, .err {
    font-size: var(--fs-medium);
    color: var(--text-secondary);
  }
</style>
