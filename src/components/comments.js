/**
 * კომენტარები და შეფასება — ორი ცალკე ფურცელი.
 *
 * ინსტაგრამზე კომენტარი და შეფასება ერთ ფანჯარაში არასდროსაა.
 * ერთში აზრს წერ, მეორეში ვარსკვლავს აყენებ. აქაც ასეა.
 */

import { esc, attr, el, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { ago, num } from '../lib/format.js';
import {
  getComments, addComment, deleteComment, commentCount,
  myRating, setRating, getRating, displayRating,
} from '../lib/social.js';

/* ─────────────────────────────────────────────────────────────
   კომენტარები
   ───────────────────────────────────────────────────────────── */

let csheet;

export function openCommentSheet({ threadId, business, title }) {
  csheet ??= document.body.appendChild(el('div', { class: 'sheet2', hidden: true }));
  csheet.hidden = false;
  requestAnimationFrame(() => { csheet.dataset.open = 'true'; });
  document.body.style.overflow = 'hidden';
  paint();

  function paint() {
    const list = getComments(threadId);

    csheet.innerHTML = `
      <div class="sheet2-backdrop" data-close></div>
      <div class="sheet2-panel" role="dialog" aria-label="კომენტარები">
        <div class="sheet2-grip"></div>
        <div class="sheet2-head">
          <button class="sheet2-x" type="button" data-close aria-label="დახურვა">
            ${icon('close', { size: 20 })}
          </button>
          <strong>კომენტარები</strong>
          <span class="sheet2-sub">${list.length ? num(list.length) : ''}</span>
        </div>

        <div class="sheet2-body">
          ${list.length ? list.map(row).join('') : `
            <div class="cmt-empty">
              <div class="cmt-empty-title">კომენტარი ჯერ არ არის</div>
              <div class="dim">იყავი პირველი, ვინც აზრს დაწერს.</div>
            </div>`}
        </div>

        <form class="sheet2-form">
          <span class="cmt-avatar">${icon('user', { size: 16 })}</span>
          <input class="cmt-input" name="text" autocomplete="off" maxlength="800"
                 placeholder="დაწერე კომენტარი${business ? ` — ${esc(business.name)}` : ''}…">
          <button class="cmt-send" type="submit" disabled>გამოქვეყნება</button>
        </form>
      </div>`;

    const form = csheet.querySelector('form');
    const input = form.querySelector('.cmt-input');
    const send = form.querySelector('.cmt-send');

    input.addEventListener('input', () => { send.disabled = !input.value.trim(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const added = await addComment(threadId, input.value, { businessId: business?.id });
      if (!added) return;
      paint();
      document.dispatchEvent(new CustomEvent('tl:comment', { detail: { threadId } }));
    });

    setTimeout(() => input.focus(), 120);
  }

  csheet.onclick = (e) => {
    if (e.target.closest('[data-close]')) return close();
    const del = e.target.closest('[data-del]');
    if (del) { deleteComment(threadId, del.dataset.del); paint(); }
  };

  function close() {
    csheet.dataset.open = 'false';
    document.body.style.overflow = '';
    setTimeout(() => { csheet.hidden = true; }, 260);
  }

  document.addEventListener('keydown', function onEsc(ev) {
    if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
}

function row(c) {
  return `
    <div class="cmt">
      <span class="cmt-avatar">${icon('user', { size: 15 })}</span>
      <div class="cmt-body">
        <div class="cmt-line"><b>${esc(c.author)}</b> ${esc(c.text)}</div>
        <div class="cmt-meta">
          <span>${esc(ago(c.createdAt))}</span>
          <button type="button" class="cmt-reply">პასუხი</button>
          ${c.mine ? `<button type="button" class="cmt-reply" data-del="${attr(c.id)}">წაშლა</button>` : ''}
        </div>
      </div>
      <button class="cmt-like" type="button" aria-label="მოწონება">${icon('heart', { size: 13 })}</button>
    </div>`;
}

/* ─────────────────────────────────────────────────────────────
   შეფასება — ცალკე, პატარა ფანჯარა
   ───────────────────────────────────────────────────────────── */

let rsheet;

export function openRatingSheet(business) {
  rsheet ??= document.body.appendChild(el('div', { class: 'sheet2 sheet2-mini', hidden: true }));
  rsheet.hidden = false;
  requestAnimationFrame(() => { rsheet.dataset.open = 'true'; });
  let pick = myRating(business.id) ?? 0;
  paint();

  function paint() {
    const saved = getRating(business.id);
    rsheet.innerHTML = `
      <div class="sheet2-backdrop" data-close></div>
      <div class="sheet2-panel" role="dialog" aria-label="შეფასება">
        <div class="sheet2-grip"></div>
        <div class="rate-box">
          <div class="rate-title">${esc(business.name)}</div>
          <div class="rate-sub">როგორ შეაფასებდი?</div>

          <div class="stars-input" role="radiogroup">
            ${[1, 2, 3, 4, 5].map((n) => `
              <button class="star" type="button" role="radio" data-star="${n}"
                      aria-checked="${pick === n}" aria-label="${n}">
                ${icon('star', { size: 38, fill: n <= pick })}
              </button>`).join('')}
          </div>

          <div class="rate-word">${['აირჩიე', 'ცუდი', 'საშუალო', 'კარგი', 'ძალიან კარგი', 'შესანიშნავი'][pick]}</div>

          <textarea class="textarea rate-text" placeholder="დაწერე რამდენიმე სიტყვა (არასავალდებულო)"
                    maxlength="600">${esc(saved?.text ?? '')}</textarea>

          <div class="row" style="gap:var(--sp-2)">
            <button class="btn" type="button" data-close style="flex:1">გაუქმება</button>
            <button class="btn btn-primary" type="button" data-save style="flex:1"
                    ${pick ? '' : 'disabled'}>შენახვა</button>
          </div>
        </div>
      </div>`;
  }

  rsheet.onclick = async (e) => {
    if (e.target.closest('[data-close]')) return close();

    const star = e.target.closest('[data-star]');
    if (star) {
      pick = Number(star.dataset.star);
      const keep = rsheet.querySelector('.rate-text')?.value ?? '';
      paint();
      const t = rsheet.querySelector('.rate-text');
      if (t) t.value = keep;
      return;
    }

    if (e.target.closest('[data-save]')) {
      const text = rsheet.querySelector('.rate-text')?.value ?? '';
      await setRating(business.id, pick, text);
      if (text.trim()) await addComment(`b:${business.id}`, text, { businessId: business.id });
      toast(`შეფასდა ${pick} ვარსკვლავით`);
      document.dispatchEvent(new CustomEvent('tl:rating', { detail: { businessId: business.id, stars: pick } }));
      close();
    }
  };

  function close() {
    rsheet.dataset.open = 'false';
    setTimeout(() => { rsheet.hidden = true; }, 260);
  }
}

/** ვარსკვლავების ჩვენება — მხოლოდ საკითხავად */
export function starsView(value, { size = 15 } = {}) {
  const v = Number(value ?? 0);
  return `<span class="stars">${[1, 2, 3, 4, 5]
    .map((n) => icon('star', { size, fill: n <= Math.round(v) })).join('')}</span>`;
}

export { commentCount, displayRating };
