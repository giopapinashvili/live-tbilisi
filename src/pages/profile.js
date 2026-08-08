/**
 * პროფილი — საკუთარი და სხვისი.
 *
 * განლაგება ინსტაგრამის: ავატარი, ოთხი რიცხვი, ბიო, ჰაილაითები,
 * ქვემოთ პოსტების ბადე. დაჭერით პოსტი ფანჯარაში იხსნება.
 *
 * გემოვნების პროფილი აქედან მოვხსენით. „რამდენი ნანახი გაქვს"
 * არავის აინტერესებს და არც სხვას აჩვენებ — ის ფიდის შიდა საქმეა
 * და ისე უნდა მუშაობდეს, რომ არავინ ამჩნევდეს.
 */

import { boot, $, esc, attr, params, delegate, toast } from './_boot.js';
import { icon } from '../lib/icons.js';
import { num } from '../lib/format.js';
import { emptyState } from '../components/cards.js';
import { guestWall } from '../lib/gate.js';
import { publicUrlSync } from '../lib/media.js';
import { rich } from '../lib/richtext.js';
import { syncProfile } from '../lib/taste.js';
import {
  whenAuthReady, currentUser, currentProfile, signOutUser, supa,
} from '../lib/supabase.js';
import {
  profileByUsername, followCounts, postsByAuthor,
  amFollowing, toggleFollow,
} from '../lib/posts.js';

boot({ active: 'profile', canonical: false });

const root = $('#root');
const wanted = params.get('u');          // @ნიკი — სხვისი პროფილი

let who = null;
let mine = false;
let posts = [];

(async () => {
  await whenAuthReady();

  // სხვისი პროფილი სტუმარსაც უჩანს — მხოლოდ საკუთარი ითხოვს შესვლას
  if (!wanted && guestWall(root, {
    title: 'პროფილი ანგარიშთან ერთად მოდის',
    text: 'პოსტები, გამომწერები და ჩექინები ერთ ადგილას. '
        + 'ფიდი, რუკა და ძებნა ანგარიშის გარეშეც ღიაა.',
  })) return;

  root.innerHTML = '<div class="panel"><div class="skel skel-line"></div></div>';

  who = wanted ? await profileByUsername(wanted) : currentProfile();

  if (!who) {
    root.innerHTML = emptyState({
      icon: 'user',
      title: 'პროფილი ვერ მოიძებნა',
      text: wanted ? `„@${wanted}" არავის ჰქვია.` : 'სცადე თავიდან შესვლა.',
    });
    return;
  }

  mine = who.id === currentUser()?.id;
  await paint();
  if (mine) syncProfile();
})();

/* ─────────────────────────────────────────────────────────── */

