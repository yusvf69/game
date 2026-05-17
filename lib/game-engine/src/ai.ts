import { StageMatchState, StageQuestion, StageTeam } from "./stage.js";

const BOT_NAMES = [
  "Cipher-7", "Nexus-9", "Phantom-X", "Void-3", "Aegis-1",
  "Omega-5", "Delta-Z", "Sigma-4", "Talon-6", "Wraith-2",
];

const DIFFICULTY_SKILL: Record<string, { accuracy: number; avgBuzzMs: number; buzzVariance: number }> = {
  recruit: { accuracy: 0.45, avgBuzzMs: 8000, buzzVariance: 4000 },
  agent: { accuracy: 0.60, avgBuzzMs: 6000, buzzVariance: 3000 },
  elite: { accuracy: 0.78, avgBuzzMs: 4000, buzzVariance: 2000 },
  omega: { accuracy: 0.92, avgBuzzMs: 2500, buzzVariance: 1500 },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function gaussianRandom(mean: number, variance: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(1000, mean + z * variance);
}

export interface BotDecision {
  action: "buzz" | "wait" | "answer";
  teamId?: number;
  correct?: boolean;
  selectedOptionId?: number | null;
  reason?: string;
}

export function generateBotName(): string {
  return pickRandom(BOT_NAMES);
}

export function addBotToMatch(match: StageMatchState, name?: string, difficulty: string = "agent"): StageTeam {
  const botName = name || generateBotName();
  const skill = DIFFICULTY_SKILL[difficulty] || DIFFICULTY_SKILL.agent;

  const bot: StageTeam = {
    id: 1000 + match.teams.length,
    name: botName,
    color: "",
    emblem: "",
    code: `AI-${match.teams.length + 1}`,
    score: 0,
    correct: 0,
    total: 0,
    streak: 0,
    tacticalLoadout: [],
    isBot: true,
  };

  match.teams.push(bot);
  return bot;
}

export function decideBotBuzz(match: StageMatchState, difficulty: string = "agent"): BotDecision | null {
  if (match.phase !== "question" || match.buzzerTeamId !== null) return null;

  const skill = DIFFICULTY_SKILL[difficulty] || DIFFICULTY_SKILL.agent;
  const elapsed = Date.now() - (match.timerStartedAt || Date.now());

  const botTeams = match.teams.filter(t => (t as any).isBot);
  if (botTeams.length === 0) return null;

  for (const bot of botTeams) {
    const buzzChance = Math.min(0.3, elapsed / (skill.avgBuzzMs * 3));
    if (Math.random() < buzzChance) {
      const q = match.questions[match.currentQuestionIndex];
      const willBeCorrect = Math.random() < skill.accuracy;
      let selectedOptionId: number | null = null;

      if (q && q.correctOptionId) {
        if (willBeCorrect) {
          selectedOptionId = q.correctOptionId;
        } else {
          const wrongOptions = q.options.filter(o => o.id !== q.correctOptionId);
          selectedOptionId = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]?.id || null;
        }
      }

      return {
        action: "buzz",
        teamId: bot.id,
        correct: willBeCorrect,
        selectedOptionId,
      };
    }
  }

  return { action: "wait" };
}

// ─── Question Generation Templates ────────────────────────────────

const QUESTION_TEMPLATES: {
  category: string;
  difficulty: number;
  text: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
}[] = [
  {
    category: "technology",
    difficulty: 4,
    text: "Which data structure uses LIFO (Last In, First Out) principle?",
    correctAnswer: "Stack",
    options: ["Queue", "Stack", "Tree", "Graph"],
    explanation: "A stack follows LIFO — the last element added is the first removed.",
  },
  {
    category: "technology",
    difficulty: 6,
    text: "What is the primary advantage of using a NoSQL database over a relational database?",
    correctAnswer: "Flexible schema for unstructured data",
    options: ["ACID compliance", "Flexible schema for unstructured data", "Standardized query language", "Built-in referential integrity"],
    explanation: "NoSQL databases allow flexible schemas, making them ideal for unstructured or rapidly changing data.",
  },
  {
    category: "security",
    difficulty: 5,
    text: "What type of attack involves injecting malicious SQL statements into an entry field?",
    correctAnswer: "SQL Injection",
    options: ["Cross-Site Scripting", "Man-in-the-Middle", "SQL Injection", "Denial of Service"],
    explanation: "SQL Injection occurs when user input is improperly sanitized and interpreted as SQL code.",
  },
  {
    category: "logic",
    difficulty: 3,
    text: "If all A are B, and all B are C, what can we conclude?",
    correctAnswer: "All A are C",
    options: ["All C are A", "All A are C", "Some B are not A", "No conclusion possible"],
    explanation: "This is the transitive property: if A ⊆ B and B ⊆ C, then A ⊆ C.",
  },
  {
    category: "intelligence",
    difficulty: 4,
    text: "What does HUMINT stand for in intelligence gathering?",
    correctAnswer: "Human Intelligence",
    options: ["Human Intelligence", "Humane Intelligence", "Humble Intelligence", "Hidden Intelligence"],
    explanation: "HUMINT is intelligence gathered from human sources.",
  },
  {
    category: "history",
    difficulty: 5,
    text: "The Zimmermann Telegram was a key factor in which country's entry into World War I?",
    correctAnswer: "United States",
    options: ["France", "United Kingdom", "United States", "Russia"],
    explanation: "The Zimmermann Telegram was a secret diplomatic communication that helped bring the US into WWI.",
  },
];

