/**
 * ფილტრის მდგომარეობა.
 *
 * ერთი ობიექტი, სამი წარმომადგენლობა:
 *   • URL query   — გაზიარებადი ბმული
 *   • predicate   — სიების გასაფილტრად JS-ში
 *   • MapLibre expression — რუკის მყისიერი ფილტრაციისთვის (ქსელის გარეშე)
 *
 * ეს სამი ყოველთვის სინქრონშია, რადგან ერთი წყაროდან იწარმოება.
 */

import { params } from './dom.js';
import { OPEN_STATE } from './store.js';
import { searchKey } from './format.js';

const listeners = new Set();

const DEFAULTS = {
  q: '',
  cat: '',            // ერთი root კატეგორია
  subs: [],           // ქვეკატეგორიები (OR)
  attrs: [],          // ატრიბუტები (AND)
  district: '',
  open: false,        // მხოლოდ ღია ახლა
  rating: 0,          // მინიმალური რეიტინგი
  price: [],          // ფასის დონეები (OR)
  verified: false,    // მხოლოდ tier ≥ 1
  sort: 'relevance',  // relevance | rating | name | distance
};

export const filters = { ...DEFAULTS };

/* ─── URL ↔ მდგომარეობა ───────────────────────────────────── */

const LIST_KEYS = ['subs', 'attrs', 'price'];
const BOOL_KEYS = ['open', 'verified'];

export function readFromURL() {
  const q = params.all();
  for (const key of Object.keys(DEFAULTS)) {
    const raw = q[key];
    if (raw == null) { filters[key] = Array.isArray(DEFAULTS[key]) ? [] : DEFAULTS[key]; continue; }
    if (LIST_KEYS.includes(key)) filters[key] = raw.split(',').filter(Boolean);
    else if (BOOL_KEYS.includes(key)) filters[key] = raw === '1' || raw === 'true';
    else if (key === 'rating') filters[key] = Number(raw) || 0;
    else filters[key] = raw;
  }
  if (LIST_KEYS.includes('price')) filters.price = filters.price.map(Number).filter(Boolean);
  return filters;
}

export function writeToURL() {
  const patch = {};
  for (const key of Object.keys(DEFAULTS)) {
    const v = filters[key];
    const isDefault = Array.isArray(v)
      ? v.length === 0
      : v === DEFAULTS[key];
    patch[key] = isDefault ? null : (BOOL_KEYS.includes(key) ? '1' : v);
  }
  params.set(patch);
}

/* ─── მუტაციები ───────────────────────────────────────────── */

export function setFilter(patch, { silent = false } = {}) {
  Object.assign(filters, patch);
  // root კატეგორიის ცვლილებისას ქვეკატეგორიები აღარაა ვალიდური
  if ('cat' in patch) filters.subs = patch.subs ?? [];
  writeToURL();
  if (!silent) emit();
  return filters;
}

export function toggleIn(key, value) {
  const list = new Set(filters[key]);
  list.has(value) ? list.delete(value) : list.add(value);
  return setFilter({ [key]: [...list] });
}

export function resetFilters() {
  Object.assign(filters, { ...DEFAULTS, subs: [], attrs: [], price: [] });
  writeToURL();
  emit();
}

export function onFilterChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const emit = () => listeners.forEach((fn) => fn(filters));

/** რამდენი ფილტრია აქტიური — ბეჯისთვის */
export function activeCount() {
  let n = 0;
  if (filters.cat) n++;
  n += filters.subs.length + filters.attrs.length + filters.price.length;
  if (filters.district) n++;
  if (filters.open) n++;
  if (filters.verified) n++;
  if (filters.rating) n++;
  return n;
}

export const isEmpty = () => activeCount() === 0 && !filters.q;

/* ─── გაფილტვრა JS-ში (სიები, კატეგორიის გვერდი) ──────────── */

