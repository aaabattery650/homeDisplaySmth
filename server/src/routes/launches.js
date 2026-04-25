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
    pad: l.pad?.name ?? l.pad?.location?.name ?? 'Unknown',
    net: l.net,
    status: l.status?.abbrev ?? null,
  }));
}
