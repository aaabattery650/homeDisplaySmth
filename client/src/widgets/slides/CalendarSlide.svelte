<script>
  import { onMount, onDestroy } from 'svelte';
  import Slide from './Slide.svelte';
  import { fetchEvents } from '../../lib/api.js';

  let events = $state([]);
  let error = $state(null);
  let pollTimer;

  function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async function load() {
    try {
      const now = new Date();
      const from = toDateStr(now);
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      const to = toDateStr(end);
      events = await fetchEvents(from, to);
      error = null;
    } catch (e) {
      error = String(e);
    }
  }

  onMount(() => {
    load();
    pollTimer = setInterval(load, 5 * 60 * 1000);
  });

  onDestroy(() => clearInterval(pollTimer));

  function formatWhen(evt) {
    const occ = new Date(evt.occurrenceDate + 'T00:00:00');
    const now = new Date();
    const todayStr = toDateStr(now);
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = toDateStr(tmrw);

    let dayLabel;
    if (evt.occurrenceDate === todayStr) dayLabel = 'Today';
    else if (evt.occurrenceDate === tmrwStr) dayLabel = 'Tomorrow';
    else dayLabel = occ.toLocaleDateString([], { weekday: 'short' });

    if (evt.allDay) return `${dayLabel} · All day`;

    const time = formatTime(evt.startTime);
    return `${dayLabel} · ${time}`;
  }

  function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function formatTitle(evt) {
    const parts = [];
    if (evt.category) parts.push(evt.category);
    parts.push(evt.title);
    return parts.join(' — ');
  }
</script>

<Slide eyebrow="Coming up" title="Family schedule">
  {#if error}
    <div class="err">Calendar offline</div>
  {:else if events.length === 0}
    <div class="empty">No upcoming events</div>
  {:else}
    <ul class="events">
      {#each events.slice(0, 6) as e}
        <li class="event">
          <div class="when tabular">{formatWhen(e)}</div>
          <div class="what">{formatTitle(e)}</div>
          {#if e.location}<div class="where">{e.location}</div>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</Slide>

<style>
  .events {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .event {
    display: grid;
    grid-template-columns: 260px 1fr;
    column-gap: 32px;
    align-items: baseline;
    padding: 18px 0;
    border-top: 1px solid var(--surface-border);
  }
  .event:first-child { border-top: none; }
  .when {
    font-size: var(--fs-medium);
    color: var(--accent-cool);
    font-weight: 500;
  }
  .what {
    font-size: var(--fs-large);
    color: var(--text-primary);
    font-weight: 500;
  }
  .where {
    grid-column: 2;
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: var(--fs-body);
  }
  .err, .empty {
    font-size: var(--fs-medium);
    color: var(--text-secondary);
  }
</style>
