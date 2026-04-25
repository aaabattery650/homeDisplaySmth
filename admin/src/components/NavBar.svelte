<script>
  let { mode = 'view', weekLabel = '', onPrev, onNext, onToday, onAdd, onBack } = $props();
</script>

<nav class="navbar">
  {#if mode === 'view'}
    <div class="left">
      <h1 class="title">Family Calendar</h1>
    </div>
    <div class="center">
      <button class="btn btn-ghost" onclick={onPrev}>‹</button>
      <span class="week-label">{weekLabel}</span>
      <button class="btn btn-ghost" onclick={onNext}>›</button>
      <button class="btn btn-ghost today-btn" onclick={onToday}>Today</button>
    </div>
    <div class="right">
      <button class="btn btn-primary" onclick={onAdd}>+ Add event</button>
    </div>
  {:else}
    <div class="left">
      <button class="btn btn-ghost back-btn" onclick={onBack}>← Back to calendar</button>
    </div>
    <div class="center"></div>
    <div class="right"></div>
  {/if}
</nav>

<style>
  .navbar {
    display: flex;
    align-items: center;
    padding: 16px 24px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    gap: 16px;
  }
  .left, .right { flex: 1; }
  .right { text-align: right; }
  .center {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .title {
    font-size: 1.125rem;
    font-weight: 600;
  }
  .week-label {
    font-size: 0.9375rem;
    font-weight: 500;
    min-width: 160px;
    text-align: center;
  }
  .today-btn {
    margin-left: 8px;
    font-size: 0.8125rem;
  }
  .back-btn {
    font-size: 0.9375rem;
    color: var(--accent);
  }
</style>
