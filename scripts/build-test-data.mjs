#!/usr/bin/env node
/**
 * სატესტო მონაცემის აწყობა OpenStreetMap-ის ექსპორტიდან.
 *
 *   node scripts/build-test-data.mjs            # → public/bundles/
 *   node scripts/build-test-data.mjs --clean    # სატესტო მონაცემის წაშლა
 *
 * ⚠ ეს არის დროებითი მონაცემი სისტემის გასამართად.
 *   Firestore-ს არ ეხება. წასაშლელად: `--clean` ან public/bundles/-ის წაშლა.
 *   ყველა ჩანაწერს აქვს `test: true` და `source: "osm"`.
 *
 * წყარო: OpenStreetMap, ODbL. Attribution საიტის ძირშია.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { OSM_INDEX } from '../src/data/taxonomy.js';
import { MENU_TEMPLATES, SUBCATEGORY_ALIAS, ITEM_COUNT } from '../src/data/menu-templates.js';
import { POST_TEMPLATES, POST_ALIAS, POST_COUNT } from '../src/data/post-templates.js';
import { slugify, searchKey } from '../src/lib/format.js';
import { encodeRow, BUNDLE_FIELDS } from '../src/lib/schema.js';

const IN = path.resolve('data/nadzaladevi-osm.json');
const OUT = path.resolve('public/bundles');
const DISTRICT = 'nadzaladevi';

if (process.argv.includes('--clean')) {
  await fs.rm(OUT, { recursive: true, force: true });
  console.log('🧹 სატესტო მონაცემი წაშლილია:', OUT);
  process.exit(0);
}

/* ─── OSM ტეგები → ჩვენი კატეგორია ─────────────────────────── */

function classify(t) {
  const probe = [
    t.cuisine && `cuisine=${String(t.cuisine).split(';')[0]}`,
    t.healthcare && `healthcare=${t.healthcare}`,
    t.shop && `shop=${String(t.shop).split(';')[0]}`,
    t.amenity && `amenity=${t.amenity}`,
    t.leisure && `leisure=${t.leisure}`,
    t.tourism && `tourism=${t.tourism}`,
    t.office && `office=${t.office}`,
    t.craft && `craft=${t.craft}`,
  ].filter(Boolean);

  const subs = [];
  let category = null;
  for (const key of probe) {
    const hit = OSM_INDEX[key];
    if (!hit) continue;
    category ??= hit.category;
    if (hit.category === category && !subs.includes(hit.subcategory)) subs.push(hit.subcategory);
  }
  return category ? { category, subcategories: subs.slice(0, 4) } : null;
}

/* ─── opening_hours → ჩვენი ფორმატი ────────────────────────── */

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const ALIAS = { mo: 'mon', tu: 'tue', we: 'wed', th: 'thu', fr: 'fri', sa: 'sat', su: 'sun' };
const pad = (t) => (t.length === 4 ? `0${t}` : t);

function parseHours(raw) {
  if (!raw) return { hours: null, alwaysOpen: false };
  const v = String(raw).trim().toLowerCase();
  if (v === '24/7') return { hours: null, alwaysOpen: true };

  const out = Object.fromEntries(DAYS.map((d) => [d, []]));
  let matched = false;

  for (const chunk of v.split(';')) {
    const m = chunk.trim().match(/^([a-z,\-\s]+?)?\s*((?:\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}[,\s]*)+)$/);
    if (!m) continue;
    const days = m[1] ? expandDays(m[1]) : [...DAYS];
    const slots = [...m[2].matchAll(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g)]
      .map((s) => [pad(s[1]), pad(s[2])]);
    if (!days.length || !slots.length) continue;
    matched = true;
    for (const d of days) out[d] = [...out[d], ...slots];
  }
  return matched ? { hours: out, alwaysOpen: false } : { hours: null, alwaysOpen: false };
}

