/**
 * მომხმარებლის პროფილი.
 *
 * ავტორიზაციამდეც მუშაობს: გემოვნების პროფილი ბრაუზერშია და
 * მომხმარებელი ხედავს, რას „ხედავს" მასში სისტემა. შესვლისას
 * იგივე მონაცემი Firestore-ში გადადის.
 */

import { boot, $, esc, delegate, toast } from './_boot.js';
import { icon } from '../lib/icons.js';
import { emptyState } from '../components/cards.js';
import { loadCity, getState } from '../lib/store.js';
import { getProfile, maturity, syncProfile } from '../lib/taste.js';
import { CATEGORY_MAP, SUBCATEGORY_MAP } from '../data/taxonomy.js';
import { num } from '../lib/format.js';
import { HAS_BACKEND } from '../lib/config.js';

boot({ active: 'profile', canonical: false });

const root = $('#root');
let user = null;

(async () => {
  await loadCity();
  if (HAS_BACKEND) {
    const { onUser } = await import('../lib/supabase.js');
    onUser((u) => { user = u; paint(); syncProfile(); });
  } else {
    paint();
  }
})();

function paint() {
  const p = getProfile();
  const m = maturity();
  const { byId } = getState();

  const topCats = Object.entries(p.cats).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topSubs = Object.entries(p.subs).sort((a, b) => b[1] - a[1]).slice(0, 8);

  root.innerHTML = `
    <header class="pf-head">
      <div class="pf-avatar">
        ${user?.photoURL
    ? `<img src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer">`
    : icon('user', { size: 34 })}
      </div>
      <div class="pf-info">
        <h1 class="pf-name">${esc(user?.displayName ?? 'სტუმარი')}</h1>
        <div class="pf-stats">
          <div class="pf-stat"><b>${num(p.follows.length)}</b><span>გამოწერილი</span></div>
          <div class="pf-stat"><b>${num(p.saves.length)}</b><span>შენახული</span></div>
          <div class="pf-stat"><b>${num(Object.keys(p.seen).length)}</b><span>ნანახი</span></div>
        </div>
        <div class="pf-bio">
          ${user
    ? esc(user.email ?? '')
    : 'ანგარიშის გარეშეც მუშაობს — მონაცემი ამ ბრაუზერშია. შესვლისას სხვა მოწყობილობაზეც გადმოვა.'}
        </div>
      </div>
    </header>

    <div class="pf-actions">
      ${HAS_BACKEND
    ? (user
      ? '<button class="btn" type="button" data-act="logout">გასვლა</button>'
      : '<button class="btn btn-primary" type="button" data-act="login">შესვლა</button>')
    : ''}
      <a class="btn" href="/dashboard.html">ჩემი ბიზნესი</a>
    </div>

    <section class="aside-card" style="margin-top:var(--sp-4)">
      <h3>რას სწავლობს ფიდი შენზე</h3>
      <div style="height:8px; border-radius:99px; background:var(--surface-2); overflow:hidden; margin-bottom:var(--sp-3)">
        <div style="height:100%; width:${Math.max(4, m * 100)}%; background:var(--accent)"></div>
      </div>
      <p class="dim" style="font-size:var(--fs-xs)">
        ${m < 0.15
    ? 'ჯერ თითქმის არაფერი — ფიდი მანძილითა და ღიაობით ლაგდება.'
    : `ფიდის ${Math.round(m * 100)}% შენს ინტერესებზეა მორგებული.`}
      </p>

      ${topCats.length ? `
        <div class="eyebrow" style="margin:var(--sp-4) 0 var(--sp-2)">ინტერესები</div>
        <div class="row-wrap">
          ${topCats.map(([id, v]) => `
            <span class="chip" style="--dot:var(--cat-${id})">
              <span class="chip-dot"></span>${esc(CATEGORY_MAP[id]?.ka ?? id)}
              <span class="dim">${Math.round(v)}</span>
            </span>`).join('')}
        </div>` : ''}

      ${topSubs.length ? `
        <div class="eyebrow" style="margin:var(--sp-4) 0 var(--sp-2)">დეტალურად</div>
        <div class="row-wrap">
          ${topSubs.map(([id]) => `<span class="chip">${esc(SUBCATEGORY_MAP[id]?.ka ?? id)}</span>`).join('')}
        </div>` : ''}

      <div class="row" style="margin-top:var(--sp-4)">
        <button class="btn btn-sm" type="button" data-act="reset">გემოვნების გასუფთავება</button>
      </div>
    </section>

    ${p.follows.length ? `
      <section class="aside-card">
        <h3>გამოწერილი</h3>
        ${p.follows.slice(0, 10).map((id) => {
    const b = byId.get(id);
    return b ? `
          <a class="aside-row" href="/business.html?b=${encodeURIComponent(b.slug ?? b.id)}">
            <span class="aside-dot" style="background:var(--cat-${b.category ?? 'public'})"></span>
            <span style="flex:1">${esc(b.name)}</span>
          </a>` : '';
  }).join('')}
      </section>` : ''}

    ${!p.follows.length && !p.saves.length
    ? emptyState({
      icon: 'sparkle',
      title: 'ჯერ ცარიელია',
      text: 'დაათვალიერე ფიდი, გამოიწერე ადგილები — და ეს გვერდი შენზე მოირგება.',
      action: { href: '/', label: 'ფიდზე გადასვლა' },
    })
    : ''}
  `;
}

delegate(root, 'click', '[data-act]', async (e, btn) => {
  const act = btn.dataset.act;
  if (act === 'login') {
    const { signInWithGoogle } = await import('../lib/supabase.js');
    await signInWithGoogle().catch(() => toast('შესვლა ვერ მოხერხდა', 'error'));
  }
  if (act === 'logout') {
    const { signOutUser } = await import('../lib/supabase.js');
    await signOutUser();
  }
  if (act === 'reset') {
    if (!confirm('გემოვნების პროფილი წაიშლება. გავაგრძელო?')) return;
    try { localStorage.removeItem('tl.taste.v1'); } catch { /* ignore */ }
    location.reload();
  }
});
