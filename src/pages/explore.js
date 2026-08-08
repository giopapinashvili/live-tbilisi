/**
 * აღმოჩენა და ჰეშთეგი — ერთი გვერდი, ორი რეჟიმი.
 *
 *   /explore.html            — ყველაფერი, რასაც არ მისდევ
 *   /explore.html?tag=ხაჭაპური — მხოლოდ ამ თეგის პოსტები
 *
 * ერთ ფაილში იმიტომ, რომ განლაგება იდენტურია: ბადე პოსტებით,
 * დაჭერით ფანჯარა. ცალკე რომ დაგვეწერა, ორივეგან იგივე ბადე,
 * იგივე გახსნა და იგივე ცარიელი მდგომარეობა გამეორდებოდა.
 */

import { boot, $, esc, attr, params, delegate } from './_boot.js';
import { icon } from '../lib/icons.js';
import { num } from '../lib/format.js';
import { emptyState } from '../components/cards.js';
import { publicUrlSync } from '../lib/media.js';
import { setTitle } from '../lib/seo.js';
import { postsByTag, listPosts, trendingTags } from '../lib/posts.js';

boot({ active: 'search', canonical: false });

const root = $('#root');
const tag = (params.get('tag') ?? '').trim().toLowerCase();

let posts = [];

(async () => {
  setTitle(tag ? `#${tag} — თბილისი LIVE` : 'აღმოჩენა — თბილისი LIVE');

  root.innerHTML = `
    <header class="ex-head">
      ${tag ? `
        <div class="ex-tag">${icon('tag', { size: 22 })}</div>
        <div>
          <h1>#${esc(tag)}</h1>
          <p class="dim" id="ex-count">ვეძებ…</p>
        </div>
      ` : `
        <div>
          <h1>აღმოჩენა</h1>
          <p class="dim">ის, რასაც ჯერ არ მისდევ</p>
        </div>
      `}
    </header>

    ${tag ? '' : '<div id="ex-tags" class="ex-tags"></div>'}
    <div class="pf-grid" id="ex-grid"><div class="skel skel-line"></div></div>`;

  posts = tag
    ? await postsByTag(tag, { limit: 60 })
    : await listPosts({ scope: 'all', limit: 60 });

  if (tag) {
    const c = $('#ex-count');
    if (c) c.textContent = posts.length ? `${num(posts.length)} პოსტი` : 'პოსტი ჯერ არ არის';
  } else {
    paintTags();
  }

  paintGrid();
})();

/* ─── პოპულარული თეგები ────────────────────────────────────── */

async function paintTags() {
  const box = $('#ex-tags');
  if (!box) return;

  const tags = await trendingTags(15);
  if (!tags.length) { box.hidden = true; return; }

  box.innerHTML = `
    <div class="eyebrow">კვირის თეგები</div>
    <div class="row-wrap">
      ${tags.map((t) => `
        <a class="chip" href="/explore.html?tag=${encodeURIComponent(t.tag)}">
          #${esc(t.tag)} <b>${num(t.uses)}</b>
        </a>`).join('')}
    </div>`;
}

/* ─── ბადე ─────────────────────────────────────────────────── */

function paintGrid() {
  const box = $('#ex-grid');
  if (!box) return;

  if (!posts.length) {
    box.innerHTML = emptyState({
      icon: tag ? 'tag' : 'image',
      title: tag ? `#${tag} ჯერ არავის დაუწერია` : 'ჯერ არაფერია',
      text: tag
        ? 'იყავი პირველი — დაწერე პოსტი ამ თეგით.'
        : 'როცა ხალხი პოსტებს დადებს, აქ გამოჩნდება.',
    });
    return;
  }

  box.innerHTML = posts.map((p) => {
    const first = p.media?.[0];
    const more = (p.media?.length ?? 0) > 1;

    return `
      <button class="gcell" type="button" data-post="${attr(p.id)}">
        ${first
    ? (first.kind === 'video'
      ? `<video src="${attr(publicUrlSync(first.path))}" muted playsinline></video>`
      : `<img src="${attr(publicUrlSync(first.path))}" alt="" loading="lazy">`)
    : `<span class="gcell-text">${esc((p.body ?? '').slice(0, 90))}</span>`}

        ${more ? `<span class="gcell-multi">${icon('layers', { size: 14 })}</span>` : ''}
        <span class="gcell-over">
          <span>${icon('heart', { size: 15, fill: true })} ${num(p.like_count)}</span>
          <span>${icon('bubble', { size: 15 })} ${num(p.comment_count)}</span>
        </span>
      </button>`;
  }).join('');
}

delegate(root, 'click', '[data-post]', async (e, cell) => {
  const post = posts.find((p) => String(p.id) === cell.dataset.post);
  if (!post) return;
  const { openRemotePost } = await import('../components/post-modal.js');
  openRemotePost(post);
});
