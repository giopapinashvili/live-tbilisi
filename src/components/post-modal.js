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
          <a class="pm-avatar story-ring-sm" href="${href}"
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
      const on = toggleCommentLike(clike.dataset.clike);
      clike.setAttribute('aria-pressed', String(on));
      clike.innerHTML = icon('heart', { size: 13, fill: on });
      clike.classList.add('bump');
      setTimeout(() => clike.classList.remove('bump'), 320);
      return;
    }

    const rep = e.target.closest('[data-reply]');
    if (rep) {
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
