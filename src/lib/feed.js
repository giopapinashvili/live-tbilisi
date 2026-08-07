/**
 * ფიდის აწყობა.
 *
 * ⚠ მთავარი იდეა: ფიდი მარტო პოსტებისგან არ შედგება.
 *
 * პლატფორმის დასაწყისში პოსტი არავის დაუდია — და ცარიელი ფიდი
 * უარესია, ვიდრე ფიდის არარსებობა. ამიტომ ნაკადი ორი წყაროდან იკრიბება:
 *
 *   1. ბიზნესების ნამდვილი პოსტები — როცა გაჩნდება, ყოველთვის ზემოთ
 *   2. რეალური მონაცემიდან აწყობილი ბარათები — ღია ადგილები ახლოს,
 *      პროდუქტები, ახალი ჩანაწერები
 *
 * მეორე ნაწილი არაფერს იგონებს: ყველა ბარათს რეალური ბიზნესი და
 * რეალური ფასი უდგას უკან. როცა ნამდვილი პოსტები მოვა, ავტომატური
 * ბარათები თანდათან უკან იწევს.
 */

import { BUNDLE_BASE } from './config.js';
import { getState } from './store.js';
import { itemsState, relatedTo } from './items.js';
import { status } from './hours.js';
import { haversine } from './format.js';
import { CATEGORY_MAP, SUBCATEGORY_MAP } from '../data/taxonomy.js';

/* ─── ვიზუალი ფოტოს გარეშე ──────────────────────────────────
   ფოტოები ჯერ არ გვაქვს. ცარიელი ნაცრისფერი მართკუთხედის ნაცვლად
   კატეგორიის ემოჯი და ფერადი ფონი — ცოცხალია და პატიოსანი. */

const EMOJI = {
  // საკვები
  shawarma: '🌯', hotdog: '🌭', fries: '🍟', burger: '🍔', pizza: '🍕',
  bakery: '🥖', bread: '🍞', cafe: '☕', coffee: '☕', restaurant: '🍽️',
  georgian: '🍲', khinkali: '🥟', dessert: '🍰', bar: '🍺', club: '🎧',
  wine: '🍷', sushi: '🍣', fastfood: '🍔', butcher: '🥩', grocery: '🛒',
  supermarket: '🛒', market: '🧺',
  // ჯანმრთელობა
  pharmacy: '💊', clinic: '🏥', hospital: '🏥', dentist: '🦷', doctor: '🩺',
  lab: '🧪', optics: '👓', vet: '🐾', medsupply: '🩹',
  // სილამაზე
  hairdresser: '💇', barber: '💈', nails: '💅', spa: '🧖', massage: '💆',
  tattoo: '🖋️', cosmetology: '✨', bathhouse: '♨️',
  // მაღაზია
  clothing: '👕', shoes: '👟', electronics: '📺', phones: '📱', computers: '💻',
  furniture: '🛋️', jewelry: '💍', cosmetics: '💄', books: '📚', toys: '🧸',
  sport: '⚽', construction: '🧱', hardware: '🔨', flowers: '💐', pet: '🐕',
  mall: '🏬', appliances: '🔌',
  // ავტო
  gas: '⛽', carwash: '🧼', tires: '🛞', carservice: '🔧', parts: '⚙️',
  parking: '🅿️', dealer: '🚗', charging: '🔋', inspection: '📋',
  // სხვა
  university: '🎓', school: '🏫', kindergarten: '🧒', courses: '📖',
  language: '🗣️', library: '📚', gym: '🏋️', pool: '🏊', cinema: '🎬',
  park: '🌳', hotel: '🏨', bank: '🏦', atm: '🏧', post: '📮',
  church: '⛪', police: '🚓', laundry: '🧺', repair: '🛠️', printing: '🖨️',
};

const CAT_EMOJI = {
  food: '🍽️', shopping: '🛍️', health: '💊', beauty: '💇', services: '🛠️',
  auto: '🚗', education: '🎓', leisure: '🎭', hotel: '🏨', transport: '🚌',
  public: '🏛️', business: '💼',
};

export function emojiFor(business) {
  for (const s of business.subcategories ?? []) if (EMOJI[s]) return EMOJI[s];
  return CAT_EMOJI[business.category] ?? '📍';
}

export const emojiForCatalog = (catalogId, fallback) => EMOJI[catalogId] ?? fallback ?? '🏷️';

/* ─── პოსტები ──────────────────────────────────────────────── */

let postsPromise;

