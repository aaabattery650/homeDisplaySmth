// OpenSky Network: https://openskynetwork.github.io/opensky-api/rest.html
// Anonymous: credit budget per day; we cache to avoid burning credits on 5s client polls.
// Optional OAuth2: OPENSKY_CLIENT_ID + OPENSKY_CLIENT_SECRET (higher daily allowance).
const OPENSKY_API = 'https://opensky-network.org/api';
const OPENSKY_TOKEN = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

/** Bbox around map center; defaults: Singapore. */
const centerLat = () => Number(process.env.FLIGHTS_CENTER_LAT ?? 1.3521);
const centerLon = () => Number(process.env.FLIGHTS_CENTER_LON ?? 103.8198);
const halfDeg = () => Number(process.env.FLIGHTS_BBOX_HALF_DEG ?? 0.24);

const cacheMs = () => Number(process.env.OPENSKY_CACHE_MS ?? 180_000);

let token = { value: null, exp: 0 };

let dataCache = {
  at: 0,
  aircraft: [],
  err: null,
  httpStatus: 0,
};

/**
 * @param {import('fastify').FastifyInstance['log']} log
 */
function stateToAircraft(s) {
  if (!s || s.length < 7) return null;
  const lon = s[5];
  const lat = s[6];
  if (lat == null || lon == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const hex = s[0] != null ? String(s[0]) : null;
  const rawCs = s[1] != null ? String(s[1]).trim() : '';
  const callsign = rawCs || hex || '—';
  const baroM = s[7];
  const tr = s[10];
  const altFt =
    baroM != null && Number.isFinite(baroM) ? Math.round(baroM * 3.28084) : null;
  const track =
    tr != null && Number.isFinite(tr) ? ((Number(tr) % 360) + 360) % 360 : 0;
  return {
    hex: hex || undefined,
    callsign,
    lat: Number(lat),
    lon: Number(lon),
    track,
    altFt,
  };
}

function bboxParams() {
  const la = centerLat();
  const lo = centerLon();
  const h = halfDeg();
  return {
    lamin: la - h,
    lamax: la + h,
    lomin: lo - h,
    lomax: lo + h,
  };
}

async function getBearer() {
  const id = process.env.OPENSKY_CLIENT_ID;
  const sec = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !sec) return null;
  const now = Date.now() / 1000;
  if (token.value && token.exp > now + 60) {
    return token.value;
  }
  const res = await fetch(OPENSKY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: id,
      client_secret: sec,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    return null;
  }
  const j = await res.json();
  const expIn = j.expires_in ?? 1800;
  token = { value: j.access_token, exp: now + expIn - 30 };
  return token.value;
}

async function fetchStates(log) {
  const q = new URLSearchParams();
  const b = bboxParams();
  q.set('lamin', String(b.lamin));
  q.set('lamax', String(b.lamax));
  q.set('lomin', String(b.lomin));
  q.set('lomax', String(b.lomax));

  const headers = { accept: 'application/json' };
  const bearer = await getBearer();
  if (bearer) {
    headers.authorization = `Bearer ${bearer}`;
  }

  const res = await fetch(`${OPENSKY_API}/states/all?${q}`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(20_000),
  });

  if (res.status === 429) {
    const wait = res.headers.get('X-Rate-Limit-Retry-After-Seconds') || '300';
    log?.warn({ wait }, 'OpenSky 429: rate / credits');
    return { err: 'rate', status: 429, aircraft: [] };
  }
  if (!res.ok) {
    log?.warn({ status: res.status }, 'OpenSky HTTP error');
    return { err: 'http', status: res.status, aircraft: [] };
  }
  const data = await res.json();
  const states = data?.states;
  if (!Array.isArray(states)) {
    return { err: 'parse', status: 200, aircraft: [] };
  }
  const out = [];
  for (const s of states) {
    if (s == null) continue;
    const ac = stateToAircraft(s);
    if (ac) out.push(ac);
  }
  return { err: null, status: 200, aircraft: out };
}

/**
 * @param {import('fastify').FastifyInstance} app
 */
export async function getOpenSkyAircraft(app) {
  const log = app.log;
  const now = Date.now();
  const ttl = cacheMs();
  if (dataCache.at && now - dataCache.at < ttl) {
    if (dataCache.err) {
      return {
        aircraft: dataCache.aircraft,
        source: 'error',
        dataSource: 'opensky',
        cached: true,
        errorKind: dataCache.err,
        opensky: { lastAttempt: new Date(dataCache.at).toISOString() },
      };
    }
    return {
      aircraft: dataCache.aircraft,
      source: 'feed',
      dataSource: 'opensky',
      cached: true,
      opensky: { fetchedAt: new Date(dataCache.at).toISOString(), cacheTtlMs: ttl },
    };
  }

  const result = await fetchStates(log);
  if (result.err) {
    dataCache = {
      at: now,
      aircraft: [],
      err: result.err,
      httpStatus: result.status,
    };
    return {
      aircraft: [],
      source: 'error',
      dataSource: 'opensky',
      errorKind: result.err,
    };
  }

  dataCache = {
    at: now,
    aircraft: result.aircraft,
    err: null,
    httpStatus: 200,
  };
  return {
    aircraft: result.aircraft,
    source: 'feed',
    dataSource: 'opensky',
    cached: false,
    opensky: { fetchedAt: new Date(now).toISOString(), cacheTtlMs: ttl },
  };
}

