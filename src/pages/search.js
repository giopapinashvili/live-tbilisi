/** ძებნის შედეგების გვერდი. */

import { boot, $, params } from './_boot.js';
import { mountSearchBox } from '../components/searchbox.js';
import { businessList, emptyState, EMPTY, skeletonCards } from '../components/cards.js';
import { loadCity, getState } from '../lib/store.js';
import { searchAll } from '../lib/search.js';
import { num } from '../lib/format.js';

boot({ active: '', compact: true });

const results = $('#results');
const countBox = $('#result-count');
const initial = params.get('q') ?? '';

const box = mountSearchBox($('#search-host'), {
  big: true,
  value: initial,
  placeholder: 'ბიზნესი, კატეგორია, უბანი…',
  onSubmit: (term) => run(term),
  onSelect: (hit) => {
    if (hit.kind === 'business') location.href = `/business.html?b=${encodeURIComponent(hit.slug ?? hit.id)}`;
    else location.href = hit.href;
  },
});

loadCity().then(() => { if (initial) run(initial); else showHint(); });

function run(term) {
  const q = term.trim();
  params.set({ q: q || null });
  document.title = q ? `„${q}" — ძებნა · თბილისი LIVE` : 'ძებნა — თბილისი LIVE';

  if (!q) { showHint(); return; }
  if (!getState().businesses.length) {
    results.innerHTML = emptyState(EMPTY.noData);
    countBox.textContent = '';
    return;
  }

  results.innerHTML = skeletonCards(3);
  const hits = searchAll(q);
  countBox.textContent = hits.length ? `${num(hits.length)} შედეგი „${q}"-ზე` : '';
  results.innerHTML = businessList(hits.slice(0, 60));
}

function showHint() {
  countBox.textContent = '';
  results.innerHTML = emptyState({
    icon: 'search',
    title: 'რას ეძებ?',
    text: 'დაწერე ბიზნესის სახელი, კატეგორია ან უბანი. ქართულადაც და ლათინურადაც მუშაობს.',
  });
  box.focus();
}
