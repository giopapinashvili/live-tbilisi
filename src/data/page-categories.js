/**
 * გვერდის კატეგორიები — ფეისბუქის სტილით.
 *
 * გვერდის შექმნისას სამ კატეგორიას ირჩევ. სამი განზრახია:
 *
 *   ერთი ძალიან ბევრს კარგავს. „WebCraftGeorgia" მხოლოდ
 *   „ვებგვერდების დამზადება" რომ იყოს, ვერავინ იპოვიდა
 *   „ლოგოს" ან „SEO"-ს ძებნისას.
 *
 *   ხუთი ან მეტი აზრს კარგავს — ხალხი ყველაფერს მონიშნავს
 *   და კატეგორია ინფორმაციას აღარ ატარებს.
 *
 * პირველი არჩეული მთავარია: ის ჩანს გვერდის სათაურქვეშ და
 * რუკაზე ფერს ის განსაზღვრავს. დანარჩენი ორი ძებნისთვისაა.
 *
 * ─────────────────────────────────────────────────────────────
 * ველები
 *   id     მუდმივი, ლათინური
 *   ka     ქართული სახელი
 *   g      ჯგუფი (ზემოთ, GROUPS-ში)
 *   cat    რომელ რუკის კატეგორიას ეკუთვნის (taxonomy.js)
 *   alias  სხვა სახელები: ინგლისური, ხალხური, ხშირი შეცდომა
 *   online true — ფიზიკური მისამართი არ სჭირდება
 * ─────────────────────────────────────────────────────────────
 */

export const GROUPS = [
  { id: 'food',      ka: 'საკვები და სასმელი',        icon: 'fork' },
  { id: 'shop',      ka: 'მაღაზია და ვაჭრობა',        icon: 'bag' },
  { id: 'beauty',    ka: 'სილამაზე და მოვლა',         icon: 'scissors' },
  { id: 'health',    ka: 'ჯანმრთელობა',               icon: 'cross' },
  { id: 'edu',       ka: 'განათლება',                  icon: 'book' },
  { id: 'pro',       ka: 'პროფესიული სერვისები',      icon: 'briefcase' },
  { id: 'tech',      ka: 'ტექნოლოგია და IT',          icon: 'globe' },
  { id: 'build',     ka: 'მშენებლობა და რემონტი',     icon: 'wrench' },
  { id: 'auto',      ka: 'ავტომობილი',                icon: 'car' },
  { id: 'transport', ka: 'ტრანსპორტი და ლოგისტიკა',   icon: 'route' },
  { id: 'estate',    ka: 'უძრავი ქონება',             icon: 'building' },
  { id: 'sport',     ka: 'სპორტი და ფიტნესი',         icon: 'sparkle' },
  { id: 'fun',       ka: 'გართობა და კულტურა',        icon: 'star' },
  { id: 'travel',    ka: 'ტურიზმი და სასტუმრო',       icon: 'bed' },
  { id: 'money',     ka: 'ფინანსები',                  icon: 'briefcase' },
  { id: 'home',      ka: 'სახლი და ბაღი',             icon: 'building' },
  { id: 'pets',      ka: 'ცხოველები',                  icon: 'sparkle' },
  { id: 'events',    ka: 'ღონისძიებები',               icon: 'star' },
  { id: 'media',     ka: 'მედია და ხელოვნება',        icon: 'image' },
  { id: 'person',    ka: 'საჯარო პირი და შემოქმედი',  icon: 'user' },
  { id: 'brand',     ka: 'ბრენდი და პროდუქტი',        icon: 'tag' },
  { id: 'org',       ka: 'ორგანიზაცია და საზოგადოება', icon: 'flag' },
  { id: 'gov',       ka: 'საჯარო დაწესებულება',       icon: 'flag' },
  { id: 'industry',  ka: 'წარმოება და სოფლის მეურნეობა', icon: 'building' },
];

