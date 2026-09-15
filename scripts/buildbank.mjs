// Builds public/data/questions.json — 20 demo MCQs for every syllabus topic.
// Deterministic (seeded) so rebuilds are stable.
import fs from "node:fs";

const syllabus = JSON.parse(fs.readFileSync("scripts/syllabus.json", "utf8"));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function rng(seedStr) {
  let h = 2166136261;
  for (const ch of seedStr) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let s = (h >>> 0) % 2147483647 || 12345;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// Build an MCQ from a correct numeric answer + distractor factory
function numeric(q, correct, r, explanation, fmt = (v) => String(v)) {
  const set = new Set([correct]);
  let guard = 0;
  while (set.size < 4 && guard++ < 60) {
    const delta = pick(r, [1, 2, 3, 4, 5, 6, 8, 10]) * (r() < 0.5 ? -1 : 1);
    const cand = Math.round((correct + delta) * 100) / 100;
    if (cand !== correct && cand > 0) set.add(cand);
  }
  while (set.size < 4) set.add(correct + set.size * 7);
  const options = [...set];
  // shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return {
    q,
    options: options.map(fmt),
    answer: options.indexOf(correct),
    explanation,
  };
}

function choiceQ(q, correct, wrongs, r, explanation) {
  const options = [correct, ...wrongs];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { q, options, answer: options.indexOf(correct), explanation };
}

