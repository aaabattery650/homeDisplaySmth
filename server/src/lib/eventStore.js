import { readFile, writeFile, rename } from 'fs/promises';
import { randomBytes } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', '..', '..', 'data', 'events.json');
const TMP_PATH = DATA_PATH + '.tmp';

export async function readEvents() {
  try {
    const raw = await readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw).events ?? [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function writeEvents(events) {
  const data = JSON.stringify({ events }, null, 2) + '\n';
  await writeFile(TMP_PATH, data, 'utf-8');
  await rename(TMP_PATH, DATA_PATH);
}

export function generateId() {
  return `evt_${Date.now()}_${randomBytes(3).toString('hex')}`;
}
