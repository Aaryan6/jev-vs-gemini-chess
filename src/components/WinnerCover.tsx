import { PLAYERS, type Ply, type PlayerId } from "@/lib/types";

/** Laid over the board when the game ends: the winner after checkmate, or the draw. */
export function WinnerCover({
  plies,
  checkmate,
  result,
  onRematch,
  onReview,
}: {
  plies: Ply[];
  checkmate: boolean;
  result: string;
  onRematch: () => void;
  onReview: () => void;
}) {
  const last = plies[plies.length - 1];
  const winner: PlayerId | null = checkmate && last ? last.player : null;
  const moves = Math.ceil(plies.length / 2);

  const stats = (id: PlayerId) => {
    const own = plies.filter((p) => p.player === id && !p.forced);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    return {
      latency: Math.round(avg(own.map((p) => p.latencyMs))),
      pick: Math.round(avg(own.map((p) => p.probability)) * 100),
    };
  };
  const order: PlayerId[] = winner ? [winner, winner === "jev" ? "gemini" : "jev"] : ["jev", "gemini"];

  return (
    <div className="cover-in absolute inset-0 z-10 flex items-center justify-center bg-[#0d0d0c]/80 p-6 backdrop-blur-[3px]">
      {winner && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(60% 50% at 50% 45%, ${PLAYERS[winner].color}2e, transparent 70%)` }}
        />
      )}
      <div className="cover-rise relative flex w-full max-w-sm flex-col items-center text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/55">
          {winner ? "Checkmate" : "Game over"}
        </p>

        {winner ? (
          <>
            <h2
              className="font-display mt-3 text-6xl leading-none sm:text-7xl"
              style={{ color: PLAYERS[winner].color }}
            >
              {PLAYERS[winner].name}
            </h2>
            <p className="mt-3 text-lg text-white">
              wins with {last.color === "w" ? "White" : "Black"} in {moves} moves
            </p>
            <p className="mt-1 font-mono text-xs text-white/50">
              {PLAYERS[winner].maker} · {last.model} · final move {last.san}
              {!last.forced && ` at ${Math.round(last.probability * 100)}%`}
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display mt-3 text-6xl leading-none text-white sm:text-7xl">Draw</h2>
            <p className="mt-3 text-base text-white/75">{result.replace(/^Draw(: | by )?/, "").replace(/^./, (c) => c.toUpperCase())}</p>
            <p className="mt-1 font-mono text-xs text-white/50">{moves} moves</p>
          </>
        )}

        <div className="mt-6 grid w-full grid-cols-2 gap-3 border-y border-white/10 py-4">
          {order.map((id) => {
            const s = stats(id);
            return (
              <div key={id} className={winner && id !== winner ? "opacity-60" : ""}>
                <p className="text-sm" style={{ color: PLAYERS[id].color }}>
                  {PLAYERS[id].name}
                </p>
                <p className="mt-1 font-mono text-xs text-white/60">
                  {s.latency} ms avg · {s.pick}% pick
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onRematch}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/85"
          >
            Rematch, swap colors
          </button>
          <button
            onClick={onReview}
            className="rounded-lg px-4 py-2 text-sm text-white/80 ring-1 ring-white/20 transition hover:bg-white/5"
          >
            Review game
          </button>
        </div>
      </div>
    </div>
  );
}
