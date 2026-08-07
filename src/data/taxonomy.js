/**
 * ტაქსონომია — კატეგორიები, უბნები, ატრიბუტები.
 *
 * ეს ფაილი არის ერთადერთი ჭეშმარიტების წყარო კატეგორიებისთვის.
 * იგივე მონაცემი აისახება Firestore-ის `taxonomy` კოლექციაში
 * `npm run seed:taxonomy` ბრძანებით — რომ ადმინმა და Cloud Function-მაც
 * იგივე სია დაინახოს.
 *
 * ⚠ არსებული `id`-ს ცვლილება ტეხს უკვე შენახულ ბიზნესებს.
 *   ახლის დამატება უსაფრთხოა, გადარქმევა — არა.
 */

/* ─────────────────────────────────────────────────────────────
   ატრიბუტები — ფილტრის boolean ველები
   `for`: რომელ root კატეგორიებში ჩანს. ცარიელი = ყველგან.
   ───────────────────────────────────────────────────────────── */
export const ATTRIBUTES = [
  // უნივერსალური
  { id: 'delivery',      ka: 'მიტანა',              for: ['food', 'shopping', 'health'] },
  { id: 'takeaway',      ka: 'წაღება',              for: ['food'] },
  { id: 'dineIn',        ka: 'ადგილზე მირთმევა',    for: ['food'] },
  { id: 'reservation',   ka: 'ჯავშანი',             for: ['food', 'beauty', 'health', 'leisure', 'hotel'] },
  { id: 'parking',       ka: 'პარკინგი',            for: [] },
  { id: 'wifi',          ka: 'Wi-Fi',               for: ['food', 'hotel', 'education', 'leisure'] },
  { id: 'cards',         ka: 'ბარათით გადახდა',     for: [] },
  { id: 'wheelchair',    ka: 'ადაპტირებული',        for: [] },
  { id: 'open24',        ka: '24 საათი',            for: [] },

  // საკვები
  { id: 'outdoor',       ka: 'ღია ტერასა',          for: ['food'] },
  { id: 'alcohol',       ka: 'ალკოჰოლი',            for: ['food'] },
  { id: 'vegan',         ka: 'ვეგანური',            for: ['food'] },
  { id: 'kidsFriendly',  ka: 'ბავშვებისთვის',       for: ['food', 'leisure', 'hotel'] },
  { id: 'petsAllowed',   ka: 'ცხოველებით',          for: ['food', 'hotel', 'leisure'] },
  { id: 'liveMusic',     ka: 'ცოცხალი მუსიკა',      for: ['food'] },

  // ჯანმრთელობა
  { id: 'prescriptionFree', ka: 'რეცეპტის გარეშე',  for: ['health'] },
  { id: 'homeVisit',     ka: 'ბინაზე მისვლა',       for: ['health', 'services'] },
  { id: 'insurance',     ka: 'დაზღვევა',            for: ['health'] },

  // სილამაზე
  { id: 'womenOnly',     ka: 'მხოლოდ ქალები',       for: ['beauty'] },
  { id: 'menOnly',       ka: 'მხოლოდ კაცები',       for: ['beauty'] },

  // მაღაზია / სერვისი
  { id: 'installment',   ka: 'განვადება',           for: ['shopping', 'auto', 'education'] },
  { id: 'warranty',      ka: 'გარანტია',            for: ['shopping', 'auto', 'services'] },
  { id: 'onlineOrder',   ka: 'ონლაინ შეკვეთა',      for: ['shopping', 'food'] },
];

export const ATTRIBUTE_MAP = Object.fromEntries(ATTRIBUTES.map((a) => [a.id, a]));

/* ─────────────────────────────────────────────────────────────
   კატეგორიები — 12 root, თითოს თავისი ქვეკატეგორიები
   color: CSS ცვლადის სუფიქსი (--cat-<id>), განსაზღვრულია tokens.css-ში
   osm:   OSM-ის ტეგები, რომლებიც ამ ქვეკატეგორიაში აისახება იმპორტისას
   ───────────────────────────────────────────────────────────── */
