import { db, getPool } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { questionsTable, questionOptionsTable } from "@workspace/db";
import { eventBus } from "./events.js";

export interface AnswerValidationInput {
  questionId: number;
  optionId: number;
  timeSpentMs: number;
  userId?: number;
}

export interface AnswerValidationResult {
  valid: boolean;
  isCorrect: boolean;
  correctOptionId: number | null;
  explanation: string | null;
  anomalies: string[];
  rejected: boolean;
}

const MIN_ANSWER_TIME = 300;
const SUSPICIOUS_ANSWER_TIME = 2000;
const SPEED_LIMIT = 500;

export async function validateAnswer(input: AnswerValidationInput): Promise<AnswerValidationResult> {
  const anomalies: string[] = [];

  // Speed check
  if (input.timeSpentMs < SPEED_LIMIT) {
    anomalies.push("impossible_speed");
  } else if (input.timeSpentMs < MIN_ANSWER_TIME) {
    // Between 300-500ms
    anomalies.push("suspicious_speed");
  }

  // Duplicate check
  if (input.userId) {
    try {
      const { rows } = await getPool().query(
        `SELECT count(*) as cnt FROM answer_logs
         WHERE user_id = $1 AND question_id = $2
         AND created_at > now() - interval '30 seconds'`,
        [input.userId, input.questionId]
      );
      if (Number(rows[0]?.cnt || 0) > 0) {
        anomalies.push("duplicate_answer");
      }
    } catch {}
  }

  // Reject impossible speeds
  if (input.timeSpentMs < MIN_ANSWER_TIME) {
    if (input.userId) {
      await eventBus.emit("ANSWER_INCORRECT", {
        userId: input.userId,
        data: { anomalies, timeSpentMs: input.timeSpentMs, questionId: input.questionId, rejected: true },
      });
    }
    return {
      valid: false,
      isCorrect: false,
      correctOptionId: null,
      explanation: "Answer rejected — too fast",
      anomalies,
      rejected: true,
    };
  }

  // Validate answer
  const [question] = await db.select().from(questionsTable)
    .where(eq(questionsTable.id, input.questionId)).limit(1);
  if (!question) {
    return {
      valid: false,
      isCorrect: false,
      correctOptionId: null,
      explanation: "Question not found",
      anomalies,
      rejected: true,
    };
  }

  const [selectedOption] = await db.select().from(questionOptionsTable)
    .where(eq(questionOptionsTable.id, input.optionId)).limit(1);
  const isCorrect = selectedOption?.isCorrect === 1;

  const [correctOption] = await db.select().from(questionOptionsTable)
    .where(and(
      eq(questionOptionsTable.questionId, input.questionId),
      eq(questionOptionsTable.isCorrect, 1),
    ))
    .limit(1);

  // Log answer
  try {
    await db.insert(
      (await import("@workspace/db")).answerLogsTable
    ).values({
      userId: input.userId || 0,
      questionId: input.questionId,
      category: question.category,
      difficulty: question.difficulty,
      correct: isCorrect ? 1 : 0,
      timeSpentMs: input.timeSpentMs,
    });
  } catch {}

  if (anomalies.length > 0) {
    try {
      await getPool().query(
        `INSERT INTO anti_cheat_logs (user_id, action, details, severity, flagged)
         VALUES ($1, $2, $3, $4, $5)`,
        [input.userId || 0, "answer_anomaly",
         JSON.stringify({ questionId: input.questionId, timeSpentMs: input.timeSpentMs, isCorrect, anomalies }),
         anomalies.includes("impossible_speed") ? 3 : 1,
         anomalies.includes("impossible_speed")],
      );
    } catch {}
  }

  return {
    valid: true,
    isCorrect,
    correctOptionId: correctOption?.id || null,
    explanation: question.explanation,
    anomalies,
    rejected: false,
  };
}