/** ბიზნესების პოსტები. ცალკე ფაილია, ფიდთან ერთად იტვირთება. */
export function loadPosts() {
  postsPromise ??= (async () => {
    try {
      const res = await fetch(`${BUNDLE_BASE}/posts.json`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.posts ?? [];
    } catch {
      return [];
    }
  })();
  return postsPromise;
}

/* ─── ნაკადის აწყობა ───────────────────────────────────────── */

/**
 * @param {{origin?: [number,number], limit?: number, posts?: Array}} opts
 * @returns {Array} ფიდის ელემენტები
 */
export function buildFeed({ origin = null, limit = 24, posts = [] } = {}) {
  const { businesses } = getState();
  if (!businesses.length) return [];

  const withDistance = businesses.map((b) => ({
    b,
    d: origin ? haversine(origin, [b.lon, b.lat]) : null,
    st: status(b),
  }));

  const open = withDistance.filter((x) => x.st.state === 'open' || x.st.state === 'closing');
  const rich = open.filter((x) => x.b.tier >= 2);

  const byId = new Map(withDistance.map((x) => [x.b.id, x]));
  const feed = [];

  // 1. პოსტები — ბიზნესთან და მანძილთან დაკავშირებული
  for (const p of posts) {
    const x = byId.get(p.businessId);
    if (!x) continue;
    feed.push({
      type: 'post',
      ...p,
      business: x.b,
      distance: x.d,
      state: x.st,
      emoji: emojiForCatalog(p.catalogId, emojiFor(x.b)),
    });
  }

  // 2. ღია ადგილები, სადაც მენიუც არის
  const sorted = (rich.length ? rich : open)
    .sort((a, z) => (origin ? a.d - z.d : (z.b.tier - a.b.tier) || (z.b.ratingCount - a.b.ratingCount)));

  const items = itemsState().items;
  const byBiz = new Map();
  for (const it of items) {
    if (!byBiz.has(it.businessId)) byBiz.set(it.businessId, []);
    byBiz.get(it.businessId).push(it);
  }

  let collectionInserted = false;

  for (const x of sorted) {
    if (feed.length >= limit) break;
    const list = byBiz.get(x.b.id) ?? [];

    feed.push({
      type: 'place',
      business: x.b,
      distance: x.d,
      state: x.st,
      emoji: emojiFor(x.b),
      items: list.slice(0, 6),
      headline: headlineFor(x.b, x.st, list),
    });

    // ყოველ მეხუთე ბარათზე — თემატური კრებული
    if (!collectionInserted && feed.length >= 4 && items.length) {
      const col = buildCollection(byBiz, origin, withDistance);
      if (col) { feed.push(col); collectionInserted = true; }
    }
  }

  return feed;
}

/** ბარათის სათაური — რეალურ ფაქტს ეყრდნობა, არა შემოთხზულს */
function headlineFor(b, st, items) {
  const sub = SUBCATEGORY_MAP[b.subcategories?.[0]]?.ka ?? CATEGORY_MAP[b.category]?.ka ?? '';
  if (st.state === 'closing') return `${sub} · მალე იხურება`;
  if (b.alwaysOpen) return `${sub} · 24 საათი`;
  if (items.length) {
    const min = Math.min(...items.map((i) => i.price));
    return `${sub} · ${(min / 100).toFixed(0)} ₾-დან`;
  }
  return sub;
}

/** „ცომეული ახლოს" ტიპის კრებული — ერთი catalogId, რამდენიმე ადგილი */
// eslint-disable-next-line no-unused-vars
function buildCollection(byBiz, origin, withDistance) {
  const { items } = itemsState();
  if (!items.length) return null;

  const counts = new Map();
  for (const it of items) {
    if (!it.catalogId) continue;
    counts.set(it.catalogId, (counts.get(it.catalogId) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!top.length) return null;

  // დღის მიხედვით სტაბილურად ვირჩევთ — ყოველ განახლებაზე არ ხტება
  const day = Math.floor(Date.now() / 86400000);
  const [catalogId] = top[day % top.length];

  const matching = items.filter((i) => i.catalogId === catalogId);
  const byId = new Map(withDistance.map((x) => [x.b.id, x]));
  const seen = new Set();
  const picks = [];

  for (const it of matching) {
    if (seen.has(it.businessId)) continue;
    const x = byId.get(it.businessId);
    if (!x) continue;
    seen.add(it.businessId);
    picks.push({ item: it, business: x.b, distance: x.d, state: x.st });
  }
  if (picks.length < 3) return null;

  picks.sort((a, b) => (origin ? a.distance - b.distance : a.item.price - b.item.price));

  return {
    type: 'collection',
    catalogId,
    title: matching[0].name,
    emoji: emojiForCatalog(catalogId),
    picks: picks.slice(0, 10),
    related: relatedTo(catalogId, 4),
    count: seen.size,
  };
}

/** Stories ზოლი — ღია ადგილები, რომლებსაც მენიუ აქვთ */
export function buildStories({ origin = null, limit = 14 } = {}) {
  const { businesses } = getState();
  const out = [];
  for (const b of businesses) {
    if (b.tier < 2) continue;
    const st = status(b);
    if (st.state !== 'open' && st.state !== 'closing') continue;
    out.push({ business: b, emoji: emojiFor(b), state: st, d: origin ? haversine(origin, [b.lon, b.lat]) : null });
    if (out.length >= limit * 3) break;
  }
  if (origin) out.sort((a, b) => a.d - b.d);
  return out.slice(0, limit);
}
