<script>
  import { onMount } from 'svelte';
  import { fetchEvents } from '../lib/api.js';
  import { getWeekRange, addDays, toDateStr, formatMonthYear } from '../lib/dates.js';
  import NavBar from './NavBar.svelte';
  import WeekHeader from './WeekHeader.svelte';
  import TimeGrid from './TimeGrid.svelte';

  let { onCreateAt, onEditEvent } = $props();

  let weekStart = $state(getWeekRange(new Date()).start);
  let events = $state([]);
  let loading = $state(false);

  let days = $derived(
    Array.from({ length: 7 }, (_, i) => toDateStr(addDays(weekStart, i)))
  );

  let weekLabel = $derived.by(() => {
    const end = addDays(weekStart, 6);
    const sm = formatMonthYear(weekStart);
    const em = formatMonthYear(end);
    if (sm === em) return sm;
    return `${sm} – ${em}`;
  });

  async function load() {
    loading = true;
    try {
      const from = toDateStr(weekStart);
      const to = toDateStr(addDays(weekStart, 6));
      events = await fetchEvents(from, to);
    } catch (e) {
      console.error('Failed to load events:', e);
    }
    loading = false;
  }

  $effect(() => {
    // Re-fetch whenever weekStart changes
    weekStart; // track dependency
    load();
  });

  function prevWeek() { weekStart = addDays(weekStart, -7); }
  function nextWeek() { weekStart = addDays(weekStart, 7); }
  function goToday() { weekStart = getWeekRange(new Date()).start; }

  function handleSlotClick(dayStr, time) {
    onCreateAt?.(dayStr, time);
  }

  function handleEventClick(evt) {
    onEditEvent?.(evt.masterEventId);
  }
</script>

<div class="week-view">
  <NavBar
    mode="view"
    {weekLabel}
    onPrev={prevWeek}
    onNext={nextWeek}
    onToday={goToday}
    onAdd={() => onCreateAt?.(toDateStr(new Date()), '09:00')}
  />
  <WeekHeader {days} />
  <TimeGrid
    {days}
    {events}
    onSlotClick={handleSlotClick}
    onEventClick={handleEventClick}
  />
</div>

<style>
  .week-view {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
</style>
