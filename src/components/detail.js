/**
 * ბიზნესის დეტალური ხედი.
 * ერთი და იგივე მარკაპი გამოიყენება რუკის ფურცელში და ბიზნესის გვერდზე.
 */

import { esc, attr } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { catName, subName, CATEGORY_MAP, TIERS, ATTRIBUTE_MAP, DISTRICT_MAP } from '../data/taxonomy.js';
import { statusBadge, weekTable } from '../lib/hours.js';
import { price, phone as fmtPhone, rating as fmtRating, compact, ago } from '../lib/format.js';
import { stars } from './cards.js';

/**
 * @param {object} b სრული ან მსუბუქი ბიზნესი
 * @param {{loading?:boolean, showHero?:boolean, level?:number}} opts
 */
export function detailView(b, { loading = false, showHero = true, level = 2 } = {}) {
  if (loading) return detailSkeleton();
  if (!b) return '';

  const st = statusBadge(b);
  const r = fmtRating(b.ratingAvg, b.ratingCount);
  const cat = CATEGORY_MAP[b.category];
  const H = `h${level}`;

  return `
    ${showHero ? hero(b, cat) : ''}

    <div class="row-wrap" style="gap:var(--sp-2); margin-bottom:var(--sp-2)">
      <span class="badge badge-${st.state}">${esc(st.label)}</span>
      ${b.tier === 0 ? `<span class="badge badge-tier0" title="${attr(TIERS[0].note)}">დაუდასტურებელი</span>` : ''}
      ${b.tier >= 2 ? '<span class="badge badge-verified">სრული პროფილი</span>' : ''}
    </div>

    <${H} class="detail-title">${esc(b.name)}</${H}>

    <div class="card-meta" style="margin-bottom:var(--sp-3)">
      <span class="card-cat" style="--dot:var(--cat-${attr(b.category ?? 'public')})">
        ${esc(catName(b.category))}
      </span>
      ${b.subcategories?.length ? `<span>·</span><span>${b.subcategories.map((s) => esc(subName(s))).join(', ')}</span>` : ''}
      ${b.district ? `<span>·</span><span>${esc(DISTRICT_MAP[b.district]?.ka ?? b.district)}</span>` : ''}
    </div>

    ${r.value ? `
      <div class="row" style="gap:var(--sp-2); margin-bottom:var(--sp-4)">
        ${stars(r.value)}
        <span class="rating-num">${esc(r.text)}</span>
        <span class="dim">${compact(r.count)} შეფასება</span>
      </div>` : ''}

    ${b.descr ? `<p class="muted">${esc(b.descr)}</p>` : ''}

    ${actions(b)}

    ${contactBlock(b)}

    ${hoursBlock(b)}

    ${attrsBlock(b)}

    ${itemsBlock(b)}

    ${promosBlock(b)}

    ${footerBlock(b)}
  `;
}

/* ─── ბლოკები ──────────────────────────────────────────────── */

function hero(b, cat) {
  if (b.cover || b.photos?.length) {
    const src = b.cover || b.photos[0];
    return `<div class="detail-hero"><img src="${attr(src)}" alt="${attr(b.name)}" loading="lazy"></div>`;
  }
  return `
    <div class="detail-hero card-media-empty" style="display:grid;place-items:center">
      ${icon(cat?.icon ?? 'pin', { size: 36 })}
    </div>`;
}

function actions(b) {
  const tel = b.phone?.[0];
  const coords = `${b.lat},${b.lon}`;
  return `
    <div class="detail-actions">
      <a class="btn ${tel ? '' : 'btn-ghost'}" ${tel ? `href="tel:${attr(tel)}"` : 'aria-disabled="true"'}>
        ${icon('phone', { size: 18 })}<span>დარეკვა</span>
      </a>
      <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${attr(coords)}"
         target="_blank" rel="noopener">
        ${icon('compass', { size: 18 })}<span>მარშრუტი</span>
      </a>
      <button class="btn" type="button" data-act="share" data-slug="${attr(b.slug ?? b.id)}">
        ${icon('share', { size: 18 })}<span>გაზიარება</span>
      </button>
      <button class="btn" type="button" data-act="report" data-id="${attr(b.id)}">
        ${icon('flag', { size: 18 })}<span>შეცდომა</span>
      </button>
    </div>`;
}

