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
