/** რუკის გვერდი — პროექტის მთავარი ეკრანი. */

import '../styles/map.css';
import { boot, $, params, toast } from './_boot.js';

import { CityMap } from '../lib/map-core.js';
import { mountSearchBox } from '../components/searchbox.js';
import { mountFilterPanel } from '../components/filter-panel.js';
import { detailView, bindDetailActions } from '../components/detail.js';
import { emptyState, EMPTY } from '../components/cards.js';
import { icon } from '../lib/icons.js';
import { toggleTheme } from '../lib/theme.js';
import { loadCity, getState, getBusiness, stats } from '../lib/store.js';
import { loadItems, searchItems } from '../lib/items.js';
import { filters, readFromURL, setFilter, activeCount, resetFilters } from '../lib/filters.js';
import { CATEGORIES } from '../data/taxonomy.js';
import { num } from '../lib/format.js';

boot({ active: 'map' });
readFromURL();

/* ─── ხატულები სტატიკურ მარკაპში ───────────────────────────── */
$('#fab-locate').innerHTML = icon('locate');
$('#fab-reset').innerHTML = icon('compass');
$('#fab-theme').innerHTML = `${icon('sun')}`;
$('#fab-filter-ico').innerHTML = icon('filter', { size: 16 });

/* ─── რუკა ─────────────────────────────────────────────────── */
const map = new CityMap($('#map'), { hash: true, padding: { top: 120, bottom: 80, left: 40, right: 40 } });

const sheet = $('#sheet');
const sheetBody = $('#sheet-body');
const countBox = $('#map-count');

let panel;

// ტექსტური ძებნა რუკაზე პროდუქტებსაც ითვალისწინებს:
// „შაურმა" პოულობს იმ ადგილებსაც, რომელთა სახელშიც ეს სიტყვა არ არის
map.textResolver = (term) => searchItems(term, { limit: 1000 }).businessIds;

map.addEventListener('ready', async () => {
  const { businesses } = await loadCity();
  map.setData(businesses);
  loadItems().then(() => { if (filters.q) { map.applyFilters(); updateCount(); } });
  map.applyFilters();
  updateCount();
  mountFilters();
  mountQuickbar();

  if (!businesses.length) {
    openSheet(emptyState(EMPTY.noData));
  }

  const preselect = params.get('b');
  if (preselect) selectBusiness(preselect, { fly: true });
});

map.addEventListener('select', (e) => selectBusiness(e.detail.id, { fly: false }));
map.addEventListener('deselect', () => closeSheet());
map.addEventListener('moveend', updateCount);
map.addEventListener('restyled', () => map.applyFilters());

/* ─── ძებნა ────────────────────────────────────────────────── */
mountSearchBox($('#map-search'), {
  placeholder: 'ეძებე რუკაზე…',
  value: filters.q,
  onSelect: (hit) => {
    if (hit.kind === 'business') {
      selectBusiness(hit.id, { fly: true });
    } else if (hit.kind === 'district') {
      setFilter({ district: hit.id });
      refresh();
      map.fitToDistrict(hit.id);
    } else if (hit.kind === 'category') {
      setFilter({ cat: hit.id });
      refresh();
    } else if (hit.kind === 'subcategory') {
      const parent = hit.item?.cat;
      setFilter({ cat: parent, subs: [hit.id] });
      refresh();
    }
  },
  onInput: (term) => {
    setFilter({ q: term }, { silent: true });
    map.applyFilters();
    updateCount();
  },
});

/* ─── ფილტრები ─────────────────────────────────────────────── */
function mountFilters() {
  const counts = stats().byCategory;
  panel = mountFilterPanel($('#filter-host'), { counts, onChange: refresh });
}

function refresh() {
  map.applyFilters();
  updateCount();
  updateFilterBadge();
  panel?.refresh(stats().byCategory);
}

function updateFilterBadge() {
  const n = activeCount();
  const badge = $('#fab-filter-count');
  badge.hidden = n === 0;
  badge.textContent = String(n);
}

$('#side-reset').addEventListener('click', () => { resetFilters(); refresh(); });
$('#fit-visible').addEventListener('click', () => {
  if (!map.fitToVisible()) toast('ხედში ობიექტი არ არის');
});

/* ─── სწრაფი კატეგორიების ლენტა ────────────────────────────── */
function mountQuickbar() {
  const bar = $('#quickbar');
  const openChip = `
    <button class="chip" type="button" data-quick="open" aria-pressed="${filters.open}">
      <span class="chip-dot" style="--dot:var(--open)"></span>ღიაა
    </button>`;
  bar.innerHTML = openChip + CATEGORIES.map((c) => `
    <button class="chip" type="button" data-quick="cat" data-value="${c.id}"
            aria-pressed="${filters.cat === c.id}">
      <span class="chip-dot" style="--dot:var(--cat-${c.id})"></span>${c.ka}
    </button>`).join('');

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick]');
    if (!btn) return;
    if (btn.dataset.quick === 'open') setFilter({ open: !filters.open });
    else setFilter({ cat: filters.cat === btn.dataset.value ? '' : btn.dataset.value });
    syncQuickbar();
    refresh();
  });
}

function syncQuickbar() {
  for (const btn of $('#quickbar').querySelectorAll('[data-quick]')) {
    btn.setAttribute('aria-pressed', String(
      btn.dataset.quick === 'open' ? filters.open : filters.cat === btn.dataset.value,
    ));
  }
}

