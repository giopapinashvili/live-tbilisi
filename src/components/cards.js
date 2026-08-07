/** განმეორებადი UI ბლოკები: ბიზნესის ბარათი, კატეგორიის ფილა, ცარიელი მდგომარეობა. */

import { esc, attr } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { catName, subName, CATEGORY_MAP } from '../data/taxonomy.js';
import { statusBadge } from '../lib/hours.js';
import { rating as fmtRating, distance, compact } from '../lib/format.js';

/* ─── ბიზნესის ბარათი ──────────────────────────────────────── */

/**
 * @param {object} b კანონიკური ბიზნესი
 * @param {{distanceM?:number, compact?:boolean}} opts
 * @returns {string} HTML
 */
export function businessCard(b, { distanceM = null, compact: small = false } = {}) {
  const st = statusBadge(b);
  const r = fmtRating(b.ratingAvg, b.ratingCount);
  const cat = CATEGORY_MAP[b.category];
  const href = `/business.html?b=${encodeURIComponent(b.slug ?? b.id)}`;

  const media = b.cover
    ? `<img src="${attr(b.cover)}" alt="" loading="lazy" decoding="async">`
    : `<div class="card-media-empty">${icon(cat?.icon ?? 'pin', { size: 28 })}</div>`;

  return `
    <a class="card card-link" href="${href}" data-id="${attr(b.id)}">
      ${small ? '' : `<div class="card-media">${media}</div>`}
      <div class="card-body">
        <div class="row-wrap" style="gap:var(--sp-2); margin-bottom:var(--sp-2)">
          <span class="badge badge-${st.state}">${esc(st.short)}</span>
          ${b.tier === 0 ? '<span class="badge badge-tier0">დაუდასტურებელი</span>' : ''}
          ${b.tier >= 2 ? '<span class="badge badge-verified">სრული პროფილი</span>' : ''}
        </div>
        <h3 class="card-title">${esc(b.name)}</h3>
        <div class="card-meta">
          <span class="card-cat" style="--dot:var(--cat-${attr(b.category ?? 'public')})">
            ${esc(b.subcategories?.[0] ? subName(b.subcategories[0]) : catName(b.category))}
          </span>
          ${r.value ? `<span>·</span><span class="rating-num">★ ${esc(r.text)}</span>
                       <span class="dim">(${compact(r.count)})</span>` : ''}
          ${distanceM != null ? `<span>·</span><span>${esc(distance(distanceM))}</span>` : ''}
        </div>
      </div>
    </a>`;
}

/** სია ბარათებისგან, ან ცარიელი მდგომარეობა */
export function businessList(list, opts = {}) {
  if (!list.length) return emptyState(opts.empty ?? EMPTY.noResults);
  return `<div class="grid-cards">${list.map((b) => businessCard(b, opts)).join('')}</div>`;
}

/* ─── პროდუქტის ბარათი ─────────────────────────────────────
   ბარათი ნივთია, არა მაღაზია. ერთი ბიზნესი შეიძლება რამდენჯერმე
   გამოჩნდეს — თითო პროდუქტზე თითო ბარათი. ეს განზრახია. */

export function productCard(p) {
  const b = p.business;
  const st = b ? statusBadge(b) : null;
  const cat = b && CATEGORY_MAP[b.category];
  const href = b ? `/business.html?b=${encodeURIComponent(b.slug ?? b.id)}` : '#';
  const gel = (v) => `${(v / 100).toFixed(2).replace(/\.00$/, '')} ₾`;

  return `
    <a class="card card-link prod-card" href="${href}">
      <div class="prod-body">
        <div class="prod-ico">${icon(cat?.icon ?? 'tag', { size: 20 })}</div>
        <div class="prod-main">
          <h3 class="prod-name">${esc(p.name)}</h3>
          <div class="prod-where">${esc(b?.name ?? '')}${p.group ? ` · ${esc(p.group)}` : ''}</div>
          ${p.ingredients?.length
    ? `<div class="prod-ing">${p.ingredients.slice(0, 4).map(esc).join(' · ')}</div>` : ''}
        </div>
        <div class="prod-right">
          <div class="prod-price">${esc(gel(p.price))}${p.unit ? `<span class="dim"> / ${esc(p.unit)}</span>` : ''}</div>
          ${st ? `<span class="badge badge-${st.state}">${esc(st.short)}</span>` : ''}
        </div>
      </div>
    </a>`;
}

