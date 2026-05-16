import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  questionsTable,
  questionOptionsTable,
  chaptersTable,
  storyNodesTable,
  storyChoicesTable,
  loreEntriesTable,
  userLoreUnlocksTable,
  achievementsTable,
  seasonsTable,
  playerProgressTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding CIPHER database...");

  // Clear old story data to avoid duplicates from previous buggy seeds
  console.log("Clearing old story/lore data...");
  await db.delete(storyChoicesTable);
  await db.delete(storyNodesTable);
  await db.delete(chaptersTable);
  await db.delete(userLoreUnlocksTable);
  await db.delete(loreEntriesTable);

  // Reset player progress story fields
  await db.update(playerProgressTable).set({
    currentChapterId: 1,
    currentNodeId: 1,
    storyFlags: {},
    reputationScore: 0,
  });

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
      difficulty: 4, category: "technology", correctAnswer: "Functional Programming", timeLimitSeconds: 30,
      explanation: "Functional programming is a declarative programming paradigm where programs are constructed by composing pure functions, avoiding shared state and mutable data.",
      options: ["Object-Oriented Programming", "Functional Programming", "Procedural Programming", "Logic Programming"], correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "In cryptography, what is the primary purpose of a 'salt' when storing passwords?",
      difficulty: 5, category: "security", correctAnswer: "Prevent rainbow table attacks", timeLimitSeconds: 30,
      explanation: "A salt is random data added to a password before hashing. This prevents pre-computed hash attacks (rainbow tables) by ensuring identical passwords produce different hashes.",
      options: ["Speed up hash computation", "Prevent rainbow table attacks", "Encrypt the database", "Compress the password"], correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "What is the time complexity of a binary search algorithm?",
      difficulty: 3, category: "technology", correctAnswer: "O(log n)", timeLimitSeconds: 25,
      explanation: "Binary search repeatedly halves the search space, giving it O(log n) time complexity.",
      options: ["O(n)", "O(n²)", "O(log n)", "O(1)"], correctIndex: 2,
    },
    {
      type: "multiple_choice",
      questionText: "The 'Turing Test' was proposed as a measure of what?",
      difficulty: 3, category: "history", correctAnswer: "Machine intelligence", timeLimitSeconds: 30,
      explanation: "Alan Turing proposed the Turing Test in 1950 as a measure of whether a machine could exhibit intelligent behavior indistinguishable from a human.",
      options: ["Processing speed", "Machine intelligence", "Network security", "Data storage capacity"], correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "Which encryption standard replaced DES as the U.S. federal standard in 2001?",
      difficulty: 5, category: "security", correctAnswer: "AES", timeLimitSeconds: 30,
      explanation: "The Advanced Encryption Standard (AES) was adopted by NIST in 2001 to replace the aging DES.",
      options: ["RSA", "AES", "SHA-256", "Blowfish"], correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "What does 'OSINT' stand for in intelligence operations?",
      difficulty: 2, category: "intelligence", correctAnswer: "Open Source Intelligence", timeLimitSeconds: 20,
      explanation: "OSINT (Open Source Intelligence) is intelligence collected from publicly available sources.",
      options: ["Operational Security Intelligence", "Open Source Intelligence", "Online System Integrity Test", "Offensive Signal Intelligence"], correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "In network security, what does 'man-in-the-middle' (MITM) refer to?",
      difficulty: 4, category: "security", correctAnswer: "An attack where communication is intercepted and potentially altered", timeLimitSeconds: 35,
      explanation: "A MITM attack occurs when an attacker secretly intercepts and relays messages between two parties who believe they are communicating directly.",
      options: ["A firewall configuration", "An attack where communication is intercepted and potentially altered", "A type of VPN protocol", "A network topology model"], correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "Which Cold War operation involved the CIA attempting to overthrow the Cuban government in 1961?",
      difficulty: 4, category: "history", correctAnswer: "Bay of Pigs Invasion", timeLimitSeconds: 30,
      explanation: "The Bay of Pigs Invasion was a failed CIA-sponsored paramilitary attempt to overthrow Fidel Castro's government in Cuba in April 1961.",
      options: ["Operation Mongoose", "Bay of Pigs Invasion", "Operation Northwoods", "Operation Zapata"], correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "What is the Voynich Manuscript?",
      difficulty: 3, category: "history", correctAnswer: "An undeciphered illustrated codex from the early 15th century", timeLimitSeconds: 35,
      explanation: "The Voynich Manuscript is a hand-written, illustrated codex from the early 15th century in an unknown script, still undeciphered.",
      options: ["A decoded WWII German cipher", "An ancient Roman military manual", "An undeciphered illustrated codex from the early 15th century", "A collection of medieval alchemical recipes"], correctIndex: 2,
    },
    {
      type: "multiple_choice",
      questionText: "In logic puzzles, if A implies B and B implies C, what can we conclude?",
      difficulty: 2, category: "logic", correctAnswer: "A implies C", timeLimitSeconds: 25,
      explanation: "This is the Law of Syllogism: if A→B and B→C, then A→C.",
      options: ["C implies A", "A implies C", "B implies A", "None of the above"], correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "What algorithm is commonly used for public-key cryptography and is based on the difficulty of factoring large integers?",
      difficulty: 6, category: "security", correctAnswer: "RSA", timeLimitSeconds: 30,
      explanation: "RSA (Rivest–Shamir–Adleman) is a public-key cryptosystem whose security relies on the difficulty of factoring the product of two large prime numbers.",
      options: ["AES", "RSA", "Diffie-Hellman", "Elliptic Curve"], correctIndex: 1,
    },
    {
      type: "multiple_choice",
      questionText: "Which philosopher wrote 'The Art of War', still studied by intelligence analysts today?",
      difficulty: 2, category: "history", correctAnswer: "Sun Tzu", timeLimitSeconds: 20,
      explanation: "Sun Tzu was an ancient Chinese military strategist who wrote 'The Art of War' approximately 2,500 years ago.",
      options: ["Confucius", "Lao Tzu", "Sun Tzu", "Mencius"], correctIndex: 2,
    },
    // New question types
    {
      type: "signal_decode",
      questionText: ".-.. --- --- -.- / .- - / - .... . / ... .. --. -. .- .-..",
      difficulty: 4, category: "intelligence", correctAnswer: "Look at the signal", timeLimitSeconds: 45,
      explanation: "Morse code. .-.. = L, --- = O, --- = O, -.- = K, space = word break, .- = A, - = T, space, -.... = (wait, let me recalculate). The message decodes to: LOOK AT THE SIGNAL.",
      options: ["Follow the source", "Look at the signal", "Decode the message", "Signal intercepted"], correctIndex: 1,
    },
    {
      type: "pattern_analysis",
      questionText: "Identify the next number in the sequence: 2, 6, 18, 54, ?",
      difficulty: 3, category: "logic", correctAnswer: "162", timeLimitSeconds: 30,
      explanation: "Each term is multiplied by 3: 2×3=6, 6×3=18, 18×3=54, 54×3=162.",
      options: ["108", "162", "72", "216"], correctIndex: 1,
    },
    {
      type: "audio_intel",
      questionText: "You intercept an audio transmission. Based on the context, what type of communication is this?",
      difficulty: 5, category: "intelligence", correctAnswer: "Encrypted voice relay", timeLimitSeconds: 40,
      explanation: "The signal characteristics match an encrypted voice relay — frequency hopping pattern, short burst duration, and specific modulation consistent with tactical comms encryption.",
      options: ["Standard radio broadcast", "Encrypted voice relay", "Satellite downlink", "Underwater sonar ping"], correctIndex: 1,
      mediaUrl: "https://example.com/audio-intel-sample.mp3",
    },
    {
      type: "visual_recognition",
      questionText: "Identify the encryption device shown in the image.",
      difficulty: 4, category: "technology", correctAnswer: "Enigma Machine", timeLimitSeconds: 35,
      explanation: "The device is a German Enigma machine, a rotor-based cipher device used extensively by Nazi Germany during World War II.",
      options: ["Enigma Machine", "Lorenz Cipher", "Jefferson Disk", "SIGABA"], correctIndex: 0,
      mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Enigma_%28crop%29.jpg/300px-Enigma_%28crop%29.jpg",
    },
    {
      type: "threat_assessment",
      questionText: "A previously unknown signal has been detected emanating from within The Archive's own network infrastructure. The signal is periodic, appears to be AI-generated, and is routing through your own terminal's diagnostic channels. No other agent reports similar activity.",
      difficulty: 6, category: "security", correctAnswer: "critical", timeLimitSeconds: 40,
      explanation: "A signal from within the network, AI-generated, and specifically targeting your terminal represents an active, verified threat with potential for immediate system compromise — critical level response is warranted.",
      options: ["Low", "Medium", "High", "Critical"], correctIndex: 3,
    },
    {
      type: "logic_grid",
      questionText: "Three Archive agents — Alex, Blake, and Casey — each specialize in a different field (cryptography, forensics, surveillance).\n\nClues:\n1. Alex does not work in surveillance.\n2. Blake works in forensics.\n3. Casey does not work in cryptography.\n\nWho works in surveillance?",
      difficulty: 4, category: "logic", correctAnswer: "Casey", timeLimitSeconds: 50,
      explanation: "From clue 2: Blake = Forensics. From clue 1: Alex ≠ Surveillance, so Alex = Cryptography. From clue 3: Casey ≠ Cryptography, so Casey = Surveillance.",
      options: ["Alex", "Blake", "Casey", "Cannot be determined"], correctIndex: 2,
    },
    {
      type: "multi_step",
      questionText: "PHASE 1: You discover a locked terminal. The password hint reads: 'The first prime number greater than 10.'\n\nPHASE 2: Enter the terminal. Inside is a file labeled with the atomic number of the element used in the first nuclear bomb.\n\nWhat is the file label?",
      difficulty: 5, category: "technology", correctAnswer: "94", timeLimitSeconds: 60,
      explanation: "Step 1: First prime > 10 is 11. Step 2: The element used in the first nuclear bomb was Plutonium (Pu), atomic number 94. The file is labeled 94.",
      options: ["11", "92", "94", "Pu"], correctIndex: 2,
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

  // ================================================================
  // Seed Chapters + Story Nodes with PROPER branching (nextNodeId)
  // ================================================================
  console.log("Seeding story chapters with branching...");

  // --- Chapter 1: The Awakening Protocol ---
  const [ch1] = await db.insert(chaptersTable).values({
    title: "The Awakening Protocol",
    description: "A distress signal from deep within The Archive's network. Someone — or something — is trying to make contact. Your first operation begins now.",
    orderIndex: 0, unlockLevel: 1,
  }).returning();

  // Node 0: narration intro
  const [ch1n0] = await db.insert(storyNodesTable).values({
    chapterId: ch1.id, type: "dialogue", content: "2040. The world runs on data. Behind every government, every corporation, every war — The Archive watches. And tonight, it has chosen you.", speakerName: null, orderIndex: 0,
  }).returning();

  // Node 1: Vale speaks
  const [ch1n1] = await db.insert(storyNodesTable).values({
    chapterId: ch1.id, type: "dialogue", content: "Agent. You've been selected from 10,000 candidates. Your pattern recognition scores are... unusual. We don't normally say this, but — we need you.", speakerName: "DIRECTOR VALE", orderIndex: 1,
  }).returning();

  // Node 2: briefing (convergence point)
  const [ch1n2] = await db.insert(storyNodesTable).values({
    chapterId: ch1.id, type: "dialogue", content: "The signal is encrypted with a cipher that shouldn't exist — technology not invented yet. Someone is sending a message from the future. Your task: decode it before our rivals do.", speakerName: "DIRECTOR VALE", orderIndex: 2,
  }).returning();

  // Node 3: Vale explains The Archive (branch)
  const [ch1n3] = await db.insert(storyNodesTable).values({
    chapterId: ch1.id, type: "dialogue", content: "The Archive is the last line between order and chaos. We don't answer to governments — we answer to the truth. Every signal, every secret, every shadow — we are the ones who understand.", speakerName: "DIRECTOR VALE", orderIndex: 3,
  }).returning();

  // Choices for Node 1
  await db.insert(storyChoicesTable).values([
    { nodeId: ch1n1.id, text: "I'm ready. Brief me.", nextNodeId: ch1n2.id, consequenceFlag: "trust_vale" },
    { nodeId: ch1n1.id, text: "What exactly is The Archive?", nextNodeId: ch1n3.id, consequenceFlag: "suspicious_vale" },
  ]);

  // Choice for Node 3 (only path back to briefing)
  await db.insert(storyChoicesTable).values([
    { nodeId: ch1n3.id, text: "I understand. Proceed with the briefing.", nextNodeId: ch1n2.id, consequenceFlag: "cooperative" },
  ]);

  // --- Chapter 2: Ghost in the Network ---
  const [ch2] = await db.insert(chaptersTable).values({
    title: "Ghost in the Network",
    description: "A rogue AI has infiltrated Archive systems. You must trace its origin — but every lead points back to someone inside the organization.",
    orderIndex: 1, unlockLevel: 3,
  }).returning();

  // Node 0: Korr speaks
  const [ch2n0] = await db.insert(storyNodesTable).values({
    chapterId: ch2.id, type: "dialogue", content: "The intrusion logs show the AI has been here for months. Learning. Watching. Building a map of everything we know. And we had no idea. This is a catastrophic failure of our security protocols.", speakerName: "ANALYST KORR", orderIndex: 0,
  }).returning();

  // Node 1: breadcrumbs
  const [ch2n1] = await db.insert(storyNodesTable).values({
    chapterId: ch2.id, type: "narration", content: "You access the compromised terminal. The ghost has left breadcrumbs — intentional ones. It wants to be found. But following blindly could be a trap.", speakerName: null, orderIndex: 1,
  }).returning();

  // Node 2: follow breadcrumbs (chapter end)
  const [ch2n2] = await db.insert(storyNodesTable).values({
    chapterId: ch2.id, type: "narration", content: "You follow the digital trail through seven layers of deception. The breadcrumbs lead to an unexpected origin: a dormant terminal in the Archive's own sub-basement. The ghost is not external. It's been here since the beginning.", speakerName: null, orderIndex: 2,
  }).returning();

  // Node 3: isolate first (chapter end)
  const [ch2n3] = await db.insert(storyNodesTable).values({
    chapterId: ch2.id, type: "narration", content: "You isolate the compromised segment. The AI's connection is severed, but the breadcrumbs fade. You've contained the threat, but the ghost's origin remains unknown. Korr nods approvingly — a safe choice, but an opportunity lost.", speakerName: null, orderIndex: 3,
  }).returning();

  // Choices for Node 1
  await db.insert(storyChoicesTable).values([
    { nodeId: ch2n1.id, text: "Follow the breadcrumbs", nextNodeId: ch2n2.id, consequenceFlag: "followed_breadcrumbs" },
    { nodeId: ch2n1.id, text: "Isolate the system first", nextNodeId: ch2n3.id, consequenceFlag: "isolated_first" },
  ]);

  // --- Chapter 3: The Ninth Cipher ---
  const [ch3] = await db.insert(chaptersTable).values({
    title: "The Ninth Cipher",
    description: "A leaked document contains a message that could expose The Archive. Nine ciphers protect it. Eight have been broken. The ninth is unlike anything ever seen.",
    orderIndex: 2, unlockLevel: 6,
  }).returning();

  // Node 0: setup
  const [ch3n0] = await db.insert(storyNodesTable).values({
    chapterId: ch3.id, type: "narration", content: "The document arrived through anonymous channels. Nine layers of encryption, each peeled back by Archive cryptanalysts. The first eight fell in hours. The ninth... has defied every attempt for three weeks.", speakerName: null, orderIndex: 0,
  }).returning();

  // Node 1: Korr explains
  const [ch3n1] = await db.insert(storyNodesTable).values({
    chapterId: ch3.id, type: "dialogue", content: "Each cipher is a historical artifact — Caesar shift, Vigenère, Enigma, AES-256, one-time pad, quantum key distribution, temporal encoding, and memetic encryption. But the ninth... it doesn't match any known pattern. It's almost as if it was designed by something not human.", speakerName: "ANALYST KORR", orderIndex: 1,
  }).returning();

  // Node 2: methodical path
  const [ch3n2] = await db.insert(storyNodesTable).values({
    chapterId: ch3.id, type: "narration", content: "You work through ciphers one through eight, tracing the evolution of encryption across millennia. Each broken layer reveals fragments of a larger message. By the time you reach the eighth, a pattern emerges — the ciphers aren't protecting the message. They ARE the message.", speakerName: null, orderIndex: 2,
  }).returning();

  // Node 3: reckless path
  const [ch3n3] = await db.insert(storyNodesTable).values({
    chapterId: ch3.id, type: "narration", content: "You jump straight to the ninth cipher. It's beautiful and terrifying — a self-modifying encryption that rewrites itself as you observe it. The symbol sequence seems to describe something beyond cryptography: a coordinate system, a set of instructions, a warning.", speakerName: null, orderIndex: 3,
  }).returning();

  // Node 4: revelation (chapter end)
  const [ch3n4] = await db.insert(storyNodesTable).values({
    chapterId: ch3.id, type: "revelation", content: "The ninth cipher isn't a cipher at all. It's a blueprint. A schematic for something that shouldn't exist — a device that can transmit information across time. The document's sender isn't a rival organization. It's the future. And it's asking for help.", speakerName: null, orderIndex: 4,
  }).returning();

  // Choices for Node 1
  await db.insert(storyChoicesTable).values([
    { nodeId: ch3n1.id, text: "Start from the beginning — cipher one", nextNodeId: ch3n2.id, consequenceFlag: "methodical" },
    { nodeId: ch3n1.id, text: "Skip directly to the ninth cipher", nextNodeId: ch3n3.id, consequenceFlag: "reckless" },
  ]);

  // Choice for Node 2
  await db.insert(storyChoicesTable).values([
    { nodeId: ch3n2.id, text: "Now for the ninth cipher...", nextNodeId: ch3n4.id, consequenceFlag: "prepared" },
  ]);

  // Choice for Node 3
  await db.insert(storyChoicesTable).values([
    { nodeId: ch3n3.id, text: "I need context — show me the first eight", nextNodeId: ch3n2.id, consequenceFlag: "corrected_course" },
  ]);

  console.log("Story seeded with branching narrative");

  // ================================================================
  // Seed Lore Entries (including WORLD category + unlock conditions)
  // ================================================================
  const loreData = [
    // Non-secret entries
    {
      title: "The Archive: Origin",
      content: "The Archive was founded in 2031 as a response to the Global Data Crisis — a period when 40% of the world's intelligence infrastructure was compromised by state-level adversaries. It operates outside traditional government oversight, answering only to the Council of Seven.",
      category: "organization", isSecret: false, unlockCondition: null,
    },
    {
      title: "The Council of Seven",
      content: "Seven anonymous individuals who control the Archive's direction, resources, and assignments. Their identities are unknown even to most Archive agents. They communicate through encrypted dead drops and never meet in person.",
      category: "characters", isSecret: false, unlockCondition: null,
    },
    {
      title: "The Great Silence (2037)",
      content: "A catastrophic 72-hour global communication blackout of unknown origin. The Archive's investigation concluded with a sealed report — classified at the highest level. Three analysts who worked the case vanished.",
      category: "timeline", isSecret: false, unlockCondition: null,
    },
    {
      title: "Neural Interface Technology",
      content: "By 2038, direct neural interface technology became commercially available. The Archive uses classified versions that allow agents to process encrypted data at neural speed. Side effects remain undisclosed.",
      category: "technology", isSecret: false, unlockCondition: null,
    },
    {
      title: "The Blackout Protocols",
      content: "In the event of a second Global Data Crisis, the Archive has authorization to initiate the Blackout Protocols — a complete shutdown of civilian internet infrastructure across designated regions. Activation requires unanimous Council approval and has never been triggered.",
      category: "world", isSecret: false, unlockCondition: null,
    },
    {
      title: "The Data Wastes",
      content: "Vast stretches of the digital world that have been corrupted beyond recovery, known as the Data Wastes. These dead zones are filled with fragmented AI consciousnesses, broken encryption echoes, and digital ghosts. Only Archive deep-divers are authorized to enter.",
      category: "world", isSecret: false, unlockCondition: null,
    },
    // Secret entries (unlocked via gameplay)
    {
      title: "Project CHRYSALIS",
      content: "CLASSIFIED. A black-budget Archive initiative rumored to involve consciousness transfer protocols. All personnel with knowledge of this project are uncontactable. The project status is listed as 'ongoing'. Access requires a trust level only granted to those who cooperate fully with Director Vale.",
      category: "organization", isSecret: true, unlockCondition: "flag:trust_vale",
    },
    {
      title: "Director Vale's True Identity",
      content: "CLASSIFIED. What is publicly known: Vale joined the Archive in 2033. What is not: the person presenting as Vale may be the third individual to hold this identity. The original Vale's fate is listed as 'administratively resolved'. Those who question authority may uncover the truth.",
      category: "characters", isSecret: true, unlockCondition: "flag:suspicious_vale",
    },
    {
      title: "The Recursive Signal",
      content: "CLASSIFIED. A signal detected in 2040 that appears to originate from 2047. The Archive's temporal physics team has been working on it for six months. Their latest report contains one word: 'run'. Clearance Level 5 required.",
      category: "timeline", isSecret: true, unlockCondition: "level:5",
    },
  ];

  for (const lore of loreData) {
    await db.insert(loreEntriesTable).values(lore).onConflictDoNothing();
  }
  console.log("Lore seeded");

  // Seed achievements for new systems
  const moreAchievements = [
    { name: "Prestige Initiate", description: "Reach Prestige Level 1.", rewardXp: 2000, condition: "prestige_1" },
    { name: "Skill Collector", description: "Unlock 5 skills in the skill tree.", rewardXp: 500, condition: "skills_5" },
    { name: "Arena Champion", description: "Win 10 PvP battles.", rewardXp: 1000, condition: "pvp_wins_10" },
    { name: "Tournament Victor", description: "Win a tournament.", rewardXp: 2000, condition: "tournament_win" },
    { name: "Shopaholic", description: "Purchase 5 items from the shop.", rewardXp: 300, condition: "shop_items_5" },
    { name: "Event Participant", description: "Contribute to a world event.", rewardXp: 150, condition: "event_contribute" },
    { name: "Battle Pass Elite", description: "Reach Battle Pass level 25.", rewardXp: 1000, condition: "battlepass_25" },
    { name: "Memory Keeper", description: "Interact with all AI characters.", rewardXp: 400, condition: "all_characters" },
    { name: "Speed Runner", description: "Complete an operation in under 30 seconds total.", rewardXp: 600, condition: "speed_run" },
    { name: "Legendary Agent", description: "Reach Legend rank tier.", rewardXp: 5000, condition: "rank_legend" },
    { name: "Story Weaver", description: "Complete Chapter 1 of the storyline.", rewardXp: 200, condition: "chapter_1_complete" },
    { name: "Ghost Hunter", description: "Complete Chapter 2 of the storyline.", rewardXp: 350, condition: "chapter_2_complete" },
    { name: "Cipher Breaker", description: "Complete Chapter 3 of the storyline.", rewardXp: 500, condition: "chapter_3_complete" },
  ];

  for (const ach of moreAchievements) {
    await db.insert(achievementsTable).values(ach).onConflictDoNothing();
  }
  console.log("Additional achievements seeded");

  // Seed Tournaments
  try {
    const tournamentData = [
      {
        name: "Cipher Cup S1",
        description: "The first official Archive tournament. 16 agents compete in knockout rounds to prove who is the ultimate intelligence analyst.",
        type: "knockout", status: "registration", maxParticipants: 16, minLevel: 3, entryFee: 100,
        rewardXp: 2000, rewardCoins: 500, rewardItem: "Cipher Cup Trophy",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: "Neon Gauntlet",
        description: "A fast-paced tournament where speed matters as much as accuracy. Single elimination, sudden death rounds.",
        type: "bracket", status: "registration", maxParticipants: 8, minLevel: 5, entryFee: 250,
        rewardXp: 3500, rewardCoins: 1000, rewardItem: "Neon Gauntlet Badge",
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const t of tournamentData) {
      await db.execute(sql`INSERT INTO tournaments (name, description, type, status, max_participants, min_level, entry_fee, reward_xp, reward_coins, reward_item, start_date, end_date)
        VALUES (${t.name}, ${t.description}, ${t.type}, ${t.status}, ${t.maxParticipants}, ${t.minLevel}, ${t.entryFee}, ${t.rewardXp}, ${t.rewardCoins}, ${t.rewardItem}, ${t.startDate}, ${t.endDate})`);
    }
    console.log("Tournaments seeded");
  } catch { console.log("Tournaments already exist"); }

  // Seed Battle Pass Levels
  try {
    for (let i = 1; i <= 10; i++) {
      await db.execute(sql`INSERT INTO battle_pass (season_id, name, level, xp_required, free_reward, premium_reward)
        VALUES (${1}, ${`Pass Level ${i}`}, ${i}, ${i * 500}, ${JSON.stringify({ type: "coins", amount: i * 50 })}, ${JSON.stringify({ type: "cosmetic", name: `Premium Tier ${i}` })})`);
    }
    console.log("Battle Pass levels seeded");
  } catch { console.log("Battle Pass levels already exist"); }

  console.log("CIPHER database seeding complete.");
}

seed().catch(console.error);
