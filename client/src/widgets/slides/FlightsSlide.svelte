<script>
  import { onMount, onDestroy } from 'svelte';
  import Slide from './Slide.svelte';
  import FlightMap from './FlightMap.svelte';
  import { fetchFlights, HOME_LAT, HOME_LON } from '../../lib/api.js';

  const HALF_SPAN_DEG = 0.09;
  const MAX_MARKERS = 40;
  const POLL_MS = 5000;

  function distKey(lat, lon) {
    const dlat = lat - HOME_LAT;
    const dlon = (lon - HOME_LON) * Math.cos((HOME_LAT * Math.PI) / 180);
    return dlat * dlat + dlon * dlon;
  }

  function wantDemo() {
    if (typeof location === 'undefined') return false;
    return new URLSearchParams(location.search).get('flights') === 'demo';
  }

  function demoAircraft() {
    const s = 0.06;
    return [
      { hex: 'demo-1', callsign: 'SIA321', lat: HOME_LAT + s * 0.55, lon: HOME_LON - s * 0.35, track: 35, altFt: 35100, velocity: 245, verticalRate: 2.5, typecode: 'B77W', originCountry: 'Singapore' },
      { hex: 'demo-2', callsign: 'CPA987', lat: HOME_LAT - s * 0.4, lon: HOME_LON + s * 0.45, track: 198, altFt: 38000, velocity: 251, verticalRate: 0, typecode: 'A359', originCountry: 'China' },
      { hex: 'demo-3', callsign: 'JSA411', lat: HOME_LAT + s * 0.2, lon: HOME_LON + s * 0.3, track: 300, altFt: 12400, velocity: 180, verticalRate: -4.2, typecode: 'B738', originCountry: 'Japan' },
    ];
  }

  function pickForMap(list) {
    return [...list]
      .sort((a, b) => distKey(a.lat, a.lon) - distKey(b.lat, b.lon))
      .slice(0, MAX_MARKERS);
  }

  let rows = $state([]);
  let detail = $state('loading');
  let source = $state('');
  let timer;

  function verticalIcon(vr) {
    if (vr == null || Math.abs(vr) < 0.5) return '→';
    return vr > 0 ? '↗' : '↘';
  }

  function fmtAlt(ft) {
    if (ft == null) return '—';
    return ft.toLocaleString() + ' ft';
  }

  function fmtCountry(c) {
    if (!c) return '—';
    return c;
  }

  async function load() {
    if (wantDemo()) {
      rows = demoAircraft();
      source = 'demo';
      detail = `${rows.length} flights · demo`;
      return;
    }
    try {
      const r = await fetchFlights();
      const raw = r.aircraft ?? [];
      const list = pickForMap(raw);
      rows = list;
      source = r.source ?? '';

      if (r.source === 'disabled') {
        detail = 'Flights disabled';
      } else if (r.source === 'error') {
        detail = 'Feed error — check server logs';
      } else if (raw.length === 0) {
        detail = 'No aircraft overhead';
      } else {
        detail = `${list.length} flight${list.length === 1 ? '' : 's'} tracked`;
      }
    } catch {
      rows = [];
      source = 'error';
      detail = 'Server unreachable';
    }
  }

  onMount(() => {
    load();
    timer = setInterval(load, POLL_MS);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<Slide title="Overhead now">
  <div class="split">
    <div class="table-side">
      {#if rows.length === 0}
        <p class="empty">{detail}</p>
      {:else}
        <table class="flights-table">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Origin</th>
              <th></th>
              <th>Altitude</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {#each rows.slice(0, 10) as ac}
              <tr>
                <td class="callsign">{ac.callsign}</td>
                <td class="origin">{fmtCountry(ac.originCountry)}</td>
                <td class="vr">{verticalIcon(ac.verticalRate)}</td>
                <td class="alt tabular">{fmtAlt(ac.altFt)}</td>
                <td class="type">{ac.typecode ?? '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="foot tabular">{detail}</p>
      {/if}
    </div>
    <div class="map-side">
      <FlightMap
        centerLat={HOME_LAT}
        centerLon={HOME_LON}
        halfSpanDeg={HALF_SPAN_DEG}
        aircraft={rows}
      />
    </div>
  </div>
</Slide>

<style>
  .split {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 285px;
    gap: 24px;
  }

  .table-side {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }

  .map-side {
    height: 285px;
    width: 285px;
    align-self: start;
    border-radius: var(--radius-card, 16px);
    overflow: hidden;
  }

  .flights-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fs-body, 1.125rem);
  }
  thead th {
    text-align: left;
    font-size: var(--fs-small, 0.95rem);
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 0 12px 12px 0;
    white-space: nowrap;
  }
  tbody tr {
    border-top: 1px solid var(--surface-border, rgba(255,255,255,0.1));
  }
  tbody td {
    padding: 12px 12px 12px 0;
    white-space: nowrap;
  }

  .callsign {
    font-family: var(--font-mono);
    font-size: var(--fs-medium, 1.375rem);
    font-weight: 500;
    color: var(--accent-warm);
  }
  .origin {
    font-size: var(--fs-body);
    color: #6fcf97;
  }
  .vr {
    font-size: var(--fs-medium);
    color: var(--text-secondary);
    text-align: center;
    width: 30px;
  }
  .alt {
    font-size: var(--fs-body);
    color: var(--text-primary);
  }
  .type {
    font-family: var(--font-mono);
    font-size: var(--fs-small);
    color: var(--text-secondary);
  }

  .foot {
    margin-top: auto;
    padding-top: 12px;
    font-size: var(--fs-small);
    color: var(--text-tertiary);
  }
  .empty {
    font-size: var(--fs-medium);
    color: var(--text-secondary);
    margin: auto 0;
  }
</style>
