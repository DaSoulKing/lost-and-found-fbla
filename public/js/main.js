// main.js - homepage only
// fetches the 3 most recent approved items and renders them
// in the "Recently found items" section

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('recent-items-grid');
  if (!grid) return; // only runs on index.html
  fetch('/api/items')
    .then(res => res.json())
    .then(items => {
      // API already returns newest-first, just take the first 3
      const recent = items.slice(0, 3);
      if (!recent.length) {
        grid.innerHTML = `
          <li style="grid-column:1/-1;text-align:center;color:var(--gray-400);padding:2rem;">
            No items posted yet. Check back soon!
          </li>`;
        return;
      }
      grid.innerHTML = recent.map(item => `
        <li>
          <article class="item-card" aria-label="${esc(item.title)}">
            ${item.photo_path
              ? `<img class="item-card-img" src="/${esc(item.photo_path)}" alt="Photo of ${esc(item.title)}" loading="lazy" />`
              : `<div class="item-card-img-placeholder" aria-hidden="true">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                     <rect x="2" y="3" width="20" height="14" rx="2"/>
                     <line x1="8" y1="21" x2="16" y2="21"/>
                     <line x1="12" y1="17" x2="12" y2="21"/>
                   </svg>
                 </div>`
            }
            <div class="item-card-body">
              <div class="item-card-meta">
                <span class="badge badge-gray">${esc(item.category)}</span>
                ${item.status === 'claimed'
                  ? '<span class="badge badge-green">Claimed</span>'
                  : '<span class="badge badge-amber">Available</span>'}
              </div>
              <h3 class="item-card-title">${esc(item.title)}</h3>
              <p class="item-card-desc">${esc(item.description)}</p>
              <div class="item-card-footer">
                <span class="item-card-date">Found ${fmtDate(item.date_found)}</span>
                ${item.status !== 'claimed'
                  ? `<a href="claim.html?id=${item.id}" class="btn btn-sm btn-secondary" aria-label="Claim ${esc(item.title)}">Claim</a>`
                  : `<span class="badge badge-green">Claimed</span>`}
              </div>
            </div>
          </article>
        </li>
      `).join('');
    })
    .catch(() => {
      grid.innerHTML = `
        <li style="grid-column:1/-1;text-align:center;color:var(--gray-400);padding:2rem;">
          Could not load recent items.
        </li>`;
    });
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmtDate(s) {
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
});