/**
 * ბიზნესის რედაქტორი.
 * ერთი ფორმა ორი მომხმარებლისთვის: ბიზნესის მფლობელი (dashboard) და ადმინი.
 */

import { esc, attr, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { CATEGORIES, CATEGORY_MAP, DISTRICTS, PRICE_LEVELS, attributesFor } from '../data/taxonomy.js';
import { WEEK_ORDER, DAY_NAMES } from '../lib/hours.js';
import { blankBusiness, validateBusiness } from '../lib/schema.js';
import { createBusiness, updateBusiness } from '../lib/data/businesses.js';

/**
 * @param {HTMLElement} host
 * @param {{business?:object, isAdmin?:boolean, onSaved?:(id:string)=>void}} opts
 */
export function mountBusinessForm(host, { business = null, isAdmin = false, onSaved } = {}) {
  const model = business ? structuredClone(toEditable(business)) : blankBusiness();
  let picker = null;

  host.innerHTML = template(model, isAdmin);
  const form = host.querySelector('form');

  /* კატეგორიის ცვლილება → ქვეკატეგორიები და ატრიბუტები გადაიხატება */
  form.category.addEventListener('change', () => {
    model.category = form.category.value;
    model.subcategories = [];
    host.querySelector('#f-subs').innerHTML = subsHtml(model);
    host.querySelector('#f-attrs').innerHTML = attrsHtml(model);
  });

  host.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      e.preventDefault();
      const { chip: kind, value } = chip.dataset;
      if (kind === 'sub') {
        model.subcategories = toggle(model.subcategories, value, 8);
        chip.setAttribute('aria-pressed', String(model.subcategories.includes(value)));
      } else if (kind === 'attr') {
        model.attrs[value] = !model.attrs[value];
        chip.setAttribute('aria-pressed', String(Boolean(model.attrs[value])));
      } else if (kind === 'price') {
        model.priceLevel = model.priceLevel === Number(value) ? null : Number(value);
        for (const n of host.querySelectorAll('[data-chip="price"]')) {
          n.setAttribute('aria-pressed', String(Number(n.dataset.value) === model.priceLevel));
        }
      }
      return;
    }

    const add = e.target.closest('[data-add-slot]');
    if (add) {
      e.preventDefault();
      const day = add.dataset.addSlot;
      model.hours ??= {};
      model.hours[day] = [...(model.hours[day] ?? []), ['09:00', '18:00']];
      host.querySelector('#f-hours').innerHTML = hoursHtml(model);
      return;
    }

    const del = e.target.closest('[data-del-slot]');
    if (del) {
      e.preventDefault();
      const [day, i] = del.dataset.delSlot.split(':');
      model.hours[day].splice(Number(i), 1);
      host.querySelector('#f-hours').innerHTML = hoursHtml(model);
    }
  });

  /* საათების ცვლილება */
  host.addEventListener('change', (e) => {
    const t = e.target.closest('[data-time]');
    if (t) {
      const [day, i, which] = t.dataset.time.split(':');
      model.hours[day][Number(i)][which === 'from' ? 0 : 1] = t.value;
    }
    if (e.target.name === 'alwaysOpen') {
      model.alwaysOpen = e.target.checked;
      host.querySelector('#f-hours').hidden = model.alwaysOpen;
    }
  });

  /* რუკის ამომრჩევი */
  mountPicker();

  async function mountPicker() {
    const el = host.querySelector('#f-map');
    const { CityMap } = await import('../lib/map-core.js');
    picker = new CityMap(el, { hash: false, labels: false });
    picker.addEventListener('ready', () => {
      if (model.lat != null) {
        picker.map.jumpTo({ center: [model.lon, model.lat], zoom: 16 });
        setMarker([model.lon, model.lat]);
      }
      picker.map.on('click', (ev) => {
        model.lon = Number(ev.lngLat.lng.toFixed(6));
        model.lat = Number(ev.lngLat.lat.toFixed(6));
        setMarker([model.lon, model.lat]);
        host.querySelector('#f-coords').textContent = `${model.lat}, ${model.lon}`;
      });
    });
  }

  let marker;
  async function setMarker(coords) {
    const maplibregl = (await import('maplibre-gl')).default;
    marker?.remove();
    marker = new maplibregl.Marker({ color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() })
      .setLngLat(coords).addTo(picker.map);
  }

  /* შენახვა */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    collect(form, model);

    const errors = validateBusiness(model);
    paintErrors(host, errors);
    if (Object.keys(errors).length) {
      toast(Object.values(errors)[0], 'error');
      return;
    }

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'ინახება…';

    try {
      if (business?.id) {
        await updateBusiness(business.id, model);
        toast('შენახულია', 'ok');
        onSaved?.(business.id);
      } else {
        const ref = await createBusiness(model);
        toast('ბიზნესი დაემატა', 'ok');
        onSaved?.(ref.id);
      }
    } catch (err) {
      console.error(err);
      toast(err.code === 'permission-denied' ? 'უფლება არ გაქვს' : 'შენახვა ვერ მოხერხდა', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = business?.id ? 'შენახვა' : 'დამატება';
    }
  });

  return { model, destroy: () => picker?.destroy() };
}

