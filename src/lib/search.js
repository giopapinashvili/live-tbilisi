/**
 * ძებნა.
 *
 * L1 — ლოკალური, ჩატვირთულ მონაცემზე. მყისიერი, ქსელის გარეშე.
 *      ეძებს ბიზნესებში, კატეგორიებში და უბნებში ერთდროულად.
 * L2 — Meilisearch, თუ კონფიგურირებულია. ჩართავს პროდუქტებში/მენიუში ძებნას
 *      და typo-tolerance-ს. L1 მაინც პირველი პასუხობს, L2 ავსებს.
 *
 * ქართული და ლათინური ურთიერთშენაცვლებადია: „ცისქვილი" ↔ „tsiskvili".
 */

import { HAS_MEILI, MEILI } from './config.js';
import { searchKey } from './format.js';
import { getState, loadCity } from './store.js';
import { loadItems, searchItems } from './items.js';
import { CATEGORIES, DISTRICTS, SUBCATEGORY_MAP } from '../data/taxonomy.js';

/* ─── სტატიკური ლექსიკონები (კატეგორია / უბანი) ───────────── */

const STATIC_ENTRIES = [
  ...CATEGORIES.map((c) => ({
    kind: 'category', id: c.id, label: c.ka, sub: 'კატეგორია',
    href: `/category.html?cat=${c.id}`, cat: c.id, key: searchKey(`${c.ka} ${c.en}`),
  })),
  ...Object.entries(SUBCATEGORY_MAP).map(([id, s]) => ({
    kind: 'subcategory', id, label: s.ka, sub: `კატეგორია · ${s.parent}`,
    href: `/category.html?cat=${s.parent}&subs=${id}`, cat: s.parent, key: searchKey(s.ka),
  })),
  ...DISTRICTS.map((d) => ({
    kind: 'district', id: d.id, label: d.ka, sub: 'უბანი',
    href: `/category.html?district=${d.id}`, key: searchKey(`${d.ka} ${d.neighborhoods.join(' ')}`),
  })),
];

/* ─── L1 ──────────────────────────────────────────────────── */

/**
 * @param {string} term
 * @param {{limit?:number, businessLimit?:number}} opts
 * @returns {{businesses:Array, taxonomy:Array, term:string}}
 */
export function searchLocal(term, { businessLimit = 8, taxonomyLimit = 5 } = {}) {
  const q = searchKey(term).trim();
  if (q.length < 2) return { businesses: [], taxonomy: [], term };

  const taxonomy = rank(STATIC_ENTRIES, q, (e) => e.key).slice(0, taxonomyLimit);

  const { businesses } = getState();
  const hits = rank(businesses, q, (b) => b._key ?? searchKey(b.name), (b) => scoreBusiness(b));
  return { businesses: hits.slice(0, businessLimit), taxonomy, term };
}

/** ყველა შედეგი — ძებნის გვერდისთვის */
export function searchAll(term) {
  const q = searchKey(term).trim();
  if (q.length < 2) return [];
  const { businesses } = getState();
  return rank(businesses, q, (b) => b._key ?? searchKey(b.name), (b) => scoreBusiness(b));
}

/**
 * რანჟირება: სახელის დასაწყისში დამთხვევა ყველაზე ძლიერია,
 * სიტყვის დასაწყისი — შემდეგი, ნებისმიერი შემთხვევა — სუსტი.
 */
function rank(list, q, keyOf, bonusOf) {
  const out = [];
  for (const item of list) {
    const key = keyOf(item);
    if (!key) continue;
    const at = key.indexOf(q);
    if (at === -1) continue;
    let score = at === 0 ? 100 : /(^|\s)$/.test(key[at - 1] ?? '') ? 60 : 25;
    score -= Math.min(at, 20) * 0.5;
    if (bonusOf) score += bonusOf(item);
    out.push({ item, score });
  }
  return out.sort((a, b) => b.score - a.score).map((x) => x.item);
}

/** სრული პროფილი და შეფასებული ბიზნესი ძებნაშიც წინ დგება */
const scoreBusiness = (b) => (b.tier ?? 0) * 6 + Math.min(b.ratingCount ?? 0, 50) * 0.2;

/* ─── L2: Meilisearch (არასავალდებულო) ────────────────────── */

export async function searchRemote(term, { limit = 20 } = {}) {
  if (!HAS_MEILI || term.trim().length < 2) return null;
  try {
    const res = await fetch(`${MEILI.host.replace(/\/$/, '')}/multi-search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${MEILI.key}` },
      body: JSON.stringify({
        queries: [
          { indexUid: 'businesses', q: term, limit },
          { indexUid: 'items', q: term, limit },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const [biz, items] = data.results ?? [];
    return {
      businesses: biz?.hits ?? [],
      items: items?.hits ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * გაერთიანებული ძებნა — ლოკალური მყისვე, დისტანციური მოგვიანებით.
 * @param {(result:object)=>void} onUpdate ორჯერ გამოიძახება, თუ L2 ჩართულია
 */
export async function search(term, onUpdate, opts = {}) {
  await loadCity();
  const local = searchLocal(term, opts);
  onUpdate({ ...local, stage: 'local' });

  // პროდუქტების ინდექსი ცალკე იტვირთება — შედეგი მეორე ტალღად მოდის
  await loadItems();
  const products = searchItems(term, { limit: opts.itemLimit ?? 6 });
  const withItems = { ...local, products: products.items, related: products.related, stage: 'items' };
  if (products.items.length) onUpdate(withItems);

  if (!HAS_MEILI) return withItems;
  const remote = await searchRemote(term);
  if (!remote) return withItems;

  const seen = new Set(local.businesses.map((b) => b.id));
  const extra = (remote.businesses ?? [])
    .filter((h) => !seen.has(h.id))
    .map((h) => getState().byId.get(h.id) ?? h);

  const merged = {
    ...withItems,
    businesses: [...local.businesses, ...extra],
    stage: 'remote',
  };
  onUpdate(merged);
  return merged;
}

/** ხაზგასმა შედეგში — უსაფრთხოდ, ესკეიპის შემდეგ */
export function highlight(text, term) {
  const t = String(text ?? '');
  const q = term.trim();
  if (q.length < 2) return escapeHtml(t);
  const at = searchKey(t).indexOf(searchKey(q));
  if (at === -1 || at >= t.length) return escapeHtml(t);
  const end = Math.min(at + q.length, t.length);
  return `${escapeHtml(t.slice(0, at))}<mark>${escapeHtml(t.slice(at, end))}</mark>${escapeHtml(t.slice(end))}`;
}

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export { STATIC_ENTRIES };
