/**
 * შეტყობინებები.
 *
 * ჩანაწერებს ბაზა თავად ქმნის ტრიგერებით — კოდი მათ არ წერს
 * და ვერც დაავიწყდება. აქ მხოლოდ ჩვენებაა.
 */

import { boot, $, esc, delegate } from './_boot.js';
import { icon } from '../lib/icons.js';
import { ago } from '../lib/format.js';
import { emptyState } from '../components/cards.js';
import { guestWall } from '../lib/gate.js';
import { whenAuthReady } from '../lib/supabase.js';
import { notifications, markAllRead } from '../lib/posts.js';

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
  const href = n.post_id ? `/business.html?post=${n.post_id}` : `/profile.html?u=${encodeURIComponent(handle)}`;
  const face = n.actor?.avatar_url
    ? `<img src="${esc(n.actor.avatar_url)}" alt="">`
    : esc(who.trim().charAt(0) || '?');

  return `
    <a class="nt${n.read_at ? '' : ' unread'}" href="${href}">
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
  paint();
});
