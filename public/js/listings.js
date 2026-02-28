// listings.js - fetches items from the API and renders cards
// also handles live keyword search and category filter

document.addEventListener('DOMContentLoaded', () => {

  const grid        = document.getElementById('items-grid');
  const countEl     = document.getElementById('results-count');
  const searchInput = document.getElementById('search-input');
  const searchBtn   = document.getElementById('search-btn');
  const catFilter   = document.getElementById('filter-category');

  fetchItems();

  searchBtn.addEventListener('click', fetchItems);
  catFilter.addEventListener('change', fetchItems);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchItems();
  });


  async function fetchItems() {
    grid.innerHTML = `<li class="loading-state" aria-live="polite"><p>Loading items...</p></li>`;
    countEl.textContent = '';

    const search   = searchInput.value.trim();
    const category = catFilter.value;

    const params = new URLSearchParams();
    if (search)   params.set('search', search);
    if (category) params.set('category', category);

    try {
      const res  = await fetch(`/api/items?${params}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const items = await res.json();
      renderItems(items);
    } catch (err) {
      console.error('Failed to load items:', err.message);
      grid.innerHTML = `
        <li class="empty-state">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Could not load items. Make sure the server is running.</p>
        </li>`;
      countEl.textContent = '';
    }
  }


  function renderItems(items) {
    countEl.textContent = `Showing ${items.length} item${items.length !== 1 ? 's' : ''}`;

    if (!items.length) {
      grid.innerHTML = `
        <li class="empty-state" style="grid-column:1/-1">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor">
            <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
          </svg>
          <p>No items found matching your search.</p>
        </li>`;
      return;
    }

    grid.innerHTML = items.map(item => `
      <li>
        <article class="item-card" aria-label="${escHtml(item.title)}">
          ${item.photo_path
            ? `<img class="item-card-img" src="/${escHtml(item.photo_path)}" alt="Photo of ${escHtml(item.title)}" loading="lazy" />`
            : `<div class="item-card-img-placeholder" aria-hidden="true">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
               </div>`
          }
          <div class="item-card-body">
            <div class="item-card-meta">
              <span class="badge badge-gray">${escHtml(item.category)}</span>
              ${item.status === 'claimed' ? '<span class="badge badge-green">Claimed</span>' : '<span class="badge badge-amber">Available</span>'}
            </div>
            <h3 class="item-card-title">${escHtml(item.title)}</h3>
            <p class="item-card-desc">${escHtml(item.description)}</p>
            <div class="item-card-footer">
              <span class="item-card-date">Found ${formatDate(item.date_found)}</span>
              ${item.status !== 'claimed'
                ? `<a href="claim.html?id=${item.id}" class="btn btn-sm btn-secondary" aria-label="Claim ${escHtml(item.title)}">Claim</a>`
                : `<span class="badge badge-green">Already claimed</span>`
              }
            </div>
          </div>
        </article>
      </li>
    `).join('');
  }


  // prevent XSS when inserting user content into HTML
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

});