export const CATEGORIES = [
  {
    id: 'food', ka: 'საკვები', en: 'Food', icon: 'fork',
    sub: [
      { id: 'restaurant', ka: 'რესტორანი',      osm: ['amenity=restaurant'] },
      { id: 'georgian',   ka: 'ქართული სამზარეულო', osm: ['cuisine=georgian'] },
      { id: 'cafe',       ka: 'კაფე',            osm: ['amenity=cafe'] },
      { id: 'coffee',     ka: 'ყავა',            osm: ['cuisine=coffee_shop', 'shop=coffee'] },
      { id: 'bakery',     ka: 'საცხობი',         osm: ['shop=bakery', 'shop=pastry'] },
      { id: 'fastfood',   ka: 'სწრაფი კვება',    osm: ['amenity=fast_food'] },
      { id: 'shawarma',   ka: 'შაურმა',          osm: ['cuisine=kebab'] },
      { id: 'pizza',      ka: 'პიცა',            osm: ['cuisine=pizza'] },
      { id: 'sushi',      ka: 'სუში',            osm: ['cuisine=sushi', 'cuisine=japanese'] },
      { id: 'khinkali',   ka: 'ხინკალი',         osm: [] },
      { id: 'bar',        ka: 'ბარი',            osm: ['amenity=bar', 'amenity=pub'] },
      { id: 'club',       ka: 'ღამის კლუბი',     osm: ['amenity=nightclub'] },
      { id: 'dessert',    ka: 'დესერტი',         osm: ['shop=confectionery', 'amenity=ice_cream'] },
      { id: 'wine',       ka: 'ღვინო',           osm: ['shop=wine', 'shop=alcohol'] },
    ],
  },
  {
    id: 'shopping', ka: 'მაღაზიები', en: 'Shopping', icon: 'bag',
    sub: [
      { id: 'grocery',      ka: 'სასურსათო',        osm: ['shop=convenience', 'shop=greengrocer', 'shop=frozen_food', 'shop=variety_store', 'shop=kiosk', 'shop=deli'] },
      { id: 'butcher',      ka: 'ხორცი',            osm: ['shop=butcher', 'shop=seafood'] },
      { id: 'supermarket',  ka: 'სუპერმარკეტი',     osm: ['shop=supermarket', 'shop=department_store'] },
      { id: 'market',       ka: 'ბაზარი',           osm: ['amenity=marketplace', 'shop=wholesale'] },
      { id: 'clothing',     ka: 'ტანსაცმელი',       osm: ['shop=clothes', 'shop=boutique'] },
      { id: 'shoes',        ka: 'ფეხსაცმელი',       osm: ['shop=shoes'] },
      { id: 'electronics',  ka: 'ტექნიკა',          osm: ['shop=electronics'] },
      { id: 'phones',       ka: 'ტელეფონები',       osm: ['shop=mobile_phone'] },
      { id: 'computers',    ka: 'კომპიუტერები',     osm: ['shop=computer'] },
      { id: 'furniture',    ka: 'ავეჯი',            osm: ['shop=furniture', 'shop=interior_decoration'] },
      { id: 'appliances',   ka: 'საყოფაცხოვრებო',   osm: ['shop=appliance', 'shop=houseware'] },
      { id: 'jewelry',      ka: 'ოქრო და საიუველირო', osm: ['shop=jewelry'] },
      { id: 'cosmetics',    ka: 'კოსმეტიკა',        osm: ['shop=cosmetics', 'shop=perfumery'] },
      { id: 'books',        ka: 'წიგნები',          osm: ['shop=books', 'shop=stationery'] },
      { id: 'toys',         ka: 'სათამაშოები',      osm: ['shop=toys'] },
      { id: 'sport',        ka: 'სპორტი',           osm: ['shop=sports'] },
      { id: 'construction', ka: 'სამშენებლო',       osm: ['shop=doityourself', 'shop=hardware', 'shop=paint', 'shop=tiles', 'shop=kitchen', 'shop=bathroom_furnishing', 'shop=fireplace', 'shop=trade', 'shop=building_materials'] },
      { id: 'flowers',      ka: 'ყვავილები',        osm: ['shop=florist'] },
      { id: 'pet',          ka: 'ცხოველები',        osm: ['shop=pet'] },
      { id: 'mall',         ka: 'სავაჭრო ცენტრი',   osm: ['shop=mall'] },
    ],
  },
  {
    id: 'health', ka: 'ჯანმრთელობა', en: 'Health', icon: 'cross',
    sub: [
      { id: 'pharmacy',   ka: 'აფთიაქი',        osm: ['amenity=pharmacy', 'healthcare=pharmacy', 'shop=chemist'] },
      { id: 'medsupply',  ka: 'სამედიცინო ტექნიკა', osm: ['shop=medical_supply', 'shop=hearing_aids'] },
      { id: 'clinic',     ka: 'კლინიკა',        osm: ['amenity=clinic', 'healthcare=clinic'] },
      { id: 'hospital',   ka: 'საავადმყოფო',    osm: ['amenity=hospital', 'healthcare=hospital'] },
      { id: 'doctor',     ka: 'ექიმი',          osm: ['amenity=doctors', 'healthcare=doctor'] },
      { id: 'dentist',    ka: 'სტომატოლოგი',    osm: ['amenity=dentist', 'healthcare=dentist'] },
      { id: 'lab',        ka: 'ლაბორატორია',    osm: ['healthcare=laboratory', 'healthcare=sample_collection'] },
      { id: 'imaging',    ka: 'MRI / რენტგენი', osm: ['healthcare=radiology'] },
      { id: 'optics',     ka: 'ოპტიკა',         osm: ['shop=optician'] },
      { id: 'vet',        ka: 'ვეტერინარი',     osm: ['amenity=veterinary'] },
      { id: 'psychology', ka: 'ფსიქოლოგი',      osm: ['healthcare=psychotherapist'] },
      { id: 'rehab',      ka: 'რეაბილიტაცია',   osm: ['healthcare=physiotherapist'] },
    ],
  },
  {
    id: 'beauty', ka: 'სილამაზე', en: 'Beauty', icon: 'scissors',
    sub: [
      { id: 'hairdresser', ka: 'პარიკმახერი',  osm: ['shop=hairdresser'] },
      { id: 'barber',      ka: 'ბარბერშოპი',   osm: ['shop=hairdresser;male'] },
      { id: 'nails',       ka: 'მანიკური',     osm: ['shop=beauty;nails'] },
      { id: 'spa',         ka: 'სპა',          osm: ['leisure=spa', 'shop=beauty;spa'] },
      { id: 'massage',     ka: 'მასაჟი',       osm: ['shop=massage'] },
      { id: 'laser',       ka: 'ლაზერი',       osm: [] },
      { id: 'cosmetology', ka: 'კოსმეტოლოგია', osm: ['shop=beauty'] },
      { id: 'tattoo',      ka: 'ტატუ',         osm: ['shop=tattoo'] },
      { id: 'bathhouse',   ka: 'აბანო',        osm: ['amenity=public_bath'] },
    ],
  },
  {
    id: 'services', ka: 'სერვისები', en: 'Services', icon: 'wrench',
    sub: [
      { id: 'repair',     ka: 'შეკეთება',       osm: ['shop=electronics_repair', 'craft=electronics_repair', 'craft=upholsterer', 'shop=repair'] },
      { id: 'loans',      ka: 'სესხი და ლომბარდი', osm: ['shop=money_lender', 'shop=pawnbroker'] },
      { id: 'funeral',    ka: 'სარიტუალო',      osm: ['shop=funeral_directors'] },
      { id: 'laundry',    ka: 'სამრეცხაო',      osm: ['shop=laundry', 'shop=dry_cleaning'] },
      { id: 'tailor',     ka: 'სამკერვალო',     osm: ['craft=tailor', 'shop=tailor', 'shop=fabric', 'shop=sewing', 'craft=shoemaker'] },
      { id: 'locksmith',  ka: 'გასაღებები',     osm: ['craft=locksmith'] },
      { id: 'printing',   ka: 'ბეჭდვა',         osm: ['shop=copyshop', 'craft=printer'] },
      { id: 'photo',      ka: 'ფოტოსტუდია',     osm: ['shop=photo', 'craft=photographer'] },
      { id: 'legal',      ka: 'იურისტი',        osm: ['office=lawyer'] },
      { id: 'notary',     ka: 'ნოტარიუსი',      osm: ['office=notary'] },
      { id: 'bank',       ka: 'ბანკი',          osm: ['amenity=bank'] },
      { id: 'atm',        ka: 'ბანკომატი',      osm: ['amenity=atm'] },
      { id: 'exchange',   ka: 'ვალუტის გადამცვლელი', osm: ['amenity=bureau_de_change'] },
      { id: 'insuranceco',ka: 'დაზღვევა',       osm: ['office=insurance'] },
      { id: 'realestate', ka: 'უძრავი ქონება',  osm: ['office=estate_agent'] },
      { id: 'courier',    ka: 'კურიერი',        osm: ['amenity=parcel_locker', 'office=courier'] },
      { id: 'travel',     ka: 'ტურ-სააგენტო',   osm: ['shop=travel_agency', 'shop=ticket'] },
    ],
  },
  {
    id: 'auto', ka: 'ავტო', en: 'Auto', icon: 'car',
    sub: [
      { id: 'gas',        ka: 'ბენზინგასამართი', osm: ['amenity=fuel'] },
      { id: 'carwash',    ka: 'ავტორეცხვა',      osm: ['amenity=car_wash'] },
      { id: 'tires',      ka: 'საბურავები',      osm: ['shop=tyres'] },
      { id: 'carservice', ka: 'ავტოსერვისი',     osm: ['shop=car_repair'] },
      { id: 'inspection', ka: 'ტექდათვალიერება', osm: ['amenity=vehicle_inspection'] },
      { id: 'parts',      ka: 'ავტონაწილები',    osm: ['shop=car_parts'] },
      { id: 'detailing',  ka: 'დეტეილინგი',      osm: [] },
      { id: 'parking',    ka: 'პარკინგი',        osm: ['amenity=parking'] },
      { id: 'rental',     ka: 'ქირავდება',       osm: ['amenity=car_rental'] },
      { id: 'dealer',     ka: 'ავტოსალონი',      osm: ['shop=car'] },
      { id: 'charging',   ka: 'ელექტრო დამტენი', osm: ['amenity=charging_station'] },
    ],
  },
  {
    id: 'education', ka: 'განათლება', en: 'Education', icon: 'book',
    sub: [
      { id: 'university',   ka: 'უნივერსიტეტი',  osm: ['amenity=university', 'amenity=college'] },
      { id: 'school',       ka: 'სკოლა',         osm: ['amenity=school'] },
      { id: 'kindergarten', ka: 'ბაღი',          osm: ['amenity=kindergarten'] },
      { id: 'courses',      ka: 'კურსები',       osm: ['amenity=training', 'office=educational_institution'] },
      { id: 'language',     ka: 'ენები',         osm: ['amenity=language_school'] },
      { id: 'it',           ka: 'IT',            osm: [] },
      { id: 'music',        ka: 'მუსიკა',        osm: ['amenity=music_school'] },
      { id: 'driving',      ka: 'ავტოსკოლა',     osm: ['amenity=driving_school'] },
      { id: 'library',      ka: 'ბიბლიოთეკა',    osm: ['amenity=library'] },
    ],
  },
  {
    id: 'leisure', ka: 'გართობა', en: 'Leisure', icon: 'sparkle',
    sub: [
      { id: 'cinema',     ka: 'კინო',           osm: ['amenity=cinema'] },
      { id: 'theatre',    ka: 'თეატრი',         osm: ['amenity=theatre'] },
      { id: 'museum',     ka: 'მუზეუმი',        osm: ['tourism=museum', 'tourism=gallery'] },
      { id: 'gym',        ka: 'სპორტდარბაზი',   osm: ['leisure=fitness_centre', 'leisure=sports_centre'] },
      { id: 'pool',       ka: 'აუზი',           osm: ['leisure=swimming_pool'] },
      { id: 'bowling',    ka: 'ბოულინგი',       osm: ['leisure=bowling_alley'] },
      { id: 'playground', ka: 'სათამაშო ცენტრი',osm: ['leisure=playground', 'leisure=amusement_arcade'] },
      { id: 'park',       ka: 'პარკი',          osm: ['leisure=park', 'leisure=garden'] },
      { id: 'gaming',     ka: 'კომპ. კლუბი',    osm: ['amenity=internet_cafe'] },
      { id: 'stadium',    ka: 'სტადიონი',       osm: ['leisure=stadium', 'leisure=pitch'] },
      { id: 'viewpoint',  ka: 'ხედი',           osm: ['tourism=viewpoint'] },
    ],
  },
  {
    id: 'hotel', ka: 'საცხოვრებელი', en: 'Stay', icon: 'bed',
    sub: [
      { id: 'hotel',      ka: 'სასტუმრო',     osm: ['tourism=hotel'] },
      { id: 'hostel',     ka: 'ჰოსტელი',      osm: ['tourism=hostel'] },
      { id: 'guesthouse', ka: 'გესთჰაუსი',    osm: ['tourism=guest_house'] },
      { id: 'apartment',  ka: 'აპარტამენტი',  osm: ['tourism=apartment'] },
    ],
  },
  {
    id: 'transport', ka: 'ტრანსპორტი', en: 'Transport', icon: 'route',
    sub: [
      { id: 'metro',     ka: 'მეტრო',        osm: ['railway=station;subway', 'station=subway'] },
      { id: 'busstop',   ka: 'გაჩერება',     osm: ['highway=bus_stop'] },
      { id: 'taxi',      ka: 'ტაქსი',        osm: ['amenity=taxi'] },
      { id: 'station',   ka: 'სადგური',      osm: ['railway=station', 'amenity=bus_station'] },
      { id: 'airport',   ka: 'აეროპორტი',    osm: ['aeroway=aerodrome'] },
      { id: 'bike',      ka: 'ველოსიპედი',   osm: ['amenity=bicycle_rental', 'shop=bicycle'] },
    ],
  },
  {
    id: 'public', ka: 'საჯარო', en: 'Public', icon: 'building',
    sub: [
      { id: 'government', ka: 'სახელმწიფო უწყება', osm: ['amenity=townhall', 'office=government'] },
      { id: 'justicehouse', ka: 'იუსტიციის სახლი', osm: [] },
      { id: 'post',       ka: 'ფოსტა',        osm: ['amenity=post_office'] },
      { id: 'police',     ka: 'პოლიცია',      osm: ['amenity=police'] },
      { id: 'fire',       ka: 'სახანძრო',     osm: ['amenity=fire_station'] },
      { id: 'embassy',    ka: 'საელჩო',       osm: ['amenity=embassy', 'office=diplomatic'] },
      { id: 'church',     ka: 'ტაძარი',       osm: ['amenity=place_of_worship'] },
      { id: 'community',  ka: 'საზოგადოებრივი ცენტრი', osm: ['amenity=community_centre'] },
      { id: 'social',     ka: 'სოციალური სერვისი', osm: ['amenity=social_facility', 'office=charity'] },
      { id: 'cemetery',   ka: 'სასაფლაო',     osm: ['landuse=cemetery'] },
      { id: 'toilet',     ka: 'საპირფარეშო',  osm: ['amenity=toilets'] },
    ],
  },
  {
    id: 'business', ka: 'ბიზნესი და ოფისი', en: 'Business', icon: 'briefcase',
    sub: [
      { id: 'office',     ka: 'ოფისი',        osm: ['office=company'] },
      { id: 'coworking',  ka: 'ქოვორქინგი',   osm: ['amenity=coworking_space', 'office=coworking'] },
      { id: 'it_company', ka: 'IT კომპანია',  osm: ['office=it'] },
      { id: 'agency',     ka: 'სააგენტო',     osm: ['office=advertising_agency'] },
      { id: 'warehouse',  ka: 'საწყობი',      osm: ['building=warehouse'] },
      { id: 'factory',    ka: 'წარმოება',     osm: ['man_made=works'] },
    ],
  },
];

