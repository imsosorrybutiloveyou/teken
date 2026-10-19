import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});
const host = await browser.newPage(),
  guest = await browser.newPage(),
  errors = [];
for (const p of [host, guest]) p.on("pageerror", (e) => errors.push(e.message));
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8080";
async function choose(p, id) {
  await p.locator(`[data-character="${id}"]`).first().click();
  await p.locator("#confirm-character").click();
}
try {
  await host.goto(base);
  await guest.goto(base);
  await host.locator("#player-side").selectOption("1");
  await host.locator("#stage-select").selectOption("dojo");
  await host.locator("#online-button").click();
  await host.locator("#player-name").fill("2P HOST");
  await host.locator("#room-name").fill("DOJO OPTIONS");
  await host.locator("#create-room").click();
  await guest.locator("#online-button").click();
  await guest.locator("#player-name").fill("1P GUEST");
  await guest.locator("#connect-lobby").click();
  await guest
    .locator(".room-row")
    .filter({ hasText: "DOJO OPTIONS" })
    .getByRole("button", { name: "입장" })
    .click();
  await choose(host, "kai");
  await choose(guest, "ren");
  await host.waitForFunction(
    () => window.axis.battleActive && window.axis.state.phase === "fight",
  );
  await guest.waitForFunction(() => window.axis.battleActive);
  assert.equal(await host.evaluate(() => window.axis.playerSide), 1);
  assert.equal(await guest.evaluate(() => window.axis.playerSide), 0);
  for (const p of [host, guest]) {
    assert.equal(await p.evaluate(() => window.axis.state.stage), "dojo");
    assert.deepEqual(
      await p.evaluate(() =>
        window.axis.state.fighters.map((f) => f.character),
      ),
      ["ren", "kai"],
    );
  }
  await host.keyboard.down("a");
  await host.waitForFunction(() => {
    const [a, b] = window.axis.state.fighters;
    return Math.hypot(a.x - b.x, a.z - b.z) < 1.3;
  });
  await host.keyboard.up("a");
  await host.keyboard.press("u");
  await guest.waitForFunction(() => window.axis.state.fighters[0].hp < 120);
  await host.locator("#online-button").click();
  await host.locator("#disconnect-button").click();
  await host.locator("#practice-button").click();
  await host.locator("#practice-behavior").selectOption("dummy");
  await choose(host, "kai");
  await host.waitForFunction(() => window.axis.state.phase === "fight");
  assert.equal(await host.evaluate(() => window.axis.playerSide), 1);
  assert.equal(
    await host.evaluate(() => window.axis.state.fighters[1].character),
    "kai",
  );
  await host.keyboard.press("w");
  await host.waitForFunction(
    () => Math.abs(window.axis.state.fighters[1].z) > 0.12,
  );
  assert.equal(
    await host.evaluate(() => window.axis.state.fighters[1].jumpActive),
    false,
  );
  await host.keyboard.down("s");
  await host.waitForFunction(() => window.axis.state.fighters[1].crouch);
  await host.keyboard.up("s");
  await host.locator("#arcade-button").click();
  await host.locator("#arcade-difficulty").selectOption("madness");
  await choose(host, "kai");
  assert.equal(
    await host.evaluate(() => window.axis.arcade.difficulty),
    "madness",
  );
  assert.equal(
    await host.evaluate(() => window.axis.state.fighters[1].character),
    "kai",
  );
  await host.screenshot({ path: "/tmp/axis-v312-options.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: online 2P host / 1P guest, synchronized dojo map and correct remote damage, practice 2P, tap sidestep, hold crouch, madness arcade 2P",
  );
} finally {
  await browser.close();
}
