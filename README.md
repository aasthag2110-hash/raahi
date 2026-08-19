# Raahi

**The map shows the trail. Raahi shows what changed.**

Raahi is an offline-first decision-support prototype for occasional mountain travellers. It combines trail segments, weather freshness, traveller observations and journey progress into compact journey packs generated from Exasol.

## Demo story

1. Download the Triund journey pack.
2. Switch Raahi offline and adjust pace, daylight or battery.
3. Review the Decision Checkpoint triggered by database-defined rules.
4. Save a damaged-bridge report while offline.
5. Reconnect and synchronize it using its unique report ID.
6. Review the Trust Receipt: corroboration raises evidence confidence while the hazard worsens segment condition.

Raahi never labels a route “safe.” It exposes evidence, uncertainty and changed assumptions.

## Architecture

- React/TypeScript PWA: journey experience, local decision evaluation and offline queue
- FastAPI: journey-pack and idempotent report-sync endpoints
- Exasol Personal: primary platform for reports, routes, decision rules and evidence analytics
- Local storage/service worker: hackathon demo cache; production would use IndexedDB

## Run locally

Web application: run npm install, then npm run dev. Node.js 22.13 or newer is required.

API: create a Python virtual environment, install backend/requirements.txt, then run uvicorn backend.main:app --reload.

Without Exasol variables, the API starts in clearly labelled demo mode. Copy backend/.env.example, provide the Exasol Personal connection values, then apply database/schema.sql followed by database/seed.sql.

## Core consistency rules

- REPORT_ID is created on-device and is the sync idempotency key.
- Evidence confidence and segment condition are separate measures.
- Decision thresholds live in RAAHI.DECISION_RULES and travel inside each offline pack.
- Active reports expire by type; official closures cannot be overridden by community reports.
- Safety language describes evidence or changed assumptions, never guaranteed safety.
- Trail Party stores an offline regroup point and shows last-seen peer proximity. The web demo simulates beacon exchange; production requires native Bluetooth Low Energy with explicit permissions.

## API

- GET /health
- GET /journey-packs/{trail_id}
- POST /reports/sync
- POST /reports/extract

## Limitations

The included trail metadata and traveller observations are demonstration data. Raahi is not a certified navigation, rescue or safety service and does not replace official advisories, local guides or personal judgement.
