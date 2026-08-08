/**
 * მომხმარებლის გემოვნების პროფილი და ფიდის რანჟირება.
 *
 * ─────────────────────────────────────────────────────────────
 *  პატიოსანი საწყისი პირობა
 * ─────────────────────────────────────────────────────────────
 *  „ალგორითმი, რომელიც მომხმარებელს შეისწავლის" ვერაფერს შეისწავლის,
 *  სანამ მომხმარებელი არაფერს გააკეთებს. ამიტომ სისტემა ისეა აწყობილი,
 *  რომ ქცევის გარეშეც მუშაობდეს და ყოველი შეხებით უმჯობესდებოდეს:
 *
 *    სიგნალი              მუშაობს როდიდან
 *    ─────────────────────────────────────
 *    მანძილი              მაშინვე
 *    ღიაა თუ არა          მაშინვე
 *    სიახლე               მაშინვე
 *    დათვალიერება         პირველივე დაჭერიდან
 *    მოწონება             პირველივე მოწონებიდან
 *    გამოწერა             პირველივე გამოწერიდან
 *    პოპულარობა           როცა ტრაფიკი გაჩნდება
 *
 *  პერსონალურ სიგნალებს წონა ავტომატურად ეზრდება — სანამ მონაცემი
 *  არ არის, ისინი უბრალოდ ნულია და ფიდი მანძილითა და სიახლით ლაგდება.
 *
 *  პროფილი ჯერ ბრაუზერშია (localStorage). ავტორიზაციისას Firestore-ში
 *  გადადის და მოწყობილობებს შორის ესინქრონიზება.
 */

import { SUBCATEGORY_MAP } from '../data/taxonomy.js';

/**
 * გასაღები სახეზეა მიბმული.
 *
 * აქამდე ერთი იყო მთელ ბრაუზერზე და ამიტომ შენახული ადგილები,
 * ჩექინები და გემოვნება ყველა სახეს ერთად ჰქონდა — გვერდზე
 * გადართვისას იგივე სია ხვდებოდა. სახეები ცალკე ანგარიშებია,
 * ცალკე მეხსიერებაც უნდა ჰქონდეთ.
 *
 * სახის id-ს პირდაპირ localStorage-იდან ვკითხულობთ: ეს მოდული
 * ჩატვირთვისთანავე იწყებს კითხვას და ლოდინის საშუალება არ აქვს.
 * გადართვა გვერდს თავიდან ტვირთავს, ამიტომ ეს საკმარისია.
 */
const BASE = 'tl.taste.v1';

function keyFor() {
  try {
    const actor = localStorage.getItem('tl.actor');
    return actor ? `${BASE}:${actor}` : BASE;
  } catch { return BASE; }
}

const KEY = keyFor();

/** რამდენად ძლიერია თითო ქმედება გემოვნების პროფილში */
const WEIGHT = {
  view: 1,
  open: 2,          // ბიზნესის გვერდის გახსნა
  save: 6,
  like: 5,
  follow: 12,
  search: 3,
  call: 8,          // დარეკვა — ყველაზე ძლიერი განზრახვა
  route: 7,
};

/** ძველი ინტერესი ნელა ქრება — გემოვნება იცვლება */
const HALF_LIFE_DAYS = 30;

const empty = () => ({
  cats: {},          // category → ქულა
  subs: {},          // subcategory → ქულა
  catalog: {},       // catalogId → ქულა
  follows: [],       // businessId[]
  likes: [],         // postId[]
  saves: [],         // businessId[]
  seen: {},          // businessId → ბოლო ნახვის დრო
  updatedAt: Date.now(),
});

let profile = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

function persist() {
  profile.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* private mode */ }
  listeners.forEach((fn) => fn(profile));
}

