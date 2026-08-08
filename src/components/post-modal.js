/**
 * პოსტის ფანჯარა — ინსტაგრამის დესკტოპ მოდალი.
 *
 *   ┌──────────────────┬──────────────────┐
 *   │                  │ ავატარი · სახელი │
 *   │                  ├──────────────────┤
 *   │      მედია       │ აღწერა           │
 *   │   (ფოტო/ვიდეო)   │ კომენტარები      │
 *   │                  │ პასუხები         │
 *   │                  ├──────────────────┤
 *   │                  │ ♡ 💬 ↻ ✈    🔖   │
 *   │                  │ N მოწონება       │
 *   │                  │ [ველი] გამოქვეყ. │
 *   └──────────────────┴──────────────────┘
 *
 * მობილურზე იგივე ბლოკები ერთ სვეტად ჩამოდის.
 */

import { esc, attr, el, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { ago, num } from '../lib/format.js';
import {
  getThread, addComment, deleteComment, commentCount,
  toggleCommentLike, isCommentLiked, commentLikes,
} from '../lib/social.js';
import { isLiked, toggleLike, isSaved, toggleSave, record } from '../lib/taste.js';
import { allowed } from '../lib/gate.js';

let host;
let ctx = null;          // { threadId, post, business, emoji, onChange }
let replyTo = null;      // { id, author }

export function openPostModal(options) {
  ctx = options;
  replyTo = null;

  host ??= document.body.appendChild(el('div', { class: 'pm', hidden: true }));
  host.hidden = false;
  requestAnimationFrame(() => { host.dataset.open = 'true'; });
  document.body.style.overflow = 'hidden';

  paint();
  bind();
  setTimeout(() => host.querySelector('.pm-input')?.focus(), 150);
}

/* ─────────────────────────────────────────────────────────── */

function paint() {
  const { post, business, emoji, threadId } = ctx;
  const liked = post ? isLiked(post.id) : isSaved(business.id);
  const likes = (post?.likeCount ?? 0) + (liked ? 1 : 0);
  const thread = getThread(threadId);
  const href = `/business.html?b=${encodeURIComponent(business.slug ?? business.id)}`;
  const tint = `--tint:var(--cat-${business.category ?? 'public'})`;

  host.innerHTML = `
    <div class="pm-backdrop" data-close></div>

    <button class="pm-x" type="button" data-close aria-label="დახურვა">
      ${icon('close', { size: 22 })}
    </button>

    <div class="pm-panel" role="dialog" aria-label="პოსტი">
      <div class="pm-media" style="${tint}">
        ${post?.photo
    ? `<img src="${attr(post.photo)}" alt="">`
    : `<span class="pm-media-fill">${emoji ?? '📍'}</span>`}
        ${post ? `<span class="pm-kind">${esc(post.kindLabel ?? '')}</span>` : ''}
        <span class="heart-pop" aria-hidden="true">${icon('heart', { size: 96, fill: true })}</span>
      </div>

      <div class="pm-side">
        <header class="pm-head">
          <a class="pm-avatar story-ring-sm${business.hasStory ? ' has-story' : ''}" href="${href}"
             style="background:var(--cat-${business.category ?? 'public'})">${emoji ?? '📍'}</a>
          <div class="pm-who">
            <a class="pm-name" href="${href}">${esc(business.name)}</a>
            ${business.address ? `<div class="pm-loc">${esc(business.address)}</div>` : ''}
          </div>
        </header>

        <div class="pm-body">
          ${post ? `
            <div class="cmt cmt-caption">
              <a class="cmt-avatar" href="${href}"
                 style="background:var(--cat-${business.category ?? 'public'}); color:#fff">${emoji ?? '📍'}</a>
              <div class="cmt-body">
                <div class="cmt-line"><b>${esc(business.name)}</b> ${esc(post.text)}</div>
                <div class="cmt-meta"><span>${esc(ago(post.createdAt))}</span></div>
              </div>
            </div>` : ''}

          ${thread.length
    ? thread.map(commentRow).join('')
    : `<div class="pm-empty">
         <div class="pm-empty-title">კომენტარები ჯერ არ არის</div>
         <div class="dim">დაიწყე საუბარი.</div>
       </div>`}
        </div>

        <div class="pm-foot">
          <div class="post-actions pm-actions">
            <button class="post-act act-heart" type="button" data-pm="like"
                    aria-pressed="${liked}" aria-label="მოწონება">
              ${icon('heart', { size: 25, fill: liked })}
            </button>
            <button class="post-act" type="button" data-pm="focus" aria-label="კომენტარი">
              ${icon('bubble', { size: 25 })}
            </button>
            <button class="post-act" type="button" data-pm="share" aria-label="გაზიარება">
              ${icon('plane', { size: 25 })}
            </button>
            <span class="spacer"></span>
            <button class="post-act" type="button" data-pm="bookmark"
                    aria-pressed="${isSaved(business.id)}" aria-label="შენახვა">
              ${icon('bookmark', { size: 24, fill: isSaved(business.id) })}
            </button>
          </div>

          <div class="pm-likes">${num(likes)} მოწონება</div>
          <div class="pm-time">${post ? esc(ago(post.createdAt)) : ''}</div>

          ${replyTo ? `
            <div class="pm-replying">
              პასუხი — <b>${esc(replyTo.author)}</b>
              <button type="button" data-pm="cancel-reply" aria-label="გაუქმება">
                ${icon('close', { size: 13 })}
              </button>
            </div>` : ''}

          <form class="pm-form">
            <input class="pm-input" name="text" autocomplete="off" maxlength="800"
                   placeholder="${replyTo ? `პასუხი ${esc(replyTo.author)}-ს…` : 'დაწერე კომენტარი…'}">
            <button class="cmt-send" type="submit" disabled>გამოქვეყნება</button>
          </form>
        </div>
      </div>
    </div>`;
}

function commentRow(c, depth = 0) {
  const liked = isCommentLiked(c.id);
  const n = commentLikes(c);

  return `
    <div class="cmt${depth ? ' cmt-reply-row' : ''}">
      <span class="cmt-avatar">${icon('user', { size: depth ? 13 : 15 })}</span>
      <div class="cmt-body">
        <div class="cmt-line"><b>${esc(c.author)}</b> ${esc(c.text)}</div>
        <div class="cmt-meta">
          <span>${esc(ago(c.createdAt))}</span>
          ${n ? `<span>${num(n)} მოწონება</span>` : ''}
          <button type="button" class="cmt-reply" data-reply="${attr(c.id)}"
                  data-author="${attr(c.author)}">პასუხი</button>
          ${c.mine ? `<button type="button" class="cmt-reply" data-del="${attr(c.id)}">წაშლა</button>` : ''}
        </div>
        ${c.replies?.length ? `
          <div class="cmt-replies">
            ${c.replies.map((r) => commentRow(r, depth + 1)).join('')}
          </div>` : ''}
      </div>
      <button class="cmt-like act-heart" type="button" data-clike="${attr(c.id)}"
              aria-pressed="${liked}" aria-label="მოწონება">
        ${icon('heart', { size: 13, fill: liked })}
      </button>
    </div>`;
}

/* ─────────────────────────────────────────────────────────── */

function bind() {
  host.onclick = async (e) => {
    if (e.target.closest('[data-close]')) return close();

    const clike = e.target.closest('[data-clike]');
    if (clike) {
      if (!allowed('like')) return;
      const on = toggleCommentLike(clike.dataset.clike);
      clike.setAttribute('aria-pressed', String(on));
      clike.innerHTML = icon('heart', { size: 13, fill: on });
      clike.classList.add('bump');
      setTimeout(() => clike.classList.remove('bump'), 320);
      return;
    }

    const rep = e.target.closest('[data-reply]');
    if (rep) {
      if (!allowed('reply')) return;
      replyTo = { id: rep.dataset.reply, author: rep.dataset.author };
      paint();
      bindForm();
      host.querySelector('.pm-input')?.focus();
      return;
    }

    const del = e.target.closest('[data-del]');
    if (del) { deleteComment(ctx.threadId, del.dataset.del); refresh(); return; }

    const act = e.target.closest('[data-pm]')?.dataset.pm;
    if (!act) return;

    // გაზიარება და დახურვა ყველას შეუძლია; დანარჩენს — ანგარიში სჭირდება
    const GUARDED = { like: 'like', bookmark: 'save', focus: 'comment' };
    if (GUARDED[act] && !allowed(GUARDED[act])) return;

    if (act === 'cancel-reply') { replyTo = null; paint(); bindForm(); return; }
    if (act === 'focus') { host.querySelector('.pm-input')?.focus(); return; }

    if (act === 'like') {
      if (ctx.post) setLike(!isLiked(ctx.post.id));
      else {
        const on = toggleSave(ctx.business.id);
        record(on ? 'save' : 'view', { business: ctx.business });
        refresh();
      }
      return;
    }

    if (act === 'bookmark') {
      toggleSave(ctx.business.id);
      record('save', { business: ctx.business });
      refresh();
      return;
    }

    if (act === 'share') {
      const url = `${location.origin}/business.html?b=${ctx.business.slug ?? ctx.business.id}`;
      if (navigator.share) navigator.share({ title: ctx.business.name, url }).catch(() => {});
      else { navigator.clipboard?.writeText(url); toast('ბმული დაკოპირდა'); }
    }
  };

  // ორმაგი დაჭერა მედიაზე — მოწონება
  host.ondblclick = (e) => {
    if (!e.target.closest('.pm-media') || !ctx.post) return;
    if (!allowed('like')) return;
    setLike(true);
    const m = host.querySelector('.pm-media');
    m.classList.remove('pop');
    void m.offsetWidth;
    m.classList.add('pop');
  };

  bindForm();

  document.addEventListener('keydown', function onEsc(ev) {
    if (ev.key === 'Escape' && !host.hidden) { close(); document.removeEventListener('keydown', onEsc); }
  });
}

function bindForm() {
  const form = host.querySelector('.pm-form');
  if (!form) return;
  const input = form.querySelector('.pm-input');
  const send = form.querySelector('.cmt-send');

  input.oninput = () => { send.disabled = !input.value.trim(); };

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!allowed('comment')) return;
    const added = await addComment(ctx.threadId, input.value, {
      businessId: ctx.business.id,
      parentId: replyTo?.id ?? null,
    });
    if (!added) return;
    replyTo = null;
    refresh();
    document.dispatchEvent(new CustomEvent('tl:comment', { detail: { threadId: ctx.threadId } }));
    setTimeout(() => host.querySelector('.pm-body')?.scrollTo({ top: 1e6, behavior: 'smooth' }), 60);
  };
}

