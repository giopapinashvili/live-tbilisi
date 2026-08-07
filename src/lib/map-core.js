/**
 * რუკის ბირთვი.
 *
 * ერთი კლასი, რომელიც პასუხისმგებელია:
 *   • MapLibre-ის ინიციალიზაცია და თემასთან სინქრონი
 *   • ბიზნესების ფენები: კლასტერი → პინი → ხაზგასმა
 *   • ფილტრის მყისიერი გამოყენება (setFilter, ქსელის გარეშე)
 *   • URL hash — რუკის მდგომარეობა გაზიარებადია
 *   • მოვლენები გარე კოდისთვის: select, hover, moveend
 *
 * გვერდები რუკის შიდა აგებულებას არ იცნობენ — მხოლოდ ამ API-ს.
 */

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { CITY } from '../data/taxonomy.js';
import { buildStyle, needsPmtilesProtocol } from './map-style.js';
import { installPins, iconImageExpression, categoryColorExpression } from './map-pins.js';
import { toGeoJSON, hashId, getState } from './store.js';
import { toMapExpression, filters } from './filters.js';
import { currentTheme, onThemeChange } from './theme.js';
import { searchKey } from './format.js';
import { icon } from './icons.js';

const SRC = 'biz';
const LYR = {
  clusterGlow: 'biz-cluster-glow',
  cluster: 'biz-cluster',
  clusterCount: 'biz-cluster-count',
  halo: 'biz-halo',
  pin: 'biz-pin',
  label: 'biz-label',
};

/** ღიაობის მდგომარეობა წუთში ერთხელ ხელახლა ითვლება */
const OPEN_REFRESH_MS = 60_000;

export class CityMap extends EventTarget {
  /**
   * @param {HTMLElement|string} container
   * @param {{interactive?:boolean, hash?:boolean, labels?:boolean, padding?:object}} opts
   */
  constructor(container, opts = {}) {
    super();
    this.opts = { hash: true, labels: true, interactive: true, ...opts };
    this.selectedId = null;
    this.hoveredId = null;
    this._ready = false;
    this._pendingData = null;

    if (needsPmtilesProtocol()) this._registerPmtiles();

    const start = this.opts.hash ? readHash() : null;

    this.map = new maplibregl.Map({
      container,
      style: buildStyle(currentTheme()),
      center: start?.center ?? CITY.center,
      zoom: start?.zoom ?? CITY.zoom,
      bearing: start?.bearing ?? 0,
      pitch: start?.pitch ?? 0,
      minZoom: CITY.minZoom,
      maxZoom: CITY.maxZoom,
      maxBounds: expand(CITY.bbox, 0.25),
      interactive: this.opts.interactive,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      fadeDuration: 120,
      // ქართული ტექსტი ვექტორული ტაილებიდან მოდის, ლოკალური fallback არ სჭირდება
    });

    this.map.touchZoomRotate?.disableRotation();
    this.map.on('load', () => this._onLoad());
    this._unThemeSub = onThemeChange((t) => this._applyTheme(t));
  }

  /* ─── ინიციალიზაცია ─────────────────────────────────────── */

  async _registerPmtiles() {
    const { Protocol } = await import('pmtiles');
    maplibregl.addProtocol('pmtiles', new Protocol().tile);
  }

  _onLoad() {
    this._ready = true;
    this._addControls();
    installPins(this.map);
    this._addLayers();
    this._bindInteractions();

    if (this._pendingData) this.setData(this._pendingData);
    this._openTimer = setInterval(() => this.refreshOpenState(), OPEN_REFRESH_MS);

    if (this.opts.hash) {
      this.map.on('moveend', () => writeHash(this.map));
    }
    this.map.on('moveend', () => this.dispatchEvent(new CustomEvent('moveend', {
      detail: { bounds: this.map.getBounds(), zoom: this.map.getZoom() },
    })));

    this.dispatchEvent(new Event('ready'));
  }

