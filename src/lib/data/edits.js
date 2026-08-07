/**
 * მომხმარებლის შესწორებები.
 *
 * ეს პროექტის მდგრადობის მექანიზმია: 30 000 ბიზნესის მონაცემს
 * ხელით ვერავინ განაახლებს, ხალხის შემოწირული შესწორება კი მუშაობს.
 */

import { supa, currentUser } from '../supabase.js';
import { HAS_BACKEND } from '../config.js';

/**
 * @param {{businessSlug:string, field:string, note:string,
 *          oldValue?:string, newValue?:string}} input
 */
export async function submitEdit(input) {
  if (!HAS_BACKEND) throw new Error('ბექენდი არ არის მიბმული');
  const user = currentUser();
  if (!user) throw new Error('შესწორების გასაგზავნად შესვლა საჭიროა');

  const sb = await supa();
  const { data, error } = await sb.from('edits').insert({
    business_slug: input.businessSlug,
    user_id: user.id,
    field: input.field,
    note: (input.note ?? '').slice(0, 1000) || null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
  }).select().single();

  if (error) throw new Error(error.message);
  return data;
}

/** საკუთარი გაგზავნილი შესწორებები */
export async function myEdits(max = 50) {
  if (!HAS_BACKEND || !currentUser()) return [];
  const sb = await supa();
  const { data, error } = await sb
    .from('edits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(max);

  if (error) { console.warn('[edits]', error.message); return []; }
  return data ?? [];
}
