const CACHE_TTL_MS = 15 * 60 * 1000;
let cached = null;

export async function launchesRoute(app) {
  app.get('/launches', async (_req, reply) => {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }

    const url = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=5&mode=normal';

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        return reply.code(502).send({ error: `upstream ${res.status}` });
      }
      const raw = await res.json();
      const data = shape(raw);
      cached = { at: Date.now(), data };
      return data;
    } catch (err) {
      app.log.error({ err }, 'launches fetch failed');
      return reply.code(502).send({ error: 'launches upstream unreachable' });
    }
  });
}

function shape(raw) {
  return (raw.results ?? []).map((l) => ({
    name: l.name,
    provider: l.launch_service_provider?.name ?? 'Unknown',
    providerType: l.launch_service_provider?.type ?? null,
    rocket: l.rocket?.configuration?.full_name ?? l.rocket?.configuration?.name ?? null,
    mission: l.mission?.name ?? null,
    missionType: l.mission?.type ?? null,
    orbit: l.mission?.orbit?.abbrev ?? null,
    pad: l.pad?.location?.name ?? l.pad?.name ?? 'Unknown',
    net: l.net,
    windowStart: l.window_start ?? null,
    windowEnd: l.window_end ?? null,
    status: l.status?.abbrev ?? null,
    statusName: l.status?.name ?? null,
    image: l.image ?? null,
    probability: l.probability ?? null,
  }));
}
