<script>
  import { onMount, onDestroy } from 'svelte';
  import Slide from './Slide.svelte';
  import { fetchLaunches } from '../../lib/api.js';

  let launches = $state([]);
  let error = $state(null);
  let now = $state(Date.now());
  let pollTimer;
  let tickTimer;

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
    tickTimer = setInterval(() => { now = Date.now(); }, 1000);
  });

  onDestroy(() => {
    clearInterval(pollTimer);
    clearInterval(tickTimer);
  });

  function countdown(net) {
    if (!net) return { text: 'TBD', urgent: false, past: false };
    const diffMs = new Date(net) - now;
    if (diffMs < 0) return { text: 'Launched', urgent: false, past: true };

    const totalSec = Math.floor(diffMs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    const urgent = diffMs < 24 * 3_600_000;
    const pad = (n) => String(n).padStart(2, '0');

    if (d > 0) return { text: `T-${d}d ${h}h ${pad(m)}m`, urgent, past: false };
    return { text: `T-${h}:${pad(m)}:${pad(s)}`, urgent, past: false };
  }

  function shortProvider(name) {
    const map = {
      'China Aerospace Science and Technology Corporation': 'CASC',
      'Russian Federal Space Agency (ROSCOSMOS)': 'Roscosmos',
      'Indian Space Research Organization': 'ISRO',
      'Japan Aerospace Exploration Agency': 'JAXA',
      'Korea Aerospace Research Institute': 'KARI',
    };
    return map[name] ?? name;
  }

  function missionLine(l) {
    const parts = [];
    if (l.orbit && l.orbit !== 'N/A') parts.push(l.orbit);
    if (l.missionType && l.missionType !== 'Unknown') parts.push(l.missionType);
    return parts.join(' · ');
  }

  function shortPad(pad) {
    // Strip overly long location suffixes
    return pad
      .replace(/, People's Republic of China$/, ', China')
      .replace(/, United States of America$/, ', USA')
      .replace(/, Russian Federation$/, ', Russia')
      .replace(/, Republic of$/, '')
      .replace(/Satellite Launch Center, /, '')
      .replace(/Space Launch Complex /, 'SLC-');
  }
</script>

<Slide title="Up & away">
  {#if error}
    <div class="err">Launch data offline</div>
  {:else if launches.length === 0}
    <div class="loading">Loading…</div>
  {:else}
    <ul class="launches">
      {#each launches.slice(0, 5) as l}
        {@const cd = countdown(l.net)}
        <li class="launch">
          {#if l.image}
            <div class="img-wrap">
              <img src={l.image} alt="" class="rocket-img" />
            </div>
          {/if}
          <div class="info">
            <div class="top-row">
              <span class="provider">{shortProvider(l.provider)}{#if l.providerCountryCode} <span class="country">{l.providerCountryCode}</span>{/if}</span>
              <span class="countdown tabular" class:urgent={cd.urgent} class:past={cd.past}>
                {cd.text}
              </span>
            </div>
            <div class="rocket-name">{l.rocket ?? l.name.split('|')[0].trim()}</div>
            <div class="mission">{l.mission ?? ''}</div>
            <div class="meta">
              <span>{shortPad(l.pad)}</span>
              {#if missionLine(l)}
                <span class="dot">·</span>
                <span>{missionLine(l)}</span>
              {/if}
            </div>
          </div>
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
    gap: 0;
  }
  .launch {
    display: flex;
    gap: 16px;
    padding: 10px 0;
    border-top: 1px solid var(--surface-border);
    align-items: center;
  }
  .launch:first-child { border-top: none; }

  .img-wrap {
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.05);
  }
  .rocket-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .provider {
    font-size: var(--fs-small);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--accent-warm);
    font-weight: 600;
  }
  .country {
    color: var(--text-tertiary);
    font-weight: 400;
    letter-spacing: 0.08em;
  }
  .countdown {
    font-family: var(--font-mono);
    font-size: var(--fs-body);
    color: var(--accent-cool);
    font-weight: 500;
  }
  .countdown.urgent {
    color: #ffb347;
    text-shadow: 0 0 12px rgba(255, 179, 71, 0.35);
  }
  .countdown.past {
    color: var(--text-tertiary);
    opacity: 0.7;
  }
  .rocket-name {
    font-size: var(--fs-medium);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mission {
    font-size: var(--fs-small);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    display: flex;
    gap: 8px;
    font-size: var(--fs-small);
    color: var(--text-tertiary);
  }
  .dot { color: var(--text-tertiary); opacity: 0.5; }
  .err, .loading {
    font-size: var(--fs-medium);
    color: var(--text-secondary);
  }
</style>
