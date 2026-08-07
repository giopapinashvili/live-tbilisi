# Tbilisi LIVE — არქიტექტურა და გეგმა

**ვერსია:** 0.1 · **თარიღი:** 2026-08-07
**სტატუსი:** დიზაინის დოკუმენტი, კოდი ჯერ არ დაწერილა
**Scope:** მთელი თბილისი, ყველა კატეგორია. ცალკე repo, GeoHub-თან შერწყმა მოგვიანებით.

---

## 1. რას ვაშენებთ

ერთი ვებ-პლატფორმა, სადაც თბილისში არსებული ყველა ბიზნესი, სერვისი და ობიექტია — რუკაზე, ფილტრით, სრული დეტალებით (მენიუ, პროდუქტი, ფასი, საათები, აქცია).

**რას *არ* ვაშენებთ ჯერ:** feed, stories, ვიდეოები, messenger, AI chat. ეს ყველაფერი მომხმარებელს სჭირდება — მაგრამ მხოლოდ მაშინ, როცა უკვე გვყავს მომხმარებელი. ცარიელი feed უფრო აზიანებს ნდობას, ვიდრე მისი არარსებობა.

### 1.1 მთელი ქალაქი, ყველა კატეგორია — როგორ

არჩეული scope ("მთელი თბილისი, ყველაფერი") ერთ პირობაში მუშაობს: **სიგანე მანქანურად, სიღრმე თანდათან.**

ხელით 30,000 ბიზნესის შევსება შეუძლებელია. ამიტომ სიგანეს ვიღებთ OpenStreetMap-ის bulk იმპორტით (§8), სიღრმეს კი ეტაპობრივად ვამატებთ. თითოეულ ბიზნესს აქვს **tier** — მონაცემის სისრულის დონე:

| Tier | რა იცის სისტემამ | წყარო | UI-ში |
|---|---|---|---|
| **0** | სახელი, კოორდინატი, კატეგორია | OSM იმპორტი | ნაცრისფერი პინი, ბეჯი „დაუდასტურებელი" |
| **1** | + საათები, ტელეფონი, მისამართი, ფოტო | ხელით / scrape / user edit | ჩვეულებრივი პინი |
| **2** | + მენიუ/პროდუქტები, ფასები, გალერეა, აქციები | ბიზნესის dashboard | ფერადი პინი, ჩანს ძებნაში მაღლა |

ესეიგი დღე პირველიდან რუკა სავსეა (სიგანე მოგვარებულია), მაგრამ სისტემა პატიოსნად აჩვენებს რას იცის და რას არა. ეს ბევრად უკეთესია, ვიდრე 200 სრულყოფილი ბიზნესი ცარიელ ქალაქში.

---

## 2. მთავარი არქიტექტურული გადაწყვეტილება: ორი data plane

ეს დოკუმენტის ყველაზე მნიშვნელოვანი ნაწილია. თუ აქ შეცდები, პროექტი ან ნელი იქნება, ან ძვირი, ან ორივე.

**პრობლემა:** თუ რუკა Firestore-იდან კითხულობს პინებს, ერთი მომხმარებლის ერთი პანორამირება = ათასობით დოკუმენტის წაკითხვა. Firestore-ის უფასო ლიმიტი 50,000 read/დღეში ამოიწურება ~20 ვიზიტორზე. ეს პროექტის მკვლელია.

**გადაწყვეტა:** მონაცემი გავყოთ ორ სიბრტყედ.

```
                    ┌─────────────────────────────┐
   ჩაწერა           │  FIRESTORE (source of truth)│
   ─────────────────▶  businesses, items, reviews │
   dashboard,       │  edits, promos, users       │
   admin, users     └──────────────┬──────────────┘
                                   │
                    Cloud Function (nightly + on-demand)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
   კითხვა           │  CLOUDFLARE R2 (read plane) │
   ◀────────────────┤  /bundles/{district}.json   │
   რუკა, ფილტრი,    │  /bundles/index.json        │
   კატეგორიის       │  /tiles/tbilisi.pmtiles     │
   გვერდები         └─────────────────────────────┘
```

- **Write plane — Firestore.** ჭეშმარიტების ერთადერთი წყარო. აქ წერს ბიზნესის dashboard, ადმინი, მომხმარებელი (რევიუ, შესწორება). აქედან *პირდაპირ* კითხულობს მხოლოდ dashboard და ერთი ბიზნესის დეტალური გვერდი.
- **Read plane — Cloudflare R2 + Pages.** სტატიკური JSON ბანდლები, რომლებსაც Cloud Function ხელახლა აგენერირებს. რუკა, ფილტრი და ძებნა მხოლოდ ამ ფაილებს კითხულობს. Cloudflare-ზე egress უფასოა და CDN-ით ქეშირდება.