/* წარმოებული ინდექსები — ერთხელ იანგარიშება, ყველგან იმპორტდება */
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const SUBCATEGORY_MAP = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.sub.map((s) => [s.id, { ...s, parent: c.id }])),
);

/** OSM ტეგი ("amenity=cafe") → { category, subcategory } */
export const OSM_INDEX = (() => {
  const idx = {};
  for (const c of CATEGORIES) {
    for (const s of c.sub) {
      for (const tag of s.osm) {
        if (!idx[tag]) idx[tag] = { category: c.id, subcategory: s.id };
      }
    }
  }
  return idx;
})();

/* ─────────────────────────────────────────────────────────────
   უბნები

   `district` — თბილისის 10 ოფიციალური რაიონი (OSM: admin_level=9).
   ეს არის ბიზნესის დოკუმენტში შესანახი ავტორიტეტული მნიშვნელობა.

   `neighborhoods` — ხალხში დამკვიდრებული სახელები. ესენი ტეგებია,
   არა ადმინისტრაციული ერთეულები, და ერთი უბანი შეიძლება რამდენიმე
   რაიონს ეკუთვნოდეს.

   `center` — მხოლოდ რუკის კამერის პრესეტი (fly-to), არა ოფიციალური
   ცენტროიდი. რეალური მიკუთვნება იმპორტისას reverse-geocoding-ით ხდება.
   ───────────────────────────────────────────────────────────── */
