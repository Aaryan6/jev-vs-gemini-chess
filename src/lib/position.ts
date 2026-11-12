import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";

/**
 * Both decision models see exactly the same thing: one JSON state and one
 * closed set of legal moves. Neither model searches or calculates, so code
 * owns the chess facts (captures, checks, hanging pieces, mate threats) and
 * writes them into each option's description. The model owns the judgment:
 * which of these moves is best.
 */

const NAME: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const side = (c: Color) => (c === "w" ? "white" : "black");
const other = (c: Color): Color => (c === "w" ? "b" : "w");

/** Replays SAN moves from the start position. Throws on an illegal move. */
export function replay(moves: string[]): Chess {
  const game = new Chess();
  for (const san of moves) game.move(san);
  return game;
}

function material(game: Chess) {
  const total = { w: 0, b: 0 };
  for (const row of game.board()) for (const sq of row) if (sq) total[sq.color] += VALUE[sq.type];
  return total;
}

function pieceList(game: Chess, color: Color): string[] {
  const out: string[] = [];
  for (const row of game.board())
    for (const sq of row)
      if (sq && sq.color === color) out.push(`${NAME[sq.type]} ${sq.square}`);
  return out;
}

/** Rows from rank 8 to rank 1, uppercase white, lowercase black, "." empty. */
function diagram(game: Chess): string[] {
  return game.board().map(
    (row, i) =>
      `${8 - i} ` +
      row.map((sq) => (sq ? (sq.color === "w" ? sq.type.toUpperCase() : sq.type) : ".")).join(" "),
  );
}

function numbered(history: string[], last = 16): string {
  const start = Math.max(0, history.length - last);
  const parts: string[] = [];
  for (let i = start; i < history.length; i++) {
    const n = Math.floor(i / 2) + 1;
    if (i % 2 === 0) parts.push(`${n}. ${history[i]}`);
    else parts.push(i === start ? `${n}... ${history[i]}` : history[i]);
  }
  return parts.join(" ") || "(no moves yet)";
}

/** Facts about one legal move, computed by playing it and looking around. */
function describe(game: Chess, m: Move, withFacts: boolean): string {
  const me = m.color;
  const opp = other(me);
  let text = `${NAME[m.piece]} ${m.from} to ${m.to}`;
  if (m.isKingsideCastle()) text = "castle kingside";
  if (m.isQueensideCastle()) text = "castle queenside";
  if (m.captured) text += `, captures ${NAME[m.captured]} (+${VALUE[m.captured]})`;
  if (m.promotion) text += `, promotes to ${NAME[m.promotion]}`;
  if (!withFacts) return text;

  const facts: string[] = [];
  game.move(m.san);
  try {
    if (game.isCheckmate()) return `${text}. CHECKMATE, wins the game.`;
    if (game.isStalemate()) facts.push("stalemates the opponent (draw)");
    else if (game.isThreefoldRepetition()) facts.push("repeats the position a third time (draw)");
    else if (game.isDraw()) facts.push("ends the game in a draw");
    if (game.inCheck()) facts.push("gives check");

    // Is the piece that moved safe where it landed?
    const landed = m.promotion ?? m.piece;
    if (landed !== "k") {
      const attackers = game.attackers(m.to, opp);
      if (attackers.length) {
        const cheapest = Math.min(...attackers.map((sq) => VALUE[game.get(sq as Square)!.type] || 99));
        const defended = game.attackers(m.to, me).length > 0;
        if (!defended) facts.push(`leaves the ${NAME[landed]} undefended and attacked (can lose ${VALUE[landed]})`);
        else if (cheapest < VALUE[landed])
          facts.push(`the ${NAME[landed]} can be taken by a cheaper piece (risk ${VALUE[landed] - cheapest})`);
      }
    }

    // Does it let the opponent mate right away?
    for (const reply of game.moves({ verbose: true })) {
      game.move(reply.san);
      const mated = game.isCheckmate();
      game.undo();
      if (mated) {
        facts.push(`BLUNDER: allows ${reply.san} checkmate`);
        break;
      }
    }
  } finally {
    game.undo();
  }
  return facts.length ? `${text}. ${facts.join("; ")}.` : `${text}.`;
}

export type MoveOption = { san: string; from: Square; to: Square; text: string };

export function buildPosition(game: Chess, withFacts = true) {
  const me = game.turn();
  const legal = game.moves({ verbose: true });
  const options: MoveOption[] = legal.map((m) => ({
    san: m.san,
    from: m.from,
    to: m.to,
    text: describe(game, m, withFacts),
  }));
  const mat = material(game);

  const state = {
    you_play: side(me),
    move_number: game.moveNumber(),
    position: {
      fen: game.fen(),
      board: diagram(game),
      board_legend: "Rank 8 at top, files a-h left to right. Uppercase = white, lowercase = black, . = empty.",
      white_pieces: pieceList(game, "w"),
      black_pieces: pieceList(game, "b"),
      material: { white: mat.w, black: mat.b },
      side_to_move: side(me),
      in_check: game.inCheck(),
    },
    recent_moves: numbered(game.history()),
  };

  return { state, options };
}

export const MOVE_INSTRUCTIONS =
  "You are a strong chess player playing `you_play` and it is your move in the position in `position`. " +
  "Each option is one of your legal moves with facts computed about it. " +
  "Which move is the strongest? Win material when it is safe, never hang pieces, keep your king safe, " +
  "develop and control the center in the opening, and deliver checkmate whenever an option says CHECKMATE.";

export const EVAL_INSTRUCTIONS =
  "Judge the chess position in `position` (material, king safety, piece activity, threats). " +
  "Who stands better right now, from White's point of view?";

/** Score levels, lowest to highest. Index 3 is equal. */
export const EVAL_LEVELS = [
  "Black is winning decisively",
  "Black is clearly better",
  "Black is slightly better",
  "The position is roughly equal",
  "White is slightly better",
  "White is clearly better",
  "White is winning decisively",
];
