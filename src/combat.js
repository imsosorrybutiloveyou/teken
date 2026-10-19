import { CHARACTERS, character, moveFor } from "./characters.js";
export { CHARACTERS, moveFor };
export const MAX_HP = 120;
export const JUGGLE_LIMIT = 6;
const GRAVITY = 20;
export const WALK_SPEED = 3.5;
export const FORWARD_SPEED = 4.0;
export const BACKWARD_SPEED = 2.6;
export const GUARD_BUFFER_FRAMES = 6;
export const SIDESTEP_SPEED = 3.8;
export const DASH_SPEED = 5.6;
export const ACTIONS = ["u", "i", "j", "k", "u+i", "j+k"];
export const MOVES = CHARACTERS.kai.moves;
export const COMMAND_WINDOW = 0.85;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function emptyInput() {
  return { x: 0, z: 0, guard: false, crouch: false, action: null };
}
export function sanitizeInput(v) {
  if (!v || typeof v !== "object") return emptyInput();
  return {
    x: Number.isFinite(v.x) ? clamp(v.x, -1, 1) : 0,
    z: Number.isFinite(v.z) ? clamp(v.z, -1, 1) : 0,
    guard: v.guard === true,
    crouch: v.crouch === true,
    action: ACTIONS.includes(v.action) ? v.action : null,
  };
}
export function inputDirection(input, facing) {
  const forward = Math.sign(input.x) * facing,
    vertical = Math.sign(input.z);
  return 5 + forward - vertical * 3;
}
export function matchesCommand(
  f,
  sequence,
  window = COMMAND_WINDOW,
  keepNeutral = false,
) {
  const entries = f.commands.filter(
    (e) => f.commandTime - e.at <= window && (keepNeutral || e.dir !== 5),
  );
  return (
    entries.length >= sequence.length &&
    sequence.every(
      (dir, i) => entries[entries.length - sequence.length + i].dir === dir,
    )
  );
}
function recordDirection(f, input, dt) {
  const dir = inputDirection(input, f.facing);
  f.commandTime += dt;
  f.commands = f.commands.filter((e) => f.commandTime - e.at < 1.4);
  if (dir !== f.direction) {
    f.direction = dir;
    f.commands.push({ dir, at: f.commandTime });
    f.commands = f.commands.slice(-16);
    if (dir === 6 && matchesCommand(f, [6, 5, 6], 0.3, true)) f.dash = 0.24;
  }
}
export function resolveMove(f, action) {
  if (action === "u+i") return "throw";
  if (action === "j+k") return "sweep";
  const p = character(f.character);
  for (const [key, button, sequence] of [...p.commands].sort(
    (a, b) => b[2].length - a[2].length,
  )) {
    if (action !== button) continue;
    if (
      key === "electric" &&
      f.commandTime - (f.commands.at(-1)?.at ?? -Infinity) >
        p.moves.electric.justFrames / 60 + 1e-9
    )
      continue;
    if (
      sequence.length === 1
        ? f.direction === sequence[0]
        : matchesCommand(f, sequence, COMMAND_WINDOW, sequence.includes(5))
    )
      return key;
  }
  if (f.chain === 1 && action === p.chain[1] && f.chainAge < 0.85)
    return "oneTwo";
  if (f.chain === 2 && action === p.chain[2] && f.chainAge < 0.85)
    return "finish";
  return action;
}
function fighter(x, id, index) {
  return {
    character: id,
    statusTick: -1,
    vx: 0,
    vz: 0,
    blockstun: false,
    airHits: 0,
    airOwner: -1,
    bounceUsed: false,
    bouncePending: false,
    wakeUp: 0,
    downTime: 0,
    hitLevel: "mid",
    hitKind: "rightPunch",
    lastHitBy: -1,
    x,
    z: 0,
    y: 0,
    vy: 0,
    hp: MAX_HP,
    facing: index === 0 ? 1 : -1,
    angle: x < 0 ? 0 : Math.PI,
    attack: null,
    stun: 0,
    guard: false,
    crouch: false,
    combo: 0,
    comboDamage: 0,
    comboAge: 0,
    chain: 0,
    chainAge: 0,
    buffer: null,
    bufferAge: 0,
    move: 0,
    hitFlash: 0,
    commands: [],
    commandTime: 0,
    direction: 5,
    dash: 0,
    lastMove: "",
    lastMoveAge: 10,
    travel: 0,
  };
}
export function createMatch(ids = ["kai", "ren"]) {
  return {
    version: 6,
    axisAngle: 0,
    hitstop: 0,
    fighters: [
      fighter(-1.45, character(ids[0]).id, 0),
      fighter(1.45, character(ids[1]).id, 1),
    ],
    wins: [0, 0],
    round: 1,
    time: 60,
    phase: "ready",
    phaseTime: 1.5,
    winner: null,
    events: [],
    tick: 0,
    seed: 719,
  };
}
function emit(m, type, data = {}) {
  m.events.push({ type, ...data });
}
function startAttack(m, index, key) {
  const f = m.fighters[index];
  f.chain =
    key === character(f.character).chain[0] ? 1 : key === "oneTwo" ? 2 : 0;
  f.chainAge = 0;
  f.attack = { key, t: 0, hit: false, connected: false, angle: f.angle };
  if (moveFor(f, key).hop) {
    f.y = 0.02;
    f.vy = moveFor(f, key).hop;
  }
  f.buffer = null;
  f.guard = false;
  f.crouch = false;
  f.lastMove = key;
  f.lastMoveAge = 0;
  if (!["u", "i", "j", "k", "oneTwo", "finish"].includes(key))
    f.commands = [{ dir: f.direction, at: f.commandTime }];
  emit(m, "move", { index, key });
}
function resolveHit(m, index) {
  const a = m.fighters[index],
    b = m.fighters[1 - index],
    atk = a.attack,
    move = moveFor(a, atk.key);
  const dx = b.x - a.x,
    dz = b.z - a.z,
    forward = dx * Math.cos(atk.angle) + dz * Math.sin(atk.angle);
  const lateral = Math.abs(
    -dx * Math.sin(atk.angle) + dz * Math.cos(atk.angle),
  );
  if (
    forward < 0.15 ||
    forward > move.range ||
    lateral > move.width ||
    b.wakeUp > 0
  )
    return false;
  const airborne = b.y > 0.01 || b.vy !== 0;
  if (
    airborne &&
    (b.airHits >= JUGGLE_LIMIT ||
      b.bouncePending ||
      b.y > move.airMax ||
      b.y < move.airMin)
  )
    return false;
  if (move.level === "throw" && (b.y > 0.2 || b.crouch || b.stun > 0))
    return false;
  const defendingMove = b.attack ? moveFor(b) : null;
  const highCrush =
    defendingMove?.highCrushFrom !== null &&
    defendingMove?.highCrushFrom !== undefined &&
    b.attack.t >= defendingMove.highCrushFrom &&
    b.attack.t < defendingMove.windup + defendingMove.active / 60;
  if (move.level === "high" && (b.crouch || highCrush) && b.y === 0)
    return false;
  if (move.level === "low" && defendingMove?.hop && b.y > 0.15) return false;
  const blocked =
    b.guard &&
    b.y === 0 &&
    (move.level === "low" ? b.crouch : !b.crouch) &&
    move.level !== "throw";
  if (blocked) {
    atk.blocked = true;
    b.stun = move.blockStun;
    b.blockstun = true;
    b.statusTick = m.tick;
    b.vx = Math.cos(atk.angle) * move.blockPush;
    b.vz = Math.sin(atk.angle) * move.blockPush;
    m.hitstop = Math.max(m.hitstop, 2 / 60);
    emit(m, "block", {
      index: 1 - index,
      x: b.x,
      y: move.impactHeight,
      z: b.z,
      heavy: move.damage > 23,
      kind: move.kind,
      key: atk.key,
      character: a.character,
      advantage: -move.onBlock,
      launcherWindow:
        -move.onBlock >= character(b.character).moves.upper.startup &&
        Math.hypot(dx, dz) <= character(b.character).moves.upper.range - 0.12,
      level: move.level,
    });
    return true;
  }
  const punish = !!b.attack?.blocked;
  atk.punish = punish;
  atk.connected = true;
  const continuing = airborne
    ? b.airOwner === index
    : b.stun > 0 && !b.blockstun && b.lastHitBy === index;
  const damage = Math.max(
    1,
    Math.round(
      move.damage *
        (airborne ? Math.max(0.3, 0.72 - b.airHits * 0.08) : 1) *
        (continuing && a.combo >= 3 ? 0.85 : 1),
    ),
  );
  b.hitLevel = move.level;
  b.hitKind = move.kind;
  b.lastHitBy = index;
  b.hp = Math.max(0, b.hp - damage);
  b.stun = move.stun;
  b.statusTick = m.tick;
  b.blockstun = false;
  m.hitstop = Math.max(m.hitstop, move.hitstop / 60);
  b.attack = null;
  b.buffer = null;
  b.guard = false;
  b.hitFlash = 0.13;
  const push = move.push * (airborne ? 0.38 : move.launch ? 0.65 : 1);
  b.vx = Math.cos(atk.angle) * push;
  b.vz = Math.sin(atk.angle) * push;
  if (move.knockdown && !airborne) {
    b.downTime = move.stun;
    b.wakeUp = move.stun + 0.1;
    b.vx *= 1.15;
    b.vz *= 1.15;
  } else if (move.launch && !airborne) {
    b.vy = 8;
    b.y = 0.02;
    b.stun = 0.85;
    b.airHits = 0;
    b.airOwner = index;
    b.bounceUsed = false;
    b.bouncePending = false;
  } else if (airborne) {
    b.airHits++;
    b.airOwner = index;
    if (move.bound && !b.bounceUsed) {
      b.bounceUsed = true;
      b.bouncePending = true;
      b.vy = -6;
    } else {
      // Keep the target reachable without raising it indefinitely on repeated hits.
      const lift = Math.max(2.4, 5 - b.airHits * 0.4);
      b.vy = Math.min(lift, Math.sqrt(Math.max(0, 2 * GRAVITY * (1.85 - b.y))));
    }
    b.stun = Math.max(b.stun, 0.5);
  }
  a.combo = continuing ? a.combo + 1 : 1;
  a.comboDamage = a.combo === 1 ? damage : a.comboDamage + damage;
  a.comboAge = 0;
  emit(m, "hit", {
    index,
    key: atk.key,
    damage,
    kind: move.kind,
    character: a.character,
    punish,
    level: move.level,
    combo: a.combo,
    total: a.comboDamage,
    x: b.x,
    y: Math.max(
      b.y + 0.02,
      Math.min(b.y + 1.9, atk.height ?? move.impactHeight),
    ),
    z: b.z,
    launch: !!move.launch,
    knockdown: !!move.knockdown && !airborne,
    bound: !!move.bound && airborne && b.bouncePending,
    heavy: move.damage >= 23,
    hitstop: move.hitstop,
  });
  return true;
}
function finishRound(m) {
  const [a, b] = m.fighters;
  const winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
  m.winner = winner;
  if (winner !== -1) m.wins[winner]++;
  m.phase = m.wins.some((n) => n >= 2) ? "matchEnd" : "roundEnd";
  m.phaseTime = 3;
  emit(m, "roundEnd", { winner, ko: m.time > 0 });
}
export function step(m, rawInputs, dt = 1 / 60) {
  dt = clamp(dt, 0, 0.05);
  m.events = [];
  m.tick++;
  if (m.phase !== "fight") {
    if (m.phase === "matchEnd") return;
    m.phaseTime -= dt;
    if (m.phaseTime <= 0) {
      if (m.phase === "ready") {
        m.phase = "fight";
        emit(m, "fight");
      } else {
        m.round++;
        m.time = 60;
        m.fighters = [
          fighter(-1.45, m.fighters[0].character, 0),
          fighter(1.45, m.fighters[1].character, 1),
        ];
        m.axisAngle = 0;
        m.hitstop = 0;
        m.phase = "ready";
        m.phaseTime = 1.5;
        m.winner = null;
        emit(m, "ready");
      }
    }
    return;
  }
  const [fa, fb] = m.fighters;
  m.axisAngle = Math.atan2(fb.z - fa.z, fb.x - fa.x);
  // Defense is sampled for both players before either attack resolves; player order grants no guard advantage.
  for (let i = 0; i < 2; i++) {
    const f = m.fighters[i],
      input = sanitizeInput(rawInputs[i]),
      back = input.x * f.facing < -0.25,
      recovered = !f.attack || f.attack.t + dt + 1e-9 >= moveFor(f).duration;
    // Guard becomes available on the recovery boundary for BOTH player orders.
    f.guard =
      back && recovered && (f.stun <= dt + 1e-9 || f.blockstun) && f.y === 0;
    f.crouch =
      (input.crouch || (back && input.z > 0.25)) && recovered && f.y === 0;
  }
  if (m.hitstop > 0) {
    m.hitstop = Math.max(0, m.hitstop - dt);
    if (m.hitstop < 1e-9) m.hitstop = 0;
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i],
        input = sanitizeInput(rawInputs[i]);
      recordDirection(f, input, dt);
      if (
        input.action &&
        (f.stun === 0 ||
          (f.blockstun && f.stun <= GUARD_BUFFER_FRAMES / 60 + 1e-9))
      ) {
        f.buffer = resolveMove(f, input.action);
        f.bufferAge = 0;
      }
    }
    return;
  }
  m.time = Math.max(0, m.time - dt);
  for (let i = 0; i < 2; i++) {
    const f = m.fighters[i],
      other = m.fighters[1 - i],
      input = sanitizeInput(rawInputs[i]);
    f.comboAge += dt;
    f.chainAge += dt;
    f.bufferAge += dt;
    f.lastMoveAge += dt;
    f.dash = Math.max(0, f.dash - dt);
    f.hitFlash = Math.max(0, f.hitFlash - dt);
    if (f.statusTick !== m.tick) {
      f.wakeUp = Math.max(0, f.wakeUp - dt);
      f.downTime = Math.max(0, f.downTime - dt);
      if (f.downTime < 1e-9) f.downTime = 0;
      f.stun = Math.max(0, f.stun - dt);
      if (f.stun < 1e-9) f.stun = 0;
    }
    f.move = 0;
    if (f.stun === 0) f.blockstun = false;
    if (f.statusTick !== m.tick) {
      f.x += f.vx * dt;
      f.z += f.vz * dt;
      f.vx *= Math.max(0, 1 - dt * 9);
      f.vz *= Math.max(0, 1 - dt * 9);
    }
    if (f.statusTick !== m.tick && (f.y > 0 || f.vy > 0)) {
      f.y = Math.max(0, f.y + f.vy * dt);
      f.vy -= GRAVITY * dt;
      if (f.y === 0) {
        if (f.bouncePending) {
          f.bouncePending = false;
          f.y = 0.03;
          f.vy = 6.3;
          f.stun = Math.max(f.stun, 0.55);
        } else {
          const knockedOutOfAir = f.airOwner !== -1 || f.stun > 0;
          f.vy = 0;
          f.airHits = 0;
          f.airOwner = -1;
          if (knockedOutOfAir) {
            f.stun = Math.max(f.stun, 0.18);
            f.wakeUp = 0.28;
          }
        }
      }
    }
    if (!f.attack) {
      f.angle = m.axisAngle + (i === 1 ? Math.PI : 0);
      f.facing = i === 0 ? 1 : -1;
    }
    recordDirection(f, input, dt);
    // Resolve the command when the attack button is pressed, not after its buffered recovery.
    if (
      input.action &&
      f.y === 0 &&
      (f.stun === 0 ||
        (f.blockstun && f.stun <= GUARD_BUFFER_FRAMES / 60 + 1e-9))
    ) {
      // Correct a split-frame chord before the basic strike becomes active.
      if (
        ["u+i", "j+k"].includes(input.action) &&
        ["u", "i", "j", "k"].includes(f.attack?.key) &&
        f.attack.t <= 2 / 60 &&
        !f.attack.hit
      )
        f.attack = null;
      f.buffer = resolveMove(f, input.action);
      f.bufferAge = 0;
    }
    // The input frame is startup frame 1, rather than an extra idle frame.
    if (
      !f.attack &&
      f.stun === 0 &&
      f.y === 0 &&
      f.buffer &&
      f.bufferAge < 0.65
    )
      startAttack(m, i, f.buffer);
    if (f.attack) {
      f.attack.t += dt;
      const move = moveFor(f);
      f.attack.height =
        move.level === "low"
          ? move.impactHeight
          : Math.max(move.impactHeight, Math.min(2, other.y + 0.1));
      if (move.lunge && f.attack.t < move.windup) {
        // Charge in along the committed attack axis, but never pass through a foe.
        const room =
          (other.x - f.x) * Math.cos(f.attack.angle) +
          (other.z - f.z) * Math.sin(f.attack.angle) -
          0.9;
        const amount = Math.min(
          Math.max(0, room),
          (move.lunge * dt) / move.windup,
        );
        f.x += Math.cos(f.attack.angle) * amount;
        f.z += Math.sin(f.attack.angle) * amount;
      }
      if (!f.attack.hit && f.attack.t + 1e-9 >= move.windup) {
        if (f.attack.t < move.windup + move.active / 60 - 1e-9)
          f.attack.hit = resolveHit(m, i);
        else f.attack.hit = true;
      }
      const juggleCancel =
        f.attack?.connected &&
        f.buffer &&
        other.y > 0 &&
        other.airOwner === i &&
        other.airHits < JUGGLE_LIMIT &&
        move.juggleCancel !== null &&
        f.attack.t >= move.windup + move.juggleCancel / 60;
      const chainCancel =
        f.attack &&
        f.attack.connected &&
        f.buffer &&
        ((f.attack.key === character(f.character).chain[0] &&
          f.buffer === "oneTwo") ||
          (f.attack.key === "oneTwo" && f.buffer === "finish"));
      if (
        f.attack &&
        (f.attack.t + 1e-9 >= move.duration ||
          (chainCancel && f.attack.t >= move.windup + 0.065) ||
          juggleCancel)
      )
        f.attack = null;
    }
    if (!f.attack && f.stun === 0 && f.y === 0) {
      if (f.buffer && f.bufferAge < 0.65) startAttack(m, i, f.buffer);
      else {
        const forward = input.x * f.facing;
        if (forward < -0.1) f.dash = 0;
        const dashing = f.dash > 0 && forward > 0.25;
        const len = Math.max(1, Math.hypot(input.x, input.z)),
          speed = f.crouch
            ? 1.45
            : dashing
              ? DASH_SPEED
              : Math.abs(input.z) > 0.1
                ? SIDESTEP_SPEED
                : WALK_SPEED;
        const directional = dashing
          ? 1
          : forward > 0.1
            ? FORWARD_SPEED / WALK_SPEED
            : forward < -0.1
              ? BACKWARD_SPEED / WALK_SPEED
              : 1;
        const adjusted = speed * character(f.character).speed * directional,
          c = Math.cos(m.axisAngle),
          s = Math.sin(m.axisAngle);
        const dx = ((input.x * c - input.z * s) / len) * adjusted * dt,
          dz = ((input.x * s + input.z * c) / len) * adjusted * dt;
        f.x += dx;
        f.z += dz;
        f.move = Math.min(1, Math.hypot(input.x, input.z));
        f.travel += Math.hypot(dx, dz);
      }
    }
    // No ring boundary, coordinate wrapping, or invisible walls: positions remain in world space.
  }
  const [a, b] = m.fighters,
    dx = b.x - a.x,
    dz = b.z - a.z,
    d = Math.hypot(dx, dz);
  if (d < 0.85) {
    const nx = d < 0.001 ? 1 : dx / d,
      nz = d < 0.001 ? 0 : dz / d,
      p = (0.85 - d) / 2;
    a.x -= nx * p;
    a.z -= nz * p;
    b.x += nx * p;
    b.z += nz * p;
  }
  m.axisAngle = Math.atan2(b.z - a.z, b.x - a.x);
  if (m.time === 0 || m.fighters.some((f) => f.hp === 0)) finishRound(m);
}
export function cpuInput(m, index = 1) {
  const f = m.fighters[index],
    o = m.fighters[1 - index],
    dx = o.x - f.x,
    dz = o.z - f.z,
    d = Math.hypot(dx, dz),
    input = emptyInput();
  if (m.phase !== "fight") return input;
  m.seed = (Math.imul(m.seed, 1664525) + 1013904223) >>> 0;
  const r = m.seed / 4294967296;
  if (o.attack && d < 2.4 && r < 0.53) {
    input.x = -f.facing;
    input.crouch = moveFor(o).level === "low";
  } else if (d > 1.65) {
    input.x = f.facing * 0.75;
  } else if (m.tick % 190 < 20) {
    input.x = -f.facing * 0.65;
  }
  const p = character(f.character);
  const commandInput = (key) => {
    const [, button, sequence] = p.commands.find((r) => r[0] === key);
    const dir = sequence.at(-1);
    input.x = (dir % 3 === 1 ? -1 : dir % 3 === 0 ? 1 : 0) * f.facing;
    input.z = dir <= 3 ? 1 : dir >= 7 ? -1 : 0;
    input.action = button;
  };
  // The CPU enters the same direction sequence as a player; no direct move injection.
  const planKey = ["rushStrike", "electric", "hellSweep", "runningKick"][
    Math.floor(m.tick / 210) % 4
  ];
  const [, planButton, planSequence] = p.commands.find((r) => r[0] === planKey);
  const planFrame = (m.tick % 210) - 40,
    planStep = Math.floor(planFrame / 2);
  if (
    planFrame >= 0 &&
    planFrame < planSequence.length * 2 &&
    d < 3.4 &&
    f.stun === 0 &&
    !f.attack &&
    !f.buffer &&
    o.y === 0
  ) {
    const dir = planSequence[planStep];
    input.x = (dir % 3 === 1 ? -1 : dir % 3 === 0 ? 1 : 0) * f.facing;
    input.z = dir <= 3 ? 1 : dir >= 7 ? -1 : 0;
    input.crouch = false;
    input.action =
      planFrame === planSequence.length * 2 - 1 ? planButton : null;
    return input;
  }
  if (
    o.y > 0 &&
    o.airOwner === index &&
    o.airHits < JUGGLE_LIMIT &&
    f.stun === 0 &&
    !f.buffer &&
    (!f.attack || f.attack.connected) &&
    m.tick % 4 === 0
  ) {
    if (o.airHits >= 2 && !o.bounceUsed) commandInput("bound");
    else {
      input.x = 0;
      input.z = 0;
      input.action = p.chain[f.chain === 1 ? 1 : f.chain === 2 ? 2 : 0];
    }
    return input;
  }
  if (m.tick % 25 === 0 && d < 2.2 && input.x * f.facing >= 0) {
    input.action = ["u", "i", "j", "k", "u+i", "j+k"][Math.floor(r * 6)];
    if (r < 0.16) {
      input.x = f.facing;
      input.z = 1;
      input.action = character(f.character).commands.find(
        (r) => r[0] === "upper",
      )[1];
    } else if (r < 0.3) {
      commandInput("low");
    } else if (r > 0.6) {
      commandInput(
        ["hook", "elbow", "toeKick", "sideKick", "kneeStrike"][
          Math.min(4, Math.floor((r - 0.6) / 0.08))
        ],
      );
    }
  }
  if (o.attack && m.tick % 140 < 24 && input.x * f.facing >= 0) input.z = 0.8;
  return input;
}
