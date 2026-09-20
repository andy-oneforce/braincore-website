/**
 * ASIOS Website — Figure Zoom-on-Click
 * Wires every `.block-figure img[data-zoomable]` (markdown.mjs's figure renderer
 * ships light + dark `<img>` variants, R05 step 1/3) to open a full-viewport
 * lightbox overlay on click, showing whichever variant is currently visible
 * (CSS theme-swaps `.block-figure__light`/`.block-figure__dark` via display).
 * Plain script, no bundler, no dependency — same pattern as tabs.js/copy.js.
 */
document.addEventListener('DOMContentLoaded', () => {
  const zoomable = document.querySelectorAll('img[data-zoomable]');
  if (zoomable.length === 0) return;

  let overlay = null;
  let overlayImg = null;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'figure-zoom-overlay';
    overlayImg = document.createElement('img');
    overlayImg.className = 'figure-zoom-overlay__img';
    overlay.appendChild(overlayImg);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', close);
    return overlay;
  }

  function isVisible(img) {
    return img.currentSrc && window.getComputedStyle(img).display !== 'none';
  }

  function open(img) {
    ensureOverlay();
    overlayImg.src = img.currentSrc || img.src;
    overlayImg.alt = img.alt || '';
    overlay.classList.add('is-open');
  }

  function close() {
    if (overlay) overlay.classList.remove('is-open');
  }

  zoomable.forEach((img) => {
    img.addEventListener('click', () => {
      if (!isVisible(img)) return;
      open(img);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
});
