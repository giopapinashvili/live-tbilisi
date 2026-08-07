/**
 * რუკის სტილი — ხელით დაწერილი, არა მზა შაბლონი.
 *
 * ბაზა: OpenFreeMap-ის ვექტორული ტაილები (OpenMapTiles სქემა).
 * უფასო, API გასაღების გარეშე, და — რაც მთავარია — `name:ka` ველით,
 * ანუ ქუჩების სახელები ქართულად ჩანს.
 *
 * ორი პალიტრა:
 *   „დღე"  — თბილი ქაღალდი, აგურისფერი მაგისტრალები
 *   „ღამე" — თბილი შავი, ქარვისფერი შუქი მაგისტრალებზე
 *
 * ორივე შეგნებულად დაბალკონტრასტულია: რუკა ფონია, გმირი პინებია.
 */

import { TILES } from './config.js';

const OFM = {
  tiles: 'https://tiles.openfreemap.org/planet',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sprite: 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm',
  attribution:
    '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · ' +
    '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> · ' +
    '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>',
};

const FONT = ['Noto Sans Regular'];
const FONT_BOLD = ['Noto Sans Bold'];
const FONT_ITALIC = ['Noto Sans Italic'];

/** ქართული სახელი, თუ არსებობს; თუ არა — ადგილობრივი, ბოლოს ლათინური */
const NAME_KA = ['coalesce', ['get', 'name:ka'], ['get', 'name'], ['get', 'name:latin'], ''];

/* ─────────────────────────────────────────────────────────────
   პალიტრები
   ───────────────────────────────────────────────────────────── */

const PALETTE = {
  light: {
    bg: '#F2ECE1',
    residential: '#EDE5D7',
    wood: '#DCE3D0',
    grass: '#E3E8D6',
    sand: '#EFE6CE',
    park: '#DFE7D4',
    water: '#B7CDD4',
    waterDeep: '#A6C0C9',
    waterway: '#B0C7CF',
    building: '#E5DAC7',
    buildingLine: '#D6C7AE',
    roadMinor: '#FBF7F0',
    roadMinorLine: '#E6DBC8',
    roadMajor: '#FFFDF9',
    roadMajorLine: '#DDCDB4',
    motorway: '#F0D3A2',
    motorwayLine: '#D8B87F',
    rail: '#D3C6B2',
    boundary: '#C4B49C',
    label: '#584C40',
    labelStrong: '#3A312A',
    halo: 'rgba(250,246,239,0.92)',
    poi: '#8B7C6B',
  },
  dark: {
    bg: '#141110',
    residential: '#1A1613',
    wood: '#161D18',
    grass: '#18201A',
    sand: '#211B14',
    park: '#152019',
    water: '#0D1B21',
    waterDeep: '#0A161B',
    waterway: '#122731',
    building: '#211A14',
    buildingLine: '#2B231A',
    roadMinor: '#231D17',
    roadMinorLine: '#1B1611',
    roadMajor: '#2E2620',
    roadMajorLine: '#191410',
    motorway: '#4A3620',
    motorwayLine: '#2A1E12',
    rail: '#2A231C',
    boundary: '#3A3128',
    label: '#A99A88',
    labelStrong: '#DCCDB9',
    halo: 'rgba(12,9,7,0.88)',
    poi: '#6E6355',
  },
};

/* ─────────────────────────────────────────────────────────────
   სტილის აწყობა
   ───────────────────────────────────────────────────────────── */

/** @param {'light'|'dark'} theme */
export function buildStyle(theme = 'light') {
  const mode = TILES.mode;

  if (mode === 'maptiler' && TILES.maptilerKey) {
    const which = theme === 'dark' ? 'streets-v2-dark' : 'streets-v2';
    return `https://api.maptiler.com/maps/${which}/style.json?key=${TILES.maptilerKey}`;
  }

  const source = mode === 'pmtiles' && TILES.pmtilesUrl
    ? { type: 'vector', url: `pmtiles://${TILES.pmtilesUrl}`, attribution: OFM.attribution }
    : { type: 'vector', url: OFM.tiles, attribution: OFM.attribution };

  return {
    version: 8,
    name: `თბილისი LIVE — ${theme === 'dark' ? 'ღამე' : 'დღე'}`,
    glyphs: OFM.glyphs,
    sprite: OFM.sprite,
    sources: { openmaptiles: source },
    layers: baseLayers(PALETTE[theme] ?? PALETTE.light, theme),
  };
}