export const PAGE_CATEGORIES = [

  /* ═══ საკვები და სასმელი ════════════════════════════════ */
  { id: 'restaurant',    ka: 'რესტორანი',              g: 'food', cat: 'food', alias: ['restaurant'] },
  { id: 'geo_kitchen',   ka: 'ქართული სამზარეულო',     g: 'food', cat: 'food' },
  { id: 'cafe',          ka: 'კაფე',                    g: 'food', cat: 'food', alias: ['cafe'] },
  { id: 'coffee_shop',   ka: 'ყავის სახლი',            g: 'food', cat: 'food', alias: ['coffee shop', 'ყავახანა'] },
  { id: 'bakery',        ka: 'საცხობი',                 g: 'food', cat: 'food', alias: ['თონე', 'bakery'] },
  { id: 'confectionery', ka: 'საკონდიტრო',              g: 'food', cat: 'food', alias: ['ტორტები'] },
  { id: 'fastfood_p',    ka: 'სწრაფი კვება',           g: 'food', cat: 'food', alias: ['ფასტფუდი'] },
  { id: 'shaurma_p',     ka: 'საშაურმე',                g: 'food', cat: 'food' },
  { id: 'pizzeria',      ka: 'პიცერია',                 g: 'food', cat: 'food' },
  { id: 'burger_p',      ka: 'ბურგერის სახლი',         g: 'food', cat: 'food' },
  { id: 'khinkali_p',    ka: 'სახინკლე',                g: 'food', cat: 'food' },
  { id: 'sushi_p',       ka: 'სუშის ბარი',             g: 'food', cat: 'food' },
  { id: 'asian_p',       ka: 'აზიური რესტორანი',       g: 'food', cat: 'food' },
  { id: 'vegan_p',       ka: 'ვეგანური / ვეგეტარიანული', g: 'food', cat: 'food' },
  { id: 'bar',           ka: 'ბარი',                    g: 'food', cat: 'food' },
  { id: 'pub',           ka: 'პაბი',                    g: 'food', cat: 'food' },
  { id: 'wine_bar',      ka: 'ღვინის ბარი',            g: 'food', cat: 'food', alias: ['მარანი'] },
  { id: 'nightclub',     ka: 'ღამის კლუბი',            g: 'food', cat: 'fun', alias: ['კლუბი'] },
  { id: 'catering',      ka: 'კეთერინგი',               g: 'food', cat: 'food', alias: ['catering', 'ბანკეტი'] },
  { id: 'delivery_food', ka: 'საკვების მიტანა',        g: 'food', cat: 'food', alias: ['delivery'], online: true },
  { id: 'home_food',     ka: 'სახლის კერძები',         g: 'food', cat: 'food', online: true },
  { id: 'canteen',       ka: 'სასადილო',                g: 'food', cat: 'food' },

  /* ═══ მაღაზია და ვაჭრობა ════════════════════════════════ */
  { id: 'grocery',       ka: 'სასურსათო მაღაზია',      g: 'shop', cat: 'shopping', alias: ['მარკეტი', 'პროდუქტები'] },
  { id: 'supermarket',   ka: 'სუპერმარკეტი',            g: 'shop', cat: 'shopping' },
  { id: 'bazaar',        ka: 'ბაზარი / ბაზრობა',       g: 'shop', cat: 'shopping' },
  { id: 'butcher',       ka: 'სახორცე',                 g: 'shop', cat: 'shopping', alias: ['ხორცი'] },
  { id: 'fish_shop',     ka: 'თევზეული',                g: 'shop', cat: 'shopping' },
  { id: 'greengrocer',   ka: 'ხილი და ბოსტნეული',      g: 'shop', cat: 'shopping' },
  { id: 'clothes',       ka: 'ტანსაცმელი',              g: 'shop', cat: 'shopping', alias: ['ბუტიკი', 'შოურუმი'] },
  { id: 'shoes',         ka: 'ფეხსაცმელი',              g: 'shop', cat: 'shopping' },
  { id: 'kids_shop',     ka: 'საბავშვო საქონელი',      g: 'shop', cat: 'shopping' },
  { id: 'jewelry',       ka: 'საიუველირო',              g: 'shop', cat: 'shopping', alias: ['ოქრო', 'ვერცხლი'] },
  { id: 'watches',       ka: 'საათები',                 g: 'shop', cat: 'shopping' },
  { id: 'optics',        ka: 'ოპტიკა',                  g: 'shop', cat: 'health', alias: ['სათვალე'] },
  { id: 'electronics',   ka: 'ტექნიკა და ელექტრონიკა', g: 'shop', cat: 'shopping' },
  { id: 'phones',        ka: 'მობილური ტელეფონები',    g: 'shop', cat: 'shopping' },
  { id: 'computers',     ka: 'კომპიუტერები',            g: 'shop', cat: 'shopping' },
  { id: 'furniture',     ka: 'ავეჯი',                   g: 'shop', cat: 'home' },
  { id: 'bookstore',     ka: 'წიგნის მაღაზია',         g: 'shop', cat: 'shopping' },
  { id: 'stationery',    ka: 'საკანცელარიო',            g: 'shop', cat: 'shopping' },
  { id: 'toys',          ka: 'სათამაშოები',             g: 'shop', cat: 'shopping' },
  { id: 'gifts',         ka: 'საჩუქრები და სუვენირები', g: 'shop', cat: 'shopping' },
  { id: 'flowers',       ka: 'ყვავილები',               g: 'shop', cat: 'shopping', alias: ['ყვავილების მაღაზია'] },
  { id: 'cosmetics_shop', ka: 'კოსმეტიკა და პარფიუმერია', g: 'shop', cat: 'shopping' },
  { id: 'sport_shop',    ka: 'სპორტული საქონელი',      g: 'shop', cat: 'shopping' },
  { id: 'music_shop',    ka: 'მუსიკალური ინსტრუმენტები', g: 'shop', cat: 'shopping' },
  { id: 'secondhand',    ka: 'სექანდ ჰენდი',           g: 'shop', cat: 'shopping', alias: ['second hand', 'ლუხტი'] },
  { id: 'antique',       ka: 'ანტიკვარიატი',            g: 'shop', cat: 'shopping' },
  { id: 'online_shop',   ka: 'ონლაინ მაღაზია',         g: 'shop', cat: 'shopping', alias: ['e-commerce'], online: true },
  { id: 'kiosk',         ka: 'ჯიხური',                  g: 'shop', cat: 'shopping', alias: ['კიოსკი'] },
  { id: 'tobacco',       ka: 'თამბაქო და ვეიპი',       g: 'shop', cat: 'shopping', alias: ['vape'] },

  /* ═══ სილამაზე და მოვლა ═════════════════════════════════ */
  { id: 'salon',         ka: 'სილამაზის სალონი',       g: 'beauty', cat: 'beauty' },
  { id: 'barber',        ka: 'ბარბერშოპი',              g: 'beauty', cat: 'beauty', alias: ['barbershop', 'დალაქი'] },
  { id: 'hairdresser',   ka: 'პარიკმახერი',             g: 'beauty', cat: 'beauty', alias: ['თმის სტილისტი'] },
  { id: 'nails',         ka: 'მანიკური და პედიკური',   g: 'beauty', cat: 'beauty', alias: ['ფრჩხილები', 'ნეილი'] },
  { id: 'lashes',        ka: 'წამწამები და წარბები',   g: 'beauty', cat: 'beauty', alias: ['ლეშმეიკერი'] },
  { id: 'makeup',        ka: 'ვიზაჟისტი',               g: 'beauty', cat: 'beauty', alias: ['მაკიაჟი'] },
  { id: 'cosmetology',   ka: 'კოსმეტოლოგია',            g: 'beauty', cat: 'beauty' },
  { id: 'spa',           ka: 'სპა',                     g: 'beauty', cat: 'beauty' },
  { id: 'massage',       ka: 'მასაჟი',                  g: 'beauty', cat: 'beauty' },
  { id: 'tattoo',        ka: 'ტატუ და პირსინგი',       g: 'beauty', cat: 'beauty' },
  { id: 'solarium',      ka: 'სოლარიუმი',               g: 'beauty', cat: 'beauty' },
  { id: 'epilation',     ka: 'ეპილაცია',                g: 'beauty', cat: 'beauty', alias: ['ლაზერი'] },
  { id: 'bathhouse',     ka: 'აბანო',                   g: 'beauty', cat: 'beauty', alias: ['გოგირდის აბანო'] },

  /* ═══ ჯანმრთელობა ═══════════════════════════════════════ */
  { id: 'clinic',        ka: 'კლინიკა',                 g: 'health', cat: 'health' },
  { id: 'hospital',      ka: 'საავადმყოფო',             g: 'health', cat: 'health' },
  { id: 'pharmacy',      ka: 'აფთიაქი',                 g: 'health', cat: 'health' },
  { id: 'dentist',       ka: 'სტომატოლოგია',            g: 'health', cat: 'health', alias: ['კბილი', 'დენტალური'] },
  { id: 'lab',           ka: 'ლაბორატორია',             g: 'health', cat: 'health', alias: ['ანალიზები'] },
  { id: 'family_doc',    ka: 'ოჯახის ექიმი',           g: 'health', cat: 'health' },
  { id: 'pediatric',     ka: 'პედიატრი',                g: 'health', cat: 'health' },
  { id: 'gynecology',    ka: 'გინეკოლოგია',             g: 'health', cat: 'health' },
  { id: 'dermatology',   ka: 'დერმატოლოგია',            g: 'health', cat: 'health' },
  { id: 'cardiology',    ka: 'კარდიოლოგია',             g: 'health', cat: 'health' },
  { id: 'psychology',    ka: 'ფსიქოლოგი',               g: 'health', cat: 'health', alias: ['ფსიქოთერაპევტი'] },
  { id: 'psychiatry',    ka: 'ფსიქიატრი',               g: 'health', cat: 'health' },
  { id: 'nutrition',     ka: 'დიეტოლოგი',               g: 'health', cat: 'health', alias: ['ნუტრიციოლოგი'] },
  { id: 'physio',        ka: 'ფიზიოთერაპია',            g: 'health', cat: 'health', alias: ['რეაბილიტაცია'] },
  { id: 'speech',        ka: 'ლოგოპედი',                g: 'health', cat: 'health' },
  { id: 'medical_gear',  ka: 'სამედიცინო ტექნიკა',     g: 'health', cat: 'health' },
  { id: 'ambulance',     ka: 'სასწრაფო დახმარება',     g: 'health', cat: 'health' },

  /* ═══ განათლება ═════════════════════════════════════════ */
  { id: 'school',        ka: 'სკოლა',                   g: 'edu', cat: 'education' },
  { id: 'kindergarten',  ka: 'საბავშვო ბაღი',          g: 'edu', cat: 'education' },
  { id: 'university',    ka: 'უნივერსიტეტი',            g: 'edu', cat: 'education' },
  { id: 'college',       ka: 'კოლეჯი',                  g: 'edu', cat: 'education' },
  { id: 'course',        ka: 'კურსები',                 g: 'edu', cat: 'education' },
  { id: 'lang_school',   ka: 'ენების სკოლა',           g: 'edu', cat: 'education', alias: ['ინგლისური', 'გერმანული'] },
  { id: 'tutor',         ka: 'რეპეტიტორი',              g: 'edu', cat: 'education', alias: ['კერძო მასწავლებელი'] },
  { id: 'music_school',  ka: 'მუსიკალური სკოლა',       g: 'edu', cat: 'education' },
  { id: 'art_school',    ka: 'სამხატვრო სკოლა',        g: 'edu', cat: 'education' },
  { id: 'dance_school',  ka: 'საცეკვაო სტუდია',        g: 'edu', cat: 'education', alias: ['ცეკვა'] },
  { id: 'driving',       ka: 'ავტოსკოლა',               g: 'edu', cat: 'education' },
  { id: 'it_school',     ka: 'IT სკოლა',                g: 'edu', cat: 'education', alias: ['პროგრამირების კურსი'] },
  { id: 'online_course', ka: 'ონლაინ სწავლება',        g: 'edu', cat: 'education', online: true },
  { id: 'library',       ka: 'ბიბლიოთეკა',              g: 'edu', cat: 'education' },

  /* ═══ პროფესიული სერვისები ══════════════════════════════ */
  { id: 'law',           ka: 'იურიდიული მომსახურება',  g: 'pro', cat: 'services', alias: ['ადვოკატი', 'იურისტი'] },
  { id: 'notary',        ka: 'ნოტარიუსი',               g: 'pro', cat: 'services' },
  { id: 'accounting',    ka: 'ბუღალტერია',              g: 'pro', cat: 'services', alias: ['აუდიტი', 'ბუღალტერი'] },
  { id: 'consulting',    ka: 'კონსალტინგი',             g: 'pro', cat: 'services' },
  { id: 'hr',            ka: 'დასაქმება და HR',        g: 'pro', cat: 'services', alias: ['რეკრუტინგი', 'ვაკანსია'] },
  { id: 'translation',   ka: 'თარგმანი',                g: 'pro', cat: 'services', alias: ['მთარგმნელი'] },
  { id: 'marketing',     ka: 'მარკეტინგი',              g: 'pro', cat: 'services', alias: ['სარეკლამო სააგენტო'] },
  { id: 'smm',           ka: 'SMM და სოც. ქსელები',    g: 'pro', cat: 'services', alias: ['სმმ'], online: true },
  { id: 'pr',            ka: 'PR და კომუნიკაცია',      g: 'pro', cat: 'services' },
  { id: 'print',         ka: 'ბეჭდვა და პოლიგრაფია',   g: 'pro', cat: 'services', alias: ['სტამბა', 'ბანერი'] },
  { id: 'security_pro',  ka: 'დაცვა და უსაფრთხოება',   g: 'pro', cat: 'services' },
  { id: 'cleaning',      ka: 'დასუფთავება',             g: 'pro', cat: 'services', alias: ['ქლინინგი'] },
  { id: 'insurance_pro', ka: 'დაზღვევა',                g: 'pro', cat: 'money' },
  { id: 'courier',       ka: 'საკურიერო',               g: 'pro', cat: 'services', alias: ['კურიერი'] },
  { id: 'copywriting',   ka: 'კოპირაითინგი',            g: 'pro', cat: 'services', online: true },
  { id: 'legal_addr',    ka: 'იურიდიული მისამართი',    g: 'pro', cat: 'services', online: true },

  /* ═══ ტექნოლოგია და IT ══════════════════════════════════ */
  { id: 'web_dev',       ka: 'ვებგვერდების დამზადება', g: 'tech', cat: 'services',
    alias: ['საიტის დამზადება', 'web development', 'ვებ დეველოპმენტი'], online: true },
  { id: 'app_dev',       ka: 'აპლიკაციების დამზადება', g: 'tech', cat: 'services',
    alias: ['მობილური აპლიკაცია', 'app development'], online: true },
  { id: 'software',      ka: 'პროგრამული უზრუნველყოფა', g: 'tech', cat: 'services',
    alias: ['software', 'პროგრამირება'], online: true },
  { id: 'web_design',    ka: 'ვებდიზაინი',              g: 'tech', cat: 'services',
    alias: ['UI', 'UX', 'ინტერფეისის დიზაინი'], online: true },
  { id: 'graphic_design', ka: 'გრაფიკული დიზაინი',     g: 'tech', cat: 'services',
    alias: ['დიზაინერი', 'ბანერის დიზაინი'], online: true },
  { id: 'logo_branding', ka: 'ლოგო და ბრენდინგი',      g: 'tech', cat: 'services',
    alias: ['ლოგოს დამზადება', 'ფირმის სტილი'], online: true },
  { id: 'seo',           ka: 'SEO და ონლაინ ხილვადობა', g: 'tech', cat: 'services',
    alias: ['სეო', 'გუგლში გამოჩენა'], online: true },
  { id: 'hosting',       ka: 'ჰოსტინგი და დომენი',     g: 'tech', cat: 'services', online: true },
  { id: 'it_support',    ka: 'IT მხარდაჭერა',          g: 'tech', cat: 'services', alias: ['სისტემური ადმინისტრატორი'] },
  { id: 'pc_repair',     ka: 'კომპიუტერის შეკეთება',   g: 'tech', cat: 'services' },
  { id: 'phone_repair',  ka: 'ტელეფონის შეკეთება',     g: 'tech', cat: 'services' },
  { id: 'cctv',          ka: 'ვიდეოკამერები და დაცვა', g: 'tech', cat: 'services', alias: ['სათვალთვალო კამერა'] },
  { id: 'network',       ka: 'ინტერნეტი და ქსელები',   g: 'tech', cat: 'services' },
  { id: 'data_ai',       ka: 'მონაცემები და AI',       g: 'tech', cat: 'services', online: true },
  { id: 'game_dev',      ka: 'თამაშების დამზადება',    g: 'tech', cat: 'services', online: true },
  { id: 'crypto',        ka: 'კრიპტო და ბლოკჩეინი',    g: 'tech', cat: 'money', online: true },

  /* ═══ მშენებლობა და რემონტი ═════════════════════════════ */
  { id: 'construction',  ka: 'სამშენებლო კომპანია',    g: 'build', cat: 'construction' },
  { id: 'renovation',    ka: 'რემონტი და მოპირკეთება', g: 'build', cat: 'construction', alias: ['შეკეთება'] },
  { id: 'build_shop',    ka: 'სამშენებლო მასალები',    g: 'build', cat: 'construction' },
  { id: 'plumber',       ka: 'სანტექნიკოსი',            g: 'build', cat: 'construction', alias: ['სანტექნიკა'] },
  { id: 'electrician',   ka: 'ელექტრიკოსი',             g: 'build', cat: 'construction' },
  { id: 'painter',       ka: 'მღებავი',                 g: 'build', cat: 'construction', alias: ['შეღებვა'] },
  { id: 'carpenter',     ka: 'ხუროთმოძღვარი',           g: 'build', cat: 'construction', alias: ['ხურო', 'ავეჯის დამზადება'] },
  { id: 'welder',        ka: 'შემდუღებელი',             g: 'build', cat: 'construction', alias: ['რკინის კონსტრუქცია'] },
  { id: 'windows',       ka: 'კარ-ფანჯარა',            g: 'build', cat: 'construction', alias: ['პლასტმასის ფანჯარა'] },
  { id: 'roofing',       ka: 'სახურავი',                g: 'build', cat: 'construction' },
  { id: 'flooring',      ka: 'იატაკი და პარკეტი',      g: 'build', cat: 'construction' },
  { id: 'hvac',          ka: 'გათბობა და კონდიცირება', g: 'build', cat: 'construction', alias: ['კონდიციონერი', 'გათბობა'] },
  { id: 'interior',      ka: 'ინტერიერის დიზაინი',     g: 'build', cat: 'construction' },
  { id: 'architect',     ka: 'არქიტექტორი',             g: 'build', cat: 'construction' },
  { id: 'demolition',    ka: 'დემონტაჟი',               g: 'build', cat: 'construction' },
  { id: 'tools_rent',    ka: 'ხელსაწყოების გაქირავება', g: 'build', cat: 'construction' },

  /* ═══ ავტომობილი ════════════════════════════════════════ */
  { id: 'car_service',   ka: 'ავტოსერვისი',             g: 'auto', cat: 'auto', alias: ['ავტოხელოსანი'] },
  { id: 'car_wash',      ka: 'ავტოსამრეცხაო',           g: 'auto', cat: 'auto' },
  { id: 'car_parts',     ka: 'ავტონაწილები',            g: 'auto', cat: 'auto' },
  { id: 'tires',         ka: 'საბურავები',              g: 'auto', cat: 'auto', alias: ['შინომონტაჟი'] },
  { id: 'car_dealer',    ka: 'ავტოსალონი',              g: 'auto', cat: 'auto', alias: ['მანქანების გაყიდვა'] },
  { id: 'car_rent',      ka: 'ავტოგაქირავება',          g: 'auto', cat: 'auto', alias: ['rent a car'] },
  { id: 'car_paint',     ka: 'ავტოშეღებვა',             g: 'auto', cat: 'auto', alias: ['ავტოქარხანა'] },
  { id: 'car_tuning',    ka: 'ტიუნინგი',                g: 'auto', cat: 'auto' },
  { id: 'car_inspect',   ka: 'ტექდათვალიერება',         g: 'auto', cat: 'auto' },
  { id: 'gas_station',   ka: 'ბენზინგასამართი',         g: 'auto', cat: 'auto', alias: ['ბენზინი', 'გასამართი'] },
  { id: 'car_electric',  ka: 'ავტოელექტრიკოსი',         g: 'auto', cat: 'auto' },
  { id: 'tow',           ka: 'ევაკუატორი',              g: 'auto', cat: 'auto' },
  { id: 'parking',       ka: 'ავტოსადგომი',             g: 'auto', cat: 'auto', alias: ['პარკინგი'] },

  /* ═══ ტრანსპორტი და ლოგისტიკა ══════════════════════════ */
  { id: 'taxi',          ka: 'ტაქსი',                   g: 'transport', cat: 'transport' },
  { id: 'moving',        ka: 'გადაზიდვა',               g: 'transport', cat: 'transport', alias: ['ავეჯის გადატანა'] },
  { id: 'freight',       ka: 'სატვირთო გადაზიდვა',     g: 'transport', cat: 'transport', alias: ['ტვირთი'] },
  { id: 'logistics',     ka: 'ლოგისტიკა',               g: 'transport', cat: 'transport' },
  { id: 'customs',       ka: 'საბაჟო ბროკერი',         g: 'transport', cat: 'transport' },
  { id: 'bus',           ka: 'სამგზავრო გადაყვანა',    g: 'transport', cat: 'transport', alias: ['მიკროავტობუსი'] },
  { id: 'post',          ka: 'ფოსტა და გზავნილები',    g: 'transport', cat: 'transport' },

  /* ═══ უძრავი ქონება ═════════════════════════════════════ */
  { id: 'realty',        ka: 'უძრავი ქონების სააგენტო', g: 'estate', cat: 'estate', alias: ['რიელტორი'] },
  { id: 'rent_flat',     ka: 'ბინის გაქირავება',       g: 'estate', cat: 'estate' },
  { id: 'sell_flat',     ka: 'ბინის გაყიდვა',          g: 'estate', cat: 'estate' },
  { id: 'commercial',    ka: 'კომერციული ფართი',       g: 'estate', cat: 'estate' },
  { id: 'developer',     ka: 'დეველოპერი',              g: 'estate', cat: 'estate' },
  { id: 'appraisal',     ka: 'ქონების შეფასება',       g: 'estate', cat: 'estate' },
  { id: 'coworking',     ka: 'კოვორკინგი',              g: 'estate', cat: 'office', alias: ['საოფისე ფართი'] },

  /* ═══ სპორტი და ფიტნესი ════════════════════════════════ */
  { id: 'gym',           ka: 'სპორტული დარბაზი',       g: 'sport', cat: 'sport', alias: ['ჯიმი', 'ფიტნესი'] },
  { id: 'yoga',          ka: 'იოგა და პილატესი',       g: 'sport', cat: 'sport' },
  { id: 'crossfit',      ka: 'კროსფიტი',                g: 'sport', cat: 'sport' },
  { id: 'pool',          ka: 'საცურაო აუზი',           g: 'sport', cat: 'sport', alias: ['ბასეინი'] },
  { id: 'football_p',    ka: 'საფეხბურთო მოედანი',     g: 'sport', cat: 'sport', alias: ['მინი ფეხბურთი'] },
  { id: 'tennis',        ka: 'ჩოგბურთი',                g: 'sport', cat: 'sport' },
  { id: 'martial',       ka: 'საბრძოლო ხელოვნება',     g: 'sport', cat: 'sport', alias: ['კარატე', 'ჯიუჯიცუ', 'ბოქსი'] },
  { id: 'trainer',       ka: 'პირადი მწვრთნელი',       g: 'sport', cat: 'sport', alias: ['ტრენერი'] },
  { id: 'sport_club',    ka: 'სპორტული კლუბი',         g: 'sport', cat: 'sport' },
  { id: 'climbing',      ka: 'ცოცვა და ალპინიზმი',     g: 'sport', cat: 'sport' },
  { id: 'billiard',      ka: 'ბილიარდი',                g: 'sport', cat: 'fun' },
  { id: 'bowling',       ka: 'ბოულინგი',                g: 'sport', cat: 'fun' },

  /* ═══ გართობა და კულტურა ═══════════════════════════════ */
  { id: 'cinema',        ka: 'კინოთეატრი',              g: 'fun', cat: 'fun' },
  { id: 'theatre',       ka: 'თეატრი',                  g: 'fun', cat: 'fun' },
  { id: 'museum',        ka: 'მუზეუმი',                 g: 'fun', cat: 'fun' },
  { id: 'gallery',       ka: 'გალერეა',                 g: 'fun', cat: 'fun' },
  { id: 'concert_hall',  ka: 'საკონცერტო დარბაზი',     g: 'fun', cat: 'fun' },
  { id: 'karaoke',       ka: 'კარაოკე',                 g: 'fun', cat: 'fun' },
  { id: 'game_club',     ka: 'სათამაშო კლუბი',         g: 'fun', cat: 'fun', alias: ['PlayStation', 'კომპ კლუბი'] },
  { id: 'quest',         ka: 'ქვესთ-რუმი',              g: 'fun', cat: 'fun', alias: ['escape room'] },
  { id: 'kids_fun',      ka: 'საბავშვო გასართობი',     g: 'fun', cat: 'fun', alias: ['ბატუტები'] },
  { id: 'park',          ka: 'პარკი და სკვერი',        g: 'fun', cat: 'fun' },
  { id: 'zoo',           ka: 'ზოოპარკი',                g: 'fun', cat: 'fun' },
  { id: 'casino',        ka: 'კაზინო',                  g: 'fun', cat: 'fun' },
  { id: 'betting',       ka: 'ბუკმეიკერი',              g: 'fun', cat: 'fun', alias: ['ტოტალიზატორი'] },

  /* ═══ ტურიზმი და სასტუმრო ══════════════════════════════ */
  { id: 'hotel',         ka: 'სასტუმრო',                g: 'travel', cat: 'travel' },
  { id: 'hostel',        ka: 'ჰოსტელი',                 g: 'travel', cat: 'travel' },
  { id: 'guesthouse',    ka: 'საოჯახო სასტუმრო',       g: 'travel', cat: 'travel' },
  { id: 'apartment',     ka: 'დღიური ბინა',            g: 'travel', cat: 'travel', alias: ['დღიურად'] },
  { id: 'travel_agency', ka: 'ტურისტული სააგენტო',     g: 'travel', cat: 'travel', alias: ['ტურები'] },
  { id: 'guide',         ka: 'გიდი',                    g: 'travel', cat: 'travel', alias: ['ექსკურსია'] },
  { id: 'visa',          ka: 'ვიზა და მიგრაცია',       g: 'travel', cat: 'travel' },
  { id: 'tickets',       ka: 'ავიაბილეთები',            g: 'travel', cat: 'travel' },
  { id: 'camping',       ka: 'კემპინგი',                g: 'travel', cat: 'travel' },

  /* ═══ ფინანსები ═════════════════════════════════════════ */
  { id: 'bank',          ka: 'ბანკი',                   g: 'money', cat: 'money' },
  { id: 'exchange',      ka: 'ვალუტის გადაცვლა',       g: 'money', cat: 'money', alias: ['სავალუტო'] },
  { id: 'microfinance',  ka: 'მიკროსაფინანსო',          g: 'money', cat: 'money', alias: ['სესხი'] },
  { id: 'pawnshop',      ka: 'ლომბარდი',                g: 'money', cat: 'money' },
  { id: 'invest',        ka: 'ინვესტიცია',              g: 'money', cat: 'money' },
  { id: 'payments',      ka: 'გადახდის სისტემა',       g: 'money', cat: 'money' },

  /* ═══ სახლი და ბაღი ═════════════════════════════════════ */
  { id: 'appliance_fix', ka: 'ტექნიკის შეკეთება',      g: 'home', cat: 'services', alias: ['მაცივარი', 'სარეცხი მანქანა'] },
  { id: 'laundry',       ka: 'სამრეცხაო და ქიმწმენდა', g: 'home', cat: 'services' },
  { id: 'tailor',        ka: 'ატელიე და კერვა',        g: 'home', cat: 'services', alias: ['მკერავი'] },
  { id: 'shoe_repair',   ka: 'ფეხსაცმლის შეკეთება',    g: 'home', cat: 'services' },
  { id: 'locksmith',     ka: 'გასაღებები და საკეტები', g: 'home', cat: 'services' },
  { id: 'garden',        ka: 'მებაღეობა',               g: 'home', cat: 'home', alias: ['ლანდშაფტი'] },
  { id: 'pest',          ka: 'დეზინსექცია',             g: 'home', cat: 'services', alias: ['მწერების წამალი'] },
  { id: 'nanny',         ka: 'ძიძა',                    g: 'home', cat: 'services' },
  { id: 'elder_care',    ka: 'მოხუცის მომვლელი',       g: 'home', cat: 'services' },

  /* ═══ ცხოველები ═════════════════════════════════════════ */
  { id: 'vet',           ka: 'ვეტერინარი',              g: 'pets', cat: 'health', alias: ['ცხოველების კლინიკა'] },
  { id: 'pet_shop',      ka: 'ზოომაღაზია',              g: 'pets', cat: 'shopping' },
  { id: 'grooming',      ka: 'გრუმინგი',                g: 'pets', cat: 'services', alias: ['ცხოველის შეკრეჭვა'] },
  { id: 'pet_hotel',     ka: 'ცხოველის სასტუმრო',      g: 'pets', cat: 'services' },
  { id: 'shelter',       ka: 'თავშესაფარი',             g: 'pets', cat: 'public' },

  /* ═══ ღონისძიებები ══════════════════════════════════════ */
  { id: 'event_org',     ka: 'ღონისძიების ორგანიზება', g: 'events', cat: 'services', alias: ['ივენთ მენეჯმენტი'] },
  { id: 'wedding',       ka: 'ქორწილის ორგანიზება',    g: 'events', cat: 'services' },
  { id: 'photographer',  ka: 'ფოტოგრაფი',               g: 'events', cat: 'services' },
  { id: 'videographer',  ka: 'ვიდეოგრაფი',              g: 'events', cat: 'services', alias: ['ვიდეო გადაღება'] },
  { id: 'dj',            ka: 'დიჯეი',                   g: 'events', cat: 'services', alias: ['DJ'] },
  { id: 'live_band',     ka: 'ცოცხალი მუსიკა',         g: 'events', cat: 'services', alias: ['ბენდი', 'ანსამბლი'] },
  { id: 'decor',         ka: 'დეკორი და გაფორმება',    g: 'events', cat: 'services' },
  { id: 'venue',         ka: 'საბანკეტო დარბაზი',      g: 'events', cat: 'fun' },
  { id: 'animator',      ka: 'ანიმატორი',               g: 'events', cat: 'services' },
  { id: 'rental_event',  ka: 'ინვენტარის გაქირავება',  g: 'events', cat: 'services' },

  /* ═══ მედია და ხელოვნება ═══════════════════════════════ */
  { id: 'media_outlet',  ka: 'მედია და ახალი ამბები',  g: 'media', cat: 'public', online: true },
  { id: 'tv',            ka: 'ტელევიზია',               g: 'media', cat: 'public' },
  { id: 'radio',         ka: 'რადიო',                   g: 'media', cat: 'public' },
  { id: 'magazine',      ka: 'ჟურნალი და გამოცემა',    g: 'media', cat: 'public', online: true },
  { id: 'podcast',       ka: 'პოდკასტი',                g: 'media', cat: 'public', online: true },
  { id: 'blog',          ka: 'ბლოგი',                   g: 'media', cat: 'public', online: true },
  { id: 'studio',        ka: 'ჩამწერი სტუდია',         g: 'media', cat: 'services' },
  { id: 'production',    ka: 'პროდაქშენი',              g: 'media', cat: 'services' },
  { id: 'art_studio',    ka: 'სახელოსნო',               g: 'media', cat: 'services', alias: ['ხელნაკეთი'] },

  /* ═══ საჯარო პირი და შემოქმედი ═════════════════════════ */
  { id: 'public_figure', ka: 'საჯარო პირი',            g: 'person', cat: 'public', online: true },
  { id: 'creator',       ka: 'კონტენტის შემქმნელი',    g: 'person', cat: 'public', alias: ['ბლოგერი', 'ინფლუენსერი'], online: true },
  { id: 'musician',      ka: 'მუსიკოსი',                g: 'person', cat: 'public', online: true },
  { id: 'artist',        ka: 'მხატვარი',                g: 'person', cat: 'public', online: true },
  { id: 'writer',        ka: 'მწერალი',                 g: 'person', cat: 'public', online: true },
  { id: 'actor',         ka: 'მსახიობი',                g: 'person', cat: 'public', online: true },
  { id: 'athlete',       ka: 'სპორტსმენი',              g: 'person', cat: 'public', online: true },
  { id: 'chef',          ka: 'შეფ-მზარეული',            g: 'person', cat: 'public', online: true },
  { id: 'politician',    ka: 'პოლიტიკოსი',              g: 'person', cat: 'public', online: true },

  /* ═══ ბრენდი და პროდუქტი ═══════════════════════════════ */
  { id: 'brand_p',       ka: 'ბრენდი',                  g: 'brand', cat: 'shopping', online: true },
  { id: 'product',       ka: 'პროდუქტი',                g: 'brand', cat: 'shopping', online: true },
  { id: 'app_p',         ka: 'აპლიკაცია',               g: 'brand', cat: 'services', online: true },
  { id: 'website_p',     ka: 'ვებგვერდი',               g: 'brand', cat: 'services', online: true },
  { id: 'handmade',      ka: 'ხელნაკეთი პროდუქცია',    g: 'brand', cat: 'shopping', online: true },

  /* ═══ ორგანიზაცია და საზოგადოება ═══════════════════════ */
  { id: 'ngo',           ka: 'არასამთავრობო ორგანიზაცია', g: 'org', cat: 'public', alias: ['NGO'] },
  { id: 'charity',       ka: 'ქველმოქმედება',           g: 'org', cat: 'public' },
  { id: 'community',     ka: 'თემი და გაერთიანება',    g: 'org', cat: 'public', online: true },
  { id: 'union',         ka: 'პროფკავშირი',             g: 'org', cat: 'public' },
  { id: 'religion',      ka: 'რელიგიური დაწესებულება', g: 'org', cat: 'public', alias: ['ეკლესია', 'მეჩეთი'] },
  { id: 'club_interest', ka: 'საინტერესო წრე',         g: 'org', cat: 'public', online: true },
  { id: 'volunteer',     ka: 'მოხალისეობა',             g: 'org', cat: 'public' },

  /* ═══ საჯარო დაწესებულება ══════════════════════════════ */
  { id: 'gov_office',    ka: 'სახელმწიფო უწყება',      g: 'gov', cat: 'public' },
  { id: 'city_hall',     ka: 'მერია და გამგეობა',      g: 'gov', cat: 'public' },
  { id: 'police',        ka: 'პოლიცია',                 g: 'gov', cat: 'public' },
  { id: 'fire',          ka: 'სახანძრო',                g: 'gov', cat: 'public' },
  { id: 'court',         ka: 'სასამართლო',              g: 'gov', cat: 'public' },
  { id: 'justice_house', ka: 'იუსტიციის სახლი',        g: 'gov', cat: 'public' },
  { id: 'utility',       ka: 'კომუნალური სამსახური',   g: 'gov', cat: 'public', alias: ['წყალი', 'ელექტრო', 'გაზი'] },
  { id: 'social_serv',   ka: 'სოციალური სამსახური',    g: 'gov', cat: 'public' },
  { id: 'embassy',       ka: 'საელჩო და საკონსულო',    g: 'gov', cat: 'public' },

  /* ═══ წარმოება და სოფლის მეურნეობა ═════════════════════ */
  { id: 'factory',       ka: 'ქარხანა და წარმოება',    g: 'industry', cat: 'business' },
  { id: 'food_prod',     ka: 'კვების წარმოება',        g: 'industry', cat: 'business' },
  { id: 'winery',        ka: 'ღვინის მარანი',          g: 'industry', cat: 'business', alias: ['მეღვინეობა'] },
  { id: 'farm',          ka: 'ფერმა',                   g: 'industry', cat: 'business' },
  { id: 'agro',          ka: 'აგრო მომსახურება',       g: 'industry', cat: 'business', alias: ['სასუქი', 'თესლი'] },
  { id: 'wholesale',     ka: 'საბითუმო ვაჭრობა',       g: 'industry', cat: 'business', alias: ['ოპტი'] },
  { id: 'import',        ka: 'იმპორტი და ექსპორტი',    g: 'industry', cat: 'business' },
  { id: 'packaging',     ka: 'შეფუთვა',                 g: 'industry', cat: 'business' },
  { id: 'recycling',     ka: 'გადამუშავება',            g: 'industry', cat: 'business', alias: ['ნარჩენები'] },
];