/* ---------------- Mathematics generators ---------------- */
const mathGens = {
  percentage: (r) => {
    const base = int(r, 120, 900);
    const p = pick(r, [5, 10, 12, 15, 20, 25, 30, 40]);
    return numeric(`What is ${p}% of ${base}?`, Math.round((base * p) / 100 * 100) / 100, r, `${p}% of ${base} = ${base} x ${p}/100.`);
  },
  "profit-loss": (r) => {
    const cp = int(r, 100, 900);
    const p = pick(r, [10, 15, 20, 25, 30]);
    return numeric(`An article bought for Rs ${cp} is sold at a profit of ${p}%. Find the selling price (Rs).`, Math.round(cp * (1 + p / 100) * 100) / 100, r, `SP = CP x (1 + profit%/100) = ${cp} x ${1 + p / 100}.`);
  },
  ratio: (r) => {
    const a = int(r, 2, 9), b = int(r, 2, 9), total = (a + b) * int(r, 5, 25);
    return numeric(`Rs ${total} is divided between two people in the ratio ${a}:${b}. What is the larger share (Rs)?`, Math.round((total * Math.max(a, b)) / (a + b)), r, `Larger share = total x ${Math.max(a, b)}/${a + b}.`);
  },
  average: (r) => {
    const n = int(r, 4, 8);
    const nums = Array.from({ length: n }, () => int(r, 10, 90));
    const avg = Math.round((nums.reduce((x, y) => x + y, 0) / n) * 100) / 100;
    return numeric(`Find the average of ${nums.join(", ")}.`, avg, r, `Sum = ${nums.reduce((x, y) => x + y, 0)}, divided by ${n}.`);
  },
  interest: (r) => {
    const p = int(r, 2, 20) * 500, rate = pick(r, [4, 5, 6, 8, 10]), t = int(r, 2, 5);
    return numeric(`Find the simple interest on Rs ${p} at ${rate}% per annum for ${t} years (Rs).`, (p * rate * t) / 100, r, `SI = PRT/100 = ${p} x ${rate} x ${t} / 100.`);
  },
  compound: (r) => {
    const p = int(r, 2, 10) * 1000, rate = pick(r, [10, 20]), t = 2;
    const amt = Math.round(p * Math.pow(1 + rate / 100, t));
    return numeric(`Find the compound interest on Rs ${p} at ${rate}% per annum for 2 years (Rs).`, amt - p, r, `A = P(1+r/100)^2 = ${amt}; CI = A - P.`);
  },
  speed: (r) => {
    const d = int(r, 60, 480), t = pick(r, [2, 3, 4, 5, 6]);
    return numeric(`A train covers ${d * t} km in ${t} hours. Find its speed (km/h).`, d, r, `Speed = distance / time.`);
  },
  work: (r) => {
    const a = int(r, 4, 12), b = int(r, 4, 12);
    const both = Math.round(((a * b) / (a + b)) * 100) / 100;
    return numeric(`A can finish a job in ${a} days and B in ${b} days. Working together, how many days do they take?`, both, r, `Together = ab/(a+b) = ${a}x${b}/${a + b}.`);
  },
  permutation: (r) => {
    const n = int(r, 5, 8), k = int(r, 2, 3);
    let v = 1;
    for (let i = 0; i < k; i++) v *= n - i;
    return numeric(`In how many ways can ${k} people be seated on ${n} distinct chairs?`, v, r, `P(${n},${k}) = ${n}!/(${n}-${k})!.`);
  },
  combination: (r) => {
    const n = int(r, 5, 9), k = int(r, 2, 3);
    let num = 1, den = 1;
    for (let i = 0; i < k; i++) { num *= n - i; den *= i + 1; }
    return numeric(`In how many ways can a committee of ${k} be chosen from ${n} people?`, num / den, r, `C(${n},${k}) = ${num}/${den}.`);
  },
  probability: (r) => {
    const red = int(r, 2, 6), blue = int(r, 2, 6);
    const g = (a, b) => (b ? g(b, a % b) : a);
    const d = g(red, red + blue);
    return choiceQ(
      `A bag has ${red} red and ${blue} blue balls. What is the probability of drawing a red ball?`,
      `${red / d}/${(red + blue) / d}`,
      [`${blue}/${red + blue}`, `${red}/${blue}`, `${red + blue}/${red}`],
      r,
      `P(red) = red / total = ${red}/${red + blue}.`,
    );
  },
  quadratic: (r) => {
    const p = int(r, 1, 9), q = int(r, 1, 9);
    return numeric(`For the equation x^2 - ${p + q}x + ${p * q} = 0, what is the sum of the roots?`, p + q, r, `Sum of roots = -b/a = ${p + q}.`);
  },
  progression: (r) => {
    const a = int(r, 2, 12), d = int(r, 2, 9), n = int(r, 6, 15);
    return numeric(`Find the ${n}th term of the AP with first term ${a} and common difference ${d}.`, a + (n - 1) * d, r, `a_n = a + (n-1)d.`);
  },
  matrix: (r) => {
    const a = int(r, 1, 9), b = int(r, 1, 9), c = int(r, 1, 9), d = int(r, 1, 9);
    return numeric(`Find the determinant of the matrix [[${a}, ${b}], [${c}, ${d}]].`, a * d - b * c, r, `det = ad - bc = ${a}x${d} - ${b}x${c}.`);
  },
  statistics: (r) => {
    const nums = Array.from({ length: 5 }, () => int(r, 5, 60)).sort((x, y) => x - y);
    return numeric(`Find the median of ${nums.join(", ")}.`, nums[2], r, `The middle value of the sorted list is the median.`);
  },
  trigonometry: (r) => {
    const opts = [
      ["What is the value of sin(30°)?", "1/2", ["1", "sqrt(3)/2", "0"], "sin 30° = 1/2."],
      ["What is the value of cos(60°)?", "1/2", ["sqrt(3)/2", "1", "0"], "cos 60° = 1/2."],
      ["What is the value of tan(45°)?", "1", ["0", "1/2", "sqrt(3)"], "tan 45° = 1."],
      ["Simplify sin^2(x) + cos^2(x).", "1", ["0", "2", "sin(2x)"], "Pythagorean identity."],
    ];
    const [q, c, w, e] = pick(r, opts);
    return choiceQ(q, c, w, r, e);
  },
  geometry: (r) => {
    const s = int(r, 3, 20);
    return numeric(`Find the area of a square of side ${s} cm (sq cm).`, s * s, r, `Area = side^2.`);
  },
  calculus: (r) => {
    const n = int(r, 2, 6), k = int(r, 2, 9);
    return choiceQ(
      `Differentiate ${k}x^${n} with respect to x.`,
      `${k * n}x^${n - 1}`,
      [`${k}x^${n - 1}`, `${k * n}x^${n}`, `${k * n * (n - 1)}x^${n - 2}`],
      r,
      `d/dx (kx^n) = knx^(n-1).`,
    );
  },
  set: (r) => {
    const a = int(r, 10, 40), b = int(r, 10, 40), both = int(r, 2, 9);
    return numeric(`In a class, ${a} students like maths, ${b} like science and ${both} like both. How many like at least one subject?`, a + b - both, r, `|A ∪ B| = |A| + |B| - |A ∩ B|.`);
  },
  number: (r) => {
    const a = int(r, 8, 40), b = int(r, 8, 40);
    const g = (x, y) => (y ? g(y, x % y) : x);
    return numeric(`Find the HCF of ${a} and ${b}.`, g(a, b), r, `Use the Euclidean algorithm.`);
  },
};

