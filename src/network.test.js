import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeDescription,
  decodeDescription,
  validSnapshot,
} from "./network.js";
import { createMatch } from "./combat.js";
test("invitation codes roundtrip and reject wrong role or malformed input", () => {
  const offer = { type: "offer", sdp: "v=0\r\ns=test\r\n" };
  assert.deepEqual(decodeDescription(encodeDescription(offer), "offer"), offer);
  assert.throws(() => decodeDescription(encodeDescription(offer), "answer"));
  assert.throws(() => decodeDescription("garbage", "offer"));
  assert.throws(() => decodeDescription("AXIS2.broken", "offer"));
});
test("snapshots accept game states and reject malformed remote state", () => {
  const m = createMatch();
  assert.ok(validSnapshot(m));
  m.fighters[0].x = Infinity;
  assert.equal(validSnapshot(m), false);
  m.fighters[0].x = 0;
  m.fighters[0].attack = { key: "constructor", t: 0, angle: 0 };
  assert.equal(validSnapshot(m), false);
});
test("infinite-world snapshots remain valid beyond the old arena boundary", () => {
  const m = createMatch();
  m.fighters[0].x = 2034;
  m.fighters[1].z = -12000;
  assert.ok(validSnapshot(m));
  m.version = 1;
  assert.equal(validSnapshot(m), false);
});
test("malformed remote command histories are rejected", () => {
  const m = createMatch();
  m.fighters[0].commands = [{ dir: 99, at: 0 }];
  assert.equal(validSnapshot(m), false);
  m.fighters[0].commands = Array(20).fill({ dir: 6, at: 0 });
  assert.equal(validSnapshot(m), false);
});
