/** მთავარი გვერდი — ფიდი. */

import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/pages.css';
import '../styles/app.css';

import { $, esc, attr, delegate, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { followSystemTheme } from '../lib/theme.js';
import { mountTabBar } from '../components/tabbar.js';
import { mountSearchBox } from '../components/searchbox.js';
import { emptyState, EMPTY } from '../components/cards.js';
import { loadCity, getState, stats } from '../lib/store.js';
import { loadItems } from '../lib/items.js';
import { buildFeed, buildStories, emojiFor, loadPosts } from '../lib/feed.js';
import {
  rankFeed, record, toggleFollow, toggleSave, toggleLike,
  isFollowing, isSaved, isLiked, maturity,
} from '../lib/taste.js';
import { KIND_LABEL } from '../data/post-templates.js';
import { ago } from '../lib/format.js';
import { distance, num, price } from '../lib/format.js';
import { CATEGORIES, CATEGORY_MAP, DISTRICTS } from '../data/taxonomy.js';
import { setCanonical } from '../lib/seo.js';

followSystemTheme();
mountTabBar({ active: 'feed' });
setCanonical('/');

const feedHost = $('#feed');
const PAGE = 10;
let all = [];
let shown = PAGE;
let origin = null;

mountSearchBox($('#feed-search'), {
  placeholder: 'შაურმა, ცემენტი, აფთიაქი…',
  onSubmit: (t) => { if (t.trim()) location.href = `/search.html?q=${encodeURIComponent(t.trim())}`; },
});

feedHost.innerHTML = skeleton();

let posts = [];

(async () => {
  const [, , p] = await Promise.all([loadCity(), loadItems(), loadPosts()]);
  posts = p ?? [];
  origin = await locate();
  render();
  renderStories();
  renderAside();
})();

/** მდებარეობა — თუ უარს იტყვის, ქალაქის ცენტრით ვმუშაობთ */
function locate() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const done = (v) => resolve(v);
    navigator.geolocation.getCurrentPosition(
      (p) => done([p.coords.longitude, p.coords.latitude]),
      () => done(null),
      { timeout: 4000, maximumAge: 300000 },
    );
    setTimeout(() => done(null), 4500);
  });
}

function render() {
  const { businesses } = getState();
  if (!businesses.length) { feedHost.innerHTML = emptyState(EMPTY.noData); return; }

  all = rankFeed(buildFeed({ origin, limit: 60, posts }));
  paint();
}

function paint() {
  feedHost.innerHTML = all.slice(0, shown).map(card).join('');
  $('#more').hidden = all.length <= shown;
}

$('#more').addEventListener('click', () => { shown += PAGE; paint(); });

/* ─── ბარათები ─────────────────────────────────────────────── */

function card(e) {
  if (e.type === 'post') return postCard(e);
  if (e.type === 'collection') return collectionCard(e);
  return placeCard(e);
}