function expandDays(spec) {
  const days = [];
  for (const part of spec.split(',')) {
    const [a, b] = part.trim().split('-').map((s) => ALIAS[s.trim().slice(0, 2)]);
    if (!a) continue;
    if (!b) { days.push(a); continue; }
    let i = DAYS.indexOf(a); const end = DAYS.indexOf(b);
    if (i === -1 || end === -1) continue;
    for (let guard = 0; guard < 8; guard++) { days.push(DAYS[i]); if (i === end) break; i = (i + 1) % 7; }
  }
  return [...new Set(days)];
}

/* ─── ატრიბუტები ───────────────────────────────────────────── */

function attrsOf(t, alwaysOpen) {
  const a = {};
  if (t.wheelchair === 'yes') a.wheelchair = true;
  if (t.outdoor_seating === 'yes') a.outdoor = true;
  if (t.takeaway === 'yes') a.takeaway = true;
  if (t.delivery === 'yes') a.delivery = true;
  if (t['payment:cards'] === 'yes' || t['payment:visa'] === 'yes') a.cards = true;
  if (t['diet:vegan'] === 'yes' || t['diet:vegan'] === 'only') a.vegan = true;
  if (t.internet_access === 'wlan') a.wifi = true;
  if (alwaysOpen) a.open24 = true;
  return a;
}

const phonesOf = (t) => [t.phone, t['contact:phone']]
  .filter(Boolean).flatMap((p) => String(p).split(';'))
  .map((p) => p.replace(/\s+/g, '')).filter(Boolean).slice(0, 3);

/* ─── მენიუს გენერაცია ─────────────────────────────────────────
   დეტერმინირებული: ერთსა და იმავე ბიზნესს ყოველთვის ერთი და იგივე
   მენიუ და ფასები ხვდება, რამდენჯერაც არ უნდა გავუშვათ სკრიპტი.
   ───────────────────────────────────────────────────────────── */

/** მარტივი seed-იანი გენერატორი (mulberry32) */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

/** ფასი დიაპაზონიდან, 10 თეთრზე დამრგვალებული */
const pickPrice = (r, [min, max]) => Math.round((min + r() * (max - min)) / 10) * 10;

function buildMenu(business) {
  // მხოლოდ ზუსტი ქვეკატეგორია ან მისი აშკარა სინონიმი — fallback არ არსებობს
  const key = business.subcategories
    .map((s) => (MENU_TEMPLATES[s] ? s : SUBCATEGORY_ALIAS[s]))
    .find((s) => s && MENU_TEMPLATES[s]);
  const tpl = key && MENU_TEMPLATES[key];
  if (!tpl) return [];

  const r = rng(hash(business.id));
  const want = Math.min(
    tpl.length,
    ITEM_COUNT.min + Math.floor(r() * (ITEM_COUNT.max - ITEM_COUNT.min + 1)),
  );

  // შემთხვევითი, მაგრამ სტაბილური შერჩევა
  const pool = tpl.map((t, i) => ({ t, k: r(), i }))
    .sort((a, b) => a.k - b.k)
    .slice(0, want)
    .sort((a, b) => a.i - b.i);           // ორიგინალი თანმიმდევრობა აღდგება

  const groups = [...new Set(pool.map((x) => x.t.g))];

  return pool.map(({ t }, order) => {
    const price = pickPrice(r, t.p);
    const onSale = r() < 0.08;            // ~8%-ს აქვს ფასდაკლება
    return {
      id: `i${order + 1}`,
      name: { ka: t.n },
      group: t.g,
      groupOrder: groups.indexOf(t.g),
      order,
      catalogId: t.cat,                   // მომავალი კატალოგის ხისთვის
      price,
      oldPrice: onSale ? Math.round((price * 1.2) / 10) * 10 : null,
      currency: 'GEL',
      unit: t.u ?? '',
      ingredients: t.ing ?? [],
      attrs: t.d ? { duration: t.d } : {},
      available: true,
      demo: true,                         // ← უხილავი ნიშანი, წაშლისთვის
    };
  });
}

/* ─── პოსტების გენერაცია ───────────────────────────────────
   მხოლოდ შერჩეულ ბიზნესებს — ფიდის საჩვენებლად საკმარისია და
   ბანდლიც არ იბერება. */

