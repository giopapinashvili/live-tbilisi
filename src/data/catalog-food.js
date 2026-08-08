/**
 * კატალოგის ხე — საკვები.
 *
 * ეს ფაილი არის ის, რაც ძებნას ცნობარიდან ასისტენტად აქცევს.
 * ხელოვნური ინტელექტი არ სჭირდება — სია სჭირდება.
 *
 * „ხაჭაპური ცომეულია" მანქანამ არ იცის და არც უნდა იცოდეს.
 * ვიღაცამ ერთხელ უნდა დაწეროს. სწორედ ეს არის ის ერთხელ.
 *
 * ─────────────────────────────────────────────────────────────
 * თითო ჩანაწერი:
 *
 *   id      მუდმივი, ლათინური. ბანდლში და URL-ში ეს ჩანს.
 *   ka      ქართული სახელი — ეს ჩანს ეკრანზე.
 *   parent  მშობელი კვანძი. null = ფესვი.
 *   alias   სხვა სახელები: ხალხური, ინგლისური, ხშირი შეცდომები.
 *   with    რა მოჰყვება ხოლმე. მინიშნებაა, არა წესი.
 *
 * ─────────────────────────────────────────────────────────────
 * alias-ში რა უნდა და რა არა
 *
 * არ სჭირდება:
 *   • თავად ქართული სახელი — ის `ka`-შია
 *   • ლათინური ტრანსლიტერაცია — translit() თავად აკეთებს,
 *     ანუ „ხაჭაპური" ისედაც იძებნება როგორც „khachapuri"
 *
 * სჭირდება:
 *   • ხალხური სახელი — „აჭარულა", „ფრი"
 *   • სხვა დაწერილობა — „შაორმა", „შავარმა"
 *   • ინგლისური — „burger", „fries"
 *   • ხშირი შეცდომა — „ხაჭაპური" ↔ „ხაჭაპური"
 *
 * ეს სია სრული არაა და არც უნდა იყოს. ასი ყველაზე ხშირი კერძი
 * ძებნის დიდ ნაწილს ფარავს. დანარჩენს უშედეგო ძებნების ჟურნალი
 * გვეტყვის — თუ ასმა ადამიანმა ერთი და იგივე იძებნა და ვერაფერი
 * იპოვა, სწორედ ის აკლია.
 */

