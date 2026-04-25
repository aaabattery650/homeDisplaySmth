const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

export async function weatherRoute(app) {
  app.get('/weather', async (req, reply) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return reply.code(400).send({ error: 'lat and lon query params are required' });
    }

    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.data;
    }

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,is_day,precipitation,wind_speed_10m');
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        return reply.code(502).send({ error: `upstream ${res.status}` });
      }
      const raw = await res.json();
      const data = shape(raw);
      cache.set(key, { at: Date.now(), data });
      return data;
    } catch (err) {
      app.log.error({ err }, 'weather fetch failed');
      return reply.code(502).send({ error: 'weather upstream unreachable' });
    }
  });
}

function shape(raw) {
  const c = raw.current ?? {};
  const d = raw.daily ?? {};
  return {
    tempC: c.temperature_2m,
    feelsLikeC: c.apparent_temperature,
    weatherCode: c.weather_code,
    condition: describe(c.weather_code),
    isDay: c.is_day === 1,
    precipitation: c.precipitation,
    windKph: c.wind_speed_10m,
    today: {
      maxC: d.temperature_2m_max?.[0],
      minC: d.temperature_2m_min?.[0],
      sunrise: d.sunrise?.[0],
      sunset: d.sunset?.[0],
    },
    fetchedAt: new Date().toISOString(),
  };
}

// WMO weather code → coarse category. Drives the animation state.
// https://open-meteo.com/en/docs#weathervariables
function describe(code) {
  if (code == null) return { kind: 'unknown', label: 'Unknown' };
  if (code === 0) return { kind: 'clear', label: 'Clear' };
  if (code <= 2) return { kind: 'partly_cloudy', label: 'Partly cloudy' };
  if (code === 3) return { kind: 'overcast', label: 'Overcast' };
  if (code <= 48) return { kind: 'fog', label: 'Fog' };
  if (code <= 57) return { kind: 'drizzle', label: 'Drizzle' };
  if (code <= 67) return { kind: 'rain', label: 'Rain' };
  if (code <= 77) return { kind: 'snow', label: 'Snow' };
  if (code <= 82) return { kind: 'rain', label: 'Showers' };
  if (code <= 86) return { kind: 'snow', label: 'Snow showers' };
  if (code <= 99) return { kind: 'thunderstorm', label: 'Thunderstorm' };
  return { kind: 'unknown', label: 'Unknown' };
}
