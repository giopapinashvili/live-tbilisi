/**
 * ხატულები — ხელით დახატული SVG path-ები, 24×24, stroke 1.6.
 * ბიბლიოთეკის ნაცვლად საკუთარი ნაკრები: მსუბუქია და კატეგორიების
 * ხატულები ერთ სტილშია, რაც პროდუქტს საკუთარ სახეს აძლევს.
 */

const P = {
  /* კატეგორიები */
  fork:      'M6 3v7a2 2 0 0 0 4 0V3M8 12v9M17 3c-1.5 1.5-2 3.5-2 6s.5 3 2 3 2-.5 2-3-.5-4.5-2-6ZM17 12v9',
  bag:       'M4 8h16l-1.2 12H5.2L4 8ZM8.5 8V6a3.5 3.5 0 0 1 7 0v2',
  cross:     'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3Z',
  scissors:  'M6.5 6.5 18 18M17.5 6.5 6 18M6.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  wrench:    'M15.5 3.5a5 5 0 0 0-6.2 6.2L3.6 15.4a2 2 0 0 0 2.8 2.8l5.7-5.7a5 5 0 0 0 6.2-6.2l-2.9 2.9-2.3-.6-.6-2.3 2.9-2.9Z',
  car:       'M4 15v3M20 15v3M3 14l1.6-5A2 2 0 0 1 6.5 8h11a2 2 0 0 1 1.9 1L21 14v4H3v-4ZM6.5 14h.01M17.5 14h.01',
  book:      'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5V4.5ZM4 20.5A2.5 2.5 0 0 1 6.5 18H20v4H6.5A2.5 2.5 0 0 1 4 20.5Z',
  sparkle:   'M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5L3.5 11 10 9l2-6.5ZM19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z',
  bed:       'M3 6v12M3 11h18v7M21 18v-7a3 3 0 0 0-3-3h-7v3M7.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  route:     'M6.5 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 22a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6.5 7v5a4 4 0 0 0 4 4h3a4 4 0 0 1 4 4',
  building:  'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M14 10h4a2 2 0 0 1 2 2v9M2 21h20M7.5 7h3M7.5 11h3M7.5 15h3',
  briefcase: 'M3 8.5h18V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5ZM8.5 8.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2.5M3 13h18',

  /* UI */
  search:    'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-4.2-4.2',
  close:     'M6 6l12 12M18 6 6 18',
  sun:       'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon:      'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  pin:       'M12 22s7-6.3 7-11.5A7 7 0 0 0 5 10.5C5 15.7 12 22 12 22ZM12 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  clock:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
  phone:     'M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z',
  globe:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.5 9h17M3.5 15h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  star:      'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z',
  filter:    'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  layers:    'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5',
  locate:    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v3M12 19v3M2 12h3M19 12h3',
  plus:      'M12 5v14M5 12h14',
  minus:     'M5 12h14',
  chevron:   'M9 5l7 7-7 7',
  back:      'M15 5l-7 7 7 7',
  edit:      'M4 20h4L20 8l-4-4L4 16v4ZM14.5 5.5l4 4',
  flag:      'M5 21V4M5 4h11l-2 4 2 4H5',
  share:     'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M12 15V3M8.5 6.5 12 3l3.5 3.5',
  /* სოციალური ზოლი — ინსტაგრამის პროპორციებით */
  heart:     'M12 21s-8.2-5-8.2-10.4a4.8 4.8 0 0 1 8.2-3.4 4.8 4.8 0 0 1 8.2 3.4C20.2 16 12 21 12 21Z',
  bubble:    'M21 11.6a8.3 8.3 0 0 1-8.9 8.3 9.7 9.7 0 0 1-3.5-.7L3.2 21l1.9-4.6a8.2 8.2 0 0 1-1.3-4.8A8.3 8.3 0 0 1 12.1 3.3a8.3 8.3 0 0 1 8.9 8.3Z',
  plane:     'M21.5 2.5 10.8 13.2M21.5 2.5l-6.8 18.4-3.9-7.7-7.7-3.9 18.4-6.8Z',
  repost:    'M17 2.5 21 6.5l-4 4M21 6.5H8.5a4.5 4.5 0 0 0-4.5 4.5v1.2M7 21.5l-4-4 4-4M3 17.5h12.5a4.5 4.5 0 0 0 4.5-4.5v-1.2',
  bookmark:  'M6.5 2.8h11a.9.9 0 0 1 .9.9v17.5L12 16.9l-6.4 4.3V3.7a.9.9 0 0 1 .9-.9Z',
  check:     'M4.5 12.5 9 17 19.5 6.5',
  info:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 7.5h.01',
  user:      'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 21a7.5 7.5 0 0 1 15 0',
  menu:      'M3 6h18M3 12h18M3 18h18',
  tag:       'M3 12.5V4h8.5L21 13.5 12.5 22 3 12.5ZM7.5 8h.01',
  map:       'M9 4 3 6.5v14L9 18l6 2.5 6-2.5v-14L15 6.5 9 4ZM9 4v14M15 6.5v14',
  compass:   'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z',
  image:     'M4 5h16v14H4V5ZM4 15.5 9 11l4 3.5 3-2.5 4 3.5M15.5 9.5h.01',
};

/**
 * @param {keyof typeof P} name
 * @param {{size?:number, cls?:string, fill?:boolean, stroke?:number}} opts
 */
export function icon(name, { size = 20, cls = '', fill = false, stroke = 1.6 } = {}) {
  const d = P[name];
  if (!d) return '';
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}

/** DOM კვანძად, როცა innerHTML არ გვინდა */
export function iconNode(name, opts) {
  const wrap = document.createElement('span');
  wrap.style.display = 'contents';
  wrap.innerHTML = icon(name, opts);
  return wrap.firstElementChild ?? wrap;
}

export const ICON_PATHS = P;
export const hasIcon = (name) => Boolean(P[name]);
