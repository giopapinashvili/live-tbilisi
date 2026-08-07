/**
 * კომენტარები და შეფასებები.
 *
 * ორმაგი საცავი განზრახია:
 *   • Firestore — როცა კონფიგურირებულია და მომხმარებელი შესულია
 *   • localStorage — ყოველთვის, დაუყოვნებლივ
 *
 * ჯერ ლოკალურად იწერება (ინტერფეისი მაშინვე რეაგირებს), მერე
 * ფონურად სერვერზე. ასე კომენტარი მუშაობს ავტორიზაციამდეც და
 * ქსელის გარეშეც — რაც პლატფორმის დასაწყისში კრიტიკულია.
 */

import { HAS_FIREBASE } from './config.js';

const CKEY = 'tl.comments.v1';
const RKEY = 'tl.ratings.v1';

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return {}; }
};
const write = (key, v) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ }
};

/* ─── კომენტარები ──────────────────────────────────────────── */

const LKEY = 'tl.commentLikes.v1';

/** ბრტყელი სია, ძველიდან ახლისკენ — ინსტაგრამის თანმიმდევრობა */
export function getComments(threadId) {
  return (read(CKEY)[threadId] ?? []).sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * ხედ სტრუქტურა: ძირითადი კომენტარები, თითოს პასუხები შიგნით.
 * ინსტაგრამზე პასუხები ერთ დონეზეა — უფრო ღრმად არ ჩადის.
 */
export function getThread(threadId) {
  const flat = getComments(threadId);
  const roots = flat.filter((c) => !c.parentId);
  const byParent = new Map();
  for (const c of flat) {
    if (!c.parentId) continue;
    if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
    byParent.get(c.parentId).push(c);
  }
  return roots.map((c) => ({ ...c, replies: byParent.get(c.id) ?? [] }));
}

export function commentCount(threadId) {
  return (read(CKEY)[threadId] ?? []).length;
}

export async function addComment(threadId, text, {
  businessId, author = 'შენ', parentId = null,
} = {}) {
  const clean = String(text ?? '').trim().slice(0, 800);
  if (!clean) return null;

  const entry = {
    id: `c${Date.now().toString(36)}${Math.floor(Math.random() * 100)}`,
    text: clean,
    author,
    parentId,
    likes: 0,
    createdAt: Date.now(),
    mine: true,
  };

  const all = read(CKEY);
  all[threadId] = [...(all[threadId] ?? []), entry];
  write(CKEY, all);

  pushRemote('comments', { threadId, businessId, ...entry });
  return entry;
}

/* ─── კომენტარის მოწონება ──────────────────────────────────── */

export const isCommentLiked = (commentId) => Boolean(read(LKEY)[commentId]);

export function toggleCommentLike(commentId) {
  const all = read(LKEY);
  if (all[commentId]) delete all[commentId]; else all[commentId] = Date.now();
  write(LKEY, all);
  return Boolean(all[commentId]);
}

export const commentLikes = (c) => (c.likes ?? 0) + (isCommentLiked(c.id) ? 1 : 0);

export function deleteComment(threadId, id) {
  const all = read(CKEY);
  all[threadId] = (all[threadId] ?? []).filter((c) => c.id !== id);
  write(CKEY, all);
}

/* ─── შეფასებები ───────────────────────────────────────────── */

/** მომხმარებლის საკუთარი შეფასება (1-5) ან null */
export const myRating = (businessId) => read(RKEY)[businessId]?.stars ?? null;

export function getRating(businessId) {
  const r = read(RKEY)[businessId];
  return r ? { stars: r.stars, text: r.text ?? '', at: r.at } : null;
}

export async function setRating(businessId, stars, text = '') {
  const n = Math.max(1, Math.min(5, Math.round(Number(stars) || 0)));
  const all = read(RKEY);
  all[businessId] = { stars: n, text: String(text).trim().slice(0, 800), at: Date.now() };
  write(RKEY, all);
  pushRemote('reviews', { businessId, rating: n, text: all[businessId].text });
  return n;
}

export function clearRating(businessId) {
  const all = read(RKEY);
  delete all[businessId];
  write(RKEY, all);
}

/**
 * საჩვენებელი რეიტინგი: ბიზნესის საშუალო + შენი შეფასება.
 * სანამ სხვისი შეფასება არ არის, შენი ერთადერთია — და ეს პატიოსნად ჩანს.
 */
export function displayRating(business) {
  const mine = myRating(business.id);
  const count = (business.ratingCount ?? 0) + (mine ? 1 : 0);
  if (!count) return { avg: null, count: 0, mine: null };
  const sum = (business.ratingAvg ?? 0) * (business.ratingCount ?? 0) + (mine ?? 0);
  return { avg: sum / count, count, mine };
}

/* ─── სერვერზე გადაგზავნა (თუ შესაძლებელია) ────────────────── */

async function pushRemote(collectionName, data) {
  if (!HAS_FIREBASE) return;
  try {
    const { whenAuthReady, fs } = await import('./firebase.js');
    const user = await whenAuthReady();
    if (!user) return;                       // ანონიმური კომენტარი მხოლოდ ლოკალურად რჩება

    const { db, collection, addDoc, serverTimestamp } = await fs();
    await addDoc(collection(db, collectionName), {
      ...data,
      uid: user.uid,
      authorName: user.displayName ?? '',
      status: 'live',
      createdAt: serverTimestamp(),
    });
  } catch {
    /* ლოკალური ჩანაწერი უკვე შენახულია — მომხმარებელს არაფერი დაეკარგა */
  }
}
