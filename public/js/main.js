// main.js

document.addEventListener('DOMContentLoaded', () => {

  // hamburger drawer
  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  // inject the backdrop div once
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(backdrop);

  function openMenu() {
    navLinks.classList.add('open');
    backdrop.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navLinks.classList.remove('open');
    backdrop.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.contains('open') ? closeMenu() : openMenu();
    });

    backdrop.addEventListener('click', closeMenu);

    // close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // recent items grid (index.html only)
  const grid = document.getElementById('recent-items-grid');
  if (!grid) return;

  fetch('/api/items')
    .then(res => res.json())
    .then(items => {
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
