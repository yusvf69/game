import { Router } from "express";
import { db } from "@workspace/db";
import {
  questionsTable,
  questionOptionsTable,
  userStatsTable,
  sessionsTable,
  usersTable,
  aiPlayerProfilesTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const bearerToken = token.replace("Bearer ", "");
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, bearerToken)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

const questionTemplates = [
  { category: "technology", templates: [
    { text: "In cybersecurity, what does the acronym 'XSS' stand for?", options: ["Cross-Site Scripting", "XML Source Syntax", "Xerox Secure System", "Cross-System Sync"], correct: 0, difficulty: 4, explanation: "Cross-Site Scripting (XSS) is a security vulnerability where attackers inject malicious scripts into web pages viewed by other users." },
    { text: "What is the primary function of a 'load balancer' in distributed systems?", options: ["Distribute network traffic across servers", "Encrypt data in transit", "Compress database files", "Monitor user activity"], correct: 0, difficulty: 3, explanation: "A load balancer distributes incoming network traffic across multiple servers to ensure no single server bears too much demand." },
    { text: "Which data structure uses LIFO (Last In, First Out) principle?", options: ["Stack", "Queue", "Tree", "Hash Table"], correct: 0, difficulty: 2, explanation: "A Stack follows the LIFO principle, where the last element added is the first one removed — like a stack of plates." },
    { text: "What is 'Docker' primarily used for?", options: ["Containerization", "Database management", "Load testing", "Network monitoring"], correct: 0, difficulty: 3, explanation: "Docker is a platform for developing, shipping, and running applications inside containers — lightweight, portable environments." },
    { text: "What does API stand for in software development?", options: ["Application Programming Interface", "Advanced Protocol Integration", "Automated Process Interface", "Application Processing Index"], correct: 0, difficulty: 1, explanation: "API (Application Programming Interface) defines a set of rules allowing different software applications to communicate with each other." },
    { text: "What type of attack involves flooding a network with traffic to disrupt service?", options: ["DDoS", "SQL Injection", "Man-in-the-Middle", "Phishing"], correct: 0, difficulty: 3, explanation: "A Distributed Denial of Service (DDoS) attack overwhelms a target server with traffic from multiple sources, making it unavailable." },
    { text: "Which protocol is used for secure web communication?", options: ["HTTPS", "FTP", "SMTP", "HTTP"], correct: 0, difficulty: 2, explanation: "HTTPS (Hypertext Transfer Protocol Secure) encrypts data between browser and server using TLS/SSL." },
    { text: "What is a 'honeypot' in cybersecurity?", options: ["A decoy system to attract attackers", "A password storage method", "A type of firewall", "An encryption algorithm"], correct: 0, difficulty: 5, explanation: "A honeypot is a decoy system designed to lure attackers, allowing security teams to study their methods and signatures." },
  ]},
  { category: "history", templates: [
    { text: "Which ancient civilization built Machu Picchu?", options: ["Inca", "Maya", "Aztec", "Olmec"], correct: 0, difficulty: 2, explanation: "Machu Picchu was built by the Inca Empire in the 15th century, high in the Andes Mountains of Peru." },
    { text: "The 'Enigma' machine was used during which war for encryption?", options: ["World War II", "World War I", "Cold War", "Korean War"], correct: 0, difficulty: 3, explanation: "The Enigma machine was used by Nazi Germany during World War II for encrypting military communications." },
    { text: "Who was the first person to break the Enigma code?", options: ["Alan Turing", "Gordon Welchman", "Marian Rejewski", "Dilly Knox"], correct: 2, difficulty: 5, explanation: "Polish mathematician Marian Rejewski first broke the Enigma code in 1932, years before Turing's work at Bletchley Park." },
    { text: "What year did the Berlin Wall fall?", options: ["1989", "1991", "1987", "1985"], correct: 0, difficulty: 2, explanation: "The Berlin Wall fell on November 9, 1989, marking a pivotal moment in the end of the Cold War." },
    { text: "Who led the Manhattan Project?", options: ["J. Robert Oppenheimer", "Albert Einstein", "Enrico Fermi", "Niels Bohr"], correct: 0, difficulty: 3, explanation: "J. Robert Oppenheimer was the scientific director of the Manhattan Project, which developed the first nuclear weapons." },
    { text: "Which spy organization operated during the Cold War as the KGB?", options: ["Soviet Union", "United States", "United Kingdom", "East Germany"], correct: 0, difficulty: 1, explanation: "The KGB was the main security agency for the Soviet Union, responsible for intelligence, counterintelligence, and secret police operations." },
  ]},
  { category: "intelligence", templates: [
    { text: "What is 'HUMINT' in intelligence gathering?", options: ["Human Intelligence", "Hidden Unit Intelligence", "High-Value Intelligence", "Holographic Intelligence"], correct: 0, difficulty: 3, explanation: "HUMINT (Human Intelligence) is intelligence gathered from human sources, including spies, informants, and diplomatic reporting." },
    { text: "What does SIGINT stand for?", options: ["Signals Intelligence", " Strategic Intelligence", "System Integration", "Secure Intelligence"], correct: 0, difficulty: 2, explanation: "SIGINT (Signals Intelligence) is intelligence derived from electronic signals and communications interception." },
    { text: "What is a 'dead drop' in espionage?", options: ["A concealed location for exchanging items", "A terminated agent", "A failed mission", "A secure communication channel"], correct: 0, difficulty: 3, explanation: "A dead drop is a secret location where materials can be left for another person to retrieve without meeting directly." },
    { text: "What is 'Mossad'?", options: ["Israeli intelligence agency", "Russian intelligence agency", "British intelligence agency", "Chinese intelligence agency"], correct: 0, difficulty: 2, explanation: "Mossad is the national intelligence agency of Israel, responsible for covert operations, intelligence gathering, and counterterrorism." },
    { text: "What is the main purpose of counterintelligence?", options: ["Prevent espionage against one's own organization", "Gather foreign intelligence", "Analyze open-source data", "Conduct cyber operations"], correct: 0, difficulty: 3, explanation: "Counterintelligence focuses on identifying and neutralizing threats from hostile intelligence services attempting to penetrate one's own organization." },
  ]},
  { category: "logic", templates: [
    { text: "If all A are B, and some B are C, what can we conclude?", options: ["Some A may be C", "All C are A", "No A is C", "All A are C"], correct: 0, difficulty: 4, explanation: "If all A are B, and some B are C, then some A may be C — but we cannot guarantee it without more information." },
    { text: "Which logical fallacy assumes that because something is popular, it must be true?", options: ["Bandwagon fallacy", "Straw man", "Ad hominem", "False dilemma"], correct: 0, difficulty: 3, explanation: "The bandwagon fallacy argues that because many people believe something, it must be true — which is logically invalid." },
    { text: "What is the 'Gambler's Fallacy'?", options: ["Believing past events affect future independent probabilities", "Thinking gambling is profitable", "Betting on unlikely outcomes", "Chasing losses"], correct: 0, difficulty: 4, explanation: "The Gambler's Fallacy is the mistaken belief that if something happens more frequently than normal during a period, it will happen less frequently in the future." },
    { text: "What is Occam's Razor?", options: ["The simplest explanation is most likely correct", "Multiple explanations are equally valid", "Complexity indicates truth", "Never trust simple answers"], correct: 0, difficulty: 2, explanation: "Occam's Razor is a problem-solving principle stating that the simplest explanation with the fewest assumptions is most likely the correct one." },
  ]},
  { category: "security", templates: [
    { text: "What is 'phishing'?", options: ["A social engineering attack to steal credentials", "A type of firewall", "A network scanning tool", "An encryption method"], correct: 0, difficulty: 2, explanation: "Phishing is a social engineering attack where attackers masquerade as legitimate entities to trick victims into revealing sensitive information." },
    { text: "What is 'zero-day' vulnerability?", options: ["A previously unknown security flaw", "A bug fixed in zero days", "A type of malware", "A security patch"], correct: 0, difficulty: 4, explanation: "A zero-day vulnerability is a security flaw unknown to the vendor, leaving zero days of protection before potential exploitation." },
    { text: "What does 2FA stand for?", options: ["Two-Factor Authentication", "Second File Access", "Tiered Firewall Architecture", "Terminal File Authorization"], correct: 0, difficulty: 1, explanation: "Two-Factor Authentication (2FA) adds an extra layer of security by requiring two different forms of verification." },
    { text: "What is 'ransomware'?", options: ["Malware that encrypts data and demands payment", "Software that monitors network traffic", "A type of antivirus program", "A network security protocol"], correct: 0, difficulty: 2, explanation: "Ransomware is malicious software that encrypts a victim's files and demands payment (ransom) for the decryption key." },
  ]},
];

