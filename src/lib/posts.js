/**
 * ნამდვილი პოსტები — ბაზის ფენა.
 *
 * social.js ლოკალურ, სატესტო პოსტებს ემსახურება. ეს ფაილი —
 * ნამდვილ ხალხს და ნამდვილ ჩანაწერებს.
 *
 * ორივე ერთ ფიდში ერევა, მაგრამ არასდროს ერთმანეთში: ბაზის
 * პოსტს რიცხვითი id აქვს, სატესტოს — ტექსტური („n123_p1“).
 */

import { supa, currentUser, currentProfile, readableError } from './supabase.js';
import { HAS_BACKEND } from './config.js';
import { upload, remove as removeMedia } from './media.js';
import { tagsIn } from './richtext.js';

/** ავტორის და მედიის ჩამოტანა ერთ მოთხოვნაში */
const SELECT = `
  id, body, place_name, business_slug, lon, lat, tags,
  like_count, comment_count, created_at, is_demo,
  author:profiles!posts_author_id_fkey ( id, username, display_name, avatar_url, kind, verified ),
  media:post_media ( id, path, kind, width, height, position )
`;

/* ─────────────────────────────────────────────────────────────
   კითხვა
   ───────────────────────────────────────────────────────────── */

/**
 * ფიდი. `scope`:
 *   'all'       — ყველა (აღმოჩენა)
 *   'following' — მხოლოდ ვისაც მისდევ
 */
export async function listPosts({ scope = 'all', limit = 12, before = null } = {}) {
  if (!HAS_BACKEND) return [];

  const sb = await supa();
  let q = sb.from('posts').select(SELECT).order('created_at', { ascending: false }).limit(limit);

  if (before) q = q.lt('created_at', before);

  if (scope === 'following') {
    const me = currentUser();
    if (!me) return [];
    const { data: f } = await sb.from('follows').select('followee_id').eq('follower_id', me.id);
    const ids = (f ?? []).map((r) => r.followee_id);
    if (!ids.length) return [];
    q = q.in('author_id', ids);
  }

  const { data, error } = await q;
  if (error) { console.warn('[posts]', error.message); return []; }
  return (data ?? []).map(shape);
}

/** ერთი ავტორის პოსტები — პროფილის ბადისთვის */
export async function postsByAuthor(authorId, { limit = 24, before = null } = {}) {
  if (!HAS_BACKEND) return [];
  const sb = await supa();
  let q = sb.from('posts').select(SELECT)
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) q = q.lt('created_at', before);

  const { data, error } = await q;
  if (error) { console.warn('[posts]', error.message); return []; }
  return (data ?? []).map(shape);
}

/** ჰეშთეგით */
export async function postsByTag(tag, { limit = 30 } = {}) {
  if (!HAS_BACKEND) return [];
  const sb = await supa();
  const { data, error } = await sb.from('posts').select(SELECT)
    .contains('tags', [String(tag).toLowerCase()])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.warn('[posts]', error.message); return []; }
  return (data ?? []).map(shape);
}

/** პოპულარული ჰეშთეგები ბოლო კვირაში */
export async function trendingTags(limit = 20) {
  if (!HAS_BACKEND) return [];
  const sb = await supa();
  const { data, error } = await sb.rpc('trending_tags', { lim: limit });
  if (error) { console.warn('[tags]', error.message); return []; }
  return data ?? [];
}

/** ბაზის სტრიქონი → აპლიკაციის ობიექტი */
function shape(row) {
  return {
    ...row,
    id: row.id,
    remote: true,                                  // ბაზის პოსტია, არა სატესტო
    media: (row.media ?? []).sort((a, b) => a.position - b.position),
    author: row.author ?? null,
  };
}

/* ─────────────────────────────────────────────────────────────
   დაწერა
   ───────────────────────────────────────────────────────────── */

/**
 * ახალი პოსტი ფოტოებით.
 *
 * თანმიმდევრობა განზრახია: ჯერ ფაილები, მერე ჩანაწერი.
 * პირიქით რომ ვქნათ და ატვირთვა ჩავარდეს, ფიდში უსურათო
 * პოსტი დარჩებოდა და ვერაფრით გავასწორებდით.
 */
