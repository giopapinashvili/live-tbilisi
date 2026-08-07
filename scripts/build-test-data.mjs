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
import { OSM_INDEX, DISTRICTS } from '../src/data/taxonomy.js';
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

const rows = businesses.map(encodeRow);
let bytes = 0;

bytes += await write('all.json', { version, count: rows.length, rows });
bytes += await write(`d/${DISTRICT}.json`, { version, district: DISTRICT, count: rows.length, rows });

// თითო ბიზნესის სრული დეტალები — ბიზნესის გვერდისთვის
for (const b of businesses) {
  bytes += await write(`b/${b.id}.json`, { ...b, items: [], promos: [] });
}

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
console.log(`   tier 1: ${businesses.filter((b) => b.tier >= 1).length}`);
console.log('\n   კატეგორიები:');
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`     ${k.padEnd(12)} ${v}`);
}
