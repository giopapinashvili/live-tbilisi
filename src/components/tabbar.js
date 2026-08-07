/**
 * აპის ნავიგაცია.
 *
 * მობილურზე — ქვედა ტაბები, როგორც აპში.
 * დესკტოპზე — მარცხენა ვიწრო სვეტი.
 *
 * ერთი და იგივე მარკაპი, სხვაობა მხოლოდ CSS-ში. ეს განზრახია:
 * ორი ცალკე ნავიგაცია ორჯერ მეტი შესაძლებლობაა შეცდომისთვის.
 */

import { $, el } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

export const TABS = [
  { id: 'feed', href: '/', label: 'ფიდი', icon: 'sparkle' },
  { id: 'map', href: '/map.html', label: 'რუკა', icon: 'map' },
  { id: 'search', href: '/search.html', label: 'ძებნა', icon: 'search' },
  // შენახვა და მოწონება ორი სხვადასხვა რამაა — გულს პოსტს ვუკეთებთ,
  // სანიშნეს კი ადგილს. ერთი ხატულა ორივეზე ხალხს აბნევს.
  { id: 'saved', href: '/saved.html', label: 'შენახული', icon: 'bookmark' },
  { id: 'profile', href: '/profile.html', label: 'პროფილი', icon: 'user' },
];

/**
 * @param {{active?: string}} opts
 */
export function mountTabBar({ active = '' } = {}) {
  const host = $('#tabbar') ?? document.body.appendChild(el('nav', { id: 'tabbar' }));
  host.className = 'tabbar';
  host.setAttribute('aria-label', 'მთავარი ნავიგაცია');

  host.innerHTML = `
    <a class="tabbar-brand" href="/" aria-label="თბილისი LIVE">
      <span class="tabbar-mark">T</span>
      <span class="tabbar-wordmark">თბილისი<b>LIVE</b></span>
    </a>
    ${TABS.map((t) => `
      <a class="tab" href="${t.href}" data-tab="${t.id}"
         ${t.id === active ? 'aria-current="page"' : ''}>
        <span class="tab-ico">${icon(t.icon, { size: 22 })}</span>
        <span class="tab-label">${t.label}</span>
      </a>`).join('')}
    <span class="tabbar-spacer"></span>
    <button class="tab tab-theme" type="button" aria-label="დღე / ღამე">
      <span class="tab-ico i-sun">${icon('sun', { size: 20 })}</span>
      <span class="tab-ico i-moon">${icon('moon', { size: 20 })}</span>
      <span class="tab-label">თემა</span>
    </button>
  `;

  host.querySelector('.tab-theme').addEventListener('click', async () => {
    (await import('../lib/theme.js')).toggleTheme();
  });

  document.body.classList.add('has-tabbar');
  return host;
}
