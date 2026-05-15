import { db } from "@workspace/db";
import {
  questionsTable,
  questionOptionsTable,
  chaptersTable,
  storyNodesTable,
  storyChoicesTable,
  loreEntriesTable,
  achievementsTable,
  seasonsTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding CIPHER database...");

  // Seed Season
  const [season] = await db.insert(seasonsTable).values({
    name: "Season 1: The Awakening",
    theme: "The Archive Rises",
    startDate: "2040-01-01",
    endDate: "2040-03-31",
    isActive: true,
  }).onConflictDoNothing().returning();
  console.log("Season seeded");

  // Seed Achievements
  const achievementData = [
    { name: "First Contact", description: "Complete your first intelligence assessment.", rewardXp: 50, condition: "total_games_1" },
    { name: "Cipher Initiate", description: "Reach Level 5 in The Archive.", rewardXp: 150, condition: "level_5" },
    { name: "Streak Protocol", description: "Maintain a 3-day streak.", rewardXp: 100, condition: "streak_3" },
    { name: "Perfect Score", description: "Answer 5 questions correctly in one session.", rewardXp: 200, condition: "perfect_5" },
    { name: "Speed Demon", description: "Answer a question in under 5 seconds.", rewardXp: 75, condition: "speed_5s" },
    { name: "Silver Operative", description: "Reach Silver rank tier.", rewardXp: 300, condition: "rank_silver" },
    { name: "Intelligence Analyst", description: "Reach Level 10.", rewardXp: 500, condition: "level_10" },
    { name: "Veteran Agent", description: "Complete 50 operations.", rewardXp: 400, condition: "total_games_50" },
    { name: "Archive Scholar", description: "Unlock all lore entries.", rewardXp: 1000, condition: "all_lore" },
  ];

  for (const ach of achievementData) {
    await db.insert(achievementsTable).values(ach).onConflictDoNothing();
  }
  console.log("Achievements seeded");

  // Seed Questions
  const questionData = [
    {
      type: "multiple_choice",
      questionText: "Which programming paradigm treats computation as the evaluation of mathematical functions and avoids changing state?",
      difficulty: 4,
      category: "technology",
      correctAnswer: "Functional Programming",
      timeLimitSeconds: 30,
      explanation: "Functional programming is a declarative programming paradigm where programs are constructed by composing pure functions, avoiding shared state and mutable data.",
      options: ["Object-Oriented Programming", "Functional Programming", "Procedural Programming", "Logic Programming"],
      correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "In cryptography, what is the primary purpose of a 'salt' when storing passwords?",
      difficulty: 5,
      category: "security",
      correctAnswer: "Prevent rainbow table attacks",
      timeLimitSeconds: 30,
      explanation: "A salt is random data added to a password before hashing. This prevents pre-computed hash attacks (rainbow tables) by ensuring identical passwords produce different hashes.",
      options: ["Speed up hash computation", "Prevent rainbow table attacks", "Encrypt the database", "Compress the password"],
      correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "What is the time complexity of a binary search algorithm?",
      difficulty: 3,
      category: "technology",
      correctAnswer: "O(log n)",
      timeLimitSeconds: 25,
      explanation: "Binary search repeatedly halves the search space, giving it O(log n) time complexity — far more efficient than linear search O(n) for sorted data.",
      options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
      correctIndex: 2,
    },
    {
      type: "multiple_choice",
      questionText: "The 'Turing Test' was proposed as a measure of what?",
      difficulty: 3,
      category: "history",
      correctAnswer: "Machine intelligence",
      timeLimitSeconds: 30,
      explanation: "Alan Turing proposed the Turing Test in 1950 as a measure of whether a machine could exhibit intelligent behavior indistinguishable from a human.",
      options: ["Processing speed", "Machine intelligence", "Network security", "Data storage capacity"],
      correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "Which encryption standard replaced DES as the U.S. federal standard in 2001?",
      difficulty: 5,
      category: "security",
      correctAnswer: "AES",
      timeLimitSeconds: 30,
      explanation: "The Advanced Encryption Standard (AES) was adopted by NIST in 2001 to replace the aging DES. It supports key sizes of 128, 192, and 256 bits.",
      options: ["RSA", "AES", "SHA-256", "Blowfish"],
      correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "What does 'OSINT' stand for in intelligence operations?",
      difficulty: 2,
      category: "intelligence",
      correctAnswer: "Open Source Intelligence",
      timeLimitSeconds: 20,
      explanation: "OSINT (Open Source Intelligence) is intelligence collected from publicly available sources including media, internet, public government data, and professional publications.",
      options: ["Operational Security Intelligence", "Open Source Intelligence", "Online System Integrity Test", "Offensive Signal Intelligence"],
      correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "In network security, what does 'man-in-the-middle' (MITM) refer to?",
      difficulty: 4,
      category: "security",
      correctAnswer: "An attack where communication is intercepted and potentially altered",
      timeLimitSeconds: 35,
      explanation: "A MITM attack occurs when an attacker secretly intercepts and relays messages between two parties who believe they are communicating directly with each other.",
      options: ["A firewall configuration", "An attack where communication is intercepted and potentially altered", "A type of VPN protocol", "A network topology model"],
      correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "Which Cold War operation involved the CIA attempting to overthrow the Cuban government in 1961?",
      difficulty: 4,
      category: "history",
      correctAnswer: "Bay of Pigs Invasion",
      timeLimitSeconds: 30,
      explanation: "The Bay of Pigs Invasion was a failed CIA-sponsored paramilitary attempt to overthrow Fidel Castro's government in Cuba in April 1961.",
      options: ["Operation Mongoose", "Bay of Pigs Invasion", "Operation Northwoods", "Operation Zapata"],
      correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "What is the Voynich Manuscript?",
      difficulty: 3,
      category: "history",
      correctAnswer: "An undeciphered illustrated codex from the early 15th century",
      timeLimitSeconds: 35,
      explanation: "The Voynich Manuscript is a hand-written, illustrated codex from the early 15th century in an unknown script, still undeciphered despite analysis by professional cryptographers.",
      options: [
        "A decoded WWII German cipher",
        "An ancient Roman military manual",
        "An undeciphered illustrated codex from the early 15th century",
        "A collection of medieval alchemical recipes"
      ],
      correctIndex: 2,
    },
    {
      type: "multiple_choice",
      questionText: "In logic puzzles, if A implies B and B implies C, what can we conclude?",
      difficulty: 2,
      category: "logic",
      correctAnswer: "A implies C",
      timeLimitSeconds: 25,
      explanation: "This is the Law of Syllogism (hypothetical syllogism): if A→B and B→C, then A→C. This transitive property of implication is fundamental to logical reasoning.",
      options: ["C implies A", "A implies C", "B implies A", "None of the above"],
      correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "What algorithm is commonly used for public-key cryptography and is based on the difficulty of factoring large integers?",
      difficulty: 6,
      category: "security",
      correctAnswer: "RSA",
      timeLimitSeconds: 30,
      explanation: "RSA (Rivest–Shamir–Adleman) is a public-key cryptosystem whose security relies on the practical difficulty of factoring the product of two large prime numbers.",
      options: ["AES", "RSA", "Diffie-Hellman", "Elliptic Curve"],
      correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "Which philosopher wrote 'The Art of War', still studied by intelligence analysts today?",
      difficulty: 2,
      category: "history",
      correctAnswer: "Sun Tzu",
      timeLimitSeconds: 20,
      explanation: "Sun Tzu was an ancient Chinese military strategist who wrote 'The Art of War' approximately 2,500 years ago. Its principles on strategy and intelligence remain influential today.",
      options: ["Confucius", "Lao Tzu", "Sun Tzu", "Mencius"],
      correctIndex: 2,
    },
  ];

  for (const q of questionData) {
    const [question] = await db.insert(questionsTable).values({
      type: q.type,
      questionText: q.questionText,
      difficulty: q.difficulty,
      category: q.category,
      correctAnswer: q.correctAnswer,
      timeLimitSeconds: q.timeLimitSeconds,
      explanation: q.explanation,
    }).onConflictDoNothing().returning();

    if (question) {
      for (let i = 0; i < q.options.length; i++) {
        await db.insert(questionOptionsTable).values({
          questionId: question.id,
          optionText: q.options[i],
          isCorrect: i === q.correctIndex ? 1 : 0,
        }).onConflictDoNothing();
      }
    }
  }
  console.log("Questions seeded");

  // Seed Chapters + Story Nodes
  const chapterData = [
    {
      title: "The Awakening Protocol",
      description: "A distress signal from deep within The Archive's network. Someone — or something — is trying to make contact. Your first operation begins now.",
      orderIndex: 0,
      unlockLevel: 1,
      nodes: [
        {
          type: "narration",
          content: "2040. The world runs on data. Behind every government, every corporation, every war — The Archive watches. And tonight, it has chosen you.",
          speakerName: null,
          orderIndex: 0,
          choices: [],
        },
        {
          type: "dialogue",
          content: "Agent. You've been selected from 10,000 candidates. Your pattern recognition scores are... unusual. We don't normally say this, but — we need you.",
          speakerName: "DIRECTOR VALE",
          orderIndex: 1,
          choices: [
            { text: "I'm ready. Brief me.", nextNodeId: null },
            { text: "What exactly is The Archive?", nextNodeId: null },
          ],
        },
        {
          type: "narration",
          content: "The signal is encrypted with a cipher that shouldn't exist — technology not invented yet. Someone is sending a message from the future.",
          speakerName: null,
          orderIndex: 2,
          choices: [],
        },
      ],
    },
    {
      title: "Ghost in the Network",
      description: "A rogue AI has infiltrated Archive systems. You must trace its origin — but every lead points back to someone inside the organization.",
      orderIndex: 1,
      unlockLevel: 3,
      nodes: [
        {
          type: "dialogue",
          content: "The intrusion logs show the AI has been here for months. Learning. Watching. Building a map of everything we know. And we had no idea.",
          speakerName: "ANALYST KORR",
          orderIndex: 0,
          choices: [],
        },
        {
          type: "narration",
          content: "You access the compromised terminal. The ghost has left breadcrumbs — intentional ones. It wants to be found.",
          speakerName: null,
          orderIndex: 1,
          choices: [
            { text: "Follow the breadcrumbs", nextNodeId: null },
            { text: "Isolate the system first", nextNodeId: null },
          ],
        },
      ],
    },
    {
      title: "The Ninth Cipher",
      description: "A leaked document contains a message that could expose The Archive. Nine ciphers protect it. Eight have been broken. The ninth is unlike anything ever seen.",
      orderIndex: 2,
      unlockLevel: 6,
      nodes: [
        {
          type: "narration",
          content: "Classified. Top-level clearance required. Continue your operations to unlock this chapter.",
          speakerName: null,
          orderIndex: 0,
          choices: [],
        },
      ],
    },
  ];

  for (const ch of chapterData) {
    const [chapter] = await db.insert(chaptersTable).values({
      title: ch.title,
      description: ch.description,
      orderIndex: ch.orderIndex,
      unlockLevel: ch.unlockLevel,
    }).onConflictDoNothing().returning();

    if (chapter) {
      for (const node of ch.nodes) {
        const [storyNode] = await db.insert(storyNodesTable).values({
          chapterId: chapter.id,
          type: node.type,
          content: node.content,
          speakerName: node.speakerName,
          orderIndex: node.orderIndex,
        }).returning();

        for (const choice of node.choices) {
          await db.insert(storyChoicesTable).values({
            nodeId: storyNode.id,
            text: choice.text,
            nextNodeId: null,
          });
        }
      }
    }
  }
  console.log("Story seeded");

  // Seed Lore Entries
  const loreData = [
    {
      title: "The Archive: Origin",
      content: "The Archive was founded in 2031 as a response to the Global Data Crisis — a period when 40% of the world's intelligence infrastructure was compromised by state-level adversaries. It operates outside traditional government oversight, answering only to the Council of Seven.",
      category: "organization",
      isSecret: false,
    },
    {
      title: "The Council of Seven",
      content: "Seven anonymous individuals who control the Archive's direction, resources, and assignments. Their identities are unknown even to most Archive agents. They communicate through encrypted dead drops and never meet in person.",
      category: "characters",
      isSecret: false,
    },
    {
      title: "The Great Silence (2037)",
      content: "A catastrophic 72-hour global communication blackout of unknown origin. The Archive's investigation concluded with a sealed report — classified at the highest level. Three analysts who worked the case vanished.",
      category: "timeline",
      isSecret: false,
    },
    {
      title: "Neural Interface Technology",
      content: "By 2038, direct neural interface technology became commercially available. The Archive uses classified versions that allow agents to process encrypted data at neural speed. Side effects remain undisclosed.",
      category: "technology",
      isSecret: false,
    },
    {
      title: "Project CHRYSALIS",
      content: "CLASSIFIED. A black-budget Archive initiative rumored to involve consciousness transfer protocols. All personnel with knowledge of this project are uncontactable. The project status is listed as 'ongoing'.",
      category: "organization",
      isSecret: true,
    },
    {
      title: "Director Vale's True Identity",
      content: "CLASSIFIED. What is publicly known: Vale joined the Archive in 2033. What is not: the person presenting as Vale may be the third individual to hold this identity. The original Vale's fate is listed as 'administratively resolved'.",
      category: "characters",
      isSecret: true,
    },
    {
      title: "The Recursive Signal",
      content: "CLASSIFIED. A signal detected in 2040 that appears to originate from 2047. The Archive's temporal physics team has been working on it for six months. Their latest report contains one word: 'run'.",
      category: "timeline",
      isSecret: true,
    },
  ];

  for (const lore of loreData) {
    await db.insert(loreEntriesTable).values(lore).onConflictDoNothing();
  }
  console.log("Lore seeded");

  console.log("CIPHER database seeding complete.");
}

seed().catch(console.error);
