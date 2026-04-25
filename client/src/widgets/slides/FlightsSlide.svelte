<script>
  import Slide from './Slide.svelte';

  // Stub data — Phase 2 wires the local FlightRadar antenna feed (dump1090).
  const sample = [
    { flight: 'AAL218', route: 'SFO → JFK', alt: '34,000 ft', type: 'B789' },
    { flight: 'UAL455', route: 'LAX → ORD', alt: '36,000 ft', type: 'B738' },
  ];
</script>

<Slide eyebrow="Overhead now" title="Above the house">
  <ul class="flights">
    {#each sample as f}
      <li class="flight">
        <div class="ident tabular">{f.flight}</div>
        <div class="route">{f.route}</div>
        <div class="meta tabular">
          <span>{f.alt}</span>
          <span class="dot">·</span>
          <span>{f.type}</span>
        </div>
      </li>
    {/each}
  </ul>
</Slide>

<style>
  .flights {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .flight {
    display: grid;
    grid-template-columns: 220px 1fr 240px;
    align-items: baseline;
    padding: 20px 0;
    border-top: 1px solid var(--surface-border);
  }
  .flight:first-child { border-top: none; }
  .ident {
    font-family: var(--font-mono);
    font-size: var(--fs-large);
    color: var(--accent-warm);
    font-weight: 500;
  }
  .route {
    font-size: var(--fs-large);
    color: var(--text-primary);
  }
  .meta {
    text-align: right;
    color: var(--text-secondary);
    font-size: var(--fs-medium);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .dot { color: var(--text-tertiary); }
</style>
