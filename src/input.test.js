import { test } from "node:test";
import assert from "node:assert/strict";
import { KeyboardInput, RemoteInput, keyName } from "./input.js";
import { createMatch, step, emptyInput } from "./combat.js";
test("fast keyboard direction transitions between frames preserve qcf order", () => {
  const k = new KeyboardInput();
  k.down("s", 0);
  k.down("d", 5);
  k.up("s", 10);
  k.down("i", 12);
  k.up("i", 15);
  k.up("d", 17);
  const m = createMatch();
  m.phase = "fight";
  for (let n = 0; n < 12; n++) step(m, [k.sample(n * 17), emptyInput()]);
  assert.equal(m.fighters[0].lastMove, "qcfPunch");
  assert.equal(k.sample(300).x, 0);
});
test("physical keys and arrows work independently of IME key characters", () => {
  assert.equal(keyName({ code: "KeyU", key: "ㅕ" }), "u");
  assert.equal(keyName({ code: "ArrowDown", key: "ArrowDown" }), "s");
});
test("near-simultaneous hands become a throw but sequential hands stay separate", () => {
  const k = new KeyboardInput();
  k.down("u", 0);
  k.down("i", 15);
  assert.equal(k.sample(50).action, "u+i");
  assert.equal(k.sample(70).action, null);
  const seq = new KeyboardInput();
  seq.down("u", 0);
  assert.equal(seq.sample(50).action, "u");
  seq.down("i", 100);
  assert.equal(seq.sample(150).action, "i");
});
test("batched remote packets retain all directions and a single attack without repeats", () => {
  const r = new RemoteInput();
  for (const input of [
    { z: 1 },
    { x: 1, z: 1 },
    { x: 1 },
    { x: 1, action: "i" },
    {},
  ])
    r.receive(input);
  const m = createMatch();
  m.phase = "fight";
  for (let n = 0; n < 20; n++) step(m, [r.sample(), emptyInput()]);
  assert.equal(m.fighters[0].lastMove, "qcfPunch");
  assert.equal(r.sample().action, null);
});
test("clearing input removes held, queued and applied movement", () => {
  const k = new KeyboardInput();
  k.down("d", 0);
  k.sample(1);
  k.clear();
  assert.deepEqual(k.sample(20), emptyInput());
  const r = new RemoteInput();
  r.receive({ x: 1 });
  r.sample();
  r.clear();
  assert.deepEqual(r.sample(), emptyInput());
});

test("a physical KAI jab hits on frame 10 without a chord waiting delay", () => {
  const keyboard = new KeyboardInput(),
    m = createMatch(["kai", "kai"]);
  m.phase = "fight";
  m.fighters[0].x = -0.5;
  m.fighters[1].x = 0.5;
  keyboard.down("u", 0);
  for (let frame = 1; frame <= 10; frame++) {
    step(m, [keyboard.sample(((frame - 1) * 1000) / 60), emptyInput()]);
    assert.equal(m.fighters[1].hp < 120, frame === 10, `frame ${frame}`);
  }
});

test("a split-frame chord upgrades the opening basic without delaying single attacks", () => {
  const keyboard = new KeyboardInput(),
    m = createMatch();
  m.phase = "fight";
  keyboard.down("u", 0);
  step(m, [keyboard.sample(1), emptyInput()]);
  assert.equal(m.fighters[0].attack.key, "u");
  keyboard.down("i", 15);
  step(m, [keyboard.sample(17), emptyInput()]);
  assert.equal(m.fighters[0].attack.key, "throw");
});

test("all four fighters hit a physical jab on exactly frame 10 from either side", () => {
  for (const id of ["kai", "ren", "mira", "goro"])
    for (const index of [0, 1]) {
      const keyboard = new KeyboardInput(),
        m = createMatch(index === 0 ? [id, "kai"] : ["kai", id]);
      m.phase = "fight";
      m.fighters[0].x = -0.5;
      m.fighters[1].x = 0.5;
      keyboard.down("u", 0);
      for (let frame = 1; frame <= 10; frame++) {
        const inputs = [emptyInput(), emptyInput()];
        inputs[index] = keyboard.sample(((frame - 1) * 1000) / 60);
        step(m, inputs);
        assert.equal(
          m.fighters[1 - index].hp < 120,
          frame === 10,
          `${id} P${index + 1} frame ${frame}`,
        );
      }
    }
});

test("physical crouch-dash input gives electric within two frames, otherwise ordinary wind god", () => {
  for (const late of [false, true]) {
    const k = new KeyboardInput(),
      m = createMatch();
    m.phase = "fight";
    k.down("d", 0);
    k.up("d", 3);
    k.down("s", 6);
    k.down("d", 9);
    for (let frame = 0; frame < 4; frame++)
      step(m, [k.sample(frame * 17), emptyInput()]);
    if (late)
      for (let frame = 4; frame < 8; frame++)
        step(m, [k.sample(frame * 17), emptyInput()]);
    k.down("i", late ? 136 : 68);
    step(m, [k.sample(late ? 136 : 68), emptyInput()]);
    assert.equal(m.fighters[0].lastMove, late ? "windGod" : "electric");
  }
});

test("same-frame diagonal and punch produce electric in either physical keydown order", () => {
  for (const punchFirst of [true, false]) {
    const k = new KeyboardInput(),
      m = createMatch();
    m.phase = "fight";
    k.down("d", 0);
    k.up("d", 2);
    k.down("s", 4);
    if (punchFirst) {
      k.down("i", 6);
      k.down("d", 7);
    } else {
      k.down("d", 6);
      k.down("i", 7);
    }
    for (let frame = 0; frame < 7; frame++)
      step(m, [k.sample(frame * 17), emptyInput()]);
    assert.equal(m.fighters[0].lastMove, "electric");
  }
});

test("an immediate backward guard after a motion attack does not rewrite the move", () => {
  const k = new KeyboardInput(),
    m = createMatch(["ren", "kai"]);
  m.phase = "fight";
  k.down("a", 0);
  k.up("a", 2);
  k.down("d", 4);
  k.down("i", 5);
  k.up("d", 6);
  k.down("a", 7);
  for (let frame = 0; frame < 9; frame++)
    step(m, [k.sample(frame * 17), emptyInput()]);
  assert.equal(m.fighters[0].lastMove, "qcfPunch");
});

test("neutral motion commands tolerate extra keyboard transition directions", () => {
  const k = new KeyboardInput(),
    m = createMatch(["ren", "kai"]);
  m.phase = "fight";
  for (const [key, down, t] of [
    ["d", true, 0],
    ["d", false, 20],
    ["a", true, 40],
    ["a", false, 60],
    ["s", true, 80],
    ["d", true, 100],
    ["k", true, 102],
  ]) {
    if (down) k.down(key, t);
    else k.up(key, t);
  }
  for (let n = 0; n < 18; n++) step(m, [k.sample(n * 17), emptyInput()]);
  assert.equal(m.fighters[0].lastMove, "hopKick");
});
