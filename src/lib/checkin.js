/**
 * ჩექინი — „აქ ვარ".
 *
 * მარტივი ცნებაა და მარტივადვე უნდა დარჩეს: ერთი ჩანაწერი,
 * დროის ნიშნულით. ისტორიას ვინახავთ, რადგან „სად ვიყავი"
 * პროფილის ნაწილია — ერთი ადგილი ხელახლა შეიძლება მოინიშნოს.
 *
 * ერთ საათში ერთხელ: სხვაგვარად ერთი დაჭერით ათი ჩანაწერი
 * იქმნება და მთვლელი აზრს კარგავს.
 */

import { supa } from './supabase.js';
import { actorId } from './actor.js';
import { HAS_BACKEND } from './config.js';

const HOUR = 3600000;

/** ბოლო ჩექინი ამ ადგილზე, ან null */
export async function lastCheckin(businessSlug) {
  const me = actorId();
  if (!HAS_BACKEND || !me) return null;

  const sb = await supa();
  const { data } = await sb.from('checkins')
    .select('id, created_at')
    .eq('user_id', me).eq('business_slug', businessSlug)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle();
  return data ?? null;
}

/** ჩექინი. აბრუნებს false-ს, თუ ერთ საათში უკვე მოინიშნა. */
export async function checkIn(businessSlug) {
  const me = actorId();
  if (!me) throw new Error('შესვლა საჭიროა');

  const last = await lastCheckin(businessSlug);
  if (last && Date.now() - new Date(last.created_at).getTime() < HOUR) return false;

  const sb = await supa();
  const { error } = await sb.from('checkins')
    .insert({ user_id: me, business_slug: businessSlug });
  if (error) throw new Error(error.message);
  return true;
}

/** რამდენჯერ მოინიშნა ეს ადგილი — ბიზნესის გვერდზე ჩანს */
export async function checkinCount(businessSlug) {
  if (!HAS_BACKEND) return 0;
  const sb = await supa();
  const { count } = await sb.from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('business_slug', businessSlug);
  return count ?? 0;
}
