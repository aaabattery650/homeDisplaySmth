<script>
  import { onMount, onDestroy } from 'svelte';
  import Slide from './Slide.svelte';
  import FlightMap from './FlightMap.svelte';
  import { fetchFlights, HOME_LAT, HOME_LON } from '../../lib/api.js';

  /** ~85 km full width; frames most of the area; tune for your site */
  const HALF_SPAN_DEG = 0.09;
  const MAX_MARKERS = 40;
  const POLL_MS = 5000;

  function distKey(lat, lon) {
    const dlat = lat - HOME_LAT;
    const dlon = (lon - HOME_LON) * Math.cos((HOME_LAT * Math.PI) / 180);
    return dlat * dlat + dlon * dlon;
  }

  /** URL-only: ?flights=demo — wire layout without a receiver. */
  function wantDemo() {
    if (typeof location === 'undefined') return false;
    return new URLSearchParams(location.search).get('flights') === 'demo';
  }

  function demoAircraft() {
    const s = 0.11;
    return [
      { hex: 'demo-1', callsign: 'DEMO1', lat: HOME_LAT + s * 0.55, lon: HOME_LON - s * 0.35, track: 35, altFt: 12500 },
      { hex: 'demo-2', callsign: 'DEMO2', lat: HOME_LAT - s * 0.4, lon: HOME_LON + s * 0.45, track: 198, altFt: 8200 },
      { hex: 'demo-3', callsign: 'DEMO3', lat: HOME_LAT + s * 0.2, lon: HOME_LON + s * 0.3, track: 300, altFt: 17600 },
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

  async function load() {
    if (wantDemo()) {
      rows = demoAircraft();
      source = 'demo';
      detail = 'Demo layout — remove ?flights=demo from the URL for live data';
      return;
    }
    try {
      const r = await fetchFlights();
      const raw = r.aircraft ?? [];
      const list = pickForMap(raw);
      rows = list;
      source = r.source ?? '';

      if (r.source === 'disabled') {
        detail = 'Flights disabled (FLIGHTS_PROVIDER=off or FLIGHTS_DATA_URL=off on the server).';
      } else if (r.source === 'error') {
        if (r.dataSource === 'opensky' && r.errorKind === 'rate') {
          detail =
            'OpenSky rate or daily limit — wait, raise OPENSKY_CACHE_MS, or set OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET in server/.env';
        } else if (r.dataSource === 'opensky') {
          detail =
            'OpenSky could not be reached. Check outbound HTTPS; optional OPENSKY_CLIENT_ID + OPENSKY_CLIENT_SECRET in server/.env for OAuth.';
        } else if (r.dataSource === 'local' && r.error) {
          detail = String(r.error);
        } else {
          detail =
            'Local JSON feed failed. Set FLIGHTS_DATA_URL in server/.env or use OpenSky (unset FLIGHTS_DATA_URL, default).';
        }
      } else if (raw.length === 0) {
        detail =
          r.dataSource === 'opensky'
            ? 'No ADS-B in this map area from OpenSky (quiet, or no coverage this cycle).'
            : 'No aircraft with a position in this update.';
      } else {
        const base = `showing ${list.length} of ${raw.length} (nearest to home)`;
        detail =
          r.dataSource === 'opensky'
            ? `OpenSky${r.cached ? ' (cached on server' + (r.opensky?.fetchedAt ? ' · ' + r.opensky.fetchedAt : '') + ')' : ''} · ${base}`
            : `Local feed · ${base}`;
      }
    } catch {
      rows = [];
      source = 'error';
      detail = 'Request failed. Is the app server (Fastify) running on the proxy port?';
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

<Slide eyebrow="Overhead now" title="Above the house">
  <div class="body">
    <FlightMap
      centerLat={HOME_LAT}
      centerLon={HOME_LON}
      halfSpanDeg={HALF_SPAN_DEG}
      aircraft={rows}
    />
    <p class="foot tabular" class:warn={source === 'error' || source === 'disabled'}>
      {detail}
    </p>
  </div>
</Slide>

<style>
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .foot {
    margin: 0;
    font-size: var(--fs-small);
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }
  .foot.warn {
    color: var(--text-secondary);
  }
</style>
