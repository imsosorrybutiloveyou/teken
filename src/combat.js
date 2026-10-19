export const MAX_HP = 120;
export const WALK_SPEED = 5.1;
export const SIDESTEP_SPEED = 5.7;
export const DASH_SPEED = 8.8;
export const ACTIONS = ["u", "i", "j", "k", "u+i", "j+k"];
const move = (
  name,
  command,
  level,
  damage,
  range,
  windup,
  duration,
  kind,
  extra = {},
) => ({
  name,
  command,
  level,
  damage,
  range,
  width: 0.55,
  windup,
  duration,
  stun: 0.3,
  kind,
  ...extra,
});
export const MOVES = {
  u: move("왼손 잽", "U · LP", "high", 8, 1.7, 0.075, 0.22, "leftPunch"),
  i: move(
    "오른손 스트레이트",
    "I · RP",
    "mid",
    12,
    1.85,
    0.11,
    0.29,
    "rightPunch",
  ),
  j: move("왼발 프런트 킥", "J · LK", "mid", 15, 2.05, 0.16, 0.37, "leftKick"),
  k: move(
    "오른발 라운드 킥",
    "K · RK",
    "mid",
    18,
    2.15,
    0.2,
    0.45,
    "rightKick",
    { width: 0.65 },
  ),
  oneTwo: move("원 투", "U → I", "mid", 11, 1.9, 0.09, 0.25, "rightPunch", {
    stun: 0.36,
  }),
  finish: move("스핀 피니시", "U → I → K", "mid", 22, 2.3, 0.16, 0.44, "spin", {
    width: 0.8,
    stun: 0.45,
  }),
  upper: move(
    "라이징 어퍼",
    "↘ + I · df+RP",
    "mid",
    19,
    1.85,
    0.17,
    0.44,
    "upper",
    { launch: true },
  ),
  low: move("로우 킥", "↓ + J · d+LK", "low", 13, 1.95, 0.16, 0.38, "low"),
  sweep: move(
    "더블 스윕",
    "J + K · LK+RK",
    "low",
    22,
    2.1,
    0.29,
    0.62,
    "sweep",
    { width: 0.8, stun: 0.55 },
  ),
  qcfPunch: move(
    "썬더 스트라이크",
    "↓ ↘ → + I · qcf+RP",
    "mid",
    26,
    2.3,
    0.18,
    0.48,
    "powerPunch",
    { lunge: 0.42, stun: 0.43 },
  ),
  dragon: move(
    "드래곤 어퍼",
    "→ ↓ ↘ + I · f,d,df+RP",
    "mid",
    23,
    1.95,
    0.15,
    0.48,
    "dragon",
    { launch: true, lunge: 0.2 },
  ),
  qcfKick: move(
    "토네이도 킥",
    "↓ ↘ → + K · qcf+RK",
    "mid",
    24,
    2.35,
    0.2,
    0.51,
    "spin",
    { width: 0.9, stun: 0.4 },
  ),
  dashPunch: move(
    "대시 임팩트",
    "→ → + I · f,f+RP",
    "mid",
    24,
    2.45,
    0.17,
    0.47,
    "powerPunch",
    { lunge: 0.55, stun: 0.4 },
  ),
  palm: move(
    "브레이크 팜",
    "← → + U · b,f+LP",
    "mid",
    27,
    2,
    0.24,
    0.52,
    "palm",
    { stun: 0.48 },
  ),
  backKick: move(
    "백 스핀 킥",
    "← + K · b+RK",
    "mid",
    20,
    2.3,
    0.18,
    0.45,
    "backKick",
  ),
  hopKick: move("점핑 니", "↑ + J · u+LK", "mid", 18, 1.85, 0.2, 0.49, "knee", {
    launch: true,
  }),
  throw: move(
    "숄더 브레이크",
    "U + I · LP+RP",
    "throw",
    25,
    1.3,
    0.23,
    0.72,
    "throw",
    { stun: 0.65 },
  ),
};
export const COMMAND_WINDOW = 0.7;
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
  if (action === "i") {
    if (matchesCommand(f, [6, 2, 3])) return "dragon";
    if (matchesCommand(f, [2, 3, 6])) return "qcfPunch";
    if (matchesCommand(f, [6, 5, 6], 0.4, true)) return "dashPunch";
    if (f.direction === 3) return "upper";
    if (f.chain === 1 && f.chainAge < 0.65) return "oneTwo";
  }
  if (action === "u" && matchesCommand(f, [4, 6])) return "palm";
  if (action === "j" && [1, 2].includes(f.direction)) return "low";
  if (action === "j" && [7, 8, 9].includes(f.direction)) return "hopKick";
  if (action === "k") {
    if (matchesCommand(f, [2, 3, 6])) return "qcfKick";
    if (f.direction === 4 || f.direction === 1) return "backKick";
    if (f.chain === 2 && f.chainAge < 0.7) return "finish";
  }
  return action;
}
function fighter(x) {
  return {
    x,
    z: 0,
    y: 0,
    vy: 0,
    hp: MAX_HP,
    facing: x < 0 ? 1 : -1,
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
export function createMatch() {
  return {
    version: 2,
    fighters: [fighter(-1.45), fighter(1.45)],
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
  f.chain = key === "u" ? 1 : key === "oneTwo" ? 2 : 0;
  f.chainAge = 0;
  f.attack = { key, t: 0, hit: false, connected: false, angle: f.angle };
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
    move = MOVES[atk.key];
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
    b.y > 2.15
  )
    return;
  if (move.level === "throw" && (b.y > 0.2 || b.crouch || b.stun > 0)) return;
  if (move.level === "high" && b.crouch && b.y === 0) return;
  const blocked =
    b.guard &&
    b.stun <= 0 &&
    b.y === 0 &&
    !b.attack &&
    (move.level === "low" ? b.crouch : !b.crouch) &&
    move.level !== "throw";
  if (blocked) {
    b.stun = 0.1;
    b.x += Math.cos(atk.angle) * 0.09;
    b.z += Math.sin(atk.angle) * 0.09;
    emit(m, "block", { index: 1 - index, x: b.x, y: 1.1, z: b.z });
    return;
  }
  atk.connected = true;
  const airborne = b.y > 0.1,
    damage = Math.round(
      move.damage * (airborne ? 0.7 : 1) * (a.combo >= 3 ? 0.75 : 1),
    );
  b.hp = Math.max(0, b.hp - damage);
  b.stun = move.stun;
  b.attack = null;
  b.buffer = null;
  b.guard = false;
  b.hitFlash = 0.13;
  const push =
    move.level === "throw" ? 0.6 : move.kind === "spin" ? 0.32 : 0.08;
  b.x += Math.cos(atk.angle) * push;
  b.z += Math.sin(atk.angle) * push;
  if (move.launch && !airborne) {
    b.vy = 6.5;
    b.y = 0.02;
    b.stun = 0.8;
  } else if (airborne) {
    b.vy = Math.max(b.vy, 2);
    b.stun = Math.max(b.stun, 0.34);
  }
  a.combo = a.comboAge < 0.95 ? a.combo + 1 : 1;
  a.comboDamage = a.combo === 1 ? damage : a.comboDamage + damage;
  a.comboAge = 0;
  emit(m, "hit", {
    index,
    key: atk.key,
    damage,
    combo: a.combo,
    total: a.comboDamage,
    x: b.x,
    y: b.y + (move.level === "low" ? 0.45 : 1.25),
    z: b.z,
    launch: !!move.launch,
  });
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
        m.fighters = [fighter(-1.45), fighter(1.45)];
        m.phase = "ready";
        m.phaseTime = 1.5;
        m.winner = null;
        emit(m, "ready");
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
    f.stun = Math.max(0, f.stun - dt);
    f.move = 0;
    if (f.y > 0 || f.vy > 0) {
      f.y = Math.max(0, f.y + f.vy * dt);
      f.vy -= 16 * dt;
      if (f.y === 0) f.vy = 0;
    }
    if (!f.attack) {
      f.angle = Math.atan2(other.z - f.z, other.x - f.x);
      f.facing = other.x >= f.x ? 1 : -1;
    }
    recordDirection(f, input, dt);
    f.guard = input.guard && !f.attack && f.stun === 0 && f.y === 0;
    f.crouch = input.crouch && !f.attack && f.y === 0;
    // Resolve the command when the attack button is pressed, not after its buffered recovery.
    if (input.action && f.stun === 0 && f.y === 0) {
      f.buffer = resolveMove(f, input.action);
      f.bufferAge = 0;
    }
    if (f.attack) {
      f.attack.t += dt;
      const move = MOVES[f.attack.key];
      if (move.lunge && f.attack.t < move.windup) {
        const amount = (move.lunge * dt) / move.windup;
        f.x += Math.cos(f.attack.angle) * amount;
        f.z += Math.sin(f.attack.angle) * amount;
      }
      if (!f.attack.hit && f.attack.t >= move.windup) {
        f.attack.hit = true;
        resolveHit(m, i);
      }
      const chainCancel =
        f.attack &&
        f.attack.connected &&
        f.buffer &&
        ((f.attack.key === "u" && f.buffer === "oneTwo") ||
          (f.attack.key === "oneTwo" && f.buffer === "finish"));
      if (
        f.attack &&
        (f.attack.t >= move.duration ||
          (chainCancel && f.attack.t >= move.windup + 0.065))
      )
        f.attack = null;
    }
    if (!f.attack && f.stun === 0 && f.y === 0) {
      if (f.buffer && f.bufferAge < 0.65) startAttack(m, i, f.buffer);
      else if (!f.guard) {
        const len = Math.max(1, Math.hypot(input.x, input.z)),
          speed = f.crouch
            ? 2.6
            : f.dash > 0
              ? DASH_SPEED
              : Math.abs(input.z) > 0.1
                ? SIDESTEP_SPEED
                : WALK_SPEED;
        const dx = (input.x / len) * speed * dt,
          dz = (input.z / len) * speed * dt;
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
    input.guard = true;
    input.crouch = MOVES[o.attack.key].level === "low";
  } else if (d > 1.65) {
    input.x = (dx / Math.max(0.01, d)) * 0.8;
    input.z = (dz / Math.max(0.01, d)) * 0.8;
  } else if (m.tick % 190 < 20) {
    input.x = -Math.sign(dx) * 0.65;
  }
  if (m.tick % 25 === 0 && d < 2.2 && !input.guard) {
    input.action = ["u", "i", "j", "k", "u+i", "j+k"][Math.floor(r * 6)];
    if (r < 0.16) {
      input.x = f.facing;
      input.z = 1;
      input.action = "i";
    } else if (r < 0.3) {
      input.z = 1;
      input.action = "j";
    }
  }
  if (o.attack && m.tick % 140 < 24 && !input.guard) input.z = 0.8;
  return input;
}
