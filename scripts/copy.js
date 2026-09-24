/**
 * ASIOS Website — Code Block Copy Button
 * Wires each `.block-code__copy` button (markdown.mjs's Shiki fence renderer)
 * to copy its `data-code` attribute — plain code only, no line-number gutter
 * (a CSS counter, never in the DOM text) and no diff `+`/`-` marker (stripped
 * before Shiki sees it) — to the clipboard, showing a check icon for 1.5s.
 */
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.block-code__copy');
  buttons.forEach((button) => {
    let resetTimer = null;
    button.addEventListener('click', () => {
      const code = button.dataset.code || '';
      navigator.clipboard.writeText(code).then(() => {
        button.classList.add('is-copied');
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          button.classList.remove('is-copied');
          resetTimer = null;
        }, 1500);
      });
    });
  });
});
