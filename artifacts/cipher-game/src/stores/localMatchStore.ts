import { create } from "zustand";

export interface TeamConfig {
  id: number;
  name: string;
  color: string;
  emblem: string;
  tacticalLoadout: string[];
}

export interface TeamScore {
  correct: number;
  total: number;
  score: number;
  streak: number;
  perfectCategories: string[];
  assistsUsed: string[];
}

export interface LocalQuestion {
  id: number;
  questionText: string;
  difficulty: number;
  category: string;
  options: { id: number; text: string }[];
  timeLimit: number;
  type: string;
  correctAnswer?: string;
  explanation?: string;
}

type FlowMode = "randomized" | "sequential";
type Phase = "setup" | "intro" | "playing" | "feedback" | "ended";

interface LocalMatchState {
  phase: Phase;
  teams: TeamConfig[];
  scores: Record<number, TeamScore>;
  currentTeamIndex: number;
  currentQuestionIndex: number;
  questions: LocalQuestion[];
  domains: string[];
  difficulty: string;
  flowMode: FlowMode;
  domainOrder: string[];
  selectedOption: number | null;
  answerResult: { correct: boolean; xpGained: number } | null;
  eliminatedOptionIds: number[];
  activeAssist: string | null;
  introDomain: string;
  totalQuestions: number;

  setPhase: (phase: Phase) => void;
  setTeams: (teams: TeamConfig[]) => void;
  setDomains: (domains: string[]) => void;
  setDifficulty: (difficulty: string) => void;
  setFlowMode: (mode: FlowMode) => void;
  setDomainOrder: (order: string[]) => void;
  setQuestions: (questions: LocalQuestion[]) => void;
  nextTeam: () => void;
  nextQuestion: () => void;
  markAnswer: (correct: boolean, timeMs: number) => void;
  setSelectedOption: (id: number | null) => void;
  setAnswerResult: (result: { correct: boolean; xpGained: number } | null) => void;
  setEliminatedOptionIds: (ids: number[]) => void;
  useAssist: (moduleId: string) => void;
  setActiveAssist: (moduleId: string | null) => void;
  setIntroDomain: (domain: string) => void;
  startMatch: () => void;
  getCurrentTeam: () => TeamConfig | null;
  getCurrentQuestion: () => LocalQuestion | null;
  getWinner: () => { team: TeamConfig; score: number } | null;
  reset: () => void;
}

const INITIAL_SCORE: TeamScore = {
  correct: 0, total: 0, score: 0, streak: 0,
  perfectCategories: [], assistsUsed: [],
};

export const useLocalMatchStore = create<LocalMatchState>()((set, get) => ({
  phase: "setup",
  teams: [],
  scores: {},
  currentTeamIndex: 0,
  currentQuestionIndex: 0,
  questions: [],
  domains: [],
  difficulty: "agent",
  flowMode: "randomized",
  domainOrder: [],
  selectedOption: null,
  answerResult: null,
  eliminatedOptionIds: [],
  activeAssist: null,
  introDomain: "",
  totalQuestions: 0,

  setPhase: (phase) => set({ phase }),
  setTeams: (teams) => {
    const scores: Record<number, TeamScore> = {};
    teams.forEach((t) => { scores[t.id] = { ...INITIAL_SCORE }; });
    set({ teams, scores });
  },
  setDomains: (domains) => set({ domains }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setFlowMode: (mode) => set({ flowMode: mode }),
  setDomainOrder: (order) => set({ domainOrder: order }),
  setQuestions: (questions) => set({ questions, totalQuestions: questions.length }),

  nextTeam: () => {
    const { teams, currentTeamIndex } = get();
    const next = (currentTeamIndex + 1) % teams.length;
    set({ currentTeamIndex: next, selectedOption: null, answerResult: null, eliminatedOptionIds: [], activeAssist: null });
  },

  nextQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex >= questions.length - 1) {
      set({ phase: "ended" });
    } else {
      set({
        currentQuestionIndex: currentQuestionIndex + 1,
        currentTeamIndex: 0,
        selectedOption: null,
        answerResult: null,
        eliminatedOptionIds: [],
        activeAssist: null,
      });
    }
  },

  markAnswer: (correct, timeMs) => {
    const { scores, currentTeamIndex, teams, currentQuestionIndex, questions } = get();
    const teamId = teams[currentTeamIndex]?.id;
    if (!teamId || !scores[teamId]) return;

    const s = { ...scores[teamId] };
    s.total += 1;
    if (correct) {
      s.correct += 1;
      const speedBonus = timeMs < 5000 ? 25 : timeMs < 10000 ? 15 : 0;
      const streakBonus = s.streak > 0 ? 50 : 0;
      s.score += 100 + speedBonus + streakBonus;
      s.streak += 1;
    } else {
      s.streak = 0;
    }

    set({ scores: { ...scores, [teamId]: s } });
  },

  setSelectedOption: (id) => set({ selectedOption: id }),
  setAnswerResult: (result) => set({ answerResult: result }),
  setEliminatedOptionIds: (ids) => set({ eliminatedOptionIds: ids }),
  setActiveAssist: (moduleId) => set({ activeAssist: moduleId }),

  useAssist: (moduleId) => {
    const { teams, currentTeamIndex, scores } = get();
    const teamId = teams[currentTeamIndex]?.id;
    if (!teamId || !scores[teamId]) return;
    const s = { ...scores[teamId] };
    s.assistsUsed = [...s.assistsUsed, moduleId];
    set({ scores: { ...scores, [teamId]: s } });
  },

  setIntroDomain: (domain) => set({ introDomain: domain }),

  startMatch: () => set({
    phase: "intro",
    currentTeamIndex: 0,
    currentQuestionIndex: 0,
    selectedOption: null,
    answerResult: null,
    eliminatedOptionIds: [],
    activeAssist: null,
  }),

  getCurrentTeam: () => {
    const { teams, currentTeamIndex } = get();
    return teams[currentTeamIndex] || null;
  },

  getCurrentQuestion: () => {
    const { questions, currentQuestionIndex } = get();
    return questions[currentQuestionIndex] || null;
  },

  getWinner: () => {
    const { teams, scores } = get();
    if (teams.length === 0) return null;
    let bestTeam = teams[0];
    let bestScore = scores[bestTeam.id]?.score || 0;
    for (const t of teams) {
      const s = scores[t.id]?.score || 0;
      if (s > bestScore) { bestScore = s; bestTeam = t; }
    }
    return { team: bestTeam, score: bestScore };
  },

  reset: () => set({
    phase: "setup",
    teams: [],
    scores: {},
    currentTeamIndex: 0,
    currentQuestionIndex: 0,
    questions: [],
    domains: [],
    difficulty: "agent",
    flowMode: "randomized",
    domainOrder: [],
    selectedOption: null,
    answerResult: null,
    eliminatedOptionIds: [],
    activeAssist: null,
    introDomain: "",
    totalQuestions: 0,
  }),
}));
