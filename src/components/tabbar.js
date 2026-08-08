/**
 * აპის ნავიგაცია.
 *
 * მობილურზე — ქვედა ტაბები, როგორც აპში.
 * დესკტოპზე — მარცხენა ვიწრო სვეტი.
 *
 * ერთი და იგივე მარკაპი, სხვაობა მხოლოდ CSS-ში. ეს განზრახია:
 * ორი ცალკე ნავიგაცია ორჯერ მეტი შესაძლებლობაა შეცდომისთვის.
 *
 * ნავიგაცია სესიაზე რეაგირებს: სტუმარს „შესვლა" უჩანს, შესულს —
 * თავისი ავატარი და „დადება". ერთხელ უკვე მოხდა, რომ შესვლის
 * გვერდი დავწერე და ბმული არსად დავადე — გვერდი არსებობდა,
 * მაგრამ მასთან მისასვლელი გზა არა.
 */

import { $, el, esc } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

export const TABS = [
  { id: 'feed', href: '/', label: 'ფიდი', icon: 'sparkle' },
  { id: 'map', href: '/map.html', label: 'რუკა', icon: 'map' },
  { id: 'search', href: '/search.html', label: 'ძებნა', icon: 'search' },
  // შენახვა და მოწონება ორი სხვადასხვა რამაა — გულს პოსტს ვუკეთებთ,
  // სანიშნეს კი ადგილს. ერთი ხატულა ორივეზე ხალხს აბნევს.
  { id: 'saved', href: '/saved.html', label: 'შენახული', icon: 'bookmark' },
];

/**
 * @param {{active?: string}} opts
 */
export function mountTabBar({ active = '' } = {}) {
  const host = $('#tabbar') ?? document.body.appendChild(el('nav', { id: 'tabbar' }));
  host.className = 'tabbar';
  host.setAttribute('aria-label', 'მთავარი ნავიგაცია');

  paint(host, active, null, null);
  document.body.classList.add('has-tabbar');

  host.querySelector('.tab-theme')?.addEventListener('click', async () => {
    (await import('../lib/theme.js')).toggleTheme();
  });

  // სესია ასინქრონულად მოდის — ტაბები მაშინვე იხატება სტუმრის
  // სახით და შესვლის დადასტურებისას თავად განახლდება
  import('../lib/supabase.js').then(({ onUser }) => {
    onUser((user, profile) => {
      paint(host, active, user, profile);
      host.querySelector('.tab-theme')?.addEventListener('click', async () => {
        (await import('../lib/theme.js')).toggleTheme();
      });
      bindCreate(host);
      if (user) paintUnread(host);
    });
  }).catch(() => { /* ბექენდის გარეშე სტუმრის ვარიანტი რჩება */ });

  bindCreate(host);
  return host;
}

/** წაუკითხავის წითელი წერტილი. ჩუმად ჩავარდნა აქ სწორია — ეს
 *  დამატებითი ინფორმაციაა, არა გვერდის მუშაობის პირობა. */
async function paintUnread(host) {
  try {
    const { unreadCount } = await import('../lib/posts.js');
    const n = await unreadCount();
    const dot = host.querySelector('[data-unread]');
    if (dot) dot.hidden = !n;
  } catch { /* ignore */ }
}

/* ─────────────────────────────────────────────────────────── */

function paint(host, active, user, profile) {
  const tabs = TABS.map((t) => `
    <a class="tab" href="${t.href}" data-tab="${t.id}"
       ${t.id === active ? 'aria-current="page"' : ''}>
      <span class="tab-ico">${icon(t.icon, { size: 22 })}</span>
      <span class="tab-label">${t.label}</span>
    </a>`).join('');

  host.innerHTML = `
    <a class="tabbar-brand" href="/" aria-label="თბილისი LIVE">
      <span class="tabbar-mark">თ</span>
      <span class="tabbar-wordmark">თბილისი<b>LIVE</b></span>
    </a>

    ${tabs}

    ${user ? `
      <button class="tab tab-create" type="button" data-create aria-label="პოსტის დადება">
        <span class="tab-ico">${icon('plus', { size: 24 })}</span>
        <span class="tab-label">დადება</span>
      </button>` : ''}

    ${user ? `
      <a class="tab tab-bell" href="/notifications.html" data-tab="notifications"
         ${active === 'notifications' ? 'aria-current="page"' : ''}>
        <span class="tab-ico">${icon('bell', { size: 22 })}<span class="tab-dot" data-unread hidden></span></span>
        <span class="tab-label">სიახლეები</span>
      </a>` : ''}

    ${user ? me(profile, active) : guest()}

    <span class="tabbar-spacer"></span>

    <button class="tab tab-theme" type="button" aria-label="დღე / ღამე">
      <span class="tab-ico i-sun">${icon('sun', { size: 20 })}</span>
      <span class="tab-ico i-moon">${icon('moon', { size: 20 })}</span>
      <span class="tab-label">თემა</span>
    </button>`;
}

/** სტუმარი — შესვლა თვალსაჩინოდ, არა დამალული */
function guest() {
  const next = encodeURIComponent(location.pathname + location.search);
  return `
    <a class="tab tab-signin" href="/login.html?next=${next}" data-tab="login">
      <span class="tab-ico">${icon('user', { size: 22 })}</span>
      <span class="tab-label">შესვლა</span>
    </a>`;
}

/** შესული — ავატარი, არა ზოგადი ხატულა */
function me(profile, active) {
  const name = profile?.display_name ?? '';
  const initial = name.trim().charAt(0) || '?';

  const face = profile?.avatar_url
    ? `<img src="${esc(profile.avatar_url)}" alt="" referrerpolicy="no-referrer">`
    : esc(initial);

  return `
    <a class="tab tab-me" href="/profile.html" data-tab="profile"
       ${active === 'profile' ? 'aria-current="page"' : ''}>
      <span class="tab-ico"><span class="tab-face">${face}</span></span>
      <span class="tab-label">პროფილი</span>
    </a>`;
}

function bindCreate(host) {
  const btn = host.querySelector('[data-create]');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', async () => {
    const { openComposer } = await import('./composer.js');
    openComposer();
  });
}
