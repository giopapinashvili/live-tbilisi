/**
 * კარიბჭე — რა შეუძლია სტუმარს და რა მხოლოდ შესულს.
 *
 * წესი ერთ ადგილას წერია განზრახი მიზეზით: ათ ღილაკზე ათჯერ
 * გამეორებული „თუ შესულია" ცხრა ადგილას მუშაობს და ერთგან არა —
 * და სწორედ ის ერთი ადგილი ჩნდება ეკრანზე.
 *
 * სტუმარს შეუძლია:
 *   • ნახვა — ფიდი, რუკა, ბიზნესის გვერდი, პოსტი, კომენტარები
 *   • ძებნა
 *   • ადგილის შეფასება ვარსკვლავებით
 *
 * სტუმარს არ შეუძლია:
 *   • მოწონება, კომენტარი, პასუხი
 *   • პოსტის დადება, ფოტოს ატვირთვა
 *   • გამოწერა, შენახვა, ჩექინი
 *   • მიმოწერა, საკუთარი პროფილი
 *
 * შეფასება რატომაა ღია: ვარსკვლავი ადგილს ეხება, არა ადამიანებს
 * შორის ურთიერთობას. სტუმრის შეფასება მხოლოდ მის ბრაუზერში რჩება
 * და შესვლისთანავე ბაზაში გადადის — ასე საერთო ქულა სპამისგან
 * დაცულია, ადამიანი კი კარში არ ჩერდება.
 */

import { el, esc } from './dom.js';
import { icon } from './icons.js';
import { currentUser } from './supabase.js';

/** ქმედებები, რომლებსაც ანგარიში სჭირდება */
export const NEEDS_ACCOUNT = {
  like:     'პოსტის მოსაწონებლად',
  comment:  'კომენტარის დასაწერად',
  reply:    'პასუხის გასაცემად',
  post:     'პოსტის დასადებად',
  upload:   'ფოტოს ასატვირთად',
  follow:   'გამოსაწერად',
  save:     'შესანახად',
  checkin:  'ჩექინისთვის',
  message:  'მიმოწერისთვის',
  profile:  'პროფილის სანახავად',
  page:     'გვერდის შესაქმნელად',
};

export const isGuest = () => !currentUser();

/**
 * მოქმედების ნებართვა.
 *
 *   if (!allowed('like')) return;
 *
 * თუ სტუმარია — აჩვენებს ფანჯარას და აბრუნებს false.
 * ეს განზრახ არაა async: ღილაკის დამმუშავებელს დაუყოვნებლივ
 * უნდა შეეძლოს გაჩერება, სანამ რამეს შეცვლის.
 */
export function allowed(action) {
  if (currentUser()) return true;
  askToSignIn(action);
  return false;
}

/* ─────────────────────────────────────────────────────────── */

let sheet;

/** მოსაწვევი ფანჯარა — მკაცრი „აკრძალულია“ არავის ეხალისება */
export function askToSignIn(action = 'like') {
  const why = NEEDS_ACCOUNT[action] ?? 'ამისთვის';
  const next = encodeURIComponent(location.pathname + location.search);

  sheet ??= document.body.appendChild(el('div', { class: 'gate', hidden: true }));
  sheet.hidden = false;
  requestAnimationFrame(() => { sheet.dataset.open = 'true'; });

  sheet.innerHTML = `
    <div class="gate-backdrop" data-close></div>
    <div class="gate-panel" role="dialog" aria-modal="true" aria-label="შესვლა">
      <button class="gate-x" type="button" data-close aria-label="დახურვა">
        ${icon('close', { size: 20 })}
      </button>

      <div class="gate-mark">თ<span>L</span></div>
      <h2 class="gate-title">${esc(why)} ანგარიში სჭირდება</h2>
      <p class="gate-text">
        რეგისტრაცია ერთ წუთში. ნახვა და ძებნა ისედაც ღიაა —
        ანგარიში მაშინ გჭირდება, როცა კვალის დატოვება გინდა.
      </p>

      <div class="gate-acts">
        <a class="btn btn-primary btn-lg btn-block"
           href="/login.html?signup=1&next=${next}">რეგისტრაცია</a>
        <a class="btn btn-block" href="/login.html?next=${next}">უკვე მაქვს ანგარიში</a>
      </div>

      <button class="gate-later" type="button" data-close>მოგვიანებით</button>
    </div>`;

  sheet.onclick = (e) => { if (e.target.closest('[data-close]')) close(); };
  document.addEventListener('keydown', function esc_(ev) {
    if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', esc_); }
  });
}

function close() {
  if (!sheet) return;
  sheet.dataset.open = 'false';
  setTimeout(() => { sheet.hidden = true; }, 240);
}

/* ─────────────────────────────────────────────────────────── */

/**
 * გვერდი, რომელიც სტუმარს არ ეკუთვნის.
 * აბრუნებს true, თუ სტუმარია — გამომძახებელმა უნდა შეწყვიტოს.
 */
export function guestWall(root, { title, text, action = 'profile' } = {}) {
  if (currentUser()) return false;

  const next = encodeURIComponent(location.pathname + location.search);
  root.innerHTML = `
    <div class="wall">
      <div class="wall-mark">${icon('user', { size: 34 })}</div>
      <h1 class="wall-title">${esc(title ?? 'აქ შესვლა გჭირდება')}</h1>
      <p class="wall-text">
        ${esc(text ?? 'პროფილი, მოწონებული პოსტები და შენახული ადგილები ანგარიშთან ერთად ჩნდება.')}
      </p>
      <div class="wall-acts">
        <a class="btn btn-primary btn-lg" href="/login.html?signup=1&next=${next}">რეგისტრაცია</a>
        <a class="btn btn-lg" href="/login.html?next=${next}">შესვლა</a>
      </div>
      <p class="wall-note">
        ფიდი, რუკა და ძებნა ანგარიშის გარეშეც ღიაა —
        <a href="/">დაბრუნდი მთავარზე</a>.
      </p>
    </div>`;
  return true;
}
