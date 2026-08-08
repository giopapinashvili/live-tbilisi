#!/usr/bin/env node
/**
 * OpenStreetMap → Firestore იმპორტი.
 *
 *   node scripts/osm-import.mjs --dry            # მხოლოდ დათვლა, ჩაწერის გარეშე
 *   node scripts/osm-import.mjs --limit 500      # ტესტისთვის
 *   node scripts/osm-import.mjs                  # სრული იმპორტი
 *
 * ⚠ ლიცენზია: OSM-ის მონაცემი ODbL-ია. attribution სავალდებულოა
 *   (უკვე ჩაშენებულია საიტის ძირში) და share-alike-ის ინტერპრეტაცია
 *   იურისტთან უნდა შემოწმდეს გაშვებამდე.
 *
 * ⚠ Overpass საჯარო სერვერია. ერთი დიდი მოთხოვნა დღეში — მისაღები;
 *   ციკლში ხშირი გამოძახება — არა.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { OSM_INDEX, CITY, DISTRICTS } from '../src/data/taxonomy.js';
import { slugify, searchKey } from '../src/lib/format.js';

const OVERPASS = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
const CACHE = path.resolve('.cache/overpass-tbilisi.json');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || Infinity;
const FRESH = args.includes('--fresh');

/* ─── Overpass ─────────────────────────────────────────────── */

/**
 * მოთხოვნები ჯგუფებად.
 *
 * ერთ დიდ მოთხოვნად რომ გავაერთიანოთ, Overpass მთელ თბილისზე
 * დროს ამოწურავს და ცარიელს დააბრუნებს. ჯგუფებად კი თითოეული
 * მსუბუქია და თუ ერთი ჩავარდა, დანარჩენი მაინც მოდის.
 *
 * relation-იც შედის: დიდი პარკი, ბაზრობა და სავაჭრო ცენტრი
 * ხშირად relation-ია, არა node ან way — და სწორედ ისინი
 * გამოგვრჩებოდა.
 */
const GROUPS = [
  ['კვება და მაღაზია',   ['amenity', 'shop']],
  ['ოფისი და სერვისი',   ['office', 'craft', 'healthcare']],
  ['დასვენება და ტურიზმი', ['leisure', 'tourism', 'sport']],
  ['ტრანსპორტი',         ['public_transport', 'railway', 'aeroway']],
  ['კულტურა და ისტორია', ['historic', 'man_made', 'club']],
  ['ბუნება და საზოგადო', ['natural', 'emergency', 'military', 'landuse']],
];

function queryFor(keys) {
  const b = bbox();
  const parts = keys.flatMap((k) => [
    `node["${k}"](${b});`,
    `way["${k}"](${b});`,
    `relation["${k}"](${b});`,
  ]);
  return `[out:json][timeout:600];\n(\n${parts.join('\n')}\n);\nout center tags;`;
}

// ავტობუსის გაჩერება ცალკეა: highway=bus_stop ძალიან ბევრია და
// მას საკუთარი მოთხოვნა სჭირდება, თორემ დანარჩენს აჭედავს
const EXTRA = [
  ['გაჩერებები', `[out:json][timeout:600];
(
  node["highway"="bus_stop"](${'${bbox()}'});
  node["railway"="tram_stop"](${'${bbox()}'});
  node["railway"="subway_entrance"](${'${bbox()}'});
  node["amenity"="bus_station"](${'${bbox()}'});
);
out center tags;`],
];

function bbox() {
  const [w, s, e, n] = CITY.bbox;
  return `${s},${w},${n},${e}`;   // Overpass: south,west,north,east
}