/** ბიზნესის პოსტი — ინსტაგრამის ბარათი */
function postCard(e) {
  const b = e.business;
  const href = `/business.html?b=${encodeURIComponent(b.slug ?? b.id)}`;
  const tint = `--tint:var(--cat-${b.category ?? 'public'})`;
  const liked = isLiked(e.id);
  const likes = (e.likeCount ?? 0) + (liked ? 1 : 0);

  return `
  <article class="post" data-id="${attr(b.id)}" data-post="${attr(e.id)}">
    <div class="post-head">
      <a class="post-avatar story-ring-sm" href="${href}"
         style="background:var(--cat-${b.category ?? 'public'})">${emojiFor(b)}</a>
      <span class="post-who">
        <a class="post-name" href="${href}">${esc(b.name)}</a>
        <span class="post-meta">
          ${esc(ago(e.createdAt))}${e.distance != null ? ` · ${esc(distance(e.distance))}` : ''}
        </span>
      </span>
      <button class="btn btn-sm ${isFollowing(b.id) ? '' : 'btn-primary'}" type="button"
              data-act="follow" data-id="${attr(b.id)}">
        ${isFollowing(b.id) ? 'გამოწერილი' : 'გამოწერა'}
      </button>
    </div>

    <div class="post-media" style="${tint}" data-act="dbl" data-post="${attr(e.id)}" data-id="${attr(b.id)}">
      <span class="post-media-fill">${e.emoji}</span>
      <span class="post-badge">${esc(KIND_LABEL[e.kind] ?? '')}</span>
      <span class="heart-pop" aria-hidden="true">${icon('heart', { size: 88, fill: true })}</span>
    </div>

    <div class="post-body">
      <div class="post-actions">
        <button class="post-act act-like" type="button" data-act="like"
                data-post="${attr(e.id)}" data-id="${attr(b.id)}" aria-pressed="${liked}"
                aria-label="მოწონება">
          ${icon('heart', { size: 24, fill: liked })}
        </button>
        <button class="post-act" type="button" data-act="comment" aria-label="კომენტარი">
          ${icon('info', { size: 24 })}
        </button>
        <a class="post-act" href="/map.html?b=${encodeURIComponent(b.slug ?? b.id)}" aria-label="რუკაზე">
          ${icon('pin', { size: 24 })}
        </a>
        <span class="spacer"></span>
        <button class="post-act" type="button" data-act="save" data-id="${attr(b.id)}"
                aria-pressed="${isSaved(b.id)}" aria-label="შენახვა">
          ${icon('tag', { size: 22, fill: isSaved(b.id) })}
        </button>
      </div>

      <div class="post-likes" data-likes="${attr(e.id)}">${num(likes)} მოწონება</div>

      <p class="post-text">
        <a class="post-name-inline" href="${href}">${esc(b.name)}</a>
        ${esc(e.text)}
      </p>

      ${e.commentCount ? `<div class="post-comments">${num(e.commentCount)} კომენტარის ნახვა</div>` : ''}
    </div>
  </article>`;
}

function placeCard(e) {
  const b = e.business;
  const href = `/business.html?b=${encodeURIComponent(b.slug ?? b.id)}`;
  const tint = `--tint:var(--cat-${b.category ?? 'public'}); --ring:var(--cat-${b.category ?? 'public'})`;
  const st = e.state;

  return `
  <article class="post" data-id="${attr(b.id)}">
    <div class="post-head" style="${tint}">
      <span class="post-avatar" style="background:var(--cat-${b.category ?? 'public'})">${e.emoji}</span>
      <span class="post-who">
        <a class="post-name" href="${href}">${esc(b.name)}</a>
        <span class="post-meta">
          ${esc(e.headline)}${e.distance != null ? ` · ${esc(distance(e.distance))}` : ''}
        </span>
      </span>
      <span class="badge badge-${st.state}">${esc(st.short)}</span>
    </div>

    <a class="post-media" href="${href}" style="${tint}">
      <span class="post-media-fill">${e.emoji}</span>
      ${e._why?.length ? `<span class="post-badge">${esc(e._why[0])}</span>` : ''}
      ${e.items?.length ? `<span class="post-price">${esc(price(Math.min(...e.items.map((i) => i.price))))}-დან</span>` : ''}
    </a>

    ${e.items?.length ? `
      <div class="post-rail">
        ${e.items.map((it) => `
          <a class="rail-item" href="${href}" data-catalog="${attr(it.catalogId ?? '')}">
            <div class="rail-name">${esc(it.name)}</div>
            <div class="rail-sub">${esc(it.group ?? '')}</div>
            <div class="rail-price">${esc(price(it.price))}</div>
          </a>`).join('')}
      </div>` : ''}

    <div class="post-body">
      <div class="post-actions">
        <button class="post-act" type="button" data-act="like" data-id="${attr(b.id)}"
                aria-pressed="${isSaved(b.id)}">
          ${icon('heart', { size: 20 })}<span>მოწონება</span>
        </button>
        <button class="post-act" type="button" data-act="follow" data-id="${attr(b.id)}"
                aria-pressed="${isFollowing(b.id)}">
          ${icon('plus', { size: 20 })}<span>${isFollowing(b.id) ? 'გამოწერილი' : 'გამოწერა'}</span>
        </button>
        <a class="post-act" href="/map.html?b=${encodeURIComponent(b.slug ?? b.id)}">
          ${icon('pin', { size: 20 })}<span>რუკაზე</span>
        </a>
      </div>
      <p class="post-text">
        <b>${esc(b.name)}</b>
        ${b.address ? ` — ${esc(b.address)}` : ''}
        ${st.state === 'open' && st.until != null ? ` · ღიაა ${esc(st.label.replace('ღიაა ', ''))}` : ''}
      </p>
    </div>
  </article>`;
}

