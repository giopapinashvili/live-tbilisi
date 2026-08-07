/**
 * ძებნის გვერდი.
 *
 * ორ დონეზე ეძებს ერთდროულად:
 *   • პროდუქტებში — „შაურმა", „ცემენტი", „ლურსმანი"
 *   • ბიზნესებში — სახელით
 * და გვთავაზობს დაკავშირებულს — „ასევე ხშირად ერთად იყიდება".
 */

import { boot, $, params, esc, delegate } from './_boot.js';
import { mountSearchBox } from '../components/searchbox.js';
import { businessList, productList, emptyState, EMPTY, skeletonCards } from '../components/cards.js';
import { loadCity, getState } from '../lib/store.js';
import { loadItems, searchItems } from '../lib/items.js';
import { searchAll } from '../lib/search.js';
import { num } from '../lib/format.js';
import { setTitle } from '../lib/seo.js';

boot({ active: 'search', canonical: false });

const results = $('#results');
const countBox = $('#result-count');
const initial = params.get('q') ?? '';

const box = mountSearchBox($('#search-host'), {
  big: true,
  value: initial,
  placeholder: 'შაურმა, ცემენტი, აფთიაქი, ლურსმანი…',
  onSubmit: (term) => run(term),
  onSelect: (hit) => {
    if (hit.kind === 'business' || hit.kind === 'product') {
      location.href = `/business.html?b=${encodeURIComponent(hit.slug ?? hit.id)}`;
    } else location.href = hit.href;
  },
});

(async () => {
  await Promise.all([loadCity(), loadItems()]);
  if (initial) run(initial); else showHint();
})();

// დაკავშირებულ სიტყვაზე დაჭერა — ახალი ძებნა
delegate(results, 'click', '[data-term]', (e, node) => {
  e.preventDefault();
  box.value = node.dataset.term;
  run(node.dataset.term);
});

function run(term) {
  const q = term.trim();
  params.set({ q: q || null });
  setTitle(q ? `„${q}" — ძებნა · თბილისი LIVE` : 'ძებნა — თბილისი LIVE');

  if (!q) { showHint(); return; }
  if (!getState().businesses.length) {
    results.innerHTML = emptyState(EMPTY.noData);
    countBox.textContent = '';
    return;
  }

  results.innerHTML = skeletonCards(3);

  const prod = searchItems(q, { limit: 60 });
  const biz = searchAll(q);

  const total = (prod.total ?? 0) + biz.length;
  countBox.textContent = total
    ? `${num(prod.total ?? 0)} პროდუქტი და ${num(biz.length)} ადგილი „${esc(q)}"-ზე`
    : '';

  if (!total) {
    results.innerHTML = emptyState({
      icon: 'search',
      title: `„${q}" ვერ მოიძებნა`,
      text: 'სცადე სხვა სიტყვა. ბაზაში ჯერ მხოლოდ ნაძალადევის რაიონია.',
    });
    return;
  }

  const parts = [];

  if (prod.related?.length) {
    parts.push(`
      <div class="related-bar">
        <span class="eyebrow">ასევე ხშირად ერთად იყიდება</span>
        <div class="row-wrap">
          ${prod.related.map((r) => `
            <button class="chip" type="button" data-term="${esc(r.name)}">${esc(r.name)}</button>`).join('')}
        </div>
      </div>`);
  }

  if (prod.items.length) {
    parts.push(`
      <section class="sec">
        <div class="sec-head"><h2>პროდუქტები</h2>
          <span class="dim">${num(prod.total)} შედეგი</span></div>
        ${productList(prod.items)}
      </section>`);
  }

  if (biz.length) {
    parts.push(`
      <section class="sec">
        <div class="sec-head"><h2>ადგილები</h2>
          <span class="dim">${num(biz.length)} შედეგი</span></div>
        ${businessList(biz.slice(0, 24))}
      </section>`);
  }

  parts.push(`
    <div class="row" style="justify-content:center; margin-top:var(--sp-6)">
      <a class="btn btn-primary" href="/map.html?q=${encodeURIComponent(q)}">
        ყველა შედეგის ნახვა რუკაზე
      </a>
    </div>`);

  results.innerHTML = parts.join('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showHint() {
  countBox.textContent = '';
  const examples = ['შაურმა', 'ხაჭაპური', 'ცემენტი', 'ლურსმანი', 'ყავა', 'აფთიაქი', 'მანიკური', 'ცომეული'];
  results.innerHTML = `
    ${emptyState({
    icon: 'search',
    title: 'რას ეძებ?',
    text: 'დაწერე ნივთი ან სერვისი — არა მაღაზიის სახელი. ქართულადაც და ლათინურადაც მუშაობს.',
  })}
    <div class="row-wrap" style="justify-content:center; margin-top:var(--sp-4)">
      ${examples.map((x) => `<button class="chip" type="button" data-term="${x}">${x}</button>`).join('')}
    </div>`;
  box.focus();
}