async function fetchOverpass() {
  if (!FRESH) {
    try {
      const cached = JSON.parse(await fs.readFile(CACHE, 'utf8'));
      console.log(`📦 ქეშიდან: ${cached.elements.length} ელემენტი (--fresh ახლის ჩამოსატვირთად)`);
      return cached;
    } catch { /* ქეში არ არსებობს */ }
  }

  console.log('🌍 Overpass — ექვსი ჯგუფი, თითო 1-3 წუთი.\n');

  const seen = new Map();          // id → ელემენტი, დუბლის გარეშე

  for (const [label, keys] of GROUPS) {
    process.stdout.write(`   ${label}… `);
    try {
      const els = await ask(queryFor(keys));
      let added = 0;
      for (const e of els) {
        const key = `${e.type}${e.id}`;
        if (!seen.has(key)) { seen.set(key, e); added++; }
      }
      console.log(`${els.length} (ახალი ${added})`);
    } catch (err) {
      // ერთი ჯგუფის ჩავარდნა დანარჩენს არ აჩერებს — ნაწილობრივი
      // შედეგი ბევრად სჯობს ნულს
      console.log(`ჩავარდა: ${err.message}`);
    }
    await sleep(3000);             // Overpass-ს სუნთქვა სჭირდება
  }

  const data = { elements: [...seen.values()] };
  await fs.mkdir(path.dirname(CACHE), { recursive: true });
  await fs.writeFile(CACHE, JSON.stringify(data));
  console.log(`\n✅ სულ ${data.elements.length} უნიკალური ობიექტი → ${CACHE}`);
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ერთი მოთხოვნა, სამი ცდით — Overpass ხშირად დროებით უარს ამბობს */
async function ask(query, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(OVERPASS, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.elements ?? [];
    } catch (err) {
      if (i === tries) throw err;
      await sleep(i * 10000);      // 10წმ, 20წმ
    }
  }
  return [];
}

/* ─── OSM → ჩვენი მოდელი ───────────────────────────────────── */

/** OSM ტეგებიდან კატეგორია. cuisine=* უფრო ზუსტია, ამიტომ ჯერ ის. */
function classify(tags) {
  const probe = [
    tags.cuisine ? `cuisine=${tags.cuisine.split(';')[0]}` : null,
    tags.healthcare ? `healthcare=${tags.healthcare}` : null,
    tags.shop ? `shop=${tags.shop}` : null,
    tags.amenity ? `amenity=${tags.amenity}` : null,
    tags.leisure ? `leisure=${tags.leisure}` : null,
    tags.tourism ? `tourism=${tags.tourism}` : null,
    tags.office ? `office=${tags.office}` : null,
    tags.craft ? `craft=${tags.craft}` : null,
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

/**
 * OSM-ის `opening_hours` → ჩვენი ფორმატი.
 * სპეციფიკაცია ძალიან მდიდარია; აქ მხოლოდ გავრცელებულ ფორმებს ვცნობთ
 * და ეჭვის შემთხვევაში `null`-ს ვაბრუნებთ. ცუდი მონაცემი უარესია,
 * ვიდრე მისი არარსებობა — მომხმარებელი დახურულ კარს მიადგება.
 */
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_ALIAS = { mo: 'mon', tu: 'tue', we: 'wed', th: 'thu', fr: 'fri', sa: 'sat', su: 'sun' };

function parseHours(raw) {
  if (!raw) return { hours: null, alwaysOpen: false };
  const value = raw.trim().toLowerCase();
  if (value === '24/7') return { hours: null, alwaysOpen: true };
  if (/(ph|su|off|closed|sunrise|sunset|week|easter)/.test(value) && !/^\w{2}(-\w{2})?[\s,]/.test(value)) {
    // ზედმეტად რთული — არ ვცდილობთ გამოცნობას
    if (!/\d{1,2}:\d{2}/.test(value)) return { hours: null, alwaysOpen: false };
  }

  const out = Object.fromEntries(DAYS.map((d) => [d, []]));
  let matched = false;

  for (const chunk of value.split(';')) {
    const m = chunk.trim().match(/^([a-z,\-]+)?\s*((?:\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}[,\s]*)+)$/);
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
    const [a, b] = part.split('-').map((s) => DAY_ALIAS[s.trim().slice(0, 2)]);
    if (!a) continue;
    if (!b) { days.push(a); continue; }
    let i = DAYS.indexOf(a);
    const end = DAYS.indexOf(b);
    if (i === -1 || end === -1) continue;
    while (true) { days.push(DAYS[i]); if (i === end) break; i = (i + 1) % 7; }
  }
  return [...new Set(days)];
}

const pad = (t) => (t.length === 4 ? `0${t}` : t);

/** უახლოესი რაიონი კამერის ცენტრებით — უხეში, მაგრამ საკმარისი საწყისად */
function guessDistrict(lat, lon) {
  let best = null; let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dd = (d.center[0] - lon) ** 2 + (d.center[1] - lat) ** 2;
    if (dd < bestD) { bestD = dd; best = d.id; }
  }
  return best;
}