**შედეგი:** 10,000 ვიზიტორმა შეიძლება დღეში ერთი Firestore read-ის გარეშე იმუშაოს რუკაზე. ხარჯი ~$0.

**ღირებულება:** მონაცემი არაა real-time. ბიზნესმა თუ საათი შეცვალა, რუკაზე გამოჩნდება 15 წუთში (on-demand regeneration) ან მეორე დღეს. ეს სავსებით მისაღებია — „ღიაა/დახურულია" ისედაც კლიენტის მხარეს გამოითვლება `hours`-იდან, ანუ სწორია მაშინაც კი, როცა ბანდლი ცოტა ძველია.

---

## 3. ტექ სტეკი

| ფენა | არჩევანი | რატომ |
|---|---|---|
| Frontend | Vanilla JS (ES modules) + Vite, multi-page | GeoHub-ის სტეკი — მოგვიანებით შერწყმა უმტკივნეულო იქნება |
| რუკა | MapLibre GL JS | ღია კოდი, Google Maps API-ს ფასი არ გვჭირდება |
| რუკის ტაილები | **Protomaps PMTiles** Cloudflare R2-ზე | ერთი ფაილი, per-request ხარჯი არ არსებობს. ალტერნატივა: MapTiler უფასო tier (100k tile/თვე) — სწრაფად ამოიწურება |
| ბაზა | Firebase Firestore | GeoHub-ის სტეკი, უფასო tier საკმარისია write-ისთვის |
| Auth | Firebase Auth (Google + ტელეფონი) | ტელეფონით შესვლა ქართული ბაზრისთვის სავალდებულოა |
| ფაილები | Cloudflare R2 + Images | Firebase Storage-ის egress ძვირია მასშტაბზე |
| ბექენდი | Cloudflare Pages Functions + Firebase Cloud Functions | Pages Functions — SSR; Cloud Functions — ბანდლების გენერაცია |
| ტექსტური ძებნა | Meilisearch (self-host, ~$6/თვე VPS) | Firestore ტექსტს ვერ ეძებს. Algolia ძვირია მასშტაბზე |
| ჰოსტინგი | Cloudflare Pages | უფასო, სწრაფი, უკვე ვიყენებთ |

**რას არ ვიყენებთ და რატომ:** React/Vue (GeoHub-ის კონვენციასთან წინააღმდეგობა), Google Maps API (ფასი), Elasticsearch (overkill), vector/embedding search (ამ ამოცანისთვის structured filter უფრო ზუსტია და 100x იაფი).

---

## 4. მონაცემთა მოდელი (Firestore)

### 4.1 `businesses/{businessId}`

