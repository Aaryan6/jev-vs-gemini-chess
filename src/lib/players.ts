import { GoogleGenAI } from "@google/genai";
import { TypeSafeClient, choice, score } from "@typesafe-ai/sdk";
import { EVAL_INSTRUCTIONS, EVAL_LEVELS, MOVE_INSTRUCTIONS, type buildPosition } from "./position";
import type { PlayerId } from "./types";

export const MODELS: Record<PlayerId, string> = {
  jev: process.env.JEV_MODEL ?? "jev-1.14.0",
  gemini: process.env.GEMINI_DECISION_MODEL ?? "gemini-decision-1",
};

/** What each model returns, normalized so the board does not care who played. */
export type Decision = {
  move: string;
  probabilities: Record<string, number>;
  /** Expected level on EVAL_LEVELS, 0 (Black winning) to 6 (White winning). */
  evaluation: number;
  inputTokens: number;
};

type State = ReturnType<typeof buildPosition>["state"];
type Ask = (state: State, criteria: Record<string, string>) => Promise<Decision>;

// Two independent questions over the same state go out in one request:
// pick a move, and say who is better. They run in parallel inside the model.

let jevClient: TypeSafeClient | undefined;
const askJev: Ask = async (state, criteria) => {
  jevClient ??= new TypeSafeClient(); // reads TYPESAFE_API_KEY
  const res = await jevClient.systemOne({
    model: MODELS.jev,
    state,
    questions: {
      move: choice(MOVE_INSTRUCTIONS, criteria),
      eval: score(EVAL_INSTRUCTIONS, EVAL_LEVELS),
    },
  });
  return {
    move: res.answers.move.choice,
    probabilities: { ...res.answers.move.probabilities },
    evaluation: res.answers.eval.score,
    inputTokens: res.usage?.input_tokens ?? 0,
  };
};

let geminiClient: GoogleGenAI | undefined;
const askGemini: Ask = async (state, criteria) => {
  geminiClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: "v1beta" });
  const res = await geminiClient.decisions.create({
    model: MODELS.gemini,
    // Same JSON Jev receives as `state`, sent as text input.
    input: JSON.stringify(state, null, 1),
    questions: {
      move: { type: "choice", instructions: MOVE_INSTRUCTIONS, criteria },
      eval: { type: "score", instructions: EVAL_INSTRUCTIONS, criteria: EVAL_LEVELS },
    },
  });
  if (res.prompt_feedback?.block_reason) {
    throw new Error(`Gemini blocked the request: ${res.prompt_feedback.block_reason}`);
  }
  const move = res.answers?.move;
  const evaluation = res.answers?.eval;
  if (move?.type !== "choice" || evaluation?.type !== "score") {
    throw new Error("Gemini returned no answers");
  }
  return {
    move: move.choice,
    probabilities: move.probabilities,
    evaluation: evaluation.score,
    inputTokens: res.usage?.total_input_tokens ?? 0,
  };
};

export const ask: Record<PlayerId, Ask> = { jev: askJev, gemini: askGemini };
