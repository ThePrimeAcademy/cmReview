# cmReview

Review ClassMarker results by group → subtest → question, ranked **most-missed → least-missed**, with full question detail (text, options, correct answer, answer distribution, per-student attempts).

Data comes from the progressReport production backend, which stores every ClassMarker webhook result. cmReview syncs from its token-protected export endpoint and caches everything locally — no direct ClassMarker API access needed.

## Setup (one time)

```bash
npm run install:all
cp backend/.env.example backend/.env   # then fill in EXPORT_TOKEN
```

`EXPORT_TOKEN` must match the `EXPORT_TOKEN` env var on the progressReport Railway service (Railway dashboard → progressReport → Variables).

## Run

```bash
npm run dev        # backend on :4180, frontend on :5180 (open http://localhost:5180)
```

First launch with empty data auto-syncs. The **Sync** button in the top bar pulls anything new (incremental — only records received since last sync).

## How it works

```
ClassMarker webhooks ──► progressReport (Railway, SQLite)
                              │  GET /api/webhooks/classmarker/export   (Bearer EXPORT_TOKEN)
                              ▼
                    backend/data/{attempts,bank,meta}.json
                              │  /api/groups … /api/groups/:g/tests/:t/questions/:q
                              ▼
                       React UI (Vite, :5180)
```

- **attempts.json** — one row per test attempt (results + student responses per question)
- **bank.json** — deduped question content (text/options/correct answer) keyed by question id
- "Missed" = `incorrect` or `unanswered`. Partial credit counts as not-missed; `requires_grading` is excluded from the rate.

## Tests

```bash
npm test           # backend aggregation unit tests (node --test)
```
