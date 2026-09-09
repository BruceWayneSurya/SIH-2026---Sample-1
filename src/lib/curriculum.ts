export type SubjectMeta = {
  slug: string;
  name: string;
  short: string;
  icon: "calculator" | "flask" | "globe" | "book" | "languages" | "palette";
  tint: string; // tailwind classes for the icon chip
};

export const SUBJECTS: SubjectMeta[] = [
  { slug: "science", name: "Science", short: "Sci", icon: "flask", tint: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { slug: "mathematics", name: "Mathematics", short: "Math", icon: "calculator", tint: "bg-blue-50 text-blue-700 border-blue-200" },
  { slug: "social-science", name: "Social Science", short: "SST", icon: "globe", tint: "bg-amber-50 text-amber-700 border-amber-200" },
  { slug: "english", name: "English", short: "Eng", icon: "book", tint: "bg-rose-50 text-rose-700 border-rose-200" },
  { slug: "hindi", name: "हिन्दी · Hindi", short: "Hin", icon: "languages", tint: "bg-violet-50 text-violet-700 border-violet-200" },
  { slug: "arts-vocational", name: "Arts & Vocational", short: "Arts", icon: "palette", tint: "bg-teal-50 text-teal-700 border-teal-200" },
];

export type ChapterRow = { title: string; book?: string; summary?: string };

type Book = { book: string; items: string[] };
type Cfg = (Book | string | ChapterRow)[];

/**
 * Classes served by the portal. Registration, routing, leaderboard filters and
 * the demo seed all read this list, so adding a class is a one-line change.
 */
export const CLASSES = [6, 7, 8, 9, 10] as const;
export type ClassNo = (typeof CLASSES)[number];

/**
 * Chapter index per class and subject. Titles follow the NCERT textbooks in
 * circulation for the current academic session:
 *   Class 6  — Curiosity (Science), Ganita Prakash (Mathematics)
 *   Class 9  — Exploration (Science), Ganit (Mathematics), Kaveri (English)
 *   Class 10 — Science, Mathematics, First Flight, क्षितिज भाग 2
 * NCERT is still rolling out the NCF-2023 series class by class, so re-sync
 * this index whenever NCERT publishes a revision.
 */
const cfg: Record<number, Record<string, Cfg>> = {
  6: {
    science: [
      "The Wonderful World of Science",
      "Diversity in the Living World",
      "Mindful Eating: A Path to a Healthy Body",
      "Exploring Magnets",
      "Measurement of Length and Motion",
      "Materials Around Us",
      "Temperature and its Measurement",
      "A Journey Through States of Water",
      "Methods of Separation in Everyday Life",
      "Living Creatures: Exploring their Characteristics",
      "Nature’s Treasures",
      "Beyond Earth",
    ].map((t) => ({ title: t, book: "Curiosity" }) as ChapterRow),
    mathematics: [
      "Patterns in Mathematics",
      "Lines and Angles",
      "Number Play",
      "Data Handling and Presentation",
      "Prime Time",
      "Perimeter and Area",
      "Fractions",
      "Playing with Constructions",
      "Symmetry",
      "The Other Side of Zero",
    ].map((t) => ({ title: t, book: "Ganita Prakash" }) as ChapterRow),
    "social-science": [
      {
        book: "History · Our Pasts I",
        items: [
          "What, Where, How and When?",
          "From Hunting–Gathering to Growing Food",
          "In the Earliest Cities",
          "What Books and Burials Tell Us",
          "Kingdoms, Kings and an Early Republic",
          "New Questions and Ideas",
          "Ashoka, the Emperor Who Gave Up War",
          "Vital Villages, Thriving Towns",
          "Traders, Kings and Pilgrims",
          "New Empires and Kingdoms",
          "Buildings, Paintings and Books",
        ],
      },
      {
        book: "Geography · The Earth: Our Habitat",
        items: [
          "The Earth in the Solar System",
          "Globe: Latitudes and Longitudes",
          "Motions of the Earth",
          "Maps",
          "Major Domains of the Earth",
          "Major Landforms of the Earth",
          "Our Country — India",
          "India: Climate, Natural Vegetation and Wildlife",
        ],
      },
      {
        book: "Civics · Social and Political Life I",
        items: [
          "Understanding Diversity",
          "Diversity and Discrimination",
          "What is Government?",
          "Key Elements of a Democratic Government",
          "Panchayati Raj",
          "Rural Administration",
          "Urban Administration",
          "Rural Livelihoods",
          "Urban Livelihoods",
        ],
      },
    ],
    english: [
      {
        book: "Prose · Honeysuckle",
        items: [
          "Who Did Patrick’s Homework?",
          "How the Dog Found Himself a New Master!",
          "Taro’s Reward",
          "An Indian-American Woman in Space: Kalpana Chawla",
          "A Different Kind of School",
          "Who I Am",
          "Fair Play",
          "A Game of Chance",
          "Desert Animals",
          "The Banyan Tree",
        ],
      },
      {
        book: "Poetry · Honeysuckle",
        items: [
          "A House, A Home",
          "The Kite",
          "The Quarrel",
          "Beauty",
          "Where Do All the Teachers Go?",
          "The Wonderful Words",
          "Vocation",
          "Whatif",
        ],
      },
    ],
    hindi: [
      {
        book: "वसंत भाग 1",
        items: [
          "वसंत के आगमन पर",
          "बचपन",
          "नादान दोस्त",
          "चाँद से थोड़ी-सी गप्पें",
          "अक्षरों का महत्व",
          "पार नज़र के",
          "साथी हाथ बढ़ाना",
          "ऐसे-ऐसे",
          "टिकट अलबम",
          "झीनी-झीनी बीनी चदरिया",
          "कबीर की साखियाँ",
        ],
      },
    ],
    "arts-vocational": [
      "Drawing: Lines, Shapes and Patterns",
      "Colours: Primary, Secondary and Tints",
      "Paper Folding and Greeting Cards",
      "Clay and Dough Modelling",
      "Rhythm: Clapping Games and Folk Songs",
      "Local Folk Art Forms",
      "Vocational Skills: Keeping the Classroom Tidy",
      "Vocational Skills: Kitchen Garden Basics",
    ],
  },
  7: {
    science: [
      "Nutrition in Plants",
      "Fibres to Fabric",
      "Fuel and Combustion",
      "Acids, Bases and Salts",
      "Physical and Chemical Changes",
      "Weather, Climate and Adaptations of Animals to Climate",
      "Motion and Time",
      "Electricity and Circuits",
      "Heat",
      "Respiration in Organisms",
      "Reproduction in Plants",
      "Growth and Development",
      "Light",
    ],
    mathematics: [
      "Integers",
      "Fractions and Decimals",
      "Data Handling",
      "Simple Equations",
      "Line and Angle Measures",
      "The Triangle and Its Properties",
      "Congruence",
      "Comparing Quantities",
      "Rational Numbers",
      "Perimeter and Area",
      "Algebraic Expressions",
      "Practical Geometry",
      "Linear Equations in One Variable",
      "Symmetry",
      "Visualising Solid Shapes",
    ],
    "social-science": [
      {
        book: "History · Our Pasts II",
        items: [
          "Tracing Changes Through a Thousand Years",
          "New Motives in a Changing Society",
          "Rural Towns and Towns",
          "Delhi: Sultans and Mughals",
          "When People Rebel, 1400–1750",
          "Traders, Craftpersons and Kings",
          "Tribes, Nomads and Settled Communities",
          "Devotional Paths to the Divine",
          "The Mughal Empire",
          "The Making of Regional Cultures",
        ],
      },
      {
        book: "Geography · Our Environment",
        items: [
          "Environment",
          "Inside Our Earth",
          "Our Changing Earth",
          "Air",
          "Water",
          "Human-Environment Interactions — The Tropical and the Subtropical Region",
          "Life in the Deserts",
        ],
      },
      {
        book: "Civics · Social and Political Life II",
        items: [
          "What is Government?",
          "Understanding Diversity",
          "How the State Works",
          "The Legislative",
          "The Judiciary",
          "Electoral System",
          "The Media",
          "Consumerism",
        ],
      },
    ],
    english: [
      "A Gift of Chappals",
      "The Little Girl",
      "Meera",
      "Quibbles",
      "The Adventure",
      "A Tiny Talk",
      "The King of Mischief",
      "A True Story",
    ],
    hindi: [
      "हम पंछी उन्मुक्त गगन के",
      "दादी माँ",
      "हिमालय की बेटियाँ",
      "कठपुतली",
      "मीठाईवाला",
      "रक्त और हमारा शरीर",
      "पापा खो गए",
      "शाम एक किसान",
      "चिड़िया की बच्ची",
      "अपूर्व अनुभव",
      "रहीम की दोहे",
      "कंचा",
      "एक तिनका",
      "खानपान की बदलती तस्वीर",
      "नीलकंठ",
      "भोर और बरखा",
      "वीर कुँवर सिंह",
    ].map((t) => ({ title: t, book: "बाल महाभारत" }) as ChapterRow),
    "arts-vocational": [
      "Introduction to Drawing & Sketching",
      "Basics of Colours and Mixing",
      "Paper Craft: Folding and Cutting",
      "Clay Modelling Basics",
      "Rhythm & Music: Tala and Raag",
      "Folk Dance Forms of India",
      "Intro to Craft: Rangoli Patterns",
      "Vocational Skills: Horticulture Basics",
    ],
  },
  8: {
    science: [
      "Food: Where Does It Come From?",
      "Crop Production and Management",
      "Fibres to Fabric",
      "Heat",
      "Acids, Bases and Salts",
      "Combustion and Flame",
      "Conservation of Plants and Animals",
      "Reproduction in Animals",
      "Respiration in Organisms",
      "Motion and Time",
      "Force and Pressure",
      "Sound",
      "Chemical Effects of Electric Current",
      "Friction",
      "Some Natural Phenomena",
      "Light",
      "Stars, the Sun and the Earth",
      "Pollution of Air and Water",
    ],
    mathematics: [
      "Rational Numbers",
      "Linear Equations in One Variable",
      "Understanding Quadrilaterals",
      "Data Handling",
      "Squares and Square Roots",
      "Cubes and Cube Roots",
      "Comparing Quantities",
      "Algebraic Expressions and Identities",
      "Practical Geometry",
      "Mensuration",
      "Exponents and Powers",
      "Direct and Inverse Proportions",
      "Factorisation",
      "Visualising Solid Shapes",
      "Statistics and Probability",
    ],
    "social-science": [
      {
        book: "History · Our Pasts III",
        items: [
          "How, When and Where",
          "From Trade to Territory: The Company Establishes Power",
          "Ruling the Countryside",
          "Shivaji and the Bijapur Sultanate",
          "Building Empires: The Mughals",
          "The French Challenge in India",
          "Civilising the 'Native', Educating the Nation",
          "The Making of the National Movement, 1847–1947",
          "India After Independence",
        ],
      },
      {
        book: "Geography · Resources and Development",
        items: [
          "Resources",
          "Land, Soil, Water, Natural Vegetation and Wildlife",
          "Minerals and Energy Resources",
          "Agriculture",
          "Industries",
          "Human Resources",
        ],
      },
      {
        book: "Civics · Social and Political Life III",
        items: [
          "How the State Government Functions",
          "Understanding Elections",
          "The Judiciary",
          "Shelter",
          "Food: A Chain of Many Events",
          "Privacy and Confidentiality",
          "Consumerism",
          "Work and Wealth",
        ],
      },
    ],
    english: [
      "A Letter to God",
      "Thank You Ma'am",
      "Annie",
      "The Best Christmas Present in the World",
      "Garam Masala",
      "The Tsunami",
      "Reach for the Top",
      "The Snake and the Mirror",
    ],
    hindi: [
      "स्वदेश",
      "दो गौरैया",
      "एक आशीर्वाद",
      "हरिद्वार",
      "कबीर के दोहे",
      "एक टोकरी भर मिट्टी",
      "मत बाँधो",
      "नए मेहमान",
      "आदमी का अनुपात",
      "तरुण के स्वप्न",
    ].map((t) => ({ title: t, book: "मल्हार" }) as ChapterRow),
    "arts-vocational": [
      "Perspective Drawing",
      "Shading and Textures in Drawing",
      "Pottery: Coiling and Slab Techniques",
      "Fabric Printing with Block Printing",
      "Music: Indian Instruments Overview",
      "Classical Dance Forms of India",
      "Digital Art Introduction",
      "Vocational Skills: Basics of Tailoring",
    ],
  },
  9: {
    science: [
      "Exploration: Entering the World of Secondary Science",
      "Cell: The Building Block of Life",
      "Tissues in Action",
      "Describing Motion Around Us",
      "Exploring Mixtures and Their Separation",
      "How Forces Affect Motion",
      "Work, Energy and Simple Machines",
      "Journey Inside the Atom",
      "Atomic Foundations of Matter",
      "Sound Waves: Characteristics and Applications",
      "Reproduction: How Life Continues",
      "Patterns in Life: Diversity and Classification",
      "Earth as a System: Energy, Matter and Life",
    ].map((t) => ({ title: t, book: "Exploration" }) as ChapterRow),
    mathematics: [
      "Orienting Yourself: The Use of Coordinates",
      "Introduction to Linear Polynomials",
      "The World of Numbers",
      "Exploring Algebraic Identities",
      "I’m Up and Down and Round and Round",
      "Measuring Space: Perimeter and Area",
      "The Mathematics of Maybe: Introduction to Probability",
      "Predicting What Comes Next: Exploring Sequences and Progressions",
    ].map((t) => ({ title: t, book: "Ganit" }) as ChapterRow),
    "social-science": [
      {
        book: "History · India and the Contemporary World I",
        items: [
          "The French Revolution",
          "Socialism in Europe and the Russian Revolution",
          "Nazism and the Rise of Hitler",
          "Forest Society and Colonialism",
          "Pastoralists in the Modern World",
        ],
      },
      {
        book: "Geography · Contemporary India I",
        items: [
          "India — Size and Location",
          "Physical Features of India",
          "Drainage",
          "Climate",
          "Natural Vegetation and Wildlife",
          "Population",
        ],
      },
      {
        book: "Civics · Democratic Politics I",
        items: [
          "What is Democracy? Why Democracy?",
          "Constitutional Design",
          "Electoral Politics",
          "Working of Institutions",
          "Democratic Rights",
        ],
      },
      {
        book: "Economics · The Story of Development",
        items: [
          "The Story of Village Palampur",
          "People as Resource",
          "Poverty as a Challenge",
          "Food Security in India",
        ],
      },
    ],
    english: [
      {
        book: "Kaveri · Main Reader",
        items: [
          "How I Taught My Grandmother to Read · Bharat, Our Land",
          "The Pot Maker · Gifts of Grace: Honouring Our Vocations",
          "Winds of Change · Canvas of Soil",
          "Vitamin-M · I Cannot Remember My Mother",
          "The World of Limitless Possibilities · Nine Gold Medals",
          "Twin Melodies · A Friend Found in Music",
          "Carrier of Words · Words",
          "Follow That Dream · Believe in Yourself",
        ],
      },
    ],
    hindi: [
      {
        book: "क्षितिज भाग 1",
        items: [
          "दो बैलों की कथा",
          "ल्हासा की ओर",
          "उपभोक्तावाद की संस्कृति",
          "साँवले सपनों की याद",
          "नाना साहब की पुत्री देवी मैना को भस्म कर दिया गया",
          "प्रेमचंद के फटे जूते",
          "मेरे बचपन के दिन",
          "एक कुत्ता और एक मैना",
          "साखियाँ एवं सबद",
          "वाख",
          "सवैये",
          "कैदी और कोकिला",
          "ग्राम श्री",
          "चंद्र गहना से लौटती बेर",
          "मेघ आए",
          "यमराज की दिशा",
          "बच्चे काम पर जा रहे हैं",
        ],
      },
    ],
    "arts-vocational": [
      "Composition and Balance in Drawing",
      "Indian Miniature Paintings: An Introduction",
      "Poster Making for Public Campaigns",
      "Pottery: Wheel Techniques",
      "Hindustani Music: Raga and Tala Basics",
      "Regional Theatre and Street Play",
      "Vocational Skills: IT and Digital Literacy",
      "Vocational Skills: Retail and Customer Service",
    ],
  },
  10: {
    science: [
      "Chemical Reactions and Equations",
      "Acids, Bases and Salts",
      "Metals and Non-metals",
      "Carbon and its Compounds",
      "Life Processes",
      "Control and Coordination",
      "How do Organisms Reproduce?",
      "Heredity",
      "Light — Reflection and Refraction",
      "The Human Eye and the Colourful World",
      "Electricity",
      "Magnetic Effects of Electric Current",
      "Our Environment",
    ].map((t) => ({ title: t, book: "Science" }) as ChapterRow),
    mathematics: [
      "Real Numbers",
      "Polynomials",
      "Pair of Linear Equations in Two Variables",
      "Quadratic Equations",
      "Arithmetic Progressions",
      "Triangles",
      "Coordinate Geometry",
      "Introduction to Trigonometry",
      "Some Applications of Trigonometry",
      "Circles",
      "Areas Related to Circles",
      "Surface Areas and Volumes",
      "Statistics",
      "Probability",
    ].map((t) => ({ title: t, book: "Mathematics" }) as ChapterRow),
    "social-science": [
      {
        book: "History · India and the Contemporary World II",
        items: [
          "The Rise of Nationalism in Europe",
          "Nationalism in India",
          "The Making of a Global World",
          "The Age of Industrialisation",
          "Print Culture and the Modern World",
        ],
      },
      {
        book: "Geography · Contemporary India II",
        items: [
          "Resources and Development",
          "Forest and Wildlife Resources",
          "Water Resources",
          "Agriculture",
          "Minerals and Energy Resources",
          "Manufacturing Industries",
          "Lifelines of National Economy",
        ],
      },
      {
        book: "Civics · Democratic Politics II",
        items: [
          "Power Sharing",
          "Federalism",
          "Gender, Religion and Caste",
          "Political Parties",
          "Outcomes of Democracy",
        ],
      },
      {
        book: "Economics · Understanding Economic Development",
        items: [
          "Development",
          "Sectors of the Indian Economy",
          "Money and Credit",
          "Globalisation and the Indian Economy",
          "Consumer Rights",
        ],
      },
    ],
    english: [
      {
        book: "Prose · First Flight",
        items: [
          "A Letter to God",
          "Nelson Mandela: Long Walk to Freedom",
          "Two Stories about Flying",
          "From the Diary of Anne Frank",
          "Glimpses of India",
          "Mijbil the Otter",
          "Madam Rides the Bus",
          "The Sermon at Benares",
          "The Proposal",
        ],
      },
      {
        book: "Poetry · First Flight",
        items: [
          "Dust of Snow",
          "Fire and Ice",
          "A Tiger in the Zoo",
          "How to Tell Wild Animals",
          "The Ball Poem",
          "Amanda!",
          "The Trees",
          "Fog",
          "The Tale of Custard the Dragon",
          "For Anne Gregory",
        ],
      },
    ],
    hindi: [
      {
        book: "क्षितिज भाग 2",
        items: [
          "पद",
          "राम-लक्ष्मण-परशुराम संवाद",
          "सवैया और कवित्त",
          "आत्मकथ्य",
          "उत्साह और अट नहीं रही",
          "यह दंतुरहित मुस्कान",
          "छाया मत छूना",
          "कन्यादान",
          "संगतकार",
          "नेताजी का चश्मा",
          "बालगोबिन भगत",
          "लखनवी अंदाज़",
          "मानवीय करुणा की दिव्य चमक",
          "एक कहानी यह भी",
          "स्त्री शिक्षा के विरोधी कुतर्कों का खंडन",
          "नौबतखाने में इबादत",
          "संस्कृति",
        ],
      },
    ],
    "arts-vocational": [
      "Advanced Composition: Still Life and Landscape",
      "Printmaking Basics",
      "Indian Classical Music: Gharana Traditions",
      "Dance: Narrative Abhinaya",
      "Photography and Visual Storytelling",
      "Vocational Skills: IT and Office Automation",
      "Vocational Skills: Banking and Financial Literacy",
      "Vocational Skills: Entrepreneurship and MSME Basics",
    ],
  },
};

export function getChapters(classNo: number, subjectSlug: string): ChapterRow[] {
  const raw = cfg[classNo]?.[subjectSlug] ?? [];
  const out: ChapterRow[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") out.push({ title: entry });
    else if ("items" in entry)
      for (const t of entry.items) out.push({ title: t, book: entry.book });
    else out.push(entry);
  }
  return out;
}

export function subjectName(slug: string): string {
  return SUBJECTS.find((s) => s.slug === slug)?.name ?? slug;
}

/** True for every class the portal publishes, e.g. "6" … "10". */
export function validClass(c: string): c is `${ClassNo}` {
  return CLASSES.some((k) => String(k) === c);
}

/** Coerce/validate a class coming from a cookie, form field or API body. */
export function classNumber(value: unknown): ClassNo | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isInteger(n) && (CLASSES as readonly number[]).includes(n)
    ? (n as ClassNo)
    : null;
}

export function classLabel(classNo: number): string {
  return `Class ${classNo}`;
}

export function validSubject(slug: string): boolean {
  return SUBJECTS.some((s) => s.slug === slug);
}

/**
 * URL slug for a chapter. Hindi/Devanagari titles produce no ASCII slug, so
 * they fall back to a stable per-subject index (kept unique by the chapter
 * number the seed assigns).
 */
export function chapterSlug(row: ChapterRow, index: number): string {
  const fromTitle = slugify(row.title);
  if (fromTitle) return fromTitle;
  const fromBook = slugify(row.book ?? "");
  return fromBook ? `${fromBook}-${index + 1}` : `chapter-${index + 1}`;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
