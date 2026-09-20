/**
 * ASIOS Website — Docs "On this page" Scroll-Spy
 * Progressive enhancement over Toc.mjs's static render: the same list of `#id` anchor links is
 * emitted twice (`nav.toc` rail, `details.toc-dropdown` below the tablet break), and without this
 * script both are already a working list of anchors. Here: ONE IntersectionObserver over the
 * article's H2/H3 (no scroll listener) marks the heading currently in view — `aria-current="true"`
 * + `.active` on its link in both renders; link clicks scroll smoothly (instant under
 * prefers-reduced-motion); hash navigation and a hash on first load update the active item; the
 * dropdown closes after a pick. Plain script, no bundler, same DOMContentLoaded convention as
 * sidebar.js/drawer.js, and a separate listener set from both.
 */
document.addEventListener('DOMContentLoaded', () => {
  const rail = document.querySelector('nav.toc');
  const dropdown = document.querySelector('.toc-dropdown');
  if (!rail && !dropdown) return;

  // id -> every link pointing at it (rail + dropdown), and id -> heading element.
  const linksById = new Map();
  const headings = [];
  document.querySelectorAll('.toc a[href^="#"], .toc-dropdown a[href^="#"]').forEach((link) => {
    const id = idFromHash(link.getAttribute('href'));
    if (!id) return;
    if (!linksById.has(id)) {
      linksById.set(id, []);
      const heading = document.getElementById(id);
      if (heading) headings.push(heading);
    }
    linksById.get(id).push(link);
  });
  if (!headings.length) return;
  // Document order, so "the last heading above the line" is the last element that qualifies.
  headings.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeId = null;
  let pinned = false; // a click/hash target is settling: geometry must not overwrite it mid-scroll
  let pinTimer = 0;

  function idFromHash(hash) {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw) return '';
    try {
      return decodeURIComponent(raw);
    } catch (err) {
      return raw;
    }
  }

  // Keep the active rail link inside the rail's own scroll box. Adjusts the rail's scrollTop
  // directly — scrollIntoView would also scroll the page.
  function revealInRail(link) {
    if (!rail || !rail.contains(link) || rail.offsetParent === null) return;
    const box = rail.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (item.top < box.top) rail.scrollTop -= box.top - item.top;
    else if (item.bottom > box.bottom) rail.scrollTop += item.bottom - box.bottom;
  }

  function setActive(id) {
    if (id === activeId) return;
    if (activeId) {
      (linksById.get(activeId) || []).forEach((link) => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      });
    }
    activeId = id;
    if (!id) return;
    (linksById.get(id) || []).forEach((link) => {
      link.classList.add('active');
      link.setAttribute('aria-current', 'true');
      revealInRail(link);
    });
  }

  // Active = the last heading whose top has reached the line ~30% down the viewport. Stateless,
  // so a heading skipped by a fast flick between two observer callbacks is still resolved by the
  // next one.
  function recompute() {
    if (pinned) return;
    const line = window.innerHeight * 0.3;
    let current = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= line) current = heading;
      else break;
    }
    setActive(current ? current.id : null);
  }

  // The observed band runs from just under the sticky header (the headings' own scroll-margin-top)
  // to 30% down the viewport; a heading entering or leaving it is what wakes recompute().
  const topInset = parseFloat(getComputedStyle(headings[0]).scrollMarginTop) || 0;
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(recompute, {
      rootMargin: `-${topInset}px 0px -70% 0px`,
    });
    headings.forEach((heading) => observer.observe(heading));
  }

  // Pin the active item to a click/hash target until the scroll it triggered has settled.
  function pin(id) {
    pinned = true;
    setActive(id);
    clearTimeout(pinTimer);
    const settle = () => {
      clearTimeout(pinTimer);
      window.removeEventListener('scrollend', settle);
      pinned = false;
    };
    pinTimer = setTimeout(settle, 1200);
    if ('onscrollend' in window) window.addEventListener('scrollend', settle, { once: true });
  }

  [rail, dropdown].forEach((el) => {
    if (el) el.addEventListener('click', onLinkClick);
  });

  function onLinkClick(event) {
    const link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented) return;
    // Leave modified clicks (new tab, etc.) to the browser.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
    const id = idFromHash(link.getAttribute('href'));
    const heading = id && document.getElementById(id);
    if (!heading) return;
    event.preventDefault();
    // Close the tablet dropdown first so the collapse is laid out before the scroll is computed.
    if (dropdown && dropdown.contains(link)) dropdown.open = false;
    pin(id);
    heading.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', `#${link.getAttribute('href').slice(1)}`);
    // Take over the focus/skip-link behaviour the cancelled default navigation would have given.
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }

  // Back/forward and any other hash change (the browser does the scrolling).
  window.addEventListener('hashchange', () => {
    const id = idFromHash(location.hash);
    if (id && linksById.has(id)) pin(id);
    else recompute();
  });

  // First load with a hash: the browser scrolls to it itself; just reflect it in the Toc.
  const initialId = idFromHash(location.hash);
  if (initialId && linksById.has(initialId)) pin(initialId);
  else recompute();
});