function setLike(want) {
  const id = ctx.post.id;
  if (isLiked(id) !== want) toggleLike(id);
  record('like', { business: ctx.business, catalogId: ctx.post.catalogId });
  refresh();
  document.dispatchEvent(new CustomEvent('tl:like', { detail: { postId: id } }));
}

function refresh() {
  const scroll = host.querySelector('.pm-body')?.scrollTop ?? 0;
  paint();
  bindForm();
  const body = host.querySelector('.pm-body');
  if (body) body.scrollTop = scroll;
}

function close() {
  host.dataset.open = 'false';
  document.body.style.overflow = '';
  setTimeout(() => { host.hidden = true; }, 240);
  ctx?.onChange?.();
}

export { commentCount };

/* ═══════════════════════════════════════════════════════════
   ნამდვილი პოსტი — ბაზიდან
   
   ზემოთ დაწერილი openPostModal სატესტო პოსტებს ემსახურება,
   რომლებიც ბანდლშია და ბაზაში არ არსებობს. აქ სულ სხვა წყაროა:
   ნამდვილი ავტორი, ნამდვილი ფოტოები, ბაზის კომენტარები.
   ═══════════════════════════════════════════════════════════ */

let rHost;
let rPost = null;
let rReplyTo = null;
let rSlide = 0;

