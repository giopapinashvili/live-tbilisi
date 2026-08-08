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

// სტილები. ეს გვერდი განზრახ არ იძახებს boot()-ს — მას ჰედერი
// და ტაბები არ სჭირდება — მაგრამ CSS სწორედ იქიდან შემოდიოდა.
// ერთხელ უკვე გამომრჩა და გვერდი შიშველი აიწყო.
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/app.css';

import { esc, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { currentTheme, setTheme } from '../lib/theme.js';
import { HAS_BACKEND } from '../lib/config.js';
import {
  whenAuthReady, currentUser, signInWithEmail, signUpWithEmail,
  resetPassword, readableError, supa,
} from '../lib/supabase.js';

setTheme(currentTheme(), { persist: false });

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
            <span>გაიმეორე პაროლი</span>
            <input class="input" type="password" name="password2" required
                   autocomplete="new-password" placeholder="ისევ იგივე">
          </label>

          <div class="pw-rules" data-rules hidden>
            <span data-rule="len">8 სიმბოლო</span>
            <span data-rule="up">დიდი ასო</span>
            <span data-rule="num">ციფრი</span>
            <span data-rule="same">ემთხვევა</span>
          </div>

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

  // პაროლის წესები წერისასვე ინთება. ბოლოს „არ ვარგა" და
  // თავიდან დაწყება ყველაზე გამაღიზიანებელია რეგისტრაციაში.
  const pw = form.querySelector('input[name="password"]');
  const pw2 = form.querySelector('input[name="password2"]');
  const rules = form.querySelector('[data-rules]');
  const recheck = () => {
    if (!rules) return;
    rules.hidden = false;
    const v = pw.value;
    const ok = checkPassword(v, pw2?.value ?? '');
    for (const [key, good] of Object.entries(ok)) {
      rules.querySelector(`[data-rule="${key}"]`)?.classList.toggle('ok', good);
    }
  };
  pw?.addEventListener('input', recheck);
  pw2?.addEventListener('input', recheck);

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

    if (mode === 'in' && password.length < 6) {
      return show(err, 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');
    }

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
    const password2 = String(fd.get('password2') ?? '');

    const ok = checkPassword(password, password2);
    if (!ok.len)  return show(err, 'პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს');
    if (!ok.up)   return show(err, 'პაროლში დიდი ასო უნდა იყოს');
    if (!ok.num)  return show(err, 'პაროლში ციფრი უნდა იყოს');
    if (!ok.same) return show(err, 'პაროლები არ ემთხვევა');

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

/**
 * პაროლის სიმტკიცე.
 *
 * დიდ ასოს კონკრეტულად პირველ სიმბოლოზე არ ვითხოვთ — ეს არაფერს
 * მატებს დაცვას და მხოლოდ აღიზიანებს. მნიშვნელოვანია, რომ დიდი
 * ასო და ციფრი საერთოდ იყოს: სწორედ ეს ზრდის ვარიანტების რიცხვს.
 */
function checkPassword(a, b) {
  return {
    len:  a.length >= 8,
    up:   /[A-ZА-ЯЁ]/.test(a),
    num:  /[0-9]/.test(a),
    same: a.length > 0 && a === b,
  };
}

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