function mathGenFor(topic) {
  const t = topic.toLowerCase();
  const map = [
    ["percent", "percentage"], ["profit", "profit-loss"], ["ratio", "ratio"], ["proportion", "ratio"],
    ["average", "average"], ["mean", "statistics"], ["median", "statistics"], ["mode", "statistics"],
    ["deviation", "statistics"], ["simple interest", "interest"], ["compound", "compound"],
    ["interest", "interest"], ["time", "speed"], ["speed", "speed"], ["distance", "speed"],
    ["train", "speed"], ["boat", "speed"], ["work", "work"], ["pipe", "work"],
    ["permutation", "permutation"], ["combination", "combination"], ["probability", "probability"],
    ["quadratic", "quadratic"], ["equation", "quadratic"], ["progression", "progression"],
    ["sequence", "progression"], ["series", "progression"], ["matrix", "matrix"], ["determinant", "matrix"],
    ["trigo", "trigonometry"], ["geometry", "geometry"], ["mensuration", "geometry"], ["area", "geometry"],
    ["calculus", "calculus"], ["derivat", "calculus"], ["integra", "calculus"], ["limit", "calculus"],
    ["function", "calculus"], ["set", "set"], ["venn", "set"], ["logarithm", "number"],
    ["number", "number"], ["hcf", "number"], ["lcm", "number"], ["statistic", "statistics"],
  ];
  for (const [k, g] of map) if (t.includes(k)) return mathGens[g];
  return mathGens.number;
}

/* ---------------- Reasoning generators ---------------- */
const reasoningGens = [
  (r) => {
    const a = int(r, 2, 9), d = int(r, 2, 9);
    const seq = [a, a + d, a + 2 * d, a + 3 * d];
    return numeric(`Find the next term: ${seq.join(", ")}, ?`, a + 4 * d, r, `Arithmetic series with common difference ${d}.`);
  },
  (r) => {
    const a = int(r, 2, 5), q = int(r, 2, 4);
    const seq = [a, a * q, a * q * q, a * q ** 3];
    return numeric(`Find the next term: ${seq.join(", ")}, ?`, a * q ** 4, r, `Each term is multiplied by ${q}.`);
  },
  (r) => {
    const n = int(r, 3, 9);
    return numeric(`Find the next term in the series of squares: ${[n, n + 1, n + 2, n + 3].map((x) => x * x).join(", ")}, ?`, (n + 4) ** 2, r, `These are consecutive perfect squares.`);
  },
  (r) => {
    const shift = int(r, 1, 4);
    const word = pick(r, ["CAT", "DOG", "PEN", "BAT", "SUN", "MAP"]);
    const enc = [...word].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65)).join("");
    const wrong = [1, 2, 3].map((k) => [...word].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + shift + k) % 26) + 65)).join(""));
    return choiceQ(`In a code language each letter moves ${shift} place(s) forward. How is "${word}" written?`, enc, wrong, r, `Shift every letter ${shift} step(s) ahead in the alphabet.`);
  },
  (r) => {
    const a = int(r, 3, 12), b = int(r, 3, 12);
    return choiceQ(
      `A man walks ${a} km north, then ${b} km east. In which direction is he from the starting point?`,
      "North-East",
      ["South-West", "North-West", "South-East"],
      r,
      `North then east places him to the north-east of the start.`,
    );
  },
  (r) => choiceQ(
    pick(r, [
      "Pointing to a photo, Riya said, 'He is the son of my mother's only son.' How is he related to Riya?",
    ]),
    "Nephew",
    ["Son", "Brother", "Cousin"],
    r,
    "Her mother's only son is her brother, so his son is her nephew.",
  ),
  (r) => {
    const odd = pick(r, [
      ["Rose", ["Lily", "Jasmine", "Mango"], "Mango", "Mango is a fruit; the rest are flowers."],
      ["Square", ["Circle", "Triangle", "Cube"], "Cube", "Cube is 3-D; the rest are 2-D shapes."],
      ["Copper", ["Iron", "Zinc", "Plastic"], "Plastic", "Plastic is not a metal."],
    ]);
    return choiceQ(`Find the odd one out: ${[odd[0], ...odd[1]].join(", ")}.`, odd[2], [odd[0], ...odd[1]].filter((x) => x !== odd[2]).slice(0, 3), r, odd[3]);
  },
  (r) => {
    const n = int(r, 2, 9);
    return numeric(`If A = ${n}, B = ${n + 1}, C = ${n + 2} and so on, what is the value of A + C?`, 2 * n + 2, r, `A = ${n}, C = ${n + 2}.`);
  },
  (r) => choiceQ(
    "Statement: All pens are books. All books are red. Conclusion: All pens are red. Is the conclusion valid?",
    "Yes, it follows",
    ["No, it does not follow", "Data insufficient", "Only partly true"],
    r,
    "Chained universal statements make the conclusion valid.",
  ),
  (r) => {
    const total = int(r, 20, 60), a = int(r, 5, 15);
    return numeric(`In a row of ${total} students, Rahul is ${a}th from the left. What is his position from the right?`, total - a + 1, r, `Position from right = total - position from left + 1.`);
  },
];

