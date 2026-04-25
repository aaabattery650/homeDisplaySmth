// Default: OpenSky Network REST API (no antenna). Optional: local readsb/FR24 JSON via FLIGHTS_DATA_URL.
import { getOpenSkyAircraft } from '../lib/opensky.js';

const DEFAULT_TIMEOUT_MS = 8000;

function isFr24StyleRow(v) {
  return (
    Array.isArray(v) &&
    v.length >= 5 &&
    Number.isFinite(Number(v[1])) &&
    Number.isFinite(Number(v[2]))
  );
}

function fromFr24Row(arr) {
  if (!isFr24StyleRow(arr)) return null;
  return {
    hex: arr[0] != null ? String(arr[0]) : undefined,
    flight: arr[16] != null ? String(arr[16]).trim() : '',
    lat: Number(arr[1]),
    lon: Number(arr[2]),
    track: arr[3],
    alt_baro: arr[4],
  };
}

function extractAircraftList(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.aircraft)) return data.aircraft;
  if (Array.isArray(data.Aircraft)) return data.Aircraft;

  if (typeof data === 'object' && !Array.isArray(data)) {
    const values = Object.values(data);
    const frRows = values.filter((v) => isFr24StyleRow(v));
    if (frRows.length) {
      return frRows.map(fromFr24Row).filter(Boolean);
    }
  }
  return [];
}

function normalizeAircraft(raw) {
  const out = [];
  for (const a of raw) {
    if (a == null) continue;
    if (a.lat == null || a.lon == null) continue;
    if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;

    const trackRaw = a.track ?? a.heading ?? a.mag_heading ?? a.true_heading ?? a.nav_heading;
    const track = Number.isFinite(trackRaw) ? ((Number(trackRaw) % 360) + 360) % 360 : 0;

    const flight = a.flight != null ? String(a.flight) : '';
    const callsign =
      flight.trim() || (a.r != null ? String(a.r).trim() : '') || (a.reg != null ? String(a.reg) : '') || (a.hex != null ? String(a.hex) : '—');

    const alt = a.alt_baro ?? a.alt_geom ?? a.geom_alt ?? a.altitude ?? a.alt;
    const altNum = typeof alt === 'number' && Number.isFinite(alt) ? alt : alt === 'ground' ? 0 : null;

    out.push({
      hex: a.hex != null ? String(a.hex) : undefined,
      callsign,
      lat: a.lat,
      lon: a.lon,
      track,
      altFt: altNum,
    });
  }
  return out;
}

/**
 * @param {string} url
 * @param {import('fastify').FastifyInstance} app
 */
async function getLocalAircraft(url, app) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      app.log.warn({ status: res.status, url }, 'local flights HTTP error');
      return { aircraft: [], source: 'error', dataSource: 'local' };
    }
    const data = await res.json();
    const list = extractAircraftList(data);
    return { aircraft: normalizeAircraft(list), source: 'feed', dataSource: 'local' };
  } catch (err) {
    app.log.warn({ err, url }, 'local flights feed failed');
    return { aircraft: [], source: 'error', dataSource: 'local' };
  }
}

/**
 * @param {import('fastify').FastifyInstance} app
 */
function resolveFlightsMode() {
  const p = (process.env.FLIGHTS_PROVIDER || '').toLowerCase();
  const u = (process.env.FLIGHTS_DATA_URL || '').trim();

  if (p === 'off' || p === 'disabled') return { type: 'off' };
  if (u === 'off' || u === 'false') return { type: 'off' };

  if (p === 'opensky' || p === 'api' || p === 'network') {
    return { type: 'opensky' };
  }
  if (p === 'local' || p === 'file' || p === 'antenna') {
    if (!u) return { type: 'local_missing' };
    return { type: 'local', url: u };
  }
  if (u) {
    return { type: 'local', url: u };
  }
  return { type: 'opensky' };
}

export async function flightsRoute(app) {
  app.get('/flights', async () => {
    const mode = resolveFlightsMode();
    if (mode.type === 'off') {
      return { aircraft: [], source: 'disabled' };
    }
    if (mode.type === 'local_missing') {
      return {
        aircraft: [],
        source: 'error',
        dataSource: 'local',
        error: 'Set FLIGHTS_DATA_URL to your readsb/FR24 JSON URL, or set FLIGHTS_PROVIDER=opensky',
      };
    }
    if (mode.type === 'local') {
      return getLocalAircraft(mode.url, app);
    }
    return getOpenSkyAircraft(app);
  });
}
