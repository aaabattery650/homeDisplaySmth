<script>
  import { isToday, timeToMinutes } from '../lib/dates.js';
  import EventBlock from './EventBlock.svelte';

  let { days = [], events = [], onSlotClick, onEventClick } = $props();

  const START_HOUR = 6;
  const END_HOUR = 22;
  const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

  function eventsForDay(dayStr) {
    return events.filter((e) => e.occurrenceDate === dayStr && !e.allDay);
  }

  function allDayForDay(dayStr) {
    return events.filter((e) => e.occurrenceDate === dayStr && e.allDay);
  }

  function topPercent(startTime) {
    const mins = timeToMinutes(startTime) - START_HOUR * 60;
    return Math.max(0, (mins / TOTAL_MINUTES) * 100);
  }

  function heightPercent(startTime, endTime) {
    const s = timeToMinutes(startTime);
    const e = timeToMinutes(endTime || startTime) || s + 60;
    return Math.max(2, ((e - s) / TOTAL_MINUTES) * 100);
  }

  function formatHour(h) {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  }

  function handleSlotClick(dayStr, hour) {
    onSlotClick?.(dayStr, `${String(hour).padStart(2, '0')}:00`);
  }

  const hasAllDay = $derived(days.some((d) => allDayForDay(d).length > 0));
</script>

{#if hasAllDay}
  <div class="allday-row">
    <div class="gutter allday-label">all-day</div>
    {#each days as day}
      <div class="allday-cell" class:today={isToday(day)}>
        {#each allDayForDay(day) as evt}
          <EventBlock event={evt} onclick={onEventClick} />
        {/each}
      </div>
    {/each}
  </div>
{/if}

<div class="grid-scroll">
  <div class="time-grid">
    {#each HOURS as hour}
      <div class="hour-row">
        <div class="gutter hour-label">{formatHour(hour)}</div>
        {#each days as day}
          <button
            class="cell"
            class:today={isToday(day)}
            onclick={() => handleSlotClick(day, hour)}
          ></button>
        {/each}
      </div>
    {/each}

    <!-- Event overlays -->
    <div class="events-overlay">
      <div class="gutter"></div>
      {#each days as day, colIdx}
        <div class="day-events">
          {#each eventsForDay(day) as evt}
            <div
              class="event-pos"
              style="top: {topPercent(evt.startTime)}%; height: {heightPercent(evt.startTime, evt.endTime)}%;"
            >
              <EventBlock event={evt} onclick={onEventClick} />
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .allday-row {
    display: grid;
    grid-template-columns: 60px repeat(7, 1fr);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    min-height: 36px;
  }
  .allday-label {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .allday-cell {
    border-right: 1px solid var(--border);
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .allday-cell:last-child { border-right: none; }
  .allday-cell.today { background: var(--today-bg); }

  .grid-scroll {
    flex: 1;
    overflow-y: auto;
  }
  .time-grid {
    position: relative;
    min-height: 100%;
  }
  .hour-row {
    display: grid;
    grid-template-columns: 60px repeat(7, 1fr);
    height: 60px;
    border-bottom: 1px solid var(--border);
  }
  .gutter {
    border-right: 1px solid var(--border);
  }
  .hour-label {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    padding: 4px 8px 0 0;
    text-align: right;
  }
  .cell {
    border-right: 1px solid var(--border);
    background: transparent;
    cursor: pointer;
    padding: 0;
    text-align: left;
  }
  .cell:last-child { border-right: none; }
  .cell:hover { background: rgba(74, 144, 217, 0.04); }
  .cell.today { background: var(--today-bg); }
  .cell.today:hover { background: rgba(74, 144, 217, 0.08); }

  .events-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 60px repeat(7, 1fr);
    pointer-events: none;
  }
  .day-events {
    position: relative;
    pointer-events: auto;
  }
  .event-pos {
    position: absolute;
    left: 2px;
    right: 2px;
    z-index: 1;
  }
</style>
