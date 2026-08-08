/**
 * ახალი გვერდი ან ჯგუფი.
 *
 * სამი რამ, რაც წინა ვერსიაში არასწორი იყო:
 *
 *   1. რუკაზე ადგილის მითითება სავალდებულო იყო. ონლაინ სერვისს
 *      ოფისი არ აქვს და არც სჭირდება — ეს ნორმაა, არა გამონაკლისი.
 *
 *   2. უბანს ხელით ირჩევდი. მისამართიდან ის ისედაც გამოდის;
 *      ზედმეტი კითხვა მხოლოდ შეცდომის საშუალებას იძლევა.
 *
 *   3. გვერდის დატოვებისას ყველაფერი ქრებოდა. ახლა ნაწერი
 *      ბრაუზერში ინახება და დაბრუნებისას ადგილზე დაგხვდება.
 *
 * კატეგორია სამია, ფეისბუქის მსგავსად. პირველი მთავარია — ის
 * განსაზღვრავს ფერს რუკაზე და ის ჩანს სათაურქვეშ.
 */

import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/app.css';

import { $, esc, attr, toast, delegate } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { currentTheme, setTheme } from '../lib/theme.js';
import { DISTRICTS } from '../data/taxonomy.js';
import {
  GROUPS, PAGE_CAT_MAP, inGroup, findCategories, mapCategoryOf, isOnlineOnly,
} from '../data/page-categories.js';
import { whenAuthReady, currentUser } from '../lib/supabase.js';
import { createPage, createGroup } from '../lib/actor.js';

setTheme(currentTheme(), { persist: false });

const root = $('#root');
const DRAFT = 'tl.page.draft';
const kind = new URLSearchParams(location.search).get('kind') === 'group' ? 'group' : 'page';

let picked = [];        // არჩეული კატეგორიების id-ები, მაქსიმუმ 3
let busy = false;

/* ─────────────────────────────────────────────────────────── */

(async () => {
  await whenAuthReady();

  if (!currentUser()) {
    location.replace(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
    return;
  }

  const d = readDraft();
  picked = Array.isArray(d.categories) ? d.categories.slice(0, 3) : [];
  paint(d);
})();

/* ─── მონახაზი ─────────────────────────────────────────────── */

function readDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT) ?? '{}'); } catch { return {}; }
}

/**
 * ყოველ ცვლილებაზე ვინახავთ. sessionStorage განზრახია და არა
 * localStorage: ჩანაწერი ამ ჩანართის სიცოცხლეს უნდა უკავშირდებოდეს,
 * თორემ თვის შემდეგაც მოძველებული მონახაზი გამოგვიხტება.
 */
function saveDraft() {
  const f = $('#pf');
  if (!f) return;
  const data = Object.fromEntries(new FormData(f).entries());
  data.categories = picked;
  try { sessionStorage.setItem(DRAFT, JSON.stringify(data)); } catch { /* private რეჟიმი */ }
}

const clearDraft = () => { try { sessionStorage.removeItem(DRAFT); } catch { /* ignore */ } };

/* ─── ხატვა ────────────────────────────────────────────────── */

