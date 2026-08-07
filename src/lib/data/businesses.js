/**
 * ბიზნესის ჩაწერის ფენა.
 *
 * კითხვა store.js-ის საქმეა (სტატიკური ბანდლი, CDN-იდან, უფასოდ).
 * ჩაწერა — აქ, ბაზაში.
 *
 * ბიზნესები თავად ბაზაში არ დევს და განზრახ: 30 000 ჩანაწერს
 * ბანდლიდან წაკითხვა უფასოა, ბაზიდან — არა. ბაზაში მხოლოდ ის
 * მიდის, რაც იცვლება: მენიუ, აქცია, მითვისების მოთხოვნა.
 *
 * ბიზნესი მიბმულია `slug`-ით, არა უცხო გასაღებით. ასე ბანდლის
 * ხელახლა აგება ბაზას არაფერს უშლის.
 */

import { supa, currentUser } from '../supabase.js';
import { HAS_BACKEND } from '../config.js';

/* ─── მითვისება: „ეს ჩემი ადგილია" ─────────────────────────── */

/**
 * მოთხოვნის გაგზავნა. დადასტურების შემდეგ პროფილი ბიზნეს-გვერდად
 * იქცევა და მენიუს რედაქტირება გაიხსნება.
 */
export async function claimBusiness(businessSlug, proof) {
  const user = currentUser();
  if (!user) throw new Error('შესვლა საჭიროა');

  const sb = await supa();
  const { data, error } = await sb.from('claims').insert({
    business_slug: businessSlug,
    user_id: user.id,
    proof: (proof ?? '').slice(0, 1000) || null,
  }).select().single();

  if (error) {
    if (/duplicate key/.test(error.message)) throw new Error('მოთხოვნა უკვე გაგზავნილია და განხილვაშია');
    throw new Error(error.message);
  }
  return data;
}

/** ჩემი გაგზავნილი მოთხოვნები */
export async function myClaims() {
  if (!HAS_BACKEND || !currentUser()) return [];
  const sb = await supa();
  const { data, error } = await sb.from('claims').select('*').order('created_at', { ascending: false });
  if (error) { console.warn('[claims]', error.message); return []; }
  return data ?? [];
}

/** რომელ ბიზნესს ვმართავ (null, თუ ჩვეულებრივი ანგარიშია) */
export async function myBusinessSlug() {
  const { currentProfile } = await import('../supabase.js');
  return currentProfile()?.business_slug ?? null;
}

/* ─── მენიუ ────────────────────────────────────────────────── */

/**
 * მენიუ ბაზიდან. ჩრდილავს ბანდლის ვარიანტს — თუ პატრონმა
 * ფასი შეცვალა, სწორედ ეს ჩანს, ბანდლის ხელახლა აგებამდე.
 */
export async function listItems(businessSlug) {
  if (!HAS_BACKEND) return [];
  const sb = await supa();
  const { data, error } = await sb
    .from('business_items')
    .select('*')
    .eq('business_slug', businessSlug)
    .order('grp_order')
    .order('sort');

  if (error) { console.warn('[items]', error.message); return []; }
  return (data ?? []).map(fromRow);
}

export async function saveItem(businessSlug, item) {
  const user = currentUser();
  if (!user) throw new Error('შესვლა საჭიროა');

  const sb = await supa();
  const row = {
    business_slug: businessSlug,
    owner_id: user.id,
    name: (item.name ?? '').trim().slice(0, 120),
    descr: (item.descr ?? '').trim().slice(0, 400) || null,
    grp: item.group?.trim() || 'სხვა',
    grp_order: item.groupOrder ?? 0,
    sort: item.order ?? 0,
    price: item.price ?? null,
    old_price: item.oldPrice ?? null,
    unit: item.unit || null,
    photo_path: item.photoPath ?? null,
    available: item.available !== false,
    updated_at: new Date().toISOString(),
  };

  if (!row.name) throw new Error('სახელი აუცილებელია');

  const q = item.id
    ? sb.from('business_items').update(row).eq('id', item.id)
    : sb.from('business_items').insert(row);

  const { data, error } = await q.select().single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function deleteItem(itemId) {
  const sb = await supa();
  const { error } = await sb.from('business_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
}

/** ბაზის სვეტები → აპლიკაციის ველები */
function fromRow(r) {
  return {
    id: r.id,
    businessSlug: r.business_slug,
    name: r.name,
    descr: r.descr ?? '',
    group: r.grp,
    groupOrder: r.grp_order,
    order: r.sort,
    price: r.price,
    oldPrice: r.old_price,
    unit: r.unit ?? '',
    photoPath: r.photo_path ?? '',
    available: r.available,
  };
}
