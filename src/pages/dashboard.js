/** ბიზნესის პანელი — მფლობელი თავად აახლებს პროფილს. */

import { boot, $, esc, attr, toast, params } from './_boot.js';
import { emptyState, EMPTY } from '../components/cards.js';
import { mountBusinessForm } from '../components/business-form.js';
import { icon } from '../lib/icons.js';
import { HAS_BACKEND } from '../lib/config.js';
import { myBusinesses, fetchBusiness, listItems, saveItem, deleteItem } from '../lib/data/businesses.js';
import { statusBadge } from '../lib/hours.js';
import { price, toTetri } from '../lib/format.js';
import { TIERS } from '../data/taxonomy.js';

boot({ active: 'profile', chrome: 'header', footer: true });

const root = $('#root');

if (!HAS_BACKEND) {
  root.innerHTML = emptyState(EMPTY.needConfig);
} else {
  init();
}

async function init() {
  const { onUser } = await import('../lib/supabase.js');
  onUser((user) => {
    if (!user) {
      root.innerHTML = emptyState({
        ...EMPTY.needAuth,
        action: { href: '/login.html?next=/dashboard.html', label: 'შესვლა' },
      });
      return;
    }
    route();
  });
}

async function route() {
  const editId = params.get('edit');
  if (editId === 'new') return renderForm(null);
  if (editId) return renderForm(await fetchBusiness(editId));
  return renderList();
}

/* ─── სია ──────────────────────────────────────────────────── */

async function renderList() {
  root.innerHTML = '<div class="panel"><div class="skel skel-line"></div><div class="skel skel-line"></div></div>';

  let list = [];
  try { list = await myBusinesses(); } catch (e) { console.error(e); }

  if (!list.length) {
    root.innerHTML = `
    <div class="cp-cta">
      <a class="btn btn-primary" href="/create-page.html">${icon('plus', { size: 15 })} ახალი გვერდი</a>
      <a class="btn" href="/create-page.html?kind=group">${icon('plus', { size: 15 })} ახალი ჯგუფი</a>
    </div>

      ${emptyState({
    icon: 'briefcase',
    title: 'ჯერ არცერთი ბიზნესი',
    text: 'დაამატე შენი ბიზნესი, რომ რუკაზე გამოჩნდეს — მენიუთი, ფასებით და აქციებით.',
  })}
      <div class="row" style="justify-content:center">
        <a class="btn btn-primary btn-lg" href="?edit=new">ბიზნესის დამატება</a>
      </div>`;
    return;
  }

  root.innerHTML = `
    <div class="cp-cta">
      <a class="btn btn-primary" href="/create-page.html">${icon('plus', { size: 15 })} ახალი გვერდი</a>
      <a class="btn" href="/create-page.html?kind=group">${icon('plus', { size: 15 })} ახალი ჯგუფი</a>
    </div>

    <div class="row" style="justify-content:flex-end; margin-bottom:var(--sp-4)">
      <a class="btn btn-primary" href="?edit=new">${icon('plus', { size: 16 })} ახალი</a>
    </div>
    <div class="stack">
      ${list.map((b) => {
    const st = statusBadge(b);
    return `
      <div class="panel">
        <div class="panel-head">
          <span class="cat-swatch" style="--dot:var(--cat-${attr(b.category ?? 'public')})"></span>
          <h3>${esc(b.nameKa || b.name)}</h3>
          <span class="badge badge-${st.state}">${esc(st.short)}</span>
          <span class="badge">${esc(TIERS[b.tier]?.ka ?? '')}</span>
        </div>
        <div class="row-wrap" style="gap:var(--sp-2)">
          <a class="btn btn-sm" href="?edit=${encodeURIComponent(b.id)}">${icon('edit', { size: 14 })} რედაქტირება</a>
          <a class="btn btn-sm" href="/business.html?b=${encodeURIComponent(b.slug ?? b.id)}">ნახვა</a>
          <button class="btn btn-sm" type="button" data-items="${attr(b.id)}">მენიუ / პროდუქტები</button>
        </div>
        <div data-items-host="${attr(b.id)}"></div>
      </div>`;
  }).join('')}
    </div>`;

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-items]');
    if (btn) renderItems(btn.dataset.items);
  });
}