function collectionCard(e) {
  return `
  <article class="post">
    <div class="post-head">
      <span class="post-avatar" style="background:var(--accent)">${e.emoji}</span>
      <span class="post-who">
        <span class="post-name">${esc(e.title)} ახლოს</span>
        <span class="post-meta">${num(e.count)} ადგილას · ფასის მიხედვით</span>
      </span>
    </div>
    <div class="post-rail" style="padding-top:var(--sp-3)">
      ${e.picks.map((p) => `
        <a class="rail-item" href="/business.html?b=${encodeURIComponent(p.business.slug ?? p.business.id)}">
          <div class="rail-name">${esc(p.business.name)}</div>
          <div class="rail-sub">${p.distance != null ? esc(distance(p.distance)) : esc(p.item.group ?? '')}</div>
          <div class="rail-price">${esc(price(p.item.price))}</div>
        </a>`).join('')}
    </div>
    ${e.related?.length ? `
      <div class="post-body" style="padding-top:0">
        <div class="row-wrap">
          ${e.related.map((r) => `
            <a class="chip" href="/search.html?q=${encodeURIComponent(r.name)}">${esc(r.name)}</a>`).join('')}
        </div>
      </div>` : ''}
  </article>`;
}

/* ─── Stories ──────────────────────────────────────────────── */

function renderStories() {
  const list = buildStories({ origin });
  const host = $('#stories');
  if (!list.length) { host.hidden = true; return; }
  host.innerHTML = list.map((s) => `
    <a class="story" href="/business.html?b=${encodeURIComponent(s.business.slug ?? s.business.id)}"
       style="--ring:var(--cat-${s.business.category ?? 'public'})">
      <span class="story-ring">${s.emoji}</span>
      <span class="story-name">${esc(s.business.name)}</span>
    </a>`).join('');
}

/* ─── გვერდითი სვეტი ───────────────────────────────────────── */

function renderAside() {
  const s = stats();
  const m = maturity();
  $('#aside').innerHTML = `
    <div class="aside-card">
      <h3>კატეგორიები</h3>
      ${CATEGORIES.slice(0, 8).map((c) => `
        <a class="aside-row" href="/category.html?cat=${c.id}">
          <span class="aside-dot" style="background:var(--cat-${c.id})">${icon(c.icon, { size: 14 })}</span>
          <span style="flex:1">${esc(c.ka)}</span>
          <span class="dim">${num(s.byCategory.get(c.id) ?? 0)}</span>
        </a>`).join('')}
      <a class="aside-row" href="/category.html" style="color:var(--accent)">ყველა კატეგორია →</a>
    </div>

    <div class="aside-card">
      <h3>უბნები</h3>
      <div class="row-wrap">
        ${DISTRICTS.map((d) => `<a class="chip" href="/category.html?district=${d.id}">${esc(d.ka)}</a>`).join('')}
      </div>
    </div>

    <div class="aside-card">
      <h3>ფიდი შენზეა მორგებული</h3>
      <p class="dim" style="font-size:var(--fs-xs); margin:0 0 var(--sp-2)">
        ${m < 0.15
    ? 'ჯერ მანძილითა და ღიაობით ვალაგებ. რაც მეტს დააჭერ, მით უფრო შენებური გახდება.'
    : `შენი ინტერესები უკვე გავითვალისწინე — ფიდის ${Math.round(m * 100)}% შენზეა მორგებული.`}
      </p>
      <div style="height:6px; border-radius:99px; background:var(--surface-2); overflow:hidden">
        <div style="height:100%; width:${Math.max(4, m * 100)}%; background:var(--accent)"></div>
      </div>
    </div>

    <p class="dim" style="font-size:var(--fs-xs); padding:0 var(--sp-2)">
      მონაცემები © OpenStreetMap contributors
    </p>`;
}

