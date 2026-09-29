// ---------------------------------------------------------------------------
// Site data. Edit this file to change the products shown across the site.
// ---------------------------------------------------------------------------

export const INSTAGRAM_DM = 'https://ig.me/m/wishes.sy';
export const INSTAGRAM_PAGE = 'https://www.instagram.com/wishes.sy/';
export const CURRENCY = '$';

// Sham Cash wallet shown at checkout. Leave `account` empty and customers are
// told the account will be sent to them over Instagram instead.
// TODO: replace the placeholder with the store's real Sham Cash account.
export const SHAM_CASH = {
  account: '0000 0000 0000',
  name: 'Wishes',
};

export const CATEGORY_LABELS = {
  fragrance: 'عطور',
  body: 'عناية بالجسم',
  hair: 'عناية بالشعر',
  makeup: 'مكياج',
};

export const products = [
  {
    id: 'body-mist-bodyshop',
    name: 'بادي مست – ذا بودي شوب',
    desc: 'روائح منعشة تدوم: شيا، فراولة، مانجو وجوز الهند — 100 مل.',
    details:
      'بخاخ معطّر للجسم من ذا بودي شوب بتركيبة نباتية خفيفة، متوفر بعدة روائح: شيا، فراولة، بليسفول ستروبيري، مانجو وجوز الهند. الحجم 100 مل (3.3 أونصة). اذكري الرائحة التي تريدينها عند إرسال الطلب.',
    category: 'fragrance',
    price: 35,
    image: './images/products/body-mist-bodyshop.jpg',
    tag: 'الأكثر مبيعاً',
  },
  {
    id: 'body-butter-bodyshop',
    name: 'زبدة الجسم – ذا بودي شوب',
    desc: 'ترطيب يدوم 96 ساعة بخيارات الشيا والفراولة — 200 مل.',
    details:
      'زبدة جسم غنية من ذا بودي شوب تمنح ترطيباً يدوم حتى 96 ساعة. متوفرة بزبدة الشيا للبشرة الجافة جداً وبالفراولة للبشرة العادية. الحجم 200 مل.',
    category: 'body',
    price: 35,
    image: './images/products/body-butter-bodyshop.jpg',
  },
  {
    id: 'ibraq-oil-set',
    name: 'سيت دهن إبراق – إبراهيم القرشي',
    desc: 'خمسة دهون عطرية فاخرة داخل علبة هدية أنيقة.',
    details:
      'مجموعة من خمسة دهون عطرية من إبراق – إبراهيم القرشي داخل علبة هدية مزخرفة. فوحان عالٍ وثبات طويل، ومثالية كهدية مميزة.',
    category: 'fragrance',
    price: 50,
    image: './images/products/ibraq-oil-set.jpg',
  },
  {
    id: 'kayali-sweet-obsessions',
    name: 'سيت كايالي Sweet Obsessions',
    desc: 'أربعة عطور مصغّرة 10 مل: فانيلا، روك شوقر، يم وفلور ماجستي.',
    details:
      'مجموعة كايالي المصغّرة Sweet Obsessions: أربع زجاجات أو دو بارفان بحجم 10 مل لكل منها — Vanilla 28، Vanilla Candy Rock Sugar 42، Yum Boujee Marshmallow 81 و Fleur Majesty Rose Royale 31.',
    category: 'fragrance',
    price: 100,
    image: './images/products/kayali-sweet-obsessions.jpg',
    tag: 'هدية مميزة',
  },
  {
    id: 'sol-de-janeiro-set',
    name: 'سيت صول دي جانيرو',
    desc: 'خمسة بخاخات عطرية شيروزا: 62، 40، 68، 59 و76.',
    details:
      'مجموعة Sol de Janeiro المكوّنة من خمسة بخاخات عطرية Cheirosa بأرقامها الشهيرة 62، 40، 68، 59 و76 — روائح دافئة وحلوة تدوم طوال اليوم.',
    category: 'fragrance',
    price: 60,
    image: './images/products/sol-de-janeiro-set.jpg',
  },
  {
    id: 'victorias-secret-set',
    name: 'سيت فيكتوريا سيكريت',
    desc: 'بخاخ معطّر مع لوشن للجسم بعطر Heavenly أو Tease Rebel.',
    details:
      'علبة هدية من فيكتوريا سيكريت تضم بخاخاً معطّراً ولوشن للجسم. متوفرة بعطر Heavenly أو Tease Rebel — اذكري خيارك عند الطلب.',
    category: 'fragrance',
    price: 40,
    image: './images/products/victorias-secret-set.jpg',
  },
  {
    id: 'hair-scalp-scrub-ginger',
    name: 'سكراب الشعر وفروة الرأس بالزنجبيل',
    desc: 'ذا بودي شوب: ينعش فروة الرأس الجافة ويزيل القشرة — 240 مل.',
    details:
      'سكراب مقشّر لفروة الرأس من ذا بودي شوب بخلاصة الزنجبيل وبروتين الكيراتين النباتي، للفروة الجافة والمتقشّرة. الحجم 240 مل.',
    category: 'hair',
    price: 35,
    image: './images/products/hair-scalp-scrub-ginger.jpg',
  },
  {
    id: 'fenty-beauty-set',
    name: 'سيت فنتي بيوتي',
    desc: 'هايلايتر دايموند بومب + ماسكارا هيلا ثيك + غلوس بومب ستيك.',
    details:
      'مجموعة Fenty’s Finest من فنتي بيوتي: هايلايتر Diamond Bomb بوزن 2.8 غ، ماسكارا Hella Thicc بحجم 6.5 مل، وغلوس Gloss Bomb Stix بوزن 3.6 غ.',
    category: 'makeup',
    price: 55,
    image: './images/products/fenty-beauty-set.jpg',
    tag: 'جديد',
  },
  {
    id: 'mfk-baccarat-rouge-540',
    name: 'بكارات روج 540 – ميزون فرانسيس كوركدجيان',
    desc: 'عطر Baccarat Rouge 540 بتركيز إكستريه دو بارفان.',
    details:
      'عطر Baccarat Rouge 540 Extrait de Parfum من Maison Francis Kurkdjian باريس — من أشهر العطور الفاخرة في العالم، بفوحان مميز وثبات عالٍ.',
    category: 'fragrance',
    price: 300,
    image: './images/products/mfk-baccarat-rouge-540.jpg',
    tag: 'فاخر',
  },
  {
    id: 'lancome-la-vie-est-belle',
    name: 'عطر لا في إي بيل – لانكوم',
    desc: 'أو دو بارفان La vie est belle من لانكوم — 100 مل.',
    details:
      'عطر La vie est belle من Lancôme بتركيز أو دو بارفان، بحجم 100 مل (3.4 أونصة).',
    category: 'fragrance',
    price: 130,
    image: './images/products/lancome-la-vie-est-belle.jpg',
  },
  {
    id: 'kayali-yum-boujee-marshmallow',
    name: 'عطر كايالي Yum Boujee Marshmallow 81',
    desc: 'عطر كايالي بحجم كامل 100 مل.',
    details:
      'عطر Yum Boujee Marshmallow | 81 من كايالي بحجم 100 مل — رائحة حلوة ومميزة من أكثر عطور كايالي طلباً.',
    category: 'fragrance',
    price: 130,
    image: './images/products/kayali-yum-boujee-marshmallow.jpg',
  },
  {
    id: 'kayali-yummy-vanilla-set',
    name: 'سيت كايالي Yummy Vanilla',
    desc: 'عطر كايالي بحجمه الكامل مع نسخة مصغّرة في علبة هدية.',
    details:
      'مجموعة Yummy Vanilla Set من كايالي داخل علبة هدية: زجاجة عطر بالحجم الكامل مع زجاجة مصغّرة.',
    category: 'fragrance',
    price: 120,
    image: './images/products/kayali-yummy-vanilla-set.jpg',
  },
  {
    id: 'kayali-vacay-in-a-bottle',
    name: 'سيت كايالي Vacay in a Bottle',
    desc: 'أربعة عطور كايالي مصغّرة بروائح صيفية منعشة.',
    details:
      'مجموعة Vacay in a Bottle المصغّرة من كايالي: أربع زجاجات عطر صغيرة بروائح صيفية، داخل علبة هدية أنيقة.',
    category: 'fragrance',
    price: 100,
    image: './images/products/kayali-vacay-in-a-bottle.jpg',
  },
  {
    id: 'ibraq-diamond-set',
    name: 'سيت دايموند – إبراهيم القرشي',
    desc: 'مجموعة عطور إبراق داخل صندوق هدية فاخر.',
    details:
      'سيت دايموند من إبراق – إبراهيم القرشي: مجموعة من العطور المتنوعة داخل صندوق هدية فاخر، مثالية كهدية أو لتجربة أكثر من رائحة.',
    category: 'fragrance',
    price: 75,
    image: './images/products/ibraq-diamond-set.jpg',
  },
  {
    id: 'victorias-secret-tease-eau-so-sexy',
    name: 'سيت فيكتوريا سيكريت Tease / Eau So Sexy',
    desc: 'بخاخ معطّر مع لوشن للجسم بعطر Tease أو Eau So Sexy.',
    details:
      'علبة هدية من فيكتوريا سيكريت تضم بخاخاً معطّراً ولوشن للجسم. متوفرة بعطر Tease أو Eau So Sexy — اذكري خيارك عند الطلب.',
    category: 'fragrance',
    price: 40,
    image: './images/products/victorias-secret-tease-eau-so-sexy.jpg',
  },
  {
    id: 'victorias-secret-bombshell-love-star',
    name: 'سيت فيكتوريا سيكريت Bombshell Seduction / Love Star',
    desc: 'بخاخ معطّر مع لوشن للجسم بعطر Bombshell Seduction أو Love Star.',
    details:
      'علبة هدية من فيكتوريا سيكريت تضم بخاخاً معطّراً ولوشن للجسم. متوفرة بعطر Bombshell Seduction أو Love Star — اذكري خيارك عند الطلب.',
    category: 'fragrance',
    price: 40,
    image: './images/products/victorias-secret-bombshell-love-star.jpg',
  },
  {
    id: 'victorias-secret-lotion-mini-perfume',
    name: 'سيت فيكتوريا سيكريت لوشن وعطر مصغّر',
    desc: 'لوشن للجسم مع عطر مصغّر بعطر Tease أو Bare.',
    details:
      'علبة هدية من فيكتوريا سيكريت تضم لوشن للجسم مع زجاجة عطر مصغّرة. متوفرة بعطر Tease أو Bare — اذكري خيارك عند الطلب.',
    category: 'fragrance',
    price: 40,
    image: './images/products/victorias-secret-lotion-mini-perfume.jpg',
  },
  {
    id: 'bodyshop-coconut-gift-bag',
    name: 'حقيبة هدايا ذا بودي شوب – جوز الهند',
    desc: 'شاور كريم، زبدة جسم، بخاخ جسم وليفة داخل حقيبة أنيقة.',
    details:
      'حقيبة هدايا من ذا بودي شوب بخلاصة جوز الهند: شاور كريم، زبدة جسم، بخاخ معطّر للجسم وليفة استحمام، داخل حقيبة قماشية يمكن استخدامها بعد ذلك.',
    category: 'body',
    price: 85,
    image: './images/products/bodyshop-coconut-gift-bag.jpg',
    tag: 'هدية مميزة',
  },
  {
    id: 'bodyshop-shea-gift-bag',
    name: 'حقيبة هدايا ذا بودي شوب – زبدة الشيا',
    desc: 'مجموعة Nourish & Flourish بزبدة الشيا للعناية بالجسم.',
    details:
      'مجموعة Nourish & Flourish من ذا بودي شوب بزبدة الشيا: منتجات للعناية والترطيب مع بخاخ للجسم وليفة، داخل حقيبة هدية.',
    category: 'body',
    price: 85,
    image: './images/products/bodyshop-shea-gift-bag.jpg',
  },
  {
    id: 'bodyshop-body-lotion',
    name: 'لوشن جسم – ذا بودي شوب',
    desc: 'لوشن مرطّب بحليب اللوز أو الأرغان — 200 مل.',
    details:
      'لوشن للجسم من ذا بودي شوب بتركيبة خفيفة وسريعة الامتصاص، متوفر بحليب اللوز أو الأرغان. الحجم 200 مل. اذكري الرائحة عند الطلب.',
    category: 'body',
    price: 30,
    image: './images/products/bodyshop-body-lotion.jpg',
  },
  {
    id: 'bodyshop-hand-cream',
    name: 'كريم يدين – ذا بودي شوب',
    desc: 'كريم يدين مرطّب بعدة روائح — حجم مناسب للحقيبة.',
    details:
      'كريم يدين من ذا بودي شوب بتشكيلة واسعة من الروائح، يرطّب اليدين دون ملمس دهني. حجم صغير مناسب للحقيبة. اذكري الرائحة التي تريدينها عند الطلب.',
    category: 'body',
    price: 11,
    image: './images/products/bodyshop-hand-cream.jpg',
  },
  {
    id: 'bodyshop-exfoliating-gloves',
    name: 'كفوف تقشير – ذا بودي شوب',
    desc: 'كفوف تقشير للجسم لبشرة ناعمة ومنتعشة.',
    details:
      'كفوف تقشير من ذا بودي شوب تستخدم أثناء الاستحمام لإزالة الخلايا الميتة وتنعيم البشرة.',
    category: 'body',
    price: 10,
    image: './images/products/bodyshop-exfoliating-gloves.jpg',
  },
  {
    id: 'fenty-hair-set',
    name: 'سيت فنتي هير',
    desc: 'ثلاثة منتجات للعناية بالشعر من فنتي هير.',
    details:
      'مجموعة Fenty Hair للعناية بالشعر: ثلاثة منتجات مكمّلة لبعضها داخل علبة هدية، لشعر مرطّب وصحي.',
    category: 'hair',
    price: 100,
    image: './images/products/fenty-hair-set.jpg',
    tag: 'جديد',
  },
  {
    id: 'makeup-by-mario-lip-combo',
    name: 'سيت شفاه ميكب باي ماريو',
    desc: 'محدد شفاه مع لون شفاه متناسق — Makeup By Mario.',
    details:
      'طقم Lip Combo من Makeup By Mario: محدد شفاه مع لون شفاه متناسق معه لإطلالة شفاه متكاملة.',
    category: 'makeup',
    price: 18,
    image: './images/products/makeup-by-mario-lip-combo.jpg',
  },
  {
    id: 'heaven-beauty-tints',
    name: 'تنت القلب – Heaven Beauty',
    desc: 'تنت للشفاه والخدود بعلبة على شكل قلب — لمعة Heavenly أو بريق Sparkly.',
    details:
      'تنت Heaven Beauty اللبناني للشفاه والخدود بتركيبة خفيفة وسهلة الدمج تناسب البشرة الحساسة، نباتي وخالٍ من القسوة. متوفر بنوعين: Heavenly Tint اللامع و Sparkly Tint بالبريق، وبدرجات Kind و Pure و Love — اذكري النوع والدرجة عند الطلب.',
    category: 'makeup',
    price: 26,
    image: './images/products/heaven-beauty-tints.jpg',
    tag: 'جديد',
  },
];

export const getProduct = (id) => products.find((p) => p.id === id);

/** Stock is tracked when it's a number; 0 means sold out. */
export const isSoldOut = (product) => product.stock === 0;

// Product text comes from the database, so escape it before using innerHTML.
export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ],
  );

export const formatPrice = (value) => `${value}${CURRENCY}`;
