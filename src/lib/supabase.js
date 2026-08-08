/**
 * Supabase — შესვლა, ბაზა და ფოტოების საცავი.
 *
 * ერთი კლიენტი მთელ აპლიკაციაზე, ზარმაცი ჩატვირთვით: SDK მაშინ
 * ჩამოდის, როცა პირველად დასჭირდება, არა თითოეული გვერდის გახსნისას.
 *
 * აქ არის ორი ცნება და მათი აღრევა ხშირი შეცდომაა:
 *
 *   user    — auth.users-ის ჩანაწერი. ელფოსტა და პაროლი. სისტემური.
 *   profile — profiles-ის ჩანაწერი. სახელი, ავატარი, ბიო. ეს ჩანს ეკრანზე.
 *
 * პროფილი რეგისტრაციისთანავე იქმნება (ბაზის ტრიგერი), ამიტომ
 * შესული მომხმარებლისთვის ორივე ყოველთვის არსებობს.
 */

import { SUPABASE, HAS_BACKEND } from './config.js';

let clientPromise;

/** კლიენტი. პირველ გამოძახებაზე ჩამოტვირთავს SDK-ს. */
export async function supa() {
  if (!HAS_BACKEND) throw new Error('Supabase არ არის კონფიგურირებული (.env)');
  clientPromise ??= (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(SUPABASE.url, SUPABASE.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,   // Google-ით დაბრუნებისას
        storageKey: 'tl-auth',
      },
    });
  })();
  return clientPromise;
}

/* ─────────────────────────────────────────────────────────────
   სესია
   ───────────────────────────────────────────────────────────── */

let cachedUser = null;
let cachedProfile = null;
let ready;
const listeners = new Set();

function broadcast() {
  listeners.forEach((fn) => { try { fn(cachedUser, cachedProfile); } catch { /* ერთის შეცდომა სხვას არ ჩერდება */ } });
}

/**
 * სესიის მოცდა. ერთხელ ეშვება, შემდეგ იმავე დაპირებას აბრუნებს.
 * ბექენდის გარეშე null-ს აბრუნებს და აპლიკაცია სტუმრის რეჟიმში რჩება.
 */
export function whenAuthReady() {
  if (!HAS_BACKEND) return Promise.resolve(null);

  ready ??= (async () => {
    try {
      const sb = await supa();
      const { data } = await sb.auth.getSession();
      cachedUser = data.session?.user ?? null;
      if (cachedUser) cachedProfile = await fetchProfile(cachedUser.id);

      sb.auth.onAuthStateChange(async (_event, session) => {
        const next = session?.user ?? null;
        const changed = next?.id !== cachedUser?.id;
        cachedUser = next;
        if (changed) cachedProfile = next ? await fetchProfile(next.id) : null;
        broadcast();
      });

      return cachedUser;
    } catch (err) {
      console.warn('[auth] სესია ვერ წაიკითხა:', err.message);
      return null;
    }
  })();

  return ready;
}

/** გამოწერა. მაშინვე გამოიძახება მიმდინარე მდგომარეობით. */
export function onUser(fn) {
  listeners.add(fn);
  whenAuthReady().then(() => fn(cachedUser, cachedProfile));
  return () => listeners.delete(fn);
}

export const currentUser = () => cachedUser;
export const currentProfile = () => cachedProfile;
export const isSignedIn = () => Boolean(cachedUser);

/* ─────────────────────────────────────────────────────────────
   პროფილი
   ───────────────────────────────────────────────────────────── */

async function fetchProfile(id) {
  const sb = await supa();
  const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) { console.warn('[profile]', error.message); return null; }
  return data;
}

/** პროფილის ხელახლა წაკითხვა — რედაქტირების შემდეგ */
export async function refreshProfile() {
  if (!cachedUser) return null;
  cachedProfile = await fetchProfile(cachedUser.id);
  broadcast();
  return cachedProfile;
}

/**
 * პროფილის შეცვლა.
 *
 * ცვლის იმ სახეს, რომლითაც ამ წუთში ვმოქმედებ — არა ყოველთვის
 * ადამიანს. გვერდზე გადართული რომ იყო და ავატარი აგეტვირთა,
 * შენი პირადი ფოტო იცვლებოდა: სწორედ ეს ხარვეზი იყო.
 *
 * უფლებას ბაზა ამოწმებს: სხვის პროფილს can_act_as() ვერ გაატარებს.
 */
