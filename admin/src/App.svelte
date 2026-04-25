<script>
  import WeekView from './components/WeekView.svelte';
  import EventForm from './components/EventForm.svelte';

  let mode = $state('view');
  let editEventId = $state(null);
  let prefillDate = $state('');
  let prefillTime = $state('');

  function goCreate(date, time) {
    prefillDate = date || '';
    prefillTime = time || '';
    editEventId = null;
    mode = 'create';
  }

  function goEdit(eventId) {
    editEventId = eventId;
    mode = 'edit';
  }

  function goView() {
    mode = 'view';
    editEventId = null;
  }
</script>

{#if mode === 'view'}
  <WeekView onCreateAt={goCreate} onEditEvent={goEdit} />
{:else}
  <EventForm
    eventId={editEventId}
    {prefillDate}
    {prefillTime}
    onDone={goView}
  />
{/if}
