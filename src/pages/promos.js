/** ფასდაკლებების გვერდი. */

import { boot, $, esc, attr } from './_boot.js';
import { emptyState, EMPTY, skeletonCards } from '../components/cards.js';
import { activePromos } from '../lib/data/promos.js';
import { loadCity, getState } from '../lib/store.js';
import { dateLong } from '../lib/format.js';
import { icon } from '../lib/icons.js';

boot({ active: 'feed' });

const results = $('#results');
results.innerHTML = skeletonCards(4);

(async () => {
  await loadCity();
  let promos = [];
  try { promos = await activePromos(); } catch (e) { console.error(e); }

  if (!promos.length) {
    results.innerHTML = emptyState(EMPTY.noPromos);
    return;
  }

  const byId = getState().byId;
  results.innerHTML = `<div class="grid-cards">${promos.map((p) => {
    const b = byId.get(p.businessId);
    return `
      <article class="card" style="border-left:3px solid var(--accent)">
        ${p.photo ? `<div class="card-media"><img src="${attr(p.photo)}" alt="" loading="lazy"></div>` : ''}
        <div class="card-body">
          <div class="badge badge-promo" style="margin-bottom:var(--sp-2)">
            ${icon('tag', { size: 12 })} აქცია
          </div>
          <h3 class="card-title">${esc(p.title ?? '')}</h3>
          ${p.descr ? `<p class="muted" style="font-size:var(--fs-sm)">${esc(p.descr)}</p>` : ''}
          <div class="card-meta">
            ${b ? `<a href="/business.html?b=${encodeURIComponent(b.slug ?? b.id)}">${esc(b.name)}</a>` : ''}
            ${p.endsAt ? `<span>·</span><span>მოქმედებს ${esc(dateLong(p.endsAt))}-მდე</span>` : ''}
          </div>
        </div>
      </article>`;
  }).join('')}</div>`;
})();