/* ─── მრიცხველი ────────────────────────────────────────────── */
function updateCount() {
  const total = getState().businesses.length;
  if (!total) { countBox.hidden = true; return; }
  const unique = map.visibleCount();
  countBox.hidden = false;
  countBox.textContent = activeCount() || filters.q
    ? `${num(unique)} ობიექტი ხედში · ${num(total)}-დან`
    : `${num(unique)} ობიექტი ხედში`;
}

/* ─── ფურცელი ──────────────────────────────────────────────── */
function openSheet(html, state = 'true') {
  sheetBody.innerHTML = html;
  sheet.dataset.open = state;
  sheet.scrollTop = 0;
  $('#shell').classList.add('has-detail');
}

function closeSheet() {
  sheet.dataset.open = 'false';
  $('#shell').classList.remove('has-detail');
  map.select(null);
}

async function selectBusiness(idOrSlug, { fly = false } = {}) {
  openSheet(detailView(null, { loading: true }));
  const b = await getBusiness(idOrSlug);
  if (!b) { openSheet(emptyState(EMPTY.noResults)); return; }

  map.select(b.id, { fly });
  params.set({ b: b.slug ?? b.id });

  openSheet(`
    <div class="row" style="justify-content:space-between; margin-bottom:var(--sp-3)">
      <a class="btn btn-sm" href="/business.html?b=${encodeURIComponent(b.slug ?? b.id)}">სრული გვერდი</a>
      <button class="btn btn-ghost btn-icon btn-sm" type="button" id="sheet-close" aria-label="დახურვა">
        ${icon('close', { size: 16 })}
      </button>
    </div>
    ${detailView(b, { level: 3 })}
  `);

  $('#sheet-close')?.addEventListener('click', () => {
    params.set({ b: null });
    closeSheet();
  });
}

bindDetailActions(sheetBody, {
  onReport: () => toast('შეცდომის შეტყობინება ბიზნესის გვერდზეა ხელმისაწვდომი'),
});

/* ფურცლის სახელური — მობილურზე გადათრევა */
(() => {
  const grip = $('#sheet-grip');
  let startY = 0; let startOpen = false;

  const down = (e) => {
    startY = (e.touches?.[0] ?? e).clientY;
    startOpen = sheet.dataset.open === 'true';
    grip.setPointerCapture?.(e.pointerId);
  };
  const up = (e) => {
    const dy = ((e.changedTouches?.[0] ?? e).clientY) - startY;
    if (Math.abs(dy) < 12) { sheet.dataset.open = startOpen ? 'peek' : 'true'; return; }
    sheet.dataset.open = dy > 0 ? (startOpen ? 'peek' : 'false') : 'true';
    if (sheet.dataset.open === 'false') closeSheet();
  };

  grip.addEventListener('pointerdown', down);
  grip.addEventListener('pointerup', up);
  grip.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      sheet.dataset.open = sheet.dataset.open === 'true' ? 'peek' : 'true';
    }
  });
})();

/* ─── მობილურის ფილტრი ფურცელში ────────────────────────────── */
$('#fab-filter').addEventListener('click', () => {
  openSheet(`
    <div class="row" style="justify-content:space-between; margin-bottom:var(--sp-3)">
      <h3 style="margin:0">ფილტრი</h3>
      <button class="btn btn-ghost btn-icon btn-sm" type="button" id="sheet-close" aria-label="დახურვა">
        ${icon('close', { size: 16 })}
      </button>
    </div>
    <div id="filter-host-mobile"></div>
    <div class="row" style="gap:var(--sp-2); position:sticky; bottom:0; background:var(--surface); padding-block:var(--sp-3)">
      <button class="btn" type="button" id="m-reset">გასუფთავება</button>
      <button class="btn btn-primary" style="flex:1" type="button" id="m-apply">ჩვენება</button>
    </div>
  `);

  const mobilePanel = mountFilterPanel($('#filter-host-mobile'), {
    counts: stats().byCategory,
    onChange: () => { map.applyFilters(); updateCount(); updateFilterBadge(); syncQuickbar(); },
  });

  $('#sheet-close').addEventListener('click', closeSheet);
  $('#m-reset').addEventListener('click', () => { resetFilters(); refresh(); syncQuickbar(); });
  $('#m-apply').addEventListener('click', () => { mobilePanel.destroy(); closeSheet(); });
});

/* ─── მცურავი ღილაკები ─────────────────────────────────────── */
$('#fab-locate').addEventListener('click', () => map.locateUser());
$('#fab-reset').addEventListener('click', () => map.resetView());
$('#fab-theme').addEventListener('click', toggleTheme);

/* ─── 3D რეჟიმი ────────────────────────────────────────────── */
const fab3d = $('#fab-3d');
const compass = $('#compass');
const needle = compass?.querySelector('.compass-needle');

fab3d.addEventListener('click', () => {
  const on = map.toggle3D();
  fab3d.setAttribute('aria-pressed', String(on));
  compass.hidden = !on;
});

// კომპასი ბრუნავს კამერასთან ერთად — ჩრდილოეთი ყოველთვის ჩანს
map.map.on('rotate', () => {
  if (!needle) return;
  needle.style.transform = `rotate(${-map.map.getBearing()}deg)`;
  if (!compass.hidden) return;
  if (Math.abs(map.map.getBearing()) > 1) compass.hidden = false;
});

$('#fab-north')?.addEventListener('click', () => {
  map.map.easeTo({ bearing: 0, duration: 400 });
});

/* ─── კლავიატურა ───────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === '/') { e.preventDefault(); $('#map-search .search-input')?.focus(); }
  if (e.key === 'Escape') closeSheet();
});

updateFilterBadge();