/* ---------------- English pools ---------------- */
const englishPool = [
  ["Choose the synonym of 'Abundant'.", "Plentiful", ["Scarce", "Tiny", "Rigid"], "Abundant means existing in large quantities."],
  ["Choose the synonym of 'Candid'.", "Frank", ["Secretive", "Rude", "Lazy"], "Candid means honest and straightforward."],
  ["Choose the synonym of 'Diligent'.", "Hardworking", ["Careless", "Rapid", "Silent"], "Diligent describes careful, persistent effort."],
  ["Choose the antonym of 'Benevolent'.", "Cruel", ["Kind", "Generous", "Gentle"], "Benevolent means kind; its opposite is cruel."],
  ["Choose the antonym of 'Transparent'.", "Opaque", ["Clear", "Visible", "Bright"], "Opaque means not able to be seen through."],
  ["Choose the antonym of 'Expand'.", "Contract", ["Enlarge", "Inflate", "Widen"], "Contract is the opposite of expand."],
  ["What does the idiom 'to bite the bullet' mean?", "To endure a painful situation bravely", ["To eat quickly", "To lose one's temper", "To speak rudely"], "It means to face something unpleasant with courage."],
  ["What does the idiom 'once in a blue moon' mean?", "Very rarely", ["Every day", "Immediately", "Twice a week"], "It refers to something happening very rarely."],
  ["Fill in the blank: She has been working here ____ 2019.", "since", ["for", "from", "by"], "'Since' is used with a point in time."],
  ["Fill in the blank: Neither the manager nor the workers ____ present.", "were", ["was", "is", "has"], "With 'neither...nor', the verb agrees with the nearer subject."],
  ["Choose the correctly spelt word.", "Accommodation", ["Acommodation", "Accomodation", "Acomodation"], "Accommodation has double c and double m."],
  ["Choose the correctly spelt word.", "Maintenance", ["Maintainance", "Maintenence", "Maintanance"], "The correct spelling is maintenance."],
  ["Identify the part of speech of 'quickly' in 'He ran quickly'.", "Adverb", ["Adjective", "Noun", "Verb"], "It modifies the verb 'ran'."],
  ["Choose the correct passive voice: 'They built the bridge.'", "The bridge was built by them.", ["The bridge is built by them.", "The bridge has built.", "The bridge were built by them."], "Simple past passive uses 'was/were + past participle'."],
  ["One word for 'a person who loves books'.", "Bibliophile", ["Philatelist", "Bibliography", "Biographer"], "A bibliophile collects or loves books."],
  ["One word for 'that which cannot be corrected'.", "Incorrigible", ["Incurable", "Illegible", "Invincible"], "Incorrigible means beyond correction."],
  ["Choose the correct preposition: He is good ____ mathematics.", "at", ["in", "on", "with"], "'Good at' is the standard collocation."],
  ["Choose the correct article: She is ____ honest woman.", "an", ["a", "the", "no article"], "'Honest' begins with a vowel sound."],
  ["Find the error: 'One of the boys are missing.'", "are should be is", ["One should be Ones", "boys should be boy", "No error"], "'One of the boys' takes a singular verb."],
  ["Choose the correct sentence.", "He has been living here for five years.", ["He is living here since five years.", "He live here for five years.", "He has live here five years."], "Present perfect continuous with 'for' + duration."],
  ["The word 'ubiquitous' most nearly means:", "Present everywhere", ["Extremely rare", "Very old", "Highly secret"], "Ubiquitous means found everywhere."],
  ["Choose the synonym of 'Meticulous'.", "Very careful", ["Sloppy", "Cheerful", "Hostile"], "Meticulous means showing great attention to detail."],
  ["Choose the antonym of 'Optimistic'.", "Pessimistic", ["Hopeful", "Positive", "Confident"], "Pessimistic is the opposite of optimistic."],
  ["What does 'to let the cat out of the bag' mean?", "To reveal a secret", ["To free an animal", "To make a mistake", "To start a fight"], "It means to disclose a secret unintentionally."],
  ["Fill in the blank: If I ____ rich, I would travel the world.", "were", ["am", "was being", "will be"], "Second conditional uses 'were' for all persons."],
  ["Choose the correct plural of 'criterion'.", "criteria", ["criterions", "criterias", "criterion"], "Criterion is Greek in origin; plural is criteria."],
  ["Identify the tense: 'She had finished her work before he arrived.'", "Past perfect", ["Simple past", "Present perfect", "Past continuous"], "'Had + past participle' is past perfect."],
  ["Choose the word closest in meaning to 'Alleviate'.", "Relieve", ["Worsen", "Ignore", "Delay"], "Alleviate means to make suffering less severe."],
  ["Choose the correct indirect speech: He said, 'I am tired.'", "He said that he was tired.", ["He said that I am tired.", "He says he is tired.", "He said that he is tired."], "Reported speech shifts the tense back."],
  ["A speech made without preparation is called:", "Extempore", ["Elegy", "Eulogy", "Epilogue"], "Extempore means spoken without preparation."],
];

