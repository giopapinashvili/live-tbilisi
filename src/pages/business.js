/**
 * ბიზნესის გვერდი — ინსტაგრამის პროფილის სტრუქტურით.
 *
 *   ლოგო + სტატისტიკა + ბიო
 *   გაყოლა · მარშრუტი · დარეკვა
 *   Highlights = მენიუს ჯგუფები (დაჭერით ბადე იფილტრება)
 *   ტაბები: ბადე · მენიუ · პოსტები · შეფასებები
 *
 * განსხვავება ინსტაგრამისგან: ბადეში ფოტო კი არა, პროდუქტია —
 * ფასით, ინგრედიენტებით და კატალოგის კავშირით. იგივე გარეგნობა,
 * ძებნადი შიგთავსით.
 */

import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/pages.css';
import '../styles/app.css';

import { $, esc, attr, params, toast, delegate } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { followSystemTheme } from '../lib/theme.js';
import { mountTabBar } from '../components/tabbar.js';
import { emptyState, EMPTY, stars } from '../components/cards.js';
import { jsonLd } from '../components/detail.js';
import { loadCity, getBusiness, getState } from '../lib/store.js';
import { loadItems, relatedTo, businessesWithCatalog } from '../lib/items.js';
import { emojiFor, emojiForCatalog } from '../lib/feed.js';
import { statusBadge, weekTable } from '../lib/hours.js';
import { price, phone as fmtPhone, num, distance, haversine, ago } from '../lib/format.js';
import { catName, subName, CATEGORY_MAP, DISTRICT_MAP, ATTRIBUTE_MAP } from '../data/taxonomy.js';
import { record, toggleFollow, toggleSave, isFollowing, isSaved } from '../lib/taste.js';
import { openCommentSheet, starsView, commentCount } from '../components/comments.js';
import { displayRating, getComments } from '../lib/social.js';
import { setTitle, setDescription, setCanonical, setJsonLd } from '../lib/seo.js';
import { HAS_FIREBASE } from '../lib/config.js';

followSystemTheme();
mountTabBar({ active: '' });

const root = $('#pf');
const slug = params.get('b');
let biz = null;
let activeGroup = null;
let activeTab = 'grid';

if (!slug) {
  root.innerHTML = emptyState({ ...EMPTY.noResults, title: 'ბიზნესი მითითებული არ არის' });
} else {
  root.innerHTML = '<div class="skel" style="height:120px; border-radius:var(--r-md)"></div>';
  init();
}

async function init() {
  await Promise.all([loadCity(), loadItems()]);
  biz = await getBusiness(slug);

  if (!biz) {
    root.innerHTML = emptyState({
      icon: 'search',
      title: 'ბიზნესი ვერ მოიძებნა',
      text: 'შესაძლოა ბმული მოძველებულია.',
      action: { href: '/map.html', label: 'რუკაზე დაბრუნება' },
    });
    return;
  }

  setTitle(`${biz.name} — თბილისი LIVE`);
  setDescription(buildDescription(biz));
  setCanonical(`/business.html?b=${biz.slug ?? biz.id}`);
  setJsonLd(jsonLd(biz));
  record('open', { business: biz });

  paint();
}

/* ─── რენდერი ──────────────────────────────────────────────── */

