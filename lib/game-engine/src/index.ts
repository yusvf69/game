export {
  eventBus,
  default as eventBusInstance,
} from "./events.js";
export type { GameEventType, GameEvent } from "./events.js";

export {
  createMatch,
  startMatch,
  buzz,
  submitAnswer,
  nextQuestion,
  skipQuestion,
  handleTimeout,
  addBotTeam,
  getMatchState,
  getMatchForReplay,
  listReplays,
  ensureMatch,
  cacheMatch,
  persistMatch,
  getStageMatch,
  getUserFromToken,
  stripQuestion,
  DOMAIN_CATEGORIES,
  DIFFICULTY_CONFIG,
} from "./stage.js";
export type {
  StageMatchState,
  StageTeam,
  StageQuestion,
  StagePhase,
  StageEvent,
} from "./stage.js";

export {
  calculateScore,
  calculateStageScore,
  calcLevel,
  getRankTier,
  XP_PER_LEVEL,
  RANK_TIERS,
} from "./scoring.js";
export type { ScoreInput, ScoreResult } from "./scoring.js";

export {
  validateAnswer,
} from "./validation.js";
export type { AnswerValidationInput, AnswerValidationResult } from "./validation.js";

export {
  decideBotBuzz,
  addBotToMatch,
  generateBotName,
  generateAITemplateQuestion,
  generateQuestionsWithAI,
  configureOpenAI,
  isOpenAIConfigured,
  randomInt,
} from "./ai.js";
export type { BotDecision } from "./ai.js";
