"use client";

import { useEffect, useRef, useState } from "react";
import type { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { replay } from "@/lib/position";
import { PLAYERS, type MoveResponse, type Ply, type PlayerId } from "@/lib/types";
import { PlayerCard } from "./PlayerCard";
import { EvalChart } from "./EvalChart";
import { MoveList } from "./MoveList";
import { WinnerCover } from "./WinnerCover";

const MAX_PLIES = 300;
const SPEEDS = [
  { label: "Fast", ms: 0 },
  { label: "Normal", ms: 700 },
  { label: "Slow", ms: 2000 },
];

const otherPlayer = (p: PlayerId): PlayerId => (p === "jev" ? "gemini" : "jev");

function hexAlpha(hex: string, a: number) {
  return hex + Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, "0");
}

function resultOf(game: Chess, plies: Ply[]): string | null {
  if (game.isCheckmate()) {
    const winner = plies[plies.length - 1];
    return `Checkmate. ${PLAYERS[winner.player].name} wins with ${winner.color === "w" ? "White" : "Black"}.`;
  }
  if (game.isStalemate()) return "Draw by stalemate.";
  if (game.isThreefoldRepetition()) return "Draw by threefold repetition.";
  if (game.isInsufficientMaterial()) return "Draw by insufficient material.";
  if (game.isDrawByFiftyMoves()) return "Draw by the fifty-move rule.";
  if (plies.length >= MAX_PLIES) return `Draw: stopped after ${MAX_PLIES / 2} moves.`;
  return null;
}

