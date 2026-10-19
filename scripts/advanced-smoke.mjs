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
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:5173");
  await page.locator("#character-button").click();
  assert.equal(await page.locator(".character-card").count(), 8);
  await page.locator('[data-character="shin"]').first().click();
  await page.locator("#practice-behavior").selectOption("dummy");
  await page.locator("#confirm-character").click();
  const reset = async () => {
    await page.locator("#reset-button").click();
    await page.waitForFunction(() => window.axis.state.phase === "fight");
  };
  await page.waitForFunction(() => window.axis.state.phase === "fight");
  await page.keyboard.down("s");
  await page.waitForFunction(() => window.axis.state.fighters[0].crouch);
  await page.keyboard.press("u");
  await page.waitForFunction(
    () => window.axis.state.fighters[0].lastMove === "crouchPunch",
  );
  await page.keyboard.up("s");
  await reset();
  await page.keyboard.down("s");
  await page.waitForTimeout(150);
  await page.keyboard.up("s");
  await page.keyboard.press("i");
  await page.waitForFunction(
    () => window.axis.state.fighters[0].lastMove === "risingUpper",
  );
  await reset();
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.axis.state.fighters[0].y > 0.1);
  await page.keyboard.up("w");
  await page.keyboard.press("j");
  await page.waitForFunction(
    () => window.axis.state.fighters[0].lastMove === "jumpKick",
  );
  await page.waitForTimeout(110);
  await page.keyboard.press("k");
  await page.waitForFunction(
    () => window.axis.state.fighters[0].lastMove === "jumpFollow",
  );
  await reset();
  await page.keyboard.down("d");
  await page.waitForFunction(() => {
    const [a, b] = window.axis.state.fighters;
    return Math.hypot(a.x - b.x, a.z - b.z) < 1.05;
  });
  await page.keyboard.up("d");
  const before = await page.evaluate(() =>
    window.axis.projection.map((p) => p.x),
  );
  assert.ok(before[0] < before[1]);
  await page.keyboard.down("u");
  await page.keyboard.down("i");
  await page.keyboard.up("u");
  await page.keyboard.up("i");
  await page.waitForFunction(() => window.axis.state.fighters[0].throwTime > 0);
  await page.screenshot({ path: "/tmp/axis-v38-throw.png", fullPage: true });
  const after = await page.evaluate(() =>
    window.axis.projection.map((p) => p.x),
  );
  assert.ok(after[0] > after[1], "throw exchanges screen sides");
  await page.locator("#character-button").click();
  await page.screenshot({
    path: "/tmp/axis-v38-roster-final.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: eight fighters, physical crouch/rising/jump strings, paired throw animation and screen-side exchange",
  );
} finally {
  await browser.close();
}
