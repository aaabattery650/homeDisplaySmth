import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Fastify from 'fastify';
import { weatherRoute } from './routes/weather.js';
import { flightsRoute } from './routes/flights.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Repo .env, then server/.env (wins for duplicate keys)
config({ path: join(__dirname, '../../.env') });
config({ path: join(__dirname, '../.env'), override: true });

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';

const app = Fastify({ logger: { level: 'info' } });

app.get('/health', async () => ({ ok: true }));

await app.register(weatherRoute, { prefix: '/api' });
await app.register(flightsRoute, { prefix: '/api' });

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
