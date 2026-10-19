const styles = {
  kai: ["파룡 붕권", "청룡 선회각", "파룡 착지권", "rushPalm", "spin", 22, 17],
  ren: [
    "홍염 파쇄각",
    "적풍 회전각",
    "홍염 착지 니",
    "flyingKnee",
    "wheelKick",
    24,
    18,
  ],
  mira: [
    "유수 반격장",
    "팔괘 회신장",
    "유수 낙보장",
    "flowPalm",
    "doublePalm",
    17,
    14,
  ],
  goro: [
    "거암 압살권",
    "대지 쓸어받기",
    "거암 낙진권",
    "shoulder",
    "shoulder",
    29,
    23,
  ],
  hana: [
    "백학 삼연축",
    "학익 회전각",
    "백학 착지축",
    "flyingSide",
    "wheelKick",
    21,
    16,
  ],
  shin: [
    "월영 관통검",
    "월륜 회전검",
    "낙월 검집격",
    "swordThrust",
    "swordSpin",
    20,
    16,
  ],
  boru: [
    "산곰 대발톱",
    "산림 회전발톱",
    "산곰 낙보찍기",
    "bearSlam",
    "bearSwipe",
    31,
    24,
  ],
  atlas: [
    "오버드라이브",
    "자이로 강철팔",
    "착륙 피스톤",
    "piston",
    "robotHammer",
    30,
    23,
  ],
};
export function upgradeRoster(roster) {
  for (const p of Object.values(roster)) {
    for (const [key, m] of Object.entries(p.moves)) {
      m.lunge =
        m.level === "throw" ? m.lunge : Math.min(1.8, (m.lunge + 0.08) * 1.2);
      m.trackSide = ["u", "upper", "windGod", "electric"].includes(key)
        ? 0
        : { 0: -1, 1: 0, 2: 1 }[Object.keys(p.moves).indexOf(key) % 3];
      m.width += m.level === "throw" ? 0.15 : 0.08;
    }
    p.moves.palm.width = 0.9;
    p.moves.palm.trackSide = 0;
    p.moves.palm.stepCatch = true;
    p.moves.throw.range += 0.55;
    p.moves.wakeLow.onBlock = -19;
    p.moves.wakeLow.blockStun =
      (p.moves.wakeLow.active + p.moves.wakeLow.recovery - 19) / 60;
    p.moves.risingUpper.startup = 15;
    p.moves.risingUpper.windup = 0.25;
    p.moves.risingUpper.duration =
      (15 + p.moves.risingUpper.active + p.moves.risingUpper.recovery) / 60;
    const [signature, homing, rush, kind, spin, damage, startup] = styles[p.id];
    const add = (key, template, name, button, seq, opts) => {
      const m = (p.moves[key] = {
        ...structuredClone(p.moves[template]),
        name,
        command:
          seq
            .map(
              (d) =>
                ({
                  1: "↙",
                  2: "↓",
                  3: "↘",
                  4: "←",
                  5: "N",
                  6: "→",
                  7: "↖",
                  8: "↑",
                  9: "↗",
                })[d],
            )
            .join(" ") +
          " + " +
          button.toUpperCase(),
        ...opts,
      });
      m.windup = m.startup / 60;
      m.duration = (m.startup + m.active + m.recovery) / 60;
      m.stun = (m.active + m.recovery + m.onHit) / 60;
      m.blockStun = Math.max(1, m.active + m.recovery + m.onBlock) / 60;
      m.visual = {
        ...m.visual,
        angle: m.visual.angle + Object.keys(p.moves).length * 0.037,
        size: m.visual.size + 0.17,
      };
      if (seq.length) p.commands.unshift([key, button, seq]);
      return m;
    };
    add("signature", "palm", signature, "i", [2, 5, 6], {
      kind,
      damage,
      startup,
      launch: p.id === "mira",
      knockdown: p.id !== "mira",
      hop: 0,
      range: p.id === "boru" ? 2.9 : 2.25,
      lunge: 1.05,
      onBlock: -14,
      counterLaunch: p.id === "hana",
      trackSide: 1,
    });
    add("homingStrike", "backKick", homing, "k", [4, 5, 6], {
      kind: spin,
      damage: 20,
      startup: 20,
      recovery: 24,
      launch: false,
      knockdown: false,
      hop: 0,
      homing: true,
      trackSide: 0,
      width: 1.1,
      onBlock: -9,
      lunge: 0.65,
    });
    add("rushLink", "i", rush, "u", [], {
      kind,
      damage: 14,
      startup: 12,
      recovery: 20,
      launch: false,
      knockdown: false,
      hop: 0,
      onBlock: -11,
      lunge: 0.55,
    });
    p.moves.rushLink.command = "공중 콤보 공참각 적중 › U";
    p.followUps.push(["runningKick", "u", "rushLink"]);
    if (["ren", "shin"].includes(p.id)) {
      const m = add(
        "justStrike",
        "signature",
        p.id === "ren" ? "홍염 섬각" : "월섬 일격",
        "i",
        [2, 5, 6],
        {
          damage: damage + 6,
          startup: startup - 3,
          justFrames: 1,
          onBlock: 3,
          launch: false,
          knockdown: p.id === "ren",
          color: "#b8fffb",
        },
      );
      m.visual.step += 2;
      m.visual.arc -= 5;
      m.command += " [JUST 1F]";
    }
    if (p.id === "kai") {
      p.moves.electric.justFrames = 1;
      p.moves.electric.command = p.moves.electric.command.replace(
        "[2F]",
        "[JUST 1F]",
      );
    }
  }
}
