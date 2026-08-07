/** რუკის სტილისა და ფენების ვალიდაცია MapLibre-ის სპეციფიკაციით. */
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import assert from 'node:assert/strict';

// tokens.css-ის ფერების იმიტაცია (getComputedStyle jsdom-ის გარეშე)
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#C0522A' });
globalThis.import_meta_env = {};

const { buildStyle } = await import('../src/lib/map-style.js');

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  ✓', n); } catch (e) { fail++; console.error('  ✗', n, '\n   ', e.message); } };

console.log('\nრუკის სტილი');
for (const theme of ['light', 'dark']) {
  t(`${theme}: სპეციფიკაციის ვალიდაცია`, () => {
    const style = buildStyle(theme);
    const errors = validateStyleMin(style);
    if (errors.length) throw new Error(errors.map((e) => `${e.line ?? ''} ${e.message}`).join('\n    '));
  });
  t(`${theme}: ფენების id-ები უნიკალურია`, () => {
    const ids = buildStyle(theme).layers.map((l) => l.id);
    assert.equal(ids.length, new Set(ids).size);
  });
  t(`${theme}: წყალი, გზები და წარწერები არსებობს`, () => {
    const ids = buildStyle(theme).layers.map((l) => l.id);
    for (const need of ['water', 'motorway', 'road-major', 'road-minor', 'building', 'label-road', 'label-suburb'])
      assert.ok(ids.includes(need), `ფენა აკლია: ${need}`);
  });
  t(`${theme}: ქართული წარწერები (name:ka)`, () => {
    const s = JSON.stringify(buildStyle(theme));
    assert.ok(s.includes('name:ka'), 'ქართული სახელის ველი არ გამოიყენება');
  });
}

t('glyphs და source განსაზღვრულია', () => {
  const s = buildStyle('light');
  assert.ok(s.glyphs?.includes('{fontstack}'));
  assert.equal(s.sources.openmaptiles.type, 'vector');
  assert.ok(s.sources.openmaptiles.attribution.includes('OpenStreetMap'));
});

console.log('\nფილტრის გამოსახულებები');
const { toMapExpression, setFilter, resetFilters } = await import('../src/lib/filters.js');
globalThis.location = { search: '', pathname: '/map.html', hash: '' };
globalThis.history = { replaceState() {}, pushState() {} };

t('ცარიელი ფილტრი → null', () => {
  resetFilters();
  assert.equal(toMapExpression().expression, null);
});
t('კომბინირებული ფილტრი ვალიდურ expression-ს აწყობს', () => {
  setFilter({ cat: 'food', subs: ['pizza', 'sushi'], attrs: ['delivery'], price: [1, 2], open: true, rating: 4 });
  const { expression } = toMapExpression();
  assert.equal(expression[0], 'all');
  const style = buildStyle('light');
  style.sources.test = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } };
  style.layers.push({ id: 'test-pin', type: 'circle', source: 'test', filter: ['all', ['!', ['has', 'point_count']], expression] });
  const errors = validateStyleMin(style);
  if (errors.length) throw new Error(errors.map((e) => e.message).join('; '));
  resetFilters();
});


console.log('\nბიზნესების ფენები');
const { iconImageExpression, categoryColorExpression } = await import('../src/lib/map-pins.js');

t('პინის ფენები ვალიდურია სპეციფიკაციით', () => {
  const style = buildStyle('light');
  style.sources.biz = {
    type: 'geojson', cluster: true, clusterRadius: 52, clusterMaxZoom: 14,
    clusterProperties: { openCount: ['+', ['case', ['==', ['get', 'open'], 1], 1, 0]] },
    data: { type: 'FeatureCollection', features: [] },
  };
  style.layers.push(
    { id: 'biz-cluster-glow', type: 'circle', source: 'biz', filter: ['has', 'point_count'],
      paint: { 'circle-color': '#C0522A', 'circle-opacity': 0.13, 'circle-blur': 0.85,
        'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 22, 25, 34, 120, 48, 600, 66, 3000, 88] } },
    { id: 'biz-cluster', type: 'circle', source: 'biz', filter: ['has', 'point_count'],
      paint: { 'circle-color': '#fff', 'circle-stroke-color': '#C0522A', 'circle-stroke-width': 2,
        'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 15, 25, 20, 120, 26, 600, 33, 3000, 42] } },
    { id: 'biz-cluster-count', type: 'symbol', source: 'biz', filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['get', 'point_count'], 2, 12, 600, 15], 'text-allow-overlap': true },
      paint: { 'text-color': '#111' } },
    { id: 'biz-halo', type: 'circle', source: 'biz', filter: ['==', ['get', 'id'], ''],
      paint: { 'circle-radius': 22, 'circle-color': '#C0522A', 'circle-opacity': 0.18, 'circle-blur': 0.4, 'circle-translate': [0, -13] } },
    { id: 'biz-pin', type: 'symbol', source: 'biz', filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': iconImageExpression(),
        'icon-anchor': ['case', ['>=', ['get', 'tier'], 1], 'bottom', 'center'],
        'icon-allow-overlap': true, 'icon-ignore-placement': false,
        'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.72, 15, 0.9, 17, 1],
        'symbol-sort-key': ['-', 0, ['+', ['*', ['get', 'tier'], 100], ['get', 'rating']]],
      },
      paint: { 'icon-opacity': ['case', ['==', ['get', 'open'], 3], 0.55, 1] } },
    { id: 'biz-label', type: 'symbol', source: 'biz', minzoom: 15.5,
      filter: ['all', ['!', ['has', 'point_count']], ['>=', ['get', 'tier'], 1]],
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11.5,
        'text-anchor': 'top', 'text-offset': [0, 0.35], 'text-max-width': 9, 'text-optional': true, 'text-padding': 3 },
      paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 1.6 } },
  );
  const errors = validateStyleMin(style);
  if (errors.length) throw new Error(errors.map((e) => `${e.identifier ?? ''} ${e.message}`).join('\n    '));
});

t('კატეგორიის ფერის გამოსახულება ყველა კატეგორიას ფარავს', () => {
  const expr = categoryColorExpression();
  assert.equal(expr[0], 'match');
  assert.ok(expr.length >= 12 * 2 + 3);
});

console.log('\n' + '─'.repeat(46));
console.log(fail ? `❌ ${fail} შეცდომა, ${pass} წარმატებული` : `✅ ყველა ${pass} შემოწმება გავიდა`);
process.exitCode = fail ? 1 : 0;
