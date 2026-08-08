/**
 * შეტყობინებები.
 *
 * ჩანაწერებს ბაზა თავად ქმნის ტრიგერებით — კოდი მათ არ წერს
 * და ვერც დაავიწყდება. აქ მხოლოდ ჩვენებაა.
 */

import { boot, $, esc, delegate, toast } from './_boot.js';
import { icon } from '../lib/icons.js';
import { ago } from '../lib/format.js';
import { emptyState } from '../components/cards.js';
import { guestWall } from '../lib/gate.js';
import { whenAuthReady } from '../lib/supabase.js';
import { notifications, markAllRead, markRead, postById } from '../lib/posts.js';

boot({ active: 'notifications', canonical: false });

const root = $('#root');

const WORDS = {
  like:    'მოიწონა შენი პოსტი',
  comment: 'დააკომენტარა შენი პოსტი',
  reply:   'გიპასუხა',
  follow:  'გამოგიწერა',
  mention: 'მოგნიშნა პოსტში',
};

const ICONS = {
  like: 'heart', comment: 'bubble', reply: 'bubble',
  follow: 'user', mention: 'tag',
};

(async () => {
  await whenAuthReady();

  if (guestWall(root, {
    title: 'შეტყობინებები ანგარიშთან ერთად მოდის',
    text: 'როცა ვინმე მოგიწონებს, დაგიკომენტარებს ან გამოგიწერს — აქ გაიგებ.',
  })) return;

  root.innerHTML = `
    <header class="nt-head">
      <h1>შეტყობინებები</h1>
      <button class="btn btn-sm" type="button" data-read>წაკითხულად</button>
    </header>
    <div class="stack" id="list"><div class="skel skel-line"></div></div>`;

  paint();
})();

async function paint() {
  const list = await notifications(50);
  const box = $('#list');

  if (!list.length) {
    box.innerHTML = emptyState({
      icon: 'bell',
      title: 'ჯერ არაფერია',
      text: 'გამოიწერე ადგილები და ხალხი — სიახლეები აქ გამოჩნდება.',
    });
    return;
  }

  box.innerHTML = list.map(row).join('');
}

function row(n) {
  const who = n.actor?.display_name ?? 'ვიღაცამ';
  const handle = n.actor?.username ?? '';
  const face = n.actor?.avatar_url
    ? `<img src="${esc(n.actor.avatar_url)}" alt="">`
    : esc(who.trim().charAt(0) || '?');

  // პოსტზე შეტყობინება პოსტს ხსნის აქვე, ფანჯარაში.
  // სხვა გვერდზე გადაგდება ზედმეტი ნაბიჯია — ადამიანს სურს
  // ნახოს, რას მოეწონა, და შეტყობინებებში დარჩეს.
  const href = n.post_id
    ? '#'
    : `/profile.html?u=${encodeURIComponent(handle)}`;

  return `
    <a class="nt${n.read_at ? '' : ' unread'}" href="${href}"
       data-nid="${esc(String(n.id))}"
       ${n.post_id ? `data-open-post="${esc(String(n.post_id))}"` : ''}>
      <span class="actor-face">${face}</span>
      <span class="nt-body">
        <span class="nt-line"><b>${esc(who)}</b> ${esc(WORDS[n.kind] ?? '')}</span>
        <span class="nt-time">${esc(ago(n.created_at))}</span>
      </span>
      <span class="nt-ico nt-${n.kind}">${icon(ICONS[n.kind] ?? 'info', { size: 15 })}</span>
    </a>`;
}

delegate(root, 'click', '[data-read]', async () => {
  await markAllRead();
  await paint();
  document.dispatchEvent(new CustomEvent('tl:notif'));
});

// პოსტის გახსნა და წაკითხულად მონიშვნა
delegate(root, 'click', '[data-nid]', async (e, node) => {
  const postId = node.dataset.openPost;
  if (postId) e.preventDefault();

  // ჯერ ვნიშნავთ — ვიზუალი მაშინვე უნდა შეიცვალოს, სერვერს
  // არ ველოდებით. თუ ჩავარდა, შემდეგ ჩატვირთვაზე ისევ აინთება.
  if (!node.classList.contains('unread')) { /* უკვე წაკითხულია */ }
  else {
    node.classList.remove('unread');
    markRead(node.dataset.nid).then(() => {
      document.dispatchEvent(new CustomEvent('tl:notif'));
    }).catch(() => {});
  }

  if (!postId) return;

  const post = await postById(postId);
  if (!post) { toast('პოსტი ვეღარ მოიძებნა — შესაძლოა წაშლილია', 'error'); return; }
  const { openRemotePost } = await import('../components/post-modal.js');
  openRemotePost(post);
});
