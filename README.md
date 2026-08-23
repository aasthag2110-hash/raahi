# Raahi

**The map shows the trail. Raahi shows what changed.**

Raahi is an offline-first decision-support prototype for occasional mountain travellers. It combines trail segments, weather freshness, traveller observations and journey progress into compact journey packs, with Exasol powering the connected evidence and decision layer.
<img width="900" height="600" alt="image" src="https://github.com/user-attachments/assets/44ad959f-36de-410a-8a43-084e83f2490c" /> 
<img width="900" height="600" alt="image" src="https://github.com/user-attachments/assets/5aca0623-0889-4d80-adb7-e157b08eaf1f" />
<img width="900" height="600" alt="image" src="https://github.com/user-attachments/assets/f7dc8563-e9d0-4184-9311-4b1fa8c651e0" />
<img width="900" height="600" alt="image" src="https://github.com/user-attachments/assets/d8d6f6ae-a2e6-4808-9e0a-f64deb788ff5" />
<img width="900" height="600" alt="image" src="https://github.com/user-attachments/assets/dd72979f-6258-4e43-b14a-d7760cfbb103" />





## The problem

Mountain travellers often lose connectivity exactly when trail conditions, daylight, battery and recent disruption reports matter most. A conventional map can show the planned path, but it does not explain whether the assumptions behind that plan have changed. Raahi turns fragmented trail evidence into a compact, explainable decision checkpoint that remains available offline.

## Live project

- Demo Video: https://drive.google.com/file/d/1EmqOTsHKrsonkZJjvKvedHsv7xReoYd-/view?usp=sharing
- Application: https://raahi-nu.vercel.app
- Pitch Deck(ppt): https://docs.google.com/presentation/d/1Z4YOYelI8YpPCLz0AAUnsRVU3xfXefoK/edit?usp=sharing&ouid=110081491359284643273&rtpof=true&sd=true
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

## Why Exasol

Exasol is Raahi's analytical decision layer. It brings trail structure, time-sensitive observations and traveller reports together before the relevant result is packaged for offline use.

The `RAAHI` schema models:

- trails, ordered trail segments and fallback segments
- traveller disruption reports with device-generated `REPORT_ID` idempotency keys
- segment verifications and expiring observations
- weather observations and resource points such as water and shelter
- configurable decision thresholds in `RAAHI.DECISION_RULES`

The `RAAHI.SEGMENT_EVIDENCE` analytical view uses Exasol SQL to combine corroboration, source quality, recency and hazard severity. It produces two deliberately separate outputs:

- `EVIDENCE_CONFIDENCE`: how strongly the available information is supported
- `SEGMENT_CONDITION`: the current disruption state, from no reported disruption through caution, disrupted and avoid

This separation is central to Raahi: several trustworthy reports of a damaged bridge should increase confidence in the evidence while making the route condition worse. FastAPI queries this view and the enabled decision rules to create an explainable journey-pack response, while report synchronization uses `REPORT_ID` to make offline retries idempotent.

Example Exasol query:

```sql
SELECT
  SEGMENT_ID,
  EVIDENCE_CONFIDENCE,
  HAZARD_POINTS,
  SEGMENT_CONDITION
FROM RAAHI.SEGMENT_EVIDENCE
WHERE TRAIL_ID = 'TRIUND'
ORDER BY SEGMENT_ID;
```

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

The web demo now supports creating a party, joining with an invite code or shared link, storing membership locally, sharing the invite through the device share sheet, leaving a party, and saving an offline regroup point. These browser-level flows are functional, but there is no central membership verification yet.

Nearby-member scanning and distances remain a clearly labelled simulation. Production tracking is final-app scope and requires a native mobile implementation using Bluetooth Low Energy, secure QR pairing, rotating anonymous identifiers, foreground/background permissions, and appropriate privacy and battery controls.

## Demo story

1. Download the Triund journey pack.
2. Switch Raahi offline and adjust pace, daylight or battery.
3. Review the Decision Checkpoint triggered by database-defined rules.
4. Save a damaged-bridge report while offline.
5. Reconnect and synchronize it using its unique report ID.
6. Review the Trust Receipt: corroboration raises evidence confidence while the hazard worsens segment condition.

