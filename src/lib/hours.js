/**
 * სამუშაო საათები.
 *
 * ფორმატი: { mon: [["09:00","14:00"], ["15:00","22:00"]], ..., sun: [] }
 * ცარიელი მასივი = დახურულია. null/undefined მთელ ობიექტზე = უცნობია.
 * შუაღამის გადაკვეთა: ["18:00","02:00"] — მეორე დღის 02:00-მდე.
 *
 * გამოთვლა კლიენტის მხარეს ხდება, ამიტომ სტატუსი სწორია მაშინაც,
 * როცა ბანდლი ცოტა ძველია.
 */

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DAY_NAMES = {
  mon: 'ორშაბათი', tue: 'სამშაბათი', wed: 'ოთხშაბათი', thu: 'ხუთშაბათი',
  fri: 'პარასკევი', sat: 'შაბათი', sun: 'კვირა',
};

export const DAY_SHORT = {
  mon: 'ორშ', tue: 'სამ', wed: 'ოთხ', thu: 'ხუთ', fri: 'პარ', sat: 'შაბ', sun: 'კვი',
};

/** კვირის დღეები ორშაბათიდან — ქართული კვირის თანმიმდევრობა */
export const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h % 24) * 60 + (m || 0);
};

const pad = (n) => String(n).padStart(2, '0');
export const fmtTime = (min) => `${pad(Math.floor((min % 1440) / 60))}:${pad(min % 60)}`;

/**
 * თბილისის ლოკალური დრო — მომხმარებელი შეიძლება სხვა სარტყელში იყოს,
 * მაგრამ ბიზნესის საათები თბილისის დროშია.
 */
export function tbilisiNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tbilisi',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  const wd = get('weekday').toLowerCase().slice(0, 3);   // mon|tue|wed|thu|fri|sat|sun
  return {
    dayKey: DAY_KEYS.includes(wd) ? wd : 'mon',
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

const prevDay = (key) => DAY_KEYS[(DAY_KEYS.indexOf(key) + 6) % 7];
const nextDay = (key) => DAY_KEYS[(DAY_KEYS.indexOf(key) + 1) % 7];

/**
 * მიმდინარე სტატუსი.
 * @returns {{state:'open'|'closing'|'closed'|'unknown', label:string, until?:number, next?:string}}
 */
export function status(business, now = tbilisiNow()) {
  if (business?.alwaysOpen) {
    return { state: 'open', label: '24 საათი ღიაა' };
  }
  const hours = business?.hours;
  if (!hours || typeof hours !== 'object') {
    return { state: 'unknown', label: 'საათები უცნობია' };
  }

  const { dayKey, minutes } = now;

  // ღამის სმენა წინა დღიდან (მაგ. ["21:00","03:00"])
  for (const [from, to] of hours[prevDay(dayKey)] ?? []) {
    const a = toMin(from); const b = toMin(to);
    if (b < a && minutes < b) return closingSoon(b - minutes, b);
  }

  for (const [from, to] of hours[dayKey] ?? []) {
    const a = toMin(from);
    let b = toMin(to);
    if (b <= a) b += 1440;                      // შუაღამის გადაკვეთა
    if (minutes >= a && minutes < b) return closingSoon(b - minutes, b % 1440);
    if (minutes < a) {
      return { state: 'closed', label: `იხსნება ${fmtTime(a)}-ზე`, next: fmtTime(a) };
    }
  }

  // დღეს აღარაფერი — ვეძებთ მომდევნო ღია დღეს
  let key = dayKey;
  for (let i = 1; i <= 7; i++) {
    key = nextDay(key);
    const slot = (hours[key] ?? [])[0];
    if (slot) {
      const when = i === 1 ? 'ხვალ' : DAY_NAMES[key];
      return { state: 'closed', label: `დაკეტილია · ${when} ${slot[0]}`, next: slot[0] };
    }
  }
  return { state: 'closed', label: 'დაკეტილია' };
}

function closingSoon(minsLeft, closeAt) {
  if (minsLeft <= 60) {
    return { state: 'closing', label: `მალე იხურება · ${fmtTime(closeAt)}`, until: closeAt };
  }
  return { state: 'open', label: `ღიაა ${fmtTime(closeAt)}-მდე`, until: closeAt };
}

/** მოკლე ბეჯის ტექსტი */
export function statusBadge(business) {
  const s = status(business);
  const text = { open: 'ღიაა', closing: 'მალე იხურება', closed: 'დაკეტილია', unknown: '—' }[s.state];
  return { ...s, short: text };
}

/** კვირის სრული ცხრილი გვერდზე საჩვენებლად */
export function weekTable(business) {
  const today = tbilisiNow().dayKey;
  return WEEK_ORDER.map((key) => {
    const slots = business?.alwaysOpen ? [['00:00', '24:00']] : (business?.hours?.[key] ?? null);
    return {
      key,
      name: DAY_NAMES[key],
      short: DAY_SHORT[key],
      isToday: key === today,
      text: !business?.hours && !business?.alwaysOpen
        ? 'უცნობია'
        : slots?.length
          ? slots.map(([a, b]) => `${a}–${b}`).join(', ')
          : 'დაკეტილია',
    };
  });
}

/** ღიაა თუ არა კონკრეტულ დროზე — AI/დეტალურ ფილტრში გამოსადეგი */
export function isOpenAt(business, dayKey, hhmm) {
  return status(business, { dayKey, minutes: toMin(hhmm) }).state !== 'closed';
}

/** ვალიდაცია dashboard-ის ფორმისთვის */
export function validateHours(hours) {
  const errors = [];
  for (const key of WEEK_ORDER) {
    for (const [i, slot] of (hours?.[key] ?? []).entries()) {
      const [from, to] = slot ?? [];
      if (!/^\d{2}:\d{2}$/.test(from ?? '') || !/^\d{2}:\d{2}$/.test(to ?? '')) {
        errors.push(`${DAY_NAMES[key]}: ${i + 1}-ლ ინტერვალში დროის ფორმატი არასწორია`);
      }
    }
  }
  return errors;
}
