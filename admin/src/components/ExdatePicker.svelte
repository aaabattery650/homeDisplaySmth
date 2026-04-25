<script>
  import { formatFullDate } from '../lib/dates.js';

  let { exdates = $bindable([]) } = $props();
  let newDate = $state('');

  function addException() {
    if (newDate && !exdates.includes(newDate)) {
      exdates = [...exdates, newDate].sort();
      newDate = '';
    }
  }

  function removeException(date) {
    exdates = exdates.filter((d) => d !== date);
  }
</script>

<fieldset class="exdate-picker">
  <legend>Exception dates (skip these occurrences)</legend>

  {#if exdates.length > 0}
    <ul class="exdate-list">
      {#each exdates as date}
        <li>
          <span>{formatFullDate(date + 'T00:00:00')}</span>
          <button type="button" class="remove-btn" onclick={() => removeException(date)}>✕</button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="add-row">
    <input type="date" bind:value={newDate} />
    <button type="button" class="btn btn-ghost" onclick={addException} disabled={!newDate}>
      + Add exception
    </button>
  </div>
</fieldset>

<style>
  .exdate-picker {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  legend {
    font-weight: 500;
    font-size: 0.875rem;
    padding: 0 6px;
  }
  .exdate-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .exdate-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: rgba(0,0,0,0.03);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
  }
  .remove-btn {
    color: var(--danger);
    font-size: 0.75rem;
    padding: 2px 6px;
  }
  .add-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
