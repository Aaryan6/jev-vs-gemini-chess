# Jev vs Gemini Decision: chess

TypeSafe's **Jev** (`jev-1.14.0`) plays chess against Google's **Gemini Decision 1** (`gemini-decision-1`, Decisions API, v1beta).

Neither model writes text. Each turn, `src/lib/position.ts` lists every legal move with facts that code computes (captures, checks, hanging pieces, mate threats). The model on move gets the same JSON state and answers two questions in one request:

- `move`: a Choice over the legal moves, with a probability for each
- `eval`: a 7-level Score for who is better, from White's side

`src/lib/players.ts` holds both integrations. `src/app/api/move/route.ts` checks the history and returns the pick. The browser runs the match loop.

## Setup

`.env.local`:

```
TYPESAFE_API_KEY=...
GEMINI_API_KEY=...
# optional overrides
JEV_MODEL=jev-1.14.0
GEMINI_DECISION_MODEL=gemini-decision-1
```

```
pnpm install
pnpm dev
```

The "move facts" toggle turns off the code-computed hints, so both models see only piece and squares.
