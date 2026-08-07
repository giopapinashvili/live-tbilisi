/**
 * შესვლა და რეგისტრაცია.
 *
 * ერთი გვერდი, სამი მდგომარეობა:
 *   in     — შესვლა
 *   up     — რეგისტრაცია
 *   forgot — პაროლის აღდგენა
 *
 * რეგისტრაციის შემდეგ ონბორდინგი: მომხმარებლის სახელი და
 * ანგარიშის ტიპი. სახელს ბაზა ავტომატურად ქმნის ელფოსტიდან,
 * მაგრამ „gio.papinashvili20“ ლამაზი არაა — არჩევის საშუალება უნდა იყოს.
 */

import { esc, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { applyTheme } from '../lib/theme.js';
import { HAS_BACKEND } from '../lib/config.js';
import {
  whenAuthReady, currentUser, currentProfile,
  signInWithEmail, signUpWithEmail, signInWithGoogle,
  resetPassword, updateProfile, refreshProfile, readableError, supa,
} from '../lib/supabase.js';

applyTheme();

const host = document.getElementById('auth');
const next = new URLSearchParams(location.search).get('next') || '/';
let mode = new URLSearchParams(location.search).has('signup') ? 'up' : 'in';
let busy = false;

(async () => {
  if (!HAS_BACKEND) { paintBroken(); return; }

  const user = await whenAuthReady();
  if (user) {
    // უკვე შესულია — თუ პროფილი დაუსრულებელია, ონბორდინგი; თუ არა, გავუშვათ
    if (needsOnboarding(currentProfile())) paintOnboarding();
    else location.replace(next);
    return;
  }
  paint();
})();

/** სახელი ჯერ ელფოსტიდანაა აწყობილი — ესე იგი არ აურჩევია */
function needsOnboarding(p) {
  return Boolean(p) && !p.onboarded;
}

/* ─────────────────────────────────────────────────────────────
   შესვლა / რეგისტრაცია
   ───────────────────────────────────────────────────────────── */

function paint() {
  const isUp = mode === 'up';
  const isForgot = mode === 'forgot';

  host.innerHTML = `
    <div class="auth-card">
      <a class="auth-logo" href="/">თბილისი <span>LIVE</span></a>

      ${isForgot ? `
        <p class="auth-lede">
          მიუთითე ელფოსტა და პაროლის აღსადგენ ბმულს გამოგიგზავნით.
        </p>` : `
        <p class="auth-lede">
          ${isUp
    ? 'შექმენი ანგარიში — მოიწონე, დააკომენტარე და დადე შენი პოსტი.'
    : 'შედი და ქალაქი შენებურად დაალაგე.'}
        </p>`}

      <form class="auth-form" novalidate>
        <label class="auth-field">
          <span>ელფოსტა</span>
          <input class="input" type="email" name="email" autocomplete="email"
                 inputmode="email" required placeholder="you@example.com">
        </label>

        ${isForgot ? '' : `
          <label class="auth-field">
            <span>პაროლი</span>
            <span class="auth-pw">
              <input class="input" type="password" name="password" required
                     minlength="6" autocomplete="${isUp ? 'new-password' : 'current-password'}"
                     placeholder="${isUp ? 'მინიმუმ 6 სიმბოლო' : '••••••••'}">
              <button class="auth-eye" type="button" data-eye aria-label="პაროლის ჩვენება">
                ${icon('search', { size: 16 })}
              </button>
            </span>
          </label>`}

        <p class="auth-err" hidden></p>

        <button class="btn btn-primary btn-lg btn-block" type="submit">
          ${isForgot ? 'ბმულის გამოგზავნა' : (isUp ? 'რეგისტრაცია' : 'შესვლა')}
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
      გაგრძელებით ეთანხმები, რომ სხვისი ფოტო და პირადი ინფორმაცია
      ნებართვის გარეშე არ გამოქვეყნდება.
    </p>`;

  bind();
}

function bind() {
  const form = host.querySelector('.auth-form');
  const err = host.querySelector('.auth-err');

  host.onclick = async (e) => {
    const to = e.target.closest('[data-mode]');
    if (to) { mode = to.dataset.mode; paint(); return; }

    if (e.target.closest('[data-eye]')) {
      const input = host.querySelector('input[name="password"]');
      input.type = input.type === 'password' ? 'text' : 'password';
      return;
    }

    if (e.target.closest('[data-google]')) {
      try {
        sessionStorage.setItem('tl.next', next);
        await signInWithGoogle();
      } catch (ex) { show(err, readableError(ex)); }
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');

    if (!email.includes('@')) return show(err, 'ელფოსტა არასწორად არის ჩაწერილი');
    if (mode !== 'forgot' && password.length < 6) return show(err, 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');

    setBusy(true, form);
    try {
      if (mode === 'forgot') {
        await resetPassword(email);
        toast('ბმული გამოგზავნილია — შეამოწმე ფოსტა');
        mode = 'in'; paint(); return;
      }

      if (mode === 'up') {
        const { session } = await signUpWithEmail(email, password);
        if (!session) {
          // ელფოსტის დადასტურება ჩართულია
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
          return;
        }
        await refreshProfile();
        paintOnboarding();
        return;
      }

      await signInWithEmail(email, password);
      if (needsOnboarding(currentProfile())) paintOnboarding();
      else location.replace(next);
    } catch (ex) {
      show(err, readableError(ex));
      setBusy(false, form);
    }
  };
}

/* ─────────────────────────────────────────────────────────────
   ონბორდინგი — სახელი და ანგარიშის ტიპი
   ───────────────────────────────────────────────────────────── */

function paintOnboarding() {
  const p = currentProfile();

  host.innerHTML = `
    <div class="auth-card">
      <a class="auth-logo" href="/">თბილისი <span>LIVE</span></a>
      <p class="auth-lede">კიდევ ორი წამი — და დავიწყოთ.</p>

      <form class="auth-form" id="onb" novalidate>
        <label class="auth-field">
          <span>სახელი, რომელიც ეკრანზე გამოჩნდება</span>
          <input class="input" name="display_name" maxlength="60" required
                 value="${esc(p?.display_name ?? '')}" placeholder="გიორგი პაპინაშვილი">
        </label>

        <label class="auth-field">
          <span>მომხმარებლის სახელი</span>
          <span class="auth-at">
            <i>@</i>
            <input class="input" name="username" maxlength="30" required
                   autocapitalize="off" autocorrect="off" spellcheck="false"
                   value="${esc(p?.username ?? '')}" placeholder="gio">
          </span>
          <small class="auth-hint" data-uname>პატარა ლათინური ასოები, ციფრები, წერტილი და ქვედა ტირე</small>
        </label>

        <fieldset class="auth-kinds">
          <legend>ანგარიშის ტიპი</legend>

          <label class="auth-kind">
            <input type="radio" name="kind" value="personal" checked>
            <span class="auth-kind-box">
              <b>ჩვეულებრივი</b>
              <small>ვეძებ, ვიწონებ, ვდებ პოსტებს</small>
            </span>
          </label>

          <label class="auth-kind">
            <input type="radio" name="kind" value="business">
            <span class="auth-kind-box">
              <b>ბიზნესი</b>
              <small>მაქვს ადგილი — მენიუ, ფასები, აქციები</small>
            </span>
          </label>
        </fieldset>

        <p class="auth-err" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">დაწყება</button>
      </form>
    </div>`;

  const form = host.querySelector('#onb');
  const err = host.querySelector('.auth-err');
  const uname = form.querySelector('input[name="username"]');
  const hint = form.querySelector('[data-uname]');

  // სახელის შემოწმება წერისას — რეგისტრაციის ბოლოს გაკვირვება არ უნდა იყოს
  let timer;
  uname.addEventListener('input', () => {
    uname.value = uname.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    clearTimeout(timer);
    hint.className = 'auth-hint';
    hint.textContent = 'ვამოწმებ…';
    timer = setTimeout(async () => {
      const v = uname.value;
      if (v.length < 3) {
        hint.className = 'auth-hint bad';
        hint.textContent = 'მინიმუმ 3 სიმბოლო';
        return;
      }
      const free = await isFree(v);
      hint.className = `auth-hint ${free ? 'good' : 'bad'}`;
      hint.textContent = free ? '✓ თავისუფალია' : 'დაკავებულია — სხვა სცადე';
    }, 350);
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    const fd = new FormData(form);
    const username = String(fd.get('username') ?? '').toLowerCase();
    const display = String(fd.get('display_name') ?? '').trim();

    if (username.length < 3) return show(err, 'მომხმარებლის სახელი მინიმუმ 3 სიმბოლო');
    if (!display) return show(err, 'სახელი აუცილებელია');

    setBusy(true, form);
    try {
      await updateProfile({
        username,
        display_name: display,
        kind: String(fd.get('kind') ?? 'personal'),
        onboarded: true,
      });
      location.replace(next);
    } catch (ex) {
      show(err, readableError(ex));
      setBusy(false, form);
    }
  };
}

async function isFree(username) {
  try {
    const me = currentUser();
    const sb = await supa();
    const { data } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
    return !data || data.id === me?.id;
  } catch { return true; }     // შემოწმება ჩავარდა — ბაზა ისედაც არ დაუშვებს დუბლს
}

/* ─────────────────────────────────────────────────────────────
   წვრილმანი
   ───────────────────────────────────────────────────────────── */

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