/* ---------------- Computer Concepts pool ---------------- */
const computerPool = [
  ["Which of the following is a volatile memory?", "RAM", ["ROM", "Hard disk", "SSD"], "RAM loses its contents when power is off."],
  ["1 kilobyte equals how many bytes?", "1024", ["1000", "512", "2048"], "1 KB = 2^10 = 1024 bytes."],
  ["Which number system does a computer use internally?", "Binary", ["Decimal", "Octal", "Hexadecimal"], "Digital computers work with 0s and 1s."],
  ["The brain of the computer is:", "CPU", ["RAM", "Monitor", "Hard disk"], "The CPU executes instructions."],
  ["Which of these is system software?", "Operating system", ["MS Word", "Photoshop", "Chrome"], "An OS manages hardware and resources."],
  ["What does HTTP stand for?", "HyperText Transfer Protocol", ["High Transfer Text Protocol", "Hyperlink Transfer Process", "Host Transfer Protocol"], "HTTP is the web's transfer protocol."],
  ["Which device is both input and output?", "Touch screen", ["Keyboard", "Printer", "Mouse"], "A touch screen accepts input and shows output."],
  ["Binary 1010 equals which decimal number?", "10", ["8", "12", "16"], "8 + 0 + 2 + 0 = 10."],
  ["Which key combination copies selected text?", "Ctrl + C", ["Ctrl + V", "Ctrl + X", "Ctrl + Z"], "Ctrl+C copies to the clipboard."],
  ["What is the full form of LAN?", "Local Area Network", ["Large Area Network", "Logical Access Node", "Linked Array Network"], "LAN covers a small geographic area."],
  ["Which protocol is used to send email?", "SMTP", ["FTP", "HTTP", "SNMP"], "SMTP handles outgoing mail."],
  ["Which of these is not an operating system?", "Oracle", ["Linux", "Windows", "macOS"], "Oracle is a database system."],
  ["Cache memory is located:", "Between CPU and RAM", ["Inside the hard disk", "In the monitor", "On the network card"], "Cache speeds up CPU access to data."],
  ["The smallest unit of data in a computer is:", "Bit", ["Byte", "Nibble", "Word"], "A bit holds a single 0 or 1."],
  ["Which language is directly understood by a computer?", "Machine language", ["C", "Python", "Java"], "Machine code needs no translation."],
  ["A compiler converts:", "Source code into machine code", ["Machine code into source code", "Binary into decimal", "Data into information"], "Compilers translate whole programs."],
  ["Which of these is a database management system?", "MySQL", ["Excel", "Notepad", "Chrome"], "MySQL is a relational DBMS."],
  ["What does GUI stand for?", "Graphical User Interface", ["General Utility Interface", "Graphic Unit Input", "Guided User Instruction"], "A GUI uses windows, icons and menus."],
  ["Which storage device is optical?", "DVD", ["SSD", "RAM", "Hard disk"], "DVDs are read with a laser."],
  ["The process of starting a computer is called:", "Booting", ["Loading", "Formatting", "Compiling"], "Booting loads the operating system."],
  ["Which of the following is a search engine?", "Google", ["Windows", "Excel", "Firefox"], "Google indexes and searches the web."],
  ["IP address version currently offering 128-bit addresses is:", "IPv6", ["IPv4", "IPv2", "IPv8"], "IPv6 uses 128-bit addresses."],
  ["What does CPU stand for?", "Central Processing Unit", ["Computer Personal Unit", "Central Program Utility", "Control Panel Unit"], "CPU is the central processing unit."],
  ["Which memory is non-volatile?", "ROM", ["RAM", "Cache", "Register"], "ROM retains data without power."],
  ["A byte consists of how many bits?", "8", ["4", "16", "32"], "One byte = 8 bits."],
  ["Which of these is an example of cloud storage?", "Google Drive", ["Pen drive", "Hard disk", "DVD"], "Google Drive stores files on remote servers."],
  ["Firewall is used for:", "Network security", ["Cooling the CPU", "Increasing RAM", "Printing"], "A firewall filters network traffic."],
  ["Which topology connects every node to a central hub?", "Star", ["Ring", "Bus", "Mesh"], "In star topology all nodes join a hub."],
  ["What is the extension of a Python file?", ".py", [".java", ".pyt", ".pl"], "Python source files use .py."],
  ["The full form of URL is:", "Uniform Resource Locator", ["Universal Reference Link", "Unified Routing Locator", "User Registered Link"], "A URL addresses a web resource."],
];

