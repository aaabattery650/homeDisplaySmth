<script>
  import Slide from './Slide.svelte';

  // Stub data — Phase 2 wires Google Calendar through the proxy.
  const sample = [
    { when: 'Today · 4:30 PM', what: 'Aanya — Piano lesson', where: 'Music school' },
    { when: 'Tomorrow · 9:00 AM', what: 'Vihaan — Soccer practice', where: 'East field' },
    { when: 'Sat · 11:00 AM', what: 'Family — Library trip', where: '' },
  ];
</script>

<Slide eyebrow="Coming up" title="Family schedule">
  <ul class="events">
    {#each sample as e}
      <li class="event">
        <div class="when tabular">{e.when}</div>
        <div class="what">{e.what}</div>
        {#if e.where}<div class="where">{e.where}</div>{/if}
      </li>
    {/each}
  </ul>
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
</style>
