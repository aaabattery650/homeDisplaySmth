<script>
  // Crossfade wrapper for the rotating stage. Renders only the active slide,
  // fading new content in over old. The 1.5s timing comes from --crossfade-ms.
  import { onMount, onDestroy } from 'svelte';
  import { registerRect } from '../../lib/weatherFx/collision.js';

  let { eyebrow, title, children } = $props();
  let cardEl;
  let unregister;

  onMount(() => {
    unregister = registerRect(() => cardEl?.getBoundingClientRect());
  });
  onDestroy(() => unregister?.());
</script>

<article bind:this={cardEl} class="slide glass">
  {#if eyebrow}<div class="label eyebrow">{eyebrow}</div>{/if}
  {#if title}<h2 class="title">{title}</h2>{/if}
  <div class="body">
    {@render children?.()}
  </div>
</article>

<style>
  .slide {
    width: 100%;
    height: 100%;
    padding: 56px 64px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    animation: fade-in var(--crossfade-ms) var(--ease-soft-out);
  }
  .eyebrow { color: var(--accent-cool); }
  .title {
    font-family: var(--font-display);
    font-size: var(--fs-xlarge);
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
