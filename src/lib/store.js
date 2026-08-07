/**
 * მონაცემთა საცავი — ერთი წყარო მთელი აპლიკაციისთვის.
 *
 * კითხვის სტრატეგია (იხ. ARCHITECTURE.md §2):
 *   1. სტატიკური ბანდლი R2/Cloudflare-იდან — სწრაფი, უფასო, CDN-ქეშირებული
 *   2. თუ ბანდლი არ არსებობს ან ცარიელია → Firestore-ის პირდაპირი მოთხოვნა
 *      (მხოლოდ პროექტის საწყის ეტაპზე, სანამ ბიზნესები ცოტაა)
 *   3. თუ არც Firestore არის კონფიგურირებული → ცარიელი მდგომარეობა UI-ში
 *
 * გვერდი არასდროს „ტყდება" მონაცემის არარსებობის გამო.
 */

import { BUNDLE_BASE, HAS_BACKEND } from './config.js';
import { decodeRow, normalize } from './schema.js';
import { searchKey } from './format.js';
import { status } from './hours.js';

/** ბიზნესების მაქსიმალური რაოდენობა Firestore fallback-ისას */
const FALLBACK_LIMIT = 2000;

const state = {
  businesses: [],        // მსუბუქი ჩანაწერები (რუკისთვის)
  byId: new Map(),
  bySlug: new Map(),
  full: new Map(),       // სრული დოკუმენტების ქეში
  source: null,          // 'bundle' | 'firestore' | 'empty'
  version: null,
  loadedAt: null,
  error: null,
};

let loadPromise;
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn(state));

/** მდგომარეობის ცვლილებაზე გამოწერა */
export function subscribe(fn) {
  listeners.add(fn);
  if (state.loadedAt) fn(state);
  return () => listeners.delete(fn);
}

export const getState = () => state;

/* ─────────────────────────────────────────────────────────────
   ჩატვირთვა
   ───────────────────────────────────────────────────────────── */

export function loadCity() {
  loadPromise ??= (async () => {
    try {
      const fromBundle = await loadFromBundle();
      if (fromBundle?.length) return commit(fromBundle, 'bundle');

      // ბიზნესები მხოლოდ ბანდლში ცხოვრობს და განზრახ: 30 000 ჩანაწერის
      // CDN-იდან წაკითხვა უფასოა, ბაზიდან — არა. თუ ბანდლი ცარიელია,
      // ესე იგი ჯერ არ აგებულა — და ეს სხვა პრობლემაა, არა მოსაგვარებელი
      // მეორე მოთხოვნით.
      return commit([], 'empty');
    } catch (err) {
      console.error('[store] ჩატვირთვა ვერ მოხერხდა', err);
      state.error = err;
      return commit([], 'empty');
    }
  })();
  return loadPromise;
}

function commit(list, source) {
  state.businesses = list;
  state.byId = new Map(list.map((b) => [b.id, b]));
  state.bySlug = new Map(list.map((b) => [b.slug, b]));
  state.source = source;
  state.loadedAt = Date.now();
  emit();
  return state;
}

async function loadFromBundle() {
  const index = await fetchJson(`${BUNDLE_BASE}/index.json`, { cache: 'no-cache' });
  if (!index) return null;
  state.version = index.version ?? null;

  const v = index.version ? `?v=${index.version}` : '';
  const files = index.districts?.length
    ? index.districts.map((d) => `${BUNDLE_BASE}/d/${d}.json${v}`)
    : [`${BUNDLE_BASE}/all.json${v}`];

  const chunks = await Promise.all(files.map((url) => fetchJson(url)));
  const rows = chunks.filter(Boolean).flatMap((c) => c.rows ?? []);
  return rows.map(decodeRow).map(withSearchKey);
}

function withSearchKey(b) {
  b._key = searchKey(b.name);
  return b;
}

async function fetchJson(url, init) {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   ერთი ბიზნესი — სრული დოკუმენტი
   ───────────────────────────────────────────────────────────── */

/**
 * სრული ბიზნესი id-ით ან slug-ით.
 * ჯერ ბანდლიდან (b/{id}.json), მერე Firestore-იდან.
 */
export async function getBusiness(idOrSlug) {
  await loadCity();
  const light = state.byId.get(idOrSlug) ?? state.bySlug.get(idOrSlug);
  const id = light?.id ?? idOrSlug;

  if (state.full.has(id)) return state.full.get(id);

  const bundled = await fetchJson(`${BUNDLE_BASE}/b/${id}.json`);
  const base = bundled
    ? { ...bundled, id, items: bundled.items ?? [], promos: bundled.promos ?? [] }
    : (light ? { ...light, items: [], promos: [] } : null);

  if (!base) return null;

  // მენიუ ბაზაშიც შეიძლება იყოს — თუ პატრონმა ფასი შეცვალა.
  // ცოცხალი ჩანაწერი ბანდლისას ჩრდილავს.
  if (HAS_BACKEND && base.slug) {
    try {
      const { listItems } = await import('./data/businesses.js');
      const live = await listItems(base.slug);
      if (live.length) base.items = live;
    } catch { /* ბაზა მიუწვდომელია — ბანდლის მენიუ რჩება */ }
  }

  state.full.set(id, base);
  return base;
}

/* ─────────────────────────────────────────────────────────────
   წარმოებული მონაცემი
   ───────────────────────────────────────────────────────────── */

/** ღიაობის მდგომარეობა რიცხვად — MapLibre-ის ფილტრისთვის */
export const OPEN_STATE = { open: 1, closing: 2, closed: 3, unknown: 0 };

/**
 * ღიაობა გამოითვლება კლიენტზე და GeoJSON-ის თვისებად ჯდება,
 * რომ რუკის ფილტრი მყისიერი იყოს. ხელახლა უნდა გამოითვალოს
 * წუთში ერთხელ (იხ. map-core.js).
 */
export function openStateOf(business) {
  const full = state.full.get(business.id);
  const source = full ?? business;
  if (source._light && !source.hours && !source.alwaysOpen) return OPEN_STATE.unknown;
  return OPEN_STATE[status(source).state] ?? OPEN_STATE.unknown;
}

/** GeoJSON რუკისთვის */
export function toGeoJSON(list = state.businesses) {
  return {
    type: 'FeatureCollection',
    features: list.map((b) => ({
      type: 'Feature',
      id: hashId(b.id),
      geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
      properties: {
        id: b.id,
        slug: b.slug,
        name: b.name,
        cat: b.category ?? 'public',
        subs: b.subcategories ?? [],
        tier: b.tier ?? 0,
        rating: b.ratingAvg ?? 0,
        ratingCount: b.ratingCount ?? 0,
        price: b.priceLevel ?? 0,
        district: b.district ?? '',
        attrs: b.attrList ?? [],
        open: openStateOf(b),
      },
    })),
  };
}

/** MapLibre-ს feature id-ად რიცხვი სჭირდება feature-state-ისთვის */
const idCache = new Map();
let idSeq = 1;
export function hashId(id) {
  if (!idCache.has(id)) idCache.set(id, idSeq++);
  return idCache.get(id);
}

/** სტატისტიკა მთავარი გვერდისთვის — მხოლოდ რეალური რიცხვები */
export function stats() {
  const byCat = new Map();
  for (const b of state.businesses) {
    byCat.set(b.category, (byCat.get(b.category) ?? 0) + 1);
  }
  return {
    total: state.businesses.length,
    byCategory: byCat,
    verified: state.businesses.filter((b) => b.tier >= 1).length,
    rich: state.businesses.filter((b) => b.tier >= 2).length,
    source: state.source,
    version: state.version,
  };
}
