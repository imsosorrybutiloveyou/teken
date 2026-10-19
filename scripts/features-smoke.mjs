import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.route("**/custom-assets.json", (r) =>
    r.fulfill({
      json: { characters: { kai: { skin: "/mods/skin-template.png" } } },
    }),
  );
  await page.addInitScript(() => {
    window.skinCells = [];
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (img, ...args) {
      if (img.src?.includes("skin-template") && args.length === 8)
        window.skinCells.push(args.slice(0, 4).join(","));
      return draw.call(this, img, ...args);
    };
  });
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:8080");
  await page.waitForFunction(() => window.axis);
  await page.evaluate(() => {
    Object.defineProperty(document, "fullscreenEnabled", {
      value: false,
      configurable: true,
    });
  });
  await page.locator("#character-button").click();
  await page.locator("#practice-behavior").selectOption("dummy");
  await page.locator("#confirm-character").click();
  await page.waitForFunction(() => window.axis.state.phase === "fight");
  await page.keyboard.down("w");
  await page.keyboard.down("d");
  await page.keyboard.press("j");
  await page.keyboard.up("w");
  await page.keyboard.up("d");
  await page.waitForFunction(
    () => window.axis.state.fighters[0].lastMove === "hopKick",
  );
  assert.ok(
    (await page.locator("#training-level").innerText()).includes("중단"),
  );
  await page.waitForFunction(() => new Set(window.skinCells).size === 8);
  await page.locator("#arcade-button").click();
  await page.locator("#arcade-difficulty").selectOption("hard");
  await page.locator("#confirm-character").click();
  await page.waitForFunction(() => window.axis.arcade?.difficulty === "hard");
  const campaign = await page.evaluate(() => window.axis.arcade);
  assert.equal(campaign.opponents.length, 7);
  assert.ok(!campaign.opponents.includes(campaign.id));
  assert.ok((await page.locator("#arena-mode").innerText()).includes("ARCADE"));
  await page.locator("#fullscreen-button").click();
  await page.waitForFunction(
    () =>
      !!document.fullscreenElement ||
      !!document.querySelector(".fullscreen-fallback"),
  );
  await page.evaluate(() =>
    document.fullscreenElement
      ? document.exitFullscreen()
      : document
          .querySelector(".arena")
          .classList.remove("fullscreen-fallback"),
  );
  await page.locator("#practice-button").click();
  await page.locator("#confirm-character").click();
  await page.waitForFunction(() => window.axis.state.phase === "fight");
  const touch = page.locator('[data-key="s"]');
  assert.equal(await touch.isVisible(), true);
  const box = await touch.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => window.axis.state.fighters[0].crouch);
  await page.mouse.up();
  await page.screenshot({
    path: "/tmp/axis-v311-features.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: eight atlas cells, physical sky knee, practice level display, seven-opponent hard arcade selection, fullscreen, touch crouch",
  );
} finally {
  await browser.close();
}
