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
const pc = await browser.newPage({ viewport: { width: 1440, height: 1080 } }),
  phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  }),
  errors = [];
for (const p of [pc, phone]) p.on("pageerror", (e) => errors.push(e.message));
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8080";
let original;
async function choose(page, id) {
  await page.locator(`#character-grid [data-character="${id}"]`).click();
  await page.locator("#confirm-character").click();
}
async function wave() {
  await pc.keyboard.down("s");
  await pc.waitForTimeout(25);
  await pc.keyboard.down("d");
  await pc.waitForTimeout(25);
  await pc.keyboard.up("s");
  await pc.keyboard.press("u");
  await pc.keyboard.up("d");
}
try {
  await pc.goto(base);
  original = await (await pc.request.get(base + "/api/custom-images")).json();
  await pc.locator("#images-button").click();
  const green = await pc.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 160;
    c.height = 128;
    c.getContext("2d").fillStyle = "#13e850";
    c.getContext("2d").fillRect(0, 0, 160, 128);
    return c.toDataURL().split(",")[1];
  });
  await pc.locator("#image-character").selectOption("kai");
  await pc.locator("#image-file").setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: Buffer.from(green, "base64"),
  });
  await pc.locator("#image-apply").click();
  await pc.waitForFunction(() =>
    document.getElementById("image-status").textContent.includes("PC 파일"),
  );
  assert.deepEqual(
    await pc
      .locator("#image-preview")
      .evaluate((c) =>
        Array.from(c.getContext("2d").getImageData(80, 64, 1, 1).data),
      ),
    [19, 232, 80, 255],
  );
  await pc.reload();
  await pc.locator("#images-button").click();
  assert.deepEqual(
    await pc
      .locator("#image-preview")
      .evaluate((c) =>
        Array.from(c.getContext("2d").getImageData(80, 64, 1, 1).data),
      ),
    [19, 232, 80, 255],
  );
  await pc.locator("#image-kind").selectOption("skin");
  await pc
    .locator("#image-file")
    .setInputFiles("public/mods/skin-template.png");
  await pc.locator("#image-apply").click();
  await pc.waitForFunction(() =>
    document.getElementById("image-status").textContent.includes("PC 파일"),
  );
  assert.ok(
    (
      await (await pc.request.get(base + "/api/custom-images")).json()
    ).kai.skin.startsWith("data:image/png"),
  );
  await pc.screenshot({ path: "/tmp/axis-v315-images.png", fullPage: true });
  await pc.request.put(base + "/api/custom-images", { data: original });
  await pc.reload();
  await pc.locator("#practice-button").click();
  assert.equal(await pc.locator(".character-card").count(), 10);
  assert.equal(
    await pc.locator(".character-card").nth(2).getAttribute("data-character"),
    "random",
  );
  await pc.locator("#practice-behavior").selectOption("dummy");
  await choose(pc, "random");
  assert.notEqual(
    await pc.evaluate(() => window.axis.state.fighters[0].character),
    "random",
  );
  await pc.locator("#stage-select").selectOption("terminal");
  await pc.locator("#practice-button").click();
  await pc.locator("#practice-behavior").selectOption("dummy");
  await choose(pc, "raon");
  await pc.waitForFunction(() => window.axis.state.phase === "fight");
  await pc.keyboard.press("d");
  await pc.keyboard.down("d");
  await pc.waitForFunction(() => window.axis.state.fighters[0].running);
  await pc.keyboard.up("d");
  for (let n = 1; n <= 20; n++) {
    await pc.waitForFunction(
      () =>
        !window.axis.state.fighters[0].attack &&
        !window.axis.state.fighters[0].stun,
    );
    const gap = await pc.evaluate(() => {
      const [a, b] = window.axis.state.fighters;
      return Math.hypot(a.x - b.x, a.z - b.z);
    });
    if (gap > 1.2) {
      await pc.keyboard.down("d");
      await pc.waitForFunction(() => {
        const [a, b] = window.axis.state.fighters;
        return Math.hypot(a.x - b.x, a.z - b.z) < 1.1;
      });
      await pc.keyboard.up("d");
    }
    await pc.keyboard.press("u");
    await pc.waitForFunction((n) => window.axis.state.fighters[0].ki >= n, n);
  }
  assert.equal(await pc.locator("#ki-0 b").innerText(), "1.00 / 2");
  await pc.waitForFunction(() => !window.axis.state.fighters[0].attack);
  await pc.keyboard.down("s");
  await pc.keyboard.down("d");
  await pc.keyboard.press("i");
  await pc.keyboard.up("s");
  await pc.keyboard.up("d");
  await pc.waitForFunction(() => window.axis.state.fighters[1].airOwner === 0);
  await pc.keyboard.down("j");
  await pc.keyboard.down("k");
  await pc.keyboard.up("j");
  await pc.keyboard.up("k");
  await pc.waitForFunction(
    () =>
      window.axis.state.fighters[0].lastMove === "focusBurst" &&
      window.axis.state.fighters[0].ki === 1,
  );
  await pc.waitForFunction(() => {
    const [a, b] = window.axis.state.fighters;
    return (
      a.attack?.key === "focusBurst" &&
      a.attack.connected &&
      a.combo >= 2 &&
      b.vy > 5
    );
  });
  await pc.screenshot({ path: "/tmp/axis-v315-ki-combo.png", fullPage: true });
  console.log(
    "PASS: 10 slots with centered random, real held dash/run, 20 physical hits earn one stock, physical J+K spends one stock after launcher, native portrait/skin save and reload without GitHub.",
  );
  await phone.goto(base);
  await pc.locator("#online-button").click();
  await pc.locator("#room-name").fill("KI MOBILE");
  await pc.locator("#create-room").click();
  await phone.locator("#online-button").tap();
  await phone.locator("#connect-lobby").tap();
  await phone
    .locator(".room-row")
    .filter({ hasText: "KI MOBILE" })
    .getByRole("button", { name: "입장" })
    .tap();
  await choose(pc, "raon");
  await choose(phone, "hana");
  for (const p of [pc, phone])
    await p.waitForFunction(
      () => window.axis.battleActive && window.axis.state.phase === "fight",
    );
  await wave();
  for (const p of [pc, phone])
    await p.waitForFunction(
      () =>
        window.axis.state.fighters[0].ki === 1 &&
        window.axis.state.fighters[1].hp < 120,
    );
  assert.equal(await phone.locator("#ki-0").isVisible(), true);
  assert.equal(await phone.locator('[data-chord="u+i"]').isVisible(), true);
  await phone.screenshot({ path: "/tmp/axis-v315-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: RAON character selection, traveling fireball, damage and 1/20-bar gain synchronized to mobile LAN relay; no page errors.",
  );
} catch (e) {
  console.error(
    "PC",
    await pc.evaluate(() => ({
      state: window.axis?.state,
      inputs: window.axis?.inputs,
      status: document.getElementById("image-status")?.textContent,
    })),
  );
  throw e;
} finally {
  if (original)
    await pc.request
      .put(base + "/api/custom-images", { data: original })
      .catch(() => {});
  await browser.close();
}
