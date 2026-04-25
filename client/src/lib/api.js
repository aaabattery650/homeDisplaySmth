// Default home position — override via VITE_LAT / VITE_LON. Defaults: central Singapore.
export const HOME_LAT = Number(import.meta.env.VITE_LAT ?? 1.3521);
export const HOME_LON = Number(import.meta.env.VITE_LON ?? 103.8198);

const DEFAULT_LAT = HOME_LAT;
const DEFAULT_LON = HOME_LON;

export async function fetchWeather({ lat = DEFAULT_LAT, lon = DEFAULT_LON } = {}) {
  const url = `/api/weather?lat=${lat}&lon=${lon}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  return res.json();
}

/**
 * @returns {Promise<{
 *   aircraft: Array<{ hex?: string, callsign: string, lat: number, lon: number, track: number, altFt: number | null }>,
 *   source: string,
 *   dataSource?: 'opensky' | 'local',
 *   cached?: boolean,
 *   errorKind?: string,
 *   error?: string,
 *   opensky?: { fetchedAt?: string, cacheTtlMs?: number }
 * }>}
 */
export async function fetchFlights() {
  const res = await fetch('/api/flights');
  if (!res.ok) throw new Error(`flights ${res.status}`);
  return res.json();
}