function toBusiness(elem) {
  const tags = elem.tags ?? {};
  const name = (tags['name:ka'] ?? tags.name ?? '').trim();
  if (!name) return null;                       // უსახელო ობიექტი კატალოგისთვის უსარგებლოა

  const hit = classify(tags);
  if (!hit) return null;

  const lat = elem.lat ?? elem.center?.lat;
  const lon = elem.lon ?? elem.center?.lon;
  if (lat == null || lon == null) return null;

  const { hours, alwaysOpen } = parseHours(tags.opening_hours);
  const phone = [tags.phone, tags['contact:phone']].filter(Boolean)
    .flatMap((p) => p.split(';')).map((p) => p.replace(/\s/g, '')).slice(0, 3);

  const attrs = {};
  if (tags.wheelchair === 'yes') attrs.wheelchair = true;
  if (tags.internet_access === 'wlan' || tags['internet_access:fee'] === 'no') attrs.wifi = true;
  if (tags.outdoor_seating === 'yes') attrs.outdoor = true;
  if (tags.takeaway === 'yes') attrs.takeaway = true;
  if (tags.delivery === 'yes') attrs.delivery = true;
  if (tags['payment:cards'] === 'yes' || tags['payment:visa'] === 'yes') attrs.cards = true;
  if (tags['diet:vegan'] === 'yes') attrs.vegan = true;
  if (alwaysOpen) attrs.open24 = true;

  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');

  return {
    osmId: `${elem.type}/${elem.id}`,
    slug: `${slugify(name)}-${String(elem.id).slice(-5)}`,
    name: { ka: name, en: tags['name:en'] ?? '' },
    category: hit.category,
    subcategories: hit.subcategories,
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
    district: guessDistrict(lat, lon),
    address: street ? { ka: street } : null,
    hours,
    alwaysOpen,
    phone,
    website: tags.website ?? tags['contact:website'] ?? '',
    attrs,
    attrList: Object.keys(attrs),
    searchName: searchKey(name),
    tier: 0,
    source: 'osm',
    status: 'active',
  };
}

/* ─── Firestore ჩაწერა ─────────────────────────────────────── */

