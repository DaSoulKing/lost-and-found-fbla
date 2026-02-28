// admin.js - admin dashboard logic
// handles: login gate, stats fetch, item + claim tables,
//          approve / reject / delete actions

document.addEventListener('DOMContentLoaded', () => {

  // one function handles all admin API calls so the auth header
  // is always included and never accidentally dropped.
  // json:true automatically adds Content-Type: application/json
  async function apiFetch(url, { method = 'GET', json = false, body } = {}) {
    const headers = { 'x-admin-key': getAdminKey() };
    if (json) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body !== undefined) opts.body = body;

    return fetch(url, opts);
  }


  // check sessionStorage first, if no key exists show the overlay
  if (!getAdminKey()) {
    showLoginOverlay();
  } else {
    initDashboard();
  }

  function showLoginOverlay() {
  const overlay   = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const errorEl   = document.getElementById('login-error');

  if (loginForm && !loginForm.dataset.prevented) {
    loginForm.dataset.prevented = 'true';
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      attemptLogin();
    });
  }

  if (overlay) overlay.hidden = false;

  async function attemptLogin() {
    if (errorEl) errorEl.hidden = true;

    const key = document.getElementById('admin-key-input').value.trim();
    if (!key) return;

    try {
      const res = await fetch('/api/admin/stats', { headers: { 'x-admin-key': key } });
      if (res.ok) {
        setAdminKey(key);
        if (overlay) overlay.hidden = true;
        initDashboard();
      } else {
        if (errorEl) errorEl.hidden = false;
      }
    } catch (_) {
      if (errorEl) errorEl.hidden = false;
    }
  }
}


  async function initDashboard() {
    const overlay   = document.getElementById('login-overlay');
    const dashboard = document.getElementById('admin-dashboard');

    //if (overlay)   overlay.hidden   = true;
    //if (dashboard) dashboard.hidden = false;

    if (overlay)   overlay.style.display = 'none';
    if (dashboard) dashboard.hidden = false;    

    await Promise.all([
      loadStats(),
      loadPendingItems(),
      loadPendingClaims(),
      loadAllItems(),
    ]);
  }


  async function loadStats() {
    try {
      const res = await apiFetch('/api/admin/stats');

      // 401 means the stored key is wrong, clear it and re-prompt
      if (res.status === 401) { clearAdminKey(); showLoginOverlay(); return; }
      if (!res.ok) return;

      const data = await res.json();
      setText('stat-total',   data.total      || 0);
      setText('stat-pending', data.pending     || 0);
      setText('stat-claimed', data.claimed     || 0);
      setText('stat-claims',  data.open_claims || 0);
      setText('badge-pending-items',  data.pending     || 0);
      setText('badge-pending-claims', data.open_claims || 0);
    } catch (err) {
      console.error('loadStats failed:', err.message);
    }
  }


  async function loadPendingItems() {
    const tbody = document.getElementById('pending-items-body');
    if (!tbody) return;

    try {
      const res = await apiFetch('/api/admin/items?status=pending');
      if (!res.ok) return;
      const items = await res.json();

      if (!items.length) {
        tbody.innerHTML = noDataRow(6, "No pending items. You're all caught up.");
        return;
      }

      tbody.innerHTML = items.map(item => `
        <tr>
          <td>
            <div class="table-item-cell">
              ${item.photo_path
                ? `<img class="item-thumb" src="/${escHtml(item.photo_path)}" alt="" />`
                : `<div class="item-thumb-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/></svg></div>`
              }
              <div>
                <div class="table-item-name">${escHtml(item.title)}</div>
                <div class="table-item-desc">${escHtml((item.description || '').substring(0, 60))}...</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-gray">${escHtml(item.category)}</span></td>
          <td class="hide-mobile">${escHtml(item.location_found)}</td>
          <td class="hide-mobile">${formatDate(item.date_found)}</td>
          <td>${timeAgo(item.created_at)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-primary" data-action="approve" data-id="${item.id}" aria-label="Approve ${escHtml(item.title)}">Approve</button>
              <button class="btn btn-sm btn-ghost"   data-action="reject"  data-id="${item.id}" aria-label="Reject ${escHtml(item.title)}">Reject</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('loadPendingItems failed:', err.message);
    }
  }


  async function loadPendingClaims() {
    const tbody = document.getElementById('pending-claims-body');
    if (!tbody) return;

    try {
      const res = await apiFetch('/api/admin/claims?status=pending');
      if (!res.ok) return;
      const claims = await res.json();

      if (!claims.length) {
        tbody.innerHTML = noDataRow(5, 'No pending claims.');
        return;
      }

      tbody.innerHTML = claims.map(claim => `
        <tr>
          <td>
            <div class="table-item-name">${escHtml(claim.item_title)}</div>
            <div class="table-item-desc">ID #${claim.item_id}</div>
          </td>
          <td>
            <div class="table-item-name">${escHtml(claim.claimant_name)}</div>
            <div class="table-item-desc">${escHtml(claim.claimant_email)}</div>
          </td>
          <td class="hide-mobile">
            <div class="verify-answer-cell">
              <div class="verify-q">Q: ${escHtml(claim.verification_question || 'N/A')}</div>
              <div class="verify-a">"${escHtml(claim.verification_answer || 'No answer')}"</div>
            </div>
          </td>
          <td>${timeAgo(claim.created_at)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-primary" data-action="approve-claim" data-id="${claim.id}" aria-label="Approve claim by ${escHtml(claim.claimant_name)}">Approve</button>
              <button class="btn btn-sm btn-ghost"   data-action="reject-claim"  data-id="${claim.id}" aria-label="Reject claim by ${escHtml(claim.claimant_name)}">Reject</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('loadPendingClaims failed:', err.message);
    }
  }


  async function loadAllItems(search = '', status = '') {
    const tbody = document.getElementById('all-items-body');
    if (!tbody) return;

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const res = await apiFetch(`/api/admin/items?${params}`);
      if (!res.ok) return;
      const items = await res.json();

      tbody.innerHTML = items.map(item => `
        <tr>
          <td><div class="table-item-name">${escHtml(item.title)}</div></td>
          <td><span class="badge badge-gray">${escHtml(item.category)}</span></td>
          <td class="hide-mobile">${escHtml(item.location_found)}</td>
          <td>${statusBadge(item.status)}</td>
          <td class="hide-mobile">${formatDate(item.date_found)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-ghost" data-action="delete" data-id="${item.id}" aria-label="Delete ${escHtml(item.title)}">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('loadAllItems failed:', err.message);
    }
  }


  // event delegation for all the action buttons
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'approve')       await updateItemStatus(id, 'approved');
    if (action === 'reject')        await updateItemStatus(id, 'rejected');
    if (action === 'delete')        await deleteItem(id, btn.closest('tr'));
    if (action === 'approve-claim') await updateClaimStatus(id, 'approved');
    if (action === 'reject-claim')  await updateClaimStatus(id, 'rejected');
  });

  async function updateItemStatus(id, status) {
    try {
      const res = await apiFetch(`/api/admin/items/${id}`, {
        method: 'PATCH',
        json:   true,
        body:   JSON.stringify({ status }),
      });
      if (res.ok) await Promise.all([loadStats(), loadPendingItems(), loadAllItems()]);
    } catch (err) {
      console.error('updateItemStatus failed:', err.message);
    }
  }

  async function updateClaimStatus(id, status) {
    try {
      const res = await apiFetch(`/api/admin/claims/${id}`, {
        method: 'PATCH',
        json:   true,
        body:   JSON.stringify({ status }),
      });
      if (res.ok) await Promise.all([loadStats(), loadPendingClaims(), loadAllItems()]);
    } catch (err) {
      console.error('updateClaimStatus failed:', err.message);
    }
  }

  async function deleteItem(id, row) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try {
      const res = await apiFetch(`/api/admin/items/${id}`, { method: 'DELETE' });
      if (res.ok) { row?.remove(); await loadStats(); }
    } catch (err) {
      console.error('deleteItem failed:', err.message);
    }
  }


  // search/filter wiring for the all items table
  const allSearch = document.getElementById('admin-search');
  const allStatus = document.getElementById('admin-filter-status');
  if (allSearch) allSearch.addEventListener('input',  () => loadAllItems(allSearch.value, allStatus?.value));
  if (allStatus) allStatus.addEventListener('change', () => loadAllItems(allSearch?.value, allStatus.value));


  // logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAdminKey();
      window.location.href = '/index.html';  // redirect
    });
  }


  // sidebar smooth scroll
  document.querySelectorAll('.admin-nav a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('.admin-nav a').forEach(l => { l.classList.remove('active'); l.removeAttribute('aria-current'); });
      a.classList.add('active');
      a.setAttribute('aria-current', 'true');
    });
  });


  // utilities

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function noDataRow(cols, msg) {
    return `<tr><td colspan="${cols}" style="text-align:center;color:var(--gray-400);padding:2rem;">${msg}</td></tr>`;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 60)   return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  }

  function statusBadge(status) {
    const cls = { pending: 'badge-amber', approved: 'badge-green', claimed: 'badge-green', rejected: 'badge-red' };
    return `<span class="badge ${cls[status] || 'badge-gray'}">${status}</span>`;
  }

  // admin key stored in sessionStorage (browser only, clears when tab closes)
  function setAdminKey(key) {
    sessionStorage.setItem('adminKey', key);
  }

  function getAdminKey() {
    return sessionStorage.getItem('adminKey');
  }

  function clearAdminKey() {
    sessionStorage.removeItem('adminKey');
  }

});