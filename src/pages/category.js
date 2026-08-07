/**
 * კატეგორიის / უბნის გვერდი.
 *
 * ეს გვერდი SEO-ს ხერხემალია: 12 კატეგორია × 10 რაიონი = 120 მისამართი,
 * თითოეული რეალური საძიებო მოთხოვნის ქვეშ („აფთიაქები ვაკეში").
 */

import { boot, $, params, esc } from './_boot.js';
import { mountFilterPanel } from '../components/filter-panel.js';
import { businessList, skeletonCards, emptyState, EMPTY, categoryTile } from '../components/cards.js';
import { loadCity, getState, stats } from '../lib/store.js';
import { filters, readFromURL, apply, setFilter, onFilterChange } from '../lib/filters.js';
import { CATEGORIES, CATEGORY_MAP, DISTRICT_MAP, catName, subName } from '../data/taxonomy.js';
import { num } from '../lib/format.js';
import { setTitle, setDescription, setCanonical } from '../lib/seo.js';

boot({ active: 'category', canonical: false });
readFromURL();

const PAGE = 24;
let shown = PAGE;
let current = [];

const results = $('#results');
results.innerHTML = skeletonCards(6);

$('#sort').value = filters.sort;
$('#sort').addEventListener('change', (e) => { setFilter({ sort: e.target.value }); render(); });
$('#more').addEventListener('click', () => { shown += PAGE; render({ keepScroll: true }); });

loadCity().then(() => {
  mountFilterPanel($('#filter-host'), {
    counts: stats().byCategory,
    onChange: () => { shown = PAGE; render(); },
  });
  onFilterChange(() => updateHead());
  render();
});

function render({ keepScroll = false } = {}) {
  updateHead();

  const all = getState().businesses;
  if (!all.length) {
    results.innerHTML = emptyState(EMPTY.noData);
    $('#result-count').textContent = '';
    $('#more').hidden = true;
    return;
  }

  current = apply(all);
  $('#result-count').textContent = current.length
    ? `${num(current.length)} ობიექტი`
    : '';

  // კატეგორია არჩეული არაა და ფილტრიც ცარიელია → კატალოგის ხედი
  if (!filters.cat && !filters.district && !filters.q && current.length === all.length) {
    const byCat = stats().byCategory;
    results.innerHTML = `
      <div class="cat-grid">
        ${CATEGORIES.map((c) => categoryTile(c, byCat.get(c.id) ?? 0)).join('')}
      </div>`;
    $('#more').hidden = true;
    return;
  }

  results.innerHTML = businessList(current.slice(0, shown));
  $('#more').hidden = current.length <= shown;
  if (!keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** სათაური, აღწერა და პურის ნამცეცები ფილტრის მიხედვით */
function updateHead() {
  const cat = CATEGORY_MAP[filters.cat];
  const dist = DISTRICT_MAP[filters.district];
  const sub = filters.subs[0] ? subName(filters.subs[0]) : null;

  const what = sub ?? (cat ? cat.ka : 'ყველა ობიექტი');
  const where = dist ? `${dist.ka}ში` : 'თბილისში';
  const title = `${what} ${where}`;

  $('#page-title').textContent = title;
  $('#page-eyebrow').textContent = cat ? catName(cat.id) : 'კატალოგი';
  $('#page-lead').textContent = cat || dist
    ? 'მისამართები, სამუშაო საათები და კონტაქტი — ერთ სიაში.'
    : 'აირჩიე კატეგორია ან უბანი, რომ სია დაზუსტდეს.';

  setTitle(`${title} — თბილისი LIVE`);
  setDescription(`${title}: სრული სია მისამართებით, სამუშაო საათებითა და კონტაქტით. თბილისი LIVE.`);
  // canonical მხოლოდ სუფთა კატეგორია×უბანი კომბინაციაზე — დანარჩენი
  // ფილტრები იმავე გვერდის ვარიაციებია და ცალკე ინდექსირება არ სჭირდებათ
  setCanonical(`/category.html${cat ? `?cat=${cat.id}` : ''}${cat && dist ? `&district=${dist.id}` : ''}`);

  const crumbs = ['<a href="/">მთავარი</a>', '<a href="/category.html">კატალოგი</a>'];
  if (cat) crumbs.push(`<a href="/category.html?cat=${cat.id}">${esc(cat.ka)}</a>`);
  if (dist) crumbs.push(`<span class="dim">${esc(dist.ka)}</span>`);
  $('#crumbs').innerHTML = crumbs.join('<span class="sep">/</span>');
}