export const getProfile = () => profile;
export function onTasteChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** დროში მილევა — ბოლო განახლებიდან გასული დღეების მიხედვით */
function decayed(map) {
  const days = (Date.now() - (profile.updatedAt ?? Date.now())) / 86400000;
  if (days < 1) return map;
  const factor = 0.5 ** (days / HALF_LIFE_DAYS);
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    const n = v * factor;
    if (n > 0.1) out[k] = n;
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────
   ქმედებების ჩაწერა
   ───────────────────────────────────────────────────────────── */

/**
 * @param {'view'|'open'|'save'|'like'|'follow'|'search'|'call'|'route'} action
 * @param {{business?:object, catalogId?:string, term?:string}} ctx
 */
export function record(action, ctx = {}) {
  const w = WEIGHT[action] ?? 1;
  profile.cats = decayed(profile.cats);
  profile.subs = decayed(profile.subs);
  profile.catalog = decayed(profile.catalog);

  const b = ctx.business;
  if (b) {
    if (b.category) bump(profile.cats, b.category, w);
    for (const s of b.subcategories ?? []) bump(profile.subs, s, w * 0.8);
    profile.seen[b.id] = Date.now();
  }
  if (ctx.catalogId) bump(profile.catalog, ctx.catalogId, w);

  persist();
}

const bump = (map, key, by) => { map[key] = (map[key] ?? 0) + by; };

export function toggleFollow(businessId) {
  const i = profile.follows.indexOf(businessId);
  if (i === -1) profile.follows.push(businessId); else profile.follows.splice(i, 1);
  persist();
  return profile.follows.includes(businessId);
}

export function toggleSave(businessId) {
  const i = profile.saves.indexOf(businessId);
  if (i === -1) profile.saves.push(businessId); else profile.saves.splice(i, 1);
  persist();
  return profile.saves.includes(businessId);
}

export function toggleLike(postId) {
  const i = profile.likes.indexOf(postId);
  if (i === -1) profile.likes.push(postId); else profile.likes.splice(i, 1);
  persist();
  return profile.likes.includes(postId);
}

export const isFollowing = (id) => profile.follows.includes(id);
export const isSaved = (id) => profile.saves.includes(id);
export const isLiked = (id) => profile.likes.includes(id);

/** რამდენად „იცნობს" სისტემა მომხმარებელს — 0-დან 1-მდე */
export function maturity() {
  const signals = Object.keys(profile.cats).length
    + profile.follows.length * 3
    + profile.saves.length * 2
    + profile.likes.length;
  return Math.min(1, signals / 20);
}

/* ─────────────────────────────────────────────────────────────
   რანჟირება
   ───────────────────────────────────────────────────────────── */

const NEAR = 1200;        // მეტრი, რომლის შემდეგაც მანძილი სერიოზულად აზარალებს

/**
 * ფიდის ელემენტის ქულა.
 * აბრუნებს ქულასაც და მიზეზსაც — მიზეზი UI-ში ჩანს („შენ ახლოს").
 */
export function scoreFeedItem(entry, { maxDistance = 4000 } = {}) {
  const p = profile;
  const m = maturity();
  let score = 0;
  const why = [];

  const b = entry.business ?? entry.picks?.[0]?.business;
  const cat = b?.category;
  const subs = b?.subcategories ?? [];

  /* ── უნივერსალური სიგნალები (მუშაობს დღე პირველიდან) ── */

  if (entry.state?.state === 'open') { score += 14; }
  else if (entry.state?.state === 'closing') { score += 6; }
  else if (entry.state?.state === 'closed') { score -= 25; }

  if (entry.distance != null) {
    const d = entry.distance;
    score += Math.max(0, 26 * (1 - Math.min(d, maxDistance) / maxDistance));
    if (d < NEAR) why.push('შენ ახლოს');
  }

  if (entry.type === 'post') {
    const hours = (Date.now() - (entry.createdAt ?? Date.now())) / 3600000;
    score += Math.max(0, 30 - hours);            // ახალი პოსტი წინ
    score += Math.min((entry.likeCount ?? 0), 50) * 0.4;
    if (hours < 6) why.push('ახალი');
  }

  if (b?.tier >= 2) score += 8;
  score += Math.min(b?.ratingCount ?? 0, 100) * 0.05;

  /* ── პერსონალური სიგნალები (წონა იზრდება გამოცდილებასთან ერთად) ── */

  if (b && p.follows.includes(b.id)) {
    score += 60;
    why.push('გამოწერილი');
  }

  if (cat && p.cats[cat]) {
    score += Math.min(p.cats[cat], 40) * 0.9 * m;
    if (p.cats[cat] > 8) why.push(catLabel(cat));
  }

  for (const s of subs) {
    if (p.subs[s]) {
      score += Math.min(p.subs[s], 30) * 0.7 * m;
      if (p.subs[s] > 6) why.push(SUBCATEGORY_MAP[s]?.ka ?? s);
    }
  }

  if (entry.catalogId && p.catalog[entry.catalogId]) {
    score += Math.min(p.catalog[entry.catalogId], 30) * 1.1 * m;
  }
  for (const it of entry.items ?? []) {
    if (it.catalogId && p.catalog[it.catalogId]) score += Math.min(p.catalog[it.catalogId], 20) * 0.4 * m;
  }

  /* ── დაღლილობა: რაც უკვე ნახე, უკან იწევს ── */

  if (b && p.seen[b.id]) {
    const hoursAgo = (Date.now() - p.seen[b.id]) / 3600000;
    if (hoursAgo < 24) score -= 30 * (1 - hoursAgo / 24);
  }

  return { score, why: [...new Set(why)].slice(0, 2) };
}

function catLabel(id) {
  const map = {
    food: 'საკვები', shopping: 'შოპინგი', health: 'ჯანმრთელობა', beauty: 'სილამაზე',
    services: 'სერვისები', auto: 'ავტო', education: 'განათლება', leisure: 'გართობა',
    hotel: 'საცხოვრებელი', transport: 'ტრანსპორტი', public: 'საჯარო', business: 'ბიზნესი',
  };
  return map[id] ?? id;
}

/**
 * ნაკადის დალაგება.
 *
 * ერთი წესი გარეშე: **მრავალფეროვნება**. სუფთა ქულით დალაგებული ფიდი
 * ერთსა და იმავე კატეგორიას აწყობს ზედიზედ და მოსაწყენი ხდება.
 * ამიტომ ერთი და იმავე კატეგორიის ზედიზედ მესამე ბარათი ჯარიმდება.
 */
export function rankFeed(entries, opts = {}) {
  const scored = entries.map((e) => ({ entry: e, ...scoreFeedItem(e, opts) }))
    .sort((a, b) => b.score - a.score);

  const out = [];
  const recent = [];
  const pool = [...scored];

  while (pool.length) {
    let pickIndex = 0;
    for (let i = 0; i < Math.min(pool.length, 8); i++) {
      const cat = pool[i].entry.business?.category;
      const repeats = recent.filter((c) => c === cat).length;
      if (repeats < 2) { pickIndex = i; break; }
    }
    const [picked] = pool.splice(pickIndex, 1);
    out.push({ ...picked.entry, _score: picked.score, _why: picked.why });
    recent.push(picked.entry.business?.category);
    if (recent.length > 3) recent.shift();
  }
  return out;
}

/**
 * გემოვნების პროფილის სინქრონიზაცია.
 *
 * ტელეფონზეც და კომპიუტერზეც ერთი და იგივე ფიდი უნდა იყოს.
 * უფრო ახალი ვერსია იმარჯვებს — ვისაც ბოლოს შეეხო.
 */
export async function syncProfile() {
  try {
    const { supa, currentUser, HAS_BACKEND } = await import('./supabase.js');
    if (!HAS_BACKEND || !currentUser()) return;

    const sb = await supa();
    const uid = currentUser().id;

    const { data } = await sb.from('profiles').select('taste').eq('id', uid).maybeSingle();
    const remote = data?.taste ?? null;

    if (remote?.updatedAt > profile.updatedAt) {
      profile = { ...empty(), ...remote };
      try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* ignore */ }
      listeners.forEach((fn) => fn(profile));
      return;
    }

    await sb.from('profiles').update({ taste: profile }).eq('id', uid);
  } catch { /* სინქრონიზაცია არასდროს არ უნდა შეაჩეროს აპლიკაცია */ }
}