async function paint() {
  const [counts, list, following, checkins] = await Promise.all([
    followCounts(who.id),
    postsByAuthor(who.id, { limit: 30 }),
    mine ? false : amFollowing(who.id),
    countCheckins(who.id),
  ]);
  posts = list;

  const isPage = who.kind !== 'person';

  root.innerHTML = `
    <header class="pf-head">
      <div class="pf-avatar">
        ${who.avatar_url
    ? `<img src="${attr(who.avatar_url)}" alt="" referrerpolicy="no-referrer">`
    : icon('user', { size: 34 })}
      </div>

      <div class="pf-info">
        <div class="pf-name">
          ${esc(who.display_name ?? '')}
          ${who.verified ? `<span class="pf-verified" title="დადასტურებული">${icon('check', { size: 15 })}</span>` : ''}
        </div>
        ${who.username ? `<div class="pf-handle">@${esc(who.username)}</div>` : ''}

        <div class="pf-stats">
          <div class="pf-stat"><b>${num(counts.posts)}</b><span>პოსტი</span></div>
          <button class="pf-stat" type="button" data-act="followers">
            <b>${num(counts.followers)}</b><span>გამომწერი</span>
          </button>
          <button class="pf-stat" type="button" data-act="following">
            <b>${num(counts.following)}</b><span>გამოწერილი</span>
          </button>
          <div class="pf-stat"><b>${num(checkins)}</b><span>ჩექინი</span></div>
        </div>
      </div>
    </header>

    ${who.bio ? `<p class="pf-bio">${rich(who.bio)}</p>` : (mine ? `
      <p class="pf-bio dim">
        ბიო ჯერ ცარიელია —
        <button class="auth-link" type="button" data-act="edit">დაწერე რამე შენზე</button>
      </p>` : '')}

    ${who.website ? `<a class="pf-web" href="${attr(who.website)}" target="_blank" rel="noopener nofollow">
      ${icon('globe', { size: 14 })} ${esc(who.website.replace(/^https?:\/\//, ''))}</a>` : ''}

    <div class="pf-actions">
      ${mine ? `
        <button class="btn" type="button" data-act="edit">რედაქტირება</button>
        <a class="btn" href="/dashboard.html">ჩემი გვერდები</a>
        <button class="btn" type="button" data-act="logout">გასვლა</button>
      ` : `
        <button class="btn ${following ? '' : 'btn-primary'}" type="button"
                data-act="follow" data-on="${following}">
          ${following ? 'გამოწერილი' : 'გამოწერა'}
        </button>
        <button class="btn" type="button" data-act="message">მიწერა</button>
      `}
    </div>

    <div class="pf-highlights" id="highlights" hidden></div>

    <div class="pf-tabs">
      <button class="pf-tab" type="button" aria-current="true" data-view="grid">
        ${icon('layers', { size: 16 })} პოსტები
      </button>
      ${isPage ? `<button class="pf-tab" type="button" data-view="menu">
        ${icon('bag', { size: 16 })} მენიუ
      </button>` : ''}
    </div>

    <div class="pf-grid" id="grid"></div>`;

  paintHighlights();
  paintGrid();
}

/* ─── ჰაილაითები ───────────────────────────────────────────── */

function paintHighlights() {
  const box = $('#highlights');
  if (!box) return;

  // ბიზნეს-გვერდზე ჰაილაითი მენიუს ჯგუფებია, ადამიანთან — სთორები.
  // ორივე ჯერ ცარიელია; საკუთარზე დამატების ღილაკი მაინც ჩანს,
  // რომ ადგილი დაცული იყოს და მოგვიანებით უცებ არ „გამოხტეს".
  if (!mine) { box.hidden = true; return; }

  box.hidden = false;
  box.innerHTML = `
    <button class="hl hl-add" type="button" data-act="new-highlight">
      <span class="hl-ring">${icon('plus', { size: 20 })}</span>
      <span class="hl-name">ახალი</span>
    </button>`;
}

/* ─── ბადე ─────────────────────────────────────────────────── */

function paintGrid() {
  const box = $('#grid');
  if (!box) return;

  if (!posts.length) {
    box.innerHTML = emptyState({
      icon: 'image',
      title: mine ? 'ჯერ არაფერი დაგიდია' : 'პოსტები ჯერ არ არის',
      text: mine ? 'ნავიგაციაში „+"-ს დააჭირე და დადე პირველი.' : '',
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

async function countCheckins(id) {
  try {
    const sb = await supa();
    const { count } = await sb.from('checkins')
      .select('*', { count: 'exact', head: true }).eq('user_id', id);
    return count ?? 0;
  } catch { return 0; }
}

/* ─── ქმედებები ────────────────────────────────────────────── */

delegate(root, 'click', '[data-act]', async (e, btn) => {
  const act = btn.dataset.act;

  if (act === 'logout') {
    await signOutUser();
    location.replace('/');
    return;
  }

  if (act === 'follow') {
    const on = btn.dataset.on !== 'true';
    try {
      await toggleFollow(who.id, on);
      btn.dataset.on = String(on);
      btn.textContent = on ? 'გამოწერილი' : 'გამოწერა';
      btn.classList.toggle('btn-primary', !on);
    } catch (err) { toast(err.message, 'error'); }
    return;
  }

  if (act === 'edit') toast('რედაქტირება მალე დაემატება');
  if (act === 'message') toast('მიმოწერა მალე დაემატება');
  if (act === 'followers' || act === 'following') toast('სია მალე დაემატება');
  if (act === 'new-highlight') toast('ჰაილაითები მალე დაემატება');
});

delegate(root, 'click', '[data-post]', async (e, cell) => {
  const post = posts.find((p) => String(p.id) === cell.dataset.post);
  if (!post) return;
  const { openRemotePost } = await import('../components/post-modal.js');
  openRemotePost(post);
});

// ახალი პოსტის დადებისას ბადე თავად განახლდეს
document.addEventListener('tl:post', () => { if (mine) paint(); });
