/**
 * ASIOS Website — Docs Sidebar Interactivity
 * Adds click-to-toggle + a keyboard model on top of Sidebar.mjs's static render
 * (`.sidebar .group .group-label` + `<ul><li><a>`). Plain script, no bundler, same
 * DOMContentLoaded convention as tabs.js. Per 260907-009-gitbook-website-build-
 * recommendation.md §4.3: chevron toggles; collapse state remembered per session
 * (sessionStorage); arrow keys move, Enter opens, Left/Right collapse/expand.
 */
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const STORAGE_KEY = 'sidebar-open-groups';
  const groups = Array.from(sidebar.querySelectorAll('.group'));

  // Chevron glyph is decorative, not part of the group's identity — strip it so the
  // stored key is stable regardless of how the label is styled.
  function keyForGroup(group) {
    const label = group.querySelector(':scope > .group-label');
    return label ? label.textContent.replace(/[▸▾]/g, '').trim() : '';
  }

  function loadOpenKeys() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : null;
    } catch (err) {
      return null;
    }
  }

  function saveOpenKeys() {
    const openKeys = groups.filter((group) => group.classList.contains('open')).map(keyForGroup);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(openKeys));
    } catch (err) {
      // sessionStorage unavailable (private mode, quota) — collapse state just won't persist.
    }
  }

  // Restore session state on top of the server-rendered auto-expand-to-active baseline.
  // A null read (nothing stored yet) leaves the baseline untouched.
  const storedOpenKeys = loadOpenKeys();
  if (storedOpenKeys) {
    groups.forEach((group) => {
      group.classList.toggle('open', storedOpenKeys.has(keyForGroup(group)));
    });
  }

  function setOpen(group, open) {
    group.classList.toggle('open', open);
    saveOpenKeys();
  }

  function toggleGroup(group) {
    setOpen(group, !group.classList.contains('open'));
  }

  groups.forEach((group) => {
    const label = group.querySelector(':scope > .group-label');
    if (label) {
      label.addEventListener('click', () => toggleGroup(group));
    }
  });

  // A sidebar item is visible only if every closed ancestor group it sits under is not its
  // OWN group (a group's own label stays reachable even while the group itself is closed).
  function isVisible(el) {
    let ancestor = el.parentElement;
    while (ancestor && ancestor !== sidebar) {
      if (ancestor.classList && ancestor.classList.contains('group') && !ancestor.classList.contains('open')) {
        const ownLabel = ancestor.querySelector(':scope > .group-label');
        if (el !== ownLabel) return false;
      }
      ancestor = ancestor.parentElement;
    }
    return true;
  }

  function focusableItems() {
    return Array.from(sidebar.querySelectorAll('.group-label, a')).filter(isVisible);
  }

  function moveFocus(current, direction) {
    const items = focusableItems();
    const idx = items.indexOf(current);
    if (idx === -1) return;
    const next = items[idx + direction];
    if (next) next.focus();
  }

  sidebar.addEventListener('keydown', (event) => {
    const target = event.target;
    const isLabel = target.classList && target.classList.contains('group-label');
    const isLink = target.tagName === 'A';
    if (!isLabel && !isLink) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(target, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(target, -1);
        break;
      case 'Enter':
        if (isLabel) {
          event.preventDefault();
          toggleGroup(target.closest('.group'));
        }
        // Links: fall through to the browser's default navigation — no preventDefault.
        break;
      case 'ArrowLeft': {
        event.preventDefault();
        const group = target.closest('.group');
        if (isLabel && group.classList.contains('open')) {
          setOpen(group, false);
        } else {
          // Already collapsed (or a link) — move focus up to the enclosing group's label.
          const parentGroup = group.parentElement.closest('.group');
          const parentLabel = parentGroup && parentGroup.querySelector(':scope > .group-label');
          if (parentLabel) parentLabel.focus();
        }
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        if (isLabel) {
          const group = target.closest('.group');
          if (!group.classList.contains('open')) {
            setOpen(group, true);
          } else {
            moveFocus(target, 1);
          }
        }
        break;
      }
      default:
        break;
    }
  });
});
