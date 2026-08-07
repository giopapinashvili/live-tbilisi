/**
 * ბიზნესის კანონიკური ფორმა.
 *
 * მონაცემი სამი წყაროდან მოდის — Firestore, სტატიკური ბანდლი, Meilisearch —
 * და სამივე აქ ერთ ფორმაზე დაიყვანება. UI-ს არასდროს აინტერესებს, საიდან მოვიდა.
 *
 * ეს ფაილი იმპორტდება როგორც ბრაუზერში, ისე scripts/*.mjs-ში,
 * ამიტომ არავითარი DOM-ის ან Firebase-ის დამოკიდებულება.
 */

/* ─────────────────────────────────────────────────────────────
   ბანდლის კომპაქტური მწკრივი

   ობიექტის ნაცვლად მასივი: 30k ჩანაწერზე ეს ~40%-ით ნაკლები ბაიტია.
   თანმიმდევრობის შეცვლა ტეხს არსებულ ბანდლებს — ახალი ველი მხოლოდ ბოლოში.
   ───────────────────────────────────────────────────────────── */
export const BUNDLE_FIELDS = [
  'id', 'name', 'lon', 'lat', 'category', 'subcategories',
  'tier', 'ratingAvg', 'ratingCount', 'attrList', 'district',
  'priceLevel', 'slug', 'openState',
];

/** კანონიკური ბიზნესი → კომპაქტური მწკრივი */
export function encodeRow(b) {
  return [
    b.id,
    b.name,
    round6(b.lon),
    round6(b.lat),
    b.category ?? null,
    b.subcategories ?? [],
    b.tier ?? 0,
    b.ratingCount ? Math.round(b.ratingAvg * 10) / 10 : 0,
    b.ratingCount ?? 0,
    b.attrList ?? [],
    b.district ?? null,
    b.priceLevel ?? 0,
    b.slug ?? b.id,
  ];
}

/** კომპაქტური მწკრივი → კანონიკური ბიზნესი (მსუბუქი, რუკისთვის საკმარისი) */
export function decodeRow(row) {
  const [id, name, lon, lat, category, subcategories, tier,
    ratingAvg, ratingCount, attrList, district, priceLevel, slug] = row;
  return {
    id, name, lon, lat, category,
    subcategories: subcategories ?? [],
    tier: tier ?? 0,
    ratingAvg: ratingAvg ?? 0,
    ratingCount: ratingCount ?? 0,
    attrList: attrList ?? [],
    district: district ?? null,
    priceLevel: priceLevel || null,
    slug: slug ?? id,
    _light: true,          // სრული დოკუმენტი არ არის — hours/photos აკლია
  };
}

const round6 = (n) => Math.round(Number(n) * 1e6) / 1e6;

/* ─────────────────────────────────────────────────────────────
   Firestore დოკუმენტი → კანონიკური ფორმა
   ───────────────────────────────────────────────────────────── */
export function normalize(id, data = {}) {
  const loc = data.loc ?? {};
  return {
    id,
    slug: data.slug ?? id,
    name: pickLang(data.name),
    nameKa: data.name?.ka ?? '',
    descr: pickLang(data.descr),

    lon: loc.longitude ?? loc._long ?? loc.lon ?? null,
    lat: loc.latitude ?? loc._lat ?? loc.lat ?? null,
    geohash: data.geohash ?? null,
    district: data.district ?? null,
    address: pickLang(data.address),
    addressNote: data.addressNote ?? '',

    category: data.category ?? null,
    subcategories: data.subcategories ?? [],

    hours: data.hours ?? null,
    alwaysOpen: Boolean(data.alwaysOpen),

    phone: data.phone ?? [],
    email: data.email ?? '',
    website: data.website ?? '',
    social: data.social ?? {},

    cover: data.cover ?? '',
    photos: data.photos ?? [],
    logo: data.logo ?? '',

    attrs: data.attrs ?? {},
    attrList: data.attrList ?? attrsToList(data.attrs),
    priceLevel: data.priceLevel ?? null,

    ratingAvg: data.rating?.avg ?? 0,
    ratingCount: data.rating?.count ?? 0,

    tier: data.tier ?? 0,
    source: data.source ?? 'manual',
    osmId: data.osmId ?? null,
    ownerUid: data.ownerUid ?? null,
    status: data.status ?? 'active',
    viewCount: data.viewCount ?? 0,

    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/** მრავალენოვანი ველიდან მიმდინარე ენა (ჯერ მხოლოდ ka) */
export function pickLang(field, lang = 'ka') {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[lang] ?? field.ka ?? field.en ?? '';
}

/** attrs map → attrList მასივი (მხოლოდ true მნიშვნელობები) */
export function attrsToList(attrs = {}) {
  return Object.entries(attrs).filter(([, v]) => v === true).map(([k]) => k);
}

/** ცარიელი ბიზნესი dashboard-ის ფორმისთვის */
export function blankBusiness() {
  return {
    name: { ka: '', en: '' },
    descr: { ka: '' },
    category: '',
    subcategories: [],
    lon: null, lat: null,
    district: '',
    address: { ka: '' },
    addressNote: '',
    hours: null,
    alwaysOpen: false,
    phone: [],
    email: '', website: '',
    social: {},
    photos: [], cover: '', logo: '',
    attrs: {},
    priceLevel: null,
    status: 'active',
  };
}

/**
 * tier-ის ავტომატური გამოთვლა შევსებულობის მიხედვით.
 * იგივე ლოგიკა Cloud Function-შიც უნდა იყოს — ამიტომაა აქ, საერთო ფაილში.
 */
export function computeTier(b, { hasItems = false, ownerClaimed = false } = {}) {
  const hasContact = Boolean((b.phone?.length || b.website) && (b.hours || b.alwaysOpen));
  if (ownerClaimed && hasContact && (hasItems || (b.photos?.length ?? 0) > 0)) return 2;
  if (hasContact) return 1;
  return 0;
}

/** ვალიდაცია — dashboard და admin ერთსა და იმავე წესებს იყენებს */
export function validateBusiness(b) {
  const errors = {};
  if (!b.name?.ka?.trim()) errors.name = 'სახელი სავალდებულოა';
  if (!b.category) errors.category = 'აირჩიე კატეგორია';
  if (!Number.isFinite(b.lat) || !Number.isFinite(b.lon)) {
    errors.loc = 'მონიშნე ადგილი რუკაზე';
  }
  if (b.website && !/^https?:\/\/.+\..+/.test(b.website)) {
    errors.website = 'ბმული უნდა იწყებოდეს http:// ან https://';
  }
  for (const p of b.phone ?? []) {
    if (p && !/^\+?\d[\d\s-]{5,}$/.test(p)) { errors.phone = 'ტელეფონის ფორმატი არასწორია'; break; }
  }
  return errors;
}
