#!/usr/bin/env node
/**
 * სტატიკური ბანდლების გენერაცია.
 *
 *   node scripts/build-bundles.mjs              # → public/bundles/
 *   node scripts/build-bundles.mjs --out dist   # სხვა საქაღალდეში
 *
 * რატომ: რუკამ 30,000 პინი Firestore-იდან რომ წაიკითხოს, ერთი
 * მომხმარებელი დღიურ ლიმიტს ამოწურავს. ამის ნაცვლად მონაცემი
 * ერთხელ იწერება სტატიკურ JSON-ებად და CDN-ით ირიგდება.
 * იხ. ARCHITECTURE.md §2 და §6.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { encodeRow, normalize, BUNDLE_FIELDS } from '../src/lib/schema.js';
import { DISTRICTS, CATEGORIES } from '../src/data/taxonomy.js';

const args = process.argv.slice(2);
const OUT = path.resolve(args[args.indexOf('--out') + 1] || 'public/bundles');
const version = Date.now().toString(36);

async function db() {
  const { initializeApp, cert, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credential = keyPath
    ? cert(JSON.parse(await fs.readFile(path.resolve(keyPath), 'utf8')))
    : applicationDefault();
  initializeApp({ credential, projectId: process.env.FB_PROJECT_ID });
  return getFirestore();
}

const write = async (rel, data) => {
  const file = path.join(OUT, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data));
  return (await fs.stat(file)).size;
};

(async () => {
  console.log('📦 ბანდლების აწყობა…');
  const store = await db();

  const snap = await store.collection('businesses').where('status', '==', 'active').get();
  console.log(`   ${snap.size} აქტიური ბიზნესი`);

  const all = [];
  const byDistrict = new Map(DISTRICTS.map((d) => [d.id, []]));
  const byCategory = new Map(CATEGORIES.map((c) => [c.id, []]));
  const unassigned = [];

  snap.forEach((doc) => {
    const b = normalize(doc.id, doc.data());
    if (b.lat == null || b.lon == null) return;
    const row = encodeRow(b);
    all.push(row);
    (byDistrict.get(b.district) ?? unassigned).push(row);
    byCategory.get(b.category)?.push(row);
  });

  let total = 0;

  // უბნების ბანდლები — რუკა მხოლოდ საჭიროს ტვირთავს
  for (const [id, rows] of byDistrict) {
    total += await write(`d/${id}.json`, { version, district: id, count: rows.length, rows });
  }
  if (unassigned.length) {
    total += await write('d/_other.json', { version, district: null, count: unassigned.length, rows: unassigned });
  }

  // კატეგორიების ბანდლები — კატალოგის გვერდებისთვის
  for (const [id, rows] of byCategory) {
    total += await write(`c/${id}.json`, { version, category: id, count: rows.length, rows });
  }

  // სრული სია — მცირე ბაზაზე ერთი მოთხოვნა უფრო სწრაფია
  total += await write('all.json', { version, count: all.length, rows: all });

  // მანიფესტი
  const districts = [...byDistrict.keys(), ...(unassigned.length ? ['_other'] : [])];
  total += await write('index.json', {
    version,
    generatedAt: new Date().toISOString(),
    fields: BUNDLE_FIELDS,
    count: all.length,
    districts,
    categories: [...byCategory.keys()],
    counts: {
      byDistrict: Object.fromEntries([...byDistrict].map(([k, v]) => [k, v.length])),
      byCategory: Object.fromEntries([...byCategory].map(([k, v]) => [k, v.length])),
    },
  });

  // აქტიური აქციები
  const promoSnap = await store.collection('promos').where('active', '==', true).get()
    .catch(() => null);
  if (promoSnap) {
    const promos = promoSnap.docs.map((d) => {
      const p = d.data();
      return {
        id: d.id, businessId: p.businessId, title: p.title, descr: p.descr,
        photo: p.photo ?? '', endsAt: p.endsAt?.toDate?.()?.toISOString() ?? null,
      };
    });
    total += await write('promos/active.json', { version, promos });
    console.log(`   ${promos.length} აქტიური აქცია`);
  }

  console.log(`✅ ${OUT}`);
  console.log(`   ${all.length} ჩანაწერი · ${(total / 1024).toFixed(0)} KB (gzip-მდე)`);
  console.log(`   ვერსია: ${version}`);
})().catch((err) => {
  console.error('❌', err.message);
  process.exitCode = 1;
});
