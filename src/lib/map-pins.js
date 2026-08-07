/**
 * პინების გრაფიკა.
 *
 * პინები Canvas-ზე იხატება და MapLibre-ს სპრაიტებად ემატება, ანუ
 * რენდერი GPU-ზე ხდება — 30,000 პინიც კი არ ანელებს რუკას.
 * DOM მარკერები ამ მასშტაბზე გამორიცხულია.
 *
 * ორი ფორმა:
 *   pin  — დადასტურებული ბიზნესი (tier ≥ 1): წვეთი, კატეგორიის ხატულით
 *   dot  — დაუდასტურებელი (tier 0): პატარა რგოლი, ღრუ ცენტრით
 *
 * ეს განსხვავება შემთხვევითი არაა: მომხმარებელი ერთი შეხედვით
 * ხვდება, სად არის შემოწმებული ინფორმაცია და სად — მხოლოდ OSM-ის ჩანაწერი.
 */

import { CATEGORIES } from '../data/taxonomy.js';
import { ICON_PATHS } from './icons.js';

const DPR = Math.min(globalThis.devicePixelRatio || 1, 2);

/** CSS ცვლადიდან ფერი — პალიტრა tokens.css-შია, აქ არ დუბლირდება */
function cssVar(name, fallback = '#888') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function palette() {
  const colors = {};
  for (const c of CATEGORIES) colors[c.id] = cssVar(`--cat-${c.id}`);
  return {
    colors,
    stroke: cssVar('--pin-stroke', '#fff'),
    shadow: cssVar('--pin-shadow', 'rgba(0,0,0,.35)'),
    ink: cssVar('--ink', '#111'),
  };
}

/* ─────────────────────────────────────────────────────────────
   ფორმები
   ───────────────────────────────────────────────────────────── */

const PIN_W = 30;
const PIN_H = 40;

/** კლასიკური წვეთი, ოდნავ წაგრძელებული — მკვეთრი წვერით რომ ზუსტად მიუთითოს */
function pinPath() {
  const p = new Path2D();
  const cx = PIN_W / 2;
  const r = 13;
  const cy = 14;
  p.moveTo(cx, PIN_H);
  p.bezierCurveTo(cx + 4.5, PIN_H - 10, cx + r, cy + r * 0.62, cx + r, cy);
  p.arc(cx, cy, r, 0, Math.PI, true);
  p.bezierCurveTo(cx - r, cy + r * 0.62, cx - 4.5, PIN_H - 10, cx, PIN_H);
  p.closePath();
  return p;
}

function drawIcon(ctx, name, { x, y, size, color, width = 2 }) {
  const d = ICON_PATHS[name];
  if (!d) return;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  // scale()-ის შემდეგ lineWidth-იც იზრდება — ვაკომპენსირებთ, რომ
  // ხაზი ყოველთვის `width` პიქსელი იყოს საბოლოო გამოსახულებაში
  ctx.lineWidth = (width * 24) / size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(d));
  ctx.restore();
}

/** დადასტურებული ბიზნესის პინი */
function renderPin(category, iconName, pal) {
  const w = PIN_W + 6;
  const h = PIN_H + 6;
  const canvas = document.createElement('canvas');
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  ctx.translate(3, 1);

  const color = pal.colors[category] ?? pal.ink;

  // ჩრდილი — რბილი, რომ პინი რუკას „ზემოდან" ედოს
  ctx.save();
  ctx.shadowColor = pal.shadow;
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = color;
  ctx.fill(pinPath());
  ctx.restore();

  // კონტური თემის ფონის ფერით — პინები ერთმანეთს არ ეწებება
  ctx.lineWidth = 2;
  ctx.strokeStyle = pal.stroke;
  ctx.stroke(pinPath());

  drawIcon(ctx, iconName, { x: PIN_W / 2, y: 14, size: 15, color: pal.stroke, width: 1.9 });

  return { canvas, w, h };
}

/** დაუდასტურებელი ჩანაწერი — მოკრძალებული რგოლი */
function renderDot(category, pal) {
  const s = 16;
  const canvas = document.createElement('canvas');
  canvas.width = s * DPR;
  canvas.height = s * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const color = pal.colors[category] ?? pal.ink;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = pal.stroke;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = color;
  ctx.stroke();

  return { canvas, w: s, h: s };
}

/* ─────────────────────────────────────────────────────────────
   MapLibre-ში ჩატვირთვა
   ───────────────────────────────────────────────────────────── */

/**
 * ყველა სპრაიტის გენერაცია და რუკაზე დამატება.
 * თემის შეცვლისას ხელახლა უნდა გამოიძახო (კონტურის ფერი იცვლება).
 */
export function installPins(map) {
  const pal = palette();

  for (const cat of CATEGORIES) {
    add(map, `pin-${cat.id}`, renderPin(cat.id, cat.icon, pal));
    add(map, `dot-${cat.id}`, renderDot(cat.id, pal));
  }
  // საცავი უცნობი კატეგორიისთვის
  add(map, 'pin-unknown', renderPin('public', 'pin', pal));
  add(map, 'dot-unknown', renderDot('public', pal));
}

function add(map, id, { canvas, w, h }) {
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const image = { width: canvas.width, height: canvas.height, data: data.data };
  if (map.hasImage(id)) map.updateImage(id, image);
  else map.addImage(id, image, { pixelRatio: DPR });
  return { w, h };
}

/** ხატულის სახელი კატეგორიის მიხედვით — MapLibre გამოსახულებისთვის */
export function iconImageExpression() {
  const cases = ['case'];
  cases.push(['>=', ['get', 'tier'], 1],
    ['concat', 'pin-', ['coalesce', ['get', 'cat'], 'unknown']]);
  cases.push(['concat', 'dot-', ['coalesce', ['get', 'cat'], 'unknown']]);
  return cases;
}

/** კატეგორიის ფერი MapLibre გამოსახულებად (კლასტერებისთვის) */
export function categoryColorExpression(fallback = '#888') {
  const match = ['match', ['get', 'cat']];
  for (const c of CATEGORIES) match.push(c.id, cssVar(`--cat-${c.id}`));
  match.push(fallback);
  return match;
}

export const PIN_SIZE = { w: PIN_W, h: PIN_H };