export const FOOD = [

  /* ═══ ფესვები ═══════════════════════════════════════════ */

  { id: 'dough',      ka: 'ცომეული',        parent: null },
  { id: 'meat',       ka: 'ხორცეული',       parent: null },
  { id: 'fastfood',   ka: 'სწრაფი კვება',   parent: null, alias: ['ფასტფუდი', 'fast food'] },
  { id: 'soup',       ka: 'სუპები',          parent: null, alias: ['წვნიანი'] },
  { id: 'hot',        ka: 'ცხელი კერძები',   parent: null },
  { id: 'salad',      ka: 'სალათები',        parent: null },
  { id: 'breakfast',  ka: 'საუზმე',          parent: null },
  { id: 'bakery',     ka: 'საცხობი',         parent: null, alias: ['თონე', 'პურეული'] },
  { id: 'sweets',     ka: 'ტკბილეული',       parent: null, alias: ['დესერტი', 'ნამცხვარი'] },
  { id: 'coffee',     ka: 'ყავა და ჩაი',     parent: null },
  { id: 'drinks',     ka: 'უალკოჰოლო',       parent: null, alias: ['სასმელი', 'გამაგრილებელი'] },
  { id: 'alcohol',    ka: 'ალკოჰოლი',        parent: null, alias: ['სპირტიანი'] },
  { id: 'asian',      ka: 'აზიური',          parent: null },
  { id: 'sides',      ka: 'გარნირი',         parent: null, alias: ['დანამატი'] },
  { id: 'sauce',      ka: 'სოუსები',         parent: null, alias: ['საწებელი'] },

  /* ═══ ცომეული ═══════════════════════════════════════════ */

  { id: 'khachapuri', ka: 'ხაჭაპური', parent: 'dough',
    alias: ['ხაჩაპური', 'hachapuri'], with: ['lemonade', 'matsoni', 'wine'] },

  { id: 'kh_imeruli',  ka: 'იმერული ხაჭაპური',  parent: 'khachapuri', alias: ['იმერული'] },
  { id: 'kh_megruli',  ka: 'მეგრული ხაჭაპური',  parent: 'khachapuri', alias: ['მეგრული'] },
  { id: 'kh_acharuli', ka: 'აჭარული ხაჭაპური',  parent: 'khachapuri',
    alias: ['აჭარული', 'აჭარულა', 'ნავი', 'კვერცხიანი ხაჭაპური'] },
  { id: 'kh_penovani', ka: 'ფენოვანი ხაჭაპური', parent: 'khachapuri',
    alias: ['ფენოვანი', 'პენოვანი', 'ფინოვანი'] },
  { id: 'kh_guruli',   ka: 'გურული ხაჭაპური',   parent: 'khachapuri',
    alias: ['გურული', 'გურული ჭადი'] },
  { id: 'kh_osuri',    ka: 'ოსური ხაჭაპური',    parent: 'khachapuri',
    alias: ['ოსური', 'ხაბიზგინა', 'კარტოფილიანი ხაჭაპური'] },
  { id: 'kh_achma',    ka: 'აჭმა',              parent: 'khachapuri', alias: ['აჩმა'] },
  { id: 'kh_kubdari',  ka: 'კუბდარი',           parent: 'khachapuri',
    alias: ['სვანური ხაჭაპური', 'ხორციანი ხაჭაპური'] },

  { id: 'lobiani',    ka: 'ლობიანი', parent: 'dough',
    alias: ['ლობიოიანი'], with: ['matsoni', 'lemonade'] },
  { id: 'lobiani_rachuli', ka: 'რაჭული ლობიანი', parent: 'lobiani',
    alias: ['რაჭული', 'ლორიანი ლობიანი'] },

  { id: 'khinkali',   ka: 'ხინკალი', parent: 'dough',
    alias: ['ხინკლები', 'hinkali'], with: ['beer', 'chacha', 'pepper'] },
  { id: 'khinkali_meat',   ka: 'ხორციანი ხინკალი',   parent: 'khinkali', alias: ['კალაკური'] },
  { id: 'khinkali_cheese', ka: 'ყველიანი ხინკალი',   parent: 'khinkali' },
  { id: 'khinkali_mush',   ka: 'სოკოიანი ხინკალი',   parent: 'khinkali' },
  { id: 'khinkali_potato', ka: 'კარტოფილიანი ხინკალი', parent: 'khinkali' },

  { id: 'pizza',      ka: 'პიცა', parent: 'dough',
    alias: ['pizza'], with: ['cola', 'beer', 'sauce_garlic'] },
  { id: 'pizza_margarita', ka: 'მარგარიტა',    parent: 'pizza' },
  { id: 'pizza_peperoni',  ka: 'პეპერონი',     parent: 'pizza', alias: ['პეპერონა'] },
  { id: 'pizza_4cheese',   ka: 'ოთხი ყველი',   parent: 'pizza', alias: ['4 ყველი', 'quattro formaggi'] },
  { id: 'pizza_bbq',       ka: 'ბარბექიუ პიცა', parent: 'pizza', alias: ['bbq'] },

  { id: 'ghvezeli',   ka: 'ღვეზელი', parent: 'dough', alias: ['ღვეზელები'] },
  { id: 'nazuki',     ka: 'ნაზუქი',  parent: 'dough' },
  { id: 'mchadi',     ka: 'მჭადი',   parent: 'dough', with: ['lobio', 'cheese'] },
  { id: 'chvishtari', ka: 'ჭვიშტარი', parent: 'dough', alias: ['ჩვიშტარი'] },
  { id: 'elarji',     ka: 'ელარჯი',  parent: 'dough' },
  { id: 'ghomi',      ka: 'ღომი',    parent: 'dough', with: ['cheese', 'bazhe'] },

  /* ═══ ხორცეული ══════════════════════════════════════════ */

  { id: 'mtsvadi',    ka: 'მწვადი', parent: 'meat',
    alias: ['შაშლიკი', 'შამფური', 'ბარბექიუ', 'bbq', 'მანგალი'],
    with: ['tkemali', 'onion', 'wine', 'bread'] },
  { id: 'mtsvadi_pork', ka: 'ღორის მწვადი', parent: 'mtsvadi' },
  { id: 'mtsvadi_beef', ka: 'ხბოს მწვადი',  parent: 'mtsvadi' },
  { id: 'mtsvadi_chick', ka: 'ქათმის მწვადი', parent: 'mtsvadi' },

  { id: 'kupati',     ka: 'კუპატი',    parent: 'meat' },
  { id: 'kababi',     ka: 'ქაბაბი',    parent: 'meat', alias: ['ლულა ქაბაბი', 'kebab', 'ქებაბი'] },
  { id: 'tabaka',     ka: 'ტაბაკა',    parent: 'meat', alias: ['წიწილა ტაბაკა'] },
  { id: 'shkmeruli',  ka: 'შქმერული',  parent: 'meat', alias: ['შკმერული'], with: ['mchadi'] },
  { id: 'chashushuli', ka: 'ჩაშუშული', parent: 'meat' },
  { id: 'ostri',      ka: 'ოსტრი',     parent: 'meat' },
  { id: 'chakhokhbili', ka: 'ჩახოხბილი', parent: 'meat' },
  { id: 'chakapuli',  ka: 'ჩაქაფული',  parent: 'meat' },
  { id: 'khashlama',  ka: 'ხაშლამა',   parent: 'meat' },
  { id: 'ojakhuri',   ka: 'ოჯახური',   parent: 'meat' },
  { id: 'meat_raw',   ka: 'ნედლი ხორცი', parent: 'meat', alias: ['ხორცის მაღაზია', 'სახორცე'] },

  /* ═══ სწრაფი კვება ══════════════════════════════════════ */

  { id: 'shaurma',    ka: 'შაურმა', parent: 'fastfood',
    alias: ['შაორმა', 'შავარმა', 'შაურმაი', 'shawarma', 'დონერი', 'doner'],
    with: ['fries', 'cola', 'sauce_garlic', 'ayran'] },
  { id: 'shaurma_chick', ka: 'ქათმის შაურმა', parent: 'shaurma' },
  { id: 'shaurma_beef',  ka: 'ხბოს შაურმა',   parent: 'shaurma' },
  { id: 'shaurma_mix',   ka: 'ნაზავი შაურმა', parent: 'shaurma', alias: ['მიქსი'] },

  { id: 'hotdog',     ka: 'ჰოთდოგი', parent: 'fastfood',
    alias: ['ჰატდოგი', 'ხოთდოგი', 'hot dog', 'სოსისი ბულკაში'],
    with: ['cola', 'fries', 'sauce_ketchup'] },

  { id: 'burger',     ka: 'ბურგერი', parent: 'fastfood',
    alias: ['ჰამბურგერი', 'burger', 'ბურგერები'],
    with: ['fries', 'cola', 'sauce_ketchup'] },
  { id: 'burger_cheese', ka: 'ჩიზბურგერი', parent: 'burger', alias: ['ყველიანი ბურგერი'] },
  { id: 'burger_chick',  ka: 'ქათმის ბურგერი', parent: 'burger', alias: ['ჩიქენ ბურგერი'] },
  { id: 'burger_double', ka: 'ორმაგი ბურგერი',  parent: 'burger', alias: ['დაბლი'] },

  { id: 'fries',      ka: 'კარტოფილი ფრი', parent: 'fastfood',
    alias: ['ფრი', 'ფრიტი', 'ფრები', 'french fries', 'შემწვარი კარტოფილი'],
    with: ['sauce_ketchup', 'sauce_garlic'] },

  { id: 'nuggets',    ka: 'ნაგეტსი',  parent: 'fastfood', alias: ['ნაგეცი', 'nuggets'] },
  { id: 'sandwich',   ka: 'სენდვიჩი', parent: 'fastfood', alias: ['სენდვიჩები', 'sandwich'] },
  { id: 'toast',      ka: 'ტოსტი',    parent: 'fastfood' },
  { id: 'lavash_roll', ka: 'ლავაშის რულეტი', parent: 'fastfood', alias: ['ლავაში', 'რულეტი'] },
  { id: 'wings',      ka: 'ფრთები',   parent: 'fastfood', alias: ['ქათმის ფრთები', 'wings'] },

  /* ═══ სუპები ════════════════════════════════════════════ */

  { id: 'kharcho',    ka: 'ხარჩო',     parent: 'soup', alias: ['ხარჭო'] },
  { id: 'chikhirtma', ka: 'ჩიხირთმა',  parent: 'soup' },
  { id: 'khashi',     ka: 'ხაში',      parent: 'soup', with: ['chacha', 'garlic'] },
  { id: 'bozbashi',   ka: 'ბოზბაში',   parent: 'soup' },
  { id: 'borsh',      ka: 'ბორში',     parent: 'soup', alias: ['ბორშჩი'] },
  { id: 'soup_mush',  ka: 'სოკოს სუპი', parent: 'soup' },
  { id: 'soup_cream', ka: 'კრემ-სუპი',  parent: 'soup', alias: ['კრემსუპი'] },

  /* ═══ ცხელი კერძები ═════════════════════════════════════ */

  { id: 'lobio',      ka: 'ლობიო', parent: 'hot',
    alias: ['ლობიო ქოთანში'], with: ['mchadi', 'pickles'] },
  { id: 'badrijani',  ka: 'ბადრიჯანი ნიგვზით', parent: 'hot', alias: ['ბადრიჯნები'] },
  { id: 'pkhali',     ka: 'ფხალი', parent: 'hot', alias: ['ფხლოვანი'] },
  { id: 'mushrooms',  ka: 'სოკო კეცზე', parent: 'hot', alias: ['კეცზე სოკო'] },
  { id: 'soko_arch',  ka: 'შემწვარი სოკო', parent: 'hot' },
  { id: 'dolma',      ka: 'დოლმა', parent: 'hot' },
  { id: 'tolma',      ka: 'ტოლმა', parent: 'hot' },

  /* ═══ სალათები ══════════════════════════════════════════ */

  { id: 'salad_geo',   ka: 'ქართული სალათი', parent: 'salad', alias: ['პომიდორი კიტრი'] },
  { id: 'salad_caesar', ka: 'ცეზარი',        parent: 'salad', alias: ['caesar', 'ცეზარის სალათი'] },
  { id: 'salad_greek', ka: 'ბერძნული სალათი', parent: 'salad', alias: ['გრეჩესკი', 'greek'] },
  { id: 'salad_olivie', ka: 'ოლივიე',        parent: 'salad' },
  { id: 'salad_warm',  ka: 'თბილი სალათი',   parent: 'salad' },

  /* ═══ საუზმე ════════════════════════════════════════════ */

  { id: 'omlet',      ka: 'ომლეტი',   parent: 'breakfast', alias: ['ომლეთი'] },
  { id: 'chirbuli',   ka: 'ჩირბული',  parent: 'breakfast' },
  { id: 'eggs',       ka: 'კვერცხი',  parent: 'breakfast', alias: ['შემწვარი კვერცხი', 'ერბოკვერცხი'] },
  { id: 'pancake',    ka: 'პანქეიქი', parent: 'breakfast', alias: ['ბლინი', 'pancake', 'ბლინები'] },
  { id: 'porridge',   ka: 'ფაფა',     parent: 'breakfast', alias: ['ოვსიანკა', 'ჰერკულესი'] },
  { id: 'granola',    ka: 'გრანოლა',  parent: 'breakfast', alias: ['მიუსლი'] },

  /* ═══ საცხობი ═══════════════════════════════════════════ */

  { id: 'bread',      ka: 'პური', parent: 'bakery', alias: ['puri'] },
  { id: 'shoti',      ka: 'შოთი', parent: 'bread', alias: ['შოთის პური', 'დედის პური', 'თონის პური'] },
  { id: 'lavashi',    ka: 'ლავაში',  parent: 'bread' },
  { id: 'baguette',   ka: 'ბაგეტი',  parent: 'bread' },
  { id: 'bulka',      ka: 'ბულკა',   parent: 'bread', alias: ['ფუნთუშა'] },
  { id: 'croissant',  ka: 'კრუასანი', parent: 'bakery', alias: ['კრუასანი', 'croissant', 'კრუასან'] },
  { id: 'kada',       ka: 'ქადა',    parent: 'bakery' },

  /* ═══ ტკბილეული ═════════════════════════════════════════ */

  { id: 'churchkhela', ka: 'ჩურჩხელა', parent: 'sweets' },
  { id: 'gozinaki',   ka: 'გოზინაყი',  parent: 'sweets' },
  { id: 'pakhlava',   ka: 'ფახლავა',   parent: 'sweets', alias: ['პახლავა', 'baklava'] },
  { id: 'cake',       ka: 'ტორტი',     parent: 'sweets', alias: ['torti'] },
  { id: 'napoleon',   ka: 'ნაპოლეონი', parent: 'cake' },
  { id: 'medovik',    ka: 'მედოვიკი',  parent: 'cake', alias: ['თაფლის ტორტი'] },
  { id: 'tiramisu',   ka: 'ტირამისუ',  parent: 'cake', alias: ['tiramisu'] },
  { id: 'cheesecake', ka: 'ჩიზქეიქი',  parent: 'cake', alias: ['cheesecake', 'ჩიზკეიკი'] },
  { id: 'eclair',     ka: 'ეკლერი',    parent: 'sweets' },
  { id: 'icecream',   ka: 'ნაყინი',    parent: 'sweets', alias: ['მოროჟნი', 'ice cream'] },
  { id: 'donut',      ka: 'დონატი',    parent: 'sweets', alias: ['პონჩიკი', 'donut'] },

  /* ═══ ყავა და ჩაი ═══════════════════════════════════════ */

  { id: 'espresso',   ka: 'ესპრესო',   parent: 'coffee', alias: ['espresso', 'ესპრესსო'] },
  { id: 'americano',  ka: 'ამერიკანო', parent: 'coffee', alias: ['americano'] },
  { id: 'cappuccino', ka: 'კაპუჩინო',  parent: 'coffee', alias: ['cappuccino', 'კაპუჩინა'] },
  { id: 'latte',      ka: 'ლატე',      parent: 'coffee', alias: ['latte', 'ლატტე'] },
  { id: 'flatwhite',  ka: 'ფლეთ უაითი', parent: 'coffee', alias: ['flat white'] },
  { id: 'raf',        ka: 'რაფი',      parent: 'coffee' },
  { id: 'mocha',      ka: 'მოკა',      parent: 'coffee', alias: ['mocha', 'მოკკა'] },
  { id: 'turkish',    ka: 'თურქული ყავა', parent: 'coffee', alias: ['აღმოსავლური ყავა', 'ჯეზვე'] },
  { id: 'icedcoffee', ka: 'ცივი ყავა', parent: 'coffee', alias: ['აისდ ლატე', 'iced', 'ცივი ლატე'] },
  { id: 'tea',        ka: 'ჩაი',       parent: 'coffee', alias: ['chai'] },
  { id: 'tea_green',  ka: 'მწვანე ჩაი', parent: 'tea' },
  { id: 'tea_herbal', ka: 'მცენარეული ჩაი', parent: 'tea', alias: ['ბალახოვანი ჩაი'] },

  /* ═══ უალკოჰოლო ═════════════════════════════════════════ */

  { id: 'lemonade',   ka: 'ლიმონათი', parent: 'drinks',
    alias: ['ზედაზენი', 'ნატახტარი', 'ლაღიძე', 'ტარხუნი', 'ქართული ლიმონათი'] },
  { id: 'water',      ka: 'წყალი',    parent: 'drinks' },
  { id: 'water_min',  ka: 'მინერალური წყალი', parent: 'water',
    alias: ['ბორჯომი', 'ნაბეღლავი', 'სნო', 'ლიკანი'] },
  { id: 'cola',       ka: 'გამაგრილებელი', parent: 'drinks',
    alias: ['კოკა-კოლა', 'კოკა კოლა', 'ფანტა', 'სპრაიტი', 'პეპსი', 'cola'] },
  { id: 'juice',      ka: 'წვენი',    parent: 'drinks', alias: ['ნატურალური წვენი', 'ფრეში'] },
  { id: 'energy',     ka: 'ენერგეტიკული', parent: 'drinks', alias: ['red bull', 'ენერჯი', 'hell'] },
  { id: 'matsoni',    ka: 'მაწონი',   parent: 'drinks' },
  { id: 'ayran',      ka: 'აირანი',   parent: 'drinks', alias: ['ტანი', 'დოუ'] },
  { id: 'smoothie',   ka: 'სმუზი',    parent: 'drinks', alias: ['smoothie', 'შეიკი', 'მილკშეიკი'] },

  /* ═══ ალკოჰოლი ══════════════════════════════════════════ */

  { id: 'wine',       ka: 'ღვინო', parent: 'alcohol', alias: ['ghvino'] },
  { id: 'wine_red',   ka: 'წითელი ღვინო', parent: 'wine',
    alias: ['საფერავი', 'ხვანჭკარა', 'კინძმარაული', 'მუკუზანი', 'ახაშენი'] },
  { id: 'wine_white', ka: 'თეთრი ღვინო',  parent: 'wine',
    alias: ['რქაწითელი', 'წინანდალი', 'ცინანდალი', 'მწვანე'] },
  { id: 'wine_amber', ka: 'ქარვისფერი ღვინო', parent: 'wine',
    alias: ['ქვევრის ღვინო', 'ამბერი', 'orange wine'] },

  { id: 'beer',       ka: 'ლუდი', parent: 'alcohol',
    alias: ['ნატახტარი ლუდი', 'ყაზბეგი', 'არგო', 'beer'], with: ['khinkali', 'wings'] },
  { id: 'chacha',     ka: 'ჭაჭა',   parent: 'alcohol', alias: ['ჩაჩა'] },
  { id: 'brandy',     ka: 'კონიაკი', parent: 'alcohol', alias: ['ბრენდი', 'სარაჯიშვილი'] },
  { id: 'vodka',      ka: 'არაყი',  parent: 'alcohol', alias: ['ვოდკა'] },
  { id: 'whiskey',    ka: 'ვისკი',  parent: 'alcohol', alias: ['whiskey', 'ვისკის'] },
  { id: 'cocktail',   ka: 'კოქტეილი', parent: 'alcohol', alias: ['მოხიტო', 'აპეროლი', 'cocktail'] },

  /* ═══ აზიური ════════════════════════════════════════════ */

  { id: 'sushi',      ka: 'სუში', parent: 'asian', alias: ['sushi', 'სუშები'] },
  { id: 'roll',       ka: 'როლი', parent: 'sushi',
    alias: ['ფილადელფია', 'კალიფორნია', 'roll', 'როლები'] },
  { id: 'ramen',      ka: 'რამენი', parent: 'asian', alias: ['ramen'] },
  { id: 'wok',        ka: 'ვოკი',   parent: 'asian', alias: ['wok', 'ლაფშა'] },
  { id: 'padthai',    ka: 'ფად თაი', parent: 'asian', alias: ['pad thai'] },
  { id: 'dimsum',     ka: 'დიმ სამი', parent: 'asian', alias: ['dim sum', 'ბაოცზი'] },

  /* ═══ გარნირი ═══════════════════════════════════════════ */

  { id: 'rice',       ka: 'ბრინჯი',   parent: 'sides' },
  { id: 'buckwheat',  ka: 'წიწიბურა', parent: 'sides', alias: ['გრეჩკა'] },
  { id: 'pasta',      ka: 'მაკარონი', parent: 'sides', alias: ['პასტა', 'spaghetti', 'სპაგეტი'] },
  { id: 'pickles',    ka: 'მწნილი',   parent: 'sides', alias: ['ჯონჯოლი', 'კიტრის მწნილი'] },
  { id: 'cheese',     ka: 'ყველი',    parent: 'sides',
    alias: ['სულგუნი', 'იმერული ყველი', 'გუდის ყველი', 'ნადუღი'] },

  /* ═══ სოუსები ═══════════════════════════════════════════ */

  { id: 'tkemali',    ka: 'ტყემალი',   parent: 'sauce', alias: ['წითელი ტყემალი', 'მწვანე ტყემალი'] },
  { id: 'satsebeli',  ka: 'საწებელი',  parent: 'sauce' },
  { id: 'bazhe',      ka: 'ბაჟე',      parent: 'sauce', alias: ['ნიგვზის საწებელი'] },
  { id: 'adjika',     ka: 'აჯიკა',     parent: 'sauce' },
  { id: 'sauce_ketchup', ka: 'კეტჩუპი', parent: 'sauce', alias: ['ketchup'] },
  { id: 'sauce_mayo',    ka: 'მაიონეზი', parent: 'sauce' },
  { id: 'sauce_garlic',  ka: 'ნიორწყალი', parent: 'sauce', alias: ['ნივრის სოუსი', 'ჩესნოკი'] },
  { id: 'sauce_cheese',  ka: 'ყველის სოუსი', parent: 'sauce' },
];

export default FOOD;
