/**
 * მოქმედი სახე — ვისი სახელით ვმოქმედებ ახლა.
 *
 * ერთი ადამიანი, რამდენიმე სახე: თავად, თავისი გვერდები, თავისი
 * ჯგუფები. პოსტი, კომენტარი, მოწონება და შეტყობინება იმ სახეს
 * მიეწერება, რომელიც ამ წუთში აქტიურია.
 *
 * არჩევანი localStorage-შია, არა სერვერზე — ტელეფონზე შეიძლება
 * პირადად წერდე, კომპიუტერზე კი გვერდის სახელით. სესია საერთოა,
 * სახე კი მოწყობილობის საქმეა.
 *
 * უფლებას ბრაუზერი არ წყვეტს: ბაზა ყოველ ჩანაწერზე ამოწმებს,
 * ნამდვილად შეგიძლია თუ არა ამ სახით მოქმედება.
 */

import { supa, currentUser, currentProfile, onUser } from './supabase.js';

const KEY = 'tl.actor';

let actors = [];          // ყველა სახე, რომლითაც შემიძლია მოქმედება
let activeId = null;
let loaded;
const listeners = new Set();

/* ─────────────────────────────────────────────────────────── */

/** ყველა ჩემი სახე. პირველი ყოველთვის ადამიანია. */
export function loadActors({ force = false } = {}) {
  if (force) loaded = null;
  loaded ??= (async () => {
    const me = currentUser();
    if (!me) { actors = []; activeId = null; return actors; }

    const sb = await supa();
    const { data, error } = await sb.rpc('my_actors');
    if (error) {
      console.warn('[actor]', error.message);
      const self = currentProfile();
      actors = self ? [self] : [];
    } else {
      actors = data ?? [];
    }

    // შენახული არჩევანი მხოლოდ მაშინ, თუ ჯერ კიდევ ჩემია —
    // გვერდი შეიძლება წაშლილიყო ან ადმინობა ჩამორთმეოდა
    const saved = read();
    activeId = actors.some((a) => a.id === saved) ? saved : me.id;

    emit();
    return actors;
  })();
  return loaded;
}

export const allActors = () => actors;
export const activeId_ = () => activeId;

/** ვისი სახელით ვმოქმედებ. ჩატვირთვამდე — ჩემი პირადი. */
export function actorId() {
  return activeId ?? currentUser()?.id ?? null;
}

export function activeActor() {
  return actors.find((a) => a.id === actorId()) ?? currentProfile() ?? null;
}

/** გადართვა. აბრუნებს ახალ სახეს, ან null თუ არჩევანი უვარგისია. */
export function switchTo(id) {
  const found = actors.find((a) => a.id === id);
  if (!found) return null;
  activeId = id;
  try { localStorage.setItem(KEY, id); } catch { /* private რეჟიმი */ }
  emit();
  return found;
}

/** ჩემს პირად სახეზე დაბრუნება */
export function switchToSelf() {
  const me = currentUser();
  return me ? switchTo(me.id) : null;
}

export const isPage = (a = activeActor()) => a?.kind === 'page';
export const isGroup = (a = activeActor()) => a?.kind === 'group';
export const isSelf = (a = activeActor()) => a?.kind === 'person';

/* ─────────────────────────────────────────────────────────── */

/** ახალი გვერდი. სახელი და გვარი არ სჭირდება — ის ხომ ადამიანი არაა. */
export async function createPage({ name, username = null, category = null }) {
  const sb = await supa();
  const { data, error } = await sb.rpc('create_page', {
    p_name: String(name ?? '').trim(),
    p_username: username || null,
    p_category: category || null,
    p_kind: 'page',
  });
  if (error) throw new Error(error.message);
  await loadActors({ force: true });
  return data;
}

/** ახალი ჯგუფი */
export async function createGroup({ name, username = null, category = null }) {
  const sb = await supa();
  const { data, error } = await sb.rpc('create_page', {
    p_name: String(name ?? '').trim(),
    p_username: username || null,
    p_category: category || null,
    p_kind: 'group',
  });
  if (error) throw new Error(error.message);
  await loadActors({ force: true });
  return data;
}

/* ─────────────────────────────────────────────────────────── */

export function onActor(fn) {
  listeners.add(fn);
  loadActors().then(() => fn(activeActor(), actors));
  return () => listeners.delete(fn);
}

function emit() {
  const a = activeActor();
  listeners.forEach((fn) => { try { fn(a, actors); } catch { /* ერთის შეცდომა სხვას არ ჩერდება */ } });
}

function read() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

// შესვლა-გამოსვლისას სია თავიდან იკითხება
onUser((user) => {
  if (!user) {
    actors = []; activeId = null; loaded = null;
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    emit();
  } else {
    loadActors({ force: true });
  }
});
