/**
 * მედია — ფოტოს შემცირება და ატვირთვა.
 *
 * ტელეფონის ფოტო ხშირად 4–8 მბ-ია და 4000 პიქსელი განიერი.
 * ეკრანზე მაინც 1000 პიქსელზე მეტი არ ჩანს, ამიტომ ატვირთვამდე
 * ბრაუზერშივე ვამცირებთ და WebP-ად ვაქცევთ.
 *
 * ეს არაა მოხერხებულობა, არამედ აუცილებლობა:
 *   • 6 მბ → ~250 კბ, ანუ საცავი 20-ჯერ ნელა იწურება
 *   • ატვირთვა სუსტ ინტერნეტზე წამებში და არა წუთებში
 *   • ფიდი სწრაფად იხსნება
 *
 * ვიდეო არ იჭრება — ბრაუზერში ეს ძვირი და არასაიმედოა.
 * მას მხოლოდ ზომას ვუმოწმებთ.
 */

import { supa, currentUser } from './supabase.js';

export const LIMITS = {
  imageBytes: 10 * 1024 * 1024,   // შესვლისას; შემცირების შემდეგ გაცილებით ნაკლებია
  videoBytes: 50 * 1024 * 1024,   // Supabase-ის უფასო გეგმის ჭერი
  maxEdge: 1440,                  // გრძელი გვერდი პიქსელებში
  avatarEdge: 400,
  quality: 0.82,
  perPost: 10,                    // კარუსელში მაქსიმუმ
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const isImage = (file) => IMAGE_TYPES.includes(file?.type);
export const isVideo = (file) => VIDEO_TYPES.includes(file?.type);

/* ─────────────────────────────────────────────────────────────
   შემოწმება
   ───────────────────────────────────────────────────────────── */

/** აბრუნებს შეცდომის ტექსტს, ან null თუ ფაილი წესიერია */
export function checkFile(file) {
  if (!file) return 'ფაილი არ არის';

  if (isImage(file)) {
    return file.size > LIMITS.imageBytes
      ? `ფოტო ძალიან დიდია (${mb(file.size)}). მაქსიმუმი ${mb(LIMITS.imageBytes)}.`
      : null;
  }

  if (isVideo(file)) {
    return file.size > LIMITS.videoBytes
      ? `ვიდეო ძალიან დიდია (${mb(file.size)}). მაქსიმუმი ${mb(LIMITS.videoBytes)}.`
      : null;
  }

  return 'მხოლოდ ფოტო (JPG, PNG, WebP) ან ვიდეო (MP4, WebM, MOV)';
}

const mb = (n) => `${(n / 1048576).toFixed(1)} მბ`;

/* ─────────────────────────────────────────────────────────────
   შემცირება
   ───────────────────────────────────────────────────────────── */

/**
 * ფოტოს შემცირება და WebP-ად გადაყვანა.
 * პროპორცია არ ირღვევა — გრძელი გვერდი ეყრდნობა maxEdge-ს.
 * თუ ფოტო უკვე პატარაა, არ იზრდება.
 */
export async function shrinkImage(file, maxEdge = LIMITS.maxEdge) {
  const bitmap = await loadBitmap(file);

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/webp', LIMITS.quality);
  });

  // ძალიან იშვიათად WebP ვერ გამოდის — მაშინ ორიგინალი მიდის
  if (!blob) return { blob: file, width: w, height: h, ext: extOf(file) };

  return { blob, width: w, height: h, ext: 'webp' };
}

/**
 * ფაილიდან სურათი. createImageBitmap ავტომატურად ასწორებს
 * ტელეფონის EXIF ბრუნვას — <img>-ს ეს არ შეუძლია ყველა ბრაუზერში.
 */
async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* ძველ ბრაუზერზე ქვემოთ გადავდივართ */ }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('ფოტო ვერ გაიხსნა'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const extOf = (file) => (file.name?.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);

/* ─────────────────────────────────────────────────────────────
   ატვირთვა
   ───────────────────────────────────────────────────────────── */

/**
 * ატვირთვა. გზა ყოველთვის `<uid>/<დრო>-<შემთხვევითი>.<ext>` —
 * ბაზის წესი მხოლოდ საკუთარ საქაღალდეში წერას უშვებს, ამიტომ
 * uid პრეფიქსი სავალდებულოა.
 *
 * onProgress 0-დან 1-მდე გამოიძახება.
 */
export async function upload(file, { bucket = 'posts', onProgress } = {}) {
  const user = currentUser();
  if (!user) throw new Error('შესვლა საჭიროა');

  const bad = checkFile(file);
  if (bad) throw new Error(bad);

  let body = file;
  let width = null;
  let height = null;
  let ext = extOf(file);
  const kind = isVideo(file) ? 'video' : 'image';

  if (kind === 'image') {
    onProgress?.(0.1);
    const shrunk = await shrinkImage(file, bucket === 'avatars' ? LIMITS.avatarEdge : LIMITS.maxEdge);
    body = shrunk.blob;
    width = shrunk.width;
    height = shrunk.height;
    ext = shrunk.ext;
  }

  onProgress?.(0.4);

  const path = `${user.id}/${Date.now()}-${rand()}.${ext}`;
  const sb = await supa();
  const { error } = await sb.storage.from(bucket).upload(path, body, {
    cacheControl: '31536000',       // ერთი წელი: გზა უნიკალურია, ფაილი არასდროს იცვლება
    contentType: body.type || file.type,
    upsert: false,
  });

  if (error) throw new Error(`ატვირთვა ვერ მოხერხდა: ${error.message}`);
  onProgress?.(1);

  return { path, bucket, kind, width, height, bytes: body.size };
}

const rand = () => Math.random().toString(36).slice(2, 10);

/** ატვირთული ფაილის საჯარო მისამართი */
export async function publicUrl(path, bucket = 'posts') {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;      // უკვე სრული მისამართია
  const sb = await supa();
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * სინქრონული ვარიანტი — შაბლონებში გამოსადეგი, სადაც await არ გვაქვს.
 * Supabase-ის საჯარო მისამართი მუდმივი ფორმატისაა.
 */
export function publicUrlSync(path, bucket = 'posts') {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  const base = (import.meta.env?.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/** წაშლა. პოსტის წაშლისას ფაილიც უნდა წავიდეს, თორემ საცავი ივსება. */
export async function remove(paths, bucket = 'posts') {
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
  if (!list.length) return;
  const sb = await supa();
  const { error } = await sb.storage.from(bucket).remove(list);
  if (error) console.warn('[media] ფაილი ვერ წაიშალა:', error.message);
}
