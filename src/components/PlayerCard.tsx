import { PLAYERS, type Ply, type PlayerId } from "@/lib/types";

const pct = (p: number) => `${(p * 100).toFixed(p >= 0.995 || p < 0.01 ? 0 : 1)}%`;

export function PlayerCard({
  player,
  model,
  side,
  plies,
  thinking,
  toMove,
  won,
}: {
  player: PlayerId;
  model: string;
  side: "White" | "Black";
  plies: Ply[];
  thinking: boolean;
  toMove: boolean;
  won: boolean;
}) {
  const info = PLAYERS[player];
  const decided = plies.filter((p) => !p.forced);
  const last = plies[plies.length - 1];
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const avgLatency = avg(decided.map((p) => p.latencyMs));
  const avgConviction = avg(decided.map((p) => p.probability));
  const tokens = decided.reduce((a, p) => a + p.inputTokens, 0);

  return (
    <section className="flex h-full flex-col gap-5 rounded-xl bg-white/[0.035] p-5 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-3 rounded-full ring-1 ${side === "White" ? "bg-[#f4efe2] ring-black/30" : "bg-[#1b1a18] ring-white/40"}`}
              aria-hidden
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">{side}</span>
          </div>
          <h2 className="font-display mt-2 text-3xl leading-none" style={{ color: info.color }}>
            {info.name}
          </h2>
          <p className="mt-1.5 font-mono text-xs text-white/45">
            {info.maker} · {model}
          </p>
        </div>
        <div className="h-6 text-right text-xs">
          {won ? (
            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-black">Winner</span>
          ) : thinking ? (
            <span className="flex items-center gap-2 text-white/70">
              <span className="size-1.5 animate-ping rounded-full" style={{ background: info.color }} />
              deciding
            </span>
          ) : toMove ? (
            <span className="text-white/45">to move</span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4">
        <Stat label="avg latency" value={decided.length ? `${Math.round(avgLatency)} ms` : "–"} />
        <Stat label="avg pick prob" value={decided.length ? pct(avgConviction) : "–"} />
        <Stat label="input tokens" value={tokens ? tokens.toLocaleString() : "–"} />
      </div>

      <div className="flex min-h-[220px] flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-white/45">Last decision</span>
          {last && (
            <span className="font-mono text-xs text-white/40">
              {last.forced ? "forced" : `${last.legalCount} legal moves · ${last.latencyMs} ms`}
            </span>
          )}
        </div>
        {last ? (
          <>
            <p className="font-mono text-3xl text-white">{last.san}</p>
            <ul className="flex flex-col gap-2">
              {last.candidates.map((c) => (
                <li key={c.san} title={c.text} className="grid grid-cols-[64px_1fr_52px] items-center gap-3">
                  <span className={`font-mono text-sm ${c.san === last.san ? "text-white" : "text-white/55"}`}>
                    {c.san}
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <span
                      className="block h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${Math.max(1.5, c.p * 100)}%`,
                        background: info.color,
                        opacity: c.san === last.san ? 1 : 0.45,
                      }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs text-white/60">{pct(c.p)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-white/40">{last.candidates.find((c) => c.san === last.san)?.text}</p>
          </>
        ) : (
          <p className="text-sm text-white/35">No moves yet.</p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-base text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/40">{label}</p>
    </div>
  );
}
