/**
 * ASIOS Website — Tabs Block Interactivity
 * Builds the switcher UI for `.block-tabs` (markdown.mjs's `tabs`/`tab` directive
 * output ships panels only, no tablist). Plain script, no bundler, no dependency
 * on the Phase 2 esbuild/islands pipeline. Per 260907-009-gitbook-website-build-
 * recommendation.md §4.3 "synced tablist".
 */
document.addEventListener('DOMContentLoaded', () => {
  const groups = document.querySelectorAll('.block-tabs');
  groups.forEach((group) => {
    const panels = Array.from(group.children).filter((child) =>
      child.classList.contains('block-tabs__tab')
    );
    if (panels.length === 0) return;

    const list = document.createElement('div');
    list.className = 'block-tabs__list';
    list.setAttribute('role', 'tablist');

    const buttons = panels.map((panel, i) => {
      const label = panel.getAttribute('data-label') || `Tab ${i + 1}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'block-tabs__button';
      button.setAttribute('role', 'tab');
      button.textContent = label;
      list.appendChild(button);
      return button;
    });

    group.insertBefore(list, panels[0]);

    function activate(index) {
      buttons.forEach((button, i) => {
        button.classList.toggle('is-active', i === index);
        button.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
      panels.forEach((panel, i) => {
        panel.classList.toggle('is-active', i === index);
      });
    }

    buttons.forEach((button, i) => {
      button.addEventListener('click', () => activate(i));
    });

    activate(0);
  });
});
