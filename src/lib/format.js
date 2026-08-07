/** ფორმატირება — ფასი, რიცხვი, მანძილი, თარიღი. ყველგან ქართული. */

const nf = new Intl.NumberFormat('ka-GE');

/** ფასი ინახება თეთრებში (1250 = 12.50 ₾) */
export function price(tetri, { symbol = '₾' } = {}) {
  if (tetri == null || Number.isNaN(Number(tetri))) return '';
  const gel = Number(tetri) / 100;
  const text = Number.isInteger(gel) ? nf.format(gel) : gel.toFixed(2).replace(/\.?0+$/, '');
  return `${text} ${symbol}`;
}

/** ლარის ტექსტიდან თეთრებში — dashboard-ის ფორმისთვის */
export function toTetri(input) {
  const cleaned = String(input ?? '').replace(',', '.').replace(/[^\d.]/g, '');
  if (!cleaned) return null;                    // ცარიელი ≠ უფასო
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function compact(n) {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace('.0', '')} ათ.`;
  return `${(n / 1_000_000).toFixed(1).replace('.0', '')} მლნ`;
}

export const num = (n) => nf.format(n ?? 0);

export function rating(avg, count) {
  if (!count) return { text: 'შეფასების გარეშე', value: null };
  return { text: `${Number(avg).toFixed(1)}`, value: Number(avg), count };
}

/** მანძილი მეტრებში → ადამიანური */
export function distance(meters) {
  if (meters == null) return '';
  if (meters < 950) return `${Math.round(meters / 10) * 10} მ`;
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0)} კმ`;
}

/** ჰავერსინის ფორმულა — მეტრებში */
export function haversine([lon1, lat1], [lon2, lat2]) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** „3 დღის წინ" */
export function ago(date) {
  if (!date) return '';
  const d = date?.toDate?.() ?? new Date(date);
  const sec = (Date.now() - d.getTime()) / 1000;
  if (sec < 60) return 'ახლახან';
  if (sec < 3600) return `${Math.floor(sec / 60)} წუთის წინ`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} საათის წინ`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)} დღის წინ`;
  if (sec < 31536000) return `${Math.floor(sec / 2592000)} თვის წინ`;
  return `${Math.floor(sec / 31536000)} წლის წინ`;
}

export function dateLong(date) {
  if (!date) return '';
  const d = date?.toDate?.() ?? new Date(date);
  return new Intl.DateTimeFormat('ka-GE', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** ტელეფონის ჩვენება: +995 322 00 11 22 */
export function phone(raw) {
  const s = String(raw ?? '').replace(/[^\d+]/g, '');
  const m = s.match(/^\+995(\d{3})(\d{2})(\d{2})(\d{2})$/);
  if (m) return `+995 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  const m9 = s.match(/^\+995(\d{3})(\d{3})(\d{3})$/);
  if (m9) return `+995 ${m9[1]} ${m9[2]} ${m9[3]}`;
  return raw ?? '';
}

/**
 * URL-ისთვის ვარგისი slug ქართულიდან.
 * ტრანსლიტერაცია საჭიროა, რომ ბმული ლათინური იყოს და SEO-ში იმუშაოს.
 */
const TRANSLIT = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k',
  ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u',
  ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts',
  ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
};

export function translit(text) {
  return String(text ?? '').split('').map((ch) => TRANSLIT[ch] ?? ch).join('');
}

export function slugify(text) {
  return translit(text)
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'obieqti';
}

/**
 * ძებნის ნორმალიზაცია — ქართული და ლათინური ერთ სივრცეში.
 * „ცისქვილი" და „tsiskvili" ერთსა და იმავე გასაღებზე დაიყვანება.
 */
export function searchKey(text) {
  const raw = String(text ?? '').toLowerCase().trim();
  return `${raw} ${translit(raw)}`.replace(/\s+/g, ' ');
}
