# Raahi

**The map shows the trail. Raahi shows what changed.**

Raahi is an offline-first decision-support prototype for occasional mountain travellers. It combines trail segments, weather freshness, traveller observations and journey progress into compact journey packs generated from Exasol.

## Live project

- Application: https://raahi-ee752pi60-guptaaastha2410-1177s-projects.vercel.app/
- Source: https://github.com/aasthag2110-hash/raahi

## Features

- Trek selection with downloadable packs for Triund and Hampta Pass
- Offline routes, mapped alternatives, checkpoints and important trail points
- Browser GPS position, accuracy and approximate distance from the selected route baseline
- Pace, daylight, battery and corroboration-based decision checkpoints
- Offline disruption reports with device-generated, idempotent report IDs
- Trust receipts that keep evidence confidence separate from hazard condition
- Trail Party proximity, separation state and a shared offline regroup point
- Exasol-backed evidence analytics and database-defined decision rules

## Map data and rendering

Raahi does not use Google Maps. Its current journey packs contain route geometry and traceable features derived from OpenStreetMap hiking relations, ways and nodes under ODbL 1.0:

- Triund: OpenStreetMap relation 15522720
- Hampta Pass: OpenStreetMap relation 11230779

The application stores the coordinates as JSON and projects them into a custom SVG route view. It does not currently download raster map tiles or a complete topographic basemap. This produces a compact offline route diagram, not a replacement for an authoritative topographic map. OpenStreetMap features can be incomplete or outdated and must be verified locally.

## Where the demo data comes from

| Information | Current source |
|---|---|
| Route geometry and mapped points | Bundled OpenStreetMap-derived journey-pack JSON |
| Device position | Browser `navigator.geolocation`, after user permission |
| Offline packs | IndexedDB database `raahi-offline` |
| Offline reports | Browser localStorage |
| Pace, daylight and battery | User-controlled demo sliders |
| Friend proximity | Simulated Trail Party records |
| Decision rules | Demo defaults and the Exasol `RAAHI.DECISION_RULES` design |
| Evidence analytics | Exasol `RAAHI.SEGMENT_EVIDENCE` when the backend is connected |

The current demo does not automatically read device battery level, and pace is not calculated from GPS history.

## Trail Party

Trail Party demonstrates last-seen group proximity, approximate distance, separation state and an agreed regroup point saved with the offline journey context. It is designed around short-lived proximity beacons between paired phones, without continuous internet location upload.

The current web experience is a simulation and does not yet track real friends. Production tracking requires a native mobile implementation using Bluetooth Low Energy, secure pairing, rotating anonymous identifiers, foreground/background permissions, and appropriate privacy and battery controls.

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
- IndexedDB/service worker: device-local offline journey packs and report queue

```text
Online preparation:
Device → Vercel frontend → journey-pack JSON → IndexedDB

Offline journey:
GPS → browser Geolocation API
IndexedDB → custom SVG route view
localStorage → pending reports
offline thresholds → decision checkpoint

Full connected architecture:
Next.js frontend → FastAPI → Exasol
```

The public Vercel demo works on modern devices because its current packs are static assets. FastAPI and Exasol Personal still run locally and are not used by the deployed frontend. Live multi-device synchronization requires a hosted API and a securely reachable Exasol deployment. Each phone must download its own offline pack before losing connectivity.

## Run locally

Web application: run npm install, then npm run dev. Node.js 20.9 or newer is required.

## Deploy the frontend to Vercel

The public demo is a standard Next.js application. Import this repository in Vercel or run `vercel deploy`. The Triund and Hampta journey packs are bundled as static assets and remain downloadable into IndexedDB for offline use.

The included FastAPI/Exasol service is not required for the frontend demo. Production report synchronization requires a separately reachable Exasol SaaS or cloud deployment and secure backend environment variables. Never commit Exasol credentials.

API: create a Python virtual environment, install backend/requirements.txt, then run uvicorn backend.main:app --reload.

Without Exasol variables, the API starts in clearly labelled demo mode. Copy backend/.env.example, provide the Exasol Personal connection values, then apply database/schema.sql followed by database/seed.sql.

## Core consistency rules

- REPORT_ID is created on-device and is the sync idempotency key.
- Evidence confidence and segment condition are separate measures.
- Decision thresholds live in RAAHI.DECISION_RULES and travel inside each offline pack.
- Active reports expire by type; official closures cannot be overridden by community reports.
- Safety language describes evidence or changed assumptions, never guaranteed safety.
- Trail Party stores an offline regroup point and shows last-seen peer proximity. The web demo simulates beacon exchange; production requires native Bluetooth Low Energy with explicit permissions.

## Trek status

- Triund: downloadable offline pack
- Hampta Pass: downloadable OSM baseline; shelters and water are intentionally omitted until verified
- Kedarkantha, Valley of Flowers, Sandakphu–Phalut, Tawang–Mago, Goechala and Kumara Parvatha: planned

## Roadmap

- Add verified packs for more treks
- Add a complete offline topographic basemap
- Calculate pace from consented GPS history
- Integrate supported device battery information
- Build native BLE pairing and real Trail Party proximity
- Host FastAPI and Exasol for public synchronization
- Add production authentication and group privacy controls
- Integrate authoritative weather, permit and disruption sources

## API

- GET /health
- GET /journey-packs/{trail_id}
- POST /reports/sync
- POST /reports/extract

## Limitations

The included trail metadata and traveller observations are demonstration data. Raahi is not a certified navigation, rescue or safety service and does not replace official advisories, local guides or personal judgement.
