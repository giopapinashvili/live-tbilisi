# თბილისი LIVE

ქალაქის ერთიანი ციფრული რუკა — ყველა ბიზნესი, სერვისი და ობიექტი ერთ ადგილას,
მენიუებით, ფასებით, სამუშაო საათებითა და ფასდაკლებებით.

> **სტატუსი:** ფაზა 1 — კარკასი მზადაა, ბიზნესების ბაზა ცარიელია.
> ყალბი მონაცემი განზრახ არ არის ჩაწერილი; ცარიელი მდგომარეობები დაპროექტებულია.
> არქიტექტურული გადაწყვეტილებები: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## სწრაფი დაწყება

```bash
npm install
cp .env.example .env      # შეავსე Firebase-ის მნიშვნელობები
npm run dev               # http://localhost:5173
```

რუკა **Firebase-ის გარეშეც მუშაობს** — ტაილები, კატეგორიები, ფილტრები და თემები
გასაღების გარეშე ეშვება. Firebase მხოლოდ ბიზნესების მონაცემისთვის სჭირდება.

```bash
npm run build             # პროდაქშენ ბილდი → dist/
npm run preview           # ბილდის ლოკალური გადამოწმება
npm test                  # 50 შემოწმება: ლოგიკა, DOM, რუკის სტილი
```

---

## სტეკი

