// Default location — override via VITE_LAT / VITE_LON, or wire a settings UI later.
const DEFAULT_LAT = Number(import.meta.env.VITE_LAT ?? 37.7749);
const DEFAULT_LON = Number(import.meta.env.VITE_LON ?? -122.4194);

export async function fetchWeather({ lat = DEFAULT_LAT, lon = DEFAULT_LON } = {}) {
  const url = `/api/weather?lat=${lat}&lon=${lon}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  return res.json();
}
