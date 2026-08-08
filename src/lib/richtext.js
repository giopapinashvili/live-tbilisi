/**
 * პოსტის ტექსტი — @მონიშვნა და #ჰეშთეგი ბმულებად.
 *
 * ერთადერთი წესი, რომელსაც აქ ვერასდროს დავარღვევთ:
 * ტექსტი ჯერ იფარება, მერე ბმულები ჩნდება. პირიქით რომ ვქნათ,
 * ვინმე კომენტარში <script>-ს დაწერს და საიტი მისი გახდება.
 */

import { esc } from './dom.js';

// ჰეშთეგი: სივრცისა და პუნქტუაციის გარდა ყველაფერი — ქართულიც
const TAG = /#([^\s#@,.!?;:()[\]{}'"«»„“]{1,60})/g;
// მონიშვნა: მკაცრად მომხმარებლის სახელის ფორმატი
const MENTION = /@([a-z0-9._]{3,30})/g;
const URL = /\bhttps?:\/\/[^\s<]+/g;

/**
 * უსაფრთხო HTML პოსტის ტექსტიდან.
 * @param {string} text
 * @returns {string} HTML
 */
export function rich(text) {
  if (!text) return '';

  // 1. ჯერ ვფარავთ — ამის შემდეგ ტექსტში < და > აღარაა
  let html = esc(String(text));

  // 2. ბმულები. ორმაგად ვფარავთ href-ს, თორემ ' გამოაღწევს
  html = html.replace(URL, (u) => {
    const safe = u.replace(/"/g, '%22');
    const shown = u.length > 42 ? `${u.slice(0, 42)}…` : u;
    return `<a class="rt-link" href="${safe}" target="_blank" rel="noopener nofollow">${shown}</a>`;
  });

  // 3. მონიშვნა
  html = html.replace(MENTION, (_m, name) =>
    `<a class="rt-at" href="/profile.html?u=${encodeURIComponent(name)}">@${name}</a>`);

  // 4. ჰეშთეგი
  html = html.replace(TAG, (_m, tag) =>
    `<a class="rt-tag" href="/explore.html?tag=${encodeURIComponent(tag.toLowerCase())}">#${tag}</a>`);

  return html;
}

/** ტექსტიდან ჰეშთეგები — იგივე წესით, რითაც ბაზა ითვლის */
export function tagsIn(text) {
  return [...new Set([...String(text ?? '').matchAll(TAG)].map((m) => m[1].toLowerCase()))];
}

/** ტექსტიდან მონიშნულები */
export function mentionsIn(text) {
  return [...new Set([...String(text ?? '').matchAll(MENTION)].map((m) => m[1].toLowerCase()))];
}

/**
 * გრძელი აღწერა — „მეტის ჩვენება".
 * ინსტაგრამზე პირველი ორი სტრიქონი ჩანს და დანარჩენი იკეცება.
 */
export function clamped(text, limit = 140) {
  const full = String(text ?? '');
  if (full.length <= limit) return rich(full);

  // სიტყვას შუაზე არ ვჭრით
  let cut = full.lastIndexOf(' ', limit);
  if (cut < limit * 0.6) cut = limit;

  return `<span class="rt-clamp" data-full="${esc(full)}">${rich(full.slice(0, cut))}…`
       + ` <button type="button" class="rt-more">მეტის ჩვენება</button></span>`;
}

/**
 * „მეტის ჩვენება" ღილაკის დამუშავება — ერთხელ, მთელ გვერდზე.
 * თითოეულ ბარათზე მსმენელის ჩამოკიდება ფიდში ძვირი დაჯდებოდა.
 */
export function bindClamps(root = document) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.rt-more');
    if (!btn) return;
    const box = btn.closest('.rt-clamp');
    if (!box) return;
    box.outerHTML = rich(box.dataset.full ?? '');
  });
}
