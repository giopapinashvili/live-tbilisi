/**
 * ფილტრის პანელი.
 *
 * ერთი კომპონენტი, ორი განლაგება: დესკტოპზე გვერდითი სვეტი,
 * მობილურზე იგივე მარკაპი ფურცელში.
 *
 * მდგომარეობა filters.js-შია — ეს მხოლოდ ხედია.
 */

import { esc, attr, delegate } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { compact } from '../lib/format.js';
import {
  CATEGORIES, CATEGORY_MAP, DISTRICTS, PRICE_LEVELS,
  attributesFor, subName, catName,
} from '../data/taxonomy.js';
import {
  filters, setFilter, toggleIn, resetFilters, activeCount,
  describe, removeFilter, onFilterChange,
} from '../lib/filters.js';

/**
 * @param {HTMLElement} host
 * @param {{counts?: Map<string,number>, onChange?: () => void}} opts
 */
export function mountFilterPanel(host, { counts = new Map(), onChange } = {}) {
  const paint = () => { host.innerHTML = template(counts); };
  paint();

  delegate(host, 'click', '[data-act]', (e, node) => {
    const { act, key, value } = node.dataset;
    switch (act) {
      case 'cat':
        setFilter({ cat: filters.cat === value ? '' : value });
        break;
      case 'toggle':
        toggleIn(key, key === 'price' ? Number(value) : value);
        break;
      case 'flag':
        setFilter({ [key]: !filters[key] });
        break;
      case 'rating':
        setFilter({ rating: filters.rating === Number(value) ? 0 : Number(value) });
        break;
      case 'district':
        setFilter({ district: filters.district === value ? '' : value });
        break;
      case 'reset':
        resetFilters();
        break;
      case 'chip-remove':
        removeFilter({ key, value: key === 'price' ? Number(value) : value });
        break;
      default:
        return;
    }
    paint();
    onChange?.();
  });

  const off = onFilterChange(() => paint());

  return {
    refresh(newCounts) { if (newCounts) counts = newCounts; paint(); },
    destroy() { off(); },
  };
}

/* ─────────────────────────────────────────────────────────── */

function template(counts) {
  const activeChips = describe();
  const cat = filters.cat;
  const subs = cat ? (CATEGORY_MAP[cat]?.sub ?? []) : [];
  const attrs = attributesFor(cat);

  return `
    ${activeChips.length ? `
      <div class="fgroup">
        <div class="fgroup-title">
          <span>აქტიური ფილტრები</span>
          <button class="btn btn-ghost btn-sm" type="button" data-act="reset">გასუფთავება</button>
        </div>
        <div class="fgroup-body">
          ${activeChips.map(chipHtml).join('')}
        </div>
      </div>` : ''}

    <div class="fgroup">
      <div class="fgroup-title"><span>კატეგორია</span></div>
      <div class="cat-list">
        ${CATEGORIES.map((c) => `
          <button class="cat-item" type="button" data-act="cat" data-value="${c.id}"
                  aria-pressed="${cat === c.id}">
            <span class="cat-swatch" style="--dot:var(--cat-${c.id})">${icon(c.icon, { size: 15 })}</span>
            <span>${esc(c.ka)}</span>
            ${counts.has(c.id) ? `<span class="cat-count">${compact(counts.get(c.id))}</span>` : ''}
          </button>`).join('')}
      </div>
    </div>

    ${subs.length ? `
      <div class="fgroup">
        <div class="fgroup-title"><span>${esc(catName(cat))} — ქვეკატეგორია</span></div>
        <div class="fgroup-body">
          ${subs.map((s) => `
            <button class="chip" type="button" data-act="toggle" data-key="subs" data-value="${s.id}"
                    aria-pressed="${filters.subs.includes(s.id)}">${esc(s.ka)}</button>`).join('')}
        </div>
      </div>` : ''}

    <div class="fgroup">
      <div class="fgroup-title"><span>სწრაფი</span></div>
      <div class="fgroup-body">
        <button class="chip" type="button" data-act="flag" data-key="open"
                aria-pressed="${filters.open}">
          <span class="chip-dot" style="--dot:var(--open)"></span>ღიაა ახლა
        </button>
        <button class="chip" type="button" data-act="flag" data-key="verified"
                aria-pressed="${filters.verified}">დადასტურებული</button>
        ${[4.5, 4].map((r) => `
          <button class="chip" type="button" data-act="rating" data-value="${r}"
                  aria-pressed="${filters.rating === r}">★ ${r}+</button>`).join('')}
      </div>
    </div>

    ${attrs.length ? `
      <div class="fgroup">
        <div class="fgroup-title"><span>მახასიათებლები</span></div>
        <div class="fgroup-body">
          ${attrs.map((a) => `
            <button class="chip" type="button" data-act="toggle" data-key="attrs" data-value="${a.id}"
                    aria-pressed="${filters.attrs.includes(a.id)}">${esc(a.ka)}</button>`).join('')}
        </div>
      </div>` : ''}

    <div class="fgroup">
      <div class="fgroup-title"><span>ფასი</span></div>
      <div class="fgroup-body">
        ${PRICE_LEVELS.map((p) => `
          <button class="chip" type="button" data-act="toggle" data-key="price" data-value="${p.id}"
                  aria-pressed="${filters.price.includes(p.id)}" title="${attr(p.label)}">${p.ka}</button>`).join('')}
      </div>
    </div>

    <div class="fgroup">
      <div class="fgroup-title"><span>უბანი</span></div>
      <div class="fgroup-body">
        ${DISTRICTS.map((d) => `
          <button class="chip" type="button" data-act="district" data-value="${d.id}"
                  aria-pressed="${filters.district === d.id}">${esc(d.ka)}</button>`).join('')}
      </div>
    </div>
  `;
}

function chipHtml(c) {
  const label = c.kind === 'cat' ? catName(c.value)
    : c.kind === 'sub' ? subName(c.value)
      : c.kind === 'attr' ? attrLabel(c.value)
        : c.kind === 'price' ? (PRICE_LEVELS.find((p) => p.id === c.value)?.ka ?? c.value)
          : c.kind === 'district' ? (DISTRICTS.find((d) => d.id === c.value)?.ka ?? c.value)
            : c.label;
  return `
    <button class="chip" type="button" aria-pressed="true"
            data-act="chip-remove" data-key="${attr(c.key)}" data-value="${attr(c.value)}">
      ${esc(label)}<span class="chip-x">×</span>
    </button>`;
}

function attrLabel(id) {
  for (const a of attributesFor()) if (a.id === id) return a.ka;
  for (const c of CATEGORIES) {
    for (const a of attributesFor(c.id)) if (a.id === id) return a.ka;
  }
  return id;
}

/** ღილაკის ბეჯი — რამდენი ფილტრია აქტიური */
export const filterBadge = () => activeCount();