/* ─────────────────────────────────────────────────────────── */

function toEditable(b) {
  return {
    ...blankBusiness(),
    ...b,
    name: { ka: b.nameKa || b.name || '', en: b.name?.en ?? '' },
    descr: { ka: typeof b.descr === 'string' ? b.descr : (b.descr?.ka ?? '') },
    address: { ka: typeof b.address === 'string' ? b.address : (b.address?.ka ?? '') },
    phone: b.phone ?? [],
    attrs: { ...(b.attrs ?? {}) },
  };
}

function collect(form, model) {
  model.name.ka = form.nameKa.value.trim();
  model.name.en = form.nameEn.value.trim();
  model.descr.ka = form.descr.value.trim();
  model.category = form.category.value;
  model.district = form.district.value;
  model.address.ka = form.address.value.trim();
  model.addressNote = form.addressNote.value.trim();
  model.phone = form.phone.value.split(',').map((s) => s.trim()).filter(Boolean);
  model.email = form.email.value.trim();
  model.website = form.website.value.trim();
  model.alwaysOpen = form.alwaysOpen.checked;
  model.status = form.status?.value ?? model.status;
  if (form.lat && form.lon && form.lat.value && form.lon.value) {
    model.lat = Number(form.lat.value);
    model.lon = Number(form.lon.value);
  }
  if (model.alwaysOpen) model.hours = null;
}

const toggle = (list, v, max) => (list.includes(v)
  ? list.filter((x) => x !== v)
  : (list.length < max ? [...list, v] : list));

function paintErrors(host, errors) {
  for (const node of host.querySelectorAll('[data-err]')) {
    const key = node.dataset.err;
    node.textContent = errors[key] ?? '';
    node.hidden = !errors[key];
  }
}

/* ─── მარკაპი ──────────────────────────────────────────────── */

