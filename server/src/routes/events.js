import rruleLib from 'rrule';
const { RRule } = rruleLib;
import { readEvents, writeEvents, generateId } from '../lib/eventStore.js';

export async function eventsRoute(app) {
  // GET /events?from=YYYY-MM-DD&to=YYYY-MM-DD — expanded occurrences
  app.get('/events', async (req, reply) => {
    const { from, to } = req.query;
    if (!from || !to) {
      return reply.code(400).send({ error: 'from and to query params are required (YYYY-MM-DD)' });
    }

    const fromDate = new Date(from + 'T00:00:00Z');
    const toDate = new Date(to + 'T23:59:59Z');
    if (isNaN(fromDate) || isNaN(toDate)) {
      return reply.code(400).send({ error: 'invalid date format, use YYYY-MM-DD' });
    }

    const events = await readEvents();
    const expanded = [];

    for (const evt of events) {
      if (evt.rrule) {
        const [y, m, d] = evt.date.split('-').map(Number);
        const rule = new RRule({
          ...RRule.parseString(evt.rrule),
          dtstart: new Date(Date.UTC(y, m - 1, d)),
        });
        const occurrences = rule.between(fromDate, toDate, true);
        const exSet = new Set(evt.exdates ?? []);

        for (const occ of occurrences) {
          const occDate = occ.toISOString().slice(0, 10);
          if (exSet.has(occDate)) continue;
          expanded.push({ ...evt, occurrenceDate: occDate, masterEventId: evt.id });
        }
      } else {
        if (evt.date >= from && evt.date <= to) {
          expanded.push({ ...evt, occurrenceDate: evt.date, masterEventId: evt.id });
        }
      }
    }

    expanded.sort((a, b) => {
      const d = a.occurrenceDate.localeCompare(b.occurrenceDate);
      if (d !== 0) return d;
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.startTime ?? '').localeCompare(b.startTime ?? '');
    });

    return { events: expanded };
  });

  // GET /events/:id — single master event
  app.get('/events/:id', async (req, reply) => {
    const events = await readEvents();
    const evt = events.find((e) => e.id === req.params.id);
    if (!evt) return reply.code(404).send({ error: 'not found' });
    return { event: evt };
  });

  // POST /events — create
  app.post('/events', async (req, reply) => {
    const body = req.body ?? {};
    if (!body.title || !body.date) {
      return reply.code(400).send({ error: 'title and date are required' });
    }

    const now = new Date().toISOString();
    const evt = {
      id: generateId(),
      title: body.title,
      date: body.date,
      startTime: body.startTime ?? null,
      endTime: body.endTime ?? null,
      allDay: body.allDay ?? false,
      location: body.location ?? '',
      color: body.color ?? '#4a90d9',
      category: body.category ?? '',
      rrule: body.rrule ?? null,
      exdates: body.exdates ?? [],
      createdAt: now,
      updatedAt: now,
    };

    const events = await readEvents();
    events.push(evt);
    await writeEvents(events);
    return reply.code(201).send({ event: evt });
  });

  // PUT /events/:id — update
  app.put('/events/:id', async (req, reply) => {
    const events = await readEvents();
    const idx = events.findIndex((e) => e.id === req.params.id);
    if (idx === -1) return reply.code(404).send({ error: 'not found' });

    const body = req.body ?? {};
    const evt = events[idx];
    const updated = {
      ...evt,
      title: body.title ?? evt.title,
      date: body.date ?? evt.date,
      startTime: body.startTime !== undefined ? body.startTime : evt.startTime,
      endTime: body.endTime !== undefined ? body.endTime : evt.endTime,
      allDay: body.allDay !== undefined ? body.allDay : evt.allDay,
      location: body.location !== undefined ? body.location : evt.location,
      color: body.color ?? evt.color,
      category: body.category !== undefined ? body.category : evt.category,
      rrule: body.rrule !== undefined ? body.rrule : evt.rrule,
      exdates: body.exdates !== undefined ? body.exdates : evt.exdates,
      updatedAt: new Date().toISOString(),
    };

    events[idx] = updated;
    await writeEvents(events);
    return { event: updated };
  });

  // DELETE /events/:id
  app.delete('/events/:id', async (req, reply) => {
    const events = await readEvents();
    const idx = events.findIndex((e) => e.id === req.params.id);
    if (idx === -1) return reply.code(404).send({ error: 'not found' });

    events.splice(idx, 1);
    await writeEvents(events);
    return { ok: true };
  });
}
