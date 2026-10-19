import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  // A real PCM WAV checks decoding/playback, rather than merely checking the JSON path.
  const samples = 1103,
    wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(22050, 24);
  wav.writeUInt32LE(44100, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let n = 0; n < samples; n++)
    wav.writeInt16LE(Math.round(Math.sin(n * 0.1) * 2000), 44 + n * 2);
  await page.route("**/custom-assets.json", (r) =>
    r.fulfill({
      json: {
        characters: {
          kai: {
            portrait: "/mods/test-face.svg",
            sheet: "/mods/test-sheet.svg",
            frameWidth: 160,
            frameHeight: 128,
            animations: {
              idle: { row: 0, frames: 2 },
              u: { row: 0, frames: 2 },
            },
          },
        },
        sounds: { hit: "/mods/test-hit.wav" },
      },
    }),
  );
  await page.route("**/mods/test-face.svg", (r) =>
    r.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="128"><path fill="#0cde22" d="M0 0h160v128H0z"/></svg>',
    }),
  );
  await page.route("**/mods/test-sheet.svg", (r) =>
    r.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="128"><path fill="#ff00ff" d="M0 0h160v128H0z"/><path fill="#00ffff" d="M160 0h160v128H160z"/></svg>',
    }),
  );
  await page.route("**/mods/test-hit.wav", (r) =>
    r.fulfill({ contentType: "audio/wav", body: wav }),
  );
  await page.addInitScript(() => {
    window.modAudio = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.modAudio.push(this.buffer?.duration);
      return start.apply(this, args);
    };
  });
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:5173");
  await page.waitForFunction(() => {
    const c = document.getElementById("game"),
      data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    for (let n = 0; n < data.length; n += 4)
      if (
        (data[n] === 255 && data[n + 1] === 0 && data[n + 2] === 255) ||
        (data[n] === 0 && data[n + 1] === 255 && data[n + 2] === 255)
      )
        return true;
    return false;
  });
  await page.locator("#character-button").click();
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-character="kai"] canvas'),
      pixel = c?.getContext("2d").getImageData(10, 10, 1, 1).data;
    return pixel?.[0] === 12 && pixel[1] === 222 && pixel[2] === 34;
  });
  await page.locator("#practice-behavior").selectOption("dummy");
  await page.locator("#confirm-character").click();
  await page.waitForFunction(() => window.axis.state.phase === "fight");
  await page.keyboard.down("d");
  await page.waitForFunction(() => {
    const [a, b] = window.axis.state.fighters;
    return b.x - a.x < 1.05;
  });
  await page.keyboard.up("d");
  await page.keyboard.press("u");
  await page.waitForTimeout(800);
  await page.keyboard.press("u");
  await page.waitForFunction(() =>
    window.modAudio.some((t) => t > 0.049 && t < 0.051),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real custom portrait pixels, animated sheet pixels and decoded WAV playback through the application",
  );
} finally {
  await browser.close();
}
