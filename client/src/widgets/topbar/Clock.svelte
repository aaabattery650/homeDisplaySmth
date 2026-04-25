<script>
  import { onMount, onDestroy } from 'svelte';
  import { registerRect } from '../../lib/weatherFx/collision.js';

  let now = $state(new Date());
  let cardEl;
  let interval;
  let unregister;

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  let timeStr = $derived(timeFmt.format(now));
  let dateStr = $derived(dateFmt.format(now));

  onMount(() => {
    interval = setInterval(() => (now = new Date()), 1000);
    unregister = registerRect(() => cardEl?.getBoundingClientRect());
  });

  onDestroy(() => {
    clearInterval(interval);
    unregister?.();
  });
</script>

<section bind:this={cardEl} class="clock">
  <div class="time tabular">{timeStr}</div>
  <div class="date">{dateStr}</div>
</section>

<style>
  .clock {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 8px;
  }
  .time {
    font-family: var(--font-display);
    font-size: var(--fs-mega);
    font-weight: 500;
    line-height: 0.95;
    letter-spacing: -0.04em;
    color: var(--text-primary);
    text-shadow: 0 2px 24px rgba(126, 182, 255, 0.18);
  }
  .date {
    margin-top: 10px;
    font-size: var(--fs-medium);
    color: var(--text-secondary);
    font-weight: 400;
  }
</style>
