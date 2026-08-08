/**
 * პოსტის დადება.
 *
 *   ┌────────────────────────────────────┐
 *   │ [ავატარი] ვისი სახელით ▾      ✕    │
 *   ├────────────────────────────────────┤
 *   │ რას ფიქრობ?                        │
 *   │ @მონიშვნა  #ჰეშთეგი                │
 *   ├────────────────────────────────────┤
 *   │ [ფოტო] [ფოტო] [+]                  │
 *   ├────────────────────────────────────┤
 *   │ 📷 ფოტო   📍 ადგილი      [დადება]  │
 *   └────────────────────────────────────┘
 *
 * ფოტო ატვირთვამდე ბრაუზერშივე მცირდება — 6 მბ ხდება ~250 კბ.
 * ეს მოხერხებულობა არაა: უფასო საცავი სხვაგვარად კვირაში
 * ამოიწურებოდა.
 */

import { el, esc, attr, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { createPost, mentionable } from '../lib/posts.js';
import { checkFile, isVideo, LIMITS } from '../lib/media.js';
import { loadActors, allActors, activeActor, switchTo, actorId } from '../lib/actor.js';
import { readableError } from '../lib/supabase.js';

let host;
let files = [];        // { file, url, kind }
let busy = false;
let onDone = null;

export async function openComposer(options = {}) {
  onDone = options.onDone ?? null;
  files = [];
  busy = false;

  host ??= document.body.appendChild(el('div', { class: 'cmp', hidden: true }));
  host.hidden = false;
  requestAnimationFrame(() => { host.dataset.open = 'true'; });
  document.body.style.overflow = 'hidden';

  await loadActors();
  paint(options);
  bind();
  setTimeout(() => host.querySelector('.cmp-text')?.focus(), 150);
}

/* ─────────────────────────────────────────────────────────── */

function paint({ placeName = '', businessSlug = null } = {}) {
  const who = activeActor();
  const many = allActors().length > 1;

  host.innerHTML = `
    <div class="cmp-backdrop" data-close></div>

    <div class="cmp-panel" role="dialog" aria-modal="true" aria-label="ახალი პოსტი">
      <header class="cmp-head">
        <button class="cmp-x" type="button" data-close aria-label="დახურვა">
          ${icon('close', { size: 20 })}
        </button>
        <strong>ახალი პოსტი</strong>
        <button class="btn btn-primary btn-sm cmp-send" type="button" data-send>დადება</button>
      </header>

      <div class="cmp-as">
        <button class="actor-btn" type="button" data-switch ${many ? '' : 'disabled'}>
          <span class="actor-face">${faceOf(who)}</span>
          <span>${esc(who?.display_name ?? '')}</span>
          ${many ? icon('chevron', { size: 14 }) : ''}
        </button>
        ${many ? '<span class="cmp-as-hint">ვისი სახელით</span>' : ''}
      </div>

      <div class="cmp-body">
        <textarea class="cmp-text" maxlength="2200"
                  placeholder="რას ფიქრობ? @ვინმეს მონიშნავ, #თეგს დაწერ…"></textarea>
        <div class="cmp-count"><span data-count>0</span>/2200</div>

        ${placeName ? `
          <div class="cmp-place">${icon('pin', { size: 14 })} ${esc(placeName)}</div>` : ''}

        <div class="cmp-files" data-files hidden></div>
      </div>

      <div class="cmp-bar">
        <button class="cmp-tool" type="button" data-pick>
          ${icon('image', { size: 20 })} ფოტო / ვიდეო
        </button>
        <span class="cmp-limit">მაქს. ${LIMITS.perPost}</span>
      </div>

      <div class="cmp-progress" hidden><div class="cmp-progress-fill"></div></div>

      <input type="file" data-input hidden multiple
             accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime">
    </div>

    <div class="mention-pop" data-mentions hidden></div>`;

  host.dataset.place = placeName ?? '';
  host.dataset.slug = businessSlug ?? '';
}

const faceOf = (a) => (a?.avatar_url
  ? `<img src="${attr(a.avatar_url)}" alt="">`
  : esc((a?.display_name ?? '?').trim().charAt(0) || '?'));

/* ─────────────────────────────────────────────────────────── */

function bind() {
  const text = host.querySelector('.cmp-text');
  const input = host.querySelector('[data-input]');
  const count = host.querySelector('[data-count]');

  host.onclick = async (e) => {
    if (e.target.closest('[data-close]')) return close();
    if (e.target.closest('[data-pick]')) return input.click();
    if (e.target.closest('[data-switch]')) return openSwitcher();
    if (e.target.closest('[data-send]')) return send();

    const rm = e.target.closest('[data-rm]');
    if (rm) {
      const i = Number(rm.dataset.rm);
      URL.revokeObjectURL(files[i]?.url);
      files.splice(i, 1);
      paintFiles();
    }
  };

  input.onchange = () => { addFiles([...input.files]); input.value = ''; };

  // გადათრევა — მაუსით უფრო ბუნებრივია, ვიდრე ღილაკზე დაჭერა
  const panel = host.querySelector('.cmp-panel');
  panel.ondragover = (e) => { e.preventDefault(); panel.classList.add('drop'); };
  panel.ondragleave = () => panel.classList.remove('drop');
  panel.ondrop = (e) => {
    e.preventDefault();
    panel.classList.remove('drop');
    addFiles([...e.dataTransfer.files]);
  };

  // ჩასმა ბუფერიდან — ეკრანის ანაბეჭდი პირდაპირ პოსტში
  text.onpaste = (e) => {
    const imgs = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (imgs.length) { e.preventDefault(); addFiles(imgs); }
  };

  text.oninput = () => {
    count.textContent = String(text.value.length);
    autoGrow(text);
    suggestMention(text);
  };

  text.onkeydown = (e) => {
    const pop = host.querySelector('[data-mentions]');
    if (pop.hidden) {
      // Ctrl+Enter — გამოქვეყნება კლავიატურიდან
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); send(); }
      return;
    }
    const rows = [...pop.querySelectorAll('.mention-row')];
    const cur = rows.findIndex((r) => r.getAttribute('aria-selected') === 'true');

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = e.key === 'ArrowDown'
        ? Math.min(cur + 1, rows.length - 1)
        : Math.max(cur - 1, 0);
      rows.forEach((r, i) => r.setAttribute('aria-selected', String(i === nextIdx)));
      rows[nextIdx]?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      rows[Math.max(cur, 0)]?.click();
      return;
    }
    if (e.key === 'Escape') { pop.hidden = true; }
  };

  document.addEventListener('keydown', function esc_(ev) {
    if (ev.key === 'Escape' && !host.hidden && host.querySelector('[data-mentions]').hidden) {
      close();
      document.removeEventListener('keydown', esc_);
    }
  });
}