Raahi never labels a route “safe.” It exposes evidence, uncertainty and changed assumptions.

## Hackathon judge walkthrough

1. Choose Triund or Hampta Pass and download its journey pack.
2. Open the route view to inspect alternatives, checkpoints and mapped trail resources.
3. Switch to offline mode and change pace, daylight or battery inputs to trigger an explainable Decision Checkpoint.
4. Add a disruption report offline, reconnect and synchronize it with the device-generated report ID.
5. Inspect the Trust Receipt to see why evidence confidence and segment condition are scored independently.
6. Create a Trail Party, share its invite code and save an offline regroup point.
7. In Exasol, query `RAAHI.SEGMENT_EVIDENCE` and `RAAHI.DECISION_RULES` to show the analytical layer behind the journey-pack decisions.

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

## Run locally with Exasol

This guide runs the full local development stack: the Next.js frontend, the FastAPI backend and Exasol Personal. The current frontend still reads its bundled journey-pack JSON directly; the running API demonstrates the Exasol-backed journey-pack and report-sync endpoints until frontend API integration is completed.

### Prerequisites

- Git
- Node.js 20.9 or newer and npm
- Python 3.10 or newer
- Exasol Personal installed and running

### 1. Clone the project

```bash
git clone https://github.com/aasthag2110-hash/raahi.git
cd raahi
```

### 2. Install the frontend dependencies

```bash
npm install
```

### 3. Start and verify Exasol

```bash
exasol start
exasol info
exasol connect -c "SELECT 1;"
```

The final command should return `1`. The default Exasol Personal SQL endpoint is `127.0.0.1:8563`.

### 4. Create the Raahi database objects

Open the Exasol SQL terminal:

```bash
exasol connect
```

Run the contents of `database/schema.sql` first, followed by `database/seed.sql`. The schema file creates the `RAAHI` schema and its tables and views; the seed file adds the initial trails, segments, evidence and decision rules.

### 5. Configure and install the FastAPI backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set the Exasol connection values:

```dotenv
EXASOL_DSN=127.0.0.1:8563
EXASOL_USER=sys
EXASOL_PASSWORD=your-exasol-password
```

The `LLM_API_*` values are optional and are only used by the report-extraction endpoint. Do not commit `backend/.env` or any real credentials.

Load the environment variables and start the API from the repository root:

```bash
set -a
source backend/.env
set +a
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Keep this terminal running. Verify the API at:

- Health check: http://127.0.0.1:8000/health
- Interactive API documentation: http://127.0.0.1:8000/docs

The health response should report `"database": "exasol"`.

### 6. Start the frontend

Open a second terminal in the repository and run:

```bash
npm run dev
```

Open http://localhost:3000 in a browser. Keep Exasol, FastAPI and the frontend running while testing the local development stack.

### Troubleshooting

- If `exasol` is not found, finish the Exasol Personal installation or reopen the terminal so its CLI is on your `PATH`.
- If the API cannot connect, confirm that Exasol is running, the DSN is `127.0.0.1:8563`, and the username and password in `backend/.env` are correct.
- If `/health` reports `"database": "demo"`, the Exasol environment variables were not loaded. Run the `set -a`, `source` and `set +a` commands again before starting Uvicorn.
- If port 3000 or 8000 is already in use, stop the older Raahi process before starting a new one.
- `localhost` only refers to the device on which the server is running. For testing from a phone on the same Wi-Fi network, start the frontend with `npm run dev -- --hostname 0.0.0.0` and open the computer's local network IP address with port 3000. Firewall permission may be required.


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

## Prototype scope and responsible use

This hackathon build validates the complete product concept: offline journey packs, explainable checkpoints, idempotent reporting, Exasol evidence analytics and Trail Party pairing. The browser experience uses bundled journey packs so it can be demonstrated reliably on Vercel and without connectivity; the included FastAPI service exposes the Exasol-backed journey-pack and report-sync path for local evaluation. A production rollout would host that service and Exasol securely, add verified trail data sources and implement real proximity exchange in the planned native mobile app.

The included trail metadata and traveller observations are demonstration data. Raahi is decision support—not a certified navigation, rescue or safety service—and should be used alongside official advisories, local guides and personal judgement.
