/** ადმინ-პანელი — მოდერაცია, ბიზნესების მართვა, ხელსაწყოები. */

import { boot, $, $$, esc, attr, toast, params } from './_boot.js';
import { emptyState, EMPTY } from '../components/cards.js';
import { mountBusinessForm } from '../components/business-form.js';
import { icon } from '../lib/icons.js';
import { HAS_FIREBASE, BUNDLE_BASE } from '../lib/config.js';
import { loadCity, getState, stats } from '../lib/store.js';
import { fetchBusiness } from '../lib/data/businesses.js';
import { pendingEdits, resolveEdit } from '../lib/data/edits.js';
import { statusBadge } from '../lib/hours.js';
import { ago, num } from '../lib/format.js';
import { TIERS, CATEGORIES } from '../data/taxonomy.js';

boot({ active: '' });

const root = $('#root');
let tab = params.get('tab') ?? 'businesses';

if (!HAS_FIREBASE) {
  root.innerHTML = emptyState(EMPTY.needConfig);
} else {
  guard();
}

async function guard() {
  const { onUser, isAdmin } = await import('../lib/firebase.js');
  onUser(async (user) => {
    if (!user) {
      root.innerHTML = emptyState({
        ...EMPTY.needAuth,
        action: { href: '/login.html?next=/admin.html', label: 'შესვლა' },
      });
      return;
    }
    if (!(await isAdmin())) {
      root.innerHTML = emptyState({
        icon: 'info',
        title: 'წვდომა შეზღუდულია',
        text: 'ადმინის უფლება custom claim-ით ენიჭება. მიმართე პროექტის ადმინისტრატორს.',
      });
      return;
    }
    bindTabs();
    render();
  });
}

function bindTabs() {
  for (const btn of $$('#tabs [data-tab]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.tab === tab));
    btn.addEventListener('click', () => {
      tab = btn.dataset.tab;
      params.set({ tab, edit: null });
      for (const b of $$('#tabs [data-tab]')) b.setAttribute('aria-pressed', String(b.dataset.tab === tab));
      render();
    });
  }
}

async function render() {
  const editId = params.get('edit');
  if (editId) return renderForm(editId);

  switch (tab) {
    case 'edits': return renderEdits();
    case 'claims': return renderClaims();
    case 'tools': return renderTools();
    default: return renderBusinesses();
  }
}

/* ─── ბიზნესები ────────────────────────────────────────────── */

async function renderBusinesses() {
  root.innerHTML = '<div class="panel"><div class="skel skel-line"></div><div class="skel skel-line"></div></div>';
  await loadCity();
  const all = getState().businesses;

  root.innerHTML = `
    <div class="row-wrap" style="justify-content:space-between; margin-bottom:var(--sp-4)">
      <div class="search" style="max-width:320px">
        <span class="search-ico">${icon('search', { size: 16 })}</span>
        <input class="search-input" id="q" type="search" placeholder="ფილტრი სახელით…">
      </div>
      <a class="btn btn-primary" href="?tab=businesses&edit=new">${icon('plus', { size: 16 })} ახალი ბიზნესი</a>
    </div>

    ${all.length ? '' : emptyState(EMPTY.noData)}
    <div class="table-wrap"><table class="table">
      <thead><tr><th>დასახელება</th><th>კატეგორია</th><th>უბანი</th><th>Tier</th><th>სტატუსი</th><th></th></tr></thead>
      <tbody id="rows"></tbody>
    </table></div>
    <p class="dim" style="font-size:var(--fs-xs)" id="tbl-note"></p>`;

  const rows = $('#rows');
  const note = $('#tbl-note');
  const draw = (list) => {
    rows.innerHTML = list.slice(0, 200).map((b) => {
      const st = statusBadge(b);
      return `
        <tr>
          <td><a href="/business.html?b=${encodeURIComponent(b.slug ?? b.id)}">${esc(b.name)}</a></td>
          <td class="dim">${esc(CATEGORIES.find((c) => c.id === b.category)?.ka ?? '')}</td>
          <td class="dim">${esc(b.district ?? '')}</td>
          <td><span class="badge">${esc(TIERS[b.tier]?.ka ?? b.tier)}</span></td>
          <td><span class="badge badge-${st.state}">${esc(st.short)}</span></td>
          <td><a class="btn btn-ghost btn-sm" href="?tab=businesses&edit=${encodeURIComponent(b.id)}">რედაქტირება</a></td>
        </tr>`;
    }).join('');
    note.textContent = list.length > 200 ? `ნაჩვენებია 200 ${num(list.length)}-დან` : '';
  };
  draw(all);

  $('#q').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    draw(q ? all.filter((b) => b.name.toLowerCase().includes(q)) : all);
  });
}

async function renderForm(id) {
  root.innerHTML = `
    <div class="row" style="margin-bottom:var(--sp-4)">
      <a class="btn btn-ghost btn-sm" href="?tab=businesses">${icon('back', { size: 14 })} უკან</a>
    </div>
    <div id="form-host"></div>`;

  const business = id === 'new' ? null : await fetchBusiness(id);
  mountBusinessForm($('#form-host'), {
    business,
    isAdmin: true,
    onSaved: () => { params.set({ edit: null }); render(); },
  });
}

/* ─── შესწორებები ──────────────────────────────────────────── */