| ფენა | ტექნოლოგია |
|---|---|
| Frontend | Vanilla JS (ES modules) + Vite, multi-page |
| რუკა | MapLibre GL JS + საკუთარი სტილი |
| ტაილები | [OpenFreeMap](https://openfreemap.org) — უფასო, API გასაღების გარეშე, `name:ka` ველით |
| ბაზა | Firebase Firestore + Auth |
| Read plane | სტატიკური JSON ბანდლები (Cloudflare R2/Pages) |
| ჰოსტინგი | Cloudflare Pages |

ჩარჩო (React/Vue) განზრახ არ გამოიყენება — GeoHub-ის სტეკთან თავსებადობისთვის.

---

## რატომ ორი data plane

რუკა Firestore-ს **არ** კითხულობს. 30,000 პინი × ერთი პანორამირება =
Firestore-ის დღიური უფასო ლიმიტი ~20 ვიზიტორზე ამოიწურება.

```
ჩაწერა → Firestore (ჭეშმარიტების წყარო)
              ↓ build:bundles
კითხვა  ← Cloudflare R2 (სტატიკური JSON, CDN, egress უფასო)
```

`store.js` თავად ირჩევს წყაროს: ჯერ ბანდლი, თუ არ არსებობს — Firestore-ის
პირდაპირი მოთხოვნა (მხოლოდ საწყის ეტაპზე), თუ არც ის — პატიოსანი ცარიელი მდგომარეობა.
გვერდი მონაცემის არარსებობის გამო არასდროს „ტყდება".

---

## პროექტის სტრუქტურა

```
├─ *.html                  10 გვერდი (Vite MPA entry)
├─ src/
│  ├─ data/taxonomy.js     12 კატეგორია · 100+ ქვეკატეგორია · 10 რაიონი · 23 ატრიბუტი
│  ├─ lib/
│  │  ├─ config.js         ერთადერთი ადგილი, სადაც import.meta.env იკითხება
│  │  ├─ store.js          მონაცემთა საცავი (ბანდლი → Firestore → ცარიელი)
│  │  ├─ schema.js         კანონიკური ფორმა; იმპორტდება ბრაუზერშიც და scripts/-შიც
│  │  ├─ filters.js        ერთი მდგომარეობა → URL, predicate, MapLibre expression
│  │  ├─ search.js         L1 ლოკალური · L2 Meilisearch (არასავალდებულო)
│  │  ├─ hours.js          ღიაა/იხურება/დაკეტილია, შუაღამის გადაკვეთით
│  │  ├─ map-style.js      საკუთარი სტილი: „დღე" და „ღამე"
│  │  ├─ map-pins.js       Canvas-ზე დახატული პინები → GPU სპრაიტები
│  │  ├─ map-core.js       CityMap კლასი — გვერდები მხოლოდ ამ API-ს იცნობენ
│  │  └─ data/             Firestore-ის ჩაწერის ფენა (DOM აქ არ შემოდის)
│  ├─ components/          header · cards · detail · searchbox · filter-panel · business-form
│  ├─ pages/               თითო HTML-ის შესაბამისი entry
│  └─ styles/              tokens (ორივე თემა) · base · components · map · pages
├─ scripts/
│  ├─ osm-import.mjs       Overpass → Firestore
│  ├─ build-bundles.mjs    Firestore → სტატიკური JSON
│  ├─ seed-taxonomy.mjs    ტაქსონომია → Firestore
│  └─ *test.mjs            თვითშემოწმებები
├─ firestore.rules         security rules
└─ firestore.indexes.json  composite indexes
```

---

## მონაცემების შევსება

```bash
# 1. რამდენი ობიექტია OSM-ში — ჩაწერის გარეშე
node scripts/osm-import.mjs --dry

# 2. ტესტური პარტია
node scripts/osm-import.mjs --limit 200

# 3. სრული იმპორტი
npm run import:osm

# 4. სტატიკური ბანდლების გენერაცია
npm run build:bundles
```

იმპორტისთვის საჭიროა service account-ის გასაღები:
Firebase Console → Project settings → Service accounts → Generate new private key →
`.env`-ში `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json`.

> ⚠ **ლიცენზია.** OSM-ის მონაცემი ODbL-ია. Attribution უკვე დამატებულია საიტის ძირში.
> share-alike-ის ინტერპრეტაცია საჯარო გაშვებამდე იურისტთან უნდა შემოწმდეს.

---

## Firebase-ის დაყენება

1. Console-ში შექმენი პროექტი, ჩართე **Firestore** და **Authentication → Google**
2. Web app დაამატე და კონფიგი გადმოიტანე `.env`-ში
3. წესები და ინდექსები:
   ```bash
   npx firebase login
   npx firebase use <project-id>
   npm run deploy:rules
   ```
4. ადმინის უფლება custom claim-ით ენიჭება (Firestore-ის ველით **არასდროს**):
   ```js
   // ერთჯერადად, Admin SDK-ით
   await admin.auth().setCustomUserClaims(uid, { admin: true });
   ```
5. `npm run seed:taxonomy`

---

## Cloudflare Pages-ზე გაშვება

| პარამეტრი | მნიშვნელობა |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20+ |

გარემოს ცვლადები Pages-ის პანელში იმავე სახელებით, რაც `.env.example`-შია
(`VITE_` პრეფიქსიანი ცვლადები ბილდის დროს ეწერება bundle-ში — საიდუმლო
მნიშვნელობა იქ არ უნდა მოხვდეს).

`public/_headers` და `public/_redirects` ავტომატურად ამოქმედდება.

---

## თემები

ორი რეჟიმი — **„დღე"** და **„ღამე"**, ორივე თბილი პალიტრით (აგური, გოგირდი,
ხის აივანი, ღვინო). ცივი ნაცრისფერ-ლურჯი UI შეგნებულად აცილებულია.

თემა ინახება `localStorage`-ში, საწყისი მნიშვნელობა `<head>`-ის inline
სკრიპტით ისმება — გვერდის ჩატვირთვისას თეთრი ციმციმი არ ხდება.
რუკის სტილი თემასთან ერთად იცვლება, კამერისა და მონაცემის დაკარგვის გარეშე.

---

## ტესტები

```bash
npm test
```

- `selftest.mjs` — ტაქსონომიის მთლიანობა, საათების ლოგიკა, ფორმატირება, სქემა
- `domtest.mjs` — კომპონენტების რენდერი jsdom-ზე, XSS ესკეიპი, JSON-LD
- `styletest.mjs` — რუკის სტილისა და ყველა ფენის ვალიდაცია MapLibre-ის სპეციფიკაციით

რაც **არ** მოწმდება ავტომატურად: რუკის რეალური რენდერი (WebGL სჭირდება).
ეს ხელით უნდა შემოწმდეს ბრაუზერში.

---

## რა არის შემდეგი

- [ ] OSM იმპორტის გაშვება და რეალური მოცულობის დაზუსტება
- [ ] Cloud Functions: `onReviewWrite`, `processRebuildQueue`, `computeTier`
- [ ] SSR `/b/*` და `/c/*` მისამართებისთვის (Cloudflare Pages Functions) — SEO-სთვის კრიტიკული
- [ ] ფოტოების ატვირთვა (R2 + resize worker)
- [ ] შეფასებები და მოდერაცია
- [ ] Meilisearch (L2 ძებნა items-ში)
