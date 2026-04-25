<script>
  import { formatDayHeader, isToday } from '../lib/dates.js';

  let { days = [] } = $props();
</script>

<div class="week-header">
  <div class="gutter"></div>
  {#each days as day}
    <div class="day-col" class:today={isToday(day)}>
      {formatDayHeader(day)}
    </div>
  {/each}
</div>

<style>
  .week-header {
    display: grid;
    grid-template-columns: 60px repeat(7, 1fr);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .gutter { border-right: 1px solid var(--border); }
  .day-col {
    padding: 10px 8px;
    text-align: center;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-secondary);
    border-right: 1px solid var(--border);
  }
  .day-col:last-child { border-right: none; }
  .day-col.today {
    color: var(--accent);
    font-weight: 600;
    background: var(--today-bg);
  }
</style>
