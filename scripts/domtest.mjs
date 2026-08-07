/** DOM კომპონენტების smoke ტესტი jsdom-ზე (WebGL-ის გარეშე). */
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';

const dom = new JSDOM('<!doctype html><html data-theme="light"><head><meta name="theme-color" content="#fff"></head><body><header id="hdr"></header><div id="app"></div><footer id="ftr"></footer></body></html>', { url: 'https://example.com/business.html?b=x', pretendToBeVisual: true });
for (const k of ['window','document','navigator','HTMLElement','Node','CustomEvent','Event','MouseEvent','EventTarget','getComputedStyle','location','history','localStorage','matchMedia','CSS','FormData'])
  try { Object.defineProperty(globalThis, k, { value: dom.window[k] ?? globalThis[k], configurable: true, writable: true }); } catch {}
globalThis.matchMedia ??= () => ({ matches:false, addEventListener(){}, removeEventListener(){} });
dom.window.matchMedia ??= globalThis.matchMedia;
globalThis.structuredClone ??= (o)=>JSON.parse(JSON.stringify(o));

let pass=0, fail=0;
const t=(n,f)=>{try{f();pass++;console.log('  ✓',n);}catch(e){fail++;console.error('  ✗',n,'\n   ',e.message);}};

const { businessCard, businessList, categoryTile, emptyState, EMPTY, stars, skeletonCards } = await import('../src/components/cards.js');
const { detailView, jsonLd } = await import('../src/components/detail.js');
const { CATEGORIES } = await import('../src/data/taxonomy.js');
const { mountHeader, mountFooter } = await import('../src/components/header.js');
const { mountFilterPanel } = await import('../src/components/filter-panel.js');
const { mountSearchBox } = await import('../src/components/searchbox.js');

const biz = {
  id:'b1', slug:'tsiskvili', name:'ცისქვილი', category:'food',
  subcategories:['restaurant','georgian'], tier:2, ratingAvg:4.6, ratingCount:2300,
  attrList:['parking','delivery'], district:'vake', priceLevel:3, lat:41.7086, lon:44.7625,
  hours:{mon:[['09:00','23:00']],tue:[['09:00','23:00']]}, phone:['+995322001122'],
  website:'https://tsiskvili.ge', address:'ვაკე, ჭავჭავაძის 12',
  items:[{id:'i1',name:{ka:'ხაჭაპური'},group:'ცხელი',price:1250}],
  promos:[{title:'2+1',active:true}], source:'owner',
};

console.log('\nკომპონენტები');
t('businessCard', ()=>{ const h=businessCard(biz); assert.ok(h.includes('ცისქვილი')); assert.ok(h.includes('business.html?b=tsiskvili')); assert.ok(!h.includes('undefined')); });
t('businessCard ცარიელ ბიზნესზე', ()=>{ const h=businessCard({id:'x',name:'—',tier:0}); assert.ok(!h.includes('undefined')); assert.ok(!h.includes('NaN')); });
t('businessList ცარიელი → empty state', ()=>{ assert.ok(businessList([]).includes('empty')); });
t('categoryTile ყველა კატეგორიაზე', ()=>{ for(const c of CATEGORIES){ const h=categoryTile(c,5); assert.ok(!h.includes('undefined'),c.id); } });
t('emptyState ყველა ვარიანტი', ()=>{ for(const k of Object.keys(EMPTY)){ const h=emptyState(EMPTY[k]); assert.ok(h.includes('empty-title'),k); assert.ok(!h.includes('undefined'),k);} });
t('stars / skeleton', ()=>{ assert.ok(stars(4).includes('svg')); assert.ok(skeletonCards(2).includes('skel')); });

