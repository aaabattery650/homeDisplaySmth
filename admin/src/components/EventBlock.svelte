<script>
  import { formatTime12 } from '../lib/dates.js';

  let { event, onclick } = $props();
</script>

<button
  class="event-block"
  style="background: {event.color || 'var(--event-default)'};"
  onclick={() => onclick(event)}
>
  <span class="event-time">{event.allDay ? 'All day' : formatTime12(event.startTime)}</span>
  <span class="event-title">{event.title}</span>
</button>

<style>
  .event-block {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 4px 6px;
    border-radius: 4px;
    color: #fff;
    font-size: 0.75rem;
    line-height: 1.3;
    text-align: left;
    overflow: hidden;
    width: 100%;
    min-height: 22px;
    transition: opacity 150ms ease;
  }
  .event-block:hover { opacity: 0.85; }
  .event-time { font-weight: 400; opacity: 0.9; }
  .event-title { font-weight: 500; }
</style>
