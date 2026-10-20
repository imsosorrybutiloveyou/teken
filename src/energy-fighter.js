// Independent 60 Hz move data. Ki uses 20 points per stock, maximum two stocks.
const rows = `u|잔화 탐장|raonTouch|high|7|10|15|-2|1.65
i|역류 등장|raonBackPalm|mid|10|11|17|-4|1.8
j|재밟기|raonRootKick|low|11|14|18|-12|1.85
k|반월 선각|raonArcKick|mid|16|16|20|-7|2.05
oneTwo|쌍엽 손날|raonTwin|mid|12|12|18|-5|1.95
finish|잔화 회신축|raonWheel|mid|20|19|24|-14|2.3
upper|월륜 뒤축|raonHeelRise|mid|15|16|24|-17|2.0
low|복호 절장|raonLowPalm|low|10|16|19|-13|1.85
sweep|낙재 발목걸기|raonRootKick|low|19|23|27|-24|2.2
qcfPunch|여명 기공탄|raonWave|mid|11|18|26|-12|0.65
dragon|승화 무릎|raonKnee|mid|19|17|22|-12|1.9
qcfKick|원광 회전축|raonOrbit|mid|21|21|24|-13|2.5
dashPunch|흐름 밀어장|raonPivotPalm|mid|22|19|25|-15|2.35
palm|연엽 쌍장|raonTwin|mid|23|18|22|-10|2.2
backKick|회풍 반월축|raonCrescent|high|20|19|23|-8|2.4
hopKick|역상 회전각|raonFloatKick|mid|17|18|26|-18|2.05
throw|윤회 팔꺾기|raonThrow|throw|29|18|26|0|1.85
hook|허공 손날|raonRake|high|12|13|17|-4|1.8
elbow|반전 척주|raonFold|mid|14|14|19|-7|1.65
bodyBlow|복호 침장|raonLowPalm|mid|13|15|18|-6|1.75
toeKick|낮은 재쓸기|raonRootKick|low|9|15|18|-11|2.05
sideKick|비늘 걷어차기|raonArcKick|mid|18|18|23|-12|2.35
axeKick|유성 발꿈치|raonStamp|mid|21|24|24|-12|2.2
kneeStrike|접련 무릎|raonKnee|mid|16|14|20|-8|1.65
bound|낙화 쌍수|raonDrop|mid|14|16|23|-14|2.1
rushStrike|잔영 미끄럼장|raonPivotPalm|mid|21|17|24|-10|2.2
windGod|허실 흔들발|raonCrescent|high|18|18|22|-9|2.25
electric|잔화 쇄골장|raonRake|mid|20|18|24|-13|2.1
hellSweep|쐐기 하단각|raonRootKick|low|16|20|24|-24|2.15
runningKick|잔화 나선축|raonAirWheel|mid|24|20|22|3|2.5
hellFollow|엇발 섬각|raonArcKick|mid|16|11|22|-14|2.35
styleFollow|연엽 회신각|raonOrbit|mid|17|12|23|-13|2.45
crouchPunch|낮은 여울장|raonLowPalm|mid|9|11|17|-4|1.6
crouchKick|복류 발끝|raonRootKick|low|12|16|20|-14|1.95
risingUpper|기상 윤회축|raonHeelRise|mid|16|15|25|-16|2.0
risingKick|기상 선회각|raonCrescent|mid|13|14|19|-7|2.15
jumpPunch|유성 쌍장|raonDrop|mid|13|13|21|-10|2.1
jumpKick|공중 원광축|raonFloatKick|mid|17|15|22|-11|2.35
jumpFollow|유성 내려축|raonStamp|mid|17|11|21|-13|2.3
crouchFollow|여울 회신장|raonBackPalm|mid|13|12|20|-12|2.0
wakeLow|누운 재쓸기|raonRootKick|low|14|19|26|-19|2.15
wakeMid|누운 월륜각|raonHeelRise|mid|17|21|28|-15|2.2
signature|진공 원무장|raonFan|mid|24|22|25|-14|2.4
homingStrike|원형 봉쇄축|raonOrbit|mid|19|21|24|-9|2.6
rushLink|유성 착지장|raonFold|mid|13|12|20|-11|2.15
exWave|작열 기공탄|raonWave|mid|20|14|24|-8|0.65
exDragon|폭련 기둥|raonPillar|mid|28|14|33|-22|2.1
focusBurst|축기 연환장|raonFan|mid|12|8|18|-16|2.5`;
const rules = [
  ["upper", "j", [3]],
  ["low", "u", [1]],
  ["sweep", "k", [1]],
  ["qcfPunch", "u", [2, 3, 6]],
  ["dragon", "i", [6, 5, 4]],
  ["qcfKick", "k", [2, 3, 6]],
  ["dashPunch", "i", [4, 5, 6]],
  ["palm", "u", [4, 5, 6]],
  ["backKick", "j", [4, 6]],
  ["hopKick", "j", [6, 5, 4, 3]],
  ["throw", "u+i", [4]],
  ["hook", "u", [4]],
  ["elbow", "i", [4]],
  ["bodyBlow", "i", [2, 1, 4]],
  ["toeKick", "j", [1]],
  ["sideKick", "k", [6]],
  ["axeKick", "k", [4, 6]],
  ["kneeStrike", "i", [6]],
  ["bound", "j", [2]],
  ["rushStrike", "u", [6, 5, 6]],
  ["windGod", "j", [4, 5, 4, 6]],
  ["electric", "i", [4, 5, 6, 3]],
  ["hellSweep", "k", [2, 1, 4]],
  ["runningKick", "j", [6, 5, 6, 5, 6]],
  ["signature", "i", [2, 5, 4]],
  ["homingStrike", "k", [4, 5, 6]],
  ["exWave", "u+i", [2, 3, 6]],
  ["exDragon", "u+i", [5]],
  ["focusBurst", "j+k", [5]],
];
export function addEnergyFighter(roster) {
  const p = {
    id: "raon",
    name: "RAON",
    title: "CIRCLE OF EMBERS",
    style: "환류 기공권 · 장법과 윤회축",
    color: "#6de4d5",
    skeleton: "raon",
    build: 1.02,
    speed: 1,
    damage: 1,
    comboScale: 1.04,
    anatomy: { upperArm: 18, forearm: 21, thigh: 23, shin: 26 },
    chain: ["i", "u", "j"],
    commands: rules.map((r) => structuredClone(r)),
    followUps: [
      ["hellSweep", "u", "hellFollow"],
      ["palm", "k", "styleFollow"],
      ["runningKick", "u", "rushLink"],
      ["jumpPunch", "k", "jumpFollow"],
      ["crouchPunch", "i", "crouchFollow"],
    ],
    specialty:
      "원형 장법·하단 발 견제 / 월륜축 띄우기 / 기 2칸과 기둥형 강화기",
    moves: {},
  };
  const symbols = { 1: "↙", 2: "↓", 3: "↘", 4: "←", 5: "N", 6: "→" };
  rows.split("\n").forEach((line, index) => {
    const [key, name, kind, level, d, s, r, g, reach] = line.split("|"),
      damage = +d,
      startup = +s,
      recovery = +r,
      onBlock = +g,
      active = ["exDragon", "runningKick", "signature", "bound"].includes(key)
        ? 3
        : 2,
      onHit = key === "u" ? 5 : key === "j" ? 3 : 8,
      projectile = ["qcfPunch", "exWave"].includes(key),
      cost = ["exDragon", "exWave", "focusBurst"].includes(key) ? 20 : 0,
      rule = rules.find((r) => r[0] === key);
    const m = (p.moves[key] = {
      name,
      kind,
      level,
      damage,
      startup,
      active,
      recovery,
      onBlock,
      onHit,
      range: +reach,
      command: rule
        ? rule[2].map((d) => symbols[d]).join(" ") +
          " + " +
          rule[1].toUpperCase()
        : ({
            oneTwo: "I › U",
            finish: "I › U › J",
            hellFollow: "쐐기 하단각 › U",
            styleFollow: "연엽 쌍장 › K",
            rushLink: "공중 콤보 나선축 › U",
            crouchPunch: "S + U",
            crouchKick: "S + K",
            risingUpper: "S 유지 › 떼기 + I",
            risingKick: "S 유지 › 떼기 + J",
            jumpPunch: "W › U",
            jumpKick: "W › J",
            jumpFollow: "유성 쌍장 › K",
            crouchFollow: "낮은 여울장 › I",
            wakeLow: "누운 상태 J",
            wakeMid: "누운 상태 K",
          }[key] ?? key),
      side: ["u", "j"].includes(key)
        ? 1
        : ["i", "k"].includes(key)
          ? 0
          : index % 2,
      color: cost ? "#58b8ff" : "#6de4d5",
      motionWeight: 1.08,
      visual: {
        coil: 0.35 + (index % 4) * 0.07,
        step: (index % 6) - 2,
        lean: (index % 7) - 3,
        arc: ((index * 7) % 23) - 11,
        reach: 1 + (index % 3),
        shape: index % 2 ? "ring" : "fan",
        rays: 2 + (index % 3),
        angle: 0.2 + index * 0.087,
        size: 0.6 + index * 0.013,
      },
      windup: startup / 60,
      duration: (startup + active + recovery) / 60,
      stun: (active + recovery + onHit) / 60,
      blockStun: Math.max(1, active + recovery + onBlock) / 60,
      impactHeight: level === "low" ? 0.35 : level === "high" ? 1.8 : 1.4,
      width: projectile ? 0.28 : key === "homingStrike" ? 1.15 : 0.58,
      launch: ["upper", "risingUpper", "exDragon", "hopKick"].includes(key),
      knockdown: [
        "sweep",
        "backKick",
        "rushStrike",
        "signature",
        "styleFollow",
        "hellFollow",
      ].includes(key),
      counterLaunch: ["dragon", "windGod", "electric", "bodyBlow"].includes(
        key,
      ),
      bound: ["bound", "jumpPunch", "axeKick"].includes(key),
      wallSplat: [
        "dashPunch",
        "palm",
        "signature",
        "sideKick",
        "rushStrike",
      ].includes(key),
      justFrames: null,
      armorFrom: null,
      highCrushFrom: ["low", "hellSweep", "crouchPunch"].includes(key)
        ? 3 / 60
        : null,
      hop: key === "hopKick" ? 5.6 : key === "runningKick" ? 5.2 : 0,
      blockPush: 0.75,
      push: key === "focusBurst" ? 0.6 : 1.15,
      airMin: level === "low" ? 0 : 0.04,
      airMax: projectile ? 1.8 : level === "low" ? 0.4 : 2.6,
      juggleCancel:
        projectile || level === "throw"
          ? null
          : ["u", "i", "j", "oneTwo", "focusBurst"].includes(key)
            ? 5
            : 7,
      lunge: projectile
        ? 0
        : ["dashPunch", "rushStrike"].includes(key)
          ? 1.2
          : key === "focusBurst"
            ? 0.6
            : 0.25,
      hitstop: cost ? 6 : Math.min(7, 2 + Math.floor(damage / 5)),
      homing: key === "homingStrike",
      trackSide: key === "qcfKick" ? 1 : 0,
      kiCost: cost,
      kiExtend: !!cost,
      projectile,
    });
    if (cost) m.command += " · 기 1칸";
  });
  roster.raon = p;
}
