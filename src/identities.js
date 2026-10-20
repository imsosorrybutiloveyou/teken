import { STYLE_MOTIONS } from "./style-motion.js";
export const FIGHTER_IDENTITIES = {
  ren: "카운터 복싱 · 손 기술 카운터 피해와 스웨이 반격",
  mira: "회피 팔괘장 · 상단을 흘리는 옆걸음과 반격 띄우기",
  goro: "근접 그래플러 · 강한 잡기와 버티는 몸통 압박",
  hana: "태권도 연환각 · 긴 발 리치와 빠른 J › K › J 연계",
  shin: "검끝 거리전 · 사거리 끝 적중 보너스와 긴 검 견제",
  boru: "야수 제압 · 넓고 긴 발톱, 강한 밀어내기와 짧은 하단",
  atlas: "중장갑 피스톤 · 준비 중 버티기와 가드 피해",
};
export function applyIdentities(roster) {
  const defs = {
    ren: [
      "홍염 스웨이 카운터",
      "shortElbow",
      "u",
      21,
      14,
      1.8,
      {
        highCrushFrom: 4 / 60,
        counterLaunch: true,
        counterPower: 1.35,
        onBlock: -12,
      },
    ],
    mira: [
      "유수 측보 반격장",
      "doublePalm",
      "i",
      18,
      17,
      2.0,
      {
        highCrushFrom: 2 / 60,
        evadeSide: -0.3,
        counterLaunch: true,
        onBlock: -10,
      },
    ],
    goro: [
      "거암 허리뒤집기",
      "hipToss",
      "i",
      46,
      18,
      2.05,
      { level: "throw", onBlock: 0, lunge: 0.25 },
    ],
    hana: [
      "백학 연환 돌려차기",
      "roundhouse",
      "k",
      22,
      15,
      2.5,
      { onBlock: -12, counterLaunch: true },
    ],
    shin: [
      "월영 검끝흘리기",
      "swordThrust",
      "u",
      17,
      18,
      3,
      {
        tipBonus: 6,
        tipStart: 0.75,
        counterLaunch: true,
        lunge: 0.1,
        onBlock: -12,
      },
    ],
    boru: [
      "산곰 포효 할퀴기",
      "clawSwipe",
      "u",
      27,
      21,
      2.9,
      { knockdown: true, width: 1.1, trackSide: -1, onBlock: -16, push: 2.8 },
    ],
    atlas: [
      "리액터 크래시",
      "robotHammer",
      "i",
      31,
      26,
      2.4,
      {
        armorFrom: 6 / 60,
        chip: 4,
        knockdown: true,
        recovery: 32,
        onBlock: -18,
      },
    ],
  };
  for (const [id, identity] of Object.entries(FIGHTER_IDENTITIES)) {
    const p = roster[id];
    p.identity = identity;
    p.specialty = identity;
    for (const [key, m] of Object.entries(p.moves)) {
      const type = STYLE_MOTIONS[m.kind]?.[0],
        leg =
          type === "foot" ||
          type === "knee" ||
          /Kick|kick|sweep|Sweep|knee|Knee/.test(m.kind);
      if (id === "ren" && !leg && m.level !== "throw") m.counterPower = 1.35;
      if (id === "hana") {
        if (leg) {
          m.damage += 2;
          m.range += 0.15;
          if (!["upper", "risingUpper", "u"].includes(key))
            m.startup = Math.max(10, m.startup - 1);
          m.recovery = Math.max(14, m.recovery - 2);
        } else if (m.level !== "throw") m.damage = Math.max(5, m.damage - 2);
      }
      if (id === "goro" && m.level === "throw") m.damage += 5;
      if (id === "goro" && ["palm", "signature"].includes(key))
        m.armorFrom = 8 / 60;
      if (id === "mira" && ["signature", "elbow"].includes(key))
        m.highCrushFrom = 3 / 60;
      if (id === "shin" && m.kind.startsWith("sword")) {
        m.range += 0.18;
        m.tipStart = 0.75;
        m.tipBonus = 4;
      }
      if (id === "boru" && ["arm", "both", "body"].includes(type)) {
        m.push *= 1.2;
        m.width += 0.12;
      }
      if (id === "atlas" && ["signature", "rushStrike"].includes(key)) {
        m.armorFrom = 5 / 60;
        m.chip = 2;
      }
      m.windup = m.startup / 60;
      m.duration = (m.startup + m.active + m.recovery) / 60;
      m.stun = (m.active + m.recovery + m.onHit) / 60;
      m.blockStun = Math.max(1, m.active + m.recovery + m.onBlock) / 60;
    }
    if (id === "hana") {
      p.chain = ["j", "k", "j"];
      p.moves.oneTwo.kind = "roundhouse";
      p.moves.finish.kind = "wheelKick";
      p.moves.finish.command = "J › K › J";
      p.moves.finish.damage = 23;
    }
    const [name, kind, button, damage, startup, range, extra] = defs[id];
    const move = (p.moves.traitStrike = {
      ...structuredClone(p.moves.signature),
      name,
      kind,
      command: "← N ↓ ↘ + " + button.toUpperCase(),
      level: "mid",
      damage,
      startup,
      range,
      active: 2,
      recovery: 24,
      onHit: 8,
      onBlock: -13,
      launch: false,
      knockdown: false,
      hop: 0,
      bound: false,
      counterLaunch: false,
      justFrames: null,
      armorFrom: null,
      highCrushFrom: null,
      homing: false,
      lunge: 0.3,
      ...extra,
    });
    move.windup = startup / 60;
    move.duration = (startup + move.active + move.recovery) / 60;
    move.stun = (move.active + move.recovery + move.onHit) / 60;
    move.blockStun =
      Math.max(1, move.active + move.recovery + move.onBlock) / 60;
    move.visual = {
      ...move.visual,
      step: move.visual.step + 3,
      arc: move.visual.arc - 4,
      angle: move.visual.angle + 0.25,
      size: move.visual.size + 0.12,
    };
    p.commands.unshift(["traitStrike", button, [4, 5, 2, 3]]);
    if (id === "hana") p.followUps.push(["sideKick", "k", "traitStrike"]);
  }
}