const DIFF = [
  ...Array(7).fill("easy"),
  ...Array(9).fill("medium"),
  ...Array(4).fill("hard"),
];

function buildTopic(item) {
  const id = `${slug(item.subject)}__${slug(item.topic)}`;
  const r = rng(id);
  const questions = [];
  const seen = new Set();
  const pool = item.subject.startsWith("English") ? englishPool : item.subject.startsWith("Computer") ? computerPool : null;

  for (let i = 0; questions.length < 20 && i < 400; i++) {
    let q;
    if (pool) {
      const [text, correct, wrongs, exp] = pool[(i + Math.floor(r() * 3)) % pool.length];
      q = choiceQ(text, correct, wrongs, r, exp);
    } else if (item.subject.startsWith("Mathematics")) {
      q = mathGenFor(item.topic)(r);
    } else {
      q = reasoningGens[i % reasoningGens.length](r);
    }
    if (seen.has(q.q)) continue;
    seen.add(q.q);
    q.difficulty = DIFF[questions.length];
    questions.push(q);
  }
  // Pad if a pool ran out of unique items
  while (questions.length < 20) {
    const base = questions[questions.length % Math.max(1, seen.size)] ?? questions[0];
    questions.push({ ...base, difficulty: DIFF[questions.length] });
  }
  return { ...item, id, questions };
}

const banks = syllabus.map(buildTopic);
fs.mkdirSync("public/data", { recursive: true });
fs.writeFileSync("public/data/questions.json", JSON.stringify(banks));
console.log(`topics: ${banks.length}, questions: ${banks.reduce((a, b) => a + b.questions.length, 0)}`);