function paint(d = {}) {
  const isGroup = kind === 'group';

  root.innerHTML = `
    <header class="cp-head">
      <a class="btn btn-sm" href="/dashboard.html">${icon('back', { size: 15 })} უკან</a>
      <h1>${isGroup ? 'ახალი ჯგუფი' : 'ახალი გვერდი'}</h1>
    </header>

    <p class="cp-lede">
      ${isGroup
    ? 'ჯგუფში სხვადასხვა გვერდის სიახლეები ერთად ჩანს.'
    : 'გვერდს სახელი და გვარი არ სჭირდება — ის ხომ ადამიანი არაა.'}
      ნაწერი ავტომატურად ინახება, დაკარგვის შიში არ გქონდეს.
    </p>

    <form id="pf" novalidate>
      <section class="cp-block">
        <h2>სახელი</h2>

        <label class="auth-field">
          <span>ქართულად</span>
          <input class="input" name="name" maxlength="80" required
                 value="${attr(d.name ?? '')}" placeholder="ვებკრაფტ ჯორჯია">
        </label>

        <label class="auth-field">
          <span>ინგლისურად <i class="auth-opt">არასავალდებულო</i></span>
          <input class="input" name="name_en" maxlength="80"
                 value="${attr(d.name_en ?? '')}" placeholder="WebCraft Georgia">
        </label>

        <label class="auth-field">
          <span>ნიკი <i class="auth-opt">არასავალდებულო</i></span>
          <span class="auth-at">
            <i>@</i>
            <input class="input" name="username" maxlength="30"
                   autocapitalize="off" spellcheck="false"
                   value="${attr(d.username ?? '')}" placeholder="webcraft">
          </span>
          <small class="auth-hint">თუ ცარიელს დატოვებ, სახელიდან შევადგენთ</small>
        </label>
      </section>

      ${isGroup ? '' : `
      <section class="cp-block">
        <h2>რას საქმიანობთ</h2>
        <p class="cp-hint">
          აირჩიე <b>სამამდე</b> კატეგორია. პირველი მთავარია — ის ჩანს
          სათაურქვეშ. დანარჩენი ორი იმისთვისაა, რომ ძებნაში მეტმა გნახოს.
        </p>

        <div class="cp-picked" id="picked"></div>

        <div class="cp-search">
          ${icon('search', { size: 16 })}
          <input class="input" id="catq" placeholder="დაწერე: ვებ, ლოგო, კაფე, სანტექნიკა…"
                 autocomplete="off">
        </div>
        <div class="cp-results" id="catres" hidden></div>

        <details class="cp-browse">
          <summary>ან დაათვალიერე სიით</summary>
          <div class="cp-groups" id="groups"></div>
        </details>
      </section>

      <section class="cp-block">
        <h2>სად ხართ</h2>

        <label class="cp-check">
          <input type="checkbox" name="online" ${d.online ? 'checked' : ''}>
          <span>
            <b>ონლაინ ვმუშაობ, ფიზიკური ადგილი არ მაქვს</b>
            <small>რუკაზე არ გამოჩნდება, ძებნაში კი — დიახ</small>
          </span>
        </label>

        <div id="addrbox" ${d.online ? 'hidden' : ''}>
          <label class="auth-field">
            <span>მისამართი</span>
            <input class="input" name="address" maxlength="160"
                   value="${attr(d.address ?? '')}" placeholder="ქერჩის 12">
            <small class="auth-hint" data-guess>უბანს მისამართიდან თვითონ ვცნობთ</small>
          </label>
        </div>
      </section>`}

      <section class="cp-block">
        <h2>აღწერა <i class="auth-opt">არასავალდებულო</i></h2>
        <textarea class="textarea" name="bio" maxlength="300" rows="3"
                  placeholder="ერთი-ორი წინადადება — რას აკეთებ და ვისთვის.">${esc(d.bio ?? '')}</textarea>
      </section>

      <p class="auth-err" hidden></p>

      <div class="cp-actions">
        <button class="btn btn-primary btn-lg" type="submit">
          ${isGroup ? 'ჯგუფის შექმნა' : 'გვერდის შექმნა'}
        </button>
        <button class="btn btn-lg" type="button" data-reset>გასუფთავება</button>
      </div>
    </form>`;

  if (kind !== 'group') { paintPicked(); paintGroups(); }
  bind();
}

/* ─── კატეგორიები ──────────────────────────────────────────── */

function paintPicked() {
  const box = $('#picked');
  if (!box) return;

  if (!picked.length) {
    box.innerHTML = '<span class="cp-empty">ჯერ არაფერი აგირჩევია</span>';
    return;
  }

  box.innerHTML = picked.map((id, i) => {
    const c = PAGE_CAT_MAP[id];
    if (!c) return '';
    return `
      <span class="cp-chip${i === 0 ? ' main' : ''}">
        ${i === 0 ? '<i>მთავარი</i>' : ''}
        ${esc(c.ka)}
        <button type="button" data-unpick="${attr(id)}" aria-label="მოშორება">
          ${icon('close', { size: 12 })}
        </button>
      </span>`;
  }).join('');
}

function paintGroups() {
  const box = $('#groups');
  if (!box) return;
  box.innerHTML = GROUPS.map((g) => `
    <details class="cp-group">
      <summary>${icon(g.icon, { size: 15 })} ${esc(g.ka)}</summary>
      <div class="cp-list">
        ${inGroup(g.id).map((c) => `
          <button type="button" class="cp-opt" data-pick="${attr(c.id)}">
            ${esc(c.ka)}${c.online ? '<i>ონლაინ</i>' : ''}
          </button>`).join('')}
      </div>
    </details>`).join('');
}

function pick(id) {
  if (picked.includes(id)) return;
  if (picked.length >= 3) {
    toast('მაქსიმუმ სამი კატეგორია — ჯერ ერთი მოაშორე', 'error');
    return;
  }
  picked.push(id);
  paintPicked();
  saveDraft();
  syncOnlineHint();
}

function unpick(id) {
  picked = picked.filter((x) => x !== id);
  paintPicked();
  saveDraft();
  syncOnlineHint();
}

