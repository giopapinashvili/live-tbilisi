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
import { openPostModal } from '../components/post-modal.js';
import { commentCount } from '../lib/social.js';
import { distance, num, price, ago } from '../lib/format.js';
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
  const done = shown >= all.length;
  if (typeof sentinel !== 'undefined') sentinel.hidden = done;
  const more = $('#more');
  if (more) more.hidden = true;               // ღილაკი აღარ გვჭირდება
}

/* ─── ბარათები ─────────────────────────────────────────────── */

function card(e) {
  if (e.type === 'post') return postCard(e);
  if (e.type === 'collection') return collectionCard(e);
  return placeCard(e);
}

/**
 * ქმედებების ზოლი — ინსტაგრამის თანმიმდევრობით:
 * გული · კომენტარი · რეპოსტი · გაზიარება … შენახვა (მარჯვნივ)
 *
 * ადგილის ბარათს პოსტი არ აქვს, ამიტომ გული ბიზნესს ინახავს —
 * ქცევა ერთნაირია, მონაცემი სხვა.
 */
function actionBar({ postId = null, businessId, liked, slug }) {
  const on = postId ? liked : isSaved(businessId);
  const act = postId ? 'like' : 'save';
  const p = postId ? ` data-post="${attr(postId)}"` : '';

  return `
    <div class="post-actions">
      <button class="post-act act-heart" type="button" data-act="${act}"${p}
              data-id="${attr(businessId)}" aria-pressed="${on}" aria-label="მოწონება">
        ${icon('heart', { size: 25, fill: on })}
      </button>
      <button class="post-act" type="button" data-act="comment"${p}
              data-id="${attr(businessId)}" aria-label="კომენტარი">
        ${icon('bubble', { size: 25 })}
      </button>
      <button class="post-act" type="button" data-act="repost"${p}
              data-id="${attr(businessId)}" aria-label="რეპოსტი">
        ${icon('repost', { size: 25 })}
      </button>
      <button class="post-act" type="button" data-act="share"
              data-id="${attr(businessId)}" data-slug="${attr(slug)}" aria-label="გაზიარება">
        ${icon('plane', { size: 25 })}
      </button>
      <span class="spacer"></span>
      <button class="post-act" type="button" data-act="bookmark" data-id="${attr(businessId)}"
              aria-pressed="${isSaved(businessId)}" aria-label="შენახვა">
        ${icon('bookmark', { size: 24, fill: isSaved(businessId) })}
      </button>
    </div>`;
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
      <a class="post-avatar story-ring-sm${b.hasStory ? ' has-story' : ''}" href="${href}"
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

    <div class="post-media" style="${tint}" data-act="dbl" data-open-post="${attr(e.id)}"
         data-post="${attr(e.id)}" data-id="${attr(b.id)}">
      <span class="post-media-fill">${e.emoji}</span>
      <span class="post-badge">${esc(KIND_LABEL[e.kind] ?? '')}</span>
      <span class="heart-pop" aria-hidden="true">${icon('heart', { size: 88, fill: true })}</span>
    </div>

    <div class="post-body">
      ${actionBar({ postId: e.id, businessId: b.id, liked, slug: b.slug ?? b.id })}

      <div class="post-likes" data-likes="${attr(e.id)}">${num(likes)} მოწონება</div>

      <p class="post-text">
        <a class="post-name-inline" href="${href}">${esc(b.name)}</a>
        ${esc(e.text)}
      </p>

      <button class="post-comments" type="button" data-act="comment"
              data-post="${attr(e.id)}" data-id="${attr(b.id)}">
        ${commentCount(`p:${e.id}`)
    ? `${num(commentCount(`p:${e.id}`))} კომენტარის ნახვა`
    : 'დაწერე კომენტარი…'}
      </button>
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
      ${actionBar({ businessId: b.id, liked: isSaved(b.id), slug: b.slug ?? b.id })}
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

  // ადგილის ბარათზე გული ბიზნესს ინახავს — პოსტი აქ არ არის
  if (act === 'save') {
    const on = toggleSave(id);
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = icon('heart', { size: 25, fill: on });
    btn.classList.add('bump');
    setTimeout(() => btn.classList.remove('bump'), 350);
    record(on ? 'save' : 'view', { business: b });
    // შენახვის ღილაკიც განახლდეს — იგივე მდგომარეობაა
    const card = btn.closest('.post');
    const bm = card?.querySelector('[data-act="bookmark"]');
    if (bm) { bm.setAttribute('aria-pressed', String(on)); bm.innerHTML = icon('bookmark', { size: 24, fill: on }); }
  }

  if (act === 'bookmark') {
    const on = toggleSave(id);
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = icon('bookmark', { size: 24, fill: on });
    record(on ? 'save' : 'view', { business: b });
    if (on) toast('შენახულია');
  }

  if (act === 'share') {
    const url = `${location.origin}/business.html?b=${btn.dataset.slug}`;
    if (navigator.share) navigator.share({ title: b?.name, url }).catch(() => {});
    else { navigator.clipboard?.writeText(url); toast('ბმული დაკოპირდა'); }
    record('view', { business: b });
  }

  if (act === 'repost') {
    toggleSave(id);
    toast('შენს პროფილში დაემატა');
    record('save', { business: b });
  }

  if (act === 'follow') {
    const on = toggleFollow(id);
    btn.textContent = on ? 'გამოწერილი' : 'გამოწერა';
    btn.classList.toggle('btn-primary', !on);
    record('follow', { business: b });
  }

  if (act === 'comment') openComments(id, btn.dataset.post ?? null);

  renderAside();
});

