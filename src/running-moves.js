export function addRunningMoves(roster) {
  const names = {
    kai: ["청류 비상각", "청류 낙풍장"],
    ren: ["홍염 플라잉 힐", "적풍 다이브 엘보"],
    mira: ["유수 비연각", "팔괘 공중쌍장"],
    goro: ["거암 비상축", "태산 낙진권"],
    hana: ["백학 비천축", "학익 비상수도"],
    shin: ["월영 도약축", "낙월 비검격"],
    raon: ["잔화 나선축", "유성 환공장"],
    boru: ["산맥 붕진", ""],
    atlas: ["브레이크리스 차지", ""],
  };
  for (const p of Object.values(roster)) {
    const heavy = ["boru", "atlas"].includes(p.id);
    p.commands = p.commands.filter(([key]) => key !== "runningKick");
    const kick = p.moves.runningKick;
    Object.assign(kick, {
      name: names[p.id][0],
      command: heavy
        ? "달리기 중 U+I / → N → N → + U+I"
        : "달리기 중 J 또는 K / → N → N → + J 또는 K",
      kind: heavy
        ? p.id === "boru"
          ? "bearRunCrash"
          : "steelRunCrash"
        : p.id === "raon"
          ? "raonAirWheel"
          : kick.kind,
      hop: heavy ? 0 : 5.2,
      startup: heavy ? 22 : 20,
      active: 3,
      recovery: heavy ? 28 : 22,
      damage: heavy ? 30 : 24,
      onBlock: heavy ? -16 : 3,
      onHit: 10,
      lunge: heavy ? 2.7 : 2.2,
      range: heavy ? 2.8 : 2.5,
      knockdown: heavy,
      launch: false,
      bound: false,
      wallSplat: heavy,
      homing: false,
      trackSide: 0,
      push: heavy ? 4 : 1.3,
    });
    const recalc = (m) => {
      m.windup = m.startup / 60;
      m.duration = (m.startup + m.active + m.recovery) / 60;
      m.stun = (m.active + m.recovery + m.onHit) / 60;
      m.blockStun = Math.max(1, m.active + m.recovery + m.onBlock) / 60;
    };
    recalc(kick);
    p.commands.unshift(["runningKick", heavy ? "u+i" : "j", [6, 5, 6, 5, 6]]);
    if (heavy) continue;
    const punch = (p.moves.runningPunch = {
      ...structuredClone(kick),
      name: names[p.id][1],
      command: "달리기 중 U 또는 I / → N → N → + U 또는 I",
      kind:
        {
          ren: "runDiveElbow",
          mira: "runTwinPalm",
          shin: "runSwordFall",
          raon: "raonAirPalm",
        }[p.id] ?? "runDivePalm",
      side: 1,
      damage: 21,
      startup: 18,
      recovery: 24,
      onBlock: 1,
      onHit: 9,
      hop: 4.8,
      bound: false,
      visual: {
        ...kick.visual,
        angle: kick.visual.angle + 0.37,
        arc: kick.visual.arc + 4,
        size: kick.visual.size + 0.21,
        step: kick.visual.step + 2,
      },
    });
    recalc(punch);
    p.commands.unshift(["runningPunch", "u", [6, 5, 6, 5, 6]]);
  }
}