function contactBlock(b) {
  const rows = [];
  if (b.address) {
    rows.push(row('pin', esc(b.address) + (b.addressNote ? `<br><span class="dim">${esc(b.addressNote)}</span>` : '')));
  }
  for (const p of b.phone ?? []) {
    rows.push(row('phone', `<a href="tel:${attr(p)}">${esc(fmtPhone(p))}</a>`));
  }
  if (b.website) {
    const label = b.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
    rows.push(row('globe', `<a href="${attr(b.website)}" target="_blank" rel="noopener nofollow">${esc(label)}</a>`));
  }
  if (!rows.length) return '';
  return `<div class="kv" style="margin-bottom:var(--sp-5)">${rows.join('')}</div>`;
}

const row = (ic, html) => `<div class="kv-row">${icon(ic, { size: 17 })}<div>${html}</div></div>`;

function hoursBlock(b) {
  if (!b.hours && !b.alwaysOpen) {
    return `
      <section style="margin-bottom:var(--sp-5)">
        <h4>სამუშაო საათები</h4>
        <p class="dim" style="font-size:var(--fs-sm)">
          უცნობია. თუ იცი —
          <button class="btn btn-ghost btn-sm" type="button" data-act="report" data-id="${attr(b.id)}">
            შეგვატყობინე
          </button>
        </p>
      </section>`;
  }
  return `
    <section style="margin-bottom:var(--sp-5)">
      <h4>სამუშაო საათები</h4>
      <table class="hours-table">
        ${weekTable(b).map((d) => `
          <tr data-today="${d.isToday}">
            <td>${esc(d.name)}</td>
            <td>${esc(d.text)}</td>
          </tr>`).join('')}
      </table>
    </section>`;
}

function attrsBlock(b) {
  const list = b.attrList ?? [];
  if (!list.length) return '';
  return `
    <section style="margin-bottom:var(--sp-5)">
      <h4>მახასიათებლები</h4>
      <div class="row-wrap">
        ${list.map((a) => `<span class="badge">${esc(ATTRIBUTE_MAP[a]?.ka ?? a)}</span>`).join('')}
      </div>
    </section>`;
}

