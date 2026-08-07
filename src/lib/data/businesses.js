/**
 * ბიზნესების ჩაწერის ფენა (Firestore).
 *
 * კითხვა store.js-ის საქმეა (სტატიკური ბანდლი), ჩაწერა — აქ.
 * DOM-ის კოდი Firestore-ს პირდაპირ არასდროს ეხება.
 */

import { fs, whenAuthReady } from '../firebase.js';
import { normalize, attrsToList, computeTier, validateBusiness } from '../schema.js';
import { slugify, searchKey } from '../format.js';

/** ჩასაწერი ფორმა Firestore-ის დოკუმენტად */
async function toDoc(input, { GeoPoint, serverTimestamp }) {
  const attrs = input.attrs ?? {};
  const geofire = await import('geofire-common');
  return {
    slug: input.slug || slugify(input.name?.ka ?? ''),
    name: { ka: input.name?.ka?.trim() ?? '', en: input.name?.en?.trim() ?? '' },
    descr: input.descr?.ka ? { ka: input.descr.ka.trim() } : null,

    loc: new GeoPoint(Number(input.lat), Number(input.lon)),
    geohash: geofire.geohashForLocation([Number(input.lat), Number(input.lon)]),
    district: input.district || null,
    address: input.address?.ka ? { ka: input.address.ka.trim() } : null,
    addressNote: input.addressNote ?? '',

    category: input.category,
    subcategories: (input.subcategories ?? []).slice(0, 8),

    hours: input.hours ?? null,
    alwaysOpen: Boolean(input.alwaysOpen),

    phone: (input.phone ?? []).filter(Boolean),
    email: input.email ?? '',
    website: input.website ?? '',
    social: input.social ?? {},

    cover: input.cover ?? '',
    photos: input.photos ?? [],
    logo: input.logo ?? '',

    attrs,
    attrList: attrsToList(attrs),
    priceLevel: input.priceLevel ?? null,

    searchName: searchKey(input.name?.ka ?? ''),
    status: input.status ?? 'active',
    updatedAt: serverTimestamp(),
  };
}

/** ახალი ბიზნესი (ადმინი ან მფლობელი) */
export async function createBusiness(input) {
  const errors = validateBusiness(input);
  if (Object.keys(errors).length) throw Object.assign(new Error('ვალიდაცია'), { errors });

  const user = await whenAuthReady();
  const { db, collection, addDoc, GeoPoint, serverTimestamp } = await fs();
  const doc = await toDoc(input, { GeoPoint, serverTimestamp });

  return addDoc(collection(db, 'businesses'), {
    ...doc,
    rating: { avg: 0, count: 0, sum: 0 },
    tier: computeTier(input, { ownerClaimed: Boolean(input.ownerUid) }),
    source: input.source ?? 'manual',
    osmId: input.osmId ?? null,
    ownerUid: input.ownerUid ?? user?.uid ?? null,
    viewCount: 0,
    createdAt: serverTimestamp(),
  });
}

/** არსებულის განახლება. tier/rating/ownerUid მხოლოდ სერვერზე იცვლება. */
export async function updateBusiness(id, input) {
  const errors = validateBusiness(input);
  if (Object.keys(errors).length) throw Object.assign(new Error('ვალიდაცია'), { errors });

  const { db, doc: docRef, updateDoc, GeoPoint, serverTimestamp } = await fs();
  const data = await toDoc(input, { GeoPoint, serverTimestamp });
  return updateDoc(docRef(db, 'businesses', id), data);
}

/** მიმდინარე მომხმარებლის ბიზნესები */
export async function myBusinesses() {
  const user = await whenAuthReady();
  if (!user) return [];
  const { db, collection, query, where, getDocs } = await fs();
  const snap = await getDocs(query(collection(db, 'businesses'), where('ownerUid', '==', user.uid)));
  return snap.docs.map((d) => normalize(d.id, d.data()));
}

/** ერთი ბიზნესი რედაქტირებისთვის (ქეშის გვერდის ავლით) */
export async function fetchBusiness(id) {
  const { db, doc, getDoc } = await fs();
  const snap = await getDoc(doc(db, 'businesses', id));
  return snap.exists() ? normalize(snap.id, snap.data()) : null;
}

/* ─── items (მენიუ / პროდუქტი / სერვისი) ───────────────────── */

export async function listItems(businessId) {
  const { db, collection, getDocs, query, orderBy } = await fs();
  const snap = await getDocs(query(
    collection(db, 'businesses', businessId, 'items'),
    orderBy('groupOrder'), orderBy('order'),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveItem(businessId, item) {
  const { db, collection, addDoc, doc, setDoc, serverTimestamp } = await fs();
  const payload = {
    name: { ka: item.name?.ka ?? item.name ?? '' },
    descr: item.descr?.ka ? { ka: item.descr.ka } : null,
    group: item.group ?? 'სხვა',
    groupOrder: item.groupOrder ?? 0,
    order: item.order ?? 0,
    price: item.price ?? null,
    oldPrice: item.oldPrice ?? null,
    currency: 'GEL',
    unit: item.unit ?? '',
    photo: item.photo ?? '',
    available: item.available !== false,
    attrs: item.attrs ?? {},
    updatedAt: serverTimestamp(),
  };
  if (item.id) return setDoc(doc(db, 'businesses', businessId, 'items', item.id), payload, { merge: true });
  return addDoc(collection(db, 'businesses', businessId, 'items'), payload);
}

export async function deleteItem(businessId, itemId) {
  const { db, doc, deleteDoc } = await fs();
  return deleteDoc(doc(db, 'businesses', businessId, 'items', itemId));
}

/* ─── მფლობელობის მოთხოვნა ─────────────────────────────────── */

export async function claimBusiness(businessId, proof) {
  const user = await whenAuthReady();
  if (!user) throw new Error('საჭიროა ავტორიზაცია');
  const { db, collection, addDoc, serverTimestamp } = await fs();
  return addDoc(collection(db, 'claims'), {
    businessId, uid: user.uid, email: user.email ?? '',
    proof: (proof ?? '').slice(0, 1000),
    status: 'pending', createdAt: serverTimestamp(),
  });
}
