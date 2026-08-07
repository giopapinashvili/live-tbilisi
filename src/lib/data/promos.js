/** აქციები და ფასდაკლებები. */

import { fs } from '../firebase.js';

/** აქტიური აქციები — ჯერ სტატიკური ბანდლიდან, მერე Firestore-იდან */
export async function activePromos(max = 60) {
  const { BUNDLE_BASE, HAS_FIREBASE } = await import('../config.js');

  try {
    const res = await fetch(`${BUNDLE_BASE}/promos/active.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.promos)) return data.promos;
    }
  } catch { /* ბანდლი ჯერ არ არსებობს */ }

  if (!HAS_FIREBASE) return [];

  const { db, collection, query, where, orderBy, limit, getDocs } = await fs();
  const snap = await getDocs(query(
    collection(db, 'promos'),
    where('active', '==', true),
    orderBy('endsAt'),
    limit(max),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function promosOf(businessId) {
  const { db, collection, query, where, getDocs } = await fs();
  const snap = await getDocs(query(
    collection(db, 'promos'),
    where('businessId', '==', businessId),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function savePromo(promo) {
  const { db, collection, addDoc, doc, setDoc, serverTimestamp, Timestamp } = await fs();
  const payload = {
    businessId: promo.businessId,
    title: (promo.title ?? '').slice(0, 120),
    descr: (promo.descr ?? '').slice(0, 600),
    type: promo.type ?? 'discount',
    discount: promo.discount ?? null,
    photo: promo.photo ?? '',
    startsAt: promo.startsAt ? Timestamp.fromDate(new Date(promo.startsAt)) : serverTimestamp(),
    endsAt: promo.endsAt ? Timestamp.fromDate(new Date(promo.endsAt)) : null,
    active: promo.active !== false,
    updatedAt: serverTimestamp(),
  };
  if (promo.id) return setDoc(doc(db, 'promos', promo.id), payload, { merge: true });
  return addDoc(collection(db, 'promos'), payload);
}

export async function deletePromo(id) {
  const { db, doc, deleteDoc } = await fs();
  return deleteDoc(doc(db, 'promos', id));
}
