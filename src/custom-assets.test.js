import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAssetConfig } from "./custom-assets.js";
test("custom assets accept local portraits, animation rows and per-move sound overrides", () => {
  const config = parseAssetConfig({
    characters: {
      ren: {
        portrait: "/mods/ren.png",
        sheet: "/mods/ren-sheet.png",
        frameWidth: 160,
        frameHeight: 128,
        animations: {
          idle: { row: 0, frames: 4 },
          upper: { row: 1, frames: 6, fps: 30 },
          unknown: { row: 2, frames: 3 },
        },
      },
    },
    sounds: { "ren.upper": "/mods/kick.wav", hit: "/mods/hit.ogg" },
  });
  assert.equal(config.characters.ren.animations.upper.frames, 6);
  assert.equal(config.characters.ren.animations.unknown, undefined);
  assert.equal(config.sounds["ren.upper"], "/mods/kick.wav");
  assert.equal(
    parseAssetConfig({
      characters: {
        kai: {
          portrait: "https://example.com/x.png",
          sheet: "/mods/../secret",
          frameWidth: 1,
          frameHeight: 1,
        },
      },
      sounds: { hit: "/mods/../file" },
    }).characters.kai.portrait,
    undefined,
  );
});

test("a complete eight-part rig is accepted, incomplete or remote rigs use the normal renderer", () => {
  const keys = [
    "head",
    "torso",
    "upperArm",
    "forearm",
    "hand",
    "thigh",
    "shin",
    "foot",
  ];
  const rig = Object.fromEntries(
    keys.map((key) => [key, { src: `/mods/${key}.png`, width: 12 }]),
  );
  const parsed = parseAssetConfig({ characters: { kai: { rig } } });
  assert.equal(Object.keys(parsed.characters.kai.rig).length, 8);
  assert.equal(parsed.characters.kai.rig.upperArm.width, 12);
  delete rig.head;
  assert.equal(
    parseAssetConfig({ characters: { kai: { rig } } }).characters.kai.rig,
    undefined,
  );
});

test("one skin atlas maps all eight cells and rejects nonlocal paths", () => {
  const p = parseAssetConfig({
    characters: {
      kai: { skin: "/mods/test.png" },
      ren: { skin: "https://example.com/x.png" },
    },
  }).characters;
  assert.equal(Object.keys(p.kai.rig).length, 8);
  assert.deepEqual(p.kai.rig.head.cell, [0, 0]);
  assert.deepEqual(p.kai.rig.foot.cell, [3, 1]);
  assert.equal(p.kai.rig.torso.src, "/mods/test.png");
  assert.equal(p.ren.rig, undefined);
});