/** თუ ყველა არჩეული ონლაინია, მისამართს აღარ ვთხოვთ */
function syncOnlineHint() {
  const box = $('#addrbox');
  const cb = document.querySelector('input[name="online"]');
  if (!box || !cb || cb.checked) return;

  if (isOnlineOnly(picked)) {
    cb.checked = true;
    box.hidden = true;
    toast('ეს კატეგორია ონლაინია — მისამართი აღარ გვჭირდება');
  }
}

/* ─── მიბმა ────────────────────────────────────────────────── */

function bind() {
  const form = $('#pf');
  const err = root.querySelector('.auth-err');

  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

  // ველიდან გასვლისას — ბრაუზერის დახურვამდე ბოლო შანსი
  window.addEventListener('beforeunload', saveDraft);

  const q = $('#catq');
  const res = $('#catres');
  if (q) {
    q.addEventListener('input', () => {
      const list = findCategories(q.value, 10);
      if (!list.length) { res.hidden = true; return; }
      res.hidden = false;
      res.innerHTML = list.map((c) => `
        <button type="button" class="cp-opt" data-pick="${attr(c.id)}">
          ${esc(c.ka)}
          <small>${esc(GROUPS.find((g) => g.id === c.g)?.ka ?? '')}</small>
        </button>`).join('');
    });
  }

  const online = document.querySelector('input[name="online"]');
  online?.addEventListener('change', () => {
    const box = $('#addrbox');
    if (box) box.hidden = online.checked;
  });

  // უბანი მისამართიდან — ხელით არჩევა აღარ სჭირდება
  const addr = document.querySelector('input[name="address"]');
  addr?.addEventListener('input', () => {
    const hint = root.querySelector('[data-guess]');
    if (!hint) return;
    const d = guessDistrict(addr.value);
    hint.textContent = d
      ? `უბანი: ${d.ka}`
      : 'უბანს მისამართიდან თვითონ ვცნობთ';
    hint.className = `auth-hint${d ? ' good' : ''}`;
  });

  delegate(root, 'click', '[data-pick]', (e, b) => { e.preventDefault(); pick(b.dataset.pick); });
  delegate(root, 'click', '[data-unpick]', (e, b) => { e.preventDefault(); unpick(b.dataset.unpick); });

  delegate(root, 'click', '[data-reset]', () => {
    if (!confirm('ყველაფერი წაიშლება. გავაგრძელო?')) return;
    clearDraft();
    picked = [];
    paint({});
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;

    const fd = new FormData(form);
    const name = String(fd.get('name') ?? '').trim();
    if (!name) return show(err, 'სახელი აუცილებელია');

    if (kind === 'page' && !picked.length) {
      return show(err, 'აირჩიე მინიმუმ ერთი კატეგორია');
    }

    const isOnline = Boolean(fd.get('online')) || isOnlineOnly(picked);
    const address = String(fd.get('address') ?? '').trim();
    const district = isOnline ? null : (guessDistrict(address)?.id ?? null);

    busy = true;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'ვქმნი…';

    try {
      const make = kind === 'group' ? createGroup : createPage;
      const row = await make({
        name,
        nameEn: String(fd.get('name_en') ?? '').trim() || null,
        username: String(fd.get('username') ?? '').trim().toLowerCase() || null,
        category: mapCategoryOf(picked),
        categories: picked,
        bio: String(fd.get('bio') ?? '').trim() || null,
        address: isOnline ? null : (address || null),
        district,
        online: isOnline,
      });

      clearDraft();
      toast(kind === 'group' ? 'ჯგუფი შეიქმნა' : 'გვერდი შეიქმნა');
      location.href = row?.username ? `/profile.html?u=${encodeURIComponent(row.username)}` : '/dashboard.html';
    } catch (ex) {
      show(err, ex.message);
      busy = false;
      btn.disabled = false;
      btn.textContent = kind === 'group' ? 'ჯგუფის შექმნა' : 'გვერდის შექმნა';
    }
  });
}

/**
 * უბანი მისამართიდან.
 *
 * ჯერ მარტივად — უბნის სახელს ვეძებთ თვით ტექსტში. სრული
 * ამოცნობა კოორდინატებს და საზღვრებს მოითხოვს; ეს მოგვიანებით
 * დაემატება, როცა რუკაზე მონიშვნა გაჩნდება.
 */
function guessDistrict(address) {
  const a = String(address ?? '').toLowerCase();
  if (a.length < 3) return null;
  return DISTRICTS.find((d) => a.includes(d.ka.toLowerCase())) ?? null;
}

function show(node, text) {
  if (!node) return;
  node.textContent = text;
  node.hidden = false;
  node.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