export function productList(items) {
  if (!items.length) return '';
  return `<div class="prod-grid">${items.map(productCard).join('')}</div>`;
}

/* ─── კატეგორიის ფილა ──────────────────────────────────────── */

export function categoryTile(cat, count = null) {
  return `
    <a class="card card-link cat-tile" href="/category.html?cat=${cat.id}"
       style="--dot:var(--cat-${cat.id})">
      <div class="card-body row" style="gap:var(--sp-3)">
        <span class="cat-swatch" style="--dot:var(--cat-${cat.id})">${icon(cat.icon, { size: 16 })}</span>
        <span style="flex:1">
          <span style="display:block; font-weight:650">${esc(cat.ka)}</span>
          ${count != null ? `<span class="dim" style="font-size:var(--fs-xs)">${compact(count)} ობიექტი</span>` : ''}
        </span>
        <span class="dim">${icon('chevron', { size: 16 })}</span>
      </div>
    </a>`;
}

/* ─── ცარიელი მდგომარეობა ──────────────────────────────────── */

export const EMPTY = {
  noData: {
    icon: 'map',
    title: 'ბიზნესები ჯერ არ დამატებულა',
    text: 'ბაზა ცარიელია. პირველი ჩანაწერების დასამატებლად გამოიყენე OSM იმპორტი ან ადმინ-პანელი.',
    action: { href: '/admin.html', label: 'ადმინ-პანელი' },
  },
  noResults: {
    icon: 'search',
    title: 'შედეგი ვერ მოიძებნა',
    text: 'სცადე ფილტრების მოხსნა ან სხვა საძიებო სიტყვა.',
  },
  noPromos: {
    icon: 'tag',
    title: 'აქციები ჯერ არ არის',
    text: 'როგორც კი ბიზნესები ფასდაკლებებს დაამატებენ, აქ გამოჩნდება.',
  },
  needAuth: {
    icon: 'user',
    title: 'საჭიროა ავტორიზაცია',
    text: 'ამ გვერდის სანახავად შედი ანგარიშში.',
  },
  needConfig: {
    icon: 'info',
    title: 'Firebase არ არის კონფიგურირებული',
    text: 'დააკოპირე .env.example → .env და შეავსე VITE_FB_* მნიშვნელობები.',
  },
};

export function emptyState({ icon: ic = 'info', title, text, action } = {}) {
  return `
    <div class="empty">
      <div class="empty-art">${icon(ic, { size: 30 })}</div>
      <h3 class="empty-title">${esc(title ?? '')}</h3>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${action ? `<a class="btn btn-primary" href="${attr(action.href)}">${esc(action.label)}</a>` : ''}
    </div>`;
}

/** ჩატვირთვის ჩონჩხი */
export function skeletonCards(n = 6) {
  return `<div class="grid-cards">${Array.from({ length: n }, () => `
    <div class="card">
      <div class="card-media skel"></div>
      <div class="card-body">
        <div class="skel skel-line" style="width:70%"></div>
        <div class="skel skel-line"></div>
      </div>
    </div>`).join('')}</div>`;
}

/** ვარსკვლავები */
export function stars(value) {
  const full = Math.round(value ?? 0);
  return `<span class="stars" aria-label="${attr(value)} ვარსკვლავი">${
    Array.from({ length: 5 }, (_, i) => icon('star', { size: 14, fill: i < full })).join('')
  }</span>`;
}
