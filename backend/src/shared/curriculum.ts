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

const cfg: Record<number, Record<string, Cfg>> = {
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
        book: "Geography · Contemporary India II",
        items: [
          "Environment",
          "Inside Our Earth",
          "Our Changing Earth",
          "Air: A Lifeline",
          "Forests: A Lifeline",
          "Water: A Lifeline",
          "Ground Water",
          "Urbanisation and its Challenges",
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

export function validClass(c: string): c is "7" | "8" {
  return c === "7" || c === "8";
}

export function validSubject(slug: string): boolean {
  return SUBJECTS.some((s) => s.slug === slug);
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
