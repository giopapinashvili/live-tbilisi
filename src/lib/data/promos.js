/** აქციები და ფასდაკლებები. */

import { supa, currentUser } from '../supabase.js';
import { HAS_BACKEND, BUNDLE_BASE } from '../config.js';

/**
 * აქტიური აქციები.
 * ჯერ სტატიკურ ბანდლს ვკითხულობთ — ის CDN-იდან მოდის და უფასოა.
 * ბაზას მხოლოდ მაშინ ვაწუხებთ, თუ ბანდლი ცარიელია.
 */
export async function activePromos(max = 60) {
  try {
    const res = await fetch(`${BUNDLE_BASE}/promos/active.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.promos) && data.promos.length) return data.promos;
    }
  } catch { /* ბანდლი ჯერ არ არსებობს */ }

  if (!HAS_BACKEND) return [];

  const sb = await supa();
  const { data, error } = await sb
    .from('promos')
    .select('*')
    .eq('active', true)
    .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
    .order('ends_at', { ascending: true, nullsFirst: false })
    .limit(max);

  if (error) { console.warn('[promos]', error.message); return []; }
  return data ?? [];
}

export async function promosOf(businessSlug) {
  if (!HAS_BACKEND) return [];
  const sb = await supa();
  const { data, error } = await sb
    .from('promos')
    .select('*')
    .eq('business_slug', businessSlug)
    .order('created_at', { ascending: false });

  if (error) { console.warn('[promos]', error.message); return []; }
  return data ?? [];
}

export async function savePromo(promo) {
  const user = currentUser();
  if (!user) throw new Error('შესვლა საჭიროა');

  const sb = await supa();
  const row = {
    business_slug: promo.businessSlug,
    owner_id: user.id,
    title: (promo.title ?? '').slice(0, 120),
    descr: (promo.descr ?? '').slice(0, 600) || null,
    kind: promo.kind ?? 'discount',
    discount: promo.discount ?? null,
    photo_path: promo.photoPath ?? null,
    starts_at: promo.startsAt ?? new Date().toISOString(),
    ends_at: promo.endsAt ?? null,
    active: promo.active !== false,
    updated_at: new Date().toISOString(),
  };

  const q = promo.id
    ? sb.from('promos').update(row).eq('id', promo.id)
    : sb.from('promos').insert(row);

  const { data, error } = await q.select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePromo(id) {
  const sb = await supa();
  const { error } = await sb.from('promos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
