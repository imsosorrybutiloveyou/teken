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
  return (m, index = 1) => {
    const f = m.fighters[index],
      o = m.fighters[1 - index],
      p = character(f.character),
      distance = Math.hypot(f.x - o.x, f.z - o.z);
    if (m.phase !== "fight") return emptyInput();
    if (f.downTime > 0) return { ...emptyInput(), z: -1 };
    const command = (key) => {
      const rule = p.commands.find((r) => r[0] === key);
      if (!rule) return { ...emptyInput(), action: key };
      plan = rule[2].map((dir) => ({
        ...emptyInput(),
        x: (dir % 3 === 1 ? -1 : dir % 3 === 0 ? 1 : 0) * f.facing,
        z: dir <= 3 ? 1 : dir >= 7 ? -1 : 0,
      }));
      plan.at(-1).action = rule[1];
      return plan.shift();
    };
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
      o.attack.t >= 8 / 60 &&
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
      return command(
        -attack.onBlock >= p.moves.upper.startup &&
          distance < p.moves.upper.range
          ? "upper"
          : "u",
      );
    }
    if (o.y > 0 && o.airOwner === index && (!f.attack || f.attack.connected)) {
      if (f.attack?.key === p.chain[0])
        return { ...emptyInput(), action: p.chain[1] };
      if (!o.bounceUsed && o.airHits >= 1) return command("bound");
      return command(o.airHits >= 3 ? "sideKick" : "u");
    }
    if (f.attack) return emptyInput();
    if (distance > 1.65) return { ...emptyInput(), x: f.facing };
    if (m.tick - lastTick < 20) return { ...emptyInput(), x: -f.facing };
    lastTick = m.tick;
    return command(
      ["low", "upper", "hook", "u", "bodyBlow", "kneeStrike"][choice++ % 6],
    );
  };
}
