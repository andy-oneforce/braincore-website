/**
 * ASIOS Website — Docs Page Actions ("Copy as Markdown")
 * Progressive enhancement over PageActions.mjs: the two Open-in-Claude/ChatGPT links are plain
 * anchors and need nothing from here; the Copy button ships `hidden` and is revealed here. A click
 * fetches the page's raw Markdown (the button's `data-md-src`, written by build.mjs), writes it to
 * the clipboard and swaps the label to "Copied" for ~2s. If the Clipboard API is unavailable (an
 * insecure context, an old browser) or the copy/fetch fails, a visible message with a link to the
 * raw Markdown replaces the silent no-op. Plain script, no bundler, same DOMContentLoaded
 * convention as sidebar.js/drawer.js/toc.js, and a separate listener from all of them.
 */
document.addEventListener('DOMContentLoaded', () => {
  const RESET_MS = 2000;

  document.querySelectorAll('[data-page-actions-copy]').forEach((button) => {
    const src = button.dataset.mdSrc || '';
    const status = button.closest('.page-actions')?.querySelector('.page-actions__status');
    const idleLabel = button.textContent;
    let resetTimer = 0;

    button.hidden = false;

    function showMessage(text) {
      if (!status) return;
      status.textContent = text;
    }

    function showFailure(text) {
      if (!status) return;
      status.textContent = `${text} `;
      const link = document.createElement('a');
      link.href = src;
      link.textContent = 'Open the raw Markdown';
      status.appendChild(link);
    }

    function flashCopied() {
      // "Copied" is shorter than the idle label; pin the idle width so the row does not shift under the pointer.
      if (!button.style.minWidth) button.style.minWidth = `${button.getBoundingClientRect().width}px`;
      button.textContent = 'Copied';
      button.setAttribute('aria-label', 'Copied');
      button.classList.add('is-copied');
      showMessage('Copied page Markdown to the clipboard.');
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        button.textContent = idleLabel;
        button.setAttribute('aria-label', idleLabel);
        button.classList.remove('is-copied');
        showMessage('');
      }, RESET_MS);
    }

    // Fetches the raw Markdown. Rejects on a non-2xx so the failure path is one place.
    function fetchMarkdown() {
      return fetch(src).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      });
    }

    // Safari only honours a clipboard write started inside the click, so where ClipboardItem exists
    // the write is opened synchronously with the fetch as a pending blob; writeText() is the
    // fallback for browsers without it.
    function copy() {
      if (window.ClipboardItem && navigator.clipboard.write) {
        const blob = fetchMarkdown().then((text) => new Blob([text], { type: 'text/plain' }));
        return navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      }
      return fetchMarkdown().then((text) => navigator.clipboard.writeText(text));
    }

    button.addEventListener('click', () => {
      if (!src) return;
      if (!navigator.clipboard) {
        showFailure('Copying is not available in this browser.');
        return;
      }
      copy().then(flashCopied, () => showFailure('Could not copy this page.'));
    });
  });
});