export async function updateProfile(patch, targetId = null) {
  if (!cachedUser) throw new Error('შესვლა საჭიროა');

  const { actorId } = await import('./actor.js');
  const id = targetId ?? actorId() ?? cachedUser.id;

  const sb = await supa();
  const { data, error } = await sb
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(readableError(error));

  // ქეშს მხოლოდ მაშინ ვცვლით, თუ ეს ჩემი პირადი პროფილია
  if (id === cachedUser.id) { cachedProfile = data; broadcast(); }
  return data;
}

/* ─────────────────────────────────────────────────────────────
   შესვლა და რეგისტრაცია
   ───────────────────────────────────────────────────────────── */

/**
 * რეგისტრაცია. `meta` პროფილს ბაზის ტრიგერამდე მიაქვს —
 * სახელი, გვარი, დაბადების თარიღი, ნიკი.
 */
export async function signUpWithEmail(email, password, meta = {}) {
  const sb = await supa();
  const clean = Object.fromEntries(
    Object.entries(meta).filter(([, v]) => v !== null && v !== undefined && v !== ''),
  );
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: { data: clean, emailRedirectTo: `${location.origin}/login.html` },
  });
  if (error) throw new Error(readableError(error));
  return data;
}

export async function signInWithEmail(email, password) {
  const sb = await supa();
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(readableError(error));
  return data.user;
}

export async function signInWithGoogle() {
  const sb = await supa();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/` },
  });
  if (error) throw new Error(readableError(error));
  // ბრაუზერი Google-ზე გადადის; დაბრუნებისას სესია თავად აღდგება
}

export async function resetPassword(email) {
  const sb = await supa();
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${location.origin}/login.html?reset=1`,
  });
  if (error) throw new Error(readableError(error));
}

export async function signOutUser() {
  const sb = await supa();
  await sb.auth.signOut();
  cachedUser = null;
  cachedProfile = null;
  broadcast();
}

/* ─────────────────────────────────────────────────────────────
   შეცდომები ქართულად
   ───────────────────────────────────────────────────────────── */

const MESSAGES = [
  [/invalid login credentials/i,       'ელფოსტა ან პაროლი არასწორია'],
  [/email not confirmed/i,             'ელფოსტა ჯერ არ დაგიდასტურებია — შეამოწმე ფოსტა'],
  [/user already registered/i,         'ეს ელფოსტა უკვე დარეგისტრირებულია'],
  [/password should be at least/i,     'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს'],
  [/unable to validate email/i,        'ელფოსტა არასწორად არის ჩაწერილი'],
  [/duplicate key.*username/i,         'ეს მომხმარებლის სახელი დაკავებულია'],
  [/violates check constraint.*username/i,
    'სახელში მხოლოდ პატარა ლათინური ასოები, ციფრები, წერტილი და ქვედა ტირე შეიძლება (3–30 სიმბოლო)'],
  [/row-level security/i,              'ამის უფლება არ გაქვს'],
  [/rate limit|too many requests/i,    'ძალიან ბევრი მცდელობა — ცოტა ხანში სცადე'],
  [/network|fetch/i,                   'ინტერნეტთან კავშირი ვერ დამყარდა'],
];

/** ტექნიკური შეცდომა → ადამიანის ენა */
export function readableError(err) {
  const raw = err?.message ?? String(err ?? '');
  for (const [pattern, text] of MESSAGES) if (pattern.test(raw)) return text;
  return raw || 'რაღაც შეცდომა მოხდა';
}

/* ─────────────────────────────────────────────────────────────
   ადმინი
   ───────────────────────────────────────────────────────────── */

/**
 * ადმინობა app_metadata-ში წერია — ეს ველი მხოლოდ სერვერიდან
 * იცვლება. profiles-ის ველი არ გამოდგებოდა: მას მომხმარებელი
 * თვითონ არედაქტირებს და თავს ადმინად გამოაცხადებდა.
 */
export async function isAdmin() {
  const user = await whenAuthReady();
  return user?.app_metadata?.role === 'admin';
}

export { HAS_BACKEND };
