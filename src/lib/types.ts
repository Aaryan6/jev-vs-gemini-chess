import type { Color, Square } from "chess.js";

export type PlayerId = "jev" | "gemini";

export const PLAYERS: Record<PlayerId, { name: string; maker: string; color: string }> = {
  jev: { name: "Jev", maker: "TypeSafe", color: "#c4f26a" },
  gemini: { name: "Gemini Decision", maker: "Google", color: "#86aaff" },
};

export type Candidate = { san: string; from: Square; to: Square; p: number; text: string };

/** One half-move, with what the model thought while choosing it. */
export type Ply = {
  san: string;
  from: Square;
  to: Square;
  color: Color;
  player: PlayerId;
  model: string;
  probability: number;
  candidates: Candidate[];
  legalCount: number;
  /** 0 (Black winning) to 6 (White winning), or null when the move was forced. */
  evaluation: number | null;
  latencyMs: number;
  inputTokens: number;
  forced: boolean;
};

export type MoveResponse = {
  player: PlayerId;
  model: string;
  move: string;
  probabilities: Record<string, number>;
  evaluation: number | null;
  forced: boolean;
  latencyMs: number;
  inputTokens: number;
  options: { san: string; from: Square; to: Square; text: string }[];
};