/** @param {object} post posts.js-ის shape()-ის შედეგი */
export async function openRemotePost(post) {
  rPost = post;
  rReplyTo = null;
  rSlide = 0;

  rHost ??= document.body.appendChild(el('div', { class: 'pm', hidden: true }));
  rHost.hidden = false;
  requestAnimationFrame(() => { rHost.dataset.open = 'true'; });
  document.body.style.overflow = 'hidden';

  await rPaint();
  rBind();
}

async function rPaint() {
  const [{ commentThread, likedAmong }, { publicUrlSync }, { rich }, { ago, num }] =
    await Promise.all([
      import('../lib/posts.js'),
      import('../lib/media.js'),
      import('../lib/richtext.js'),
      import('../lib/format.js'),
    ]);

  const [thread, liked] = await Promise.all([
    commentThread(rPost.id),
    likedAmong([rPost.id]),
  ]);

  const isLikedNow = liked.has(rPost.id);
  const a = rPost.author ?? {};
  const href = a.username ? `/profile.html?u=${encodeURIComponent(a.username)}` : '#';
  const media = rPost.media ?? [];
  const cur = media[rSlide];

  rHost.innerHTML = `
    <div class="pm-backdrop" data-rclose></div>
    <button class="pm-x" type="button" data-rclose aria-label="დახურვა">
      ${icon('close', { size: 22 })}
    </button>

    <div class="pm-panel" role="dialog" aria-label="პოსტი">
      <div class="pm-media">
        ${cur
    ? (cur.kind === 'video'
      ? `<video src="${attr(publicUrlSync(cur.path))}" controls playsinline></video>`
      : `<img src="${attr(publicUrlSync(cur.path))}" alt="">`)
    : `<span class="pm-media-fill">${icon('image', { size: 44 })}</span>`}

        ${media.length > 1 ? `
          <button class="pm-nav pm-prev" type="button" data-slide="-1" aria-label="წინა">
            ${icon('back', { size: 18 })}
          </button>
          <button class="pm-nav pm-next" type="button" data-slide="1" aria-label="შემდეგი">
            ${icon('chevron', { size: 18 })}
          </button>
          <span class="pm-dots">
            ${media.map((_, i) => `<i class="${i === rSlide ? 'on' : ''}"></i>`).join('')}
          </span>` : ''}
      </div>

      <div class="pm-side">
        <header class="pm-head">
          <a class="pm-avatar" href="${href}">
            ${a.avatar_url ? `<img src="${attr(a.avatar_url)}" alt="">`
    : esc((a.display_name ?? '?').charAt(0))}
          </a>
          <div class="pm-who">
            <a class="pm-name" href="${href}">${esc(a.display_name ?? '')}</a>
            ${rPost.place_name ? `<div class="pm-loc">${esc(rPost.place_name)}</div>` : ''}
          </div>

          <button class="pm-more" type="button" data-ract="menu" aria-label="მეტი">
            ${icon('menu', { size: 18 })}
          </button>
        </header>

        <div class="pm-body">
          ${rPost.body ? `
            <div class="cmt cmt-caption">
              <a class="cmt-avatar" href="${href}">
                ${a.avatar_url ? `<img src="${attr(a.avatar_url)}" alt="">`
    : esc((a.display_name ?? '?').charAt(0))}
              </a>
              <div class="cmt-body">
                <div class="cmt-line"><b>${esc(a.display_name ?? '')}</b> ${rich(rPost.body)}</div>
                <div class="cmt-meta"><span>${esc(ago(rPost.created_at))}</span></div>
              </div>
            </div>` : ''}

          ${thread.length ? thread.map((c) => rCommentRow(c, rich, ago, num)).join('') : `
            <div class="pm-empty">
              <div class="pm-empty-title">კომენტარები ჯერ არ არის</div>
              <div class="dim">დაიწყე საუბარი.</div>
            </div>`}
        </div>

        <div class="pm-foot">
          <div class="post-actions pm-actions">
            <button class="post-act act-heart" type="button" data-ract="like"
                    aria-pressed="${isLikedNow}" aria-label="მოწონება">
              ${icon('heart', { size: 25, fill: isLikedNow })}
            </button>
            <button class="post-act" type="button" data-ract="focus" aria-label="კომენტარი">
              ${icon('bubble', { size: 25 })}
            </button>
            <button class="post-act" type="button" data-ract="share" aria-label="გაზიარება">
              ${icon('plane', { size: 25 })}
            </button>
            <span class="spacer"></span>
          </div>

          <div class="pm-likes">${num(rPost.like_count)} მოწონება</div>
          <div class="pm-time">${esc(ago(rPost.created_at))}</div>

          ${rReplyTo ? `
            <div class="pm-replying">
              პასუხი — <b>${esc(rReplyTo.name)}</b>
              <button type="button" data-ract="cancel-reply" aria-label="გაუქმება">
                ${icon('close', { size: 13 })}
              </button>
            </div>` : ''}

          <form class="pm-form">
            <input class="pm-input" name="text" autocomplete="off" maxlength="800"
                   placeholder="${rReplyTo ? `პასუხი ${esc(rReplyTo.name)}-ს…` : 'დაწერე კომენტარი…'}">
            <button class="cmt-send" type="submit" disabled>გამოქვეყნება</button>
          </form>
        </div>
      </div>
    </div>`;
}

