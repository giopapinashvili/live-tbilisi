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

  const r = anchor.getBoundingClientRect();
  const w = 260;
  // ეკრანიდან რომ არ გავიდეს — მარჯვნივ და ქვევით ვამოწმებთ
  menu.style.left = `${Math.min(r.left, window.innerWidth - w - 10)}px`;
  menu.style.top = `${Math.min(r.bottom + 6, window.innerHeight - 320)}px`;

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

      // სრული გადატვირთვა განზრახია. გადართვა სხვა ანგარიშზე
      // შესვლას უდრის: ფიდი, შეტყობინებები, პროფილი, შენახული —
      // ყველაფერი სხვაა. ცალ-ცალკე რომ განვაახლოთ, ერთი კუთხე
      // აუცილებლად დარჩება ძველი და ადამიანი დაიბნევა.
      const back = location.pathname.startsWith('/profile')
        ? '/profile.html' : location.href;
      location.replace(back);
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
