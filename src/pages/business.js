/** ბიზნესის გვერდი. */

import { boot, $, params, esc, toast } from './_boot.js';
import { detailView, bindDetailActions, jsonLd } from '../components/detail.js';
import { businessCard, emptyState, EMPTY } from '../components/cards.js';
import { loadCity, getBusiness, getState } from '../lib/store.js';
import { catName, CATEGORY_MAP, DISTRICT_MAP } from '../data/taxonomy.js';
import { haversine } from '../lib/format.js';
import { HAS_FIREBASE } from '../lib/config.js';
import { setTitle, setDescription, setCanonical, setJsonLd } from '../lib/seo.js';

boot({ active: '', canonical: false });

const slug = params.get('b');
const host = $('#detail');

if (!slug) {
  host.innerHTML = emptyState({ ...EMPTY.noResults, title: 'ბიზნესი მითითებული არ არის' });
} else {
  host.innerHTML = detailView(null, { loading: true });
  init(slug);
}

async function init(key) {
  await loadCity();
  const b = await getBusiness(key);

  if (!b) {
    host.innerHTML = emptyState({
      icon: 'search',
      title: 'ბიზნესი ვერ მოიძებნა',
      text: 'შესაძლოა ბმული მოძველებულია ან ჩანაწერი წაშლილია.',
      action: { href: '/map.html', label: 'რუკაზე დაბრუნება' },
    });
    return;
  }

  setTitle(`${b.name} — თბილისი LIVE`);
  setDescription(buildDescription(b));
  // canonical რეალურ, მომუშავე მისამართზე. /b/{slug} ლამაზი ფორმაა,
  // მაგრამ rewrite-ზეა დამოკიდებული — თუ ჰოსტინგზე არ მუშაობს,
  // canonical 404-ზე მიუთითებდა და SEO დაზიანდებოდა.
  setCanonical(`/business.html?b=${b.slug ?? b.id}`);
  setJsonLd(jsonLd(b));

  renderCrumbs(b);
  host.innerHTML = detailView(b, { level: 1 });
  bindDetailActions(host, { onReport: () => openReport(b) });

  $('#open-in-map').href = `/map.html?b=${encodeURIComponent(b.slug ?? b.id)}#16.5/${b.lat}/${b.lon}`;

  renderNearby(b);
  mountMiniMap(b);
}

/* ─── SEO ──────────────────────────────────────────────────── */

function buildDescription(b) {
  const bits = [b.name, catName(b.category)];
  if (b.district) bits.push(DISTRICT_MAP[b.district]?.ka);
  if (b.address) bits.push(b.address);
  bits.push('სამუშაო საათები, კონტაქტი და მისამართი — თბილისი LIVE');
  return bits.filter(Boolean).join(' · ').slice(0, 300);
}

/* ─── პურის ნამცეცები ──────────────────────────────────────── */

function renderCrumbs(b) {
  const cat = CATEGORY_MAP[b.category];
  const dist = DISTRICT_MAP[b.district];
  const parts = ['<a href="/">მთავარი</a>'];
  if (cat) parts.push(`<a href="/category.html?cat=${cat.id}">${esc(cat.ka)}</a>`);
  if (cat && dist) parts.push(`<a href="/category.html?cat=${cat.id}&district=${dist.id}">${esc(dist.ka)}</a>`);
  parts.push(`<span class="dim">${esc(b.name)}</span>`);
  $('#crumbs').innerHTML = parts.join('<span class="sep">/</span>');
}

/* ─── ახლომდებარე ──────────────────────────────────────────── */

function renderNearby(b) {
  const origin = [b.lon, b.lat];
  const list = getState().businesses
    .filter((x) => x.id !== b.id && x.category === b.category)
    .map((x) => ({ b: x, d: haversine(origin, [x.lon, x.lat]) }))
    .filter((x) => x.d < 2500)
    .sort((a, z) => a.d - z.d)
    .slice(0, 4);

  if (!list.length) { $('#nearby').innerHTML = ''; return; }

  $('#nearby').innerHTML = `
    <h3 style="font-size:var(--fs-md)">ახლომდებარე</h3>
    <div class="stack">
      ${list.map(({ b: x, d }) => businessCard(x, { distanceM: d, compact: true })).join('')}
    </div>`;
}

/* ─── პატარა რუკა ──────────────────────────────────────────── */

async function mountMiniMap(b) {
  const el = $('#mini-map');
  if (!el || b.lat == null) return;
  const { CityMap } = await import('../lib/map-core.js');
  const mini = new CityMap(el, { hash: false, labels: false, interactive: true });
  mini.addEventListener('ready', () => {
    mini.setData([b]);
    mini.map.jumpTo({ center: [b.lon, b.lat], zoom: 16 });
    mini.select(b.id, { fly: false });
  });
}

/* ─── შეცდომის შეტყობინება ─────────────────────────────────── */

function openReport(b) {
  const dlg = $('#report-modal');
  if (!dlg) return;
  dlg.showModal();

  dlg.querySelector('form').onsubmit = async (e) => {
    const action = e.submitter?.value;
    if (action !== 'send') return;

    const data = new FormData(e.target);
    const payload = {
      businessId: b.id,
      field: data.get('field'),
      note: String(data.get('note') ?? '').slice(0, 1000),
    };

    if (!payload.note.trim()) { toast('აღწერე რა არის არასწორი', 'error'); e.preventDefault(); return; }
    if (!HAS_FIREBASE) { toast('Firebase არ არის კონფიგურირებული', 'error'); return; }

    try {
      const { submitEdit } = await import('../lib/data/edits.js');
      await submitEdit(payload);
      toast('მადლობა — შევამოწმებთ', 'ok');
    } catch (err) {
      console.error(err);
      toast(err.code === 'permission-denied' ? 'ჯერ შედი ანგარიშში' : 'გაგზავნა ვერ მოხერხდა', 'error');
    }
  };
}
