import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
  const example = await fetch(base + "/rig-example.json").then((r) => r.json());
  await page.route("**/custom-assets.json", (r) =>
    r.fulfill({ json: example }),
  );
  await page.addInitScript(() => {
    window.rigDraws = {};
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (img, ...args) {
      if (img.src?.includes("rig-template")) {
        const key = img.src.split("/").at(-1),
          t = this.getTransform();
        const history = (window.rigDraws[key] ??= []);
        history.push([t.a, t.b, t.c, t.d, t.e, t.f]);
        if (history.length > 1200) history.shift();
      }
      return original.call(this, img, ...args);
    };
  });
  await page.goto(base);
  await page.waitForFunction(() => Object.keys(window.rigDraws).length === 8);
  await page.locator("#character-button").click();
  await page.locator("#practice-behavior").selectOption("dummy");
  await page.locator("#confirm-character").click();
  await page.waitForFunction(() => window.axis.state.phase === "fight");
  await page.evaluate(() => {
    window.rigDraws = {};
  });
  await page.keyboard.press("j");
  await page.waitForFunction(
    () => window.axis.state.fighters[0].attack?.t > 0.18,
  );
  await page.screenshot({ path: "/tmp/axis-v37-rig.png", fullPage: true });
  await page.waitForTimeout(350);
  const transforms = await page.evaluate(() => window.rigDraws["shin.svg"]);
  const angles = transforms.map((t) => Math.atan2(t[1], t[0]));
  assert.ok(
    Math.max(...angles) - Math.min(...angles) > 0.4,
    "separate shin art rotates with the actual kick",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: eight SVG body parts load and automatically animate through real IK kick poses",
  );
} finally {
  await browser.close();
}
