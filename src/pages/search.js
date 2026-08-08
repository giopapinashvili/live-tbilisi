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
import { icon } from '../lib/icons.js';
import { attr } from '../lib/dom.js';

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

// ბოლო ძებნა. params-ს ვერ ვენდობით: ის მისამართის სნეპშოტია
// და ახალ ძებნაზე ძველ მნიშვნელობას აბრუნებდა — შედეგად ჩემივე
// დაცვა დაგვიანებული პასუხისგან ყოველთვის ჭრიდა ხალხის სიას.
let lastQuery = '';

function run(term) {
  const q = term.trim();
  lastQuery = q;
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
  findPeople(q);          // ბაზას ცალკე ვეკითხებით, შედეგს დამატებით ჩავსვამთ

  const total = (prod.total ?? 0) + biz.length;
  countBox.textContent = total
    ? `${num(prod.total ?? 0)} პროდუქტი და ${num(biz.length)} ადგილი „${esc(q)}"-ზე`
    : '';

  if (!total) {
    // ხალხი ცალკე მოდის და შეიძლება მაინც მოიძებნოს — ამიტომ
    // „ვერ მოიძებნა" ცალკე ბლოკშია და მას არ შლის
    results.innerHTML = `<div id="none-yet">${emptyState({
      icon: 'search',
      title: `„${q}" ვერ მოიძებნა`,
      text: 'სცადე სხვა სიტყვა. ბაზაში ჯერ მხოლოდ ნაძალადევის რაიონია.',
    })}</div>`;
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


/* ─── ხალხი და გვერდები ────────────────────────────────────── */

/**
 * ბიზნესები ბანდლშია, ხალხი და გვერდები კი ბაზაში — ორი სხვადასხვა
 * წყაროა და ერთ მოთხოვნაში ვერ გაერთიანდება.
 *
 * ამიტომ ბაზას ცალკე ვეკითხებით და პასუხს მოსვლისთანავე ვსვამთ
 * სიის თავში. ლოდინი არ გვინდა: ბანდლის შედეგი მაშინვე ჩანს,
 * ხალხი კი ერთ წამში ემატება.
 */
async function findPeople(q) {
  if (q.length < 2) return;
  try {
    const { supa } = await import('../lib/supabase.js');
    const sb = await supa();
    const { data, error } = await sb.rpc('search_actors', { q, lim: 8 });
    if (error || !data?.length) return;

    // შედეგი შეიძლება დაგვიანდეს — თუ ძებნა შეიცვალა, აღარ ვსვამთ
    if (lastQuery !== q) return;

    const html = `
      <section class="sec" id="people-sec">
        <div class="sec-head"><h2>ხალხი და გვერდები</h2>
          <span class="dim">${num(data.length)} შედეგი</span></div>
        <div class="stack">
          ${data.map(personRow).join('')}
        </div>
      </section>`;

    // თუ სხვა შედეგი არ იყო, „ვერ მოიძებნა" აღარ გვჭირდება
    document.getElementById('none-yet')?.remove();

    const old = document.getElementById('people-sec');
    if (old) old.outerHTML = html;
    else results.insertAdjacentHTML('afterbegin', html);
  } catch (err) {
    console.warn('[search] ხალხი ვერ ჩამოვიდა:', err.message);
  }
}

function personRow(p) {
  const kindWord = p.kind === 'group' ? 'ჯგუფი' : p.kind === 'page' ? 'გვერდი' : 'ადამიანი';
  const href = `/profile.html?u=${encodeURIComponent(p.username ?? '')}`;

  return `
    <a class="prow prow-card" href="${href}">
      <span class="actor-face">${p.avatar_url
    ? `<img src="${attr(p.avatar_url)}" alt="">`
    : esc((p.display_name ?? '?').charAt(0))}</span>
      <span class="prow-who">
        <b>${esc(p.display_name ?? '')}${p.verified
    ? ` <span class="pf-verified">${icon('check', { size: 12 })}</span>` : ''}</b>
        <small>${esc(kindWord)}${p.username ? ` · @${esc(p.username)}` : ''}</small>
      </span>
      <button class="btn btn-sm btn-primary" type="button"
              data-follow-actor="${attr(p.id)}" data-on="false">გამოწერა</button>
    </a>`;
}

// გამოწერა პირდაპირ ძებნიდან — პროფილზე შესვლა ზედმეტი ნაბიჯია
delegate(results, 'click', '[data-follow-actor]', async (e, btn) => {
  e.preventDefault();
  e.stopPropagation();

  const { allowed } = await import('../lib/gate.js');
  if (!allowed('follow')) return;

  const { toggleFollow } = await import('../lib/posts.js');
  const on = btn.dataset.on !== 'true';
  try {
    await toggleFollow(btn.dataset.followActor, on);
    btn.dataset.on = String(on);
    btn.textContent = on ? 'გამოწერილი' : 'გამოწერა';
    btn.classList.toggle('btn-primary', !on);
  } catch (err) {
    const { toast } = await import('../lib/dom.js');
    toast(err.message, 'error');
  }
});
