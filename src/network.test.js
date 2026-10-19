import { test } from "node:test";
import assert from "node:assert/strict";
import { validSnapshot } from "./network.js";
import { createMatch } from "./combat.js";
test("v3 snapshots accept four-fighter roster and infinite world coordinates", () => {
  const m = createMatch(["mira", "goro"]);
  m.fighters[0].x = 30000;
  m.fighters[1].z = -12000;
  assert.ok(validSnapshot(m));
  m.version = 2;
  assert.equal(validSnapshot(m), false);
});
test("invalid characters, command histories and camera/hitstop data are rejected", () => {
  let m = createMatch();
  m.fighters[0].character = "unknown";
  assert.equal(validSnapshot(m), false);
  m = createMatch();
  m.fighters[0].commands = [{ dir: 99, at: 0 }];
  assert.equal(validSnapshot(m), false);
  m = createMatch();
  m.axisAngle = Infinity;
  assert.equal(validSnapshot(m), false);
  m = createMatch();
  m.hitstop = 20;
  assert.equal(validSnapshot(m), false);
});