const categoryOrder = ["technology", "history", "intelligence", "logic", "security"];

router.get("/ai/generate-questions", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  const limit = parseInt(req.query.limit as string) || 5;

  let difficulty = 3;
  if (user) {
    const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, user.id)).limit(1);
    const [profile] = await db.select().from(aiPlayerProfilesTable).where(eq(aiPlayerProfilesTable.userId, user.id)).limit(1);
    if (stats) {
      difficulty = Math.min(10, Math.max(1, Math.ceil(stats.level / 10)));
    }
    if (profile?.recommendedDifficulty) {
      difficulty = profile.recommendedDifficulty;
    }
  }

  const allQuestions: any[] = [];
  questionTemplates.forEach(cat => {
    cat.templates.forEach(t => {
      allQuestions.push({ ...t, category: cat.category });
    });
  });

  const filtered = allQuestions.filter(q => Math.abs(q.difficulty - difficulty) <= 2);
  const pool = filtered.length > 0 ? filtered : allQuestions;

  const shuffled = pool.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, limit);

  const result = selected.map((q, idx) => ({
    id: -(idx + 1),
    type: "text",
    questionText: q.text,
    difficulty: q.difficulty,
    category: q.category,
    mediaUrl: null,
    options: q.options.map((opt: string, oi: number) => ({ id: -(oi + 1), text: opt })),
    timeLimit: Math.max(15, 30 - difficulty),
  }));

  res.json(result);
});

router.post("/ai/generate-question", async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  const { category } = req.body;

  const cats = questionTemplates;
  const cat = category
    ? cats.find(c => c.category === category) || cats[Math.floor(Math.random() * cats.length)]
    : cats[Math.floor(Math.random() * cats.length)];
  const template = cat.templates[Math.floor(Math.random() * cat.templates.length)];

  const q = {
    id: -(Math.floor(Math.random() * 10000)),
    type: "text",
    questionText: template.text,
    difficulty: template.difficulty,
    category: cat.category,
    mediaUrl: null,
    options: template.options.map((opt: string, oi: number) => ({ id: -(oi + 1), text: opt })),
    correctAnswer: template.options[template.correct],
    explanation: template.explanation,
    timeLimit: Math.max(15, 30 - template.difficulty),
  };

  res.json(q);
});

export default router;