```ts
{
  slug: string,              // "tsiskvili-vake" — URL-ისთვის, უნიკალური
  name:    { ka: string, en?: string, ru?: string },
  descr?:  { ka: string, en?: string, ru?: string },

  // --- ლოკაცია ---
  loc: GeoPoint,             // Firestore GeoPoint
  geohash: string,           // geofire-common, 9 სიმბოლო — radius query-სთვის
  district: string,          // "vake" | "saburtalo" | ... (§5.2)
  address: { ka: string, en?: string },
  addressNote?: string,      // "მე-2 სართული, ეზოდან შესასვლელი"

  // --- კატეგორია ---
  category: string,          // ერთი root: "food" | "health" | "shopping" | ...
  subcategories: string[],   // ["restaurant", "georgian", "wine-bar"] — max 8

  // --- საათები ---
  hours: {                   // 24-საათიანი, "HH:mm". რამდენიმე ინტერვალი = შესვენება
    mon: [["09:00","14:00"], ["15:00","22:00"]],
    tue: [["09:00","22:00"]],
    // ...
    sun: []                  // ცარიელი = დახურული
  } | null,                  // null = უცნობია (tier 0)
  alwaysOpen: boolean,       // 24/7 — hours-ს გადაფარავს
  timezone: "Asia/Tbilisi",

  // --- კონტაქტი ---
  phone?: string[],          // ["+995322001122"] — E.164
  email?: string,
  website?: string,
  social?: { fb?, ig?, tiktok?, telegram? },

  // --- მედია ---
  cover?: string,            // R2 key
  photos: string[],          // max 30 R2 key
  logo?: string,

  // --- ატრიბუტები (ფილტრისთვის; ბრტყელი boolean map) ---
  attrs: {
    delivery?: boolean, takeaway?: boolean, dineIn?: boolean,
    parking?: boolean, wifi?: boolean, cards?: boolean,
    outdoor?: boolean, kidsFriendly?: boolean, petsAllowed?: boolean,
    wheelchair?: boolean, reservation?: boolean, alcohol?: boolean,
    vegan?: boolean, halal?: boolean,
    // კატეგორია-სპეციფიკური:
    prescriptionFree?: boolean,     // აფთიაქი
    womenOnly?: boolean,            // სალონი
    homeVisit?: boolean,            // მედიცინა/სერვისი
  },
  attrList: string[],        // ზემოთა map-ის true გასაღებები — array-contains query-სთვის

  priceLevel?: 1|2|3|4,

  // --- სოციალური ---
  rating: { avg: number, count: number, sum: number },  // sum — ატომური განახლებისთვის

  // --- მეტა ---
  tier: 0|1|2,
  source: "osm" | "manual" | "owner" | "import",
  osmId?: string,            // "node/123456" — დუბლიკატის თავიდან ასაცილებლად
  ownerUid?: string,         // ვინ მართავს dashboard-იდან
  verifiedAt?: Timestamp,
  status: "active" | "temporarily-closed" | "closed" | "pending",

  searchName: string,        // lowercase, ლათინური ტრანსლიტი + ქართული — prefix ძებნისთვის
  viewCount: number,

  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**შენიშვნები:**
- `attrs` (map) UI-სთვისაა, `attrList` (array) query-სთვის. დუბლირება განზრახია — Firestore-ში map-ის ველებზე ფილტრი ინდექსების აფეთქებას იწვევს.
- `rating.sum` ინახება, რომ ახალი შეფასებისას `avg` ერთი ატომური `increment`-ით გამოითვალოს, ყველა რევიუს წაკითხვის გარეშე.
- `geohash` — `geofire-common`-ის ფორმატით. radius query = geohash range query-ების ნაკრები.

### 4.2 `businesses/{id}/items/{itemId}` — მენიუ / პროდუქტი / სერვისი

ერთი უნივერსალური მოდელი სამივესთვის. ხაჭაპური, დივანი და თმის შეჭრა სტრუქტურულად ერთი და იგივეა: სახელი + ფასი + ფოტო + ჯგუფი.

```ts
{
  name: { ka: string, en?: string },
  descr?: { ka: string, en?: string },
  group: string,             // "ცხელი კერძები" | "ლეპტოპები" | "მამაკაცის სერვისი"
  groupOrder: number,        // ჯგუფების თანმიმდევრობა მენიუში
  order: number,             // პოზიცია ჯგუფში

  price: number,             // ლარი, თეთრებით: 1250 = 12.50 ₾
  oldPrice?: number,         // ფასდაკლების ჩვენება
  currency: "GEL",
  unit?: string,             // "ცალი" | "კგ" | "სთ" | "300გრ"

  photo?: string,
  available: boolean,
  attrs?: {                  // კატეგორიის მიხედვით თავისუფალი
    calories?: number, spicy?: boolean, vegan?: boolean,   // საკვები
    brand?: string, model?: string, warranty?: number,     // ტექნიკა
    duration?: number,                                     // სერვისი (წუთი)
  },
  updatedAt: Timestamp,
}
```

**რატომ subcollection და არა მასივი ბიზნესის დოკუმენტში:** Firestore-ის დოკუმენტის ლიმიტი 1 MB. Carrefour-ს 20,000 პროდუქტი აქვს. subcollection სავალდებულოა.

### 4.3 დანარჩენი კოლექციები

```
categories/{id}         → ტაქსონომიის ხე (§5). იშვიათად იცვლება, ერთხელ იტვირთება
promos/{id}             → { businessId, title, descr, type, discount,
                            startsAt, endsAt, active, photo }
reviews/{id}            → { businessId, uid, rating 1-5, text, photos[],
                            createdAt, status: "live"|"flagged"|"removed" }
edits/{id}              → მომხმარებლის შესწორება. { businessId, uid, field,
                            oldValue, newValue, note, status: "pending"|"approved"|"rejected" }
claims/{id}             → ბიზნესის მფლობელობის მოთხოვნა. { businessId, uid,
                            proof, status }
users/{uid}             → { displayName, photo, createdAt, contributions }
users/{uid}/saved/{id}  → შენახული ბიზნესები (privately scoped)
```

**`edits` კოლექცია კრიტიკულია.** 30,000 ბიზნესის მონაცემის განახლება მხოლოდ crowdsourcing-ით შეიძლება. ყოველ გვერდზე ღილაკი „ინფორმაცია არასწორია" → `edits`-ში ჩანაწერი → ადმინი/მფლობელი ადასტურებს. ეს არაა nice-to-have, ეს არის მთელი პროექტის მდგრადობის მექანიზმი.

---

## 5. ტაქსონომია

### 5.1 კატეგორიების ხე

ორ დონედ. root კატეგორია განსაზღვრავს პინის ფერს და ფილტრის პანელს; subcategory — დეტალურ ფილტრს.

```
food          საკვები          → restaurant, cafe, bakery, fastfood, shawarma,
                                  pizza, sushi, khinkali, bar, club, dessert, coffee
