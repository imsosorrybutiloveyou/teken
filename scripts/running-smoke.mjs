import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [
    "--no-sandbox",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
const host = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const guest = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8080";
const errors = [];
for (const p of [host, guest]) p.on("pageerror", (e) => errors.push(e.message));
async function choose(p, id) {
  await p.locator(`#character-grid [data-character="${id}"]`).click();
  await p.locator("#confirm-character").click();
}
async function triple(p, direction) {
  for (let n = 0; n < 2; n++) {
    await p.keyboard.down(direction);
    await p.waitForTimeout(35);
    await p.keyboard.up(direction);
    await p.waitForTimeout(35);
  }
  await p.keyboard.down(direction);
  await p.waitForFunction(
    () => window.axis.state.fighters[window.axis.playerSide].running,
  );
}
try {
  await host.goto(base);
  await guest.goto(base);
  await host.locator("#stage-select").selectOption("terminal");
  await host.locator("#online-button").click();
  await host.locator("#room-name").fill("RUNNING V316");
  await host.locator("#create-room").click();
  await guest.locator("#online-button").click();
  await guest.locator("#connect-lobby").click();
  await guest
    .locator(".room-row")
    .filter({ hasText: "RUNNING V316" })
    .getByRole("button", { name: "입장" })
    .click();
  await choose(host, "raon");
  await choose(guest, "boru");
  for (const p of [host, guest])
    await p.waitForFunction(
      () => window.axis.battleActive && window.axis.state.phase === "fight",
    );
  const meter = await guest.locator("#ki-0").boundingBox();
  const bar = await guest.locator("#ki-0 progress").first().boundingBox();
  assert.ok(meter.height >= 32 && bar.height >= 15);
  assert.ok(meter.x >= 0 && meter.x + meter.width <= 390);
  await triple(host, "d");
  await host.keyboard.press("i");
  await host.keyboard.up("d");
  await host.waitForFunction(
    () =>
      window.axis.state.fighters[0].attack?.key === "runningPunch" &&
      window.axis.state.fighters[0].y > 0,
  );
  await host.screenshot({ path: "/tmp/axis-v316-raon-running-palm.png" });
  for (const p of [host, guest])
    await p.waitForFunction(
      () =>
        window.axis.state.fighters[1].hp < 120 &&
        window.axis.state.fighters[0].ki === 1,
    );
  await guest.screenshot({ path: "/tmp/axis-v316-mobile-ki.png" });
  await host.locator("#reset-button").click();
  await host.waitForFunction(() => window.axis.state.phase === "ready");
  for (const p of [host, guest])
    await p.waitForFunction(() => window.axis.state.phase === "fight");
  await triple(guest, "a");
  await guest.keyboard.down("u");
  await guest.keyboard.down("i");
  await guest.keyboard.up("u");
  await guest.keyboard.up("i");
  await guest.keyboard.up("a");
  await guest.waitForFunction(
    () => window.axis.state.fighters[1].attack?.key === "runningKick",
  );
  assert.equal(await guest.evaluate(() => window.axis.state.fighters[1].y), 0);
  for (const p of [host, guest])
    await p.waitForFunction(() => window.axis.state.fighters[0].hp < 120);
  await host.screenshot({ path: "/tmp/axis-v316-boru-running-crash.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: physical triple-forward running; RAON airborne hand attack and BORU grounded two-hand charge; synchronized damage/ki; enlarged mobile meter within viewport; no browser errors.",
  );
} finally {
  await browser.close();
}
