import { test } from "node:test";
import assert from "node:assert/strict";
import { validSnapshot } from "./network.js";
import { createMatch } from "./combat.js";
test("v8 snapshots accept four-fighter roster and infinite world coordinates", () => {
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

test("juggle and landing state are validated for new moves", () => {
  const m = createMatch();
  m.fighters[0].attack = { key: "bound", t: 0.15, angle: 0 };
  m.fighters[1].airHits = 4;
  m.fighters[1].bounceUsed = true;
  assert.ok(validSnapshot(m));
  m.fighters[1].airHits = 8;
  assert.ok(validSnapshot(m));
  m.fighters[1].airHits = 1000001;
  assert.equal(validSnapshot(m), false);
  m.fighters[1].airHits = 2;
  m.fighters[1].bouncePending = "yes";
  assert.equal(validSnapshot(m), false);
});

test("knockdown duration is bounded and advanced attack keys are accepted", () => {
  const m = createMatch();
  m.fighters[1].downTime = 0.5;
  m.fighters[0].attack = { key: "hellSweep", t: 0.2, angle: 0 };
  assert.ok(validSnapshot(m));
  m.fighters[1].downTime = -1;
  assert.equal(validSnapshot(m), false);
  m.fighters[1].downTime = 10;
  assert.equal(validSnapshot(m), false);
});