export async function createPost({ body = '', files = [], placeName = '', businessSlug = null, lon = null, lat = null, onProgress } = {}) {
  const user = currentUser();
  if (!user) throw new Error('შესვლა საჭიროა');

  const text = String(body).trim();
  if (!text && !files.length) throw new Error('დაწერე რამე ან დაამატე ფოტო');
  if (text.length > 2200) throw new Error('ტექსტი ძალიან გრძელია (მაქსიმუმ 2200)');
  if (files.length > 10) throw new Error('ერთ პოსტში მაქსიმუმ 10 ფაილი');

  // 1. ფაილები
  const uploaded = [];
  for (const [i, file] of files.entries()) {
    try {
      const m = await upload(file, {
        bucket: 'posts',
        onProgress: (p) => onProgress?.((i + p) / (files.length + 1)),
      });
      uploaded.push(m);
    } catch (err) {
      await removeMedia(uploaded.map((m) => m.path));   // ნახევრად ატვირთული არ ვტოვებთ
      throw err;
    }
  }

  // 2. ჩანაწერი
  const sb = await supa();
  const { data: post, error } = await sb.from('posts').insert({
    author_id: user.id,
    body: text || null,
    place_name: placeName || null,
    business_slug: businessSlug,
    lon, lat,
  }).select('id').single();

  if (error) {
    await removeMedia(uploaded.map((m) => m.path));
    throw new Error(readableError(error));
  }

  // 3. მედიის მიბმა
  if (uploaded.length) {
    const { error: mErr } = await sb.from('post_media').insert(
      uploaded.map((m, i) => ({
        post_id: post.id,
        path: m.path,
        kind: m.kind,
        width: m.width,
        height: m.height,
        position: i,
      })),
    );
    if (mErr) console.warn('[posts] მედია ვერ მიება:', mErr.message);
  }

  onProgress?.(1);
  return post.id;
}

/**
 * წაშლა. ჯერ ფაილები, მერე ჩანაწერი — თუ პირიქით, ფაილების
 * გზები დაიკარგება და საცავში სამუდამოდ დარჩებოდნენ.
 */
export async function deletePost(postId) {
  const sb = await supa();

  const { data: media } = await sb.from('post_media').select('path').eq('post_id', postId);
  if (media?.length) await removeMedia(media.map((m) => m.path));

  const { error } = await sb.from('posts').delete().eq('id', postId);
  if (error) throw new Error(readableError(error));
}

/** ტექსტის შესწორება. ჰეშთეგებს ბაზა თავად გადაითვლის. */
export async function editPost(postId, body) {
  const sb = await supa();
  const { error } = await sb.from('posts').update({ body: String(body).trim() || null }).eq('id', postId);
  if (error) throw new Error(readableError(error));
}

/* ─────────────────────────────────────────────────────────────
   მოწონება
   ───────────────────────────────────────────────────────────── */

/** რომელი პოსტები მაქვს მოწონებული — ერთი მოთხოვნა მთელ ფიდზე */
export async function likedAmong(postIds) {
  const me = currentUser();
  if (!me || !postIds.length) return new Set();
  const sb = await supa();
  const { data } = await sb.from('post_likes').select('post_id')
    .eq('user_id', me.id).in('post_id', postIds);
  return new Set((data ?? []).map((r) => r.post_id));
}

/** მოწონება. აბრუნებს ახალ მდგომარეობას. */
export async function toggleLike(postId, want) {
  const me = currentUser();
  if (!me) throw new Error('შესვლა საჭიროა');
  const sb = await supa();

  if (want) {
    const { error } = await sb.from('post_likes').insert({ post_id: postId, user_id: me.id });
    if (error && !/duplicate key/.test(error.message)) throw new Error(readableError(error));
    return true;
  }
  await sb.from('post_likes').delete().eq('post_id', postId).eq('user_id', me.id);
  return false;
}

/* ─────────────────────────────────────────────────────────────
   კომენტარები
   ───────────────────────────────────────────────────────────── */

const C_SELECT = `
  id, body, parent_id, like_count, created_at, author_id,
  author:profiles!comments_author_id_fkey ( id, username, display_name, avatar_url, verified )
`;

/** ძაფი — ძირეული კომენტარები, თითოეულს პასუხები მიბმული */
export async function commentThread(postId) {
  if (!HAS_BACKEND) return [];
  const sb = await supa();
  const { data, error } = await sb.from('comments').select(C_SELECT)
    .eq('post_id', postId).order('created_at', { ascending: true });

  if (error) { console.warn('[comments]', error.message); return []; }

  const rows = data ?? [];
  const roots = rows.filter((c) => !c.parent_id).map((c) => ({ ...c, replies: [] }));
  const byId = new Map(roots.map((c) => [c.id, c]));
  for (const c of rows) if (c.parent_id) byId.get(c.parent_id)?.replies.push(c);
  return roots;
}