export const DISTRICTS = [
  { id: 'vake',        ka: 'ვაკე',           center: [44.7625, 41.7086], neighborhoods: ['ვაკე', 'ბაგები', 'ვაშლიჯვარი'] },
  { id: 'saburtalo',   ka: 'საბურთალო',      center: [44.7517, 41.7311], neighborhoods: ['საბურთალო', 'დიღომი', 'ვაზისუბანი'] },
  { id: 'mtatsminda',  ka: 'მთაწმინდა',      center: [44.7970, 41.6938], neighborhoods: ['მთაწმინდა', 'სოლოლაკი', 'ვერა', 'ძველი თბილისი'] },
  { id: 'krtsanisi',   ka: 'კრწანისი',       center: [44.8175, 41.6707], neighborhoods: ['კრწანისი', 'ორთაჭალა'] },
  { id: 'isani',       ka: 'ისანი',          center: [44.8390, 41.6845], neighborhoods: ['ისანი', 'ავლაბარი', 'ნავთლუღი'] },
  { id: 'samgori',     ka: 'სამგორი',        center: [44.8850, 41.6884], neighborhoods: ['სამგორი', 'ვარკეთილი', 'ლილო', 'ორხევი'] },
  { id: 'chughureti',  ka: 'ჩუღურეთი',       center: [44.8020, 41.7050], neighborhoods: ['ჩუღურეთი', 'კუკია', 'სვანეთისუბანი'] },
  { id: 'didube',      ka: 'დიდუბე',         center: [44.7860, 41.7500], neighborhoods: ['დიდუბე', 'დიღმის მასივი'] },
  { id: 'nadzaladevi', ka: 'ნაძალადევი',     center: [44.8000, 41.7600], neighborhoods: ['ნაძალადევი', 'თემქა', 'სანზონა', 'ლოტკინი'] },
  { id: 'gldani',      ka: 'გლდანი',         center: [44.8200, 41.7900], neighborhoods: ['გლდანი', 'მუხიანი', 'ავჭალა'] },
];