async function writeToFirestore(list) {
  const { initializeApp, cert, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore, GeoPoint, FieldValue } = await import('firebase-admin/firestore');
  const geofire = await import('geofire-common');

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let credential;
  try {
    credential = keyPath
      ? cert(JSON.parse(await fs.readFile(path.resolve(keyPath), 'utf8')))
      : applicationDefault();
  } catch (err) {
    throw new Error(
      'service account ვერ ჩაიტვირთა. დააყენე GOOGLE_APPLICATION_CREDENTIALS '
      + `და ჩამოტვირთე გასაღები Firebase Console-იდან.\n${err.message}`,
    );
  }

  initializeApp({ credential, projectId: process.env.FB_PROJECT_ID });
  const db = getFirestore();

  // არსებული osmId-ები — განმეორებითი გაშვება არაფერს დუბლირებს
  console.log('🔍 არსებული ჩანაწერების შემოწმება…');
  const existing = new Map();
  const snap = await db.collection('businesses').select('osmId').get();
  snap.forEach((d) => { if (d.data().osmId) existing.set(d.data().osmId, d.id); });
  console.log(`   ბაზაში უკვე ${existing.size} OSM ჩანაწერია`);

  let created = 0; let updated = 0;
  const CHUNK = 400;                            // Firestore batch-ის ლიმიტი 500

  for (let i = 0; i < list.length; i += CHUNK) {
    const batch = db.batch();
    for (const b of list.slice(i, i + CHUNK)) {
      const payload = {
        ...b,
        loc: new GeoPoint(b.lat, b.lon),
        geohash: geofire.geohashForLocation([b.lat, b.lon]),
        rating: { avg: 0, count: 0, sum: 0 },
        viewCount: 0,
        updatedAt: FieldValue.serverTimestamp(),
      };
      delete payload.lat;
      delete payload.lon;

      const id = existing.get(b.osmId);
      if (id) {
        // არსებულს ვაახლებთ მხოლოდ OSM-ის ველებით — ხელით შეყვანილს არ ვშლით
        batch.set(db.collection('businesses').doc(id), {
          osmId: payload.osmId, loc: payload.loc, geohash: payload.geohash,
          updatedAt: payload.updatedAt,
        }, { merge: true });
        updated++;
      } else {
        batch.set(db.collection('businesses').doc(), {
          ...payload, createdAt: FieldValue.serverTimestamp(),
        });
        created++;
      }
    }
    await batch.commit();
    process.stdout.write(`\r   ჩაწერილია ${Math.min(i + CHUNK, list.length)}/${list.length}`);
  }
  console.log(`\n✅ დაემატა ${created}, განახლდა ${updated}`);
}

/* ─── გაშვება ──────────────────────────────────────────────── */

(async () => {
  const data = await fetchOverpass();

  const skipped = { noName: 0, noCategory: 0, noCoords: 0 };
  const list = [];
  for (const elem of data.elements) {
    const b = toBusiness(elem);
    if (b) { list.push(b); continue; }
    const tags = elem.tags ?? {};
    if (!(tags['name:ka'] ?? tags.name)) skipped.noName++;
    else if (!classify(tags)) skipped.noCategory++;
    else skipped.noCoords++;
  }

  const final = list.slice(0, LIMIT);

  console.log('\n─── შედეგი ───────────────────────────────');
  console.log(`OSM ელემენტი:        ${data.elements.length}`);
  console.log(`ვარგისი ობიექტი:     ${list.length}`);
  console.log(`  სახელის გარეშე:    ${skipped.noName}`);
  console.log(`  კატეგორიის გარეშე: ${skipped.noCategory}`);
  console.log(`  კოორდინატის გარეშე:${skipped.noCoords}`);
  console.log(`საათებით:            ${list.filter((b) => b.hours || b.alwaysOpen).length}`);
  console.log(`ტელეფონით:           ${list.filter((b) => b.phone.length).length}`);
  console.log(`საიტით:              ${list.filter((b) => b.website).length}`);

  const byCat = {};
  for (const b of list) byCat[b.category] = (byCat[b.category] ?? 0) + 1;
  console.log('\nკატეგორიები:');
  for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(12)} ${v}`);
  }

  if (DRY) {
    await fs.mkdir('.cache', { recursive: true });
    await fs.writeFile('.cache/osm-preview.json', JSON.stringify(final.slice(0, 20), null, 2));
    console.log('\n🔎 --dry: ჩაწერა არ მოხდა. ნიმუში: .cache/osm-preview.json');
    return;
  }

  console.log(`\n📤 Firestore-ში ჩაწერა (${final.length})…`);
  await writeToFirestore(final);
})().catch((err) => {
  console.error('\n❌', err.message);
  process.exitCode = 1;
});