/* ─── ქმედებები ────────────────────────────────────────────── */

delegate(feedHost, 'click', '[data-act]', (e, btn) => {
  const act = btn.dataset.act;
  if (act === 'dbl') return;                      // ორმაგი დაჭერა ცალკე მუშავდება
  e.preventDefault();

  const id = btn.dataset.id;
  const b = getState().byId.get(id);

  if (act === 'like') {
    setLike(btn.dataset.post, id, !isLiked(btn.dataset.post));
  }

  if (act === 'save') {
    const on = toggleSave(id);
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = icon('tag', { size: 22, fill: on });
    record(on ? 'save' : 'view', { business: b });
    if (on) toast('შენახულია');
  }

  if (act === 'follow') {
    const on = toggleFollow(id);
    btn.textContent = on ? 'გამოწერილი' : 'გამოწერა';
    btn.classList.toggle('btn-primary', !on);
    record('follow', { business: b });
  }

  if (act === 'comment') toast('კომენტარები მალე დაემატება');

  renderAside();
});

/** მოწონება — ერთ ადგილას, რომ ღილაკიც და ორმაგი დაჭერაც ერთნაირად მუშაობდეს */
function setLike(postId, businessId, want) {
  if (!postId) return;
  const nowLiked = isLiked(postId) === want ? want : toggleLike(postId);
  const card = feedHost.querySelector(`[data-post="${CSS.escape(postId)}"]`);
  if (!card) return;

  const btn = card.querySelector('.act-like');
  if (btn) {
    btn.setAttribute('aria-pressed', String(nowLiked));
    btn.innerHTML = icon('heart', { size: 24, fill: nowLiked });
    btn.classList.toggle('bump', nowLiked);
    setTimeout(() => btn.classList.remove('bump'), 350);
  }

  const entry = all.find((x) => x.id === postId);
  const counter = card.querySelector('[data-likes]');
  if (counter && entry) counter.textContent = `${num((entry.likeCount ?? 0) + (nowLiked ? 1 : 0))} მოწონება`;

  record('like', { business: getState().byId.get(businessId), catalogId: entry?.catalogId });
}

/* ორმაგი დაჭერა სურათზე — ინსტაგრამის ჟესტი */
delegate(feedHost, 'dblclick', '[data-act="dbl"]', (e, media) => {
  e.preventDefault();
  setLike(media.dataset.post, media.dataset.id, true);
  media.classList.remove('pop');
  void media.offsetWidth;
  media.classList.add('pop');
});

// ბიზნესზე გადასვლა გემოვნებაში ჩაიწერება
delegate(feedHost, 'click', 'a[href^="/business.html"]', (e, a) => {
  const id = a.closest('[data-id]')?.dataset.id;
  const catalogId = a.dataset.catalog;
  record('open', { business: getState().byId.get(id), catalogId: catalogId || undefined });
});

function skeleton() {
  return Array.from({ length: 3 }, () => `
    <article class="post">
      <div class="post-head">
        <span class="post-avatar skel"></span>
        <span class="post-who"><div class="skel skel-line" style="width:40%"></div>
          <div class="skel skel-line" style="width:60%"></div></span>
      </div>
      <div class="post-media skel"></div>
      <div class="post-body"><div class="skel skel-line"></div></div>
    </article>`).join('');
}