export const DISTRICT_MAP = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));

/** ქალაქის კამერის საწყისი მდგომარეობა და საზღვრები */
export const CITY = {
  center: [44.8015, 41.7151],
  zoom: 12,
  minZoom: 10,
  maxZoom: 19,
  /** [west, south, east, north] — თბილისის დაახლოებითი bounding box */
  bbox: [44.6300, 41.6100, 45.0100, 41.8600],
};

/** ფასის დონეები */
export const PRICE_LEVELS = [
  { id: 1, ka: '₾',    label: 'იაფი' },
  { id: 2, ka: '₾₾',   label: 'საშუალო' },
  { id: 3, ka: '₾₾₾',  label: 'ძვირი' },
  { id: 4, ka: '₾₾₾₾', label: 'პრემიუმ' },
];

/** მონაცემის სისრულის დონეები */
export const TIERS = {
  0: { ka: 'დაუდასტურებელი', note: 'მონაცემი OpenStreetMap-იდან, არ არის შემოწმებული' },
  1: { ka: 'დადასტურებული',  note: 'საათები და კონტაქტი შემოწმებულია' },
  2: { ka: 'სრული პროფილი',  note: 'ბიზნესი თავად აახლებს ინფორმაციას' },
};

/** ატრიბუტების სია კონკრეტული root კატეგორიისთვის */
export function attributesFor(categoryId) {
  if (!categoryId) return ATTRIBUTES.filter((a) => a.for.length === 0);
  return ATTRIBUTES.filter((a) => a.for.length === 0 || a.for.includes(categoryId));
}

/** ქვეკატეგორიის ქართული სახელი, უსაფრთხოდ */
export function subName(id) {
  return SUBCATEGORY_MAP[id]?.ka ?? id;
}

/** კატეგორიის ქართული სახელი, უსაფრთხოდ */
export function catName(id) {
  return CATEGORY_MAP[id]?.ka ?? id;
}