async function renderEdits() {
  root.innerHTML = '<div class="panel"><div class="skel skel-line"></div></div>';
  await loadCity();
  const byId = getState().byId;

  let list = [];
  try { list = await pendingEdits(); } catch (e) { console.error(e); }

  if (!list.length) {
    root.innerHTML = emptyState({
      icon: 'check',
      title: 'რიგი ცარიელია',
      text: 'მოლოდინში მყოფი შესწორება არ არის.',
    });
    return;
  }

  root.innerHTML = `<div class="stack">${list.map((e) => {
    const b = byId.get(e.businessId);
    return `
      <div class="panel">
        <div class="panel-head">
          <h3>${esc(b?.name ?? e.businessId)}</h3>
          <span class="badge">${esc(e.field)}</span>
          <span class="dim" style="font-size:var(--fs-xs)">${esc(ago(e.createdAt))}</span>
        </div>
        <p style="white-space:pre-wrap">${esc(e.note ?? '')}</p>
        <div class="row" style="gap:var(--sp-2)">
          <button class="btn btn-primary btn-sm" data-edit-ok="${attr(e.id)}">დადასტურება</button>
          <button class="btn btn-sm" data-edit-no="${attr(e.id)}">უარყოფა</button>
          ${b ? `<a class="btn btn-ghost btn-sm" href="?tab=businesses&edit=${attr(b.id)}">გახსნა</a>` : ''}
        </div>
      </div>`;
  }).join('')}</div>`;

  root.addEventListener('click', async (ev) => {
    const ok = ev.target.closest('[data-edit-ok]');
    const no = ev.target.closest('[data-edit-no]');
    if (!ok && !no) return;
    const id = (ok ?? no).dataset.editOk ?? (ok ?? no).dataset.editNo;
    try {
      await resolveEdit(id, ok ? 'approved' : 'rejected');
      toast(ok ? 'დადასტურდა' : 'უარყოფილია', 'ok');
      renderEdits();
    } catch (err) {
      console.error(err);
      toast('ვერ შესრულდა', 'error');
    }
  });
}

/* ─── მფლობელობის მოთხოვნები ───────────────────────────────── */

async function renderClaims() {
  root.innerHTML = '<div class="panel"><div class="skel skel-line"></div></div>';
  const { fs } = await import('../lib/firebase.js');
  const { db, collection, query, where, getDocs } = await fs();

  const snap = await getDocs(query(collection(db, 'claims'), where('status', '==', 'pending')))
    .catch(() => null);
  const list = snap ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];

  if (!list.length) {
    root.innerHTML = emptyState({ icon: 'check', title: 'მოთხოვნა არ არის' });
    return;
  }

  await loadCity();
  const byId = getState().byId;

  root.innerHTML = `<div class="stack">${list.map((c) => `
    <div class="panel">
      <div class="panel-head">
        <h3>${esc(byId.get(c.businessId)?.name ?? c.businessId)}</h3>
        <span class="dim" style="font-size:var(--fs-xs)">${esc(c.email ?? '')}</span>
      </div>
      <p style="white-space:pre-wrap">${esc(c.proof ?? '')}</p>
      <p class="dim" style="font-size:var(--fs-xs)">
        დადასტურება <code>ownerUid</code>-ის მინიჭებას ნიშნავს — ეს Cloud Function-ის საქმეა,
        რომ კლიენტს ამის უფლება არ ჰქონდეს.
      </p>
    </div>`).join('')}</div>`;
}

/* ─── ხელსაწყოები ──────────────────────────────────────────── */

async function renderTools() {
  await loadCity();
  const s = stats();

  root.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h3>მდგომარეობა</h3></div>
      <div class="hero-stats" style="border:0; padding:0">
        <div><span class="stat-num">${num(s.total)}</span><span class="stat-label">სულ ობიექტი</span></div>
        <div><span class="stat-num">${num(s.verified)}</span><span class="stat-label">tier ≥ 1</span></div>
        <div><span class="stat-num">${num(s.rich)}</span><span class="stat-label">tier 2</span></div>
      </div>
      <p class="hint">
        მონაცემის წყარო: <strong>${esc(s.source ?? '—')}</strong>
        ${s.version ? ` · ბანდლის ვერსია ${esc(s.version)}` : ''}
        · ბაზა: <code>${esc(BUNDLE_BASE)}</code>
      </p>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>კატეგორიების განაწილება</h3></div>
      <div class="table-wrap"><table class="table">
        <tbody>
          ${CATEGORIES.map((c) => `
            <tr>
              <td><span class="cat-swatch" style="--dot:var(--cat-${c.id}); width:16px; height:16px; display:inline-grid; vertical-align:middle"></span>
                  ${esc(c.ka)}</td>
              <td class="tnum">${num(s.byCategory.get(c.id) ?? 0)}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>მონაცემების პაიპლაინი</h3></div>
      <p class="muted" style="font-size:var(--fs-sm)">
        ეს ოპერაციები ტერმინალიდან სრულდება — ბრაუზერიდან განზრახ არაა ხელმისაწვდომი,
        რადგან service account-ის გასაღები კლიენტში არასდროს უნდა მოხვდეს.
      </p>
      <pre style="background:var(--surface-2); padding:var(--sp-3); border-radius:var(--r-sm); overflow-x:auto; font-size:var(--fs-xs)"><code>npm run seed:taxonomy     # კატეგორიების ჩაწერა Firestore-ში
npm run import:osm        # OpenStreetMap-იდან იმპორტი
npm run build:bundles     # სტატიკური ბანდლების გენერაცია
npm run deploy:rules      # security rules + indexes</code></pre>
    </div>`;
}