function paint() {
  const st = statusBadge(biz);
  const cat = CATEGORY_MAP[biz.category];
  const dist = DISTRICT_MAP[biz.district];
  const groups = menuGroups();
  const rate = displayRating(biz);
  const tint = `--ring:var(--cat-${biz.category ?? 'public'}); --tint:var(--cat-${biz.category ?? 'public'})`;

  root.innerHTML = `
    <div class="row" style="margin-bottom:var(--sp-4)">
      <a class="btn btn-ghost btn-sm" href="/">${icon('back', { size: 14 })} ფიდი</a>
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-icon btn-sm" type="button" data-act="share" aria-label="გაზიარება">
        ${icon('share', { size: 16 })}
      </button>
      <button class="btn btn-ghost btn-icon btn-sm" type="button" data-act="report" aria-label="შეცდომა">
        ${icon('flag', { size: 16 })}
      </button>
    </div>

    <header class="pf-head" style="${tint}">
      <div class="pf-avatar" style="background:var(--cat-${biz.category ?? 'public'}); font-size:34px">
        ${biz.logo || biz.cover
    ? `<img src="${attr(biz.logo || biz.cover)}" alt="">`
    : emojiFor(biz)}
      </div>

      <div class="pf-info">
        <h1 class="pf-name">
          ${esc(biz.name)}
          ${biz.tier >= 2 ? `<span class="pf-verified" title="სრული პროფილი">${icon('check', { size: 16 })}</span>` : ''}
        </h1>

        <div class="pf-stats">
          <div class="pf-stat"><b>${num(biz.items?.length ?? 0)}</b><span>პროდუქტი</span></div>
          <button class="pf-stat pf-stat-btn" type="button" data-act="rate">
            <b>${rate.avg ? rate.avg.toFixed(1) : '—'}</b><span>შეფასება</span>
          </button>
          <button class="pf-stat pf-stat-btn" type="button" data-act="rate">
            <b>${num(commentCount(`b:${biz.id}`))}</b><span>კომენტარი</span>
          </button>
        </div>

        <div class="pf-bio">
          <div>${esc(cat?.ka ?? '')}${biz.subcategories?.length ? ` · ${esc(subName(biz.subcategories[0]))}` : ''}</div>
          ${biz.address ? `<div>${esc(biz.address)}${dist ? `, ${esc(dist.ka)}` : ''}</div>` : ''}
          <div class="row" style="gap:var(--sp-2); margin-top:var(--sp-2)">
            <span class="badge badge-${st.state}">${esc(st.label)}</span>
          </div>
          ${biz.website ? `<div style="margin-top:4px"><a href="${attr(biz.website)}" target="_blank" rel="noopener nofollow">${esc(biz.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></div>` : ''}
        </div>
      </div>
    </header>

    <div class="pf-actions">
      <button class="btn ${isFollowing(biz.id) ? '' : 'btn-primary'}" type="button" data-act="follow">
        ${isFollowing(biz.id) ? 'გამოწერილი' : 'გაყოლა'}
      </button>
      <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${biz.lat},${biz.lon}"
         target="_blank" rel="noopener" data-act="route">მარშრუტი</a>
      ${biz.phone?.length
    ? `<a class="btn" href="tel:${attr(biz.phone[0])}" data-act="call">დარეკვა</a>`
    : '<button class="btn" type="button" disabled>ტელეფონი უცნობია</button>'}
      <button class="btn btn-icon act-heart" type="button" data-act="save" aria-pressed="${isSaved(biz.id)}"
              aria-label="შენახვა">${icon('heart', { size: 18, fill: isSaved(biz.id) })}</button>
    </div>

    <button class="pf-rate-bar" type="button" data-act="rate">
      ${starsView(rate.mine ?? rate.avg ?? 0, { size: 18 })}
      <span class="pf-rate-text">
        ${rate.mine
    ? `შენ შეაფასე ${rate.mine} ვარსკვლავით`
    : rate.count
      ? `${rate.avg.toFixed(1)} · ${num(rate.count)} შეფასება`
      : 'პირველი შეაფასე'}
      </span>
      <span class="dim">${icon('chevron', { size: 15 })}</span>
    </button>

    ${groups.length ? `
      <div class="pf-highlights">
        <button class="hl" type="button" data-group="" aria-pressed="${activeGroup === null}">
          <span class="hl-ring">${emojiFor(biz)}</span>
          <span class="hl-name">ყველა</span>
        </button>
        ${groups.map((g) => `
          <button class="hl" type="button" data-group="${attr(g.name)}" aria-pressed="${activeGroup === g.name}">
            <span class="hl-ring">${g.emoji}</span>
            <span class="hl-name">${esc(g.name)}</span>
          </button>`).join('')}
      </div>` : ''}

    <div class="pf-tabs" role="tablist">
      ${tabBtn('grid', 'ბადე')}
      ${tabBtn('menu', 'მენიუ')}
      ${tabBtn('posts', 'პოსტები')}
      ${tabBtn('reviews', 'შეფასებები')}
      ${tabBtn('info', 'ინფო')}
    </div>

    <div class="pf-panel" id="panel">${panel()}</div>
  `;
}

const tabBtn = (id, label) => `
  <button class="pf-tab" type="button" role="tab" data-tab="${id}"
          aria-selected="${activeTab === id}">${label}</button>`;

/** მენიუს ჯგუფები = highlights */
function menuGroups() {
  const items = biz.items ?? [];
  const map = new Map();
  for (const it of items) {
    const g = it.group || 'სხვა';
    if (!map.has(g)) map.set(g, { name: g, items: [], emoji: emojiForCatalog(it.catalogId) });
    map.get(g).items.push(it);
  }
  return [...map.values()];
}

function visibleItems() {
  const items = biz.items ?? [];
  return activeGroup ? items.filter((i) => (i.group || 'სხვა') === activeGroup) : items;
}

function panel() {
  if (activeTab === 'grid') return gridPanel();
  if (activeTab === 'menu') return menuPanel();
  if (activeTab === 'posts') return postsPanel();
  if (activeTab === 'reviews') return reviewsPanel();
  return infoPanel();
}

function reviewsPanel() {
  const rate = displayRating(biz);
  const list = getComments(`b:${biz.id}`);

  return `
    <div class="rev-summary">
      <div class="rev-big">${rate.avg ? rate.avg.toFixed(1) : '—'}</div>
      <div>
        ${starsView(rate.avg ?? 0, { size: 18 })}
        <div class="dim" style="font-size:var(--fs-xs); margin-top:2px">
          ${rate.count ? `${num(rate.count)} შეფასება` : 'ჯერ არავის შეუფასებია'}
        </div>
      </div>
      <span class="spacer"></span>
      <button class="btn btn-primary btn-sm" type="button" data-act="rate">
        ${rate.mine ? 'შეცვლა' : 'შეფასება'}
      </button>
    </div>

    ${list.length ? `<div class="rev-list">${list.map((c) => `
      <div class="cmt">
        <span class="cmt-avatar">${icon('user', { size: 15 })}</span>
        <div class="cmt-body">
          <div><b>${esc(c.author)}</b> <span class="dim">${esc(ago(c.createdAt))}</span></div>
          <div class="cmt-text">${esc(c.text)}</div>
        </div>
      </div>`).join('')}</div>`
    : emptyState({
      icon: 'info',
      title: 'კომენტარი ჯერ არ არის',
      text: 'დაწერე პირველი — სხვას გამოადგება.',
    })}`;
}

function gridPanel() {
  const items = visibleItems();
  if (!items.length) {
    return emptyState({
      icon: 'image',
      title: 'პროდუქტები ჯერ არ არის',
      text: 'როცა ბიზნესი მენიუს დაამატებს, აქ გამოჩნდება.',
    });
  }
  return `<div class="pf-grid">${items.map((it) => `
    <a class="gcell" href="#" data-item="${attr(it.id)}"
       style="--tint:var(--cat-${biz.category ?? 'public'})">
      <span class="gcell-art">${emojiForCatalog(it.catalogId, emojiFor(biz))}</span>
      <span class="gcell-price">${esc(price(it.price))}</span>
      <span class="gcell-over">${esc(it.name?.ka ?? it.name ?? '')}</span>
    </a>`).join('')}</div>`;
}

function menuPanel() {
  const groups = menuGroups().filter((g) => !activeGroup || g.name === activeGroup);
  if (!groups.length) return emptyState({ icon: 'tag', title: 'მენიუ ჯერ არ არის' });

  return groups.map((g) => `
    <section style="margin-bottom:var(--sp-5)">
      <div class="eyebrow" style="margin-bottom:var(--sp-3)">${esc(g.name)}</div>
      <div class="kv">
        ${g.items.map((it) => `
          <div class="kv-row" style="justify-content:space-between; gap:var(--sp-4)">
            <div style="flex:1">
              <div style="font-weight:600">${esc(it.name?.ka ?? it.name ?? '')}</div>
              ${it.ingredients?.length
    ? `<div class="dim" style="font-size:var(--fs-xs)">${it.ingredients.map(esc).join(' · ')}</div>` : ''}
              ${it.attrs?.duration ? `<div class="dim" style="font-size:var(--fs-xs)">${it.attrs.duration} წუთი</div>` : ''}
            </div>
            <div class="tnum" style="white-space:nowrap; font-weight:700">
              ${it.oldPrice ? `<s class="dim" style="font-weight:400">${esc(price(it.oldPrice))}</s> ` : ''}
              ${esc(price(it.price))}${it.unit ? `<span class="dim" style="font-weight:400"> / ${esc(it.unit)}</span>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </section>`).join('');
}

function postsPanel() {
  return emptyState({
    icon: 'image',
    title: 'პოსტები ჯერ არ არის',
    text: 'აქ გამოჩნდება ბიზნესის ფოტოები, ვიდეოები და სიახლეები — „ახლახან გამოვაცხვეთ", „დღეს 2+1".',
  });
}

function infoPanel() {
  const rows = [];
  if (biz.address) rows.push(kv('pin', esc(biz.address)));
  for (const p of biz.phone ?? []) rows.push(kv('phone', `<a href="tel:${attr(p)}">${esc(fmtPhone(p))}</a>`));
  if (biz.website) rows.push(kv('globe', `<a href="${attr(biz.website)}" target="_blank" rel="noopener nofollow">${esc(biz.website)}</a>`));

  const attrs = (biz.attrList ?? []).map((a) => ATTRIBUTE_MAP[a]?.ka).filter(Boolean);

  return `
    ${rows.length ? `<div class="kv" style="margin-bottom:var(--sp-5)">${rows.join('')}</div>` : ''}

    <section style="margin-bottom:var(--sp-5)">
      <h4>სამუშაო საათები</h4>
      ${biz.hours || biz.alwaysOpen
    ? `<table class="hours-table">${weekTable(biz).map((d) => `
          <tr data-today="${d.isToday}"><td>${esc(d.name)}</td><td>${esc(d.text)}</td></tr>`).join('')}</table>`
    : '<p class="dim" style="font-size:var(--fs-sm)">უცნობია</p>'}
    </section>

    ${attrs.length ? `
      <section style="margin-bottom:var(--sp-5)">
        <h4>მახასიათებლები</h4>
        <div class="row-wrap">${attrs.map((a) => `<span class="badge">${esc(a)}</span>`).join('')}</div>
      </section>` : ''}

    ${nearbySame()}

    <p class="dim" style="font-size:var(--fs-xs); border-top:1px solid var(--line); padding-top:var(--sp-3)">
      წყარო: ${esc({ osm: 'OpenStreetMap', owner: 'ბიზნესის მფლობელი', manual: 'რედაქცია' }[biz.source] ?? '—')}
      ${biz.updatedAt ? ` · განახლდა ${esc(ago(biz.updatedAt))}` : ''}
    </p>`;
}

const kv = (ic, html) => `<div class="kv-row">${icon(ic, { size: 17 })}<div>${html}</div></div>`;

/** „სად კიდევ იყიდება ეს" — კატალოგის კავშირი მოქმედებაში */
function nearbySame() {
  const first = biz.items?.[0];
  if (!first?.catalogId) return '';
  const others = businessesWithCatalog(first.catalogId)
    .filter((b) => b.id !== biz.id)
    .map((b) => ({ b, d: haversine([biz.lon, biz.lat], [b.lon, b.lat]) }))
    .sort((a, z) => a.d - z.d)
    .slice(0, 6);
  if (others.length < 2) return '';

  return `
    <section style="margin-bottom:var(--sp-5)">
      <h4>${esc(first.name?.ka ?? first.name)} სხვაგანაც</h4>
      <div class="post-rail" style="padding:0">
        ${others.map(({ b, d }) => `
          <a class="rail-item" href="/business.html?b=${encodeURIComponent(b.slug ?? b.id)}">
            <div class="rail-name">${esc(b.name)}</div>
            <div class="rail-sub">${esc(distance(d))}</div>
          </a>`).join('')}
      </div>
    </section>`;
}

function buildDescription(b) {
  return [b.name, catName(b.category), DISTRICT_MAP[b.district]?.ka, b.address,
    'მენიუ, ფასები, საათები — თბილისი LIVE'].filter(Boolean).join(' · ').slice(0, 300);
}

/* ─── ინტერაქცია ───────────────────────────────────────────── */

delegate(root, 'click', '[data-tab]', (e, btn) => {
  activeTab = btn.dataset.tab;
  for (const t of root.querySelectorAll('[data-tab]')) {
    t.setAttribute('aria-selected', String(t.dataset.tab === activeTab));
  }
  $('#panel').innerHTML = panel();
});

delegate(root, 'click', '[data-group]', (e, btn) => {
  activeGroup = btn.dataset.group || null;
  for (const h of root.querySelectorAll('[data-group]')) {
    h.setAttribute('aria-pressed', String((h.dataset.group || null) === activeGroup));
  }
  if (activeTab === 'posts' || activeTab === 'info') activeTab = 'grid';
  for (const t of root.querySelectorAll('[data-tab]')) {
    t.setAttribute('aria-selected', String(t.dataset.tab === activeTab));
  }
  $('#panel').innerHTML = panel();
});

delegate(root, 'click', '[data-act]', async (e, btn) => {
  const act = btn.dataset.act;

  if (act === 'follow') {
    e.preventDefault();
    const on = toggleFollow(biz.id);
    btn.textContent = on ? 'გამოწერილი' : 'გაყოლა';
    btn.classList.toggle('btn-primary', !on);
    record('follow', { business: biz });
    toast(on ? 'გამოწერილია' : 'გამოწერა გაუქმდა');
  }

  if (act === 'save') {
    e.preventDefault();
    const on = toggleSave(biz.id);
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = icon('heart', { size: 18, fill: on });
    record('save', { business: biz });
  }

  if (act === 'call') record('call', { business: biz });
  if (act === 'route') record('route', { business: biz });

  if (act === 'share') {
    e.preventDefault();
    const url = `${location.origin}/business.html?b=${biz.slug ?? biz.id}`;
    if (navigator.share) navigator.share({ title: biz.name, url }).catch(() => {});
    else { navigator.clipboard?.writeText(url); toast('ბმული დაკოპირდა'); }
  }

  if (act === 'report') { e.preventDefault(); openReport(); }

  if (act === 'rate') {
    e.preventDefault();
    openCommentSheet({ threadId: `b:${biz.id}`, business: biz, title: biz.name });
  }
});

// შეფასების ან კომენტარის შემდეგ გვერდი განახლდეს
document.addEventListener('tl:rating', () => paint());
document.addEventListener('tl:comment', () => paint());

delegate(root, 'click', '[data-item]', (e, a) => {
  e.preventDefault();
  const it = (biz.items ?? []).find((x) => x.id === a.dataset.item);
  if (!it) return;
  record('view', { business: biz, catalogId: it.catalogId });
  activeTab = 'menu';
  activeGroup = it.group || null;
  paint();
});

function openReport() {
  const dlg = $('#report-modal');
  dlg.showModal();
  dlg.querySelector('form').onsubmit = async (ev) => {
    if (ev.submitter?.value !== 'send') return;
    const data = new FormData(ev.target);
    const note = String(data.get('note') ?? '').trim();
    if (!note) { toast('აღწერე რა არის არასწორი', 'error'); ev.preventDefault(); return; }
    if (!HAS_FIREBASE) { toast('Firebase ჯერ არ არის დაყენებული', 'error'); return; }
    try {
      const { submitEdit } = await import('../lib/data/edits.js');
      await submitEdit({ businessId: biz.id, field: data.get('field'), note });
      toast('მადლობა — შევამოწმებთ', 'ok');
    } catch (err) {
      toast(err.code === 'permission-denied' ? 'ჯერ შედი ანგარიშში' : 'ვერ გაიგზავნა', 'error');
    }
  };
}
