/**
 * შესვლა და რეგისტრაცია.
 *
 * ყველა ჯერ ადამიანად რეგისტრირდება — სახელი, გვარი, დაბადების
 * თარიღი. გვერდები და ჯგუფები მერე იქმნება, უკვე შესულის მიერ.
 *
 * ნიკი არასავალდებულოა. თუ არ შეავსებ, სისტემა თავად შეარჩევს —
 * ის მაინც უნდა არსებობდეს, თორემ ადამიანს ვერავინ მონიშნავს
 * და ვერც პროფილის მისამართს დავადებთ. მერე ყოველთვის შეიცვლება.
 */

import { esc, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { applyTheme } from '../lib/theme.js';
import { HAS_BACKEND } from '../lib/config.js';
import {
  whenAuthReady, currentUser, signInWithEmail, signUpWithEmail,
  signInWithGoogle, resetPassword, readableError, supa,
} from '../lib/supabase.js';

applyTheme();

const host = document.getElementById('auth');
const next = new URLSearchParams(location.search).get('next') || '/';
const MIN_AGE = 13;
let mode = new URLSearchParams(location.search).has('signup') ? 'up' : 'in';
let busy = false;

(async () => {
  if (!HAS_BACKEND) return paintBroken();
  if (await whenAuthReady()) return location.replace(next);
  paint();
})();

/* ─────────────────────────────────────────────────────────── */

function paint() {
  const isUp = mode === 'up';
  const isForgot = mode === 'forgot';

  host.innerHTML = `
    <div class="auth-card">
      <a class="auth-logo" href="/">თბილისი <span>LIVE</span></a>

      <p class="auth-lede">
        ${isForgot ? 'მიუთითე ელფოსტა და აღდგენის ბმულს გამოგიგზავნით.'
    : isUp ? 'შექმენი ანგარიში — გვერდსა და ჯგუფს მერე დაამატებ.'
      : 'შედი და ქალაქი შენებურად დაალაგე.'}
      </p>

      <form class="auth-form" novalidate>
        ${isUp ? `
          <div class="auth-row">
            <label class="auth-field">
              <span>სახელი</span>
              <input class="input" name="first_name" maxlength="40" required
                     autocomplete="given-name" placeholder="გიორგი">
            </label>
            <label class="auth-field">
              <span>გვარი</span>
              <input class="input" name="last_name" maxlength="40" required
                     autocomplete="family-name" placeholder="პაპინაშვილი">
            </label>
          </div>

          <label class="auth-field">
            <span>დაბადების თარიღი</span>
            <input class="input" type="date" name="birth_date" required
                   max="${maxBirthDate()}" min="1900-01-01">
          </label>
        ` : ''}

        <label class="auth-field">
          <span>ელფოსტა</span>
          <input class="input" type="email" name="email" required
                 autocomplete="email" inputmode="email" placeholder="you@example.com">
        </label>

        ${isForgot ? '' : `
          <label class="auth-field">
            <span>პაროლი</span>
            <span class="auth-pw">
              <input class="input" type="password" name="password" required minlength="6"
                     autocomplete="${isUp ? 'new-password' : 'current-password'}"
                     placeholder="${isUp ? 'მინიმუმ 6 სიმბოლო' : '••••••••'}">
              <button class="auth-eye" type="button" data-eye aria-label="ჩვენება">
                ${icon('search', { size: 16 })}
              </button>
            </span>
          </label>`}

        ${isUp ? `
          <label class="auth-field">
            <span>ნიკი <i class="auth-opt">არასავალდებულო</i></span>
            <span class="auth-at">
              <i>@</i>
              <input class="input" name="username" maxlength="30"
                     autocapitalize="off" autocorrect="off" spellcheck="false"
                     placeholder="papina">
            </span>
            <small class="auth-hint" data-uname>თუ ცარიელს დატოვებ, ჩვენ შევარჩევთ — მერე შეცვლი</small>
          </label>` : ''}

        <p class="auth-err" hidden></p>

        <button class="btn btn-primary btn-lg btn-block" type="submit">
          ${isForgot ? 'ბმულის გამოგზავნა' : isUp ? 'რეგისტრაცია' : 'შესვლა'}
        </button>
      </form>

      ${isForgot ? `
        <button class="auth-link" type="button" data-mode="in">← შესვლას ვბრუნდები</button>
      ` : `
        <div class="auth-or"><span>ან</span></div>
        <button class="btn btn-block auth-google" type="button" data-google>
          <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z"/>
            <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z"/>
            <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-2.9.7-4.3v-5.7H4.5C2.9 17.2 2 20.5 2 24s.9 6.8 2.5 10l7.3-5.7z"/>
            <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.5 2 8.1 6.8 4.5 14l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/>
          </svg>
          Google-ით ${isUp ? 'რეგისტრაცია' : 'შესვლა'}
        </button>
        ${isUp ? '' : '<button class="auth-link" type="button" data-mode="forgot">პაროლი დაგავიწყდა?</button>'}
      `}
    </div>

    ${isForgot ? '' : `
      <div class="auth-card auth-switch">
        ${isUp
    ? 'უკვე გაქვს ანგარიში? <button class="auth-link" type="button" data-mode="in">შესვლა</button>'
    : 'ანგარიში არ გაქვს? <button class="auth-link" type="button" data-mode="up">რეგისტრაცია</button>'}
      </div>`}

    <p class="auth-legal">
      რეგისტრაცია ${MIN_AGE} წლიდან. გაგრძელებით ეთანხმები, რომ სხვისი
      ფოტო და პირადი ინფორმაცია ნებართვის გარეშე არ გამოქვეყნდება.
    </p>`;

  bind();
}

/* ─────────────────────────────────────────────────────────── */

function bind() {
  const form = host.querySelector('.auth-form');
  const err = host.querySelector('.auth-err');

  host.onclick = async (e) => {
    const to = e.target.closest('[data-mode]');
    if (to) { mode = to.dataset.mode; paint(); return; }

    if (e.target.closest('[data-eye]')) {
      const i = host.querySelector('input[name="password"]');
      i.type = i.type === 'password' ? 'text' : 'password';
      return;
    }

    if (e.target.closest('[data-google]')) {
      try { await signInWithGoogle(); } catch (ex) { show(err, readableError(ex)); }
    }
  };

  // ნიკის თავისუფლება წერისასვე — ბოლოს „დაკავებულია" ყველაზე გამაღიზიანებელია
  const uname = form.querySelector('input[name="username"]');
  if (uname) {
    const hint = form.querySelector('[data-uname]');
    let timer;
    uname.addEventListener('input', () => {
      uname.value = uname.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
      clearTimeout(timer);
      const v = uname.value;
      if (!v) {
        hint.className = 'auth-hint';
        hint.textContent = 'თუ ცარიელს დატოვებ, ჩვენ შევარჩევთ — მერე შეცვლი';
        return;
      }
      if (v.length < 3) {
        hint.className = 'auth-hint bad';
        hint.textContent = 'მინიმუმ 3 სიმბოლო';
        return;
      }
      hint.className = 'auth-hint';
      hint.textContent = 'ვამოწმებ…';
      timer = setTimeout(async () => {
        const free = await isFree(v);
        hint.className = `auth-hint ${free ? 'good' : 'bad'}`;
        hint.textContent = free ? '✓ თავისუფალია' : 'დაკავებულია — სხვა სცადე';
      }, 350);
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');

    if (!email.includes('@')) return show(err, 'ელფოსტა არასწორად არის ჩაწერილი');

    if (mode === 'forgot') {
      setBusy(true, form);
      try {
        await resetPassword(email);
        toast('ბმული გამოგზავნილია — შეამოწმე ფოსტა');
        mode = 'in'; paint();
      } catch (ex) { show(err, readableError(ex)); setBusy(false, form); }
      return;
    }

    if (password.length < 6) return show(err, 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');

    if (mode === 'in') {
      setBusy(true, form);
      try { await signInWithEmail(email, password); location.replace(next); }
      catch (ex) { show(err, readableError(ex)); setBusy(false, form); }
      return;
    }

    /* ── რეგისტრაცია ── */
    const first = String(fd.get('first_name') ?? '').trim();
    const last = String(fd.get('last_name') ?? '').trim();
    const birth = String(fd.get('birth_date') ?? '');
    const username = String(fd.get('username') ?? '').toLowerCase();

    if (!first) return show(err, 'სახელი აუცილებელია');
    if (!last) return show(err, 'გვარი აუცილებელია');
    if (!birth) return show(err, 'დაბადების თარიღი აუცილებელია');

    const years = ageOn(birth);
    if (years === null) return show(err, 'თარიღი არასწორია');
    if (years < MIN_AGE) return show(err, `რეგისტრაცია ${MIN_AGE} წლიდან შეიძლება`);
    if (username && username.length < 3) return show(err, 'ნიკი მინიმუმ 3 სიმბოლო, ან დატოვე ცარიელი');

    setBusy(true, form);
    try {
      const { session } = await signUpWithEmail(email, password, {
        first_name: first,
        last_name: last,
        birth_date: birth,
        username: username || null,
      });

      if (session) { location.replace(next); return; }

      host.innerHTML = `
        <div class="auth-card auth-done">
          <div class="auth-tick">${icon('check', { size: 30 })}</div>
          <h1>შეამოწმე ფოსტა</h1>
          <p class="auth-lede">
            <b>${esc(email)}</b>-ზე დასადასტურებელი ბმული გამოგზავნეთ.
            დაადასტურე და დაბრუნდი.
          </p>
          <a class="btn btn-block" href="/login.html">შესვლა</a>
        </div>`;
    } catch (ex) {
      show(err, readableError(ex));
      setBusy(false, form);
    }
  };
}

/* ─────────────────────────────────────────────────────────── */

/** ასაკი წლებში მოცემულ თარიღზე, ან null თუ თარიღი უვარგისია */
function ageOn(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y -= 1;
  return y;
}

/** უახლესი დასაშვები დაბადების თარიღი — კალენდარი უფროსს არ აჩვენებს */
function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d.toISOString().slice(0, 10);
}

async function isFree(username) {
  try {
    const me = currentUser();
    const sb = await supa();
    const { data } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
    return !data || data.id === me?.id;
  } catch { return true; }      // შემოწმება ჩავარდა — ბაზა ისედაც არ დაუშვებს დუბლს
}

function show(node, text) {
  if (!node) return;
  node.textContent = text;
  node.hidden = false;
}

function setBusy(on, form) {
  busy = on;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = on;
  btn.dataset.label ??= btn.textContent.trim();
  btn.textContent = on ? 'ერთი წამი…' : btn.dataset.label;
}

function paintBroken() {
  host.innerHTML = `
    <div class="auth-card">
      <a class="auth-logo" href="/">თბილისი <span>LIVE</span></a>
      <p class="auth-lede">ბაზა ჯერ არ არის მიბმული. შესვლა დროებით მიუწვდომელია.</p>
      <a class="btn btn-block" href="/">მთავარზე დაბრუნება</a>
    </div>`;
}
