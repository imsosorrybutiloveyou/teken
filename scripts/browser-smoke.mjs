import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [
    "--no-sandbox",
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [];
const host = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const guest = await browser.newPage({
  viewport: { width: 1440, height: 1080 },
});
for (const page of [host, guest])
  page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
try {
  await host.goto(base);
  await host.waitForFunction(
    () => window.axis && document.getElementById("loading").hidden,
  );
  await host.waitForFunction(() => window.axis.state.phase === "fight");
  const z = await host.evaluate(() => window.axis.state.fighters[0].z);
  await host.keyboard.down("w");
  await host.waitForTimeout(500);
  await host.keyboard.up("w");
  assert.ok(
    (await host.evaluate(() => window.axis.state.fighters[0].z)) < z - 0.1,
    "W moves fighter in depth",
  );
  await host.locator("#reset-button").click();
  await host.waitForTimeout(200);
  await host.screenshot({ path: "/tmp/axis-desktop.png", fullPage: true });
  await host.locator("#pause-button").click();
  const time = await host.evaluate(() => window.axis.state.time);
  await host.waitForTimeout(200);
  assert.equal(await host.evaluate(() => window.axis.state.time), time);
  await host.locator("#moves-button").click();
  assert.equal(await host.locator(".move-item").count(), 5);
  await host.locator("#moves-dialog .close").click();
  await host.locator("#online-button").click();
  await host.locator("#create-offer").click();
  await host.waitForFunction(
    () => document.getElementById("local-code").value.startsWith("AXIS1."),
    {},
    { timeout: 25000 },
  );
  const offer = await host.locator("#local-code").inputValue();
  await guest.goto(base);
  await guest.locator("#online-button").click();
  await guest.locator("#guest-tab").click();
  await guest.locator("#remote-code").fill(offer);
  await guest.locator("#apply-code").click();
  await guest.waitForFunction(
    () => document.getElementById("local-code").value.startsWith("AXIS1."),
    {},
    { timeout: 25000 },
  );
  const answer = await guest.locator("#local-code").inputValue();
  await host.locator("#remote-code").fill(answer);
  await host.locator("#apply-code").click();
  await host.waitForFunction(
    () => window.axis.connected,
    {},
    { timeout: 20000 },
  );
  await guest.waitForFunction(
    () => window.axis.connected,
    {},
    { timeout: 20000 },
  );
  assert.equal(await host.evaluate(() => window.axis.role), "host");
  assert.equal(await guest.evaluate(() => window.axis.role), "guest");
  await host.waitForFunction(() => window.axis.state.phase === "fight");
  await guest.waitForFunction(() => window.axis.state.phase === "fight");
  const oldZ = await host.evaluate(() => window.axis.state.fighters[1].z);
  await guest.keyboard.down("w");
  await guest.waitForTimeout(700);
  await guest.keyboard.up("w");
  await host.waitForFunction(
    (z) => window.axis.state.fighters[1].z < z - 0.2,
    oldZ,
    { timeout: 5000 },
  );
  await guest.waitForTimeout(200);
  const hostState = await host.evaluate(() => window.axis.state),
    guestState = await guest.evaluate(() => window.axis.state);
  assert.ok(
    Math.abs(hostState.fighters[1].z - guestState.fighters[1].z) < 0.2,
    "P2 input and host snapshots synchronize",
  );
  await host.locator("#reset-button").click();
  await host.waitForFunction(() => window.axis.state.phase === "fight");
  await host.keyboard.down("d");
  await host.waitForFunction(
    () =>
      Math.abs(
        window.axis.state.fighters[1].x - window.axis.state.fighters[0].x,
      ) < 1.35,
    {},
    { timeout: 10000 },
  );
  await host.keyboard.up("d");
  await guest.waitForTimeout(200);
  const initialHP = await host.evaluate(() => window.axis.state.fighters[0].hp);
  await guest.keyboard.press("j");
  await host.waitForFunction(
    (hp) => window.axis.state.fighters[0].hp < hp,
    initialHP,
    { timeout: 10000 },
  );
  await guest.waitForFunction(
    (hp) => window.axis.state.fighters[0].hp < hp,
    initialHP,
    { timeout: 10000 },
  );
  await host.locator("#online-button").click();
  await host.locator("#disconnect-button").click();
  await guest.waitForFunction(() => !window.axis.connected);
  assert.equal(await host.evaluate(() => window.axis.connected), false);
  await host.setViewportSize({ width: 390, height: 844 });
  await host.screenshot({ path: "/tmp/axis-mobile.png", fullPage: true });
  assert.ok(
    await host.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "mobile has no horizontal overflow",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: WebGL render, movement, pause, move list, real WebRTC offer/answer, P2 remote input, synchronized snapshots, disconnect, responsive layout; no page errors.",
  );
} finally {
  await browser.close();
}
