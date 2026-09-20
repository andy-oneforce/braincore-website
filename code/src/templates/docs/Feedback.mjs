// Docs "Was this page helpful?" widget — two real submit buttons (Yes / No) in a form that posts to
// the Pages Function at /api/feedback (functions/api/feedback.js). The form is a working no-JS
// fallback: without scripts it posts urlencoded and the function answers with a small thank-you page.
// scripts/feedback.js upgrades it in place (JSON post, inline status, buttons disabled after a vote).
// The page route travels in `data-route` (read by the script) and in a hidden `route` field (read by
// the no-JS post). No PII is collected — a route and a yes/no vote only. Docs only; returns '' when
// the route is not a `.html` page.

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderFeedback(urlPath) {
  if (!/\.html$/.test(String(urlPath || ''))) return '';
  const route = escapeAttr(urlPath);
  return `<form class="feedback" method="post" action="/api/feedback" data-feedback data-route="${route}">
<input type="hidden" name="route" value="${route}">
<span class="feedback__question" id="feedback-question">Was this page helpful?</span>
<div class="feedback__actions" role="group" aria-labelledby="feedback-question">
<button type="submit" class="feedback__btn" name="vote" value="yes">Yes</button>
<button type="submit" class="feedback__btn" name="vote" value="no">No</button>
</div>
<span class="feedback__status" role="status" aria-live="polite"></span>
</form>
`;
}
