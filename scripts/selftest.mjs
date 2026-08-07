#!/usr/bin/env node
/**
 * თვითშემოწმება — წმინდა ლოგიკის მოდულები, ბრაუზერის გარეშე.
 *
 *   npm test
 *
 * ეს არაა სრული ტესტ-სუიტი; ეს არის სწრაფი ბადე იმ შეცდომებისთვის,
 * რომლებიც ყველაზე ხშირად და ყველაზე მტკივნეულად ტყდება:
 * საათების გამოთვლა, ტაქსონომიის მთლიანობა, ბანდლის კოდირება.
 */

import assert from 'node:assert/strict';

import {
  CATEGORIES, CATEGORY_MAP, SUBCATEGORY_MAP, OSM_INDEX,
  DISTRICTS, ATTRIBUTES, attributesFor, CITY,
} from '../src/data/taxonomy.js';
import { status, weekTable, tbilisiNow, WEEK_ORDER } from '../src/lib/hours.js';
import { price, toTetri, slugify, searchKey, searchVariants, keyMatches, matchAt, translit, haversine, distance } from '../src/lib/format.js';
import { encodeRow, decodeRow, normalize, computeTier, validateBusiness, attrsToList } from '../src/lib/schema.js';

let pass = 0; let fail = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ✓ ${name}`); } catch (err) {
    fail++; console.error(`  ✗ ${name}\n    ${err.message}`);
  }
};
const group = (n) => console.log(`\n${n}`);

/* ─── ტაქსონომია ───────────────────────────────────────────── */
group('ტაქსონომია');

test('12 root კატეგორია, უნიკალური id-ებით', () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.equal(ids.length, new Set(ids).size, 'დუბლირებული root id');
  assert.ok(ids.length >= 10);
});

test('ქვეკატეგორიების id-ები უნიკალურია გლობალურად', () => {
  const seen = new Map();
  for (const c of CATEGORIES) {
    for (const s of c.sub) {
      if (seen.has(s.id)) {
        // დუბლი მხოლოდ მაშინაა ნებადართული, თუ სხვადასხვა root-შია და
        // SUBCATEGORY_MAP-ს ერთი მათგანი ეკუთვნის — ეს ორაზროვნებაა
        throw new Error(`"${s.id}" ორჯერაა: ${seen.get(s.id)} და ${c.id}`);
      }
      seen.set(s.id, c.id);
    }
  }
});

test('ყველა კატეგორიას აქვს ქართული სახელი და ხატულა', () => {
  for (const c of CATEGORIES) {
    assert.ok(c.ka?.trim(), `${c.id}: ka აკლია`);
    assert.ok(c.icon?.trim(), `${c.id}: icon აკლია`);
    for (const s of c.sub) assert.ok(s.ka?.trim(), `${c.id}/${s.id}: ka აკლია`);
  }
});

test('SUBCATEGORY_MAP შეესაბამება CATEGORIES-ს', () => {
  const total = CATEGORIES.reduce((n, c) => n + c.sub.length, 0);
  assert.equal(Object.keys(SUBCATEGORY_MAP).length, total);
});

test('OSM ინდექსი აგებულია და კონფლიქტი არ აქვს', () => {
  assert.ok(Object.keys(OSM_INDEX).length > 80, 'ძალიან ცოტა OSM ტეგია');
  for (const [tag, hit] of Object.entries(OSM_INDEX)) {
    assert.ok(CATEGORY_MAP[hit.category], `${tag} → უცნობი კატეგორია`);
    assert.ok(SUBCATEGORY_MAP[hit.subcategory], `${tag} → უცნობი ქვეკატეგორია`);
  }
});

test('10 რაიონი, კოორდინატები ქალაქის საზღვრებში', () => {
  assert.equal(DISTRICTS.length, 10);
  const [w, s, e, n] = CITY.bbox;
  for (const d of DISTRICTS) {
    const [lon, lat] = d.center;
    assert.ok(lon > w && lon < e, `${d.id}: lon საზღვრებს გარეთ`);
    assert.ok(lat > s && lat < n, `${d.id}: lat საზღვრებს გარეთ`);
  }
});

test('ატრიბუტები მიბმულია არსებულ კატეგორიებზე', () => {
  for (const a of ATTRIBUTES) {
    for (const cat of a.for) assert.ok(CATEGORY_MAP[cat], `${a.id} → უცნობი კატეგორია ${cat}`);
  }
  assert.ok(attributesFor('food').length > attributesFor().length);
});

/* ─── საათები ──────────────────────────────────────────────── */
group('სამუშაო საათები');

const at = (dayKey, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return { dayKey, minutes: h * 60 + m };
};

test('24/7 ყოველთვის ღიაა', () => {
  assert.equal(status({ alwaysOpen: true }).state, 'open');
});

test('საათების არარსებობა = უცნობი, არა დახურული', () => {
  assert.equal(status({}).state, 'unknown');
  assert.equal(status({ hours: null }).state, 'unknown');
});

test('ჩვეულებრივი დღე: ღიაა / დაკეტილია', () => {
  const b = { hours: { mon: [['09:00', '18:00']], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] } };
  assert.equal(status(b, at('mon', '12:00')).state, 'open');
  assert.equal(status(b, at('mon', '08:00')).state, 'closed');
  assert.equal(status(b, at('mon', '19:00')).state, 'closed');
  assert.equal(status(b, at('tue', '12:00')).state, 'closed');
});

test('„მალე იხურება" ბოლო საათში', () => {
  const b = { hours: { mon: [['09:00', '18:00']] } };
  assert.equal(status(b, at('mon', '17:30')).state, 'closing');
  assert.equal(status(b, at('mon', '16:30')).state, 'open');
});

test('შესვენება შუადღეს', () => {
  const b = { hours: { mon: [['09:00', '13:00'], ['14:00', '19:00']] } };
  assert.equal(status(b, at('mon', '10:00')).state, 'open');
  assert.equal(status(b, at('mon', '13:30')).state, 'closed');
  assert.equal(status(b, at('mon', '15:00')).state, 'open');
});

test('შუაღამის გადაკვეთა (ბარი 21:00–03:00)', () => {
  const b = { hours: { fri: [['21:00', '03:00']], sat: [] } };
  assert.equal(status(b, at('fri', '23:00')).state, 'open');
  assert.equal(status(b, at('sat', '01:00')).state, 'open', 'ღამის სმენა შაბათ ღამეს');
  assert.equal(status(b, at('sat', '05:00')).state, 'closed');
});

test('weekTable აბრუნებს 7 დღეს სწორი თანმიმდევრობით', () => {
  const rows = weekTable({ hours: { mon: [['09:00', '18:00']] } });
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.map((r) => r.key), WEEK_ORDER);
  assert.equal(rows[0].text, '09:00–18:00');
  assert.equal(rows[1].text, 'დაკეტილია');
});

test('tbilisiNow აბრუნებს ვალიდურ დღეს და წუთს', () => {
  const now = tbilisiNow();
  assert.ok(WEEK_ORDER.includes(now.dayKey), `უცნობი დღე: ${now.dayKey}`);
  assert.ok(now.minutes >= 0 && now.minutes < 1440);
});

/* ─── ფორმატირება ──────────────────────────────────────────── */
group('ფორმატირება');

test('ფასი თეთრებიდან ლარში', () => {
  assert.equal(price(1250), '12.5 ₾');
  assert.equal(price(1200), '12 ₾');
  assert.equal(price(0), '0 ₾');
  assert.equal(price(null), '');
});

test('ლარიდან თეთრებში და უკან', () => {
  assert.equal(toTetri('12.50'), 1250);
  assert.equal(toTetri('12,50'), 1250);
  assert.equal(toTetri('12 ₾'), 1200);
  assert.equal(toTetri('abc'), null);
});

test('ტრანსლიტერაცია და slug', () => {
  assert.equal(translit('ცისქვილი'), 'tsiskvili');
  assert.equal(slugify('ცისქვილი ვაკე'), 'tsiskvili-vake');
  assert.ok(slugify('!!!').length > 0, 'slug არასდროს უნდა იყოს ცარიელი');
});

test('searchKey ქართულსაც და ლათინურსაც ფარავს', () => {
  const key = searchKey('ცისქვილი');
  assert.ok(key.includes('ცისქვილი'));
  assert.ok(key.includes('tsiskvili'));
});


test('searchVariants — query-ს ორივე დამწერლობა', () => {
  assert.deepEqual(searchVariants('ჰოთდოგი'), ['ჰოთდოგი', 'hotdogi']);
  assert.deepEqual(searchVariants('hotdog'), ['hotdog']);
  assert.deepEqual(searchVariants(''), []);
});

test('ნაწილობრივი ძებნა მუშაობს (რეგრესია: „ჰოთდოგი" ვერაფერს პოულობდა)', () => {
  // ინდექსი აიგება searchKey-თ, query — searchVariants-ით.
  // ადრე ორივეს searchKey ამუშავებდა და query ხდებოდა „ჰოთდოგი hotdogi",
  // რომელიც ინდექსში მთლიანად ვერასდროს იძებნებოდა.
  const index = searchKey('ჰოთდოგი ყველით სოსისი ბულკა');
  assert.ok(keyMatches(index, searchVariants('ჰოთდოგი')), 'ქართულად ვერ იპოვა');
  assert.ok(keyMatches(index, searchVariants('hotdog')), 'ლათინურად ვერ იპოვა');
  assert.ok(keyMatches(index, searchVariants('სოსისი')), 'ინგრედიენტით ვერ იპოვა');
  assert.ok(keyMatches(index, searchVariants('ჰოთ')), 'ნაწილობრივ ვერ იპოვა');
  assert.ok(!keyMatches(index, searchVariants('ცემენტი')), 'არასწორი დამთხვევა');
});

test('matchAt აბრუნებს პოზიციას რანჟირებისთვის', () => {
  const index = searchKey('შაურმა ქათმის');
  assert.equal(matchAt(index, searchVariants('შაურმა')), 0);
  assert.ok(matchAt(index, searchVariants('ქათმის')) > 0);
  assert.equal(matchAt(index, searchVariants('ცემენტი')), -1);
});

test('მანძილი', () => {
  const d = haversine([44.7625, 41.7086], [44.8015, 41.7151]);
  assert.ok(d > 3000 && d < 3600, `მოსალოდნელი ~3.3კმ, მივიღეთ ${Math.round(d)}მ`);
  assert.equal(distance(120), '120 მ');
  assert.equal(distance(3300), '3.3 კმ');
});

/* ─── სქემა ────────────────────────────────────────────────── */
group('სქემა');

const sample = {
  id: 'b1', name: 'ცისქვილი', slug: 'tsiskvili', lon: 44.7625, lat: 41.7086,
  category: 'food', subcategories: ['restaurant', 'georgian'],
  tier: 2, ratingAvg: 4.6, ratingCount: 2300,
  attrList: ['parking', 'delivery'], district: 'vake', priceLevel: 3,
};

test('encodeRow → decodeRow ინახავს მონაცემს', () => {
  const back = decodeRow(encodeRow(sample));
  for (const k of ['id', 'name', 'slug', 'category', 'tier', 'district', 'priceLevel']) {
    assert.deepEqual(back[k], sample[k], `${k} დაიკარგა`);
  }
  assert.deepEqual(back.subcategories, sample.subcategories);
  assert.deepEqual(back.attrList, sample.attrList);
  assert.ok(Math.abs(back.lat - sample.lat) < 1e-6);
});

test('normalize უმკლავდება ცარიელ დოკუმენტს', () => {
  const b = normalize('x', {});
  assert.equal(b.id, 'x');
  assert.equal(b.tier, 0);
  assert.deepEqual(b.subcategories, []);
  assert.deepEqual(b.photos, []);
});

test('normalize კითხულობს GeoPoint-ს', () => {
  const b = normalize('x', { loc: { latitude: 41.7, longitude: 44.8 }, name: { ka: 'ტესტი' } });
  assert.equal(b.lat, 41.7);
  assert.equal(b.lon, 44.8);
  assert.equal(b.name, 'ტესტი');
});

test('attrsToList მხოლოდ true-ს იღებს', () => {
  assert.deepEqual(attrsToList({ a: true, b: false, c: true, d: null }), ['a', 'c']);
});

test('computeTier', () => {
  assert.equal(computeTier({}), 0);
  assert.equal(computeTier({ phone: ['+995'], hours: {} }), 1);
  assert.equal(computeTier({ phone: ['+995'], hours: {}, photos: ['x'] }, { ownerClaimed: true }), 2);
});

test('validateBusiness იჭერს აუცილებელ ველებს', () => {
  const e = validateBusiness({ name: { ka: '' }, category: '', lat: null, lon: null });
  assert.ok(e.name && e.category && e.loc);

  const ok = validateBusiness({ name: { ka: 'ა' }, category: 'food', lat: 41.7, lon: 44.8 });
  assert.equal(Object.keys(ok).length, 0);

  const bad = validateBusiness({ name: { ka: 'ა' }, category: 'food', lat: 41.7, lon: 44.8, website: 'ftp://x' });
  assert.ok(bad.website);
});

/* ─── შედეგი ───────────────────────────────────────────────── */
console.log(`\n${'─'.repeat(46)}`);
console.log(fail ? `❌ ${fail} შეცდომა, ${pass} წარმატებული` : `✅ ყველა ${pass} შემოწმება გავიდა`);
process.exitCode = fail ? 1 : 0;
