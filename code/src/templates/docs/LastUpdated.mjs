// Docs "Last updated" stamp — a <time> with the full ISO commit date in `datetime` and a readable
// date as its text. The readable date is the date part of the ISO string itself (the committer's own
// calendar day, what `git log -1 --format=%cs` prints), so it never shifts with the build machine's
// timezone. Returns '' when there is no date (untracked or gitignored source, no git), so callers
// can interpolate it unconditionally; the docs footer drops the Edit link in the same case
// (EditLink.mjs) and omits the whole .page-meta footer when both are absent.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function readable(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return '';
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${Number(match[3])}, ${match[1]}` : '';
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderLastUpdated(iso) {
  const text = iso ? readable(iso) : '';
  if (!text) return '';
  return `<p class="last-updated">Last updated <time datetime="${escapeAttr(iso)}">${text}</time></p>`;
}
