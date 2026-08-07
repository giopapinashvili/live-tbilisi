/**
 * მომხმარებლის შესწორებები.
 *
 * ეს კოლექცია პროექტის მდგრადობის მექანიზმია: 30,000 ბიზნესის
 * მონაცემს ხელით ვერავინ განაახლებს, crowdsourcing კი მუშაობს.
 */

import { fs, whenAuthReady } from '../firebase.js';

/**
 * @param {{businessId:string, field:string, note:string, oldValue?:any, newValue?:any}} input
 */
export async function submitEdit(input) {
  const user = await whenAuthReady();
  const { db, collection, addDoc, serverTimestamp } = await fs();

  return addDoc(collection(db, 'edits'), {
    businessId: input.businessId,
    field: input.field,
    note: (input.note ?? '').slice(0, 1000),
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    uid: user?.uid ?? null,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

/** ადმინისთვის — მოლოდინში მყოფი შესწორებები */
export async function pendingEdits(max = 50) {
  const { db, collection, query, where, orderBy, limit, getDocs } = await fs();
  const snap = await getDocs(query(
    collection(db, 'edits'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(max),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function resolveEdit(id, status) {
  const { db, doc, updateDoc, serverTimestamp } = await fs();
  return updateDoc(doc(db, 'edits', id), { status, resolvedAt: serverTimestamp() });
}
