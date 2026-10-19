export const MAX_HP = 120;
export const MOVES = {
  j: {
    name: "스냅 잽",
    level: "high",
    damage: 9,
    range: 1.7,
    width: 0.49,
    windup: 0.1,
    duration: 0.3,
    stun: 0.32,
    kind: "punch",
  },
  j2: {
    name: "스트레이트",
    level: "mid",
    damage: 12,
    range: 1.85,
    width: 0.48,
    windup: 0.12,
    duration: 0.34,
    stun: 0.37,
    kind: "cross",
  },
  k: {
    name: "라운드 킥",
    level: "mid",
    damage: 18,
    range: 2.1,
    width: 0.6,
    windup: 0.24,
    duration: 0.58,
    stun: 0.38,
    kind: "kick",
  },
  finish: {
    name: "스피닝 피니시",
    level: "mid",
    damage: 23,
    range: 2.25,
    width: 0.7,
    windup: 0.18,
    duration: 0.56,
    stun: 0.5,
    kind: "spin",
  },
  u: {
    name: "로우 스윕",
    level: "low",
    damage: 13,
    range: 1.9,
    width: 0.65,
    windup: 0.22,
    duration: 0.52,
    stun: 0.32,
    kind: "low",
  },
  i: {
    name: "라이징 어퍼",
    level: "mid",
    damage: 17,
    range: 1.8,
    width: 0.46,
    windup: 0.23,
    duration: 0.58,
    stun: 0.38,
    launch: true,
    kind: "upper",
  },
  o: {
    name: "숄더 브레이크",
    level: "throw",
    damage: 25,
    range: 1.3,
    width: 0.45,
    windup: 0.25,
    duration: 0.85,
    stun: 0.7,
    kind: "throw",
  },
};
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
    action: ["j", "k", "u", "i", "o"].includes(v.action) ? v.action : null,
  };
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
  };
}
export function createMatch() {
  return {
    fighters: [fighter(-1.45), fighter(1.45)],
    wins: [0, 0],
    round: 1,
    time: 60,
    phase: "ready",
    phaseTime: 1.7,
    winner: null,
    events: [],
    tick: 0,
    seed: 719,
  };
}
function emit(m, type, data = {}) {
  m.events.push({ type, ...data });
}
function startAttack(f, action) {
  let key = action;
  if (action === "j" && f.chain === 1 && f.chainAge < 0.85) key = "j2";
  if (action === "k" && f.chain >= 1 && f.chainAge < 0.9) key = "finish";
  f.chain = key === "j" ? 1 : key === "j2" ? 2 : 0;
  f.chainAge = 0;
  f.attack = { key, t: 0, hit: false, angle: f.angle };
  f.buffer = null;
  f.guard = false;
  f.crouch = false;
}
function resolveHit(m, index) {
  const a = m.fighters[index],
    b = m.fighters[1 - index],
    atk = a.attack,
    move = MOVES[atk.key];
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const forward = dx * Math.cos(atk.angle) + dz * Math.sin(atk.angle);
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
    b.stun = 0.13;
    b.x += Math.cos(atk.angle) * 0.12;
    b.z += Math.sin(atk.angle) * 0.12;
    emit(m, "block", { index: 1 - index, x: b.x, y: 1.1, z: b.z });
    return;
  }
  const airborne = b.y > 0.1;
  const damage = Math.round(
    move.damage * (airborne ? 0.7 : 1) * (a.combo >= 3 ? 0.8 : 1),
  );
  b.hp = Math.max(0, b.hp - damage);
  b.stun = move.stun;
  b.attack = null;
  b.buffer = null;
  b.guard = false;
  b.hitFlash = 0.15;
  const push =
    move.level === "throw" ? 0.7 : move.kind === "spin" ? 0.42 : 0.12;
  b.x += Math.cos(atk.angle) * push;
  b.z += Math.sin(atk.angle) * push;
  if (move.launch && !airborne) {
    b.vy = 6.5;
    b.y = 0.02;
    b.stun = 0.85;
  } else if (airborne) {
    b.vy = Math.max(b.vy, 2);
    b.stun = Math.max(b.stun, 0.36);
  }
  a.combo = a.comboAge < 1.15 ? a.combo + 1 : 1;
  a.comboDamage = a.combo === 1 ? damage : a.comboDamage + damage;
  a.comboAge = 0;
  emit(m, "hit", {
    index,
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
        m.phaseTime = 1.7;
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
    f.guard = input.guard && !f.attack && f.stun === 0 && f.y === 0;
    f.crouch = input.crouch && !f.attack && f.y === 0;
    if (input.action && f.stun === 0 && f.y === 0) {
      f.buffer = input.action;
      f.bufferAge = 0;
    }
    if (f.attack) {
      f.attack.t += dt;
      const move = MOVES[f.attack.key];
      if (!f.attack.hit && f.attack.t >= move.windup) {
        f.attack.hit = true;
        resolveHit(m, i);
      }
      if (f.attack && f.attack.t >= move.duration) f.attack = null;
    }
    if (!f.attack && f.stun === 0 && f.y === 0) {
      if (f.buffer && f.bufferAge < 0.65) startAttack(f, f.buffer);
      else if (!f.guard) {
        const length = Math.hypot(input.x, input.z) || 1,
          speed = f.crouch ? 1.2 : 3;
        f.x += (input.x / Math.max(1, length)) * speed * dt;
        f.z += (input.z / Math.max(1, length)) * speed * dt;
        f.move = Math.min(1, length) * (input.x !== 0 || input.z !== 0 ? 1 : 0);
      }
    }
    const radius = Math.hypot(f.x, f.z);
    if (radius > 5.55) {
      f.x *= 5.55 / radius;
      f.z *= 5.55 / radius;
    }
  }
  const [a, b] = m.fighters,
    dx = b.x - a.x,
    dz = b.z - a.z,
    d = Math.hypot(dx, dz);
  if (d < 0.85) {
    const nx = d < 0.001 ? 1 : dx / d,
      nz = d < 0.001 ? 0 : dz / d,
      push = (0.85 - d) / 2;
    a.x -= nx * push;
    a.z -= nz * push;
    b.x += nx * push;
    b.z += nz * push;
  }
  if (m.time === 0 || m.fighters.some((f) => f.hp === 0)) finishRound(m);
}
export function cpuInput(m, index = 1) {
  const f = m.fighters[index],
    o = m.fighters[1 - index],
    dx = o.x - f.x,
    dz = o.z - f.z,
    d = Math.hypot(dx, dz);
  const input = emptyInput();
  if (m.phase !== "fight") return input;
  m.seed = (Math.imul(m.seed, 1664525) + 1013904223) >>> 0;
  const r = m.seed / 4294967296;
  if (o.attack && d < 2.3 && r < 0.72) {
    input.guard = true;
    input.crouch = MOVES[o.attack.key].level === "low";
  } else if (d > 1.55) {
    input.x = (dx / d) * 0.72;
    input.z = (dz / d) * 0.72;
  } else if (r < 0.025) {
    input.x = (-dx / d) * 0.6;
    input.z = (-dz / d) * 0.6;
  }
  if (m.tick % 23 === 0 && d < 2.15 && !input.guard)
    input.action = ["j", "j", "k", "u", "i", "o"][Math.floor(r * 6)];
  if (o.attack && m.tick % 150 < 35 && !input.guard) input.z = 0.8;
  return input;
}