export async function addComment(postId, body, parentId = null) {
  const me = currentUser();
  if (!me) throw new Error('შესვლა საჭიროა');
  const text = String(body).trim();
  if (!text) return null;
  if (text.length > 800) throw new Error('კომენტარი ძალიან გრძელია');

  const sb = await supa();
  const { data, error } = await sb.from('comments')
    .insert({ post_id: postId, author_id: me.id, parent_id: parentId, body: text })
    .select(C_SELECT).single();

  if (error) throw new Error(readableError(error));
  return { ...data, replies: [] };
}

/** წაშლა. ბაზა თვითონ წყვეტს: ავტორი ხარ თუ პოსტის პატრონი. */
export async function deleteComment(commentId) {
  const sb = await supa();
  const { error } = await sb.from('comments').delete().eq('id', commentId);
  if (error) throw new Error(readableError(error));
}

export async function likedComments(commentIds) {
  const me = currentUser();
  if (!me || !commentIds.length) return new Set();
  const sb = await supa();
  const { data } = await sb.from('comment_likes').select('comment_id')
    .eq('user_id', me.id).in('comment_id', commentIds);
  return new Set((data ?? []).map((r) => r.comment_id));
}

export async function toggleCommentLike(commentId, want) {
  const me = currentUser();
  if (!me) throw new Error('შესვლა საჭიროა');
  const sb = await supa();
  if (want) {
    const { error } = await sb.from('comment_likes').insert({ comment_id: commentId, user_id: me.id });
    if (error && !/duplicate key/.test(error.message)) throw new Error(readableError(error));
    return true;
  }
  await sb.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', me.id);
  return false;
}

/* ─────────────────────────────────────────────────────────────
   ხალხი
   ───────────────────────────────────────────────────────────── */

export async function profileByUsername(username) {
  if (!HAS_BACKEND) return null;
  const sb = await supa();
  const { data } = await sb.from('profiles').select('*')
    .eq('username', String(username).toLowerCase()).maybeSingle();
  return data ?? null;
}

/** გამომწერების და გამოწერილების რაოდენობა */
export async function followCounts(profileId) {
  if (!HAS_BACKEND) return { followers: 0, following: 0, posts: 0 };
  const sb = await supa();
  const [a, b, c] = await Promise.all([
    sb.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', profileId),
    sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
    sb.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', profileId).is('deleted_at', null),
  ]);
  return { followers: a.count ?? 0, following: b.count ?? 0, posts: c.count ?? 0 };
}

export async function amFollowing(profileId) {
  const me = currentUser();
  if (!me || me.id === profileId) return false;
  const sb = await supa();
  const { data } = await sb.from('follows').select('followee_id')
    .eq('follower_id', me.id).eq('followee_id', profileId).maybeSingle();
  return Boolean(data);
}

export async function toggleFollow(profileId, want) {
  const me = currentUser();
  if (!me) throw new Error('შესვლა საჭიროა');
  if (me.id === profileId) throw new Error('საკუთარ თავს ვერ გამოიწერ');

  const sb = await supa();
  if (want) {
    const { error } = await sb.from('follows').insert({ follower_id: me.id, followee_id: profileId });
    if (error && !/duplicate key/.test(error.message)) throw new Error(readableError(error));
    return true;
  }
  await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', profileId);
  return false;
}

/** ხალხის ძებნა — @ მონიშვნის შემოთავაზებისთვისაც */
export async function searchPeople(term, limit = 8) {
  const q = String(term ?? '').trim().toLowerCase();
  if (!HAS_BACKEND || q.length < 2) return [];
  const sb = await supa();
  const { data } = await sb.from('profiles')
    .select('id, username, display_name, avatar_url, kind, verified')
    .or(`username.ilike.${q}%,display_name.ilike.%${q}%`)
    .limit(limit);
  return data ?? [];
}

/* ─────────────────────────────────────────────────────────────
   შეტყობინებები
   ───────────────────────────────────────────────────────────── */

export async function notifications(limit = 40) {
  if (!HAS_BACKEND || !currentUser()) return [];
  const sb = await supa();
  const { data, error } = await sb.from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey ( username, display_name, avatar_url )')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) { console.warn('[notif]', error.message); return []; }
  return data ?? [];
}

export async function unreadCount() {
  if (!HAS_BACKEND || !currentUser()) return 0;
  const sb = await supa();
  const { count } = await sb.from('notifications')
    .select('*', { count: 'exact', head: true }).is('read_at', null);
  return count ?? 0;
}

export async function markAllRead() {
  const me = currentUser();
  if (!me) return;
  const sb = await supa();
  await sb.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('user_id', me.id).is('read_at', null);
}

export { currentProfile };