export function generateAITemplateQuestion(category?: string, difficulty?: number): {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
  difficulty: number;
} {
  let pool = QUESTION_TEMPLATES;
  if (category) {
    const filtered = pool.filter(q => q.category === category);
    if (filtered.length > 0) pool = filtered;
  }
  if (difficulty) {
    const filtered = pool.filter(q => q.difficulty === difficulty);
    if (filtered.length > 0) pool = filtered;
    else {
      const close = pool.sort((a, b) => Math.abs(a.difficulty - difficulty!) - Math.abs(b.difficulty - difficulty!));
      pool = [close[0]];
    }
  }

  const template = pickRandom(pool);
  const correctIndex = template.options.indexOf(template.correctAnswer);

  return {
    questionText: template.text,
    options: template.options,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    explanation: template.explanation,
    category: template.category,
    difficulty: template.difficulty,
  };
}

// ─── OpenAI Question Generation ────────────────────────────────────

interface OpenAIConfig {
  apiKey?: string;
  model?: string;
}

let openAIConfig: OpenAIConfig = {};

export function configureOpenAI(config: OpenAIConfig) {
  openAIConfig = config;
}

export function isOpenAIConfigured(): boolean {
  return !!openAIConfig.apiKey;
}

async function callOpenAI(prompt: string): Promise<string | null> {
  if (!openAIConfig.apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: openAIConfig.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a trivia question generator for a spy/agent themed game called World-Weaver. Generate questions in JSON format." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!response.ok) return null;
    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function generateQuestionsWithAI(
  count: number = 5,
  category?: string,
  difficulty?: number,
): Promise<{
  questionText: string;
  type: string;
  difficulty: number;
  category: string;
  correctAnswer: string;
  timeLimitSeconds: number;
  explanation: string;
  options: string[];
  correctIndex: number;
}[]> {
  if (!openAIConfig.apiKey) {
    // Fallback to templates
    return Array.from({ length: count }, () => {
      const tpl = generateAITemplateQuestion(category, difficulty);
      return {
        questionText: tpl.questionText,
        type: "multiple_choice",
        difficulty: tpl.difficulty,
        category: tpl.category,
        correctAnswer: tpl.options[tpl.correctIndex],
        timeLimitSeconds: 30,
        explanation: tpl.explanation,
        options: tpl.options,
        correctIndex: tpl.correctIndex,
      };
    });
  }

  const prompt = `Generate ${count} multiple-choice trivia questions${category ? ` in category "${category}"` : ""}${difficulty ? ` at difficulty level ${difficulty}/10` : ""} for a spy/agent themed game.

Return ONLY valid JSON array:
[
  {
    "questionText": "The question text",
    "category": "technology|security|history|logic|intelligence",
    "difficulty": <1-10>,
    "options": ["option1", "option2", "option3", "option4"],
    "correctIndex": <0-3>,
    "explanation": "Brief explanation of the correct answer",
    "timeLimitSeconds": 30
  }
]`;

  const result = await callOpenAI(prompt);
  if (!result) {
    return generateQuestionsWithAI(count, category, difficulty);
  }

  try {
    const parsed = JSON.parse(result);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, count).map((q: any) => ({
        questionText: q.questionText,
        type: "multiple_choice",
        difficulty: q.difficulty || difficulty || 3,
        category: q.category || category || "general",
        correctAnswer: q.options?.[q.correctIndex] || "",
        timeLimitSeconds: q.timeLimitSeconds || 30,
        explanation: q.explanation || "",
        options: q.options || [],
        correctIndex: q.correctIndex || 0,
      }));
    }
  } catch {}

  return generateQuestionsWithAI(count, category, difficulty);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
