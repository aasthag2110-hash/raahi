import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the public demo entry and branded trek flow", async () => {
  const source = await readFile(new URL("app/RaahiApp.tsx", root), "utf8");
  assert.match(source, /Enter Raahi demo/);
  assert.match(source, /raahi-logo\.png/);
  assert.match(source, /Choose your trek/);
  assert.doesNotMatch(source, /signin-with-chatgpt/);
});

test("users choose an available trek before opening its map", async () => {
  const source = await readFile(new URL("app/RaahiApp.tsx", root), "utf8");
  assert.match(source, /Which trek are you planning/);
  assert.match(source, /Hampta Pass/);
  assert.match(source, /Offline map ready/);
  assert.match(source, /Kedarkantha/);
  assert.match(source, /Sandakphu/);
  assert.match(source, /Continue to/);
  assert.match(source, /Coming soon/);
});

test("ships a traceable Hampta Pass offline baseline", async () => {
  const pack = JSON.parse(await readFile(new URL("public/hampta-pack.json", root), "utf8"));
  assert.equal(pack.schemaVersion, 2);
  assert.equal(pack.trailId, "HAMPTA");
  assert.equal(pack.routes[0].relationId, 11230779);
  assert.ok(pack.routes[0].geometry.coordinates.length >= 360);
  assert.ok(pack.distanceKm > 20);
  assert.equal(pack.points.filter((point) => point.type === "CROSSING").length, 2);
  assert.ok(pack.points.some((point) => point.name === "Hamta Pass"));
  assert.ok(!pack.points.some((point) => point.type === "SHELTER" || point.type === "WATER"));
  assert.match(pack.routeNotice, /not a safety recommendation/);
  assert.match(pack.attribution, /OpenStreetMap contributors/);
});

test("ships a versioned OSM-attributed journey pack", async () => {
  const pack = JSON.parse(await readFile(new URL("public/triund-pack.json", root), "utf8"));
  assert.equal(pack.schemaVersion, 2);
  assert.equal(pack.trailId, "TRIUND");
  assert.equal(pack.routes.length, 2);
  assert.ok(pack.routes.every((route) => route.geometry.type === "LineString"));
  assert.ok(pack.routes.every((route) => route.geometry.coordinates.length > 500));
  assert.ok(pack.routes.some((route) => route.classification === "PREFERRED_DEMO_BASELINE"));
  assert.equal(pack.checkpoints.length, 5);
  assert.ok(pack.points.some((point) => point.type === "SHELTER"));
  assert.ok(pack.points.some((point) => point.type === "DISRUPTION"));
  assert.doesNotMatch(JSON.stringify(pack.points), /Forest Bend shelter/);
  assert.match(pack.attribution, /OpenStreetMap contributors/);
  assert.match(pack.routeNotice, /Verify against forest authorities/);
});

test("stores the journey pack in IndexedDB for offline use", async () => {
  const source = await readFile(new URL("app/RaahiApp.tsx", root), "utf8");
  assert.match(source, /indexedDB\.open\("raahi-offline",1\)/);
  assert.match(source, /objectStore\("journey-packs"\)/);
  assert.match(source, /hampta-pack\.json/);
  assert.match(source, /Continue to \{selectedTrek\.name\} map/);
  assert.match(source, /setJourneyStarted\(true\)/);
  assert.match(source, /className="side-nav"/);
  assert.match(source, /className="brand-logo"/);
  const logo = await readFile(new URL("public/raahi-logo.png", root));
  assert.ok(logo.length > 1000);
  assert.match(source, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(source, /Available offline/);
});
