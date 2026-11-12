import { NextResponse } from "next/server";
import { buildPosition, replay } from "@/lib/position";
import { MODELS, ask } from "@/lib/players";
import type { PlayerId } from "@/lib/types";

type Body = { player?: PlayerId; moves?: string[]; facts?: boolean };

// The browser sends the game so far; keys stay on the server.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const player = body?.player;
  if (player !== "jev" && player !== "gemini") {
    return NextResponse.json({ error: "Unknown player" }, { status: 400 });
  }

  let game;
  try {
    game = replay(Array.isArray(body?.moves) ? body.moves : []);
  } catch {
    return NextResponse.json({ error: "Illegal move history" }, { status: 400 });
  }
  if (game.isGameOver()) {
    return NextResponse.json({ error: "Game is already over" }, { status: 400 });
  }

  const { state, options } = buildPosition(game, body?.facts !== false);
  const base = { player, model: MODELS[player], options };

  // One legal move: nothing to decide. Gemini also needs at least 2 options.
  if (options.length === 1) {
    return NextResponse.json({
      ...base,
      move: options[0].san,
      probabilities: { [options[0].san]: 1 },
      evaluation: null,
      forced: true,
      latencyMs: 0,
      inputTokens: 0,
    });
  }

  const criteria = Object.fromEntries(options.map((o) => [o.san, o.text]));
  const started = performance.now();
  try {
    const decision = await ask[player](state, criteria);
    if (!(decision.move in criteria)) {
      return NextResponse.json({ error: `${player} picked an unknown move: ${decision.move}` }, { status: 502 });
    }
    return NextResponse.json({
      ...base,
      ...decision,
      forced: false,
      latencyMs: Math.round(performance.now() - started),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: `${player}: ${message}` }, { status: 502 });
  }
}