/* ─── ფორმა ────────────────────────────────────────────────── */

function renderForm(business) {
  root.innerHTML = `
    <div class="cp-cta">
      <a class="btn btn-primary" href="/create-page.html">${icon('plus', { size: 15 })} ახალი გვერდი</a>
      <a class="btn" href="/create-page.html?kind=group">${icon('plus', { size: 15 })} ახალი ჯგუფი</a>
    </div>

    <div class="row" style="margin-bottom:var(--sp-4)">
      <a class="btn btn-ghost btn-sm" href="/dashboard.html">${icon('back', { size: 14 })} უკან</a>
      <span class="spacer"></span>
      <span class="dim" style="font-size:var(--fs-sm)">
        ${business ? 'რედაქტირება' : 'ახალი ბიზნესი'}
      </span>
    </div>
    <div id="form-host"></div>`;

  mountBusinessForm($('#form-host'), {
    business,
    onSaved: () => { location.href = '/dashboard.html'; },
  });
}

/* ─── მენიუ / პროდუქტები ───────────────────────────────────── */

async function renderItems(businessId) {
  const host = document.querySelector(`[data-items-host="${CSS.escape(businessId)}"]`);
  if (!host) return;
  if (host.dataset.open === '1') { host.replaceChildren(); host.dataset.open = '0'; return; }
  host.dataset.open = '1';
  host.innerHTML = '<div class="skel skel-line" style="margin-top:var(--sp-4)"></div>';

  const items = await listItems(businessId).catch(() => []);

  host.innerHTML = `
    <hr class="rule" style="margin:var(--sp-4) 0">
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>დასახელება</th><th>ჯგუფი</th><th>ფასი</th><th></th></tr></thead>
        <tbody>
          ${items.map((it) => `
            <tr>
              <td>${esc(it.name?.ka ?? '')}</td>
              <td class="dim">${esc(it.group ?? '')}</td>
              <td class="tnum">${esc(price(it.price))}</td>
              <td><button class="btn btn-ghost btn-sm" type="button" data-del-item="${attr(it.id)}">წაშლა</button></td>
            </tr>`).join('') || '<tr><td colspan="4" class="dim">ჯერ ცარიელია</td></tr>'}
        </tbody>
      </table>
    </div>

    <form class="grid-2" id="item-form" style="margin-top:var(--sp-4); align-items:end">
      <label class="field" style="margin:0">
        <span class="label">დასახელება</span>
        <input class="input" name="name" required placeholder="მაგ: ხაჭაპური აჭარული">
      </label>
      <label class="field" style="margin:0">
        <span class="label">ჯგუფი</span>
        <input class="input" name="group" placeholder="ცხელი კერძები" list="grp-${attr(businessId)}">
        <datalist id="grp-${attr(businessId)}">
          ${[...new Set(items.map((i) => i.group).filter(Boolean))].map((g) => `<option value="${attr(g)}">`).join('')}
        </datalist>
      </label>
      <label class="field" style="margin:0">
        <span class="label">ფასი (₾)</span>
        <input class="input" name="price" inputmode="decimal" placeholder="12.50">
      </label>
      <button class="btn btn-primary" type="submit">დამატება</button>
    </form>`;

  host.querySelector('#item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await saveItem(businessId, {
        name: { ka: f.name.value.trim() },
        group: f.group.value.trim() || 'სხვა',
        price: toTetri(f.price.value),
      });
      toast('დაემატა', 'ok');
      host.dataset.open = '0';
      renderItems(businessId);
    } catch (err) {
      console.error(err);
      toast('ვერ დაემატა', 'error');
    }
  });

  host.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del-item]');
    if (!btn) return;
    if (!confirm('წავშალო?')) return;
    await deleteItem(businessId, btn.dataset.delItem);
    host.dataset.open = '0';
    renderItems(businessId);
  });
}
