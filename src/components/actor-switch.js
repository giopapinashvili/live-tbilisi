/**
 * სახის გადამრთველი — ვისი სახელით ვმოქმედებ.
 *
 * ადრე მხოლოდ კომპოზერში იყო და იქ დამალული რჩებოდა: ადამიანი
 * ხედავდა მხოლოდ მაშინ, როცა უკვე პოსტს წერდა. გადართვა კი
 * ნავიგაციის ნაწილია — ისეთივე, როგორც „ვინ ხარ ახლა".
 *
 * ერთი კომპონენტი, ორ ადგილას: ნავიგაციაში და პროფილზე.
 */

import { el, esc, attr } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { loadActors, allActors, activeActor, switchTo, actorId } from '../lib/actor.js';

let menu;

export const faceOf = (a) => (a?.avatar_url
  ? `<img src="${attr(a.avatar_url)}" alt="">`
  : esc((a?.display_name ?? '?').trim().charAt(0) || '?'));

const kindWord = (k) => (k === 'person' ? 'შენ' : k === 'group' ? 'ჯგუფი' : 'გვერდი');

/**
 * მენიუს გახსნა ღილაკის ქვეშ.
 * @param {HTMLElement} anchor რის ქვეშაც უნდა გაიხსნას
 */
export async function openActorMenu(anchor) {
  await loadActors();
  const list = allActors();

  close();
  menu = el('div', { class: 'actor-menu' });

  // მდებარეობა ეკრანის მიმართ (position: fixed).
  // ტაბები ხან ქვევითაა, ხან მარცხნივ — ამიტომ ვამოწმებთ,
  // ქვემოთ ჩაეტევა თუ არა, და საჭიროებისას ზემოთ ვხსნით.
  const r = anchor.getBoundingClientRect();
  const w = 260;
  const h = Math.min(340, 120 + list.length * 56);

  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  const below = r.bottom + 6;
  const top = below + h < window.innerHeight ? below : Math.max(8, r.top - h - 6);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.maxHeight = `${h}px`;
  menu.style.overflowY = 'auto';

  menu.innerHTML = `
    <div class="actor-head">ვისი სახელით</div>

    ${list.map((a) => `
      <button class="actor-item" type="button" data-actor="${attr(a.id)}"
              aria-current="${a.id === actorId()}">
        <span class="actor-face">${faceOf(a)}</span>
        <span>
          <b>${esc(a.display_name)}</b>
          <small>${kindWord(a.kind)}${a.username ? ` · @${esc(a.username)}` : ''}</small>
        </span>
        ${a.id === actorId() ? icon('check', { size: 15 }) : ''}
      </button>`).join('')}

    <div class="actor-sep"></div>

    <a class="actor-item" href="/create-page.html">
      <span class="actor-face actor-plus">${icon('plus', { size: 15 })}</span>
      <span><b>ახალი გვერდი</b><small>ბიზნესი, ბრენდი, სერვისი</small></span>
    </a>
    <a class="actor-item" href="/create-page.html?kind=group">
      <span class="actor-face actor-plus">${icon('plus', { size: 15 })}</span>
      <span><b>ახალი ჯგუფი</b><small>სიახლეები ერთ ლენტაში</small></span>
    </a>`;

  document.body.appendChild(menu);

  const onDoc = (e) => {
    const pick = e.target.closest('[data-actor]');
    if (pick) {
      if (pick.dataset.actor === actorId()) { close(); return; }
      switchTo(pick.dataset.actor);
      close();
      document.removeEventListener('click', onDoc, true);

      // სრული გადატვირთვა განზრახია: გადართვა სხვა ანგარიშზე
      // შესვლას უდრის და ყველა კუთხე უნდა შეიცვალოს.
      //
      // reload() და არა replace(location.href) — იმავე მისამართზე
      // replace ბრაუზერს გვერდს არ ატვირთვინებს და გადართვა
      // უშედეგო ჩანდა. სწორედ ეს ხარვეზი იყო.
      if (location.pathname.startsWith('/profile')) {
        location.href = '/profile.html';
      } else {
        location.reload();
      }
      return;
    }
    if (menu && !menu.contains(e.target)) {
      close();
      document.removeEventListener('click', onDoc, true);
    }
  };
  setTimeout(() => document.addEventListener('click', onDoc, true), 0);
}

export function close() {
  menu?.remove();
  menu = null;
}

/** პატარა ღილაკი, რომელიც მენიუს ხსნის */
export function actorButton(a = activeActor()) {
  return `
    <button class="actor-btn" type="button" data-actor-open>
      <span class="actor-face">${faceOf(a)}</span>
      <span>${esc(a?.display_name ?? '')}</span>
      ${icon('chevron', { size: 14 })}
    </button>`;
}
