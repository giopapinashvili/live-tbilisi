/**
 * კომენტარების ფურცელი და 5-ვარსკვლავიანი შეფასება.
 * ერთი კომპონენტი — ფიდიც და ბიზნესის გვერდიც მას იყენებს.
 */

import { esc, attr, el, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { ago } from '../lib/format.js';
import {
  getComments, addComment, deleteComment, commentCount,
  myRating, setRating, getRating, displayRating,
} from '../lib/social.js';

let sheet;

/** ქვედა ფურცელი — კომენტარები + შეფასება */
export function openCommentSheet({ threadId, business, title }) {
  sheet ??= document.body.appendChild(el('div', { class: 'csheet', hidden: true }));
  sheet.hidden = false;
  sheet.dataset.open = 'true';
  document.body.style.overflow = 'hidden';
  paint();

  function paint() {
    const list = getComments(threadId);
    const mine = myRating(business?.id);
    const saved = getRating(business?.id);

    sheet.innerHTML = `
      <div class="csheet-backdrop" data-close></div>
      <div class="csheet-panel" role="dialog" aria-label="კომენტარები">
        <div class="csheet-grip"></div>
        <div class="csheet-head">
          <strong>${esc(title ?? business?.name ?? 'კომენტარები')}</strong>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-icon btn-sm" type="button" data-close
                  aria-label="დახურვა">${icon('close', { size: 18 })}</button>
        </div>

        ${business ? `
          <div class="csheet-rate">
            <div class="rate-label">შენი შეფასება</div>
            <div class="stars-input" role="radiogroup" aria-label="შეფასება">
              ${[1, 2, 3, 4, 5].map((n) => `
                <button class="star" type="button" role="radio" data-star="${n}"
                        aria-checked="${mine === n}" aria-label="${n} ვარსკვლავი">
                  ${icon('star', { size: 30, fill: mine != null && n <= mine })}
                </button>`).join('')}
            </div>
            ${mine ? `<div class="rate-note">შენ შეაფასე ${mine}-ით${saved?.at ? ` · ${esc(ago(saved.at))}` : ''}</div>` : ''}
          </div>` : ''}

        <div class="csheet-list">
          ${list.length ? list.map(row).join('') : `
            <p class="dim" style="text-align:center; padding:var(--sp-6) 0; font-size:var(--fs-sm)">
              ჯერ არავის დაუწერია. იყავი პირველი.
            </p>`}
        </div>

        <form class="csheet-form">
          <input class="input" name="text" placeholder="დაწერე კომენტარი…" autocomplete="off" maxlength="800">
          <button class="btn btn-primary" type="submit">გაგზავნა</button>
        </form>
      </div>`;

    sheet.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = e.target.text;
      const added = await addComment(threadId, input.value, { businessId: business?.id });
      if (!added) return;
      input.value = '';
      paint();
      document.dispatchEvent(new CustomEvent('tl:comment', { detail: { threadId } }));
    });
  }

  sheet.onclick = async (e) => {
    if (e.target.closest('[data-close]')) return close();

    const star = e.target.closest('[data-star]');
    if (star && business) {
      const n = Number(star.dataset.star);
      await setRating(business.id, n);
      toast(`შეფასდა ${n} ვარსკვლავით`);
      paint();
      document.dispatchEvent(new CustomEvent('tl:rating', { detail: { businessId: business.id, stars: n } }));
      return;
    }

    const del = e.target.closest('[data-del]');
    if (del) { deleteComment(threadId, del.dataset.del); paint(); }
  };

  function close() {
    sheet.dataset.open = 'false';
    document.body.style.overflow = '';
    setTimeout(() => { sheet.hidden = true; }, 250);
  }

  document.addEventListener('keydown', function esc2(ev) {
    if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); }
  });
}

function row(c) {
  return `
    <div class="cmt">
      <span class="cmt-avatar">${icon('user', { size: 15 })}</span>
      <div class="cmt-body">
        <div><b>${esc(c.author)}</b> <span class="dim">${esc(ago(c.createdAt))}</span></div>
        <div class="cmt-text">${esc(c.text)}</div>
      </div>
      ${c.mine ? `<button class="btn btn-ghost btn-sm" type="button" data-del="${attr(c.id)}"
                          aria-label="წაშლა">${icon('close', { size: 14 })}</button>` : ''}
    </div>`;
}

/** ვარსკვლავების ჩვენება — მხოლოდ საკითხავად */
export function starsView(value, { size = 15 } = {}) {
  const v = Number(value ?? 0);
  return `<span class="stars">${[1, 2, 3, 4, 5]
    .map((n) => icon('star', { size, fill: n <= Math.round(v) })).join('')}</span>`;
}

export { commentCount, displayRating };
