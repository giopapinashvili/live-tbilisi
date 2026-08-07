/** მთავარი გვერდი. */

import { boot, $ } from './_boot.js';
import { mountSearchBox } from '../components/searchbox.js';
import { categoryTile } from '../components/cards.js';
import { CATEGORIES, DISTRICTS } from '../data/taxonomy.js';
import { loadCity, stats, getState } from '../lib/store.js';
import { num } from '../lib/format.js';
import { icon } from '../lib/icons.js';

boot({ active: '', compact: true });

/* ─── ძებნა ────────────────────────────────────────────────── */
mountSearchBox($('#hero-search'), {
  big: true,
  placeholder: 'აფთიაქი, ხაჭაპური, ავტოსერვისი, ვაკე…',
  onSubmit: (term) => {
    if (term.trim()) location.href = `/search.html?q=${encodeURIComponent(term.trim())}`;
  },
});

/* ─── სწრაფი ბმულები ───────────────────────────────────────── */
const QUICK = [
  { label: 'ღიაა ახლა', href: '/map.html?open=1' },
  { label: 'აფთიაქები', href: '/category.html?cat=health&subs=pharmacy' },
  { label: 'ყავა', href: '/category.html?cat=food&subs=coffee' },
  { label: 'საცხობი', href: '/category.html?cat=food&subs=bakery' },
  { label: '24 საათი', href: '/map.html?attrs=open24' },
];
$('#hero-quick').innerHTML = QUICK
  .map((q) => `<a class="chip" href="${q.href}">${q.label}</a>`)
  .join('');

/* ─── უბნები ───────────────────────────────────────────────── */
$('#district-chips').innerHTML = DISTRICTS
  .map((d) => `<a class="chip" href="/category.html?district=${d.id}">${d.ka}</a>`)
  .join('');

/* ─── კატეგორიები + სტატისტიკა ─────────────────────────────── */
const grid = $('#cat-grid');
grid.innerHTML = CATEGORIES.map((c) => categoryTile(c)).join('');

loadCity().then(() => {
  const s = stats();
  grid.innerHTML = CATEGORIES.map((c) => categoryTile(c, s.byCategory.get(c.id) ?? 0)).join('');
  renderStats(s);
  mountHeroMap();
});

/**
 * სტატისტიკა მხოლოდ რეალური რიცხვებით.
 * თუ ბაზა ცარიელია, პატიოსნად ვწერთ — არა შემოთხზული „10 000+".
 */
function renderStats(s) {
  const host = $('#hero-stats');
  if (!s.total) {
    host.innerHTML = `
      <p class="dim" style="font-size:var(--fs-sm); margin:0">
        ${icon('info', { size: 15 })}
        ბაზა ჯერ ივსება — ობიექტების იმპორტი მიმდინარეობს.
      </p>`;
    return;
  }
  host.innerHTML = [
    { n: s.total, l: 'ობიექტი რუკაზე' },
    { n: s.verified, l: 'დადასტურებული' },
    { n: CATEGORIES.length, l: 'კატეგორია' },
    { n: DISTRICTS.length, l: 'უბანი' },
  ].map((x) => `
    <div>
      <span class="stat-num">${num(x.n)}</span>
      <span class="stat-label">${x.l}</span>
    </div>`).join('');
}

/* ─── რუკის ფრაგმენტი ფონად ────────────────────────────────
   ინტერაქციის გარეშე და მხოლოდ დიდ ეკრანზე — მობილურზე
   ზედმეტი ტრაფიკია და არაფერს მატებს. */
async function mountHeroMap() {
  const host = $('#hero-map');
  if (!host || !matchMedia('(min-width: 1100px)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const { CityMap } = await import('../lib/map-core.js');
  const map = new CityMap(host, { interactive: false, hash: false, labels: false });
  map.addEventListener('ready', () => {
    map.setData(getState().businesses);
    map.map.easeTo({ zoom: 12.6, center: [44.79, 41.712], duration: 0 });
  });
}
