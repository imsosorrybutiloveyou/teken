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
  assert.throws(() => decodeDescription("AXIS1.broken", "offer"));
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