function autoGrow(node) {
  node.style.height = 'auto';
  node.style.height = `${Math.min(node.scrollHeight, 260)}px`;
}

/* ─── ფაილები ──────────────────────────────────────────────── */

function addFiles(list) {
  for (const file of list) {
    if (files.length >= LIMITS.perPost) {
      toast(`მაქსიმუმ ${LIMITS.perPost} ფაილი`, 'error');
      break;
    }
    const bad = checkFile(file);
    if (bad) { toast(bad, 'error'); continue; }
    files.push({ file, url: URL.createObjectURL(file), kind: isVideo(file) ? 'video' : 'image' });
  }
  paintFiles();
}

function paintFiles() {
  const box = host.querySelector('[data-files]');
  box.hidden = !files.length;
  box.innerHTML = files.map((f, i) => `
    <div class="cmp-file">
      ${f.kind === 'video'
    ? `<video src="${attr(f.url)}" muted playsinline></video>
       <span class="cmp-play">${icon('plane', { size: 14 })}</span>`
    : `<img src="${attr(f.url)}" alt="">`}
      <button class="cmp-rm" type="button" data-rm="${i}" aria-label="მოშორება">
        ${icon('close', { size: 13 })}
      </button>
    </div>`).join('');
}

/* ─── @ მონიშვნა ───────────────────────────────────────────── */

let mentionTimer;

/**
 * კურსორამდე ბოლო `@სიტყვა` ვეძებთ.
 *
 * სია სახელით და გვარით იძებნება, ტექსტში კი ნიკი ჩაჯდება —
 * ადამიანი სახელს ხედავს, სისტემა ნიკს იყენებს. სწორედ ამიტომაა
 * ნიკი ყველას, თუნდაც არ აერჩია.
 */
