<script>
  import { DAY_CODES } from '../lib/rrule.js';

  let { frequency = $bindable('none'), interval = $bindable(1), byDay = $bindable([]),
        endCondition = $bindable('never'), count = $bindable(10), until = $bindable('') } = $props();

  const FREQ_OPTIONS = [
    { value: 'none', label: 'No repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  function toggleDay(code) {
    if (byDay.includes(code)) {
      byDay = byDay.filter((d) => d !== code);
    } else {
      byDay = [...byDay, code];
    }
  }
</script>

<fieldset class="rrule-builder">
  <legend>Repeat</legend>

  <div class="row">
    <label>
      Frequency
      <select bind:value={frequency}>
        {#each FREQ_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </label>

    {#if frequency !== 'none'}
      <label>
        Every
        <input type="number" bind:value={interval} min="1" max="99" class="narrow" />
        <span class="unit">{frequency === 'daily' ? 'day(s)' : frequency === 'weekly' ? 'week(s)' : frequency === 'monthly' ? 'month(s)' : 'year(s)'}</span>
      </label>
    {/if}
  </div>

  {#if frequency === 'weekly'}
    <div class="days-row">
      <span class="label">On:</span>
      {#each DAY_CODES as code, i}
        <button
          type="button"
          class="day-toggle"
          class:active={byDay.includes(code)}
          onclick={() => toggleDay(code)}
        >
          {DAY_LABELS[i]}
        </button>
      {/each}
    </div>
  {/if}

  {#if frequency !== 'none'}
    <div class="end-section">
      <span class="label">Ends:</span>
      <label class="radio-row">
        <input type="radio" bind:group={endCondition} value="never" />
        Never
      </label>
      <label class="radio-row">
        <input type="radio" bind:group={endCondition} value="count" />
        After
        <input
          type="number"
          bind:value={count}
          min="1"
          max="999"
          class="narrow"
          disabled={endCondition !== 'count'}
        />
        occurrences
      </label>
      <label class="radio-row">
        <input type="radio" bind:group={endCondition} value="until" />
        On date
        <input
          type="date"
          bind:value={until}
          disabled={endCondition !== 'until'}
        />
      </label>
    </div>
  {/if}
</fieldset>

<style>
  .rrule-builder {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  legend {
    font-weight: 500;
    font-size: 0.875rem;
    padding: 0 6px;
  }
  .row {
    display: flex;
    align-items: end;
    gap: 16px;
    flex-wrap: wrap;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }
  .narrow { width: 70px; }
  .unit {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    align-self: center;
  }
  .days-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .label {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin-right: 4px;
  }
  .day-toggle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border);
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--surface);
    transition: all 150ms ease;
  }
  .day-toggle.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  .end-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .radio-row {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
  }
  .radio-row input[type="number"],
  .radio-row input[type="date"] {
    margin-left: 4px;
  }
</style>
