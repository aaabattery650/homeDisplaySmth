<script>
  import { onMount, onDestroy } from 'svelte';
  import Slide from './Slide.svelte';
  import { fetchLaunches } from '../../lib/api.js';

  let launches = $state([]);
  let error = $state(null);
  let pollTimer;

  async function load() {
    try {
      launches = await fetchLaunches();
      error = null;
    } catch (e) {
      error = String(e);
    }
  }

  onMount(() => {
    load();
    pollTimer = setInterval(load, 15 * 60 * 1000);
  });

  onDestroy(() => clearInterval(pollTimer));

  function formatWhen(net) {
    if (!net) return 'TBD';
    const d = new Date(net);
    const now = new Date();
    const diffMs = d - now;
    const diffH = diffMs / 3_600_000;

    if (diffH < 0) return 'Launched';
    if (diffH < 1) return `T-${Math.ceil(diffMs / 60_000)} min`;
    if (diffH < 24) return `Today · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    if (diffH < 48) return `Tomorrow · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' +
           d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
</script>

<Slide eyebrow="Upcoming launches" title="Up & away">
  {#if error}
    <div class="err">Launch data offline</div>
  {:else if launches.length === 0}
    <div class="loading">Loading…</div>
  {:else}
    <ul class="launches">
      {#each launches as l}
        <li class="launch">
          <div class="head">
            <div class="provider">{l.provider}</div>
            <div class="when tabular">{formatWhen(l.net)}</div>
          </div>
          <div class="name">{l.name}</div>
          <div class="pad">{l.pad}</div>
        </li>
      {/each}
    </ul>
  {/if}
</Slide>

<style>
  .launches {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .launch {
    padding: 22px 0;
    border-top: 1px solid var(--surface-border);
  }
  .launch:first-child { border-top: none; }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .provider {
    font-size: var(--fs-small);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--accent-warm);
    font-weight: 600;
  }
  .when {
    font-size: var(--fs-medium);
    color: var(--accent-cool);
  }
  .name {
    font-size: var(--fs-large);
    font-weight: 500;
    color: var(--text-primary);
  }
  .pad {
    margin-top: 4px;
    color: var(--text-secondary);
  }
  .err, .loading {
    font-size: var(--fs-medium);
    color: var(--text-secondary);
  }
</style>