  _addControls() {
    if (!this.opts.interactive) return;

    this.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    this.map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');

    this.geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      fitBoundsOptions: { maxZoom: 16 },
    });
    this.map.addControl(this.geolocate, 'bottom-right');
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  }

  /* ─── ფენები ────────────────────────────────────────────── */

  _addLayers() {
    this.map.addSource(SRC, {
      type: 'geojson',
      data: emptyFC(),
      cluster: true,
      clusterRadius: 52,
      clusterMaxZoom: 14,
      // კლასტერს ვთვლით, რამდენი ღიაა — ბალიშის ფერისთვის
      clusterProperties: {
        openCount: ['+', ['case', ['==', ['get', 'open'], 1], 1, 0]],
      },
      generateId: false,
    });

    const beforeId = undefined;

    /* კლასტერის ნათება — რბილი ჰალო, სიმჭიდროვის შეგრძნებისთვის */
    this.map.addLayer({
      id: LYR.clusterGlow,
      type: 'circle',
      source: SRC,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': cssv('--accent', '#C0522A'),
        'circle-opacity': 0.13,
        'circle-blur': 0.85,
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'point_count'],
          2, 22, 25, 34, 120, 48, 600, 66, 3000, 88,
        ],
      },
    }, beforeId);

    this.map.addLayer({
      id: LYR.cluster,
      type: 'circle',
      source: SRC,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': cssv('--surface', '#fff'),
        'circle-stroke-color': cssv('--accent', '#C0522A'),
        'circle-stroke-width': 2,
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'point_count'],
          2, 15, 25, 20, 120, 26, 600, 33, 3000, 42,
        ],
      },
    });

    this.map.addLayer({
      id: LYR.clusterCount,
      type: 'symbol',
      source: SRC,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['get', 'point_count'], 2, 12, 600, 15],
        'text-allow-overlap': true,
      },
      paint: { 'text-color': cssv('--ink', '#111') },
    });

    /* არჩეული / hover პინის ჰალო */
    this.map.addLayer({
      id: LYR.halo,
      type: 'circle',
      source: SRC,
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'circle-radius': 22,
        'circle-color': cssv('--accent', '#C0522A'),
        'circle-opacity': 0.18,
        'circle-blur': 0.4,
        'circle-translate': [0, -13],
      },
    });

    /* ცალკეული ბიზნესები */
    this.map.addLayer({
      id: LYR.pin,
      type: 'symbol',
      source: SRC,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': iconImageExpression(),
        'icon-anchor': ['case', ['>=', ['get', 'tier'], 1], 'bottom', 'center'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': false,
        'icon-size': [
          'interpolate', ['linear'], ['zoom'],
          12, 0.72, 15, 0.9, 17, 1,
        ],
        'symbol-sort-key': ['-', 0, ['+', ['*', ['get', 'tier'], 100], ['get', 'rating']]],
      },
      paint: {
        'icon-opacity': [
          'case',
          ['==', ['get', 'open'], 3], 0.55,   // დაკეტილი — მიბინდული
          1,
        ],
      },
    });

    /* სახელები მაღალ ზუმზე */
    if (this.opts.labels) {
      this.map.addLayer({
        id: LYR.label,
        type: 'symbol',
        source: SRC,
        minzoom: 15.5,
        filter: ['all', ['!', ['has', 'point_count']], ['>=', ['get', 'tier'], 1]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11.5,
          'text-anchor': 'top',
          'text-offset': [0, 0.35],
          'text-max-width': 9,
          'text-optional': true,
          'text-padding': 3,
        },
        paint: {
          'text-color': cssv('--ink', '#111'),
          'text-halo-color': cssv('--bg', '#fff'),
          'text-halo-width': 1.6,
        },
      });
    }
  }

  /* ─── ინტერაქცია ────────────────────────────────────────── */

  _bindInteractions() {
    if (!this.opts.interactive) return;
    const m = this.map;

    m.on('click', LYR.cluster, async (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const zoom = await m.getSource(SRC).getClusterExpansionZoom(f.properties.cluster_id);
      m.easeTo({ center: f.geometry.coordinates, zoom: Math.min(zoom + 0.4, CITY.maxZoom), duration: 500 });
    });

    m.on('click', LYR.pin, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      this.select(f.properties.id, { fly: false });
      this.dispatchEvent(new CustomEvent('select', {
        detail: { id: f.properties.id, slug: f.properties.slug, feature: f },
      }));
    });

    // ცარიელ ადგილას დაჭერა — მონიშვნის მოხსნა
    m.on('click', (e) => {
      const hits = m.queryRenderedFeatures(e.point, { layers: [LYR.pin, LYR.cluster] });
      if (!hits.length && this.selectedId) {
        this.select(null);
        this.dispatchEvent(new Event('deselect'));
      }
    });

    for (const layer of [LYR.pin, LYR.cluster]) {
      m.on('mouseenter', layer, () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', layer, () => { m.getCanvas().style.cursor = ''; });
    }

    m.on('mousemove', LYR.pin, (e) => {
      const id = e.features?.[0]?.properties?.id ?? null;
      if (id === this.hoveredId) return;
      this.hoveredId = id;
      this._paintHalo();
      this.dispatchEvent(new CustomEvent('hover', { detail: { id } }));
    });
    m.on('mouseleave', LYR.pin, () => {
      this.hoveredId = null;
      this._paintHalo();
    });
  }

  _paintHalo() {
    if (!this.map.getLayer(LYR.halo)) return;
    const id = this.selectedId ?? this.hoveredId;
    this.map.setFilter(LYR.halo, id
      ? ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], id]]
      : ['==', ['get', 'id'], '__none__']);
  }

  /* ─── მონაცემები ────────────────────────────────────────── */

  /** @param {Array} businesses კანონიკური მსუბუქი ჩანაწერები */
  setData(businesses) {
    if (!this._ready) { this._pendingData = businesses; return; }
    this._all = businesses;
    this.map.getSource(SRC)?.setData(toGeoJSON(businesses));
  }

  /** ღიაობის ხელახალი გამოთვლა — დროის გასვლისას სტატუსი ცოცხლდება */
  refreshOpenState() {
    if (!this._ready || !this._all?.length) return;
    this.map.getSource(SRC)?.setData(toGeoJSON(this._all));
  }

  /**
   * ფილტრის გამოყენება.
   * გეომეტრიული ფილტრი MapLibre-ის expression-ით ხდება (მყისიერი),
   * ტექსტური ძებნა კი წყაროს ხელახლა კვებავს — ეს ერთადერთი შემთხვევაა,
   * როცა setData საჭიროა.
   */
  applyFilters(f = filters) {
    if (!this._ready) return;
    const { expression, needsTextFilter } = toMapExpression(f);

    if (needsTextFilter && f.q) {
      const q = searchKey(f.q);
      const subset = (this._all ?? getState().businesses)
        .filter((b) => (b._key ?? searchKey(b.name)).includes(q));
      this.map.getSource(SRC)?.setData(toGeoJSON(subset));
      this._textFiltered = true;
    } else if (this._textFiltered) {
      this.map.getSource(SRC)?.setData(toGeoJSON(this._all ?? getState().businesses));
      this._textFiltered = false;
    }

    const base = ['!', ['has', 'point_count']];
    this.map.setFilter(LYR.pin, expression ? ['all', base, expression] : base);
    if (this.map.getLayer(LYR.label)) {
      const lbl = ['all', base, ['>=', ['get', 'tier'], 1]];
      this.map.setFilter(LYR.label, expression ? [...lbl, expression] : lbl);
    }
    this._paintHalo();
  }

  /* ─── ნავიგაცია ─────────────────────────────────────────── */

  select(id, { fly = true, zoom = 16.5 } = {}) {
    this.selectedId = id;
    this._paintHalo();
    if (!id || !fly) return;
    const b = (this._all ?? getState().businesses).find((x) => x.id === id);
    if (b) this.map.flyTo({ center: [b.lon, b.lat], zoom: Math.max(this.map.getZoom(), zoom), duration: 700 });
  }

  flyTo(center, zoom = 15) {
    this.map.flyTo({ center, zoom, duration: 800, essential: true });
  }

  fitToDistrict(district) {
    const list = (this._all ?? getState().businesses).filter((b) => b.district === district);
    if (!list.length) return false;
    const b = new maplibregl.LngLatBounds();
    for (const x of list) b.extend([x.lon, x.lat]);
    this.map.fitBounds(b, { padding: this.opts.padding ?? 60, maxZoom: 15.5, duration: 700 });
    return true;
  }

  fitToVisible(padding) {
    const feats = this.map.queryRenderedFeatures({ layers: [LYR.pin] });
    if (!feats.length) return false;
    const b = new maplibregl.LngLatBounds();
    for (const f of feats) b.extend(f.geometry.coordinates);
    this.map.fitBounds(b, { padding: padding ?? this.opts.padding ?? 60, maxZoom: 16, duration: 600 });
    return true;
  }

  resetView() {
    this.map.flyTo({ center: CITY.center, zoom: CITY.zoom, bearing: 0, pitch: 0, duration: 700 });
  }

  locateUser() {
    this.geolocate?.trigger();
  }

  /** რუკის ხედში მოხვედრილი ბიზნესები — გვერდითი სიისთვის */
  visibleBusinesses(limit = 200) {
    if (!this._ready) return [];
    const seen = new Set();
    const out = [];
    for (const f of this.map.queryRenderedFeatures({ layers: [LYR.pin] })) {
      const id = f.properties.id;
      if (seen.has(id)) continue;
      seen.add(id);
      const b = (this._all ?? getState().businesses).find((x) => x.id === id);
      if (b) out.push(b);
      if (out.length >= limit) break;
    }
    return out;
  }

  /* ─── თემა ──────────────────────────────────────────────── */

  _applyTheme(theme) {
    if (!this.map) return;
    const view = {
      center: this.map.getCenter(), zoom: this.map.getZoom(),
      bearing: this.map.getBearing(), pitch: this.map.getPitch(),
    };
    const data = this._all;
    const selected = this.selectedId;

    this._ready = false;
    this.map.setStyle(buildStyle(theme));
    this.map.once('styledata', () => {
      this.map.jumpTo(view);
      installPins(this.map);
      this._addLayers();
      this._bindInteractions();
      this._ready = true;
      if (data) this.setData(data);
      this.selectedId = selected;
      this.applyFilters();
      this.dispatchEvent(new Event('restyled'));
    });
  }

  destroy() {
    clearInterval(this._openTimer);
    this._unThemeSub?.();
    this.map?.remove();
  }
}

/* ─────────────────────────────────────────────────────────────
   დამხმარეები
   ───────────────────────────────────────────────────────────── */

const emptyFC = () => ({ type: 'FeatureCollection', features: [] });

function cssv(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function expand([w, s, e, n], pad) {
  return [[w - pad, s - pad], [e + pad, n + pad]];
}

/** URL hash — #zoom/lat/lon. რუკის მდგომარეობა გაზიარებადია. */
function readHash() {
  const m = location.hash.match(/^#(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return { zoom: Number(m[1]), center: [Number(m[3]), Number(m[2])] };
}

function writeHash(map) {
  const c = map.getCenter();
  const hash = `#${map.getZoom().toFixed(2)}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}`;
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

export { LYR, SRC, hashId, icon, categoryColorExpression };
