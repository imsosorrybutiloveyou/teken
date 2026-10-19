import { KIT_MOVES, KIT_RULES } from "./fighter-kits.js";
// Authored 60 Hz frame data. S/A/R and advantages below drive the actual combat simulation.
const keys = [
  "u",
  "i",
  "j",
  "k",
  "oneTwo",
  "finish",
  "upper",
  "low",
  "sweep",
  "qcfPunch",
  "dragon",
  "qcfKick",
  "dashPunch",
  "palm",
  "backKick",
  "hopKick",
  "throw",
  "hook",
  "elbow",
  "bodyBlow",
  "toeKick",
  "sideKick",
  "axeKick",
  "kneeStrike",
  "bound",
  "rushStrike",
  "windGod",
  "electric",
  "hellSweep",
  "runningKick",
];
const visuals = {
  u: {
    coil: 0.3,
    step: 1,
    lean: 1,
    arc: 0,
    reach: 1,
    shape: "line",
    rays: 1,
    angle: 0,
    size: 0.45,
  },
  i: {
    coil: 0.46,
    step: 3,
    lean: 3,
    arc: -3,
    reach: 3,
    shape: "line",
    rays: 3,
    angle: -0.12,
    size: 0.65,
  },
  j: {
    coil: 0.4,
    step: -1,
    lean: -1,
    arc: -5,
    reach: 0,
    shape: "fan",
    rays: 2,
    angle: -0.25,
    size: 0.6,
  },
  k: {
    coil: 0.52,
    step: -2,
    lean: -3,
    arc: -10,
    reach: 1,
    shape: "arc",
    rays: 3,
    angle: -0.6,
    size: 0.75,
  },
  oneTwo: {
    coil: 0.28,
    step: 4,
    lean: 2,
    arc: 4,
    reach: 0,
    shape: "chevron",
    rays: 2,
    angle: 0.15,
    size: 0.5,
  },
  finish: {
    coil: 0.56,
    step: 1,
    lean: -4,
    arc: -13,
    reach: 3,
    shape: "arc",
    rays: 5,
    angle: -0.4,
    size: 0.95,
  },
  upper: {
    coil: 0.48,
    step: 2,
    lean: 1,
    arc: -8,
    reach: -1,
    shape: "rise",
    rays: 3,
    angle: -1.25,
    size: 0.65,
  },
  low: {
    coil: 0.34,
    step: 1,
    lean: -1,
    arc: 3,
    reach: -2,
    shape: "line",
    rays: 2,
    angle: 0.23,
    size: 0.42,
  },
  sweep: {
    coil: 0.63,
    step: -3,
    lean: -5,
    arc: 7,
    reach: 1,
    shape: "fan",
    rays: 5,
    angle: 0.3,
    size: 0.88,
  },
  qcfPunch: {
    coil: 0.62,
    step: 5,
    lean: 6,
    arc: -2,
    reach: 4,
    shape: "bolt",
    rays: 3,
    angle: 0,
    size: 1.05,
  },
  dragon: {
    coil: 0.58,
    step: 3,
    lean: 4,
    arc: -13,
    reach: 1,
    shape: "spiral",
    rays: 3,
    angle: -1.3,
    size: 0.85,
  },
  qcfKick: {
    coil: 0.54,
    step: -1,
    lean: -5,
    arc: -16,
    reach: 2,
    shape: "spiral",
    rays: 5,
    angle: -0.25,
    size: 1.0,
  },
  dashPunch: {
    coil: 0.38,
    step: 6,
    lean: 5,
    arc: 2,
    reach: 2,
    shape: "chevron",
    rays: 4,
    angle: 0,
    size: 0.9,
  },
  palm: {
    coil: 0.65,
    step: 3,
    lean: 4,
    arc: -4,
    reach: 0,
    shape: "ring",
    rays: 3,
    angle: 0,
    size: 0.7,
  },
  backKick: {
    coil: 0.51,
    step: -4,
    lean: -4,
    arc: 4,
    reach: 3,
    shape: "line",
    rays: 4,
    angle: 0.12,
    size: 0.8,
  },
  hopKick: {
    coil: 0.58,
    step: 1,
    lean: -2,
    arc: -12,
    reach: -1,
    shape: "rise",
    rays: 4,
    angle: -0.65,
    size: 0.8,
  },
  throw: {
    coil: 0.42,
    step: 4,
    lean: 2,
    arc: 0,
    reach: -2,
    shape: "grip",
    rays: 2,
    angle: 0,
    size: 0.55,
  },
  hook: {
    coil: 0.57,
    step: 2,
    lean: 3,
    arc: -12,
    reach: -3,
    shape: "arc",
    rays: 2,
    angle: -1.0,
    size: 0.55,
  },
  elbow: {
    coil: 0.4,
    step: 5,
    lean: 5,
    arc: 2,
    reach: -4,
    shape: "chevron",
    rays: 1,
    angle: -0.3,
    size: 0.38,
  },
  bodyBlow: {
    coil: 0.47,
    step: 2,
    lean: 4,
    arc: 6,
    reach: 1,
    shape: "ring",
    rays: 2,
    angle: 0.4,
    size: 0.42,
  },
  toeKick: {
    coil: 0.27,
    step: -1,
    lean: 0,
    arc: 4,
    reach: -3,
    shape: "line",
    rays: 1,
    angle: 0.35,
    size: 0.55,
  },
  sideKick: {
    coil: 0.45,
    step: -3,
    lean: -2,
    arc: -2,
    reach: 2,
    shape: "chevron",
    rays: 3,
    angle: 0.1,
    size: 0.7,
  },
  axeKick: {
    coil: 0.67,
    step: -2,
    lean: 1,
    arc: -20,
    reach: -1,
    shape: "fall",
    rays: 3,
    angle: 1.25,
    size: 0.9,
  },
  kneeStrike: {
    coil: 0.35,
    step: 4,
    lean: 3,
    arc: -7,
    reach: 0,
    shape: "rise",
    rays: 2,
    angle: -0.9,
    size: 0.45,
  },
  bound: {
    coil: 0.61,
    step: 2,
    lean: 6,
    arc: -8,
    reach: 1,
    shape: "fall",
    rays: 5,
    angle: 1.5,
    size: 1.0,
  },
};
Object.assign(visuals, {
  rushStrike: {
    coil: 0.48,
    step: 7,
    lean: 8,
    arc: -2,
    reach: 3,
    shape: "chevron",
    rays: 5,
    angle: -0.05,
    size: 1.1,
  },
  windGod: {
    coil: 0.46,
    step: 3,
    lean: 4,
    arc: -11,
    reach: 0,
    shape: "rise",
    rays: 5,
    angle: -0.95,
    size: 0.88,
  },
  electric: {
    coil: 0.35,
    step: 4,
    lean: 5,
    arc: -15,
    reach: 1,
    shape: "electric",
    rays: 4,
    angle: -0.7,
    size: 1.15,
  },
  hellSweep: {
    coil: 0.55,
    step: 2,
    lean: -7,
    arc: 3,
    reach: 0,
    shape: "fan",
    rays: 6,
    angle: 0.16,
    size: 1.05,
  },
  runningKick: {
    coil: 0.45,
    step: 4,
    lean: -4,
    arc: -10,
    reach: 2,
    shape: "arc",
    rays: 4,
    angle: -0.3,
    size: 1.16,
  },
});
const labels = {
  1: "↙",
  2: "↓",
  3: "↘",
  4: "←",
  5: "N",
  6: "→",
  7: "↖",
  8: "↑",
  9: "↗",
};
const profileData = {
  kai: {
    name: "KAI",
    title: "AZURE FIST",
    style: "정통 카라테 · 균형",
    color: "#6daddd",
    speed: 1,
    damage: 1,
    build: 1,
    chain: ["u", "i", "k"],
    frames: [
      [10, 2, 17, -1, 5],
      [11, 2, 16, -5, 4],
      [13, 2, 16, -5, 6],
      [15, 3, 19, -8, 7],
      [10, 2, 15, -4, 7],
      [17, 3, 23, -16, 9],
      [15, 3, 20, -15, 10],
      [15, 2, 18, -11, 3],
      [22, 3, 28, -22, 10],
      [18, 3, 27, -19, 9],
      [16, 3, 25, -18, 10],
      [18, 3, 25, -17, 8],
      [17, 3, 26, -17, 9],
      [22, 3, 30, -20, 12],
      [17, 3, 22, -9, 7],
      [16, 3, 25, -18, 10],
      [18, 2, 28, 0, 10],
      [12, 2, 17, -5, 5],
      [13, 2, 18, -6, 6],
      [12, 2, 16, -4, 5],
      [14, 2, 17, -11, 3],
      [21, 3, 27, -18, 9],
      [23, 3, 25, -10, 9],
      [15, 2, 19, -7, 7],
      [15, 2, 20, -15, 5],
      [16, 3, 25, -9, 12],
      [16, 3, 24, -12, 10],
      [14, 2, 21, 5, 10],
      [20, 3, 29, -26, 13],
      [20, 3, 22, 4, 8],
    ],
    commands: [
      ["qcfPunch", "i", [2, 3, 6]],
      ["dragon", "i", [6, 2, 3]],
      ["qcfKick", "k", [2, 3, 6]],
      ["dashPunch", "i", [6, 5, 6]],
      ["palm", "u", [4, 6]],
      ["upper", "i", [3]],
      ["low", "j", [2]],
      ["backKick", "k", [4]],
      ["hopKick", "j", [8]],
      ["hook", "u", [6]],
      ["elbow", "i", [4]],
      ["bodyBlow", "u", [2]],
      ["toeKick", "j", [6]],
      ["sideKick", "k", [6]],
      ["axeKick", "k", [2, 1, 4]],
      ["kneeStrike", "k", [3]],
      ["bound", "i", [2]],
      ["rushStrike", "u", [6, 5, 6]],
      ["electric", "i", [6, 5, 2, 3]],
      ["windGod", "i", [6, 5, 2, 3]],
      ["hellSweep", "k", [6, 5, 2, 3]],
      ["runningKick", "j", [6, 5, 6, 5, 6]],
    ],
  },
  ren: {
    name: "REN",
    title: "CRIMSON EDGE",
    style: "킥복싱 · 긴 리치",
    color: "#e49a75",
    speed: 0.95,
    damage: 1.06,
    build: 1.04,
    chain: ["j", "k", "i"],
    frames: [
      [10, 2, 17, -1, 4],
      [12, 3, 18, -5, 6],
      [12, 2, 15, -4, 6],
      [14, 3, 18, -7, 8],
      [11, 3, 16, -5, 7],
      [18, 3, 24, -17, 10],
      [15, 3, 21, -16, 11],
      [16, 2, 19, -12, 4],
      [23, 3, 29, -23, 10],
      [20, 3, 28, -20, 10],
      [18, 3, 26, -19, 11],
      [16, 4, 24, -17, 9],
      [18, 3, 27, -18, 10],
      [21, 3, 28, -19, 11],
      [16, 3, 21, -7, 7],
      [17, 3, 26, -18, 11],
      [20, 2, 29, 0, 10],
      [13, 2, 18, -6, 6],
      [12, 2, 17, -5, 6],
      [14, 2, 19, -6, 6],
      [13, 2, 16, -10, 3],
      [19, 3, 26, -18, 10],
      [21, 3, 24, -9, 10],
      [14, 2, 18, -6, 8],
      [15, 2, 20, -16, 6],
      [17, 3, 26, -10, 12],
      [16, 3, 25, -13, 10],
      [14, 2, 22, 5, 10],
      [21, 3, 30, -27, 14],
      [19, 3, 22, 5, 9],
    ],
    commands: [
      ["qcfPunch", "i", [4, 6]],
      ["dragon", "i", [4, 1, 2]],
      ["qcfKick", "k", [2, 1, 4]],
      ["dashPunch", "j", [6, 5, 6]],
      ["palm", "u", [2, 3, 6]],
      ["upper", "k", [3]],
      ["low", "k", [2]],
      ["backKick", "j", [4]],
      ["hopKick", "k", [8]],
      ["hook", "u", [6]],
      ["elbow", "u", [4]],
      ["bodyBlow", "i", [2]],
      ["toeKick", "j", [6]],
      ["sideKick", "k", [6]],
      ["axeKick", "k", [2, 3, 6]],
      ["kneeStrike", "i", [3]],
      ["bound", "j", [2]],
      ["rushStrike", "i", [6, 5, 6]],
      ["electric", "i", [6, 5, 2, 3]],
      ["windGod", "i", [6, 5, 2, 3]],
      ["hellSweep", "k", [6, 5, 2, 3]],
      ["runningKick", "j", [6, 5, 6, 5, 6]],
    ],
    kickReach: 0.08,
  },
  mira: {
    name: "MIRA",
    title: "JADE TEMPEST",
    style: "유술 · 빠른 연계",
    color: "#77cbb0",
    speed: 1.07,
    damage: 0.9,
    build: 0.86,
    chain: ["u", "j", "i"],
    frames: [
      [10, 2, 17, -1, 4],
      [11, 2, 15, -4, 4],
      [12, 2, 15, -5, 5],
      [14, 3, 17, -7, 6],
      [10, 2, 14, -4, 6],
      [16, 3, 22, -15, 8],
      [15, 3, 18, -15, 9],
      [13, 2, 17, -10, 3],
      [21, 3, 26, -21, 8],
      [16, 3, 24, -18, 7],
      [15, 3, 23, -17, 9],
      [16, 3, 23, -16, 7],
      [16, 3, 24, -16, 7],
      [19, 3, 26, -18, 9],
      [14, 2, 18, -6, 5],
      [15, 3, 23, -17, 9],
      [17, 2, 26, 0, 9],
      [11, 2, 16, -4, 4],
      [12, 2, 16, -5, 5],
      [11, 2, 15, -3, 4],
      [12, 2, 16, -10, 3],
      [18, 3, 24, -17, 8],
      [20, 3, 22, -8, 8],
      [13, 2, 17, -5, 6],
      [14, 2, 18, -15, 5],
      [15, 3, 23, -8, 11],
      [16, 3, 22, -11, 9],
      [14, 2, 20, 5, 9],
      [19, 3, 27, -25, 12],
      [18, 3, 21, 3, 7],
    ],
    commands: [
      ["qcfPunch", "u", [2, 3, 6]],
      ["dragon", "i", [2, 1, 4]],
      ["qcfKick", "k", [6, 5, 6]],
      ["dashPunch", "j", [2, 5, 2]],
      ["palm", "k", [4, 6]],
      ["upper", "j", [3]],
      ["low", "i", [2]],
      ["backKick", "u", [4]],
      ["hopKick", "i", [8]],
      ["hook", "i", [6]],
      ["elbow", "i", [4]],
      ["bodyBlow", "u", [2]],
      ["toeKick", "j", [6]],
      ["sideKick", "k", [3]],
      ["axeKick", "j", [2, 1, 4]],
      ["kneeStrike", "i", [3]],
      ["bound", "k", [2]],
      ["rushStrike", "i", [6, 5, 6]],
      ["electric", "i", [6, 5, 2, 3]],
      ["windGod", "i", [6, 5, 2, 3]],
      ["hellSweep", "k", [6, 5, 2, 3]],
      ["runningKick", "j", [6, 5, 6, 5, 6]],
    ],
  },
  goro: {
    name: "GORO",
    title: "IRON MONOLITH",
    style: "철권류 · 중량 강타",
    color: "#b39bd6",
    speed: 0.83,
    damage: 1.22,
    build: 1.26,
    chain: ["i", "u", "k"],
    frames: [
      [10, 2, 17, -1, 7],
      [12, 3, 22, -6, 8],
      [15, 3, 19, -8, 8],
      [17, 3, 23, -11, 10],
      [12, 3, 19, -6, 8],
      [21, 4, 28, -19, 12],
      [16, 3, 24, -18, 12],
      [18, 3, 23, -14, 5],
      [26, 4, 33, -25, 13],
      [24, 4, 33, -22, 14],
      [19, 4, 29, -21, 12],
      [22, 4, 30, -21, 12],
      [21, 4, 32, -20, 12],
      [26, 4, 35, -23, 15],
      [20, 3, 26, -11, 10],
      [20, 3, 29, -20, 12],
      [23, 3, 33, 0, 13],
      [15, 3, 21, -7, 7],
      [15, 3, 21, -7, 8],
      [15, 2, 20, -6, 7],
      [16, 2, 20, -12, 4],
      [24, 4, 31, -20, 12],
      [26, 4, 29, -12, 12],
      [17, 3, 22, -8, 9],
      [17, 3, 24, -17, 7],
      [18, 4, 28, -11, 13],
      [17, 3, 27, -14, 12],
      [15, 2, 24, 5, 12],
      [22, 4, 33, -29, 15],
      [22, 4, 24, 6, 10],
    ],
    commands: [
      ["qcfPunch", "i", [4, 1, 2, 3, 6]],
      ["dragon", "u", [6, 2, 3]],
      ["qcfKick", "j", [2, 1, 4]],
      ["dashPunch", "u", [6, 5, 6]],
      ["palm", "i", [6, 4]],
      ["upper", "u", [3]],
      ["low", "k", [2]],
      ["backKick", "i", [4]],
      ["hopKick", "k", [8]],
      ["hook", "i", [6]],
      ["elbow", "u", [4]],
      ["bodyBlow", "i", [2]],
      ["toeKick", "k", [6]],
      ["sideKick", "j", [6]],
      ["axeKick", "k", [2, 3, 6]],
      ["kneeStrike", "j", [3]],
      ["bound", "u", [2]],
      ["rushStrike", "i", [6, 5, 6]],
      ["electric", "i", [6, 5, 2, 3]],
      ["windGod", "i", [6, 5, 2, 3]],
      ["hellSweep", "k", [6, 5, 2, 3]],
      ["runningKick", "j", [6, 5, 6, 5, 6]],
    ],
    kickReach: 0.04,
  },
};
// Each style owns its special motions; only KAI uses the crouch-dash electric pair.
const specialCommands = {
  ren: {
    windGod: ["k", [8, 5, 8]],
    electric: ["j", [2, 1, 4]],
    hellSweep: ["j", [2, 3, 6]],
    runningKick: ["k", [6, 5, 6, 5, 6]],
  },
  mira: {
    windGod: ["i", [4, 6]],
    electric: ["u", [4, 5, 4]],
    hellSweep: ["u", [2, 1, 4]],
    runningKick: ["u", [6, 5, 6, 5, 6]],
  },
  goro: {
    windGod: ["u", [4, 6]],
    electric: ["i", [4, 5, 4]],
    hellSweep: ["u", [6, 3, 2]],
    runningKick: ["i", [6, 5, 6, 5, 6]],
  },
};
for (const [id, p] of Object.entries(profileData)) {
  p.style = KIT_RULES[id].description;
  p.specialty = KIT_RULES[id].specialty;
  for (const rule of p.commands) {
    const replacement = specialCommands[id]?.[rule[0]];
    if (replacement) {
      rule[1] = replacement[0];
      rule[2] = replacement[1];
    }
  }
}
const followData = {
  kai: [
    [
      "hellSweep",
      "u",
      "hellFollow",
      "나락 이연장",
      "rushStrike",
      12,
      3,
      22,
      -14,
      8,
      12,
      true,
    ],
    [
      "qcfPunch",
      "k",
      "styleFollow",
      "뇌격 회전각",
      "qcfKick",
      16,
      3,
      24,
      -12,
      9,
      17,
      true,
    ],
  ],
  ren: [
    [
      "hellSweep",
      "k",
      "hellFollow",
      "시저스 힐 피니시",
      "axeKick",
      14,
      3,
      23,
      -15,
      9,
      15,
      true,
    ],
    [
      "j",
      "i",
      "styleFollow",
      "티프 니 스트라이크",
      "kneeStrike",
      13,
      2,
      20,
      -8,
      7,
      13,
      false,
    ],
  ],
  mira: [
    [
      "hellSweep",
      "i",
      "hellFollow",
      "복호 연환장",
      "palm",
      12,
      2,
      19,
      -9,
      8,
      12,
      true,
    ],
    [
      "palm",
      "u",
      "styleFollow",
      "회신 연화수",
      "hook",
      11,
      2,
      18,
      -6,
      6,
      11,
      false,
    ],
  ],
  goro: [
    [
      "kneeStrike",
      "u",
      "hellFollow",
      "철산 접신 팔꿈치",
      "elbow",
      14,
      3,
      24,
      -12,
      9,
      17,
      true,
    ],
    [
      "i",
      "k",
      "styleFollow",
      "거암 장화 피니시",
      "sideKick",
      16,
      3,
      25,
      -14,
      9,
      20,
      true,
    ],
  ],
};
export const CHARACTERS = Object.fromEntries(
  Object.entries(profileData).map(([id, p]) => {
    const moves = Object.fromEntries(
      keys.map((key, index) => {
        const authored = KIT_MOVES[id][index];
        const [baseLevel, damage, baseRange, baseKind] = [
            authored.level,
            authored.damage,
            authored.range,
            authored.kind,
          ],
          [startup, active, recovery, onBlock, onHit] = p.frames[index];
        const rule = p.commands.find((r) => r[0] === key);
        const button =
          rule?.[1] ??
          (key === "oneTwo" ? p.chain[1] : key === "finish" ? p.chain[2] : key);
        const kind = baseKind;
        const level = baseLevel;
        const range = baseRange;
        const command = rule
          ? `${rule[2].map((d) => labels[d]).join(" ")} + ${rule[1].toUpperCase()}`
          : key === "oneTwo"
            ? p.chain.slice(0, 2).join(" › ").toUpperCase()
            : key === "finish"
              ? p.chain.join(" › ").toUpperCase()
              : key === "throw"
                ? "U + I"
                : key === "sweep"
                  ? "J + K"
                  : key.toUpperCase();
        const remaining = active + recovery;
        const launch = [
          "upper",
          "dragon",
          "hopKick",
          "windGod",
          "electric",
        ].includes(key);
        return [
          key,
          {
            name: authored.name,
            command:
              command + (key === "electric" && id === "kai" ? " [2F]" : ""),
            level,
            damage: damage,
            range:
              range +
              (["j", "k", "qcfKick", "backKick", "sideKick"].includes(key)
                ? (p.kickReach ?? 0)
                : 0),
            kind,
            visual: {
              ...visuals[key],
              angle:
                visuals[key].angle +
                { kai: 0, ren: -0.18, mira: 0.22, goro: 0.1 }[id],
              size:
                visuals[key].size *
                { kai: 1, ren: 1.16, mira: 0.82, goro: 1.3 }[id],
            },
            color: key === "electric" && id === "kai" ? "#9befff" : p.color,
            motionWeight: { kai: 1, ren: 1.12, mira: 0.88, goro: 1.24 }[id],
            side: ["u", "j"].includes(button) ? 1 : 0,
            impactHeight:
              level === "low"
                ? 0.35
                : kind === "bodyBlow" ||
                    ["sideKick", "backKick"].includes(kind) ||
                    level === "low"
                  ? 1.05
                  : kind === "hammer"
                    ? 1.12
                    : ["upper", "dragon"].includes(kind)
                      ? 1.9
                      : kind.endsWith("Hook")
                        ? 1.65
                        : level === "high"
                          ? 1.8
                          : 1.45,
            width:
              key === "hellSweep"
                ? 0.82
                : key === "runningKick"
                  ? 0.3
                  : ["spin", "sweep"].includes(kind)
                    ? 0.78
                    : 0.5,
            startup,
            active,
            recovery,
            onBlock,
            onHit,
            windup: startup / 60,
            duration: (startup + active + recovery) / 60,
            stun: (remaining + onHit) / 60,
            blockStun: Math.max(1, remaining + onBlock) / 60,
            launch,
            knockdown: ["rushStrike", "hellSweep"].includes(key),
            justFrames: key === "electric" && id === "kai" ? 2 : null,
            highCrushFrom: key === "hellSweep" ? 5 / 60 : null,
            hop: key === "runningKick" ? 5.2 : 0,
            blockPush:
              key === "electric" ? 1.8 : key === "rushStrike" ? 1.4 : 0.8,
            bound: key === "bound",
            // Heights refer to the airborne defender's feet, in world units.
            airMin: level === "low" ? 0 : 0.04,
            airMax: level === "low" ? 0.35 : kind === "axeKick" ? 2.6 : 2.15,
            juggleCancel:
              key === "throw" || level === "low"
                ? null
                : launch
                  ? 10
                  : ["u", "i", "oneTwo", "hook", "elbow", "bodyBlow"].includes(
                        key,
                      )
                    ? 5
                    : 7,
            lunge:
              {
                rushStrike: 1.25,
                windGod: 0.4,
                electric: 0.5,
                hellSweep: 0.7,
                runningKick: 1.65,
              }[key] ??
              (["qcfPunch", "dashPunch"].includes(key)
                ? 0.3
                : key === "dragon"
                  ? 0.1
                  : 0),
            hitstop:
              key === "electric"
                ? 6
                : Math.min(9, 2 + Math.floor((damage * p.damage) / 5)),
            push:
              key === "rushStrike" ? 4 : damage * p.damage > 25 ? 2.2 : 1.05,
          },
        ];
      }),
    );
    for (const [key, m] of Object.entries(moves)) {
      Object.assign(m, KIT_RULES[id].moves[key]);
      if (id !== "kai") {
        m.visual.shape =
          id === "ren" ? "arc" : id === "mira" ? "ring" : "chevron";
        // Keep the 30 attack trails distinct within each style, as well as between styles.
        m.visual.angle += keys.indexOf(key) * 0.031;
        m.visual.size += keys.indexOf(key) * 0.007;
      }
      if (m.level === "low") {
        m.impactHeight = 0.35;
        m.airMin = 0;
        m.airMax = 0.35;
      }
      m.stun = (m.active + m.recovery + m.onHit) / 60;
      m.blockStun = Math.max(1, m.active + m.recovery + m.onBlock) / 60;
    }
    for (const m of Object.values(moves))
      if (m.launch)
        m.damage = Math.max(1, m.damage - (m === moves.upper ? 3 : 2));
    // The opening sweep is a low starter; the separate left-hand input completes KAI's string.
    if (["kai", "ren"].includes(id))
      Object.assign(moves.hellSweep, {
        damage: 16,
        knockdown: false,
        onHit: 4,
        stun: (moves.hellSweep.active + moves.hellSweep.recovery + 4) / 60,
      });
    const followUps = followData[id].map(
      ([
        from,
        button,
        key,
        name,
        template,
        startup,
        active,
        recovery,
        onBlock,
        onHit,
        damage,
        knockdown,
      ]) => {
        const source = moves[template];
        moves[key] = {
          ...source,
          name,
          command: `${moves[from].command} › ${button.toUpperCase()}`,
          side: ["u", "j"].includes(button) ? 1 : 0,
          level: "mid",
          damage,
          launch: false,
          bound: false,
          knockdown,
          justFrames: null,
          highCrushFrom: null,
          armorFrom: null,
          hop: 0,
          startup,
          active,
          recovery,
          onBlock,
          onHit,
          windup: startup / 60,
          duration: (startup + active + recovery) / 60,
          stun: (active + recovery + onHit) / 60,
          blockStun: Math.max(1, active + recovery + onBlock) / 60,
          lunge: 0.3,
          visual: {
            ...source.visual,
            angle: source.visual.angle + 0.47,
            step: source.visual.step + 2,
            arc: source.visual.arc - 5,
            lean: source.visual.lean + 3,
            coil: source.visual.coil * 0.82,
            size: source.visual.size + 0.17,
          },
        };
        return [from, button, key];
      },
    );
    return [id, { id, ...p, moves, followUps }];
  }),
);
export const CHARACTER_IDS = Object.keys(CHARACTERS);
export function character(id) {
  return CHARACTERS[id] ?? CHARACTERS.kai;
}
export function moveFor(f, key = f.attack?.key) {
  return character(f.character).moves[key];
}
