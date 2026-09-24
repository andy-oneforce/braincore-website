/**
 * ASIOS Website — Mobile Sidebar Drawer
 * Turns the docs sidebar into an overlay drawer on narrow viewports: hamburger
 * toggle, backdrop, Esc to close, and a focus trap while open. Plain script, no
 * bundler, same DOMContentLoaded convention as sidebar.js/tabs.js. This is a
 * SEPARATE keydown listener from sidebar.js's own `.sidebar` keydown handler
 * (ArrowUp/Down/Enter/Left/Right) — it does not touch that listener or its state.
 * Per 260907-009-gitbook-website-build-recommendation.md §4.3: "Hamburger opens
 * sidebar as an overlay drawer with backdrop, focus trap, Esc closes."
 */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('drawer-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!toggle || !sidebar || !backdrop) return;

  function focusableItems() {
    return Array.from(sidebar.querySelectorAll('a, [tabindex="0"]'));
  }

  function isOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  function openDrawer() {
    sidebar.classList.add('drawer-open');
    backdrop.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    const items = focusableItems();
    if (items.length) items[0].focus();
  }

  function closeDrawer() {
    sidebar.classList.remove('drawer-open');
    backdrop.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  toggle.addEventListener('click', () => {
    if (isOpen()) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  backdrop.addEventListener('click', () => {
    closeDrawer();
  });

  // Active only while the drawer is open — leaves sidebar.js's own `.sidebar`
  // keydown listener (arrow-key navigation) completely untouched.
  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }

    if (event.key === 'Tab') {
      const items = focusableItems();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !sidebar.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !sidebar.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  });
});
