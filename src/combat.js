import { chooseStage, constrainToStage, wallContact } from "./stages.js";
import { CHARACTERS, character, moveFor } from "./characters.js";
export { CHARACTERS, moveFor };
export const MAX_HP = 120;

const GRAVITY = 20;
export const WALK_SPEED = 3.5;
export const FORWARD_SPEED = 4.0;
export const BACKWARD_SPEED = 2.6;
export const GUARD_BUFFER_FRAMES = 6;
export const SIDESTEP_SPEED = 3.8;
export const DASH_SPEED = 5.6;
export const RUN_SPEED = 7;
export const ACTIONS = ["u", "i", "j", "k", "u+i", "j+k"];
export const MOVES = CHARACTERS.kai.moves;
export const COMMAND_WINDOW = 0.85;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function emptyInput() {
  return { x: 0, z: 0, orbit: 0, guard: false, crouch: false, action: null };
}
export function sanitizeInput(v) {
  if (!v || typeof v !== "object") return emptyInput();
  return {
    x: Number.isFinite(v.x) ? clamp(v.x, -1, 1) : 0,
    z: Number.isFinite(v.z) ? clamp(v.z, -1, 1) : 0,
    orbit: Number.isFinite(v.orbit) ? clamp(v.orbit, -1, 1) : 0,
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
  if (keepNeutral) {
    if (entries.at(-1)?.dir !== sequence.at(-1)) return false;
    let cursor = entries.length - 1;
    for (let i = sequence.length - 1; i >= 0; i--) {
      while (cursor >= 0 && entries[cursor].dir !== sequence[i]) cursor--;
      if (cursor < 0) return false;
      cursor--;
    }
    return true;
  }
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
    if (dir === 6 && matchesCommand(f, [6, 5, 6], 0.3, true)) {
      f.dash = 0.3;
      f.runCharge = dt;
    }
    if (dir === 4 && matchesCommand(f, [4, 5, 4], 0.3, true)) f.backDash = 0.2;
  }
}
export function resolveMove(f, action) {
  if (f.character === "raon") {
    if (action === "j+k") return "focusBurst";
    if (action === "u+i")
      return f.direction === 4
        ? "throw"
        : matchesCommand(f, [2, 3, 6])
          ? "exWave"
          : "exDragon";
  }
  if (action === "u+i") return "throw";
  if (action === "j+k") return "sweep";
  const p = character(f.character);

  const source = f.attack?.key ?? f.lastMove;
  const prior = p.moves[source];
  const follow = p.followUps.find(
    ([from, button]) => from === source && button === action,
  );
  if (
    follow &&
    prior &&
    (!source.startsWith("jump") || f.jumpActive) &&
    (follow[2] !== "rushLink" || f.hopCombo) &&
    (f.attack
      ? f.attack.t >= 0.08
      : f.lastMoveAge >= prior.duration &&
        f.lastMoveAge <= prior.duration + 0.18)
  )
    return follow[2];
  if (
    ["kai", "raon"].includes(f.character) &&
    f.direction === 9 &&
    action === "j"
  )
    return "hopKick";
  if (f.jumpActive || (f.y === 0 && f.direction >= 7))
    return action === "u" || action === "i" ? "jumpPunch" : "jumpKick";
  if (f.riseWindow > 0 && f.direction === 5 && action === "i")
    return "risingUpper";
  if (f.riseWindow > 0 && f.direction === 5 && action === "j")
    return "risingKick";

  for (const [key, button, sequence] of [...p.commands].sort(
    (a, b) => b[2].length - a[2].length,
  )) {
    if (action !== button) continue;
    if (
      sequence.length === 1 &&
      f.crouch &&
      f.direction === 2 &&
      ["u", "k"].includes(action)
    )
      continue;
    if (
      p.moves[key].justFrames !== null &&
      f.commandTime - (f.commands.at(-1)?.at ?? -Infinity) >=
        p.moves[key].justFrames / 60 - 1e-9
    )
      continue;
    if (
      sequence.length === 1
        ? f.direction === sequence[0]
        : matchesCommand(f, sequence, COMMAND_WINDOW, sequence.includes(5))
    )
      return key;
  }
  if (f.crouch && f.direction === 2 && action === "u") return "crouchPunch";
  if (f.crouch && f.direction === 2 && action === "k") return "crouchKick";
  if (f.chain === 1 && action === p.chain[1] && f.chainAge < 0.85)
    return "oneTwo";
  if (f.chain === 2 && action === p.chain[2] && f.chainAge < 0.85)
    return "finish";
  return action;
}
function fighter(x, id, index) {
  return {
    character: id,
    riseWindow: 0,
    wasCrouch: false,
    jumpHeld: false,
    jumpActive: false,
    jumpBuffer: 0,
    verticalDir: 0,
    verticalTime: 0,
    verticalTapAge: 1,
    verticalTapDir: 0,
    verticalCount: 0,
    verticalUsed: false,
    sideStepTime: 0,
    sideStepDir: 0,
    effectiveOrbit: 0,
    backDash: 0,
    wallHits: 0,
    wallSplatUsed: false,
    ki: 0,
    punishCombo: false,
    runCharge: 0,
    running: false,
    basicAirHits: 0,
    hopCombo: false,
    throwTime: 0,
    throwRole: 0,
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
export function createMatch(ids = ["kai", "ren"], stage = "terminal") {
  return {
    version: 17,
    stage: chooseStage(stage),
    axisAngle: 0,
    viewAngle: 0,
    hitstop: 0,
    projectiles: [],
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
  const cost = moveFor(f, key).kiCost ?? 0;
  if (f.ki < cost) {
    f.buffer = null;
    emit(m, "noKi", { index });
    return;
  }
  f.ki -= cost;
  f.runCharge = 0;
  f.running = false;
  f.chain =
    key === character(f.character).chain[0] ? 1 : key === "oneTwo" ? 2 : 0;
  f.chainAge = 0;
  f.attack = { key, t: 0, hit: false, connected: false, angle: f.angle };
  if (key.startsWith("jump")) f.jumpActive = true;
  if (!key.startsWith("jump") && !f.jumpActive && f.airOwner === -1) {
    f.y = 0;
    f.vy = 0;
  }
  if (key.startsWith("jump") && f.y === 0) {
    f.y = 0.02;
    f.vy = 6.5;
  }
  if (moveFor(f, key).hop) {
    const other = m.fighters[1 - index];
    f.hopCombo = other.y > 0 && other.airOwner === index;
    f.jumpActive = !f.hopCombo;
    f.y = 0.02;
    f.vy = moveFor(f, key).hop;
  }
  f.wasCrouch = false;
  f.riseWindow = 0;
  const evade = moveFor(f, key).evadeSide ?? 0;
  if (evade) {
    f.x -= Math.sin(f.angle) * evade;
    f.z += Math.cos(f.angle) * evade;
  }
  f.backDash = 0;
  f.buffer = null;
  f.guard = false;
  f.crouch = false;
  f.lastMove = key;
  f.lastMoveAge = 0;
  if (!["u", "i", "j", "k", "oneTwo", "finish"].includes(key))
    f.commands = [{ dir: f.direction, at: f.commandTime }];
  emit(m, "move", { index, key });
}
function resolveHit(m, index, training, projectile = null) {
  const a = m.fighters[index],
    b = m.fighters[1 - index],
    atk = projectile ?? a.attack,
    move = moveFor(a, atk.key);
  const dx = b.x - (projectile ?? a).x,
    dz = b.z - (projectile ?? a).z,
    forward = dx * Math.cos(atk.angle) + dz * Math.sin(atk.angle);
  const lateral = Math.abs(
    -dx * Math.sin(atk.angle) + dz * Math.cos(atk.angle),
  );
  const airborne = b.y > 0.01 || b.vy !== 0;
  if (
    forward < 0.15 ||
    forward > move.range ||
    lateral > move.width ||
    (b.wakeUp > 0 &&
      !(
        b.downTime > 0 &&
        !airborne &&
        move.level === "low" &&
        b.throwTime === 0
      )) ||
    (b.downTime > 0 && (airborne || move.level !== "low"))
  )
    return false;
  if (airborne && (b.bouncePending || b.y > move.airMax || b.y < move.airMin))
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
    move.level !== "throw" &&
    Math.cos(Math.atan2(a.z - b.z, a.x - b.x) - b.angle) > -0.15;
  if (blocked) {
    atk.blocked = true;
    b.stun = move.blockStun;
    b.blockstun = true;
    b.statusTick = m.tick;
    b.vx = Math.cos(atk.angle) * move.blockPush;
    b.vz = Math.sin(atk.angle) * move.blockPush;
    const chip = Math.max(0, Math.min(b.hp - 1, move.chip ?? 0));
    b.hp -= chip;
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
      chip,
      advantage: -move.onBlock,
      launcherWindow:
        -move.onBlock >= character(b.character).moves.upper.startup &&
        Math.hypot(dx, dz) <= character(b.character).moves.upper.range - 0.12,
      level: move.level,
    });
    return true;
  }
  const counter = !!b.attack && !b.blockstun && b.attack.t < moveFor(b).windup;
  const launch = move.launch || (counter && move.counterLaunch);
  const punish = !!b.attack?.blocked;
  atk.punish = punish;
  atk.connected = true;
  const continuing = airborne
    ? b.airOwner === index
    : b.stun > 0 && !b.blockstun && b.lastHitBy === index;
  if (!continuing) a.punishCombo = punish;
  if (!airborne && !continuing) {
    b.wallSplatUsed = false;
    b.wallHits = 0;
  }
  const basicAir =
    airborne &&
    continuing &&
    ["u", "i", "j", "k", "oneTwo", "finish"].includes(atk.key);
  const basicScale = basicAir
    ? 0.6 * Math.max(0.65, 1 - b.basicAirHits * 0.1)
    : 1;
  const tip =
    move.tipBonus && forward >= move.range * (move.tipStart ?? 0.75)
      ? move.tipBonus
      : 0;
  let damage = Math.max(
    1,
    Math.round(
      (move.damage + tip) *
        (a.punishCombo ? 0.85 : 1) *
        basicScale *
        (counter ? (move.counterPower ?? 1.15) : 1) *
        (airborne ? 0.8 : 1) *
        (continuing
          ? Math.max(0.2, 1 - a.combo * 0.12) *
            character(a.character).comboScale
          : 1),
    ),
  );
  const armored =
    defendingMove?.armorFrom != null &&
    b.attack.t >= defendingMove.armorFrom &&
    b.attack.t < defendingMove.windup &&
    !b.attack.armorUsed &&
    !airborne &&
    ["high", "mid"].includes(move.level);
  const contact =
    !armored && (airborne || (move.wallSplat && b.downTime === 0))
      ? wallContact(b, atk.angle, m.stage)
      : null;
  const nearWall = !!contact;
  const wallSplat = nearWall && !!move.wallSplat && !b.wallSplatUsed;
  const wallBonus = nearWall
    ? b.wallHits === 0
      ? 6
      : b.wallHits === 1
        ? 3
        : 0
    : 0;
  damage += wallBonus;
  if (nearWall) b.wallHits++;
  if (basicAir) b.basicAirHits++;
  b.hitLevel = move.level;
  b.hitKind = move.kind;
  b.lastHitBy = index;
  b.hp = Math.max(training ? 1 : 0, b.hp - damage);
  if (a.character === "raon" && !move.kiCost) a.ki = Math.min(40, a.ki + 1);
  if (b.character === "raon") b.ki = Math.min(40, b.ki + 0.25);
  if (armored) {
    b.attack.armorUsed = true;
    b.hitFlash = 0.13;
    m.hitstop = Math.max(m.hitstop, 2 / 60);
    emit(m, "hit", {
      index,
      key: atk.key,
      character: a.character,
      kind: move.kind,
      level: move.level,
      damage,
      x: b.x,
      y: move.impactHeight,
      z: b.z,
      armor: true,
    });
    return true;
  }
  b.stun = move.stun;
  b.statusTick = m.tick;
  b.blockstun = false;
  m.hitstop = Math.max(m.hitstop, move.hitstop / 60);
  b.attack = null;
  b.buffer = null;
  b.jumpBuffer = 0;
  b.jumpActive = false;
  b.guard = false;
  b.hitFlash = 0.13;
  const push = airborne
    ? move.push * (0.58 + b.airHits * 0.27) + b.airHits * 0.36
    : move.push * (move.launch ? 0.65 : 1);
  b.vx = Math.cos(atk.angle) * push;
  b.vz = Math.sin(atk.angle) * push;
  if (b.downTime > 0 && !airborne) {
    b.stun = 0.25;
    b.downTime = 0.45;
    b.wakeUp = 0.55;
  } else if (move.knockdown && !airborne && !launch) {
    b.downTime = move.stun;
    b.wakeUp = move.stun + 0.1;
    b.vx *= 1.15;
    b.vz *= 1.15;
  } else if (launch && !airborne) {
    b.vy = 8;
    b.y = 0.02;
    b.stun = 0.85;
    b.airHits = 0;
    b.airOwner = index;
    b.wallHits = nearWall ? 1 : 0;
    b.wallSplatUsed = false;
    b.basicAirHits = 0;
    b.bounceUsed = false;
    b.bouncePending = false;
  } else if (airborne) {
    b.airHits++;
    b.airOwner = index;
    if (move.bound && !b.bounceUsed) {
      b.bounceUsed = true;
      b.bouncePending = true;
      b.vy = -6;
    } else if (move.bound && b.bounceUsed) {
      // A second bound ends the juggle instead of granting another bounce.
      b.bouncePending = false;
      b.airOwner = -1;
      b.downTime = 0.8;
      b.wakeUp = 0.9;
      b.vy = -8;
    } else {
      // Keep the target reachable without raising it indefinitely on repeated hits.
      const lift = Math.max(0.2, 5 - b.airHits * 0.36);
      b.vy = Math.min(lift, Math.sqrt(Math.max(0, 2 * GRAVITY * (1.85 - b.y))));
    }
    b.stun = Math.max(b.stun, 0.5);
    if (move.kiExtend && b.downTime === 0) {
      b.y = Math.min(b.y, 0.9);
      b.vy = 6.5;
      b.stun = Math.max(b.stun, 0.85);
      b.vx *= 0.25;
      b.vz *= 0.25;
    }
  }
  if (nearWall) {
    b.vx = b.vz = 0;
    if (b.wallHits >= 3 || (move.wallSplat && b.wallSplatUsed)) {
      b.bouncePending = false;
      b.airOwner = -1;
      b.downTime = 0.85;
      b.wakeUp = 0.95;
      b.vy = -8;
    } else if (wallSplat) {
      // One wall rebound per combo, independent of the floor bound.
      if (!airborne) {
        b.airHits = b.basicAirHits = 0;
        b.bounceUsed = false;
      }
      const distance =
        (b.x - contact.a[0]) * contact.nx +
        (b.z - contact.a[1]) * contact.nz -
        0.5;
      b.x -= contact.nx * distance;
      b.z -= contact.nz * distance;
      b.wallSplatUsed = true;
      b.bouncePending = false;
      b.downTime = b.wakeUp = 0;
      b.y = Math.max(0.18, Math.min(b.y, 0.85));
      b.vy = 6.2;
      b.vx = contact.nx * 2.2;
      b.vz = contact.nz * 2.2;
      b.airOwner = index;
      b.stun = Math.max(b.stun, 0.8);
      m.hitstop = Math.max(m.hitstop, 7 / 60);
    } else b.vy = Math.min(b.vy, 3.5);
  }
  if (move.level === "throw" && !airborne) {
    const ax = a.x,
      az = a.z;
    a.x = b.x;
    a.z = b.z;
    b.x = ax;
    b.z = az;
    a.throwTime = 0.42;
    b.throwTime = 0.42;
    a.throwRole = 1;
    b.throwRole = -1;
    b.downTime = Math.max(b.downTime, 0.65);
    b.wakeUp = Math.max(b.wakeUp, 0.75);
    b.stun = Math.max(b.stun, 0.65);
    a.vx = a.vz = b.vx = b.vz = 0;
    a.attack.angle = Math.atan2(b.z - a.z, b.x - a.x);
    a.angle = a.attack.angle;
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
    throw: move.level === "throw",
    counter,
    launch: !!launch,
    knockdown: !!move.knockdown && !airborne && !launch,
    tip: !!tip,
    basicAir,
    wall: nearWall,
    wallSplat: wallSplat && b.wallSplatUsed && b.downTime === 0,
    wallBonus,
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
function updateAxis(m) {
  const [a, b] = m.fighters;
  m.axisAngle = Math.atan2(b.z - a.z, b.x - a.x);
  const delta = Math.atan2(
    Math.sin(m.axisAngle - m.viewAngle),
    Math.cos(m.axisAngle - m.viewAngle),
  );
  m.viewAngle +=
    delta > Math.PI / 2
      ? delta - Math.PI
      : delta < -Math.PI / 2
        ? delta + Math.PI
        : delta;
  const facing = Math.cos(m.axisAngle - m.viewAngle) >= 0 ? 1 : -1;
  a.facing = facing;
  b.facing = -facing;
}
export function step(m, rawInputs, dt = 1 / 60, training = false) {
  dt = clamp(dt, 0, 0.05);
  m.events = [];
  m.tick++;
  if (m.phase !== "fight") {
    if (m.phase === "matchEnd") return;
    m.phaseTime -= dt;
    if (m.phaseTime <= 0) {
      if (m.phase === "ready") {
        m.phase = "fight";
        m.phaseTime = 0.6;
        emit(m, "fight");
      } else {
        m.round++;
        m.time = 60;
        const ki = m.fighters.map((f) => f.ki);
        m.fighters = [
          fighter(-1.45, m.fighters[0].character, 0),
          fighter(1.45, m.fighters[1].character, 1),
        ];
        m.fighters.forEach((f, i) => (f.ki = ki[i]));
        m.axisAngle = 0;
        m.viewAngle = 0;
        m.hitstop = 0;
        m.projectiles = [];
        m.phase = "ready";
        m.phaseTime = 1.5;
        m.winner = null;
        emit(m, "ready");
      }
    }
    return;
  }
  m.phaseTime = Math.max(0, m.phaseTime - dt);
  const [fa, fb] = m.fighters;
  updateAxis(m);
  // Defense is sampled for both players before either attack resolves; player order grants no guard advantage.
  for (let i = 0; i < 2; i++) {
    const f = m.fighters[i],
      input = sanitizeInput(rawInputs[i]),
      back = input.x * f.facing < -0.25,
      recovered = !f.attack || f.attack.t + dt + 1e-9 >= moveFor(f).duration;
    const vertical = Math.sign(input.z);
    f.verticalTapAge += dt;
    f.sideStepTime = Math.max(0, f.sideStepTime - dt);
    f.backDash = Math.max(0, f.backDash - dt);
    if (vertical !== f.verticalDir) {
      if (
        f.verticalDir &&
        f.verticalTime < 0.14 &&
        !f.verticalUsed &&
        !f.attack &&
        !f.stun &&
        !f.downTime
      ) {
        f.sideStepTime = 0.18;
        f.sideStepDir = f.verticalDir;
      }
      if (vertical) {
        f.verticalCount =
          f.verticalTapDir === vertical && f.verticalTapAge < 0.3
            ? f.verticalCount + 1
            : 1;
        f.verticalTapDir = vertical;
        f.verticalTapAge = 0;
      }
      f.verticalDir = vertical;
      f.verticalTime = 0;
      f.verticalUsed = false;
    }
    if (vertical) f.verticalTime += dt;
    if (
      input.action ||
      (vertical && Math.abs(input.x) > 0.25) ||
      (back && vertical > 0)
    )
      f.verticalUsed = true;
    f.effectiveOrbit =
      input.orbit ||
      (f.verticalCount >= 2 &&
      vertical &&
      f.verticalTime >= 0.14 &&
      !f.verticalUsed
        ? vertical
        : 0) ||
      (f.sideStepTime > 0 ? f.sideStepDir : 0);
    if (!f.attack && (input.action || Math.abs(input.x) > 0.25 || input.crouch))
      f.angle = m.axisAngle + (i === 1 ? Math.PI : 0);
    // Guard becomes available on the recovery boundary for BOTH player orders.
    f.guard =
      back &&
      recovered &&
      (f.stun <= dt + 1e-9 || f.blockstun) &&
      f.y === 0 &&
      f.downTime === 0;
    f.crouch =
      (input.crouch ||
        (input.z > 0.25 &&
          !f.effectiveOrbit &&
          (f.verticalTime >= 0.14 || input.action || back))) &&
      recovered &&
      f.y === 0 &&
      f.downTime === 0;
  }
  if (m.hitstop > 0) {
    m.hitstop = Math.max(0, m.hitstop - dt);
    if (m.hitstop < 1e-9) m.hitstop = 0;
    for (let i = 0; i < 2; i++) {
      const f = m.fighters[i],
        input = sanitizeInput(rawInputs[i]);
      if (
        input.z < -0.25 &&
        f.verticalTime >= 0.14 &&
        !f.effectiveOrbit &&
        !f.jumpHeld &&
        f.downTime === 0
      )
        f.jumpBuffer = 0.25;
      f.jumpHeld = input.z < -0.25 && f.verticalTime >= 0.14;
      if (
        f.downTime > 0 &&
        f.throwTime === 0 &&
        ["j", "k"].includes(input.action)
      ) {
        f.buffer = input.action === "j" ? "wakeLow" : "wakeMid";
        f.bufferAge = 0;
        continue;
      }
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
    f.jumpBuffer = Math.max(0, f.jumpBuffer - dt);
    f.throwTime = Math.max(0, f.throwTime - dt);
    f.riseWindow = Math.max(0, f.riseWindow - dt);
    if (f.wasCrouch && !f.crouch && f.y === 0) f.riseWindow = 0.22;
    f.wasCrouch = f.crouch;
    f.comboAge += dt;
    f.chainAge += dt;
    f.bufferAge += dt;
    f.lastMoveAge += dt;
    f.dash = Math.max(0, f.dash - dt);
    if (
      f.runCharge > 0 &&
      input.x * f.facing > 0.25 &&
      input.z === 0 &&
      !f.effectiveOrbit &&
      !f.crouch &&
      !f.stun &&
      !f.attack
    )
      f.runCharge += dt;
    else f.runCharge = 0;
    f.running = f.runCharge >= 0.3;
    f.hitFlash = Math.max(0, f.hitFlash - dt);
    if (f.statusTick !== m.tick) {
      f.wakeUp = Math.max(0, f.wakeUp - dt);
      if (f.downTime > 0) f.downTime = Math.max(0.2, f.downTime - dt);
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
        f.jumpActive = false;
        if (f.buffer?.startsWith("jump")) f.buffer = null;
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
            f.downTime = Math.max(f.downTime, 0.65);
            f.wakeUp = Math.max(f.wakeUp, 0.75);
          }
        }
      }
    }
    if (!f.attack) {
      // A stationary fighter keeps their heading; movement/guard/attack turns toward the foe.
      if (
        input.action ||
        Math.abs(input.x) > 0.25 ||
        input.crouch ||
        f.move > 0 ||
        Math.abs(f.effectiveOrbit) > 0
      )
        f.angle = m.axisAngle + (i === 1 ? Math.PI : 0);
    }
    // Ground recovery consumes the input so W gets up rather than jumping.
    if (f.downTime > 0 && f.y === 0 && f.throwTime === 0) {
      const back = input.x * f.facing < -0.25;
      const wakeKey =
        input.action === "j"
          ? "wakeLow"
          : input.action === "k"
            ? "wakeMid"
            : f.buffer;
      const kick = wakeKey === "wakeLow" || wakeKey === "wakeMid";
      if (input.z < -0.25 || back || kick) {
        f.downTime = 0;
        f.verticalUsed = true;
        f.jumpBuffer = 0;
        f.wakeUp = 0;
        f.stun = 0;
        f.blockstun = false;
        f.buffer = null;
        f.crouch = false;
        if (kick) startAttack(m, i, wakeKey);
        if (back && !kick && input.z >= -0.25) {
          f.stun = 0.2;
          f.lastMove = "backRise";
          f.lastMoveAge = 0;
          f.vx = -Math.cos(f.angle) * 4;
          f.vz = -Math.sin(f.angle) * 4;
        }
        f.jumpHeld = input.z < -0.25 && f.verticalTime >= 0.14;
        input.action = null;
      }
    }
    recordDirection(f, input, dt);
    if (
      input.z < -0.25 &&
      f.verticalTime >= 0.14 &&
      !f.effectiveOrbit &&
      !f.jumpHeld &&
      f.downTime === 0
    )
      f.jumpBuffer = 0.25;
    f.jumpHeld = input.z < -0.25 && f.verticalTime >= 0.14;
    const jumpCancel =
      f.attack?.connected &&
      other.y > 0 &&
      other.airOwner === i &&
      moveFor(f).juggleCancel !== null &&
      f.attack.t + dt >= moveFor(f).windup + moveFor(f).juggleCancel / 60;
    if (
      f.jumpBuffer > 0 &&
      f.downTime === 0 &&
      !input.action &&
      (!f.attack || jumpCancel) &&
      f.stun === 0 &&
      f.y === 0
    ) {
      f.attack = null;
      f.buffer = null;
      f.jumpBuffer = 0;
      f.jumpActive = true;
      f.y = 0.02;
      f.vy = 6.5;
      f.crouch = false;
    }
    // Resolve the command when the attack button is pressed, not after its buffered recovery.
    if (
      input.action &&
      f.downTime === 0 &&
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
      f.downTime === 0 &&
      f.stun === 0 &&
      f.buffer &&
      f.bufferAge < 0.65
    )
      startAttack(m, i, f.buffer);
    if (f.attack) {
      f.attack.t += dt;
      const move = moveFor(f);
      if (
        move.homing ||
        (move.trackSide && f.attack.t < Math.max(0, move.windup - 0.1))
      ) {
        const target = Math.atan2(other.z - f.z, other.x - f.x),
          delta = Math.atan2(
            Math.sin(target - f.attack.angle),
            Math.cos(target - f.attack.angle),
          );
        if (move.homing || Math.sign(delta) === move.trackSide) {
          f.attack.angle += move.homing
            ? delta
            : clamp(delta, -1.3 * dt, 1.3 * dt);
          f.angle = f.attack.angle;
        }
      }
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
        if (move.projectile) {
          if (m.projectiles.length < 8)
            m.projectiles.push({
              index: i,
              key: f.attack.key,
              angle: f.attack.angle,
              x: f.x + Math.cos(f.attack.angle) * 0.65,
              z: f.z + Math.sin(f.attack.angle) * 0.65,
              y: move.impactHeight,
              life: 1.6,
            });
          f.attack.hit = true;
        } else if (f.attack.t < move.windup + move.active / 60 - 1e-9)
          f.attack.hit = resolveHit(m, i, training);
        else f.attack.hit = true;
      }
      const juggleCancel =
        f.attack?.connected &&
        f.buffer &&
        other.y > 0 &&
        other.airOwner === i &&
        move.juggleCancel !== null &&
        f.attack.t >= move.windup + move.juggleCancel / 60;
      const chainCancel =
        f.attack &&
        (f.attack.connected || f.attack.blocked) &&
        f.buffer &&
        ((f.attack.key === character(f.character).chain[0] &&
          f.buffer === "oneTwo") ||
          (f.attack.key === "oneTwo" && f.buffer === "finish") ||
          (f.attack.connected &&
            character(f.character).followUps.some(
              ([from, , to]) => f.attack.key === from && f.buffer === to,
            )));
      if (
        f.attack &&
        (f.attack.t + 1e-9 >= move.duration ||
          (chainCancel && f.attack.t >= move.windup + 0.065) ||
          juggleCancel)
      )
        f.attack = null;
    }
    if (!f.attack && f.downTime === 0 && f.stun === 0 && f.y === 0) {
      if (f.buffer && f.bufferAge < 0.65) startAttack(m, i, f.buffer);
      else {
        const forward = input.x * f.facing;
        if (forward < -0.1) f.dash = 0;
        const dashing = f.dash > 0 && forward > 0.25;
        const side = !f.crouch ? f.effectiveOrbit : 0;
        const adjusted =
          (f.crouch
            ? 1.45
            : f.running
              ? RUN_SPEED
              : dashing
                ? DASH_SPEED
                : forward > 0.1
                  ? FORWARD_SPEED
                  : forward < -0.1
                    ? f.backDash > 0
                      ? 5.4
                      : BACKWARD_SPEED
                    : WALK_SPEED) * character(f.character).speed;
        const radial = input.x * adjusted * dt;
        const dx = Math.cos(m.viewAngle) * radial,
          dz = Math.sin(m.viewAngle) * radial;
        f.x += dx;
        f.z += dz;
        if (side) {
          // Rotate the offset exactly instead of Euler-stepping a growing circle.
          const rx = f.x - other.x,
            rz = f.z - other.z,
            distance = Math.max(0.85, Math.hypot(rx, rz));
          const angle =
            (side *
              -f.facing *
              SIDESTEP_SPEED *
              character(f.character).speed *
              dt) /
            distance;
          const co = Math.cos(angle),
            si = Math.sin(angle);
          f.x = other.x + rx * co - rz * si;
          f.z = other.z + rx * si + rz * co;
        }
        f.move = Math.min(1, Math.abs(input.x) + Math.abs(side));
        f.travel += Math.hypot(dx, dz) + (side ? SIDESTEP_SPEED * dt : 0);
      }
    }
    // Infinite stages keep world coordinates; bounded stages clamp both fighters below.
  }
  for (let n = m.projectiles.length - 1; n >= 0; n--) {
    const shot = m.projectiles[n];
    const speed = shot.key === "exWave" ? 12 : 9;
    shot.life -= dt;
    shot.x += Math.cos(shot.angle) * speed * dt;
    shot.z += Math.sin(shot.angle) * speed * dt;
    if (
      shot.life <= 0 ||
      resolveHit(m, shot.index, training, shot) ||
      wallContact(shot, shot.angle, m.stage)
    )
      m.projectiles.splice(n, 1);
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
  for (const f of m.fighters) constrainToStage(f, m.stage);
  updateAxis(m);
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
  if (f.downTime > 0) return { ...input, z: -1 };
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
  if (o.attack && m.tick % 140 < 24 && input.x * f.facing >= 0) {
    input.x = 0;
    input.z = Math.floor(o.attack.t * 60) === 2 ? 0 : 0.8;
  }
  return input;
}

// Training keeps real damage and hit reactions; lethal damage stops at 1 HP.
export function stepPractice(
  m,
  input,
  { behavior = "cpu", infiniteHealth = true, playerIndex = 0 } = {},
) {
  if (
    m.fighters[1 - playerIndex].downTime > 0 &&
    m.fighters[1 - playerIndex].throwTime === 0 &&
    m.fighters[1 - playerIndex].y === 0 &&
    m.fighters[1 - playerIndex].stun === 0
  ) {
    const f = m.fighters[1 - playerIndex];
    f.downTime = 0;
    f.wakeUp = 0;
  }
  m.time = 60;
  step(
    m,
    playerIndex === 0
      ? [input, behavior === "cpu" ? cpuInput(m, 1) : emptyInput()]
      : [behavior === "cpu" ? cpuInput(m, 0) : emptyInput(), input],
    1 / 60,
    infiniteHealth,
  );
  m.time = 60;
  if (infiniteHealth) {
    const active =
      m.fighters.some((f) => f.attack || f.stun > 0) ||
      m.events.some((e) => e.type === "move" || e.type === "hit");
    m.practiceIdle = active ? 0 : (m.practiceIdle ?? 0) + 1 / 60;
    if (m.practiceIdle >= 1.2)
      for (const f of m.fighters)
        f.hp = Math.min(MAX_HP, f.hp + MAX_HP / 0.5 / 60);
  } else m.practiceIdle = 0;
}
