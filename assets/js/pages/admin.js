/* ============================================================
   Admin dashboard — signs in with Firebase Auth (email/password)
   and talks to Firestore directly. There is NO server.

   Who is an admin? A signed-in user whose UID (= the doc name)
   exists in /admins/{uid}. That record is created when the account
   is provisioned (Firebase Admin SDK) or by an existing admin.
   firestore.rules enforces all of this — nothing here bypasses it.
   ============================================================ */

(function () {
  'use strict';

  const U = window.UDUFUtil;
  if (!U) return;

  const fire = window.UDUFFire;
  if (!fire) return;

  const loginBox = document.getElementById('admin-login');
  const panel = document.getElementById('admin-panel');
  const listHost = document.getElementById('admin-list');
  const statHost = document.getElementById('admin-stat');
  const emailInput = document.getElementById('admin-email');
  const pwdInput = document.getElementById('admin-password');
  const checkinPanel = document.getElementById('checkin-panel');
  const accountLabel = document.getElementById('admin-account');

  let currentTab = 'pending_verification';
  let rows = [];

  /* ---------------- helpers ---------------- */

  function escaped(s) {
    return U.escapeHtml(s);
  }

  function clean(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }

  function db() {
    return fire.db();
  }

  function authUser() {
    return fire.auth.currentUser();
  }

  function firestoreDb() {
    const d = db();
    if (!d) throw new Error('Admin needs a live Firebase connection (offline demo mode cannot manage registrations).');
    return d;
  }

  function serialize(doc) {
    const out = {};
    Object.keys(doc || {}).forEach((k) => {
      const v = doc[k];
      out[k] = v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v;
    });
    return out;
  }

  function isForbidden(err) {
    return err && /permission-denied|PERMISSION_DENIED/i.test(err.message || '');
  }

  /* ---------------- login / logout ---------------- */

  function showLogin(message) {
    loginBox.hidden = false;
    panel.hidden = true;
    if (message) {
      if (emailInput) emailInput.focus();
      U.toast(message, 'error');
    }
  }

  function showPanel() {
    const who = authUser();
    loginBox.hidden = true;
    panel.hidden = false;
    if (accountLabel && who) accountLabel.textContent = who.email;
    selectTab(currentTab);
  }

  async function doLogin() {
    const email = emailInput ? emailInput.value.trim() : '';
    const password = pwdInput ? pwdInput.value : '';
    if (!email || !password) {
      U.toast('Enter your email and password.', 'error');
      return;
    }
    const res = await fire.auth.signIn(email, password);
    if (!res.ok) {
      U.toast(res.message || 'Sign-in failed.', 'error');
      return;
    }
    U.toast('Signed in.', 'ok');
    /* onAuth() below reveals the panel once the user is set. */
  }

  async function doLogout() {
    await fire.auth.signOut();
    const email = emailInput ? emailInput.value : '';
    if (emailInput) emailInput.value = email;
    if (pwdInput) pwdInput.value = '';
    showLogin();
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
    if (checkinPanel) checkinPanel.hidden = tab !== 'checkin';
    listHost.innerHTML = '<p class="admin-empty">Loading…</p>';

    try {
      if (tab === 'checkin') {
        statHost.textContent = 'Scan or type a ticket code, then check it in (or undo a mistake).';
        listHost.innerHTML = '';
        return;
      }
      rows = await listRegistrations(tab);
      renderList();
    } catch (err) {
      if (isForbidden(err)) {
        listHost.innerHTML = '<p class="admin-empty">This account is not an administrator. Contact the site owner.</p>';
      } else {
        listHost.innerHTML = '<p class="admin-empty">Could not load registrations.</p>';
      }
    }
  }

  async function listRegistrations(status) {
    const d = firestoreDb();
    let q = d.collection('registrations');
    if (status === 'pending_verification') {
      q = q.where('paymentStatus', 'in', ['awaiting_verification', 'pending_verification']);
    } else if (status === 'pending_payment' || status === 'verified' || status === 'rejected') {
      q = q.where('paymentStatus', '==', status);
    }
    const snap = await q.limit(500).get();
    const rowsOut = [];
    snap.forEach((doc) => {
      const r = serialize(doc.data());
      rowsOut.push({
        refId: r.refId,
        fullName: (r.purchaser && r.purchaser.fullName) || r.fullName || '',
        ticketType: r.ticketType,
        ticketLabel: r.ticketLabel,
        amount: r.amount,
        paymentMethod: r.paymentMethod,
        paymentStatus: r.paymentStatus,
        ticketStatus: r.ticketStatus,
        hasReceipt: !!r.receiptUrl,
        participantCount: (r.participants || []).length,
        createdAt: r.createdAt || '',
        rejectionReason: r.rejectionReason || '',
      });
    });
    rowsOut.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return rowsOut;
  }

  /* ---------------- list ---------------- */

  const BADGES = {
    pending_verification: ['admin-badge--pending', 'Pending verification'],
    awaiting_verification: ['admin-badge--pending', 'Awaiting verification'],
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
      const d = firestoreDb();
      const snap = await d.collection('registrations').doc(String(refId).trim().toUpperCase()).get();
      if (!snap.exists) {
        U.toast('Registration not found.', 'error');
        return;
      }
      renderDetail(serialize(snap.data()));
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
    const receiptUrl = reg.receiptUrl || '';
    const receiptIsPdf = /\.pdf(?:[?#]|$)/i.test(receiptUrl);

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
        receiptUrl
          ? `<div class="form-card admin-receipt" style="margin-bottom:1.2rem">
              <p class="part-label" style="margin-top:0">Payment receipt${reg.receiptName ? ' · ' + escaped(reg.receiptName) : ''}${reg.paymentSubmittedAt ? ' · submitted ' + escaped(fmtDate(reg.paymentSubmittedAt)) : ''}</p>
              ${
                receiptIsPdf
                  ? `<a class="btn btn--sm btn--ghost" href="${escaped(receiptUrl)}" target="_blank" rel="noopener" style="margin-top:.8rem">Open PDF receipt</a>`
                  : `<img src="${escaped(receiptUrl)}" alt="Payment receipt" style="margin-top:.8rem">`
              }
            </div>`
          : ''
      }

      <div class="admin-actions">
        ${
          ['pending_verification', 'pending_payment', 'awaiting_verification'].indexOf(reg.paymentStatus) !== -1
            ? `<button class="btn" type="button" data-approve="${escaped(reg.refId)}">
                <span>Approve payment — issue ${participants.length > 1 ? participants.length + ' tickets' : 'ticket'}</span>
              </button>
              <button class="btn btn--ghost" type="button" data-reject="${escaped(reg.refId)}">Reject payment</button>`
            : ''
        }
        ${
          reg.paymentStatus === 'verified' && (reg.ticketCodes || []).length
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

  /* ---------------- approve / reject (transactions) ---------------- */

  function randomBlock() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  async function makeCodes(txn, dbRef, count) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      let code = '';
      for (let attempt = 0; attempt < 40; attempt++) {
        const candidate = `UDUF-${randomBlock()}-${randomBlock()}`;
        const snap = await txn.get(dbRef.collection('tickets').doc(candidate));
        if (!snap.exists) {
          code = candidate;
          break;
        }
      }
      if (!code) code = `UDUF-${randomBlock()}-${Date.now().toString().slice(-4)}`;
      codes.push(code);
    }
    return codes;
  }

  async function doApprove(refId) {
    const ok = window.confirm('Approve this payment and issue the ticket(s)?');
    if (!ok) return;
    const who = authUser();
    try {
      const d = firestoreDb();
      const ref = d.collection('registrations').doc(String(refId).trim().toUpperCase());
      const svts = firebase.firestore.FieldValue.serverTimestamp();
      let generated = [];

      await d.runTransaction(async (txn) => {
        const snap = await txn.get(ref);
        if (!snap.exists) throw new Error('Registration not found.');
        const reg = snap.data();
        if (reg.paymentStatus === 'verified') throw new Error('This registration has already been approved.');
        if (['pending_verification', 'pending_payment', 'awaiting_verification'].indexOf(reg.paymentStatus) === -1) {
          throw new Error('Cannot approve a registration in status "' + reg.paymentStatus + '".');
        }
        const participants =
          Array.isArray(reg.participants) && reg.participants.length
            ? reg.participants
            : [{ fullName: (reg.purchaser && reg.purchaser.fullName) || '' }];

        generated = await makeCodes(txn, d, participants.length);
        participants.forEach((p, i) => {
          txn.set(d.collection('tickets').doc(generated[i]), {
            code: generated[i],
            refId: reg.refId,
            fullName: clean(p.fullName),
            ticketType: reg.ticketType || 'individual',
            ticketLabel: reg.ticketLabel || 'Individual Ticket',
            status: 'valid',
            createdAt: svts,
            updatedAt: svts,
          });
        });
        txn.update(ref, {
          paymentStatus: 'verified',
          status: 'approved',
          ticketStatus: 'generated',
          ticketCode: generated[0],
          ticketCodes: generated,
          participants: participants.map((p, i) => ({ ...p, ticketCode: generated[i] })),
          reviewedAt: svts,
          reviewedBy: (who && who.email) || 'admin',
          rejectionReason: '',
          updatedAt: svts,
        });
      });

      U.toast('Payment approved. Ticket(s): ' + generated.join(', '), 'ok');
      await selectTab(currentTab);
    } catch (err) {
      U.toast(err.message || 'Approval failed.', 'error');
    }
  }

  async function doReject(refId) {
    const reason = window.prompt('Reason for rejecting this payment:', '');
    if (reason === null) return;
    const who = authUser();
    try {
      const d = firestoreDb();
      const ref = d.collection('registrations').doc(String(refId).trim().toUpperCase());
      const svts = firebase.firestore.FieldValue.serverTimestamp();
      await d.runTransaction(async (txn) => {
        const snap = await txn.get(ref);
        if (!snap.exists) throw new Error('Registration not found.');
        const reg = snap.data();
        if (reg.paymentStatus === 'verified') throw new Error('This registration is already verified.');
        txn.update(ref, {
          paymentStatus: 'rejected',
          status: 'rejected',
          ticketStatus: 'none',
          rejectionReason: clean(reason) || 'Payment could not be verified.',
          reviewedAt: svts,
          reviewedBy: (who && who.email) || 'admin',
          updatedAt: svts,
        });
      });
      U.toast('Payment rejected.', 'ok');
      await selectTab(currentTab);
    } catch (err) {
      U.toast(err.message || 'Rejection failed.', 'error');
    }
  }

  /* ---------------- check-in ---------------- */

  async function doCheckin(codeRaw, reverse) {
    const code = String(codeRaw || '').trim().toUpperCase().replace(/^UDUF2027\//, '');
    if (!code) {
      U.toast('Enter a ticket code.', 'error');
      return;
    }
    try {
      const d = firestoreDb();
      const ticketRef = d.collection('tickets').doc(code);
      const svts = firebase.firestore.FieldValue.serverTimestamp();
      await d.runTransaction(async (txn) => {
        const snap = await txn.get(ticketRef);
        if (!snap.exists) throw new Error('No ticket found for ' + code + '.');
        const ticket = snap.data();
        txn.update(ticketRef, reverse
          ? { status: 'valid', checkedInAt: null, updatedAt: svts }
          : { status: 'checked_in', checkedInAt: svts, updatedAt: svts });

        if (ticket.refId) {
          const regRef = d.collection('registrations').doc(String(ticket.refId).trim().toUpperCase());
          const regSnap = await txn.get(regRef);
          if (regSnap.exists) {
            const reg = regSnap.data();
            const codes = Array.isArray(reg.ticketCodes) && reg.ticketCodes.length ? reg.ticketCodes : [reg.ticketCode];
            const states = [];
            for (const c of codes) {
              const cs = await txn.get(d.collection('tickets').doc(String(c).toUpperCase()));
              states.push(cs.exists && cs.data().status === 'checked_in');
            }
            const allUsed = states.every(Boolean);
            txn.update(regRef, { ticketStatus: allUsed ? 'checked_in' : 'generated', updatedAt: svts });
          }
        }
      });
      U.toast(`${reverse ? 'Undid check-in for' : 'Checked in'} ${code}.`, 'ok');
    } catch (err) {
      U.toast(err.message || 'Check-in failed.', 'error');
    }
  }

  /* ---------------- boot ---------------- */

  document.getElementById('btn-login').addEventListener('click', doLogin);
  if (pwdInput)
    pwdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doLogin();
      }
    });
  document.getElementById('btn-logout').addEventListener('click', doLogout);
  document.getElementById('btn-checkin').addEventListener('click', () =>
    doCheckin(document.getElementById('checkin-code').value, false)
  );
  document.getElementById('btn-uncheckin').addEventListener('click', () =>
    doCheckin(document.getElementById('checkin-code').value, true)
  );

  document.querySelectorAll('[data-tab]').forEach((tab) =>
    tab.addEventListener('click', () => selectTab(tab.getAttribute('data-tab')))
  );

  fire.auth.onAuth(function (user) {
    if (user) {
      showPanel();
    } else if (!panel.hidden) {
      showLogin();
    }
  });

  if (!fire.auth.currentUser()) {
    showLogin();
  }
})();