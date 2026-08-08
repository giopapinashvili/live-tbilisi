/**
 * პროფილის რედაქტირება და ხალხის სიები.
 *
 * ორივე ერთ ფაილშია, რადგან ერთი და იგივე ფურცელია — მხოლოდ
 * შიგთავსი იცვლება. ცალკე რომ დაგვეწერა, ორივეგან იგივე
 * გახსნა-დახურვა-Escape ლოგიკა გამეორდებოდა.
 */

import { el, esc, attr, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { supa, currentUser, currentProfile, updateProfile, readableError } from '../lib/supabase.js';
import { toggleFollow } from '../lib/posts.js';

let sheet;

/* ─────────────────────────────────────────────────────────── */

function open(title, body) {
  sheet ??= document.body.appendChild(el('div', { class: 'sh', hidden: true }));
  sheet.hidden = false;
  requestAnimationFrame(() => { sheet.dataset.open = 'true'; });
  document.body.style.overflow = 'hidden';

  sheet.innerHTML = `
    <div class="sh-backdrop" data-shclose></div>
    <div class="sh-panel" role="dialog" aria-modal="true" aria-label="${attr(title)}">
      <header class="sh-head">
        <button class="sh-x" type="button" data-shclose aria-label="დახურვა">
          ${icon('close', { size: 20 })}
        </button>
        <strong>${esc(title)}</strong>
      </header>
      <div class="sh-body">${body}</div>
    </div>`;

  sheet.onclick = (e) => { if (e.target.closest('[data-shclose]')) close(); };
  document.addEventListener('keydown', function esc_(ev) {
    if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', esc_); }
  });

  return sheet;
}

function close() {
  if (!sheet) return;
  sheet.dataset.open = 'false';
  document.body.style.overflow = '';
  setTimeout(() => { sheet.hidden = true; }, 240);
}

/* ═══ რედაქტირება ═══════════════════════════════════════════ */

/**
 * @param {object} who რომელ პროფილს ვასწორებთ (შეიძლება გვერდიც იყოს)
 * @param {Function} onSaved შენახვის შემდეგ
 */
export function openProfileEdit(who, onSaved) {
  const isPerson = who.kind === 'person';

  open('რედაქტირება', `
    <form id="pe" novalidate>
      <label class="auth-field">
        <span>სახელი, რომელიც ჩანს</span>
        <input class="input" name="display_name" maxlength="60" required
               value="${attr(who.display_name ?? '')}">
      </label>

      ${isPerson ? `
        <div class="auth-row">
          <label class="auth-field">
            <span>სახელი</span>
            <input class="input" name="first_name" maxlength="40" value="${attr(who.first_name ?? '')}">
          </label>
          <label class="auth-field">
            <span>გვარი</span>
            <input class="input" name="last_name" maxlength="40" value="${attr(who.last_name ?? '')}">
          </label>
        </div>` : `
        <label class="auth-field">
          <span>მეორე სახელი <i class="auth-opt">ძებნისთვის, არსად არ ჩანს</i></span>
          <input class="input" name="alt_name" maxlength="80" value="${attr(who.alt_name ?? '')}">
        </label>`}

      <label class="auth-field">
        <span>ნიკი</span>
        <span class="auth-at">
          <i>@</i>
          <input class="input" name="username" maxlength="30"
                 autocapitalize="off" spellcheck="false"
                 value="${attr(who.username ?? '')}">
        </span>
        <small class="auth-hint" data-uhint>პატარა ლათინური ასოები, ციფრები, წერტილი და ქვედა ტირე</small>
      </label>

      <label class="auth-field">
        <span>ბიო</span>
        <textarea class="textarea" name="bio" maxlength="300" rows="3"
                  placeholder="ორი წინადადება შენზე. @მონიშვნა და #თეგი აქაც მუშაობს.">${esc(who.bio ?? '')}</textarea>
        <small class="auth-hint"><span data-biolen>${(who.bio ?? '').length}</span>/300</small>
      </label>

      <label class="auth-field">
        <span>ვებგვერდი</span>
        <input class="input" name="website" maxlength="120" inputmode="url"
               value="${attr(who.website ?? '')}" placeholder="example.ge">
      </label>

      ${isPerson ? `
        <label class="cp-check">
          <input type="checkbox" name="is_private" ${who.is_private ? 'checked' : ''}>
          <span>
            <b>დახურული პროფილი</b>
            <small>პოსტებს მხოლოდ გამომწერები ნახავენ</small>
          </span>
        </label>` : ''}

      <p class="auth-err" hidden></p>

      <div class="sh-actions">
        <button class="btn btn-primary btn-lg" type="submit">შენახვა</button>
        <button class="btn btn-lg" type="button" data-shclose>გაუქმება</button>
      </div>
    </form>`);

  const form = sheet.querySelector('#pe');
  const err = sheet.querySelector('.auth-err');
  const uname = form.querySelector('[name="username"]');
  const uhint = form.querySelector('[data-uhint]');
  const bio = form.querySelector('[name="bio"]');

  bio.addEventListener('input', () => {
    form.querySelector('[data-biolen]').textContent = String(bio.value.length);
  });

  // ნიკის შემოწმება წერისასვე — შენახვაზე გაკვირვება არ უნდა იყოს
  let t;
  uname.addEventListener('input', () => {
    uname.value = uname.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    clearTimeout(t);
    if (uname.value === (who.username ?? '')) {
      uhint.className = 'auth-hint';
      uhint.textContent = 'შენი ახლანდელი ნიკი';
      return;
    }
    if (uname.value.length < 3) {
      uhint.className = 'auth-hint bad';
      uhint.textContent = 'მინიმუმ 3 სიმბოლო';
      return;
    }
    uhint.textContent = 'ვამოწმებ…';
    t = setTimeout(async () => {
      const free = await handleFree(uname.value, who.id);
      uhint.className = `auth-hint ${free ? 'good' : 'bad'}`;
      uhint.textContent = free ? '✓ თავისუფალია' : 'დაკავებულია';
    }, 350);
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);

    const display = String(fd.get('display_name') ?? '').trim();
    const handle = String(fd.get('username') ?? '').trim().toLowerCase();
    if (!display) return fail(err, 'სახელი აუცილებელია');
    if (handle && handle.length < 3) return fail(err, 'ნიკი მინიმუმ 3 სიმბოლო');

    const patch = {
      display_name: display,
      bio: String(fd.get('bio') ?? '').trim() || null,
      website: normalUrl(String(fd.get('website') ?? '')),
    };
    if (handle) patch.username = handle;
    if (isPerson) {
      patch.first_name = String(fd.get('first_name') ?? '').trim() || null;
      patch.last_name = String(fd.get('last_name') ?? '').trim() || null;
      patch.is_private = Boolean(fd.get('is_private'));
    } else {
      patch.alt_name = String(fd.get('alt_name') ?? '').trim() || null;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'ვინახავ…';

    try {
      // id ცხადად გადაეცემა — ორი გზა ერთი საქმისთვის ზედმეტია
      // და ერთგან აუცილებლად შეგვეშლებოდა
      await updateProfile(patch, who.id);
      toast('შენახულია');
      close();
      onSaved?.();
    } catch (ex) {
      fail(err, readableError(ex));
      btn.disabled = false;
      btn.textContent = 'შენახვა';
    }
  };
}

async function handleFree(handle, selfId) {
  try {
    const sb = await supa();
    const { data } = await sb.from('profiles').select('id').eq('username', handle).maybeSingle();
    return !data || data.id === selfId;
  } catch { return true; }
}

/** „example.ge" → „https://example.ge". ცარიელი რჩება null. */
function normalUrl(v) {
  const s = v.trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function fail(node, text) {
  node.textContent = text;
  node.hidden = false;
}

/* ═══ ხალხის სია ════════════════════════════════════════════ */

/**
 * გამომწერები ან გამოწერილები.
 * @param {'followers'|'following'} mode
 */
export async function openPeople(profileId, mode) {
  const title = mode === 'followers' ? 'გამომწერები' : 'გამოწერილები';
  open(title, '<div class="skel skel-line"></div>');

  const body = sheet.querySelector('.sh-body');
  const sb = await supa();

  const col = mode === 'followers' ? 'follower_id' : 'followee_id';
  const match = mode === 'followers' ? 'followee_id' : 'follower_id';
  const rel = mode === 'followers'
    ? 'profiles!follows_follower_id_fkey'
    : 'profiles!follows_followee_id_fkey';

  const { data, error } = await sb.from('follows')
    .select(`p:${rel} ( id, username, display_name, avatar_url, kind, verified )`)
    .eq(match, profileId)
    .limit(100);

  if (error) {
    body.innerHTML = `<p class="dim">სია ვერ ჩაიტვირთა: ${esc(error.message)}</p>`;
    return;
  }

  const list = (data ?? []).map((r) => r.p).filter(Boolean);
  if (!list.length) {
    body.innerHTML = `<p class="dim" style="text-align:center; padding:var(--sp-6) 0">
      ${mode === 'followers' ? 'გამომწერი ჯერ არ არის.' : 'ჯერ არავინ გამოგიწერია.'}
    </p>`;
    return;
  }

  const me = currentUser()?.id;
  body.innerHTML = list.map((p) => `
    <div class="prow">
      <a class="actor-face" href="/profile.html?u=${encodeURIComponent(p.username ?? '')}">
        ${p.avatar_url ? `<img src="${attr(p.avatar_url)}" alt="">`
    : esc((p.display_name ?? '?').charAt(0))}
      </a>
      <a class="prow-who" href="/profile.html?u=${encodeURIComponent(p.username ?? '')}">
        <b>${esc(p.display_name ?? '')}</b>
        <small>@${esc(p.username ?? '')}</small>
      </a>
      ${p.id !== me ? `
        <button class="btn btn-sm btn-primary" type="button"
                data-follow="${attr(p.id)}" data-on="false">გამოწერა</button>` : ''}
    </div>`).join('');

  body.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-follow]');
    if (!btn) return;
    const on = btn.dataset.on !== 'true';
    try {
      await toggleFollow(btn.dataset.follow, on);
      btn.dataset.on = String(on);
      btn.textContent = on ? 'გამოწერილი' : 'გამოწერა';
      btn.classList.toggle('btn-primary', !on);
    } catch (err) { toast(err.message, 'error'); }
  });

  // ვინ მყავს უკვე გამოწერილი — ღილაკები სწორად რომ დაიხატოს
  if (me) {
    const ids = list.map((p) => p.id);
    const { data: mine } = await sb.from('follows')
      .select('followee_id').eq('follower_id', me).in('followee_id', ids);
    for (const r of mine ?? []) {
      const btn = body.querySelector(`[data-follow="${CSS.escape(r.followee_id)}"]`);
      if (btn) {
        btn.dataset.on = 'true';
        btn.textContent = 'გამოწერილი';
        btn.classList.remove('btn-primary');
      }
    }
  }
}

export { close as closeSheet, currentProfile };