export function matches(b, f = filters) {
  if (f.cat && b.category !== f.cat) return false;
  if (f.district && b.district !== f.district) return false;
  if (f.verified && (b.tier ?? 0) < 1) return false;
  if (f.rating && (b.ratingAvg ?? 0) < f.rating) return false;
  if (f.price.length && !f.price.includes(b.priceLevel)) return false;

  if (f.subs.length) {
    const subs = b.subcategories ?? [];
    if (!f.subs.some((s) => subs.includes(s))) return false;
  }
  if (f.attrs.length) {
    const attrs = b.attrList ?? [];
    if (!f.attrs.every((a) => attrs.includes(a))) return false;
  }
  if (f.open && b._open !== OPEN_STATE.open && b._open !== OPEN_STATE.closing) return false;

  if (f.q) {
    const key = b._key ?? searchKey(b.name);
    if (!key.includes(searchKey(f.q))) return false;
  }
  return true;
}

export function apply(list, f = filters) {
  const out = list.filter((b) => matches(b, f));
  return sortList(out, f.sort, f);
}

export function sortList(list, sort = 'relevance', f = filters) {
  const arr = [...list];
  switch (sort) {
    case 'rating':
      return arr.sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0)
        || (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
    case 'name':
      return arr.sort((a, b) => a.name.localeCompare(b.name, 'ka'));
    case 'distance':
      return f._origin
        ? arr.sort((a, b) => dist2(a, f._origin) - dist2(b, f._origin))
        : arr;
    default:
      // რელევანტურობა: სრული პროფილი და შეფასებული ბიზნესი წინ
      return arr.sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0)
        || (b.ratingCount ?? 0) - (a.ratingCount ?? 0)
        || (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
  }
}

const dist2 = (b, [lon, lat]) => (b.lon - lon) ** 2 + (b.lat - lat) ** 2;

/* ─── MapLibre გამოსახულება ────────────────────────────────
   რუკის ფილტრაცია GPU-ზე ხდება, ქსელისა და ხელახალი
   რენდერის გარეშე. ეს არის ის, რაც აპლიკაციას „მყისიერს" ხდის. */

export function toMapExpression(f = filters) {
  const all = ['all'];

  if (f.cat) all.push(['==', ['get', 'cat'], f.cat]);
  if (f.district) all.push(['==', ['get', 'district'], f.district]);
  if (f.verified) all.push(['>=', ['get', 'tier'], 1]);
  if (f.rating) all.push(['>=', ['get', 'rating'], f.rating]);

  if (f.price.length) {
    all.push(['any', ...f.price.map((p) => ['==', ['get', 'price'], p])]);
  }
  if (f.subs.length) {
    all.push(['any', ...f.subs.map((s) => ['in', s, ['get', 'subs']])]);
  }
  if (f.attrs.length) {
    all.push(...f.attrs.map((a) => ['in', a, ['get', 'attrs']]));
  }
  if (f.open) {
    all.push(['any',
      ['==', ['get', 'open'], OPEN_STATE.open],
      ['==', ['get', 'open'], OPEN_STATE.closing],
    ]);
  }
  if (f.q) {
    // MapLibre-ს substring ოპერატორი არ აქვს — ტექსტურ ძებნას
    // store აფილტრავს და setData-ს უშვებს. აქ მხოლოდ id-ების სია.
    return { expression: all.length > 1 ? all : null, needsTextFilter: true };
  }
  return { expression: all.length > 1 ? all : null, needsTextFilter: false };
}

/** ადამიანური აღწერა — „აქტიური ფილტრები" ჩიპებისთვის */
export function describe(f = filters) {
  const out = [];
  if (f.cat) out.push({ key: 'cat', value: f.cat, kind: 'cat' });
  for (const s of f.subs) out.push({ key: 'subs', value: s, kind: 'sub' });
  for (const a of f.attrs) out.push({ key: 'attrs', value: a, kind: 'attr' });
  for (const p of f.price) out.push({ key: 'price', value: p, kind: 'price' });
  if (f.district) out.push({ key: 'district', value: f.district, kind: 'district' });
  if (f.open) out.push({ key: 'open', value: true, kind: 'flag', label: 'ღიაა ახლა' });
  if (f.verified) out.push({ key: 'verified', value: true, kind: 'flag', label: 'დადასტურებული' });
  if (f.rating) out.push({ key: 'rating', value: f.rating, kind: 'flag', label: `★ ${f.rating}+` });
  return out;
}

/** ერთი ფილტრის მოხსნა ჩიპიდან */
export function removeFilter({ key, value }) {
  if (Array.isArray(filters[key])) {
    setFilter({ [key]: filters[key].filter((v) => v !== value) });
  } else {
    setFilter({ [key]: DEFAULTS[key] });
  }
}
