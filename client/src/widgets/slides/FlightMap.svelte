<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';

  let { centerLat, centerLon, halfSpanDeg, aircraft = [] } = $props();

  let el = $state(null);
  let map = $state(null);
  let traffic = $state(null);
  let resizeObs = $state(null);

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const PLANE_SVG =
    '<svg viewBox="-10 -14 20 28" width="26" height="26" aria-hidden="true"><path d="M0-14L7.5 2.5L0-0.5L-7.5 2.5Z" fill="currentColor" stroke="rgba(4,8,20,0.4)" stroke-width="0.5"/></svg>';

  function acIcon(track, callsign) {
    const t = ((Number(track) % 360) + 360) % 360;
    return L.divIcon({
      className: 'hm-ico',
      html: `<div class="hm-ac">
        <div class="hm-cs">${esc(callsign)}</div>
        <div class="hm-pl" style="transform:rotate(${t}deg)">${PLANE_SVG}</div>
      </div>`,
      iconSize: [88, 56],
      iconAnchor: [44, 40],
    });
  }

  const homeIcon = () =>
    L.divIcon({
      className: 'hm-ico',
      html: `<div class="hm-home" role="img" aria-label="Home">
        <div class="hm-home-dot"></div>
        <span class="hm-home-t">Home</span>
      </div>`,
      iconSize: [72, 36],
      iconAnchor: [36, 32],
    });

  function syncTraffic() {
    if (!map || !traffic) return;
    traffic.clearLayers();
    for (const a of aircraft ?? []) {
      L.marker([a.lat, a.lon], {
        icon: acIcon(a.track, a.callsign),
        zIndexOffset: Math.min(8000, Math.floor((a.altFt ?? 0) / 2)),
        interactive: false,
      }).addTo(traffic);
    }
  }

  $effect(() => {
    if (!map || !traffic) return;
    (aircraft ?? []).length; // re-sync when the list changes
    syncTraffic();
  });

  onMount(() => {
    if (!el) return;

    const cLat = centerLat;
    const cLon = centerLon;
    const h = halfSpanDeg;
    const cos = Math.cos((cLat * Math.PI) / 180);

    const m = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 8,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m);

    m.fitBounds(
      [
        [cLat - h, cLon - h / cos],
        [cLat + h, cLon + h / cos],
      ],
      { padding: [16, 16], maxZoom: 14 },
    );

    L.marker([cLat, cLon], {
      icon: homeIcon(),
      zIndexOffset: 10_000,
      interactive: false,
    }).addTo(m);

    traffic = L.layerGroup().addTo(m);
    map = m;

    syncTraffic();

    resizeObs = new ResizeObserver(() => {
      m.invalidateSize();
    });
    resizeObs.observe(el);

    return () => {
      resizeObs?.disconnect();
      resizeObs = null;
      traffic = null;
      m.remove();
      map = null;
    };
  });
</script>

<div class="map-root" bind:this={el} aria-label="Map and aircraft around home position"></div>

<style>
  .map-root {
    width: 100%;
    height: 100%;
    min-height: 0;
    flex: 1;
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid var(--surface-border);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, white 3%, transparent);
    z-index: 0;
  }
  :global(.map-root .leaflet-container) {
    font-family: var(--font-body), system-ui, sans-serif;
    background: var(--bg-mid);
  }
  :global(.map-root .leaflet-tile) {
    filter: saturate(0.92) contrast(0.98);
  }
  :global(.map-root .leaflet-control-zoom a) {
    background: color-mix(in srgb, var(--bg-soft) 92%, #fff);
    color: var(--text-primary);
    border-color: var(--surface-border) !important;
  }
  :global(.map-root .leaflet-control-attribution) {
    background: color-mix(in srgb, var(--bg-deep) 80%, transparent) !important;
    color: var(--text-tertiary) !important;
    font-size: 10px;
    max-width: 50%;
  }
  :global(.map-root .leaflet-control-attribution a) {
    color: var(--accent-cool) !important;
  }

  :global(.hm-ico) {
    background: none !important;
    border: none !important;
  }
  :global(.hm-ac) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    pointer-events: none;
  }
  :global(.hm-cs) {
    font-family: var(--font-mono), ui-monospace, monospace;
    font-size: 14px;
    font-weight: 600;
    color: #ffb87a;
    text-shadow: 0 0 3px #040811, 0 1px 2px #040811;
    white-space: nowrap;
  }
  :global(.hm-pl) {
    width: 26px;
    height: 26px;
    color: #7eb6ff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :global(.hm-pl svg) {
    display: block;
  }

  :global(.hm-home) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    pointer-events: none;
  }
  :global(.hm-home-dot) {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ffb87a;
    box-shadow: 0 0 0 1px #04081188, 0 0 6px #ffb87a55;
  }
  :global(.hm-home-t) {
    font-family: var(--font-mono), ui-monospace, monospace;
    font-size: 12px;
    color: #9fb0cc;
    text-shadow: 0 0 2px #040811;
  }
</style>