function itemsBlock(b) {
  const items = b.items ?? [];
  if (!items.length) return '';

  const groups = new Map();
  for (const it of items) {
    const g = it.group || 'სხვა';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(it);
  }

  return `
    <section style="margin-bottom:var(--sp-5)">
      <h4>მენიუ და პროდუქტები</h4>
      ${[...groups].map(([group, list]) => `
        <div style="margin-bottom:var(--sp-4)">
          <div class="eyebrow" style="margin-bottom:var(--sp-2)">${esc(group)}</div>
          <div class="kv">
            ${list.map((it) => `
              <div class="kv-row" style="justify-content:space-between; gap:var(--sp-4)">
                <div style="flex:1">
                  <div style="font-weight:600">${esc(it.name?.ka ?? it.name ?? '')}</div>
                  ${it.descr?.ka ? `<div class="dim" style="font-size:var(--fs-xs)">${esc(it.descr.ka)}</div>` : ''}
                </div>
                <div class="tnum" style="white-space:nowrap; font-weight:650">
                  ${it.oldPrice ? `<s class="dim" style="font-weight:400">${esc(price(it.oldPrice))}</s> ` : ''}
                  ${esc(price(it.price))}
                </div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </section>`;
}

function promosBlock(b) {
  const promos = (b.promos ?? []).filter((p) => p.active !== false);
  if (!promos.length) return '';
  return `
    <section style="margin-bottom:var(--sp-5)">
      <h4>აქციები</h4>
      <div class="stack">
        ${promos.map((p) => `
          <div class="card" style="border-left:3px solid var(--accent)">
            <div class="card-body">
              <div class="badge badge-promo" style="margin-bottom:var(--sp-2)">აქცია</div>
              <div style="font-weight:650">${esc(p.title ?? '')}</div>
              ${p.descr ? `<div class="muted" style="font-size:var(--fs-sm)">${esc(p.descr)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </section>`;
}

function footerBlock(b) {
  const src = { osm: 'OpenStreetMap', owner: 'ბიზნესის მფლობელი', manual: 'რედაქცია', import: 'იმპორტი' }[b.source] ?? '';
  const when = b.updatedAt ? ago(b.updatedAt) : null;
  if (!src && !when) return '';
  return `
    <p class="dim" style="font-size:var(--fs-xs); border-top:1px solid var(--line); padding-top:var(--sp-3)">
      ${src ? `წყარო: ${esc(src)}` : ''}${src && when ? ' · ' : ''}${when ? `განახლდა ${esc(when)}` : ''}
    </p>`;
}

function detailSkeleton() {
  return `
    <div class="detail-hero skel"></div>
    <div class="skel skel-line" style="width:40%; height:1.6em"></div>
    <div class="skel skel-line" style="width:65%"></div>
    <div class="skel" style="height:62px; margin:var(--sp-4) 0"></div>
    <div class="skel skel-line"></div>
    <div class="skel skel-line"></div>`;
}

/* ─── ქმედებები (გაზიარება / შეცდომის შეტყობინება) ─────────── */

export function bindDetailActions(root, { onReport } = {}) {
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;

    if (btn.dataset.act === 'share') {
      e.preventDefault();
      const url = `${location.origin}/business.html?b=${btn.dataset.slug}`;
      const { toast } = await import('../lib/dom.js');
      if (navigator.share) {
        navigator.share({ url }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(url);
        toast('ბმული დაკოპირდა');
      }
    }

    if (btn.dataset.act === 'report') {
      e.preventDefault();
      onReport?.(btn.dataset.id);
    }
  });
}

/**
 * JSON-LD სტრუქტურული მონაცემი — ეს არის ის, რაც ბიზნესის გვერდს
 * Google-ის შედეგებში აჩენს. SEO-სთვის კრიტიკულია.
 */
export function jsonLd(b) {
  const TYPE = {
    food: 'Restaurant', health: 'MedicalBusiness', beauty: 'HealthAndBeautyBusiness',
    shopping: 'Store', auto: 'AutomotiveBusiness', hotel: 'LodgingBusiness',
    education: 'EducationalOrganization', leisure: 'EntertainmentBusiness',
  };
  const data = {
    '@context': 'https://schema.org',
    '@type': TYPE[b.category] ?? 'LocalBusiness',
    name: b.name,
    url: `${location.origin}/business.html?b=${b.slug ?? b.id}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.address || undefined,
      addressLocality: 'თბილისი',
      addressCountry: 'GE',
    },
    geo: b.lat && b.lon
      ? { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lon }
      : undefined,
    telephone: b.phone?.[0],
    image: b.cover || b.photos?.[0],
  };
  if (b.ratingCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: b.ratingAvg,
      reviewCount: b.ratingCount,
    };
  }
  if (b.hours && !b.alwaysOpen) {
    const MAP = { mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th', fri: 'Fr', sat: 'Sa', sun: 'Su' };
    data.openingHours = Object.entries(b.hours)
      .flatMap(([day, slots]) => (slots ?? []).map(([a, z]) => `${MAP[day]} ${a}-${z}`));
  } else if (b.alwaysOpen) {
    data.openingHours = 'Mo-Su 00:00-23:59';
  }
  return JSON.stringify(data, (_, v) => (v === undefined ? undefined : v));
}
