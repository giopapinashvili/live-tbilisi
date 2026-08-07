/**
 * ძებნის ველი შემოთავაზებებით.
 *
 * ერთი კომპონენტი სამ ადგილას: მთავარი გვერდი, რუკა, ძებნის გვერდი.
 * კლავიატურით სრულად მართვადი (↑ ↓ Enter Esc).
 */

import { el, esc, attr, debounce } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { search, highlight } from '../lib/search.js';
import { statusBadge } from '../lib/hours.js';
import { CATEGORY_MAP, catName } from '../data/taxonomy.js';

/**
 * @param {HTMLElement} host
 * @param {{
 *   placeholder?: string, big?: boolean, value?: string,
 *   onSelect?: (item:{kind:string, id:string, slug?:string}) => void,
 *   onInput?: (term:string) => void,
 *   onSubmit?: (term:string) => void,
 * }} opts
 */
export function mountSearchBox(host, opts = {}) {
  const {
    placeholder = 'ეძებე ბიზნესი, კატეგორია ან უბანი…',
    big = false,
    value = '',
    onSelect,
    onInput,
    onSubmit,
  } = opts;

  host.classList.add('search');
  if (big) host.classList.add('search-big');
  host.innerHTML = `
    <span class="search-ico">${icon('search', { size: big ? 20 : 18 })}</span>
    <input class="search-input" type="search" autocomplete="off" spellcheck="false"
           role="combobox" aria-expanded="false" aria-autocomplete="list"
           aria-label="ძებნა"
           placeholder="${attr(placeholder)}" value="${attr(value)}">
    <button class="search-clear" type="button" aria-label="გასუფთავება">${icon('close', { size: 16 })}</button>
    <div class="suggest" role="listbox" hidden></div>
  `;

  const input = host.querySelector('.search-input');
  const list = host.querySelector('.suggest');
  const clear = host.querySelector('.search-clear');

  let items = [];
  let cursor = -1;

  const close = () => {
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    cursor = -1;
  };

  const paint = (result) => {
    items = [
      ...result.taxonomy.map((t) => ({ ...t, _type: 'taxonomy' })),
      ...result.businesses.map((b) => ({ ...b, _type: 'business' })),
    ];
    if (!items.length) { close(); return; }

    const term = result.term;
    const parts = [];

    if (result.taxonomy.length) {
      parts.push('<div class="suggest-group">კატეგორიები და უბნები</div>');
      parts.push(...result.taxonomy.map((t, i) => suggestRow({
        index: i,
        swatch: t.cat
          ? `<span class="suggest-swatch" style="background:var(--cat-${t.cat});color:#fff">${icon(CATEGORY_MAP[t.cat]?.icon ?? 'tag', { size: 14 })}</span>`
          : `<span class="suggest-swatch" style="background:var(--surface-2)">${icon('pin', { size: 14 })}</span>`,
        name: highlight(t.label, term),
        sub: t.sub,
      })));
    }

    if (result.businesses.length) {
      const offset = result.taxonomy.length;
      parts.push('<div class="suggest-group">ბიზნესები</div>');
      parts.push(...result.businesses.map((b, i) => {
        const st = statusBadge(b);
        return suggestRow({
          index: offset + i,
          swatch: `<span class="suggest-swatch" style="background:var(--cat-${b.category ?? 'public'});color:#fff">${icon(CATEGORY_MAP[b.category]?.icon ?? 'pin', { size: 14 })}</span>`,
          name: highlight(b.name, term),
          sub: `${esc(catName(b.category))} · ${esc(st.short)}`,
        });
      }));
    }

    list.innerHTML = parts.join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const run = debounce(async (term) => {
    if (term.trim().length < 2) { close(); return; }
    await search(term, paint, { businessLimit: 7, taxonomyLimit: 4 });
  }, 130);

  const choose = (i) => {
    const item = items[i];
    if (!item) return;
    close();
    if (item._type === 'business') {
      input.value = item.name;
      onSelect?.({ kind: 'business', id: item.id, slug: item.slug, item });
      if (!onSelect) location.href = `/business.html?b=${encodeURIComponent(item.slug ?? item.id)}`;
    } else {
      input.value = item.label;
      onSelect?.({ kind: item.kind, id: item.id, href: item.href, item });
      if (!onSelect) location.href = item.href;
    }
  };

  const move = (delta) => {
    if (list.hidden || !items.length) return;
    cursor = (cursor + delta + items.length) % items.length;
    [...list.querySelectorAll('.suggest-item')].forEach((n, i) => {
      n.dataset.active = String(i === cursor);
      if (i === cursor) n.scrollIntoView({ block: 'nearest' });
    });
  };

  input.addEventListener('input', () => {
    onInput?.(input.value);
    run(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Escape') { close(); input.blur(); }
    else if (e.key === 'Enter') {
      if (cursor >= 0) { e.preventDefault(); choose(cursor); }
      else { onSubmit?.(input.value); close(); }
    }
  });

  list.addEventListener('mousedown', (e) => {
    const row = e.target.closest('.suggest-item');
    if (row) { e.preventDefault(); choose(Number(row.dataset.index)); }
  });

  clear.addEventListener('click', () => {
    input.value = '';
    onInput?.('');
    close();
    input.focus();
  });

  document.addEventListener('click', (e) => { if (!host.contains(e.target)) close(); });
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) run(input.value); });

  return {
    input,
    get value() { return input.value; },
    set value(v) { input.value = v; },
    focus: () => input.focus(),
    close,
  };
}

function suggestRow({ index, swatch, name, sub }) {
  return `
    <button class="suggest-item" type="button" role="option" data-index="${index}">
      ${swatch}
      <span class="suggest-main">
        <span class="suggest-name">${name}</span>
        <span class="suggest-sub">${sub}</span>
      </span>
    </button>`;
}
