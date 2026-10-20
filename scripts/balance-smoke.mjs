import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});
const page = await browser.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:8080");
  await page.locator("#stage-select").selectOption("dojo");
  await page.locator("#arcade-button").click();
  await page.locator("#arcade-difficulty").selectOption("hard");
  await page.locator('[data-character="kai"]').first().click();
  await page.locator("#confirm-character").click();
  await page.waitForFunction(() => window.axis.state.phase === "fight");
  const first = await page.evaluate(() => window.axis.state.stage);
  assert.equal(await page.locator("#stage-select").inputValue(), "random");
  let seenCombo = false,
    changed = false;
  const deadline = Date.now() + 65000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      m: window.axis.state,
      c: window.axis.arcade,
    }));
    const opponent = state.m.fighters[1];
    if (opponent.combo >= 2 && opponent.comboAge < 1.3) {
      assert.equal(
        await page.locator("#opponent-combo-display").isVisible(),
        true,
      );
      assert.equal(
        await page.locator("#opponent-combo-count").innerText(),
        String(opponent.combo),
      );
      assert.ok(
        (await page.locator("#opponent-combo-damage").innerText()).includes(
          "DAMAGE",
        ),
      );
      seenCombo = true;
    }
    if (state.c.arenaHistory.length >= 2) {
      assert.notEqual(state.m.stage, first);
      changed = true;
      break;
    }
    if (
      state.m.fighters[0].downTime > 0 &&
      state.m.fighters[0].y === 0 &&
      state.m.fighters[0].throwTime === 0
    )
      await page.keyboard.press("w");
    await page.waitForTimeout(120);
  }
  assert.ok(seenCombo, "CPU combo panel visible");
  assert.ok(changed, "arcade round changed the map");
  await page.screenshot({
    path: "/tmp/axis-v313-round-map.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: opponent combo hit count/damage, arcade map ignores manual choice and changes after a real CPU round win",
  );
} finally {
  await browser.close();
}
