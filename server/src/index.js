import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { weatherRoute } from './routes/weather.js';
import { launchesRoute } from './routes/launches.js';
import { flightsRoute } from './routes/flights.js';
import { eventsRoute } from './routes/events.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
// Repo .env, then server/.env (wins for duplicate keys)
config({ path: join(ROOT, '.env') });
config({ path: join(__dirname, '../.env'), override: true });

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';

const app = Fastify({ logger: { level: 'info' } });

app.get('/health', async () => ({ ok: true }));

await app.register(weatherRoute, { prefix: '/api' });
await app.register(launchesRoute, { prefix: '/api' });
await app.register(flightsRoute, { prefix: '/api' });
await app.register(eventsRoute, { prefix: '/api' });

// In production, serve the built client and admin apps as static files.
const clientDist = join(ROOT, 'client', 'dist');
const adminDist = join(ROOT, 'admin', 'dist');

if (existsSync(clientDist)) {
  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: '/',
    decorateReply: false,
  });

  // SPA fallback — serve index.html for any non-API, non-file route
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/admin/')) {
      return reply.code(404).send({ error: 'not found' });
    }
    return reply.sendFile('index.html', clientDist);
  });
}

if (existsSync(adminDist)) {
  await app.register(fastifyStatic, {
    root: adminDist,
    prefix: '/admin/',
    decorateReply: false,
  });
}

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