shopping      მაღაზიები        → grocery, supermarket, clothing, shoes, electronics,
                                  phones, computers, furniture, jewelry, books,
                                  cosmetics, toys, sport, construction, pet
health        ჯანმრთელობა      → pharmacy, clinic, hospital, dentist, lab, mri,
                                  vet, optics, psychologist
beauty        სილამაზე         → hairdresser, barber, nails, spa, massage, laser,
                                  tattoo, solarium
services      სერვისები        → repair, laundry, tailor, locksmith, printing,
                                  photo, legal, notary, bank, insurance, realestate
auto          ავტო             → gas, carwash, tires, service, parts, detailing,
                                  parking, rental
education     განათლება        → university, school, kindergarten, courses,
                                  language, it, music, driving
leisure       გართობა          → cinema, theatre, museum, gym, pool, bowling,
                                  playground, park, gaming
hotel         საცხოვრებელი     → hotel, hostel, guesthouse, apartment
transport     ტრანსპორტი       → metro, busstop, taxi, airport, station
public        საჯარო           → government, post, police, embassy, library, church
```

12 root, ~90 subcategory. `categories` კოლექციაში, თითოეულს: `{ id, parent, name{ka,en}, icon, color, osmTags[], attrsSchema[] }`.

`osmTags` — რომელი OSM ტეგები აისახება ამ კატეგორიაში (§8.1). `attrsSchema` — რომელი ატრიბუტების ფილტრი გამოჩნდეს ამ კატეგორიის არჩევისას (აფთიაქზე „ვეგანური" არ უნდა ჩანდეს).

### 5.2 უბნები

`vake, saburtalo, vera, mtatsminda, sololaki, chugureti, avlabari, isani, samgori, gldani, nadzaladevi, didube, varketili, digomi, dighomi-massive, ortachala, krtsanisi, lilo, vazisubani, temka, mukhiani, sanzona, didi-dighomi`

უბანი — არა მხოლოდ ფილტრი, არამედ **ბანდლის დაყოფის ერთეული** (§6) და **SEO landing page-ის ღერძი** (§9.2).

---

## 6. Read plane: ბანდლების პაიპლაინი

### 6.1 რა გენერირდება

```
r2://bundles/
  index.json                       ~5 KB   კატეგორიები, უბნები, ვერსია, ბანდლების მანიფესტი
  d/{district}.json                50-300 KB  უბნის ყველა ბიზნესი (მსუბუქი ჩანაწერი)
  c/{category}.json                          კატეგორიის ყველა ბიზნესი მთელ ქალაქში
  b/{businessId}.json              2-40 KB   სრული ბიზნესი + items + promos (დეტალური გვერდისთვის)
  promos/active.json                         ყველა აქტიური აქცია
```

მსუბუქი ჩანაწერი ბანდლში (რუკის პინისთვის საკმარისი):
```json
["biz_a1b2", "ცისქვილი", 41.7086, 44.7625, "food", ["restaurant","georgian"],
 2, 4.6, 2300, ["delivery","parking","cards"], "H", 3]
