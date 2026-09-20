/**
 * ASIOS Website — Theme Switcher (light / dark / system)
 * Per 260907-009-gitbook-website-build-recommendation.md §6 Phase 7, step 7.3.
 * The no-flash half is a separate, non-deferred inline `<script>` in <head>
 * (ThemeToggle.mjs's renderThemeInitScript) that sets `data-theme="dark"` on
 * <html> before first paint; this file (deferred, loaded at the end of body
 * like every other script here) re-derives and re-applies the identical value
 * on load — same computation, so no second flash — then owns the toggle
 * button's click cycling and the live `prefers-color-scheme` listener while
 * in "system" mode. tokens.css's `:root` is already the light palette and
 * `[data-theme="dark"]` (plus blocks.css's `--shiki-dark`/`--shiki-dark-bg`
 * overrides) is the only other branch, so Shiki code blocks stay synced with
 * no extra wiring — flipping the one attribute is the whole effect.
 */
document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'asios-theme';
  const ORDER = ['light', 'dark', 'system'];
  const LABELS = { light: 'Light theme', dark: 'Dark theme', system: 'System theme' };
  const ICONS = { light: '☀️', dark: '🌙', system: '🌓' };
  const mql = window.matchMedia('(prefers-color-scheme: dark)');

  function getPreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return ORDER.includes(stored) ? stored : 'system';
    } catch (e) {
      return 'system';
    }
  }

  function setPreference(pref) {
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch (e) {
      // Storage unavailable (private mode / sandboxed) — theme still applies for this load.
    }
  }

  function updateToggle(pref) {
    const btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return;
    btn.textContent = ICONS[pref];
    btn.setAttribute('data-theme-state', pref);
    btn.setAttribute('aria-label', `${LABELS[pref]} — click to change`);
  }

  function apply(pref) {
    const isDark = pref === 'dark' || (pref === 'system' && mql.matches);
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    updateToggle(pref);
  }

  apply(getPreference());

  // Only reacts while the user's stored preference is "system" — an explicit
  // light/dark choice is not overridden by an OS-level change.
  mql.addEventListener('change', () => {
    if (getPreference() === 'system') apply('system');
  });

  document.addEventListener('click', (event) => {
    const btn = event.target.closest && event.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const next = ORDER[(ORDER.indexOf(getPreference()) + 1) % ORDER.length];
    setPreference(next);
    apply(next);
  });
});