console.log('\nდეტალური ხედი');
t('detailView სრულ ბიზნესზე', ()=>{ const h=detailView(biz); for(const s of ['ცისქვილი','ხაჭაპური','12.5 ₾','ვაკე','tsiskvili.ge','2+1']) assert.ok(h.includes(s),`აკლია: ${s}`); assert.ok(!h.includes('undefined')); });
t('detailView მინიმალურ ბიზნესზე', ()=>{ const h=detailView({id:'x',name:'ტესტი',tier:0,lat:41,lon:44}); assert.ok(h.includes('ტესტი')); assert.ok(h.includes('უცნობია')); assert.ok(!h.includes('undefined')); });
t('detailView loading', ()=>{ assert.ok(detailView(null,{loading:true}).includes('skel')); });
t('jsonLd ვალიდური JSON და schema.org', ()=>{ const d=JSON.parse(jsonLd(biz)); assert.equal(d['@type'],'Restaurant'); assert.equal(d.name,'ცისქვილი'); assert.ok(d.geo.latitude); assert.ok(Array.isArray(d.openingHours)); assert.equal(d.aggregateRating.reviewCount,2300); });
t('jsonLd 24/7-ზე', ()=>{ const d=JSON.parse(jsonLd({...biz,alwaysOpen:true,hours:null})); assert.equal(d.openingHours,'Mo-Su 00:00-23:59'); });
t('XSS ესკეიპი', ()=>{ const h=businessCard({id:'x',name:'<img src=x onerror=alert(1)>',tier:0}); assert.ok(!h.includes('<img src=x')); assert.ok(h.includes('&lt;img')); });

console.log('\nმონტაჟი DOM-ში');
t('mountHeader', ()=>{ mountHeader({active:'map'}); const h=document.querySelector('#hdr'); assert.ok(h.querySelector('.brand')); assert.ok(h.querySelector('.theme-btn')); assert.equal(h.querySelectorAll('nav a').length,4); });
t('mountFooter', ()=>{ mountFooter(); assert.ok(document.querySelector('#ftr').textContent.includes('OpenStreetMap')); });
t('mountFilterPanel + კლიკი', ()=>{ const host=document.querySelector('#app'); mountFilterPanel(host,{counts:new Map([['food',12]])}); assert.ok(host.querySelectorAll('.cat-item').length>=12); const btn=host.querySelector('[data-act="cat"][data-value="food"]'); btn.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})); assert.ok(host.innerHTML.includes('აქტიური ფილტრები'),'ფილტრი არ გააქტიურდა'); });
t('mountSearchBox', ()=>{ const host=document.createElement('div'); document.body.append(host); const box=mountSearchBox(host,{}); assert.ok(box.input); assert.ok(host.querySelector('.suggest')); });


console.log('\nრეგრესია');
const { readFileSync, readdirSync } = await import('node:fs');
t('CityMap-ს კონტეინერი სელექტორის სტრიქონად არ გადაეცემა', () => {
  // MapLibre კონტეინერს getElementById-ით ეძებს — "#map" მას ვერ პოულობს.
  // map-core.js ახლა დამცავია, მაგრამ გამოძახების ადგილიც სუფთა უნდა იყოს.
  const files = ['src/pages/map.js', 'src/pages/home.js', 'src/pages/business.js',
                 'src/components/business-form.js'];
  for (const f of files) {
    const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    const bad = src.match(/new CityMap\(\s*['"`]/);
    assert.equal(bad, null, `${f}: CityMap-ს სტრიქონი გადაეცემა, საჭიროა DOM ელემენტი`);
  }
});

t('map-core კონტეინერს ორივე ფორმით იღებს', () => {
  const src = readFileSync(new URL('../src/lib/map-core.js', import.meta.url), 'utf8');
  assert.ok(src.includes('querySelector(container)'), 'დამცავი container-ის რეზოლუცია აკლია');
});

console.log('\n' + '─'.repeat(46));
console.log(fail? `❌ ${fail} შეცდომა, ${pass} წარმატებული` : `✅ ყველა ${pass} შემოწმება გავიდა`);
process.exitCode = fail?1:0;