export function Arena({ models }: { models: Record<PlayerId, string> }) {
  const [plies, setPlies] = useState<Ply[]>([]);
  const [whitePlayer, setWhitePlayer] = useState<PlayerId>("jev");
  const [running, setRunning] = useState(false);
  const [thinking, setThinking] = useState<PlayerId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(SPEEDS[1].ms);
  const [facts, setFacts] = useState(true);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [coverDismissed, setCoverDismissed] = useState(false);
  const gameId = useRef(0);

  const game = replay(plies.map((p) => p.san));
  const result = resultOf(game, plies);
  const toMove: PlayerId = game.turn() === "w" ? whitePlayer : otherPlayer(whitePlayer);

  async function playOne() {
    if (thinking || result) return;
    const id = gameId.current;
    const player = toMove;
    const color = game.turn();
    setThinking(player);
    setError(null);
    try {
      const res = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, moves: plies.map((p) => p.san), facts }),
      });
      const data = (await res.json()) as MoveResponse | { error: string };
      if (id !== gameId.current) return; // reset while waiting
      if ("error" in data) throw new Error(data.error);

      const byProb = [...data.options]
        .map((o) => ({ ...o, p: data.probabilities[o.san] ?? 0 }))
        .sort((a, b) => b.p - a.p);
      const chosen = byProb.find((o) => o.san === data.move)!;
      setPlies((prev) => [
        ...prev,
        {
          san: chosen.san,
          from: chosen.from,
          to: chosen.to,
          color,
          player,
          model: data.model,
          probability: chosen.p,
          candidates: byProb.slice(0, 5),
          legalCount: data.options.length,
          evaluation: data.evaluation,
          latencyMs: data.latencyMs,
          inputTokens: data.inputTokens,
          forced: data.forced,
        },
      ]);
      setViewPly(null);
    } catch (err) {
      if (id !== gameId.current) return;
      setError(err instanceof Error ? err.message : "Move request failed");
      setRunning(false);
    } finally {
      if (id === gameId.current) setThinking(null);
    }
  }

  // The match loop: whenever it's someone's turn and we're running, ask them.
  useEffect(() => {
    if (!running || thinking || result) return;
    const t = setTimeout(playOne, plies.length ? speed : 0);
    return () => clearTimeout(t);
  });

  function newGame(swap = false) {
    gameId.current++;
    setPlies([]);
    setRunning(false);
    setThinking(null);
    setError(null);
    setViewPly(null);
    setCoverDismissed(false);
    if (swap) setWhitePlayer((w) => otherPlayer(w));
  }

  // What the board shows: the live position, or a past ply from the move list.
  const shownIndex = viewPly ?? plies.length - 1;
  const shownGame = viewPly === null ? game : replay(plies.slice(0, viewPly + 1).map((p) => p.san));
  const shownPly = shownIndex >= 0 ? plies[shownIndex] : undefined;

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (shownPly) {
    const tint = hexAlpha(PLAYERS[shownPly.player].color, 0.38);
    squareStyles[shownPly.from] = { background: tint };
    squareStyles[shownPly.to] = { background: tint };
  }
  if (shownGame.inCheck()) {
    const king = shownGame
      .board()
      .flat()
      .find((s) => s?.type === "k" && s.color === shownGame.turn());
    if (king) squareStyles[king.square] = { background: "radial-gradient(circle, #ff4d4dcc 20%, transparent 75%)" };
  }
  const arrows = shownPly
    ? shownPly.candidates.slice(0, 3).map((c) => ({
        startSquare: c.from,
        endSquare: c.to,
        color: hexAlpha(PLAYERS[shownPly.player].color, 0.25 + c.p * 0.7),
      }))
    : [];

  const blackPlayer = otherPlayer(whitePlayer);
  const card = (player: PlayerId, color: "White" | "Black") => (
    <PlayerCard
      player={player}
      model={models[player]}
      side={color}
      plies={plies.filter((p) => p.player === player)}
      thinking={thinking === player}
      toMove={!result && toMove === player}
      won={!!result && game.isCheckmate() && plies[plies.length - 1]?.player === player}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
            Two decision models · one board · no text generated
          </p>
          <h1 className="font-display mt-1 text-4xl leading-none text-white sm:text-5xl">
            <span style={{ color: PLAYERS.jev.color }}>Jev</span>
            <span className="mx-3 text-white/35 italic">vs</span>
            <span style={{ color: PLAYERS.gemini.color }}>Gemini Decision</span>
          </h1>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-white/55">
          Each turn, code lists every legal move with its facts. The model on move picks one from that closed set
          and returns a probability for every option, plus who it thinks is winning.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)_minmax(0,1fr)]">
        <div className="order-2 lg:order-1">{card(whitePlayer, "White")}</div>

        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10">
            <Chessboard
              options={{
                id: "arena",
                position: shownGame.fen(),
                allowDragging: false,
                allowDrawingArrows: false,
                arrows,
                squareStyles,
                animationDurationInMs: 220,
                lightSquareStyle: { backgroundColor: "#e9e2d0" },
                darkSquareStyle: { backgroundColor: "#a3876a" },
                lightSquareNotationStyle: { color: "#a3876a" },
                darkSquareNotationStyle: { color: "#e9e2d0" },
              }}
            />
            {result && !coverDismissed && (
              <WinnerCover
                plies={plies}
                checkmate={game.isCheckmate()}
                result={result}
                onRematch={() => newGame(true)}
                onReview={() => setCoverDismissed(true)}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              disabled={!!result}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/85 disabled:opacity-40"
            >
              {running ? "Pause" : plies.length ? "Resume" : "Start match"}
            </button>
            <button
              onClick={playOne}
              disabled={running || !!thinking || !!result}
              className="rounded-lg px-3 py-2 text-sm text-white/80 ring-1 ring-white/15 transition hover:bg-white/5 disabled:opacity-40"
            >
              Next move
            </button>
            <button
              onClick={() => newGame()}
              className="rounded-lg px-3 py-2 text-sm text-white/80 ring-1 ring-white/15 transition hover:bg-white/5"
            >
              New game
            </button>
            <button
              onClick={() => newGame(true)}
              className="rounded-lg px-3 py-2 text-sm text-white/80 ring-1 ring-white/15 transition hover:bg-white/5"
              title="Start a new game with colors swapped"
            >
              Swap colors
            </button>

            <div className="ml-auto flex items-center gap-1 rounded-lg p-1 ring-1 ring-white/10">
              {SPEEDS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSpeed(s.ms)}
                  className={`rounded-md px-2.5 py-1 text-xs transition ${
                    speed === s.ms ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/55">
            <input
              type="checkbox"
              checked={facts}
              onChange={(e) => setFacts(e.target.checked)}
              className="accent-white"
            />
            Give both models code-computed move facts (checks, hanging pieces, mate threats)
          </label>

          {result && coverDismissed && (
            <div className="rounded-xl bg-white/[0.06] px-4 py-3 text-center text-base text-white ring-1 ring-white/10">
              {result} <span className="text-white/50">{Math.ceil(plies.length / 2)} moves.</span>
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/30">
              {error}
            </div>
          )}
          {viewPly !== null && (
            <button onClick={() => setViewPly(null)} className="text-xs text-white/55 underline underline-offset-4">
              Viewing move {Math.floor(viewPly / 2) + 1}. Back to live position
            </button>
          )}
        </div>

        <div className="order-3">{card(blackPlayer, "Black")}</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <EvalChart plies={plies} onSelect={setViewPly} selected={shownIndex} />
        <MoveList plies={plies} onSelect={setViewPly} selected={shownIndex} />
      </div>
    </div>
  );
}