```
მასივი და არა ობიექტი — 30,000 ჩანაწერზე ეს ~40% ზომაშია. კლიენტი ერთხელ ახდენს დეკოდირებას სქემით `index.json`-იდან. Gzip-ის შემდეგ მთელი ქალაქი ~1.5-3 MB, უბანი ~100 KB.

### 6.2 როგორ გენერირდება

Firebase Cloud Function, ორი trigger-ით:
1. **Scheduled** — ყოველ ღამე 04:00, სრული rebuild ყველა ბანდლისა.
2. **On-demand** — `businesses/{id}` ან `items` write-ზე, დებს `rebuildQueue`-ში. ცალკე ფუნქცია ყოველ 15 წუთში ამუშავებს რიგს და მხოლოდ დაზიანებულ ბანდლებს აახლებს.

დაწერის შემდეგ ბამპდება `index.json`-ის `version`. კლიენტი `index.json`-ს `no-cache`-ით იღებს, დანარჩენს — `immutable` + ვერსია URL-ში (`d/vake.json?v=412`). ესეიგი CDN ქეში სრულად მუშაობს და მაინც არასდროს ჩერდება ძველზე.

### 6.3 რუკის რენდერი

30,000 პინი DOM-ში შეუძლებელია. MapLibre-ის native ფენები:
- ბანდლი → GeoJSON source, `cluster: true`
- zoom < 14 → კლასტერები (რიცხვით)
- zoom ≥ 14 → ცალკეული პინები, `circle`/`symbol` ფენა (GPU-ზე, არა DOM)
- ფილტრი → MapLibre `setFilter()` — მყისიერი, ქსელის გარეშე

**კრიტიკული:** ფილტრი ქსელს არ ეხება. მომხმარებელი ჭექს „მიტანა + 24 საათი + ★4+" და შედეგი მყისვე ჩანს, რადგან მონაცემი უკვე ბრაუზერშია. სწორედ ეს გრძნობა განასხვავებს ამ პროდუქტს კონკურენტებისგან.

---

## 7. ძებნა — სამი დონე

| დონე | რა | სად | როდის |
|---|---|---|---|
| **L1** | ფილტრი + პრეფიქსული ძებნა ჩატვირთულ ბანდლში | ბრაუზერი | ფაზა 1 |
| **L2** | სრული ტექსტური ძებნა ბიზნესებსა და **items**-ში | Meilisearch | ფაზა 2 |
| **L3** | ბუნებრივი ენა → სტრუქტურული query | LLM + L2 | ფაზა 3 |

**L1** — `searchName`-ზე `includes()`. ქართული და ლათინური ტრანსლიტერაცია ორივე ინდექსდება, რომ „tsiskvili"-თაც და „ცისქვილი"-თაც მოიძებნოს.

**L2** — Meilisearch-ის ორი ინდექსი: `businesses` და `items`. items ინდექსი აძლიერებს „სად ვიყიდო თეთრი დივანი"-ს — ეძებ პროდუქტს, გიბრუნებს ბიზნესს. Meilisearch typo-tolerant არის, რაც ქართული კლავიატურის შეცდომებზე მნიშვნელოვანია. სინქრონიზაცია: იგივე Cloud Function, რომელიც ბანდლებს აგენერირებს, აახლებს ინდექსსაც.

**L3** — მომხმარებლის ტექსტს LLM-ს ვაძლევთ და **სტრუქტურულ ფილტრს** ვთხოვთ, არა პასუხს:
```
"ხვალ 8-ზე 6 კაცისთვის იტალიური, პარკინგით, 200 ლარამდე"
      ↓
{ category:"food", subcategories:["italian"], attrList:["parking"],
  priceLevel:[1,2], openAt:"2026-08-08T20:00", minSeats:6 }
      ↓ ეს ჩვეულებრივ L2 query-ად გადადის