async function myId() {
  const { currentUser } = await import('../lib/supabase.js');
  return currentUser()?.id ?? null;
}

function rCommentRow(c, rich, ago, num, depth = 0, rootId = null) {
  const a = c.author ?? {};
  // პასუხი ყოველთვის ძირეულს ებმება: პასუხზე პასუხი ხის
  // უსასრულო განშტოებას ქმნის და ეკრანზე ვიწროვდება
  const replyTo = rootId ?? c.id;
  return `
    <div class="cmt${depth ? ' cmt-reply-row' : ''}">
      <span class="cmt-avatar">
        ${a.avatar_url ? `<img src="${attr(a.avatar_url)}" alt="">`
    : esc((a.display_name ?? '?').charAt(0))}
      </span>
      <div class="cmt-body">
        <div class="cmt-line"><b>${esc(a.display_name ?? '')}</b> ${rich(c.body)}</div>
        <div class="cmt-meta">
          <span>${esc(ago(c.created_at))}</span>
          ${c.like_count ? `<span>${num(c.like_count)} მოწონება</span>` : ''}
          <button type="button" class="cmt-reply" data-rreply="${attr(replyTo)}"
                  data-name="${attr(a.display_name ?? '')}"
                  data-handle="${attr(a.username ?? '')}">პასუხი</button>
          <button type="button" class="cmt-reply" data-rdel="${attr(c.id)}">წაშლა</button>
        </div>
        ${c.replies?.length ? `
          <div class="cmt-replies">
            ${c.replies.map((r) => rCommentRow(r, rich, ago, num, depth + 1, c.id)).join('')}
          </div>` : ''}
      </div>
      <button class="cmt-like act-heart" type="button" data-rclike="${attr(c.id)}"
              aria-label="მოწონება">${icon('heart', { size: 13 })}</button>
    </div>`;
}

