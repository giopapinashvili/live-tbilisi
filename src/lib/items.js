/**
 * პროდუქტების ინდექსი — მენიუები, საქონელი, სერვისები.
 *
 * ეს არის სისტემის ის ნაწილი, რომელიც განასხვავებს „ბიზნესების კატალოგს"
 * და „ნივთების კატალოგს". მომხმარებელი ეძებს შაურმას, არა საშაურმეს.
 *
 * ინდექსი ცალკე ფაილია და მხოლოდ პირველ ძებნაზე იტვირთება — რუკის
 * გახსნა მისგან არ ნელდება.
 */

import { BUNDLE_BASE } from './config.js';
import { searchKey, searchVariants, matchAt } from './format.js';
import { getState, loadCity } from './store.js';

const state = {
  items: [],          // { name, catalogId, businessId, price, group, ingredients, unit, _key }
  byCatalog: new Map(),
  loaded: false,
  coSold: null,       // catalogId → [დაკავშირებული catalogId]
};

let loadPromise;

/** ინდექსის ჩატვირთვა (ერთხელ) */
export function loadItems() {
  loadPromise ??= (async () => {
    await loadCity();
    try {
      const res = await fetch(`${BUNDLE_BASE}/items.json`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      state.items = (data.items ?? []).map(([name, catalogId, businessId, price, group, ingredients, unit]) => ({
        name, catalogId, businessId, price, group,
        ingredients: ingredients ?? [],
        unit: unit ?? '',
        _key: searchKey(`${name} ${(ingredients ?? []).join(' ')}`),
      }));
      indexByCatalog();
      buildCoSold();
    } catch {
      state.items = [];          // ინდექსი ჯერ არ არსებობს — ეს ნორმალურია
    }
    state.loaded = true;
    return state;
  })();
  return loadPromise;
}

function indexByCatalog() {
  state.byCatalog = new Map();
  for (const it of state.items) {
    if (!it.catalogId) continue;
    if (!state.byCatalog.has(it.catalogId)) state.byCatalog.set(it.catalogId, []);
    state.byCatalog.get(it.catalogId).push(it);
  }
}

/* ─────────────────────────────────────────────────────────────
   „რა იყიდება ერთად"

   შაურმა და ფრი კატალოგის ხეში ძმები არ არიან — სხვადასხვა ტოტზე დგანან.
   მაგრამ თუ 40 საშაურმედან 35-ს ორივე აქვს, ეს კავშირი რეალურია.
   ამას არავინ წერს ხელით — თვითონ მენიუებიდან გამოითვლება.
   ───────────────────────────────────────────────────────────── */

function buildCoSold() {
  const perBusiness = new Map();
  for (const it of state.items) {
    if (!it.catalogId) continue;
    if (!perBusiness.has(it.businessId)) perBusiness.set(it.businessId, new Set());
    perBusiness.get(it.businessId).add(it.catalogId);
  }

  const pairs = new Map();     // "a|b" → რამდენჯერ შეხვდა ერთად
  const totals = new Map();    // catalogId → რამდენ ბიზნესშია

  for (const set of perBusiness.values()) {
    const list = [...set];
    for (const a of list) totals.set(a, (totals.get(a) ?? 0) + 1);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = list[i] < list[j] ? `${list[i]}|${list[j]}` : `${list[j]}|${list[i]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }

  const rel = new Map();
  for (const [key, count] of pairs) {
    const [a, b] = key.split('|');
    // ალბათობა: რამდენად ხშირად ხვდება b იქ, სადაც a-ა
    const pAB = count / (totals.get(a) || 1);
    const pBA = count / (totals.get(b) || 1);
    if (count < 3) continue;                    // ერთეული დამთხვევა ხმაურია
    push(rel, a, b, pAB);
    push(rel, b, a, pBA);
  }
  for (const [k, list] of rel) {
    rel.set(k, list.sort((x, y) => y.score - x.score).slice(0, 6));
  }
  state.coSold = rel;
}

function push(map, from, to, score) {
  if (score < 0.4) return;
  if (!map.has(from)) map.set(from, []);
  map.get(from).push({ id: to, score });
}

/** დაკავშირებული პროდუქტები — „ასევე ხშირად ერთად იყიდება" */
export function relatedTo(catalogId, limit = 5) {
  const list = state.coSold?.get(catalogId) ?? [];
  return list.slice(0, limit).map((x) => ({
    catalogId: x.id,
    score: x.score,
    name: state.byCatalog.get(x.id)?.[0]?.name ?? x.id,
  }));
}

/* ─────────────────────────────────────────────────────────────
   ძებნა პროდუქტებში
   ───────────────────────────────────────────────────────────── */

/**
 * @returns {{items:Array, businessIds:Set<string>, related:Array}}
 */
export function searchItems(term, { limit = 40 } = {}) {
  const variants = searchVariants(term);
  if (!variants.length || variants[0].length < 2 || !state.items.length) {
    return { items: [], businessIds: new Set(), related: [], total: 0 };
  }

  const { byId } = getState();
  const scored = [];

  for (const it of state.items) {
    if (matchAt(it._key, variants) === -1) continue;
    const inName = matchAt(searchKey(it.name), variants);
    // სახელში დამთხვევა ინგრედიენტზე ძლიერია
    let score = inName === 0 ? 100 : inName > 0 ? 70 : 30;
    const biz = byId.get(it.businessId);
    if (biz) score += Math.min(biz.ratingCount ?? 0, 40) * 0.1;
    scored.push({ item: it, biz, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.price - b.item.price);
  const top = scored.slice(0, limit);

  // ყველაზე ხშირი catalogId შედეგებში → მისი „მეზობლები"
  const counts = new Map();
  for (const s of scored) {
    if (s.item.catalogId) counts.set(s.item.catalogId, (counts.get(s.item.catalogId) ?? 0) + 1);
  }
  const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const related = main ? relatedTo(main) : [];

  return {
    items: top.map((s) => ({ ...s.item, business: s.biz })),
    businessIds: new Set(scored.map((s) => s.item.businessId)),
    related,
    total: scored.length,
  };
}

/** კონკრეტული პროდუქტის მიხედვით — „ვინ ყიდის ჰოთდოგს" */
export function businessesWithCatalog(catalogId) {
  const { byId } = getState();
  const ids = new Set((state.byCatalog.get(catalogId) ?? []).map((i) => i.businessId));
  return [...ids].map((id) => byId.get(id)).filter(Boolean);
}

export const itemsState = () => state;
export const hasItems = () => state.items.length > 0;
