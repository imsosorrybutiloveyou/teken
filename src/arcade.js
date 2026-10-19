import ROUTES from "./combo-routes.json" with { type: "json" };
import { commandInputs } from "./combo-search.js";
import { STAGES } from "./stages.js";
import { CHARACTER_IDS, character, moveFor } from "./characters.js";
import { cpuInput, emptyInput } from "./combat.js";
export function createCampaign(id, difficulty = "normal") {
  return {
    id,
    difficulty,
    opponents: CHARACTER_IDS.filter((x) => x !== id),
    stage: 0,
    finished: false,
  };
}
export function advanceCampaign(c, winner) {
  if (winner !== 0) return "lost";
  c.stage++;
  c.finished = c.stage === c.opponents.length;
  return c.finished ? "cleared" : "next";
}
export function createCPU(difficulty = "normal") {
  let plan = [],
    lastTick = -100,
    choice = 0;
  let comboActive = false,
    route = [],
    routeHits = -1,
    lastObserved = "",
    seenAt = -1;
  const habits = { low: 0, mid: 0, high: 0, guard: 0 },
    usage = {};
  return (m, index = 1) => {
    const f = m.fighters[index],
      o = m.fighters[1 - index],
      p = character(f.character),
      distance = Math.hypot(f.x - o.x, f.z - o.z);
    if (m.phase !== "fight") return emptyInput();
    if (f.downTime > 0) return { ...emptyInput(), z: -1 };
    const command = (key) => {
      usage[key] = (usage[key] ?? 0) + 1;
      plan = commandInputs(f, key);
      return plan.shift() ?? emptyInput();
    };
    const madness = difficulty === "madness";
    if (madness) {
      if (
        o.lastMoveAge < 0.1 &&
        (o.lastMove !== lastObserved || m.tick - seenAt > 10)
      ) {
        lastObserved = o.lastMove;
        seenAt = m.tick;
        for (const k of ["low", "mid", "high"]) habits[k] *= 0.92;
        const level = character(o.character).moves[o.lastMove]?.level;
        if (level in habits) habits[level]++;
      }
      habits.guard = o.guard ? habits.guard + 1 : Math.max(0, habits.guard - 1);
      if (o.airOwner !== index || o.downTime > 0) {
        comboActive = false;
        route = [];
        routeHits = -1;
      }
    }
    if (difficulty === "easy") {
      const input = cpuInput(m, index);
      if (m.tick % 45 !== 0) input.action = null;
      input.crouch = false;
      return input;
    }
    if (difficulty === "normal") return cpuInput(m, index);
    const attack = o.attack && moveFor(o);
    if (
      attack &&
      !o.attack.blocked &&
      !o.attack.hit &&
      o.attack.t >= (madness ? 4 : 8) / 60 &&
      distance < attack.range + 0.3 &&
      !f.attack
    ) {
      plan = [];
      return {
        ...emptyInput(),
        x: -f.facing,
        crouch: attack.level === "low",
        z: attack.level === "low" ? 1 : 0,
      };
    }
    if (
      madness &&
      !f.attack &&
      !f.stun &&
      attack &&
      !o.attack.connected &&
      !o.attack.blocked &&
      o.attack.t >= attack.windup + attack.active / 60 &&
      attack.duration - o.attack.t >= p.moves.upper.startup / 60 &&
      distance < p.moves.upper.range
    ) {
      plan = [];
      return command("upper");
    }
    if (plan.length) return plan.shift();
    if (
      f.buffer ||
      (f.stun > 6 / 60 && f.blockstun) ||
      (f.stun > 0 && !f.blockstun)
    )
      return emptyInput();
    if (
      o.attack?.blocked &&
      -attack.onBlock >= 10 &&
      f.blockstun &&
      f.stun <= 6 / 60
    ) {
      if (
        madness &&
        attack.level === "low" &&
        -attack.onBlock >= 15 &&
        distance < p.moves.risingUpper.range
      )
        return { ...emptyInput(), action: "i" };
      return command(
        -attack.onBlock >= p.moves.upper.startup &&
          distance < p.moves.upper.range
          ? "upper"
          : "u",
      );
    }
    if (o.y > 0 && o.airOwner === index && (!f.attack || f.attack.connected)) {
      if (madness) {
        if (!comboActive) {
          comboActive = true;
          routeHits = -1;
          route = [
            ...(ROUTES[f.character]?.[
              STAGES[m.stage]?.wall ? "dojo" : "terminal"
            ]?.[0]?.keys ?? []),
          ];
        }
        if (o.airHits !== routeHits && route.length) {
          routeHits = o.airHits;
          return command(route.shift());
        }
      }
      if (f.attack?.key === p.chain[0])
        return { ...emptyInput(), action: p.chain[1] };
      if (!o.bounceUsed && o.airHits >= 1) return command("bound");
      return command(o.airHits >= 3 ? "sideKick" : "u");
    }
    if (f.attack) return emptyInput();
    if (distance > 1.65) return { ...emptyInput(), x: f.facing };
    if (madness) {
      if (habits.guard >= 12 && distance < p.moves.throw.range) {
        lastTick = m.tick;
        return command("throw");
      }
      if (
        !o.attack &&
        habits.low > habits.mid + habits.high &&
        m.tick % 36 < 10
      )
        return { ...emptyInput(), x: -f.facing, z: 1, crouch: true };
      if (m.tick - lastTick < 12) return { ...emptyInput(), x: -f.facing };
      lastTick = m.tick;
      const pool = [
        ...new Set([
          ...p.commands.map((r) => r[0]),
          "u",
          "i",
          "j",
          "k",
          "throw",
        ]),
      ].filter((k) => !k.startsWith("wake"));
      const scored = pool
        .map((key) => {
          const move = p.moves[key];
          return {
            key,
            score:
              move.damage / (move.startup + 10) +
              (move.launch ? 0.9 : 0) +
              (usage[key] ? 1 / (usage[key] + 1) : 3) +
              (o.crouch && move.level === "mid" ? 1.6 : 0) +
              (habits.guard > 5 && move.level === "low" ? 1.2 : 0) +
              (o.effectiveOrbit && move.homing ? 3 : 0),
          };
        })
        .filter(({ key }) => p.moves[key].range + 0.3 >= distance)
        .sort((a, b) => b.score - a.score);
      return command(scored[0]?.key ?? "u");
    }
    if (m.tick - lastTick < 20) return { ...emptyInput(), x: -f.facing };
    lastTick = m.tick;
    return command(
      ["low", "upper", "hook", "u", "bodyBlow", "kneeStrike"][choice++ % 6],
    );
  };
}