```
არა vector search, არა RAG. structured extraction ამ ამოცანაზე უფრო ზუსტია, გამართლებადია (მომხმარებელს ვაჩვენებთ რა ფილტრი გამოვიყენეთ და შეუძლია შეასწოროს) და ~100x იაფი.

---

## 8. მონაცემების მოპოვება

### 8.1 საწყისი იმპორტი — OpenStreetMap

Overpass API-ს ერთი მოთხოვნა თბილისის bounding box-ზე მოგვცემს ყველა `amenity`, `shop`, `office`, `healthcare`, `tourism`, `leisure` ტეგიან ობიექტს. მოსალოდნელი მოცულობა 15-30k (ზუსტი რიცხვი პირველი query-ის შემდეგ დაზუსტდება).

```
[out:json][timeout:180];
area["name:en"="Tbilisi"]["admin_level"="4"]->.a;
(
  node["amenity"](area.a); way["amenity"](area.a);
  node["shop"](area.a);    way["shop"](area.a);
  node["office"](area.a);  node["healthcare"](area.a);
  node["leisure"](area.a); node["tourism"](area.a);
);
out center tags;
```

იმპორტის სკრიპტი: OSM ტეგი → ჩვენი კატეგორია (mapping ცხრილი `categories.osmTags`-ში), `opening_hours` → ჩვენი `hours` ფორმატში, geohash-ის დათვლა, `osmId`-ის შენახვა. ყველა tier 0.

**ლიცენზია:** OSM მონაცემი ODbL-ია. სავალდებულოა attribution („© OpenStreetMap contributors") და თუ OSM-ის მონაცემს გავავრცელებთ შეცვლილი სახით, share-alike მოქმედებს. პრაქტიკული გამოსავალი: OSM ჩანაწერი და ჩვენი enrichment ცალკე ველებში გვქონდეს, რომ საკუთარი მონაცემი გამიჯნული იყოს. **ეს იურიდიული საკითხია და გაშვებამდე იურისტს უნდა ვკითხოთ — მე იურისტი არ ვარ.**

### 8.2 Enrichment — tier 0 → 1

პრიორიტეტი: ჯერ ის ბიზნესები, რომლებსაც ხალხი ეძებს (`viewCount`), არა ანბანური თანმიმდევრობით.

- ბიზნესის საკუთარი საიტი / FB გვერდი → საათები, ტელეფონი, ფოტო (brightdata scraper)
- Google Places API — ერთჯერადი enrichment. **გაითვალისწინე:** Google-ის ToS კრძალავს Places-ის მონაცემის მუდმივ შენახვას `place_id`-ის გარდა. ანუ ამას ვერ გამოვიყენებთ ჩვენი ბაზის შესავსებად. ვარიანტი — მხოლოდ დუბლიკატის შესამოწმებლად.
- ხელით შევსება ინტერნებით/ფრილანსერებით — top 500 ბიზნესზე ღირს

### 8.3 Depth — tier 1 → 2

**ერთადერთი მდგრადი გზა: თვითონ ბიზნესმა შეავსოს.** ამიტომ dashboard არაა ფაზა 2-ის „კარგი დამატება" — ის არის პროდუქტის ბირთვი. ბიზნესს უნდა ჰქონდეს მიზეზი: უფასო პროფილი + სტატისტიკა (რამდენმა ნახა, რამდენმა დაგირეკა) + აქციის განთავსება.

**Wolt/Glovo-დან მენიუების scraping-ზე:** ტექნიკურად შესაძლებელია, მაგრამ მათ ToS-ს არღვევს და სამართლებრივ და რეპუტაციულ რისკს ქმნის დამწყები პლატფორმისთვის. **არ გირჩევ.** სამაგიეროდ: მენიუს PDF/ფოტოს ატვირთვა dashboard-იდან + OCR-ით ავტომატური სტრუქტურირება — ბიზნესისთვის 2 წუთის საქმეა და სრულიად ლეგალური.

---

## 9. გვერდები, routing, SEO

### 9.1 Routes

```
/                        მთავარი — ძებნა, რუკის preview, აქციები, კატეგორიები
/map                     სრული რუკა + ფილტრები
/b/{slug}                ბიზნესის გვერდი                    ← SSR
/c/{category}            კატეგორიის ლისტინგი მთელ ქალაქში   ← SSR
/c/{category}/{district} კატეგორია + უბანი                  ← SSR
/search?q=               ძებნის შედეგები
/promos                  ყველა აქცია
/dashboard               ბიზნესის პანელი                     (auth)
/admin                   მოდერაცია                           (custom claim)
```

### 9.2 SEO — ეს არაა მეორეხარისხოვანი

ლოკალური დირექტორია ცოცხლობს Google-ის ორგანულ ტრაფიკზე. ადამიანი წერს „აფთიაქი ვაკეში 24 საათი" — ჩვენ იქ უნდა ვიყოთ.

**ამიტომ `/b/*` და `/c/*` სავალდებულოდ სერვერზე უნდა დარენდერდეს.** SPA აქ არ გამოდგება. Cloudflare Pages Functions აკეთებს SSR-ს ბანდლიდან (`b/{id}.json` R2-იდან, არა Firestore-იდან — ისევ ხარჯი).

12 კატეგორია × 23 უბანი = **276 ავტომატური landing page**, თითოეული რეალური query-ის ქვეშ. ეს პროექტის ყველაზე იაფი და ყველაზე ეფექტური მარკეტინგული არხია.

თითოეულ ბიზნესის გვერდზე JSON-LD `LocalBusiness` schema (`Restaurant`, `Pharmacy`, `Store` — კატეგორიის მიხედვით), `openingHours`, `aggregateRating`, `geo`. `searchfit-seo:schema-markup` სკილი ამას გვიგენერირებს.

`hreflang` ka/en/ru — ტურისტული ტრაფიკი მნიშვნელოვანი სეგმენტია და კონკურენცია იქ სუსტია.

---

## 10. Security rules (ჩონჩხი)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function isSignedIn()  { return request.auth != null; }
    function isAdmin()     { return isSignedIn() && request.auth.token.admin == true; }
    function isOwner(biz)  { return isSignedIn() &&
                             get(/databases/$(db)/documents/businesses/$(biz)).data.ownerUid == request.auth.uid; }

    match /businesses/{id} {
      allow read: if true;
      allow create, delete: if isAdmin();
      // მფლობელს არ შეუძლია საკუთარი tier-ის, ownerUid-ის ან რეიტინგის შეცვლა
      allow update: if isAdmin() || (isOwner(id)
        && !request.resource.data.diff(resource.data).affectedKeys()
             .hasAny(['ownerUid','tier','rating','verifiedAt','status','viewCount']));

      match /items/{itemId} {
        allow read: if true;
        allow write: if isAdmin() || isOwner(id);
      }
    }

    match /reviews/{id} {
      allow read: if resource.data.status == 'live';
      allow create: if isSignedIn()
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.rating is int
        && request.resource.data.rating >= 1 && request.resource.data.rating <= 5
        && request.resource.data.text.size() <= 2000
        && request.resource.data.status == 'live';
      allow update, delete: if isAdmin() || (isSignedIn() && resource.data.uid == request.auth.uid);
    }

    match /edits/{id} {
      allow create: if isSignedIn() && request.resource.data.status == 'pending';
      allow read, update: if isAdmin();
    }

    match /users/{uid} {
      allow read: if true;
      allow write: if isSignedIn() && request.auth.uid == uid;
      match /saved/{id} { allow read, write: if isSignedIn() && request.auth.uid == uid; }
    }

    match /categories/{id} { allow read: if true; allow write: if isAdmin(); }
    match /promos/{id} {
      allow read: if true;
      allow write: if isAdmin() || isOwner(request.resource.data.businessId);
    }
  }
}
```

**წესი:** ახალი კოლექცია და მისი rule ერთსა და იმავე commit-ში. rule-ის გარეშე კოლექცია — ბაგია, არა TODO.

`rating` მხოლოდ Cloud Function-ს შეუძლია განაახლოს (რევიუს ჩაწერაზე trigger-ით) — კლიენტს არასდროს.

---

## 11. Cloud Functions

| ფუნქცია | Trigger | დანიშნულება |
|---|---|---|
| `onReviewWrite` | Firestore write | `rating.sum/count/avg`-ის ატომური განახლება |
| `queueRebuild` | `businesses`/`items` write | დაზიანებული ბანდლის რიგში ჩაყენება |
| `processRebuildQueue` | ყოველ 15 წუთში | რიგის დამუშავება, R2-ზე ატვირთვა, `index.json` ბამპი |
| `nightlyRebuild` | 04:00 დღიურად | სრული rebuild + Meilisearch reindex |
| `expirePromos` | საათობრივად | `endsAt < now` → `active: false` |
| `onClaimApproved` | Firestore write | `ownerUid`-ის მინიჭება, ბიზნესისთვის შეტყობინება |
| `computeTier` | `businesses` write | tier-ის ავტომატური გამოთვლა შევსებულობის მიხედვით |

---

## 12. Repo სტრუქტურა

```
tbilisi-live/
├─ src/
│  ├─ pages/               Vite multi-page entry-ები
│  │  ├─ index.html + main.js
│  │  ├─ map.html + map.js
│  │  ├─ business.html + business.js
│  │  ├─ category.html + category.js
│  │  ├─ dashboard.html + dashboard.js
│  │  └─ admin.html + admin.js
│  ├─ lib/
│  │  ├─ firebase.js        init, ერთი ინსტანცია
│  │  ├─ bundles.js         R2 ბანდლების ჩატვირთვა/ქეში/დეკოდი
│  │  ├─ map-core.js        MapLibre setup, ფენები, კლასტერები
│  │  ├─ filters.js         ფილტრის მდგომარეობა ↔ URL ↔ setFilter()
│  │  ├─ search.js          L1 ლოკალური + L2 Meilisearch კლიენტი
│  │  ├─ hours.js           ღიაა/დახურულია/მალე იხურება
│  │  ├─ i18n.js            ka/en/ru სტრიქონები
│  │  └─ data/              Firestore data-access ფუნქციები (მხოლოდ აქ!)
│  │     ├─ businesses.js
│  │     ├─ reviews.js
│  │     └─ edits.js
│  ├─ components/           თითო ფაილი — ერთი UI კომპონენტი
│  └─ styles/
│     ├─ tokens.css         ფერები, spacing, typography (design system)
│     └─ base.css
├─ functions/               Firebase Cloud Functions
├─ workers/                 Cloudflare Pages Functions (SSR /b/*, /c/*)
├─ scripts/
│  ├─ osm-import.js         Overpass → Firestore
│  ├─ build-bundles.js      ლოკალური rebuild (დებაგისთვის)
│  └─ enrich.js             scraping / enrichment
├─ firestore.rules
├─ firestore.indexes.json
└─ vite.config.js
```

**კონვენციები (GeoHub-ის იდენტური, რომ შერწყმა გამარტივდეს):** Firestore query-ები მხოლოდ `src/lib/data/`-ში; DOM კოდში query არასდროს. inline `onclick` არ არსებობს. ქართული ტექსტი `i18n.js`-ში, არა HTML-ში.

---

## 13. Roadmap

### ფაზა 1 — „ქალაქი რუკაზეა" (6-8 კვირა)

| # | ამოცანა | გამომავალი |
|---|---|---|
| 1 | Vite + Firebase + Cloudflare setup, design tokens | დეპლოიდი ცარიელი საიტი |
| 2 | `categories` ტაქსონომია + OSM ტეგების mapping | seed სკრიპტი |
| 3 | OSM იმპორტი | 15-30k tier-0 ბიზნესი Firestore-ში |
| 4 | ბანდლის გენერაცია + R2 ატვირთვა | `d/*.json`, `index.json` |
| 5 | MapLibre + PMTiles + კლასტერები | მუშა რუკა მთელი ქალაქით |
| 6 | ფილტრის პანელი + URL sync | მყისიერი ფილტრაცია |
| 7 | ბიზნესის გვერდი (SSR) + JSON-LD | `/b/{slug}` ინდექსირებადი |
| 8 | კატეგორია×უბანი landing pages | 276 SEO გვერდი |
| 9 | L1 ძებნა | სახელით პოვნა |
| 10 | „ინფორმაცია არასწორია" → `edits` | crowdsourcing ჩართული |
| 11 | Auth + admin მოდერაცია | `edits`-ის დამუშავება |
| ✅ | **Verification:** Lighthouse ≥90 მობილურზე, რუკა <2წმ 360px-ზე 3G-ზე, 20 შემთხვევითი ბიზნესის მონაცემის ხელით შემოწმება |

**წარმატების კრიტერიუმი:** უცხო ადამიანი ტელეფონიდან 10 წამში პოულობს ღია აფთიაქს თავის უბანში.

### ფაზა 2 — „ბიზნესები შემოდიან" (6-8 კვირა)

Dashboard (პროფილი, საათები, ფოტო, items, აქციები) · claim flow · Meilisearch L2 · რევიუები + ფოტოები · აქციების გვერდი · ბიზნესის სტატისტიკა · tier 1 enrichment top-1000-ზე · მენიუს OCR ატვირთვა

**კრიტერიუმი:** 100 ბიზნესმა თავად აიღო პროფილი და განაახლა თვეში ერთხელ მაინც.

### ფაზა 3 — „ქალაქი ცოცხლდება" (8-12 კვირა)

L3 AI ძებნა · feed და მომხმარებლის პოსტები/ვიდეო · ღონისძიებები · trending/heatmap · მონეტიზაცია (promoted listings, პრემიუმ პროფილი) · GeoHub-თან შერწყმა (ერთი auth, ერთი user base)

**კრიტერიუმი:** feed-ის პირველ ეკრანზე დღეს დამატებული კონტენტია.

---

## 14. ხარჯების მოდელი

| სერვისი | ფაზა 1 | 50k მომხმ./თვე |
|---|---|---|
| Cloudflare Pages + R2 | $0 | ~$5 |
| Firebase Firestore | $0 (write-only) | ~$10 |
| Firebase Auth | $0 | ~$0 (SMS-ის გარდა) |
| Meilisearch (Hetzner CX22) | — | ~$6 |
| PMTiles | $0 | $0 |
| **ჯამი** | **~$0** | **~$25/თვე** |

შედარებისთვის: იგივე ტრაფიკი Google Maps API-თ და Firestore-ის პირდაპირი read-ებით — $2,000+/თვე. ორი data plane-ის არქიტექტურა (§2) ზუსტად ამ სხვაობას ქმნის.

---

## 15. რისკები

| რისკი | სიმძიმე | რას ვაკეთებთ |
|---|---|---|
| **მონაცემი მოძველდება** | კრიტიკული | `edits` crowdsourcing + dashboard + `updatedAt`-ის ჩვენება გვერდზე („განახლდა 3 თვის წინ") — პატიოსნება ნდობას ინარჩუნებს |
| **ბიზნესები არ შემოვლენ** | კრიტიკული | ჯერ ტრაფიკი (SEO landing pages), მერე მიწვევა. ცივ ბიზნესს „დარეგისტრირდი" არაფერს ეუბნება; „შენს გვერდს თვეში 400 ადამიანი უყურებს" — ეუბნება |
| **OSM ლიცენზია** | მაღალი | attribution + საკუთარი მონაცემის გამიჯვნა. **იურისტთან შემოწმება გაშვებამდე** |
| **Google/Wolt-ის ToS** | მაღალი | არ ვაკეთებთ. OCR + owner upload |
| **სპამი რევიუებში** | საშუალო | Auth სავალდებულო, rate limit, ადმინის რიგი |
| **Firestore-ის ხარჯი** | საშუალო | ორი data plane; ბიუჯეტის alert Firebase-ში დღე პირველიდან |
| **მასშტაბი გამიწელავს** | მაღალი | ფაზების საზღვრები მკაცრად. feed ფაზა 3-შია და ფაზა 1-ში მასზე არ ვმუშაობთ |

---

## 16. პირველი ნაბიჯი

Overpass query-ის გაშვება და შედეგის დათვლა. სანამ არ ვიცით რამდენი POI-ა რეალურად თბილისში OSM-ში და რამდენს აქვს `opening_hours`, ყველა დანარჩენი გათვლა ვარაუდია.

ეს ერთი დღის საქმეა და მთელ გეგმას ან დაადასტურებს, ან შეცვლის.
