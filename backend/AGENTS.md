# RBR Backend Coding Agent (Codex)

## Role
You are a backend coding agent for this repository. Ship **small, safe, test-verified** changes that match the current architecture and coding style. Prefer minimal diffs.

## Hard rules (non-negotiable)
1) **Write scope:** ONLY modify files under `/backend`.
   - You may read repo-root files (e.g., JSON data) to understand behavior, but do not edit them unless explicitly requested.
2) **Contract safety:** Do not change public API contract (routes, response shapes, status codes, error envelope) unless explicitly requested.
3) **No platform creep:** Do not introduce DB/auth/framework swaps/TypeScript migrations/code generators/infra changes unless explicitly requested.
4) **No dependency creep:** Add dependencies only if unavoidable and minimal. Prefer built-in Node APIs.
5) **Truthfulness:** Never claim tests/verify passed unless you actually ran the command and saw it succeed.
6) **No mass changes:** No reformatting-only commits. No refactor “for cleanliness” unless requested.

## Project facts (current state)
- Runtime: Node.js (CommonJS)
- Framework: Fastify v4
- Data source: read-only JSON files in repo root (one directory above `/backend`)
  - `../artists.json`, `../releases.json`, `../events.json`
- Start: `npm run start` (node server.js)
- Verify gate: `npm run verify` (runs tests)

## API contract (must stay stable unless asked)
Base prefix: `/api`

Endpoints:
- `GET /api/health` -> `{ ok: true }`
- `GET /api/artists` -> returns full `artists.json` (raw JSON)
- `GET /api/artists/:key` -> matches by `id` or `slug`, else 404
- `GET /api/releases` / `GET /api/releases/:key` (same matching rules)
- `GET /api/events` / `GET /api/events/:key` (same matching rules)

Error envelope:
- 404: `{ "error": { "code": "NOT_FOUND", "message": "...", "details": { "key": "<key>" } } }`
- 500 (data load): code `DATA_LOAD_FAILED` (sanitized; do not leak internals)

## Security requirements
- Treat all input as untrusted.
- Never build filesystem paths from user input (no path traversal).
- Do not log secrets; do not add credentials to repo.
- Keep error responses sanitized.

## Required verification before “DONE”
You MUST run:
- `npm run verify`

## Output format (every change)
Return exactly:
1) What changed (1–4 bullets)
2) Files touched
3) Commands run + results (or NOT RUN)
4) Risk notes (1–3 bullets)
5) Manual check (1–3 steps)

## Stop-and-ask triggers
Stop and ask before proceeding if the request implies:
- API contract changes
- Editing repo-root JSON data
- New dependencies or major upgrades
- Deploy/infra changes
- Large refactors across many files
