<script>
  import Slide from './Slide.svelte';

  // Stub data — Phase 2 wires Launch Library 2.
  const sample = [
    { name: 'Falcon 9 · Starlink Group 12-4', provider: 'SpaceX', when: 'Tonight · 10:14 PM', pad: 'Vandenberg SLC-4E' },
    { name: 'Atlas V · USSF-106', provider: 'ULA', when: 'Tomorrow · 6:55 AM', pad: 'Cape Canaveral' },
  ];
</script>

<Slide eyebrow="Upcoming launches" title="Up & away">
  <ul class="launches">
    {#each sample as l}
      <li class="launch">
        <div class="head">
          <div class="provider">{l.provider}</div>
          <div class="when tabular">{l.when}</div>
        </div>
        <div class="name">{l.name}</div>
        <div class="pad">{l.pad}</div>
      </li>
    {/each}
  </ul>
</Slide>

<style>
  .launches {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .launch {
    padding: 22px 0;
    border-top: 1px solid var(--surface-border);
  }
  .launch:first-child { border-top: none; }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }
  .provider {
    font-size: var(--fs-small);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--accent-warm);
    font-weight: 600;
  }
  .when {
    font-size: var(--fs-medium);
    color: var(--accent-cool);
  }
  .name {
    font-size: var(--fs-large);
    font-weight: 500;
    color: var(--text-primary);
  }
  .pad {
    margin-top: 4px;
    color: var(--text-secondary);
  }
</style>
