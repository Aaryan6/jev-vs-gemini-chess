"use client";

import { useEffect, useRef } from "react";
import { PLAYERS, type Ply } from "@/lib/types";

export function MoveList({
  plies,
  selected,
  onSelect,
}: {
  plies: Ply[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [plies.length]);

  const rows: [number, Ply, Ply | undefined][] = [];
  for (let i = 0; i < plies.length; i += 2) rows.push([i, plies[i], plies[i + 1]]);

  const cell = (p: Ply | undefined, i: number) =>
    p ? (
      <button
        onClick={() => onSelect(i)}
        title={p.forced ? "Only legal move" : `${PLAYERS[p.player].name} picked this at ${(p.probability * 100).toFixed(1)}%`}
        className={`flex items-baseline justify-between gap-2 rounded-md px-2 py-1 text-left transition ${
          i === selected ? "bg-white/10" : "hover:bg-white/5"
        }`}
      >
        <span className="font-mono text-sm text-white/90">{p.san}</span>
        <span className="font-mono text-[11px]" style={{ color: PLAYERS[p.player].color, opacity: 0.8 }}>
          {p.forced ? "only" : `${Math.round(p.probability * 100)}%`}
        </span>
      </button>
    ) : (
      <span />
    );

  return (
    <section className="flex flex-col rounded-xl bg-white/[0.035] p-5 ring-1 ring-white/10">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm text-white/80">Moves</h3>
        <span className="text-xs text-white/40">% = probability the model gave its pick</span>
      </div>
      <div ref={list} className="max-h-[230px] overflow-y-auto pr-1">
        {rows.length === 0 && <p className="text-sm text-white/35">Press Start match.</p>}
        {rows.map(([i, w, b]) => (
          <div key={i} className="grid grid-cols-[36px_1fr_1fr] items-center gap-1">
            <span className="font-mono text-xs text-white/35">{i / 2 + 1}.</span>
            {cell(w, i)}
            {cell(b, i + 1)}
          </div>
        ))}
      </div>
    </section>
  );
}
