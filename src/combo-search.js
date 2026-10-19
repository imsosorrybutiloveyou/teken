import { character } from "./characters.js";
import { step, emptyInput } from "./combat.js";
export function commandInputs(f, key) {
  const p = character(f.character),
    rule = p.commands.find((r) => r[0] === key);
  if (rule)
    return rule[2].map((dir, i) => ({
      ...emptyInput(),
      x: (dir % 3 === 1 ? -1 : dir % 3 === 0 ? 1 : 0) * f.facing,
      z: dir <= 3 ? 1 : dir >= 7 ? -1 : 0,
      action: i === rule[2].length - 1 ? rule[1] : null,
    }));
  const follow = p.followUps.find((r) => r[2] === key);
  if (follow) return [{ ...emptyInput(), action: follow[1] }];
  if (key.startsWith("jump"))
    return [
      { ...emptyInput(), z: -1, action: key === "jumpPunch" ? "u" : "j" },
    ];
  if (key === "risingUpper" || key === "risingKick")
    return [
      ...Array.from({ length: 9 }, () => ({
        ...emptyInput(),
        z: 1,
        crouch: true,
      })),
      { ...emptyInput(), action: key === "risingUpper" ? "i" : "j" },
    ];
  if (key === "crouchPunch" || key === "crouchKick")
    return [
      {
        ...emptyInput(),
        z: 1,
        crouch: true,
        action: key === "crouchPunch" ? "u" : "k",
      },
    ];
  if (key === "oneTwo") return [{ ...emptyInput(), action: p.chain[1] }];
  if (key === "finish") return [{ ...emptyInput(), action: p.chain[2] }];
  return [{ ...emptyInput(), action: key === "throw" ? "u+i" : key }];
}
// Search actual 60Hz combat states. Beam/depth limits bound build time; this is not a proof of a global optimum.
export function searchComboRoutes(
  match,
  index = 0,
  { depth = 7, width = 8 } = {},
) {
  let beam = [{ state: structuredClone(match), keys: [], damage: 0 }],
    finished = [];
  const moves = Object.entries(character(match.fighters[index].character).moves)
    .filter(([k, m]) => m.level !== "throw" && !k.startsWith("wake"))
    .map(([k]) => k);
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const node of beam)
      for (const key of moves) {
        const state = structuredClone(node.state),
          a = state.fighters[index],
          b = state.fighters[1 - index];
        if (b.downTime > 0 || b.airOwner !== index) continue;
        const inputs = commandInputs(a, key);
        let hit = null;
        for (let frame = 0; frame < 90; frame++) {
          const pair = [emptyInput(), emptyInput()];
          pair[index] = inputs.shift() ?? emptyInput();
          step(state, pair, 1 / 60, true);
          hit = state.events.find((e) => e.type === "hit" && e.index === index);
          if (
            hit ||
            b.downTime > 0 ||
            b.airOwner !== index ||
            (!a.attack && !inputs.length && frame > 35)
          )
            break;
        }
        if (hit)
          next.push({
            state,
            keys: [...node.keys, hit.key],
            damage: node.damage + hit.damage,
          });
      }
    if (!next.length) break;
    next.sort((a, b) => b.damage - a.damage);
    const seen = new Set();
    for (let i = 0; i < next.length;) {
      const k = next[i].keys.join(",");
      if (seen.has(k)) next.splice(i, 1);
      else {
        seen.add(k);
        i++;
      }
    }
    finished.push(...next.slice(0, width));
    beam = next.slice(0, width);
  }
  return finished
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 8)
    .map(({ keys, damage }) => ({ keys, damage }));
}