function template(m, isAdmin) {
  return `
  <form novalidate>
    <div class="panel">
      <div class="panel-head"><h3>ძირითადი</h3></div>

      <div class="grid-2">
        <label class="field">
          <span class="label">დასახელება (ქართულად) *</span>
          <input class="input" name="nameKa" value="${attr(m.name.ka)}" required>
          <span class="hint" data-err="name" hidden></span>
        </label>
        <label class="field">
          <span class="label">დასახელება (ინგლისურად)</span>
          <input class="input" name="nameEn" value="${attr(m.name.en ?? '')}">
        </label>
      </div>

      <label class="field">
        <span class="label">აღწერა</span>
        <textarea class="textarea" name="descr" maxlength="1000"
          placeholder="მოკლედ — რას სთავაზობთ მომხმარებელს">${esc(m.descr?.ka ?? '')}</textarea>
      </label>

      <div class="grid-2">
        <label class="field">
          <span class="label">კატეგორია *</span>
          <select class="select" name="category" required>
            <option value="">— აირჩიე —</option>
            ${CATEGORIES.map((c) => `<option value="${c.id}"${m.category === c.id ? ' selected' : ''}>${esc(c.ka)}</option>`).join('')}
          </select>
          <span class="hint" data-err="category" hidden></span>
        </label>
        <label class="field">
          <span class="label">უბანი</span>
          <select class="select" name="district">
            <option value="">— აირჩიე —</option>
            ${DISTRICTS.map((d) => `<option value="${d.id}"${m.district === d.id ? ' selected' : ''}>${esc(d.ka)}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="field">
        <span class="label">ქვეკატეგორია <span class="dim">(მაქს. 8)</span></span>
        <div class="row-wrap" id="f-subs">${subsHtml(m)}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>მდებარეობა</h3></div>
      <p class="hint" style="margin-top:0">დააჭირე რუკას, რომ ზუსტი წერტილი მონიშნო.</p>
      <div class="picker-map" id="f-map"></div>
      <p class="hint">კოორდინატები: <span id="f-coords">${m.lat != null ? `${m.lat}, ${m.lon}` : '—'}</span></p>
      <span class="hint" data-err="loc" hidden style="color:var(--danger)"></span>

      <div class="grid-2" style="margin-top:var(--sp-4)">
        <label class="field">
          <span class="label">მისამართი</span>
          <input class="input" name="address" value="${attr(m.address?.ka ?? '')}" placeholder="ჭავჭავაძის გამზ. 12">
        </label>
        <label class="field">
          <span class="label">დამატებითი მითითება</span>
          <input class="input" name="addressNote" value="${attr(m.addressNote ?? '')}" placeholder="მე-2 სართული, ეზოდან">
        </label>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>სამუშაო საათები</h3></div>
      <label class="row" style="gap:var(--sp-2); margin-bottom:var(--sp-4)">
        <input type="checkbox" name="alwaysOpen" ${m.alwaysOpen ? 'checked' : ''}>
        <span>24 საათი ღიაა</span>
      </label>
      <div id="f-hours" ${m.alwaysOpen ? 'hidden' : ''}>${hoursHtml(m)}</div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>კონტაქტი</h3></div>
      <div class="grid-2">
        <label class="field">
          <span class="label">ტელეფონი <span class="dim">(მძიმით გამოყოფილი)</span></span>
          <input class="input" name="phone" value="${attr((m.phone ?? []).join(', '))}" placeholder="+995322001122">
          <span class="hint" data-err="phone" hidden style="color:var(--danger)"></span>
        </label>
        <label class="field">
          <span class="label">ელფოსტა</span>
          <input class="input" type="email" name="email" value="${attr(m.email ?? '')}">
        </label>
      </div>
      <label class="field">
        <span class="label">ვებ-გვერდი</span>
        <input class="input" name="website" value="${attr(m.website ?? '')}" placeholder="https://…">
        <span class="hint" data-err="website" hidden style="color:var(--danger)"></span>
      </label>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>მახასიათებლები</h3></div>
      <div class="row-wrap" id="f-attrs">${attrsHtml(m)}</div>

      <div class="field" style="margin-top:var(--sp-4)">
        <span class="label">ფასის დონე</span>
        <div class="row-wrap">
          ${PRICE_LEVELS.map((p) => `
            <button class="chip" type="button" data-chip="price" data-value="${p.id}"
                    aria-pressed="${m.priceLevel === p.id}" title="${attr(p.label)}">${p.ka}</button>`).join('')}
        </div>
      </div>
    </div>

    ${isAdmin ? `
      <div class="panel">
        <div class="panel-head"><h3>ადმინი</h3></div>
        <label class="field" style="max-width:280px">
          <span class="label">სტატუსი</span>
          <select class="select" name="status">
            <option value="active"${m.status === 'active' ? ' selected' : ''}>აქტიური</option>
            <option value="temporarily-closed"${m.status === 'temporarily-closed' ? ' selected' : ''}>დროებით დახურული</option>
            <option value="closed"${m.status === 'closed' ? ' selected' : ''}>დახურული</option>
            <option value="pending"${m.status === 'pending' ? ' selected' : ''}>განსახილველი</option>
          </select>
        </label>
      </div>` : ''}

    <div class="row" style="gap:var(--sp-2); justify-content:flex-end; margin-top:var(--sp-5)">
      <button class="btn btn-primary btn-lg" type="submit">${m.id ? 'შენახვა' : 'დამატება'}</button>
    </div>
  </form>`;
}

function subsHtml(m) {
  const subs = CATEGORY_MAP[m.category]?.sub ?? [];
  if (!subs.length) return '<span class="dim" style="font-size:var(--fs-sm)">ჯერ აირჩიე კატეგორია</span>';
  return subs.map((s) => `
    <button class="chip" type="button" data-chip="sub" data-value="${s.id}"
            aria-pressed="${(m.subcategories ?? []).includes(s.id)}">${esc(s.ka)}</button>`).join('');
}

function attrsHtml(m) {
  const list = attributesFor(m.category);
  return list.map((a) => `
    <button class="chip" type="button" data-chip="attr" data-value="${a.id}"
            aria-pressed="${Boolean(m.attrs?.[a.id])}">${esc(a.ka)}</button>`).join('');
}

function hoursHtml(m) {
  return `<div class="hours-editor">${WEEK_ORDER.map((day) => {
    const slots = m.hours?.[day] ?? [];
    return `
      <div class="hours-day">
        <span style="font-size:var(--fs-sm); font-weight:600">${DAY_NAMES[day]}</span>
        <div class="times">
          ${slots.map(([from, to], i) => `
            <input type="time" value="${attr(from)}" data-time="${day}:${i}:from">
            <span class="dim">–</span>
            <input type="time" value="${attr(to)}" data-time="${day}:${i}:to">
            <button class="btn btn-ghost btn-sm" type="button" data-del-slot="${day}:${i}"
                    aria-label="ინტერვალის წაშლა">×</button>`).join('')}
          <button class="btn btn-ghost btn-sm" type="button" data-add-slot="${day}">
            ${icon('plus', { size: 14 })} ${slots.length ? 'შესვენება' : 'დამატება'}
          </button>
          ${slots.length ? '' : '<span class="dim" style="font-size:var(--fs-xs)">დაკეტილია</span>'}
        </div>
      </div>`;
  }).join('')}</div>`;
}
