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
const host = await browser.newPage({ viewport: { width: 1440, height: 1080 } }),
  guest = await browser.newPage({ viewport: { width: 1440, height: 1080 } }),
  errors = [];
for (const page of [host, guest])
  page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8787",
  lobby = process.env.TEST_LOBBY_URL || base;
async function openLobby(page, name) {
  await page.locator("#online-button").click();
  if (!process.env.TEST_AUTO_HOST)
    await page.locator("#server-url").fill(lobby);
  await page.locator("#player-name").fill(name);
}
async function choose(page, id) {
  await page.locator(`#character-grid [data-character="${id}"]`).click();
  await page.locator("#confirm-character").click();
}
async function newRound(gap = null) {
  await host.locator("#reset-button").click();
  await host.waitForFunction(() => window.axis.state.phase === "ready");
  await host.waitForFunction(() => window.axis.state.phase === "fight");
  await guest.waitForFunction(() => window.axis.state.phase === "fight");
  if (gap !== null) {
    await host.keyboard.down("d");
    await host.waitForFunction((gap) => {
      const [a, b] = window.axis.state.fighters;
      return Math.hypot(a.x - b.x, a.z - b.z) < gap;
    }, gap);
    await host.keyboard.up("d");
  }
}
async function crouchDash(button) {
  await host.keyboard.press("d");
  await host.keyboard.down("s");
  await host.keyboard.down("d");
  await host.keyboard.press(button);
  await host.keyboard.up("s");
  await host.keyboard.up("d");
}
try {
  await host.goto(base);
  await guest.goto(process.env.TEST_GUEST_URL || base);
  await host.waitForFunction(
    () => window.axis && document.getElementById("loading").hidden,
  );
  await host.locator("#arena-moves-button").click();
  assert.equal(await host.locator(".move-item").count(), 30);
  await host.locator('#move-character-tabs [data-character="goro"]').click();
  assert.ok(
    (await host.locator(".frame-data").first().innerText()).includes("10"),
  );
  await host.locator('#move-character-tabs [data-character="ren"]').click();
  const bloodCross = host
    .locator(".move-item")
    .filter({ hasText: "블러드 크로스" });
  assert.ok((await bloodCross.innerText()).includes("-20"));
  assert.ok((await bloodCross.innerText()).includes("어퍼 확정"));
  await host.locator("#moves-dialog .close").click();
  await openLobby(host, "ALPHA");
  assert.equal(await host.locator("#quick-match").count(), 0);
  await host.locator("#room-name").fill("STYLE ARENA");
  await host.locator("#create-room").click();
  await host.waitForFunction(() =>
    document
      .getElementById("online-status")
      .textContent.includes("방을 만들었"),
  );
  assert.equal(
    await host.locator("#select-dialog").isVisible(),
    false,
    "no character selection before pairing",
  );
  await openLobby(guest, "BETA");
  await guest
    .locator(".room-row")
    .filter({ hasText: "STYLE ARENA" })
    .locator("button")
    .click();
  await host.locator("#select-dialog").waitFor({ state: "visible" });
  await guest.locator("#select-dialog").waitFor({ state: "visible" });
  await host.screenshot({ path: "/tmp/axis-v36-select.png", fullPage: true });
  assert.equal(await host.locator(".character-card").count(), 4);
  assert.equal(await host.evaluate(() => window.axis.battleActive), false);
  await choose(host, "mira");
  assert.equal(
    await host.evaluate(() => window.axis.battleActive),
    false,
    "one confirmed character cannot start a match",
  );
  await choose(guest, "goro");
  await host.waitForFunction(
    () => window.axis.battleActive && window.axis.connected,
    {},
    { timeout: 30000 },
  );
  await guest.waitForFunction(
    () => window.axis.battleActive && window.axis.connected,
    {},
    { timeout: 30000 },
  );
  assert.deepEqual(
    await host.evaluate(() =>
      window.axis.state.fighters.map((f) => f.character),
    ),
    ["mira", "goro"],
  );
  await host.waitForFunction(() => window.axis.state.phase === "fight");
  await guest.waitForFunction(() => window.axis.state.phase === "fight");
  console.log(
    "Player match only → selected room → two-sided character confirmation → automatic P2P passed",
  );
  await host.keyboard.down("w");
  await host.waitForFunction(
    () => Math.abs(window.axis.state.axisAngle) > 0.35,
    {},
    { timeout: 12000 },
  );
  await host.keyboard.up("w");
  await host.waitForTimeout(200);
  const projections = await host.evaluate(() => window.axis.projection);
  assert.ok(projections[0].x < projections[1].x);
  assert.ok(
    Math.abs(projections[0].y - projections[1].y) < 2,
    "orbit camera keeps both fighters on one 2D fighting line",
  );
  await guest.waitForFunction(
    () => Math.abs(window.axis.state.axisAngle) > 0.3,
  );
  await host.keyboard.down("d");
  await host.waitForFunction(
    () => {
      const [a, b] = window.axis.state.fighters;
      return Math.hypot(a.x - b.x, a.z - b.z) < 1.1;
    },
    {},
    { timeout: 12000 },
  );
  await host.keyboard.up("d");
  await host.keyboard.press("u");
  await host.waitForFunction(
    () => window.axis.state.fighters[1].hp < 120,
    {},
    { timeout: 12000 },
  );
  await guest.waitForFunction(
    () => window.axis.state.fighters[1].hp < 120,
    {},
    { timeout: 12000 },
  );
  console.log(
    "Opponent-centered sidestep, stable left/right composition, remote damage and roster synchronization passed",
  );
  await host.screenshot({ path: "/tmp/axis-v36-online.png", fullPage: true });
  await host.locator("#online-button").click();
  await host.locator("#disconnect-button").click();
  await guest.waitForFunction(() => !window.axis.matched);
  await host.waitForFunction(() => !window.axis.matched);
  await openLobby(host, "ALPHA");
  await host.locator("#room-name").fill("FRAME LAB");
  await host.locator("#create-room").click();
  await host.waitForFunction(() =>
    document
      .getElementById("online-status")
      .textContent.includes("방을 만들었"),
  );
  assert.equal(await host.locator("#select-dialog").isVisible(), false);
  await openLobby(guest, "BETA");
  await guest.locator("#connect-lobby").click();
  const room = guest.locator(".room-row").filter({ hasText: "FRAME LAB" });
  await room.locator("button").click();
  await host.locator("#select-dialog").waitFor();
  await guest.locator("#select-dialog").waitFor();
  await choose(host, "kai");
  await choose(guest, "ren");
  await host.waitForFunction(
    () => window.axis.battleActive && window.axis.connected,
    {},
    { timeout: 30000 },
  );
  await guest.waitForFunction(
    () => window.axis.battleActive && window.axis.connected,
    {},
    { timeout: 30000 },
  );
  assert.deepEqual(
    await guest.evaluate(() =>
      window.axis.state.fighters.map((f) => f.character),
    ),
    ["kai", "ren"],
  );
  console.log(
    "Player room creation, live room list, selected room entry, post-pair selection and second P2P match passed",
  );
  await host.waitForFunction(() => window.axis.state.phase === "fight");
  await host.keyboard.down("d");
  await host.waitForFunction(() => {
    const [a, b] = window.axis.state.fighters;
    return Math.hypot(a.x - b.x, a.z - b.z) < 1.05;
  });
  await host.keyboard.up("d");
  await host.keyboard.down("s");
  await host.keyboard.down("d");
  await host.keyboard.press("i");
  await host.keyboard.up("s");
  await host.keyboard.up("d");
  await host.waitForFunction(
    () =>
      window.axis.state.fighters[0].combo === 1 &&
      window.axis.state.fighters[1].y > 0,
  );
  await host.keyboard.press("u");
  await host.waitForFunction(() => window.axis.state.fighters[0].combo === 2);
  await host.keyboard.press("i");
  await host.waitForFunction(() => window.axis.state.fighters[0].combo === 3);
  await host.keyboard.down("s");
  await host.keyboard.press("i");
  await host.keyboard.up("s");
  await host.waitForFunction(
    () =>
      window.axis.state.fighters[0].combo === 4 &&
      window.axis.state.fighters[1].bounceUsed,
  );
  await host.keyboard.down("d");
  await host.keyboard.press("k");
  await host.keyboard.up("d");
  await host.waitForFunction(() => window.axis.state.fighters[0].combo === 5);
  await guest.waitForFunction(
    () =>
      window.axis.state.fighters[0].combo === 5 &&
      window.axis.state.fighters[1].bounceUsed,
  );
  await host.screenshot({
    path: "/tmp/axis-v36-air-combo.png",
    fullPage: true,
  });
  console.log(
    "Physical keyboard launcher → jab → string → bound → side kick: 5-hit P2P combo synchronized on both clients",
  );

  await host.locator("#reset-button").click();
  await host.waitForFunction(() => window.axis.state.phase === "ready");
  await host.waitForFunction(() => window.axis.state.phase === "fight");
  await guest.waitForFunction(() => window.axis.state.phase === "fight");
  await host.keyboard.down("d");
  await host.waitForFunction(() => {
    const [a, b] = window.axis.state.fighters;
    return Math.hypot(a.x - b.x, a.z - b.z) < 1.05;
  });
  await host.keyboard.up("d");
  await host.keyboard.down("a");
  await guest.keyboard.press("d");
  await guest.keyboard.down("a");
  await guest.keyboard.press("i");
  await guest.keyboard.up("a");
  await guest.keyboard.down("d");
  await host.waitForFunction(() => {
    const f = window.axis.state.fighters[0];
    return f.blockstun && f.stun <= 6 / 60 + 1e-9;
  });
  await host.keyboard.up("a");
  await host.keyboard.down("s");
  await host.keyboard.down("d");
  await host.keyboard.press("i");
  await host.keyboard.up("s");
  await host.keyboard.up("d");
  await host.waitForFunction(
    () =>
      window.axis.state.fighters[0].attack?.punish &&
      window.axis.state.fighters[1].y > 0,
  );
  await guest.waitForFunction(
    () =>
      window.axis.state.fighters[0].attack?.punish &&
      window.axis.state.fighters[1].y > 0,
  );
  await guest.keyboard.up("d");
  await host.screenshot({ path: "/tmp/axis-v36-punish.png", fullPage: true });
  console.log(
    "Blood Cross guarded → buffered uppercut beats held-back guard: confirmed PUNISH on both P2P clients",
  );

  await newRound(1.15);
  await crouchDash("i");
  await host.waitForFunction(
    () =>
      window.axis.state.fighters[0].lastMove === "electric" &&
      window.axis.state.fighters[1].y > 0,
  );
  await guest.waitForFunction(
    () =>
      window.axis.state.fighters[0].lastMove === "electric" &&
      window.axis.state.fighters[1].y > 0,
  );
  await host.screenshot({ path: "/tmp/axis-v36-electric.png", fullPage: true });

  await newRound(1.05);
  await guest.keyboard.down("d");
  await crouchDash("k");
  await host.waitForFunction(() => window.axis.state.fighters[1].downTime > 0);
  await guest.waitForFunction(() => window.axis.state.fighters[1].downTime > 0);
  await guest.keyboard.up("d");
  await host.screenshot({
    path: "/tmp/axis-v36-hellsweep.png",
    fullPage: true,
  });

  await newRound();
  await host.keyboard.press("d");
  await host.keyboard.down("d");
  await host.keyboard.press("u");
  await host.keyboard.up("d");
  await host.waitForFunction(
    () =>
      window.axis.state.fighters[0].lastMove === "rushStrike" &&
      window.axis.state.fighters[1].downTime > 0,
  );
  await guest.waitForFunction(
    () =>
      window.axis.state.fighters[0].lastMove === "rushStrike" &&
      window.axis.state.fighters[1].downTime > 0,
  );

  await newRound();
  await host.keyboard.press("d");
  await host.keyboard.press("d");
  await host.keyboard.down("d");
  await host.keyboard.press("j");
  await host.keyboard.up("d");
  await host.waitForFunction(
    () =>
      window.axis.state.fighters[0].attack?.key === "runningKick" &&
      window.axis.state.fighters[0].y > 0.2,
  );
  await guest.waitForFunction(
    () =>
      window.axis.state.fighters[0].attack?.key === "runningKick" &&
      window.axis.state.fighters[0].y > 0.2,
  );
  await host.screenshot({
    path: "/tmp/axis-v36-running-kick.png",
    fullPage: true,
  });
  await host.waitForFunction(() => window.axis.state.fighters[1].hp < 120);
  console.log(
    "P2P advanced techniques: just-frame electric launch, hellsweep beats standing guard, advancing palm knockdown, running jump kick synchronized",
  );

  await host.locator("#online-button").click();
  await host.locator("#disconnect-button").click();
  await guest.waitForFunction(() => !window.axis.matched);
  await host.locator("#character-button").click();
  await host.locator("#practice-behavior").selectOption("dummy");
  await host.locator("#infinite-health").check();
  await choose(host, "goro");
  await host.waitForFunction(
    () => window.axis.state.fighters[0].character === "goro",
  );
  await host.waitForFunction(() => window.axis.state.phase === "fight");
  await host.keyboard.down("d");
  await host.waitForFunction(() => {
    const [a, b] = window.axis.state.fighters;
    return Math.hypot(a.x - b.x, a.z - b.z) < 1.05;
  });
  await host.keyboard.up("d");
  await host.keyboard.press("u");
  await host.waitForFunction(
    () => window.axis.state.fighters[0].comboDamage > 0,
  );
  assert.deepEqual(await host.evaluate(() => window.axis.practice), {
    behavior: "dummy",
    infiniteHealth: true,
  });
  assert.equal(
    await host.evaluate(() => window.axis.state.fighters[1].hp),
    120,
  );
  assert.equal(
    await host.evaluate(() => window.axis.state.fighters[1].lastMove),
    "",
  );
  assert.equal(await host.evaluate(() => window.axis.state.time), 60);
  await host.waitForFunction(() => window.axis.state.phaseTime === 0);
  assert.notEqual(
    await host.locator("#announcement-text").innerText(),
    "FIGHT",
  );
  await host.keyboard.press("h");
  await host.locator("#moves-dialog").waitFor();
  assert.equal(await host.locator(".move-item").count(), 30);
  await host.locator("#moves-dialog .close").click();
  await host.locator("#character-button").click();
  await host.locator("#practice-behavior").selectOption("cpu");
  await host.locator("#infinite-health").uncheck();
  await choose(host, "ren");
  await host.waitForFunction(
    () =>
      window.axis.state.phase === "fight" &&
      window.axis.state.fighters[1].lastMove !== "",
  );
  assert.equal(
    await host.evaluate(() => window.axis.practice.infiniteHealth),
    false,
  );
  console.log(
    "Practice: stationary infinite-HP dummy keeps damage/hitstun; attacking CPU and normal HP switch work",
  );
  await host.setViewportSize({ width: 390, height: 844 });
  await host.screenshot({ path: "/tmp/axis-v36-mobile.png", fullPage: true });
  assert.ok(
    await host.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: v3.6 player match only, player rooms, matched-only character selection, 4 characters, unique frame tables, automatic P2P, orbit camera, remote combat, practice selection, responsive layout; no page errors.",
  );
} catch (error) {
  for (const [name, page] of [
    ["host", host],
    ["guest", guest],
  ])
    console.error(
      name,
      await page
        .evaluate(() => ({
          state: window.axis?.state,
          connected: window.axis?.connected,
          matched: window.axis?.matched,
          battleActive: window.axis?.battleActive,
          status: document.getElementById("online-status")?.textContent,
          selection: document.getElementById("selection-status")?.textContent,
        }))
        .catch(() => null),
    );
  console.error("Page errors", errors);
  throw error;
} finally {
  await browser.close();
}
