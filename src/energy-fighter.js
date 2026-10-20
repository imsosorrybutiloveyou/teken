// RAON uses twentieths of a bar: 20 points per stock, 40 points maximum.
export function addEnergyFighter(roster) {
  const p = structuredClone(roster.kai);
  Object.assign(p, {
    id: "raon",
    name: "RAON",
    title: "EMBER OF THE DAWN",
    style: "기공권 · 축기와 강화 연계",
    color: "#ffb36e",
    skeleton: "kai",
    build: 1.03,
    speed: 1,
    comboScale: 1.04,
    specialty: "적중 +1/20칸 · 피격 +1/80칸 · 최대 2칸 · 강화기와 기공탄",
  });
  for (const [i, [key, m]] of Object.entries(p.moves).entries()) {
    m.name =
      "여명 " + m.name.replace(/청류 |청룡 |수룡 |백류 |파룡 |뇌격 /g, "");
    m.color = p.color;
    m.visual = {
      ...m.visual,
      angle: m.visual.angle + 0.41 + i * 0.005,
      arc: m.visual.arc + 2,
      step: m.visual.step + 1,
    };
    if (["u", "i", "oneTwo", "palm", "qcfPunch"].includes(key))
      m.kind = "emberPalm";
    if (["upper", "dragon", "electric", "windGod"].includes(key))
      m.kind = "emberRise";
    if (m.justFrames) m.justFrames = null;
  }
  const add = (key, template, values) => {
    const m = (p.moves[key] = {
      ...structuredClone(p.moves[template]),
      ...values,
    });
    m.windup = m.startup / 60;
    m.duration = (m.startup + m.active + m.recovery) / 60;
    m.stun = (m.active + m.recovery + m.onHit) / 60;
    m.blockStun = Math.max(1, m.active + m.recovery + m.onBlock) / 60;
    m.visual.angle += Object.keys(p.moves).length * 0.029;
    return m;
  };
  add("qcfPunch", "qcfPunch", {
    name: "여명 기공탄",
    command: "↓ ↘ → + U",
    kind: "emberWave",
    damage: 16,
    startup: 18,
    recovery: 26,
    onBlock: -12,
    onHit: 8,
    projectile: true,
    width: 0.28,
    range: 0.65,
    lunge: 0,
    launch: false,
    knockdown: false,
    wallSplat: false,
    homing: false,
    trackSide: 0,
    push: 1.6,
    airMin: 0,
    airMax: 1.8,
    juggleCancel: null,
  });
  add("exWave", "qcfPunch", {
    name: "작열 기공탄",
    command: "↓ ↘ → + U+I · 기 1칸",
    damage: 26,
    startup: 14,
    recovery: 24,
    onBlock: -8,
    kiCost: 20,
    kiExtend: true,
    color: "#a3ffff",
  });
  add("exDragon", "dragon", {
    name: "여명 승룡격",
    command: "U+I · 기 1칸",
    kind: "emberRise",
    damage: 29,
    startup: 13,
    recovery: 32,
    onBlock: -22,
    launch: true,
    kiCost: 20,
    kiExtend: true,
    airMax: 2.5,
    wallSplat: false,
    counterLaunch: false,
    color: "#a3ffff",
  });
  add("focusBurst", "palm", {
    name: "축기 연환장",
    command: "J+K · 기 1칸",
    kind: "emberBurst",
    damage: 12,
    startup: 8,
    recovery: 18,
    onBlock: -16,
    onHit: 10,
    range: 2.5,
    kiCost: 20,
    kiExtend: true,
    launch: false,
    knockdown: false,
    bound: false,
    wallSplat: false,
    push: 0.6,
    airMax: 2.8,
    lunge: 0.6,
    color: "#a3ffff",
  });
  p.commands = p.commands.filter(([key]) => key !== "qcfPunch");
  p.commands.unshift(
    ["throw", "u+i", [4]],
    ["qcfPunch", "u", [2, 3, 6]],
    ["exWave", "u+i", [2, 3, 6]],
    ["exDragon", "u+i", [5]],
    ["focusBurst", "j+k", [5]],
  );
  p.moves.throw.command = "← + U+I";
  const electric = p.commands.find(([key]) => key === "electric");
  electric[2] = [4, 5, 6, 3];
  add("electric", "hook", {
    name: "여명 쇄권",
    command: "← N → ↘ + I",
    kind: "emberPalm",
    damage: 20,
    startup: 18,
    recovery: 24,
    onBlock: -13,
    launch: false,
    counterLaunch: true,
    justFrames: null,
  });
  p.followUps = p.followUps.map(([from, button, to]) => [
    from === "qcfPunch" ? "palm" : from,
    button,
    to,
  ]);
  p.moves.styleFollow.command = "여명 파쇄 장타 › K";
  roster.raon = p;
}
