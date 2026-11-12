import { PLAYERS, type Ply, type PlayerId } from "@/lib/types";

const W = 720;
const H = 230;
const PAD = { l: 92, r: 12, t: 14, b: 26 };

/**
 * Each model also answers a Score question every turn: who is better, on a
 * 7-level scale from "Black winning decisively" (0) to "White winning
 * decisively" (6). Plotting both shows where the two models disagree.
 */
export function EvalChart({
  plies,
  selected,
  onSelect,
}: {
  plies: Ply[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const span = Math.max(40, plies.length);
  const x = (i: number) => PAD.l + (i / Math.max(1, span - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + ((6 - v) / 6) * (H - PAD.t - PAD.b);

  const series = (player: PlayerId) =>
    plies
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => p.player === player && p.evaluation !== null)
      .map(({ i, p }) => ({ i, v: p.evaluation as number }));

  const levels = [
    { v: 6, label: "White winning" },
    { v: 3, label: "Equal" },
    { v: 0, label: "Black winning" },
  ];

  return (
    <section className="rounded-xl bg-white/[0.035] p-5 ring-1 ring-white/10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm text-white/80">Who is winning, according to each model</h3>
        <div className="flex gap-4 text-xs text-white/55">
          {(["jev", "gemini"] as const).map((id) => (
            <span key={id} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: PLAYERS[id].color }} />
              {PLAYERS[id].name}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Evaluation over the game">
        {levels.map(({ v, label }) => (
          <g key={v}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(v)}
              y2={y(v)}
              stroke="white"
              strokeOpacity={v === 3 ? 0.22 : 0.08}
              strokeDasharray={v === 3 ? undefined : "3 4"}
            />
            <text x={PAD.l - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="white" fillOpacity="0.42">
              {label}
            </text>
          </g>
        ))}
        {selected >= 0 && (
          <line x1={x(selected)} x2={x(selected)} y1={PAD.t} y2={H - PAD.b} stroke="white" strokeOpacity="0.2" />
        )}
        {(["jev", "gemini"] as const).map((id) => {
          const pts = series(id);
          return (
            <g key={id}>
              <polyline
                points={pts.map((pt) => `${x(pt.i)},${y(pt.v)}`).join(" ")}
                fill="none"
                stroke={PLAYERS[id].color}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {pts.map((pt) => (
                <circle
                  key={pt.i}
                  cx={x(pt.i)}
                  cy={y(pt.v)}
                  r={pt.i === selected ? 5 : 3}
                  fill={PLAYERS[id].color}
                  className="cursor-pointer"
                  onClick={() => onSelect(pt.i)}
                >
                  <title>{`Move ${Math.floor(pt.i / 2) + 1} ${plies[pt.i].san}: ${pt.v.toFixed(2)} / 6`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize="11" fill="white" fillOpacity="0.35">
          move {Math.ceil(span / 2)}
        </text>
        <text x={PAD.l} y={H - 6} fontSize="11" fill="white" fillOpacity="0.35">
          move 1
        </text>
      </svg>
    </section>
  );
}