export const needsPmtilesProtocol = () => TILES.mode === 'pmtiles' && Boolean(TILES.pmtilesUrl);

/* ─────────────────────────────────────────────────────────────
   ფენები
   ───────────────────────────────────────────────────────────── */

function baseLayers(c, theme) {
  const src = 'openmaptiles';
  const L = (id, type, sourceLayer, extra = {}) => ({
    id, type, source: src, 'source-layer': sourceLayer, ...extra,
  });
  const isDark = theme === 'dark';

  return [
    { id: 'bg', type: 'background', paint: { 'background-color': c.bg } },

    /* ── მიწის საფარი ── */
    L('landuse-residential', 'fill', 'landuse', {
      filter: ['==', ['get', 'class'], 'residential'],
      maxzoom: 17,
      paint: {
        'fill-color': c.residential,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.55, 13, 1],
      },
    }),
    L('landcover-wood', 'fill', 'landcover', {
      filter: ['==', ['get', 'class'], 'wood'],
      paint: { 'fill-color': c.wood, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 1] },
    }),
    L('landcover-grass', 'fill', 'landcover', {
      filter: ['match', ['get', 'class'], ['grass', 'farmland'], true, false],
      paint: { 'fill-color': c.grass, 'fill-opacity': 0.85 },
    }),
    L('landcover-sand', 'fill', 'landcover', {
      filter: ['==', ['get', 'class'], 'sand'],
      paint: { 'fill-color': c.sand },
    }),
    L('park', 'fill', 'park', {
      paint: { 'fill-color': c.park, 'fill-opacity': 0.9 },
    }),
    L('park-outline', 'line', 'park', {
      minzoom: 13,
      paint: { 'line-color': c.park, 'line-width': 1, 'line-opacity': 0.6 },
    }),

    /* ── წყალი ── მტკვარი ქალაქის ხერხემალია, გამოკვეთილი უნდა იყოს */
    L('water', 'fill', 'water', {
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      paint: {
        'fill-color': ['case', ['==', ['get', 'class'], 'river'], c.waterDeep, c.water],
        'fill-antialias': true,
      },
    }),
    L('waterway', 'line', 'waterway', {
      filter: ['!=', ['get', 'brunnel'], 'tunnel'],
      paint: {
        'line-color': c.waterway,
        'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 9, 0.6, 14, 2.4, 18, 8],
      },
    }),

    /* ── შენობები ── */
    L('building', 'fill', 'building', {
      minzoom: 13.5,
      paint: {
        'fill-color': c.building,
        'fill-outline-color': c.buildingLine,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 15, 1],
      },
    }),

    /* ── გვირაბები ── */
    L('tunnel', 'line', 'transportation', {
      filter: ['==', ['get', 'brunnel'], 'tunnel'],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMinorLine,
        'line-dasharray': [1.2, 1.2],
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 1, 18, 10],
      },
    }),

    /* ── გზების ჩარჩოები ── */
    L('road-minor-case', 'line', 'transportation', {
      minzoom: 13,
      filter: ['all',
        ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
        ['match', ['get', 'brunnel'], ['tunnel'], false, true]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMinorLine,
        'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 13, 2.2, 20, 22],
      },
    }),
    L('road-major-case', 'line', 'transportation', {
      minzoom: 10,
      filter: ['all',
        ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
        ['match', ['get', 'brunnel'], ['tunnel'], false, true]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMajorLine,
        'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 10, 2.4, 20, 26],
      },
    }),
    L('motorway-case', 'line', 'transportation', {
      minzoom: 6,
      filter: ['all', ['==', ['get', 'class'], 'motorway'],
        ['match', ['get', 'brunnel'], ['tunnel'], false, true]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.motorwayLine,
        'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 7, 1.6, 20, 34],
        // ღამის რეჟიმში მაგისტრალს რბილი ნათება აქვს — ქალაქის სისხლძარღვები
        'line-blur': isDark ? ['interpolate', ['linear'], ['zoom'], 8, 0, 14, 2.5] : 0,
      },
    }),

    /* ── გზების ზედაპირი ── */
    L('road-path', 'line', 'transportation', {
      minzoom: 14,
      filter: ['match', ['get', 'class'], ['path', 'pedestrian'], true, false],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMinor,
        'line-opacity': 0.7,
        'line-dasharray': [2, 1.6],
        'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 14, 0.8, 20, 5],
      },
    }),
    L('road-minor', 'line', 'transportation', {
      minzoom: 12.5,
      filter: ['all',
        ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
        ['match', ['get', 'brunnel'], ['tunnel'], false, true]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMinor,
        'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 13, 1.1, 20, 18],
      },
    }),
    L('road-major', 'line', 'transportation', {
      minzoom: 9,
      filter: ['all',
        ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
        ['match', ['get', 'brunnel'], ['tunnel'], false, true]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.roadMajor,
        'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 10, 1.2, 20, 21],
      },
    }),
    L('motorway', 'line', 'transportation', {
      minzoom: 6,
      filter: ['all', ['==', ['get', 'class'], 'motorway'],
        ['match', ['get', 'brunnel'], ['tunnel'], false, true]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.motorway,
        'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 7, 0.9, 20, 27],
      },
    }),
    L('railway', 'line', 'transportation', {
      minzoom: 12,
      filter: ['all', ['==', ['get', 'class'], 'rail'], ['!', ['has', 'service']]],
      paint: {
        'line-color': c.rail,
        'line-dasharray': [3, 2.5],
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.7, 18, 2.6],
      },
    }),

    /* ── საზღვრები ── */
    L('boundary-city', 'line', 'boundary', {
      filter: ['all', ['>=', ['get', 'admin_level'], 4], ['<=', ['get', 'admin_level'], 9]],
      paint: {
        'line-color': c.boundary,
        'line-dasharray': [2, 2.5],
        'line-opacity': 0.55,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 14, 1.4],
      },
    }),

    /* ── წარწერები ── ქუჩები ქართულად */
    L('label-road', 'symbol', 'transportation_name', {
      minzoom: 14,
      filter: ['match', ['get', 'class'],
        ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'], true, false],
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME_KA,
        'text-font': FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10.5, 18, 13],
        'text-letter-spacing': 0.02,
        'text-rotation-alignment': 'map',
        'text-padding': 4,
      },
      paint: {
        'text-color': c.label,
        'text-halo-color': c.halo,
        'text-halo-width': 1.4,
        'text-halo-blur': 0.4,
      },
    }),
    L('label-water', 'symbol', 'water_name', {
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME_KA,
        'text-font': FONT_ITALIC,
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 11, 16, 15],
        'text-letter-spacing': 0.14,
      },
      paint: {
        'text-color': c.waterway,
        'text-halo-color': c.halo,
        'text-halo-width': 1.2,
      },
    }),
    L('label-park', 'symbol', 'park', {
      minzoom: 13,
      filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'text-field': NAME_KA,
        'text-font': FONT,
        'text-size': 11,
        'text-max-width': 8,
      },
      paint: {
        'text-color': c.poi,
        'text-halo-color': c.halo,
        'text-halo-width': 1.2,
      },
    }),

    /* უბნების სახელები — ვაკე, საბურთალო, ავლაბარი…
       ეს არის ის ფენა, რომელიც რუკას „თბილისურს" ხდის. */
    L('label-suburb', 'symbol', 'place', {
      minzoom: 11.5,
      maxzoom: 16,
      filter: ['match', ['get', 'class'], ['suburb', 'quarter', 'neighbourhood'], true, false],
      layout: {
        'text-field': NAME_KA,
        'text-font': FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 11.5, 10.5, 15, 14],
        'text-letter-spacing': 0.22,
        'text-transform': 'uppercase',
        'text-max-width': 9,
        'text-padding': 8,
      },
      paint: {
        'text-color': c.label,
        'text-halo-color': c.halo,
        'text-halo-width': 1.6,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 11.5, 0, 12.2, 0.85, 15.5, 0.85, 16, 0],
      },
    }),
    L('label-city', 'symbol', 'place', {
      maxzoom: 12,
      filter: ['match', ['get', 'class'], ['city', 'town', 'village'], true, false],
      layout: {
        'text-field': NAME_KA,
        'text-font': FONT_BOLD,
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 12, 11, 19],
        'text-max-width': 8,
      },
      paint: {
        'text-color': c.labelStrong,
        'text-halo-color': c.halo,
        'text-halo-width': 1.8,
      },
    }),
  ];
}

export { PALETTE, NAME_KA, FONT, FONT_BOLD };