/* ─────────────────────────────────────────────────────────── */

export const PAGE_CAT_MAP = Object.fromEntries(PAGE_CATEGORIES.map((c) => [c.id, c]));
export const GROUP_MAP = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

/** მოცემული ჯგუფის კატეგორიები */
export const inGroup = (gid) => PAGE_CATEGORIES.filter((c) => c.g === gid);

/**
 * ძებნა კატეგორიებში.
 * ჯერ სახელის დასაწყისი, მერე შუა, ბოლოს სხვა სახელები —
 * „ვებ" აკრეფისას „ვებგვერდების დამზადება" წინ უნდა იდგეს.
 */
export function findCategories(term, limit = 12) {
  const q = String(term ?? '').trim().toLowerCase();
  if (!q) return [];

  const starts = [];
  const middle = [];
  const byAlias = [];

  for (const c of PAGE_CATEGORIES) {
    const ka = c.ka.toLowerCase();
    if (ka.startsWith(q)) { starts.push(c); continue; }
    if (ka.includes(q)) { middle.push(c); continue; }
    if ((c.alias ?? []).some((a) => a.toLowerCase().includes(q))) byAlias.push(c);
  }

  return [...starts, ...middle, ...byAlias].slice(0, limit);
}

/**
 * არჩეული კატეგორიებიდან რუკის კატეგორია.
 * პირველი არჩეული წყვეტს — ფერიც და რუკის ფილტრიც მასზეა.
 */
export const mapCategoryOf = (ids = []) => PAGE_CAT_MAP[ids[0]]?.cat ?? 'business';

/** ონლაინია თუ არა — თუ ყველა არჩეული ონლაინია, მისამართი არ სჭირდება */
export const isOnlineOnly = (ids = []) =>
  ids.length > 0 && ids.every((id) => PAGE_CAT_MAP[id]?.online === true);

export default PAGE_CATEGORIES;