function buildPosts(business, items, seedOffset) {
  const key = business.subcategories
    .map((s) => (POST_TEMPLATES[s] ? s : POST_ALIAS[s]))
    .find((s) => s && POST_TEMPLATES[s]);
  const tpl = key && POST_TEMPLATES[key];
  if (!tpl) return [];

  const r = rng(hash(business.id) + seedOffset);
  const want = Math.min(tpl.length, POST_COUNT.min + Math.floor(r() * (POST_COUNT.max - POST_COUNT.min + 1)));

  const picked = tpl.map((t, i) => ({ t, k: r(), i }))
    .sort((a, b) => a.k - b.k).slice(0, want);

  const now = Date.now();
  return picked.map(({ t }, n) => {
    const item = items.length ? items[Math.floor(r() * items.length)] : null;
    const text = t.text
      .replace('{item}', item ? item.name.ka : 'ახალი პოზიცია')
      .replace('{price}', item ? `${(item.price / 100).toFixed(2).replace(/\.00$/, '')} ₾` : '');
    // ბოლო 5 დღეში გაფანტული
    const createdAt = now - Math.floor(r() * 5 * 86400000) - n * 3600000;
    return {
      // id გლობალურად უნიკალური უნდა იყოს: „p1" 60 ბიზნესს ჰქონდა და
      // მოწონება, კომენტარი და ფანჯარა სულ სხვა პოსტს ხვდებოდა
      id: `${business.id}_p${n + 1}`,
      businessId: business.id,
      kind: t.kind,
      text,
      itemId: item?.id ?? null,
      catalogId: item?.catalogId ?? null,
      likeCount: Math.floor(r() * 40),
      commentCount: Math.floor(r() * 8),
      createdAt,
      demo: true,
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

/* ─── გაშვება ──────────────────────────────────────────────── */

const src = JSON.parse(await fs.readFile(IN, 'utf8'));
console.log(`📥 ${src.count} ობიექტი — ${src.area}`);

const businesses = [];
const skipped = { noCategory: 0 };
const usedSlugs = new Set();

for (const el of src.items) {
  const t = el.t ?? {};
  const name = (t['name:ka'] ?? t.name ?? '').trim();
  if (!name) continue;

  const hit = classify(t);
  if (!hit) { skipped.noCategory++; continue; }

  const { hours, alwaysOpen } = parseHours(t.opening_hours);
  const attrs = attrsOf(t, alwaysOpen);
  const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');

  let slug = slugify(name);
  if (usedSlugs.has(slug)) slug = `${slug}-${el.i.slice(-4)}`;
  usedSlugs.add(slug);

  businesses.push({
    id: el.i,
    slug,
    name,
    nameKa: name,
    descr: t.description ?? '',
    lat: el.la,
    lon: el.lo,
    district: DISTRICT,
    address: street,
    addressNote: t.level ? `სართული ${t.level}` : '',
    category: hit.category,
    subcategories: hit.subcategories,
    hours,
    alwaysOpen,
    phone: phonesOf(t),
    email: t.email ?? t['contact:email'] ?? '',
    website: t.website ?? t['contact:website'] ?? '',
    social: {
      fb: t['contact:facebook'] ?? '',
      ig: t['contact:instagram'] ?? '',
    },
    cover: '',
    photos: [],
    attrs,
    attrList: Object.keys(attrs),
    priceLevel: null,
    ratingAvg: 0,
    ratingCount: 0,
    tier: (phonesOf(t).length || t.website) && (hours || alwaysOpen) ? 1 : 0,
    source: 'osm',
    osmId: el.i,
    status: 'active',
    test: true,                       // ← სატესტო ნიშანი
    searchName: searchKey(name),
    updatedAt: src.fetchedAt,
  });
}

/* ─── ფაილების ჩაწერა ──────────────────────────────────────── */

await fs.rm(OUT, { recursive: true, force: true });
const version = `test-${Date.now().toString(36)}`;
const write = async (rel, data) => {
  const file = path.join(OUT, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data));
  return (await fs.stat(file)).size;
};

let bytes = 0;

// ვინ მიიღებს პოსტებს — მხოლოდ ის ბიზნესები, რომლებსაც მენიუც აქვთ
// და კონტაქტიც. 60 საკმარისია ფიდის საჩვენებლად.
const POST_LIMIT = 60;
let postSlots = POST_LIMIT;

// თითო ბიზნესის სრული დეტალები + მენიუ + პოსტები
let withMenu = 0;
let withPosts = 0;
const allItems = [];
const allPosts = [];

for (const b of businesses) {
  const items = buildMenu(b);
  if (items.length) {
    withMenu++;
    b.tier = Math.max(b.tier, 2);
    // ძებნის ინდექსისთვის: [სახელი, catalogId, ბიზნესის id, ფასი, ჯგუფი, ინგრედიენტები, ერთეული]
    for (const it of items) {
      allItems.push([it.name.ka, it.catalogId, b.id, it.price, it.group, it.ingredients ?? [], it.unit ?? '']);
    }
  }

  let posts = [];
  if (postSlots > 0 && items.length && (b.phone.length || b.hours || b.alwaysOpen)) {
    posts = buildPosts(b, items, 7);
    if (posts.length) { postSlots--; withPosts++; allPosts.push(...posts); }
  }

  bytes += await write(`b/${b.id}.json`, { ...b, items, posts, promos: [] });
}

// ფიდის ნაკადი — ერთი ფაილი, ყველა პოსტი დროის მიხედვით
allPosts.sort((a, z) => z.createdAt - a.createdAt);
bytes += await write('posts.json', { version, count: allPosts.length, posts: allPosts });

// ძებნის ინდექსი — ცალკე ფაილი, იტვირთება მხოლოდ პირველ ძებნაზე
bytes += await write('items.json', {
  version,
  fields: ['name', 'catalogId', 'businessId', 'price', 'group', 'ingredients', 'unit'],
  count: allItems.length,
  items: allItems,
});

// მწკრივები მენიუს შემდეგ იწერება — tier უკვე განახლებულია
const rows = businesses.map(encodeRow);
bytes += await write('all.json', { version, count: rows.length, rows });
bytes += await write(`d/${DISTRICT}.json`, { version, district: DISTRICT, count: rows.length, rows });

bytes += await write('index.json', {
  version,
  generatedAt: new Date().toISOString(),
  fields: BUNDLE_FIELDS,
  count: rows.length,
  districts: [DISTRICT],
  categories: [...new Set(businesses.map((b) => b.category))],
  test: true,
  note: 'სატესტო მონაცემი OpenStreetMap-იდან. წასაშლელად: npm run test-data:clean',
});

/* ─── ანგარიში ─────────────────────────────────────────────── */

const byCat = {};
for (const b of businesses) byCat[b.category] = (byCat[b.category] ?? 0) + 1;

console.log(`\n✅ ${businesses.length} ბიზნესი → ${OUT}`);
console.log(`   ${(bytes / 1024).toFixed(0)} KB · ვერსია ${version}`);
console.log(`   კატეგორიის გარეშე გამოტოვდა: ${skipped.noCategory}`);
console.log(`   საათებით: ${businesses.filter((b) => b.hours || b.alwaysOpen).length}`);
console.log(`   ტელეფონით: ${businesses.filter((b) => b.phone.length).length}`);
console.log(`   მისამართით: ${businesses.filter((b) => b.address).length}`);
console.log(`   მენიუთი: ${withMenu} ბიზნესი · ${allItems.length} პოზიცია`);
console.log(`   პოსტებით: ${withPosts} ბიზნესი · ${allPosts.length} პოსტი`);
console.log(`   tier 1+: ${businesses.filter((b) => b.tier >= 1).length} · tier 2: ${businesses.filter((b) => b.tier >= 2).length}`);
console.log('\n   კატეგორიები:');
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`     ${k.padEnd(12)} ${v}`);
}
