/** საიტის ჰედერი — ერთი წყარო ყველა გვერდისთვის. */

import { el, $ } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { toggleTheme } from '../lib/theme.js';
import { HAS_BACKEND } from '../lib/config.js';

const NAV = [
  { href: '/map.html', label: 'რუკა', key: 'map' },
  { href: '/category.html', label: 'კატეგორიები', key: 'category' },
  { href: '/promos.html', label: 'ფასდაკლებები', key: 'promos' },
  { href: '/dashboard.html', label: 'ბიზნესებისთვის', key: 'dashboard' },
];

/**
 * @param {{active?:string, compact?:boolean}} opts
 */
export function mountHeader({ active = '', compact = false } = {}) {
  const host = $('#hdr');
  if (!host) return null;

  host.className = 'hdr';
  host.innerHTML = `
    <a class="brand" href="/">
      თბილისი<span class="brand-live">LIVE</span>
    </a>

    <nav class="nav" aria-label="მთავარი ნავიგაცია">
      ${NAV.map((n) => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a>`).join('')}
    </nav>

    <span class="spacer"></span>

    ${compact ? '' : `
      <a class="btn btn-ghost btn-icon" href="/search.html" aria-label="ძებნა" title="ძებნა">
        ${icon('search')}
      </a>`}

    <button class="btn btn-ghost btn-icon theme-btn" type="button"
            aria-label="თემის შეცვლა" title="დღე / ღამე">
      <span class="i-sun">${icon('sun')}</span>
      <span class="i-moon">${icon('moon')}</span>
    </button>

    <span id="hdr-auth"></span>
  `;

  host.querySelector('.theme-btn').addEventListener('click', toggleTheme);

  if (HAS_BACKEND) mountAuthButton(host.querySelector('#hdr-auth'));
  else host.querySelector('#hdr-auth')?.remove();

  return host;
}

async function mountAuthButton(slot) {
  if (!slot) return;
  const { onUser, signInWithGoogle, signOutUser } = await import('../lib/supabase.js');

  onUser((user) => {
    slot.replaceChildren();
    if (!user) {
      slot.append(el('button', {
        class: 'btn btn-sm',
        type: 'button',
        onclick: () => signInWithGoogle().catch((e) => console.error(e)),
      }, 'შესვლა'));
      return;
    }

    const wrap = el('div', { class: 'row', style: { gap: '.4rem' } });
    if (user.photoURL) {
      wrap.append(el('img', {
        src: user.photoURL, alt: '', width: 28, height: 28,
        style: { borderRadius: '50%', border: '1px solid var(--line-strong)' },
        referrerpolicy: 'no-referrer',
      }));
    }
    wrap.append(el('button', {
      class: 'btn btn-ghost btn-sm',
      type: 'button',
      title: user.email ?? '',
      onclick: () => signOutUser(),
    }, 'გასვლა'));
    slot.append(wrap);
  });
}

/** გვერდის ძირი */
export function mountFooter() {
  const host = $('#ftr');
  if (!host) return;
  const year = new Date().getFullYear();
  host.innerHTML = `
    <div class="lattice" aria-hidden="true"></div>
    <div class="wrap" style="padding-block: var(--sp-6); display:grid; gap:var(--sp-4)">
      <div class="row-wrap" style="justify-content:space-between; align-items:flex-start; gap:var(--sp-5)">
        <div>
          <a class="brand" href="/">თბილისი<span class="brand-live">LIVE</span></a>
          <p class="muted" style="font-size:var(--fs-sm); margin:.6rem 0 0; max-width:36ch">
            ქალაქის ერთიანი რუკა — ბიზნესები, სერვისები, მენიუები და ფასდაკლებები ერთ ადგილას.
          </p>
        </div>
        <nav class="row-wrap" style="gap:var(--sp-4); font-size:var(--fs-sm)">
          ${NAV.map((n) => `<a href="${n.href}">${n.label}</a>`).join('')}
        </nav>
      </div>
      <hr class="rule" style="margin:0">
      <p class="dim" style="font-size:var(--fs-xs); margin:0">
        © ${year} თბილისი LIVE · რუკის მონაცემები
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>
        contributors (ODbL) ·
        ტაილები <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>
      </p>
    </div>
  `;
}
