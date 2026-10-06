/* ============================================================
   Admin dashboard — talks only to the serverless API
   (api/admin.js). Requires the ADMIN_PASSWORD secret on the
   server; never touches service-account keys in the browser.
   ============================================================ */

(function () {
  'use strict';

  const U = window.UDUFUtil;
  if (!U) return;

  const API = '/api/admin';
  const tokenKey = 'uduf.admin.token.v1';

  const loginBox = document.getElementById('admin-login');
  const panel = document.getElementById('admin-panel');
  const listHost = document.getElementById('admin-list');
  const statHost = document.getElementById('admin-stat');
  const pwdInput = document.getElementById('admin-password');
  const checkinPanel = document.getElementById('checkin-panel');

  let currentTab = 'pending_verification';
  let rows = [];

  /* ---------------- helpers ---------------- */

  function escaped(s) {
    return U.escapeHtml(s);
  }

  function token() {
    try {
      return sessionStorage.getItem(tokenKey) || '';
    } catch {
      return '';
    }
  }

  function setToken(t) {
    try {
      if (t) sessionStorage.setItem(tokenKey, t);
      else sessionStorage.removeItem(tokenKey);
    } catch {}
  }

  async function api(action, opts) {
    const method = (opts && opts.method) || 'GET';
    const params = new URLSearchParams({ action });
    if (opts && opts.params) Object.keys(opts.params).forEach((k) => params.set(k, opts.params[k]));
    const res = await fetch(`${API}?${params.toString()}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': token(),
      },
      body: opts && opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = { ok: false, message: 'Unexpected server response.' };
    }
    if (res.status === 401) {
      setToken('');
      showLogin('Your session has expired. Please sign in again.');
      throw new Error('unauthorized');
    }
    if (!data.ok) {
      const err = new Error(data.message || 'Request failed.');
      err.data = data;
      throw err;
    }
    return data;
  }

  /* ---------------- login / logout ---------------- */

  function showLogin(message) {
    loginBox.hidden = false;
    panel.hidden = true;
    if (message && pwdInput) {
      pwdInput.focus();
      U.toast(message, 'error');
    }
  }

  async function doLogin() {
    const pw = pwdInput ? pwdInput.value.trim() : '';
    if (!pw) {
      U.toast('Please enter the admin password.', 'error');
      return;
    }
    setToken(pw);
    try {
      const res = await api('list', { params: { status: 'pending_verification' } });
      rows = res.rows || [];
      loginBox.hidden = true;
      panel.hidden = false;
      renderTabs();
      renderList();
      U.toast('Signed in.', 'ok');
    } catch (err) {
      U.toast(err.message || 'Sign-in failed.', 'error');
    }
  }

  /* ---------------- tabs ---------------- */

  function renderTabs() {
    document.querySelectorAll('[data-tab]').forEach((tab) => {
      tab.classList.toggle('is-active', tab.getAttribute('data-tab') === currentTab);
    });
  }

  async function selectTab(tab) {
    currentTab = tab;
    renderTabs();
    checkinPanel.hidden = tab !== 'checkin';
    listHost.innerHTML = '<p class="admin-empty">Loading…</p>';

    try {
      if (tab === 'checkin') {
        statHost.textContent = 'Scan or type a ticket code, then check it in (or undo a mistake).';
        listHost.innerHTML = '';
        return;
      }
      const res = await api('list', { params: { status: tab } });
      rows = res.rows || [];
      renderList();
    } catch (err) {
      listHost.innerHTML = '<p class="admin-empty">Could not load registrations.</p>';
    }
  }

  /* ---------------- list ---------------- */

  const BADGES = {
    pending_verification: ['admin-badge--pending', 'Pending verification'],
    pending_payment: ['admin-badge--pending', 'Pending payment'],
    verified: ['admin-badge--verified', 'Verified'],
    rejected: ['admin-badge--rejected', 'Rejected'],
  };

  function badgeFor(r) {
    const b = BADGES[r.paymentStatus] || ['', r.paymentStatus];
    return `<span class="admin-card__badge ${b[0]}">${escaped(b[1])}</span>`;
  }

  function renderList() {
    if (!rows.length) {
      statHost.textContent = `0 ${currentTab.replace('_', ' ')} registrations.`;
      listHost.innerHTML = '<p class="admin-empty">No registrations in this category.</p>';
      return;
    }
    statHost.textContent = `${rows.length} ${currentTab.replace('_', ' ')} registration(s).`;
    listHost.innerHTML = rows
      .map(
        (r) => `
        <div class="admin-card" data-id="${escaped(r.refId)}">
          <div class="admin-card__grid">
            <div>
              <div class="admin-card__name">${escaped(r.fullName || '—')}</div>
              <div class="admin-card__meta">
                <span>${escaped(r.refId)}</span>
                <span>${escaped(r.ticketLabel || r.ticketType || '')} · ${escaped(r.paymentMethod === 'online' ? 'Selar (online)' : 'Bank (manual)')} · ${
                  r.amount ? escaped(U.money(r.amount)) : ''
                }${r.participantCount > 1 ? ' · ' + r.participantCount + ' participants' : ''}</span>
                <span>${escaped(fmtDate(r.createdAt))}${r.hasReceipt ? ' · Receipt attached' : ''}${r.rejectionReason ? ' · ' + escaped(r.rejectionReason) : ''}</span>
              </div>
            </div>
            <div style="text-align:right">${badgeFor(r)}</div>
          </div>
        </div>`
      )
      .join('');

    listHost.querySelectorAll('[data-id]').forEach((card) => {
      card.addEventListener('click', () => openDetail(card.getAttribute('data-id')));
    });
  }

  function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  /* ---------------- detail ---------------- */

  async function openDetail(refId) {
    try {
      const res = await api('get', { params: { id: refId } });
      const reg = res.registration;
      renderDetail(reg);
    } catch (err) {
      U.toast(err.message || 'Could not load that registration.', 'error');
    }
  }

  function deepRender(reg) {
    const p = reg.purchaser || {};
    const participants = Array.isArray(reg.participants) ? reg.participants : [];
    const parts = participants
      .map(
        (x, i) => `
        <p class="part-label">Participant ${i + 1}${x.ticketCode ? ' · Ticket' : ''}</p>
        <dl>
          <div><dt>Name</dt> <dd>${escaped(x.fullName || '')}</dd></div>
          ${x.phone ? `<div><dt>Phone</dt> <dd>${escaped(x.phone)}</dd></div>` : ''}
          ${x.email ? `<div><dt>Email</dt> <dd>${escaped(x.email)}</dd></div>` : ''}
          ${x.age ? `<div><dt>Age</dt> <dd>${escaped(String(x.age))}</dd></div>` : ''}
          ${x.ticketCode ? `<div><dt>Ticket</dt> <dd>${escaped(x.ticketCode)}</dd></div>` : ''}
        </dl>`
      )
      .join('');
    return { p, participants, parts };
  }

  function renderDetail(reg) {
    const { p, participants, parts } = deepRender(reg);
    const receipt = reg.receipt && reg.receipt.data;

    listHost.innerHTML = `
      <button class="btn btn--sm btn--ghost" type="button" id="btn-back-list" style="margin-bottom:1.2rem">← Back to list</button>

      <div class="form-card" style="margin-bottom:1.2rem">
        <div class="admin-card__grid">
          <div>
            <div class="admin-card__name">${escaped(p.fullName || '')}</div>
            <div class="admin-card__meta">
              <span>${escaped(reg.refId)}</span>
              <span>Payment method: ${escaped(reg.paymentMethod === 'online' ? 'Selar (online)' : 'Bank (manual)')}</span>
              <span>Recorded: ${escaped(fmtDate(reg.createdAt))}${reg.reviewedAt ? ' · Reviewed: ' + escaped(fmtDate(reg.reviewedAt)) : ''}</span>
            </div>
          </div>
          <div style="text-align:right">${badgeFor(reg)}</div>
        </div>

        <div class="admin-detail">
          <dl>
            <div><dt>Ticket</dt> <dd>${escaped(reg.ticketLabel || '')}</dd></div>
            <div><dt>Amount expected</dt> <dd>${reg.amount ? escaped(U.money(reg.amount)) : ''}</dd></div>
            <div><dt>Payment status</dt> <dd>${escaped(reg.paymentStatus || '')}</dd></div>
            <div><dt>Ticket status</dt> <dd>${escaped(reg.ticketStatus || 'none')}</dd></div>
            ${reg.rejectionReason ? `<div><dt>Reason</dt> <dd>${escaped(reg.rejectionReason)}</dd></div>` : ''}
          </dl>

          <div>
            <p class="part-label">Purchaser</p>
            <dl>
              <div><dt>Name</dt> <dd>${escaped(p.fullName || '')}</dd></div>
              <div><dt>Phone</dt> <dd>${escaped(p.phone || '')}</dd></div>
              <div><dt>Email</dt> <dd>${escaped(p.email || '')}</dd></div>
              ${p.business ? `<div><dt>Business / Org</dt> <dd>${escaped(p.business)}</dd></div>` : ''}
              ${p.address ? `<div><dt>Address</dt> <dd>${escaped(p.address)}</dd></div>` : ''}
              ${p.age ? `<div><dt>Age</dt> <dd>${escaped(String(p.age))}</dd></div>` : ''}
            </dl>
          </div>

          ${parts}
        </div>
      </div>

      ${
        receipt
          ? `<div class="form-card admin-receipt" style="margin-bottom:1.2rem">
              <p class="part-label" style="margin-top:0">Payment receipt</p>
              <img src="${receipt}" alt="Payment receipt" style="margin-top:.8rem">
              <input type="hidden" id="receipt-data" value="">
            </div>`
          : ''
      }

      <div class="admin-actions">
        ${
          reg.paymentStatus === 'pending_verification' || reg.paymentStatus === 'pending_payment'
            ? `<button class="btn" type="button" data-approve="${escaped(reg.refId)}">
                <span>Approve payment — issue ${participants.length > 1 ? participants.length + ' tickets' : 'ticket'}</span>
              </button>
              <button class="btn btn--ghost" type="button" data-reject="${escaped(reg.refId)}">Reject payment</button>`
            : ''
        }
        ${
          reg.paymentStatus === 'verified' && reg.ticketCodes && reg.ticketCodes.length
            ? `<p class="admin-stat" style="margin:0">Issued tickets: ${reg.ticketCodes.map((c) => escaped(c)).join(', ')}</p>`
            : ''
        }
      </div>
    `;

    const back = document.getElementById('btn-back-list');
    if (back) back.addEventListener('click', () => selectTab(currentTab));

    const approve = listHost.querySelector('[data-approve]');
    if (approve) approve.addEventListener('click', () => doApprove(approve.getAttribute('data-approve')));

    const reject = listHost.querySelector('[data-reject]');
    if (reject) reject.addEventListener('click', () => doReject(reject.getAttribute('data-reject')));
  }

  /* ---------------- actions ---------------- */

  async function doApprove(refId) {
    const ok = window.confirm('Approve this payment and issue the ticket(s)?');
    if (!ok) return;
    try {
      const res = await api('approve', { method: 'POST', body: { id: refId } });
      U.toast('Payment approved. Ticket(s): ' + (res.codes || []).join(', '), 'ok');
      await selectTab(currentTab);
    } catch (err) {
      U.toast(err.message || 'Approval failed.', 'error');
    }
  }

  async function doReject(refId) {
    const reason = window.prompt('Reason for rejecting this payment:', '');
    if (reason === null) return;
    try {
      await api('reject', { method: 'POST', body: { id: refId, reason } });
      U.toast('Payment rejected.', 'ok');
      await selectTab(currentTab);
    } catch (err) {
      U.toast(err.message || 'Rejection failed.', 'error');
    }
  }

  async function doCheckin(codeRaw, reverse) {
    const code = String(codeRaw || '').trim().toUpperCase().replace(/^UDUF2027\//, '');
    if (!code) {
      U.toast('Enter a ticket code.', 'error');
      return;
    }
    try {
      const res = await api(reverse ? 'uncheckin' : 'checkin', { method: 'POST', body: { code } });
      U.toast(`${reverse ? 'Undid check-in for' : 'Checked in'} ${res.code}.`, 'ok');
    } catch (err) {
      U.toast(err.message || 'Check-in failed.', 'error');
    }
  }

  /* ---------------- boot ---------------- */

  const logoutBtn = document.getElementById('btn-logout');
  const loginBtn = document.getElementById('btn-login');
  const checkinBtn = document.getElementById('btn-checkin');
  const uncheckinBtn = document.getElementById('btn-uncheckin');

  loginBtn.addEventListener('click', doLogin);
  if (pwdInput)
    pwdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doLogin();
      }
    });
  logoutBtn.addEventListener('click', () => {
    setToken('');
    showLogin();
  });

  document.querySelectorAll('[data-tab]').forEach((tab) =>
    tab.addEventListener('click', () => selectTab(tab.getAttribute('data-tab')))
  );
  checkinBtn.addEventListener('click', () => doCheckin(document.getElementById('checkin-code').value, false));
  uncheckinBtn.addEventListener('click', () => doCheckin(document.getElementById('checkin-code').value, true));

  (async function start() {
    if (!token()) return showLogin();
    try {
      const res = await api('list', { params: { status: 'pending_verification' } });
      rows = res.rows || [];
      loginBox.hidden = true;
      panel.hidden = false;
      renderTabs();
      checkinPanel.hidden = true;
      renderList();
    } catch (err) {
      /* unauthorized was already handled by api() */
    }
  })();
})();