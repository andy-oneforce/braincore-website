/**
 * ASIOS Website — Scroll Reveal
 * Marketing pages only. Fades and lifts every [data-animate] section into view the first
 * time it crosses 15% visibility, then stops watching it (fires once). Plain script, no
 * bundler, same DOMContentLoaded convention as drawer.js/sidebar.js.
 *
 * Progressive enhancement: the hidden starting state lives in marketing.css under
 * `.reveal-ready`, and THIS script is the only thing that adds that class. With JS off, an
 * old browser (no IntersectionObserver) or prefers-reduced-motion, it returns early and
 * nothing is ever hidden. Per 260907-009-gitbook-website-build-recommendation.md §5.7.
 */
(function () {
  var MAX_STAGGER_INDEX = 6;
  // Direct grid children that stagger in one after another (mirrors marketing.css).
  var STAGGER_CHILDREN =
    '.container > .feature, .plans > .plan, .testimonial-track > *, .logo-strip-list > li';
  // reveal duration (500ms) + the longest stagger delay (6 x 60ms) + slack, in ms.
  var SETTLE_MS = 1000;

  function init() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    var targets = document.querySelectorAll('[data-animate]');
    if (!targets.length) return;

    // Classify before the hiding class lands: sections with grid children animate the
    // children (staggered) rather than the section box as a whole.
    Array.prototype.forEach.call(targets, function (el) {
      if (el.querySelector(STAGGER_CHILDREN)) el.classList.add('reveal-stagger');
    });

    document.documentElement.classList.add('reveal-ready');

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          observer.unobserve(el);
          if (el.classList.contains('reveal-stagger')) {
            Array.prototype.forEach.call(el.querySelectorAll(STAGGER_CHILDREN), function (child, i) {
              child.style.setProperty('--i', Math.min(i, MAX_STAGGER_INDEX));
            });
            // Once settled, drop the reveal transitions so card hover effects regain their
            // own (undelayed) timing.
            setTimeout(function () {
              el.classList.add('reveal-done');
            }, SETTLE_MS);
          }
          el.classList.add('is-visible');
        });
      },
      { threshold: 0.15 }
    );

    Array.prototype.forEach.call(targets, function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
