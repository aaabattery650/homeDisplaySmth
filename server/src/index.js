import Fastify from 'fastify';
import { weatherRoute } from './routes/weather.js';

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';

const app = Fastify({ logger: { level: 'info' } });

app.get('/health', async () => ({ ok: true }));

await app.register(weatherRoute, { prefix: '/api' });

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