function suggestMention(text) {
  const pop = host.querySelector('[data-mentions]');
  const upto = text.value.slice(0, text.selectionStart);
  const m = upto.match(/@([^\s@#]{0,30})$/);

  clearTimeout(mentionTimer);
  if (!m) { pop.hidden = true; return; }

  const term = m[1];
  mentionTimer = setTimeout(async () => {
    const list = await mentionable(term, 8);
    if (!list.length) { pop.hidden = true; return; }

    pop.innerHTML = list.map((p, i) => `
      <button class="mention-row" type="button" aria-selected="${i === 0}"
              data-pick-mention="${attr(p.username ?? '')}">
        <span class="actor-face">${faceOf(p)}</span>
        <span>
          <b>${esc(p.display_name ?? '')}</b>
          <small>@${esc(p.username ?? '')}</small>
        </span>
        ${p.kind !== 'person' ? `<span class="mention-kind">${p.kind === 'group' ? 'ჯგუფი' : 'გვერდი'}</span>` : ''}
      </button>`).join('');

    pop.hidden = false;
    placePop(pop, text);

    pop.querySelectorAll('[data-pick-mention]').forEach((btn) => {
      btn.onclick = () => {
        const handle = btn.dataset.pickMention;
        const before = text.value.slice(0, text.selectionStart).replace(/@[^\s@#]{0,30}$/, `@${handle} `);
        const after = text.value.slice(text.selectionStart);
        text.value = before + after;
        text.selectionStart = text.selectionEnd = before.length;
        pop.hidden = true;
        text.focus();
        host.querySelector('[data-count]').textContent = String(text.value.length);
      };
    });
  }, 200);
}

function placePop(pop, text) {
  const r = text.getBoundingClientRect();
  pop.style.left = `${r.left}px`;
  pop.style.top = `${Math.min(r.bottom + 4, window.innerHeight - 260)}px`;
}

/* ─── სახის გადართვა ───────────────────────────────────────── */

function openSwitcher() {
  const list = allActors();
  if (list.length < 2) return;

  const btn = host.querySelector('[data-switch]');
  const menu = el('div', { class: 'actor-menu' });
  const r = btn.getBoundingClientRect();
  menu.style.left = `${r.left}px`;
  menu.style.top = `${r.bottom + 6}px`;

  menu.innerHTML = list.map((a) => `
    <button class="actor-item" type="button" data-actor="${attr(a.id)}"
            aria-current="${a.id === actorId()}">
      <span class="actor-face">${faceOf(a)}</span>
      <span>
        <b>${esc(a.display_name)}</b>
        <small>${a.kind === 'person' ? 'შენ' : a.kind === 'group' ? 'ჯგუფი' : 'გვერდი'}</small>
      </span>
    </button>`).join('');

  document.body.appendChild(menu);

  const shut = (e) => {
    const pick = e.target.closest('[data-actor]');
    if (pick) {
      switchTo(pick.dataset.actor);
      const who = activeActor();
      btn.querySelector('.actor-face').innerHTML = faceOf(who);
      btn.querySelector('span:nth-child(2)').textContent = who?.display_name ?? '';
    }
    menu.remove();
    document.removeEventListener('click', shut, true);
  };
  setTimeout(() => document.addEventListener('click', shut, true), 0);
}

/* ─── გამოქვეყნება ─────────────────────────────────────────── */

async function send() {
  if (busy) return;

  const text = host.querySelector('.cmp-text').value;
  if (!text.trim() && !files.length) {
    toast('დაწერე რამე ან დაამატე ფოტო', 'error');
    return;
  }

  busy = true;
  const btn = host.querySelector('[data-send]');
  const bar = host.querySelector('.cmp-progress');
  const fill = host.querySelector('.cmp-progress-fill');
  btn.disabled = true;
  btn.textContent = 'იტვირთება…';
  bar.hidden = false;

  try {
    const id = await createPost({
      body: text,
      files: files.map((f) => f.file),
      placeName: host.dataset.place || '',
      businessSlug: host.dataset.slug || null,
      onProgress: (p) => { fill.style.width = `${Math.round(p * 100)}%`; },
    });

    toast('გამოქვეყნდა');
    close();
    onDone?.(id);
    document.dispatchEvent(new CustomEvent('tl:post', { detail: { id } }));
  } catch (err) {
    toast(readableError(err), 'error');
    busy = false;
    btn.disabled = false;
    btn.textContent = 'დადება';
    bar.hidden = true;
  }
}

function close() {
  files.forEach((f) => URL.revokeObjectURL(f.url));
  files = [];
  host.dataset.open = 'false';
  document.body.style.overflow = '';
  setTimeout(() => { host.hidden = true; }, 240);
}
