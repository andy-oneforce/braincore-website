export function renderThemeToggle() {
  return `<button type="button" class="theme-toggle" data-theme-toggle aria-label="Toggle theme">🌓</button>`;
}

// Inline, non-deferred, blocking script — must run before the browser paints, so it goes as
// early as possible in <head>, ahead of every stylesheet link. It only ever sets
// `data-theme="dark"` (or leaves the attribute absent for light) since tokens.css's `:root` is
// already the light palette and only `[data-theme="dark"]` carries overrides (theme.js §R03) —
// so a "light" preference needs no attribute at all, and this stays a one-branch, try/catch-safe
// IIFE cheap enough to block on. theme.js (deferred, loaded at the end of body like every other
// script here) re-derives and applies the exact same value on load, so there is no second flash,
// then owns the toggle button's click cycling and the live `prefers-color-scheme` listener.
export function renderThemeInitScript() {
  return `<script>(function(){try{var p=localStorage.getItem('asios-theme')||'system';var dark=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();</script>`;
}
