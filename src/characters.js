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
];
const base = {
  u: ["high", 8, 1.7, "leftPunch"],
  i: ["mid", 12, 1.85, "rightPunch"],
  j: ["mid", 13, 1.85, "leftKick"],
  k: ["mid", 16, 1.95, "rightKick"],
  oneTwo: ["mid", 11, 1.9, "rightPunch"],
  finish: ["mid", 21, 2.0, "spin"],
  upper: ["mid", 19, 1.85, "upper"],
  low: ["low", 11, 1.7, "low"],
  sweep: ["low", 21, 1.95, "sweep"],
  qcfPunch: ["mid", 27, 2.3, "powerPunch"],
  dragon: ["mid", 23, 1.95, "dragon"],
  qcfKick: ["mid", 23, 2.05, "spin"],
  dashPunch: ["mid", 25, 2.45, "powerPunch"],
  palm: ["mid", 29, 2, "palm"],
  backKick: ["mid", 19, 2.0, "backKick"],
  hopKick: ["mid", 19, 1.85, "knee"],
  throw: ["throw", 27, 1.3, "throw"],
  hook: ["high", 13, 1.65, "hook"],
  elbow: ["mid", 15, 1.45, "elbow"],
  bodyBlow: ["mid", 12, 1.6, "bodyBlow"],
  toeKick: ["low", 10, 1.75, "toeKick"],
  sideKick: ["mid", 18, 2.0, "sideKick"],
  axeKick: ["mid", 23, 1.85, "axeKick"],
  kneeStrike: ["mid", 16, 1.5, "knee"],
  bound: ["mid", 15, 1.8, "hammer"],
};
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
    names: [
      "청류 잽",
      "정권 지르기",
      "전축 차기",
      "회전 중단각",
      "청류 원투",
      "청룡 회전각",
      "승천권",
      "로우 컷",
      "수면각",
      "뇌격 정권",
      "비룡 승천권",
      "청룡 회오리",
      "청류 돌파",
      "파쇄 장타",
      "백류 회전각",
      "천공 니",
      "청류 어깨꺾기",
      "청류 훅",
      "청류 팔꿈치",
      "수월 복부권",
      "앞발 견제",
      "청류 옆차기",
      "내려찍기",
      "청룡 무릎",
      "수룡 바운드",
    ],
    frames: [
      [10, 2, 17, -4, 5],
      [12, 2, 18, -7, 4],
      [14, 2, 17, -5, 6],
      [17, 3, 21, -8, 7],
      [11, 2, 16, -5, 7],
      [19, 3, 23, -10, 9],
      [16, 3, 20, -13, 10],
      [15, 2, 18, -11, 3],
      [24, 3, 28, -17, 10],
      [20, 3, 25, -10, 9],
      [18, 3, 23, -15, 10],
      [20, 3, 23, -9, 8],
      [19, 3, 24, -10, 9],
      [24, 3, 28, -8, 12],
      [17, 3, 22, -9, 7],
      [18, 3, 23, -14, 10],
      [18, 2, 28, 0, 10],
      [12, 2, 17, -5, 5],
      [13, 2, 18, -6, 6],
      [12, 2, 16, -4, 5],
      [14, 2, 17, -11, 3],
      [17, 3, 21, -8, 7],
      [23, 3, 25, -10, 9],
      [15, 2, 19, -7, 7],
      [16, 2, 20, -12, 5],
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
    names: [
      "붉은 견제",
      "크림슨 크로스",
      "레드 프런트",
      "블레이즈 하이킥",
      "더블 엣지",
      "크림슨 피니시",
      "플레어 런처",
      "종아리 베기",
      "레드 스윕",
      "블러드 크로스",
      "인페르노 어퍼",
      "역회전 화염각",
      "라이징 러시",
      "스칼렛 장타",
      "엣지 사이드킥",
      "볼케이노 니",
      "크림슨 클린치",
      "크림슨 훅",
      "스칼렛 엘보",
      "리버 샷",
      "종아리 스냅",
      "레드 사이드",
      "화염 내려차기",
      "크림슨 니",
      "블레이즈 바운드",
    ],
    frames: [
      [12, 2, 20, -6, 4],
      [14, 3, 20, -8, 6],
      [13, 2, 16, -4, 6],
      [16, 3, 20, -7, 8],
      [13, 3, 18, -6, 7],
      [20, 3, 24, -11, 10],
      [17, 3, 21, -14, 11],
      [16, 2, 19, -12, 4],
      [25, 3, 29, -18, 10],
      [22, 3, 26, -11, 10],
      [20, 3, 24, -16, 11],
      [18, 4, 22, -9, 9],
      [20, 3, 25, -11, 10],
      [23, 3, 26, -9, 11],
      [16, 3, 21, -7, 7],
      [19, 3, 24, -15, 11],
      [20, 2, 29, 0, 10],
      [13, 2, 18, -6, 6],
      [12, 2, 17, -5, 6],
      [14, 2, 19, -6, 6],
      [13, 2, 16, -10, 3],
      [16, 3, 20, -7, 8],
      [21, 3, 24, -9, 10],
      [14, 2, 18, -6, 8],
      [17, 2, 20, -12, 6],
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
    ],
    kinds: { upper: "rightKick", dashPunch: "knee", palm: "palm" },
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
    names: [
      "옥풍 잽",
      "유선 장타",
      "초승달 차기",
      "비취 회전각",
      "풍연 연계",
      "옥풍 마무리",
      "달오름 차기",
      "그림자 하단권",
      "비취 쓸기",
      "질풍 장타",
      "역풍 승천권",
      "비취 나선각",
      "그림자 돌파",
      "유수 반격각",
      "옥풍 견제권",
      "비연 도약권",
      "유수 넘기기",
      "유수 갈고리권",
      "옥풍 팔꿈치",
      "비취 복부권",
      "그림자 발끝",
      "유수 측면각",
      "낙월 내려차기",
      "비연 무릎",
      "낙화 바운드",
    ],
    frames: [
      [9, 2, 16, -3, 4],
      [11, 2, 17, -5, 4],
      [13, 2, 16, -5, 5],
      [16, 3, 19, -7, 6],
      [11, 2, 16, -4, 6],
      [18, 3, 22, -9, 8],
      [15, 3, 18, -12, 9],
      [13, 2, 17, -10, 3],
      [23, 3, 26, -16, 8],
      [18, 3, 22, -8, 7],
      [17, 3, 21, -13, 9],
      [18, 3, 21, -8, 7],
      [18, 3, 22, -8, 7],
      [21, 3, 24, -7, 9],
      [14, 2, 18, -6, 5],
      [17, 3, 21, -12, 9],
      [17, 2, 26, 0, 9],
      [11, 2, 16, -4, 4],
      [12, 2, 16, -5, 5],
      [11, 2, 15, -3, 4],
      [12, 2, 16, -10, 3],
      [15, 2, 18, -6, 6],
      [20, 3, 22, -8, 8],
      [13, 2, 17, -5, 6],
      [15, 2, 18, -11, 5],
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
    ],
    kinds: {
      upper: "leftKick",
      low: "leftPunch",
      dashPunch: "low",
      palm: "backKick",
      backKick: "leftPunch",
      hopKick: "upper",
    },
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
    names: [
      "철산 견제",
      "강철 정권",
      "중량 전축각",
      "파쇄 중단각",
      "철산 이연",
      "산붕 피니시",
      "철산 어퍼",
      "대지 밟기",
      "지진 쓸기",
      "산맥 파쇄권",
      "철룡 승천",
      "대지 분쇄각",
      "철산 돌진",
      "거벽 압살",
      "철산 뒤차기",
      "대지 도약",
      "거암 메치기",
      "철산 훅",
      "거벽 팔꿈치",
      "철산 복부권",
      "대지 발끝",
      "거암 측면각",
      "산붕 내려차기",
      "철룡 무릎",
      "산붕 바운드",
    ],
    frames: [
      [14, 3, 25, -7, 7],
      [16, 3, 24, -9, 8],
      [17, 3, 21, -8, 8],
      [20, 3, 25, -11, 10],
      [15, 3, 21, -7, 8],
      [23, 4, 28, -14, 12],
      [18, 3, 24, -16, 12],
      [18, 3, 23, -14, 5],
      [28, 4, 33, -20, 13],
      [27, 4, 31, -13, 14],
      [21, 4, 27, -18, 12],
      [24, 4, 28, -12, 12],
      [24, 4, 30, -13, 12],
      [29, 4, 33, -12, 15],
      [20, 3, 26, -11, 10],
      [22, 3, 27, -17, 12],
      [23, 3, 33, 0, 13],
      [15, 3, 21, -7, 7],
      [15, 3, 21, -7, 8],
      [15, 2, 20, -6, 7],
      [16, 2, 20, -12, 4],
      [19, 3, 24, -10, 9],
      [26, 4, 29, -12, 12],
      [17, 3, 22, -8, 9],
      [19, 3, 24, -14, 7],
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
    ],
    kinds: { qcfKick: "sweep" },
    kickReach: 0.04,
  },
};
export const CHARACTERS = Object.fromEntries(
  Object.entries(profileData).map(([id, p]) => {
    const moves = Object.fromEntries(
      keys.map((key, index) => {
        const [baseLevel, damage, baseRange, baseKind] = base[key],
          [startup, active, recovery, onBlock, onHit] = p.frames[index];
        const rule = p.commands.find((r) => r[0] === key);
        const button =
          rule?.[1] ??
          (key === "oneTwo" ? p.chain[1] : key === "finish" ? p.chain[2] : key);
        const chainKind =
          key === "oneTwo"
            ? {
                u: "leftPunch",
                i: "rightPunch",
                j: "leftKick",
                k: "rightKick",
              }[button]
            : key === "finish"
              ? ["u", "i"].includes(button)
                ? "powerPunch"
                : "spin"
              : null;
        const kind =
          p.kinds?.[key] ??
          chainKind ??
          (key === "hook"
            ? rule[1] === "u"
              ? "leftHook"
              : "rightHook"
            : baseKind);
        const level = ["low", "sweep", "toeKick"].includes(kind)
          ? "low"
          : baseLevel;
        const range = ["low", "sweep", "toeKick"].includes(kind)
          ? Math.min(baseRange, 1.95)
          : baseRange;
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
        return [
          key,
          {
            name: p.names[index],
            command,
            level,
            damage: Math.round(damage * p.damage),
            range:
              range +
              (["j", "k", "qcfKick", "backKick", "sideKick"].includes(key)
                ? (p.kickReach ?? 0)
                : 0),
            kind,
            side: ["u", "j"].includes(button) ? 1 : 0,
            impactHeight: ["low", "sweep", "toeKick"].includes(kind)
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
            width: ["spin", "sweep"].includes(kind) ? 0.78 : 0.5,
            startup,
            active,
            recovery,
            onBlock,
            onHit,
            windup: startup / 60,
            duration: (startup + active + recovery) / 60,
            stun: (remaining + onHit) / 60,
            blockStun: Math.max(1, remaining + onBlock) / 60,
            launch: ["upper", "dragon", "hopKick"].includes(key),
            bound: key === "bound",
            // Heights refer to the airborne defender's feet, in world units.
            airMin: level === "low" ? 0 : 0.04,
            airMax: level === "low" ? 0.35 : kind === "axeKick" ? 2.6 : 2.15,
            juggleCancel:
              key === "throw" || level === "low"
                ? null
                : ["upper", "dragon", "hopKick"].includes(key)
                  ? 10
                  : ["u", "i", "oneTwo", "hook", "elbow", "bodyBlow"].includes(
                        key,
                      )
                    ? 5
                    : 7,
            lunge: ["qcfPunch", "dashPunch"].includes(key)
              ? 0.3
              : key === "dragon"
                ? 0.1
                : 0,
            hitstop: Math.min(9, 2 + Math.floor((damage * p.damage) / 5)),
            push: damage * p.damage > 25 ? 2.2 : 1.05,
          },
        ];
      }),
    );
    return [id, { id, ...p, moves }];
  }),
);
export const CHARACTER_IDS = Object.keys(CHARACTERS);
export function character(id) {
  return CHARACTERS[id] ?? CHARACTERS.kai;
}
export function moveFor(f, key = f.attack?.key) {
  return character(f.character).moves[key];
}
