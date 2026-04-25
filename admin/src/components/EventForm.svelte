<script>
  import { onMount } from 'svelte';
  import { getEvent, createEvent, updateEvent, deleteEvent } from '../lib/api.js';
  import { buildRRuleString, parseRRuleString } from '../lib/rrule.js';
  import NavBar from './NavBar.svelte';
  import RRuleBuilder from './RRuleBuilder.svelte';
  import ExdatePicker from './ExdatePicker.svelte';

  let { eventId = null, prefillDate = '', prefillTime = '', onDone } = $props();
  let isEdit = $derived(!!eventId);

  let title = $state('');
  let date = $state('');
  let startTime = $state('09:00');
  let endTime = $state('10:00');
  let allDay = $state(false);
  let location = $state('');
  let color = $state('#4a90d9');
  let category = $state('');
  let exdates = $state([]);

  // RRULE state
  let frequency = $state('none');
  let interval = $state(1);
  let byDay = $state([]);
  let endCondition = $state('never');
  let count = $state(10);
  let until = $state('');

  let saving = $state(false);
  let deleting = $state(false);

  const COLORS = [
    '#4a90d9', '#5b6abf', '#7b68c4', '#d94a7a',
    '#d9654a', '#d99a4a', '#4a9e6f', '#4ab8b8',
  ];

  onMount(async () => {
    if (eventId) {
      const evt = await getEvent(eventId);
      title = evt.title;
      date = evt.date;
      startTime = evt.startTime ?? '09:00';
      endTime = evt.endTime ?? '10:00';
      allDay = evt.allDay;
      location = evt.location ?? '';
      color = evt.color ?? '#4a90d9';
      category = evt.category ?? '';
      exdates = evt.exdates ?? [];
      const rr = parseRRuleString(evt.rrule);
      frequency = rr.frequency;
      interval = rr.interval;
      byDay = rr.byDay;
      endCondition = rr.endCondition;
      count = rr.count;
      until = rr.until;
    } else {
      date = prefillDate;
      startTime = prefillTime || '09:00';
      const h = parseInt(startTime) + 1;
      endTime = `${String(h).padStart(2, '0')}:00`;
    }
  });

  async function handleSave() {
    if (!title.trim() || !date) return;
    saving = true;

    const rrule = buildRRuleString({ frequency, interval, byDay, endCondition, count, until });
    const data = {
      title: title.trim(),
      date,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      allDay,
      location: location.trim(),
      color,
      category: category.trim(),
      rrule,
      exdates: rrule ? exdates : [],
    };

    try {
      if (isEdit) {
        await updateEvent(eventId, data);
      } else {
        await createEvent(data);
      }
      onDone?.();
    } catch (e) {
      console.error('Save failed:', e);
      alert('Failed to save event');
    }
    saving = false;
  }

  async function handleDelete() {
    if (!confirm('Delete this event?')) return;
    deleting = true;
    try {
      await deleteEvent(eventId);
      onDone?.();
    } catch (e) {
      console.error('Delete failed:', e);
      alert('Failed to delete event');
    }
    deleting = false;
  }
</script>

<div class="form-page">
  <NavBar mode="form" onBack={onDone} />

  <div class="form-body">
    <h2>{isEdit ? 'Edit Event' : 'Add Event'}</h2>

    <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <div class="field">
        <label for="title">Title</label>
        <input id="title" type="text" bind:value={title} placeholder="Event name" required />
      </div>

      <div class="field-row">
        <div class="field">
          <label for="date">Date</label>
          <input id="date" type="date" bind:value={date} required />
        </div>

        <label class="checkbox-field">
          <input type="checkbox" bind:checked={allDay} />
          All day
        </label>
      </div>

      {#if !allDay}
        <div class="field-row">
          <div class="field">
            <label for="start">Start time</label>
            <input id="start" type="time" bind:value={startTime} />
          </div>
          <div class="field">
            <label for="end">End time</label>
            <input id="end" type="time" bind:value={endTime} />
          </div>
        </div>
      {/if}

      <div class="field">
        <label for="location">Location</label>
        <input id="location" type="text" bind:value={location} placeholder="Optional" />
      </div>

      <div class="field">
        <label for="category">Category</label>
        <input id="category" type="text" bind:value={category} placeholder="e.g. kid's name, Family" />
      </div>

      <div class="field">
        <label id="color-label">Color</label>
        <div class="color-swatches" aria-labelledby="color-label">
          {#each COLORS as c}
            <button
              type="button"
              class="swatch"
              class:active={color === c}
              style="background: {c};"
              onclick={() => (color = c)}
              aria-label="Color {c}"
            ></button>
          {/each}
        </div>
      </div>

      <RRuleBuilder
        bind:frequency
        bind:interval
        bind:byDay
        bind:endCondition
        bind:count
        bind:until
      />

      {#if frequency !== 'none' && isEdit}
        <ExdatePicker bind:exdates />
      {/if}

      <div class="actions">
        <button type="submit" class="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save event'}
        </button>
        {#if isEdit}
          <button type="button" class="btn btn-danger" onclick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        {/if}
        <button type="button" class="btn btn-ghost" onclick={onDone}>Cancel</button>
      </div>
    </form>
  </div>
</div>

<style>
  .form-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .form-body {
    max-width: 640px;
    margin: 0 auto;
    padding: 32px 24px;
    width: 100%;
  }
  h2 {
    font-size: 1.375rem;
    font-weight: 600;
    margin-bottom: 24px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-secondary);
  }
  .field-row {
    display: flex;
    gap: 16px;
    align-items: end;
    flex-wrap: wrap;
  }
  .checkbox-field {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding-bottom: 8px;
  }
  .color-swatches {
    display: flex;
    gap: 8px;
  }
  .swatch {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid transparent;
    cursor: pointer;
    transition: border-color 150ms ease;
  }
  .swatch.active {
    border-color: var(--text);
  }
  .actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }
</style>