function rBind() {
  rHost.onclick = async (e) => {
    if (e.target.closest('[data-rclose]')) return rClose();

    const slide = e.target.closest('[data-slide]');
    if (slide) {
      const n = (rPost.media ?? []).length;
      rSlide = (rSlide + Number(slide.dataset.slide) + n) % n;
      await rPaint(); rBind();
      return;
    }

    const rep = e.target.closest('[data-rreply]');
    if (rep) {
      if (!allowed('reply')) return;
      rReplyTo = {
        id: rep.dataset.rreply,
        name: rep.dataset.name,
        handle: rep.dataset.handle || '',
      };
      await rPaint(); rBind();

      // ველი წინასწარ ივსება @სახელით — ისე, როგორც ინსტაგრამზე.
      // ასე ჩანს, რომ პასუხის რეჟიმი მართლა ჩაირთო.
      const input = rHost.querySelector('.pm-input');
      if (input) {
        if (rReplyTo.handle) input.value = `@${rReplyTo.handle} `;
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
        rHost.querySelector('.cmt-send').disabled = !input.value.trim();
      }
      return;
    }

    const clike = e.target.closest('[data-rclike]');
    if (clike) {
      if (!allowed('like')) return;
      const { toggleCommentLike: tcl } = await import('../lib/posts.js');
      const on = clike.getAttribute('aria-pressed') !== 'true';
      try {
        await tcl(clike.dataset.rclike, on);
        clike.setAttribute('aria-pressed', String(on));
        clike.innerHTML = icon('heart', { size: 13, fill: on });
      } catch (err) { toast(err.message, 'error'); }
      return;
    }

    const del = e.target.closest('[data-rdel]');
    if (del) {
      const { deleteComment: dc } = await import('../lib/posts.js');
      try { await dc(del.dataset.rdel); await rPaint(); rBind(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }

    const act = e.target.closest('[data-ract]')?.dataset.ract;
    if (!act) return;

    if (act === 'cancel-reply') { rReplyTo = null; await rPaint(); rBind(); return; }
    if (act === 'focus') { rHost.querySelector('.pm-input')?.focus(); return; }

    if (act === 'like') {
      if (!allowed('like')) return;
      const { toggleLike: tl } = await import('../lib/posts.js');
      const btn = e.target.closest('[data-ract="like"]');
      const on = btn.getAttribute('aria-pressed') !== 'true';
      try {
        await tl(rPost.id, on);
        rPost.like_count = Math.max(0, (rPost.like_count ?? 0) + (on ? 1 : -1));
        await rPaint(); rBind();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }

    if (act === 'menu') {
      const btn = e.target.closest('[data-ract="menu"]');
      openPostMenu(btn, rPost);
      return;
    }

    if (act === 'delete') {
      if (!confirm('პოსტი წაიშლება. გავაგრძელო?')) return;
      const { deletePost: dp } = await import('../lib/posts.js');
      try {
        await dp(rPost.id);
        toast('წაიშალა');
        rClose();
        document.dispatchEvent(new CustomEvent('tl:post', { detail: { deleted: rPost.id } }));
      } catch (err) { toast(err.message, 'error'); }
      return;
    }

    if (act === 'share') {
      const url = `${location.origin}/profile.html?u=${rPost.author?.username ?? ''}`;
      if (navigator.share) navigator.share({ url }).catch(() => {});
      else { navigator.clipboard?.writeText(url); toast('ბმული დაკოპირდა'); }
    }
  };

  const form = rHost.querySelector('.pm-form');
  if (!form) return;
  const input = form.querySelector('.pm-input');
  const send = form.querySelector('.cmt-send');

  input.oninput = () => { send.disabled = !input.value.trim(); };

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!allowed('comment')) return;
    const { addComment: ac } = await import('../lib/posts.js');
    try {
      await ac(rPost.id, input.value, rReplyTo?.id ?? null);
      rReplyTo = null;
      rPost.comment_count = (rPost.comment_count ?? 0) + 1;
      await rPaint(); rBind();
      setTimeout(() => rHost.querySelector('.pm-body')?.scrollTo({ top: 1e6, behavior: 'smooth' }), 60);
    } catch (err) { toast(err.message, 'error'); }
  };
}

function rClose() {
  rHost.dataset.open = 'false';
  document.body.style.overflow = '';
  setTimeout(() => { rHost.hidden = true; }, 240);
}


/* ─── პოსტის მენიუ ─────────────────────────────────────────── */

/**
 * სამი წერტილი, როგორც ინსტაგრამზე.
 *
 * ჯვარი კუთხეში არასწორი იყო ორი მიზეზით: ის მხოლოდ წაშლას
 * იძლეოდა და დახურვის ღილაკს ჰგავდა. მენიუში კი ყველა ქმედება
 * ერთად ჩანს და შემთხვევით არაფერი წაიშლება.
 */
async function openPostMenu(anchor, post) {
  const { currentUser: cu } = await import('../lib/supabase.js');
  const { actorId: aid } = await import('../lib/actor.js');
  const mine = post.author?.id === aid() || post.author?.id === cu()?.id;

  document.querySelector('.actor-menu')?.remove();
  const menu = el('div', { class: 'actor-menu pm-menu' });

  const r = anchor.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(r.left - 180, window.innerWidth - 230))}px`;
  menu.style.top = `${Math.min(r.bottom + 6, window.innerHeight - 220)}px`;

  menu.innerHTML = `
    ${mine ? `
      <button class="actor-item" type="button" data-pmenu="edit">
        <span>${icon('edit', { size: 16 })}</span><span><b>რედაქტირება</b></span>
      </button>` : ''}
    <button class="actor-item" type="button" data-pmenu="copy">
      <span>${icon('share', { size: 16 })}</span><span><b>ბმულის კოპირება</b></span>
    </button>
    ${mine ? `
      <div class="actor-sep"></div>
      <button class="actor-item danger" type="button" data-pmenu="delete">
        <span>${icon('cross', { size: 16 })}</span><span><b>წაშლა</b></span>
      </button>` : `
      <button class="actor-item danger" type="button" data-pmenu="report">
        <span>${icon('flag', { size: 16 })}</span><span><b>საჩივარი</b></span>
      </button>`}`;

  document.body.appendChild(menu);

  const onDoc = async (e) => {
    const pick = e.target.closest('[data-pmenu]');
    if (!pick) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', onDoc, true); }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    menu.remove();
    document.removeEventListener('click', onDoc, true);

    const what = pick.dataset.pmenu;

    if (what === 'copy') {
      const url = `${location.origin}/profile.html?u=${post.author?.username ?? ''}`;
      try { await navigator.clipboard.writeText(url); toast('ბმული დაკოპირდა'); }
      catch { toast('ვერ დავაკოპირე', 'error'); }
      return;
    }

    if (what === 'edit') {
      const next = prompt('პოსტის ტექსტი:', post.body ?? '');
      if (next === null || next === post.body) return;
      const { editPost } = await import('../lib/posts.js');
      try {
        await editPost(post.id, next);
        post.body = next.trim();
        await rPaint(); rBind();
        toast('შესწორდა');
      } catch (err) { toast(err.message, 'error'); }
      return;
    }

    if (what === 'delete') {
      if (!confirm('პოსტი და მისი ფოტოები სამუდამოდ წაიშლება. გავაგრძელო?')) return;
      const { deletePost } = await import('../lib/posts.js');
      try {
        await deletePost(post.id);
        toast('წაიშალა');
        rClose();
        document.dispatchEvent(new CustomEvent('tl:post', { detail: { deleted: post.id } }));
      } catch (err) { toast(err.message, 'error'); }
      return;
    }

    if (what === 'report') toast('საჩივარი მალე დაემატება');
  };
  setTimeout(() => document.addEventListener('click', onDoc, true), 0);
}