/** მოწონება — ერთ ადგილას, რომ ღილაკიც და ორმაგი დაჭერაც ერთნაირად მუშაობდეს */
function setLike(postId, businessId, want) {
  if (!postId) return;
  const nowLiked = isLiked(postId) === want ? want : toggleLike(postId);
  const card = feedHost.querySelector(`[data-post="${CSS.escape(postId)}"]`);
  if (!card) return;

  const btn = card.querySelector('.act-heart');
  if (btn) {
    btn.setAttribute('aria-pressed', String(nowLiked));
    btn.innerHTML = icon('heart', { size: 25, fill: nowLiked });
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
  media.dataset.suppress = '1';
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

/** პოსტის ფანჯარა — მედია მარცხნივ, კომენტარები მარჯვნივ */
function openComments(businessId, postId) {
  const b = getState().byId.get(businessId);
  if (!b) return;
  const entry = postId ? all.find((x) => x.id === postId) : null;

  openPostModal({
    threadId: postId ? `p:${postId}` : `b:${businessId}`,
    business: b,
    post: entry ? { ...entry, kindLabel: KIND_LABEL[entry.kind] ?? '' } : null,
    emoji: entry?.emoji ?? emojiFor(b),
    onChange: () => paint(),
  });
  record('view', { business: b });
}

// კომენტარის დამატებისას მრიცხველი განახლდეს
document.addEventListener('tl:comment', () => paint());
document.addEventListener('tl:like', () => paint());

// ერთი დაჭერა მედიაზე — პოსტის ფანჯარა
delegate(feedHost, 'click', '[data-open-post]', (e, node) => {
  if (e.detail > 1) return;                    // ორმაგი დაჭერა მოწონებაა
  setTimeout(() => {
    if (node.dataset.suppress === '1') { node.dataset.suppress = '0'; return; }
    openComments(node.dataset.id, node.dataset.openPost);
  }, 220);
});

/* ─── უსასრულო სქროლი ───────────────────────────────────────
   „მეტის ჩვენება" ღილაკის ნაცვლად — ბოლოსთან მიახლოებისას
   შემდეგი პარტია თავისით ჩაიტვირთება. */
const sentinel = document.createElement('div');
sentinel.className = 'feed-sentinel';
sentinel.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
feedHost.after(sentinel);

const io = new IntersectionObserver((entries) => {
  if (!entries[0].isIntersecting) return;
  if (shown >= all.length) { sentinel.hidden = true; return; }
  shown += PAGE;
  paint();
}, { rootMargin: '600px 0px' });

io.observe(sentinel);

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
