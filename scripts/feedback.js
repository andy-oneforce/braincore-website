/**
 * ASIOS Website — Docs Feedback ("Was this page helpful?")
 * Progressive enhancement over Feedback.mjs: without this script the Yes / No buttons submit the
 * form as a plain urlencoded post and the function answers with a thank-you page. Here the vote goes
 * to /api/feedback as JSON instead, the result is announced in the aria-live status region, and both
 * buttons go inert once a vote lands (remembered per route in localStorage so a reload stays
 * thanked). Inert means aria-disabled, not `disabled`: a disabled button that has focus drops focus to
 * <body>, and a keyboard or screen-reader user loses their place. A failure re-enables the buttons and
 * shows an error. Plain script, no bundler, same
 * DOMContentLoaded convention as toc.js/page-actions.js, and a separate listener from all of them.
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-feedback]').forEach((form) => {
    const route = form.dataset.route || '';
    const endpoint = form.getAttribute('action') || '/api/feedback';
    const status = form.querySelector('.feedback__status');
    const buttons = Array.from(form.querySelectorAll('button[name="vote"]'));
    const storageKey = `feedback:${route}`;
    let busy = false;

    function setInert(inert) {
      buttons.forEach((button) => {
        if (inert) button.setAttribute('aria-disabled', 'true');
        else button.removeAttribute('aria-disabled');
      });
    }

    function say(text, isError) {
      if (!status) return;
      status.textContent = text;
      status.classList.toggle('is-error', Boolean(isError));
    }

    function lock(vote) {
      form.classList.add('is-done');
      setInert(true);
      buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.value === vote));
      });
    }

    function remembered() {
      try {
        return localStorage.getItem(storageKey);
      } catch (e) {
        return null;
      }
    }

    function remember(vote) {
      try {
        localStorage.setItem(storageKey, vote);
      } catch (e) {
        /* private mode / storage disabled — the on-page lock still applies */
      }
    }

    const earlier = remembered();
    if (earlier) {
      lock(earlier);
      say('Thanks for your feedback.');
    }

    form.addEventListener('submit', (event) => {
      const vote = event.submitter?.value;
      if (!route || !vote) return; // no submitter: let the plain post run
      event.preventDefault();
      if (busy || form.classList.contains('is-done')) return; // inert buttons still click: swallow it
      busy = true;
      setInert(true);
      say('Sending…');
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ route, vote }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          remember(vote);
          lock(vote);
          busy = false;
          say('Thanks for your feedback.');
        })
        .catch(() => {
          busy = false;
          setInert(false);
          say('Could not send your feedback. Please try again.', true);
        });
    });
  });
});
