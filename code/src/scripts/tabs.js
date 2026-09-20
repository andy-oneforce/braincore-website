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
      const buttonId = panel.id ? `tab-${panel.id.replace(/^tabpanel-/, '')}` : `tab-${i}`;
      button.id = buttonId;
      if (panel.id) button.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', buttonId);
      button.textContent = label;
      list.appendChild(button);
      return button;
    });

    group.insertBefore(list, panels[0]);

    function activate(index) {
      buttons.forEach((button, i) => {
        const selected = i === index;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-selected', selected ? 'true' : 'false');
        button.tabIndex = selected ? 0 : -1;
      });
      panels.forEach((panel, i) => {
        const selected = i === index;
        panel.classList.toggle('is-active', selected);
        panel.hidden = !selected;
      });
    }

    buttons.forEach((button, i) => {
      button.addEventListener('click', () => activate(i));
    });

    list.addEventListener('keydown', (event) => {
      const currentIndex = buttons.indexOf(document.activeElement);
      if (currentIndex === -1) return;
      let nextIndex = null;
      switch (event.key) {
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          break;
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % buttons.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = buttons.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      activate(nextIndex);
      buttons[nextIndex].focus();
    });

    activate(0);
  });
});
