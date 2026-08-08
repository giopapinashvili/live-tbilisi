#!/usr/bin/env node
/**
 * იმპორტების შემოწმება — ფაილიც და ფუნქციაც.
 *
 *   npm test
 *
 * ეს ფაილი იმიტომ დაიწერა, რომ ერთხელ უკვე გამომეპარა:
 * ვამოწმებდი, ფაილი არსებობს თუ არა, მაგრამ არა იმას, აქვს
 * თუ არა მას ის ფუნქცია, რომელსაც ვითხოვდი. აწყობა Cloudflare-ზე
 * ჩავარდა შეტყობინებით „updateBusiness is not exported".
 *
 * Vite/Rollup ამას აწყობისას იჭერს, მაგრამ აწყობა 12 წამია და
 * ქვიშის ყუთში npm ხშირად არ მუშაობს. ეს შემოწმება წამზე ნაკლებია
 * და დამოკიდებულებებს საერთოდ არ საჭიროებს.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const deps = new Set(Object.keys(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).dependencies ?? {},
));

let problems = 0;
let files = 0;
let checked = 0;

/* ─── ფაილის სკანირება ─────────────────────────────────────── */

/** რას გააქვს ფაილი */
function exportsOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  let star = false;

  // export function foo / export async function foo / export class Foo
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  // export const a = ... / export let a / export var a
  for (const m of src.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  // export const { a, b } = ...
  for (const m of src.matchAll(/^export\s+(?:const|let|var)\s*\{([^}]+)\}/gm)) {
    for (const part of m[1].split(',')) {
      const n = part.split(':').pop().trim();
      if (n) names.add(n);
    }
  }
  // export { a, b as c }
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const part of m[1].split(',')) {
      const bits = part.trim().split(/\s+as\s+/);
      const n = (bits[1] ?? bits[0]).trim();
      if (n) names.add(n);
    }
  }
  // export default
  if (/^export\s+default\b/m.test(src)) names.add('default');
  // export * from '...' — ვერ ვადევნებთ თვალს, ამიტომ ფაილს ვთიშავთ
  if (/^export\s*\*\s*from/m.test(src)) star = true;

  return { names, star };
}

/** რას იღებს ფაილი */
function importsIn(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];

  // import ... from '...'   (სტატიკური)
  for (const m of src.matchAll(/^import\s+([^;'"]*?)\s+from\s*['"]([^'"]+)['"]/gm)) {
    out.push({ clause: m[1], spec: m[2], line: lineOf(src, m.index) });
  }
  // import '...' — მხოლოდ გვერდითი ეფექტისთვის
  for (const m of src.matchAll(/^import\s*['"]([^'"]+)['"]/gm)) {
    out.push({ clause: '', spec: m[1], line: lineOf(src, m.index) });
  }
  // export { a } from '...' / export * from '...'
  for (const m of src.matchAll(/^export\s+(\*|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/gm)) {
    out.push({ clause: m[1] === '*' ? '' : m[1], spec: m[2], line: lineOf(src, m.index) });
  }
  // await import('...')  (დინამიური)
  for (const m of src.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    out.push({ clause: null, spec: m[1], line: lineOf(src, m.index) });
  }
  return out;
}

const lineOf = (src, i) => src.slice(0, i).split('\n').length;

/** `{ a, b as c }` → ['a', 'b'] ; `default` და `* as ns` გამოტოვებულია */
function namedIn(clause) {
  if (!clause) return [];
  const brace = clause.match(/\{([^}]*)\}/);
  if (!brace) return [];
  return brace[1].split(',')
    .map((p) => p.trim().split(/\s+as\s+/)[0].trim())
    .filter(Boolean);
}

/* ─── გავლა ────────────────────────────────────────────────── */

const cache = new Map();
const exportsCached = (f) => {
  if (!cache.has(f)) cache.set(f, exportsOf(f));
  return cache.get(f);
};

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) check(p);
  }
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  problems++;
}

function check(file) {
  files++;
  const rel = path.relative(ROOT, file);

  for (const imp of importsIn(file)) {
    checked++;
    const { spec, clause, line } = imp;

    // გარე პაკეტი
    if (!spec.startsWith('.')) {
      if (spec.startsWith('http') || spec.startsWith('node:')) continue;
      const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!deps.has(pkg)) fail(`${rel}:${line} — პაკეტი "${pkg}" package.json-ში არაა`);
      continue;
    }

    // ლოკალური ფაილი
    const target = path.resolve(path.dirname(file), spec);
    if (!fs.existsSync(target)) {
      fail(`${rel}:${line} — ფაილი "${spec}" არ არსებობს`);
      continue;
    }
    if (!target.endsWith('.js')) continue;

    // დინამიური იმპორტის ველებს ვერ ვკითხულობთ — მხოლოდ ფაილს ვამოწმებთ
    if (clause === null) continue;

    const { names, star } = exportsCached(target);
    if (star) continue;                       // `export *` — თვალს ვერ ვადევნებთ

    for (const want of namedIn(clause)) {
      if (!names.has(want)) {
        fail(`${rel}:${line} — "${want}" არ გააქვს ფაილს ${path.relative(ROOT, target)}`);
      }
    }
  }
}

/* ─── სტილები ──────────────────────────────────────────────── */

/**
 * ყოველი გვერდი სტილს ან boot()-იდან იღებს, ან პირდაპირ.
 *
 * ესეც ნანახი შეცდომაა: login.js-მა boot() არ გამოიძახა (ჰედერი
 * არ სჭირდებოდა) და გვერდი შიშველი აიწყო — მუშაობდა, მაგრამ
 * უსტილოდ. აწყობა ასეთს არ იჭერს, რადგან შეცდომა არ არის.
 */
function checkStyles() {
  for (const file of fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const m = html.match(/<script[^>]+src=["']\/([^"']+\.js)["']/);
    if (!m) continue;

    const entry = path.join(ROOT, m[1]);
    if (!fs.existsSync(entry)) { fail(`${file} — სკრიპტი ${m[1]} არ არსებობს`); continue; }

    const src = fs.readFileSync(entry, 'utf8');
    const hasBoot = /_boot\.js['"]/.test(src);
    const hasCss = /\.css['"]/.test(src);
    if (!hasBoot && !hasCss) {
      fail(`${file} — ${m[1]} არც boot()-ს იძახებს და არც CSS-ს იღებს (გვერდი უსტილოდ აიწყობა)`);
    }
  }
}

/* ─── გაშვება ──────────────────────────────────────────────── */

console.log('\nიმპორტები');
walk(SRC);
checkStyles();

console.log(`\n  ${files} ფაილი, ${checked} იმპორტი`);
if (problems) {
  console.error(`\n❌ ${problems} გატეხილი იმპორტი — აწყობა ჩავარდება\n`);
  process.exit(1);
}
console.log('\n✅ ყველა იმპორტი ადგილზეა\n');
