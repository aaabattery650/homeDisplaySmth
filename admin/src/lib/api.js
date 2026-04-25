export async function fetchEvents(from, to) {
  const res = await fetch(`/api/events?from=${from}&to=${to}`);
  if (!res.ok) throw new Error(`events ${res.status}`);
  const data = await res.json();
  return data.events;
}

export async function getEvent(id) {
  const res = await fetch(`/api/events/${id}`);
  if (!res.ok) throw new Error(`event ${res.status}`);
  const data = await res.json();
  return data.event;
}

export async function createEvent(evt) {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evt),
  });
  if (!res.ok) throw new Error(`create ${res.status}`);
  const data = await res.json();
  return data.event;
}

export async function updateEvent(id, evt) {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evt),
  });
  if (!res.ok) throw new Error(`update ${res.status}`);
  const data = await res.json();
  return data.event;
}

export async function deleteEvent(id) {
  const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`delete ${res.status}`);
}
