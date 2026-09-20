// Docs "Edit this page" link — points at the page's source Markdown on the repo's main branch:
//   <edit_link.repo_url>/blob/<edit_link.branch>/<the file's path from the repo root>
// `edit_link` in data/asios/site.config.json carries the repo URL and branch; the path is the
// file's own path in that repo (render/git-dates.mjs repoPath). The link is only rendered for a
// source that has a commit (`lastCommit`, the same ISO date LastUpdated shows): a page whose source
// is untracked or gitignored has nothing on the branch, so the URL would 404. Returns '' when the
// commit, the path or the `edit_link` config is missing, so callers can interpolate it
// unconditionally — and the link switches on by itself once the source is committed.

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderEditLink(sourcePath, editConfig, lastCommit) {
  const repoUrl = editConfig && typeof editConfig.repo_url === 'string' ? editConfig.repo_url.replace(/\/+$/, '') : '';
  if (!lastCommit || !sourcePath || !repoUrl) return '';
  const branch = (editConfig && editConfig.branch) || 'main';
  const href = `${repoUrl}/blob/${encodeURIComponent(branch)}/${sourcePath.split('/').map(encodeURIComponent).join('/')}`;
  return `<p class="edit-link"><a href="${escapeAttr(href)}" rel="noopener">Edit this page</a></p>`;
}
