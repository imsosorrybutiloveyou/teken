// Original fighters: traditional martial arts, a weapon user and two heavyweight silhouettes.
const names = {
  hana: "탐색 정권|반격 지르기|앞발 밀어차기|머리 돌려차기|학익 연환각|회전 뒤꿈치|오름 뒤축|안쪽 로우|뒤돌아 쓸기|몸통 뒤차기|도약 무릎|나선 발등|전진 무릎|내려 뒤축|반회전 밀기|도약 올려차기|옷깃 무릎|손날 견제|접근 팔꿈치|복부 정권|발목 견제|곁차기|도끼 내려차기|가슴 무릎|뒤축 찍기|전진 앞축|회전 띄우기|학익 갈고리|쌍각 하단|비연 곁차기|뒤축 마무리|연속 무릎",
  shin: "검끝 찌르기|사선 베기|발끝 밀기|반월 발차기|쌍검 궤적|회신 베기|올려 베기|하단 검끝|발목 쓸기|관통 찌르기|회피 올림검|원월 베기|낮은 전진검|되돌려 베기|검집 치기|도약 검끝|검집 메치기|가로 검날|손잡이 치기|복부 찌르기|낮은 발목|반월 차기|낙월 베기|근접 칼등|내려 베기|전진 관통검|선회 올림검|회피 관통검|지면 검끝|활보 쌍검|연환 올림검|되베기 마무리",
  boru: "왼발톱 쓸기|오른발톱 베기|곰 앞차기|큰 발 밀기|양발톱 연계|회전 곰발|앞발 퍼올리기|발등 누르기|다리 걸기|산곰 몸통|거암 퍼올림|큰 발톱 회전|웅보 돌진|곰 머리받기|뒤돌아 발톱|도약 포효권|곰 포옹 메치기|넓은 앞발|근접 팔꿈치|복부 앞발|발바닥 누르기|큰 발 장타|양손 내려치기|가까운 어깨|산붕 찍기|산곰 태클|앞발 띄우기|철벽 머리받기|다리 잡아 던지기|곰 몸통 돌진|접근 발톱|앞발 마무리",
  atlas:
    "왼 피스톤|오른 강철 팔꿈치|유압 앞차기|강철 발 밀기|이중 피스톤|회전 강철팔|로켓 어퍼|지면 스탬프|기계식 걸기|중량 피스톤|유압 퍼올림|강철 회전팔|부스터 태클|합금 헤드차지|역회전 강철팔|점프 피스톤|유압 들어던지기|가로 강철팔|접근 엘보|복부 피스톤|발등 프레스|중량 장화|양팔 해머|접근 태클|지면 해머|철갑 돌진|중량 퍼올림|철벽 헤드차지|하단 포획|부스터 차지|강철 엘보 연계|유압 장화 마무리",
};
export function expandRoster(roster) {
  const specs = {
    hana: {
      base: "ren",
      name: "HANA",
      title: "WHITE CRANE",
      style: "태권도 · 연속 차기",
      color: "#dceef7",
      build: 0.94,
      speed: 1.04,
      scale: 0.94,
      prefix: "백학",
      kinds: [
        "teep",
        "roundhouse",
        "wheelKick",
        "heelLift",
        "hookKick",
        "flyingSide",
      ],
      specialty: "긴 발차기 연계 / 뒤꿈치 카운터 띄우기",
      counter: ["k", "hook", "sideKick"],
    },
    shin: {
      base: "mira",
      name: "SHIN",
      title: "MOON BLADE",
      style: "검술 · 거리와 회전 베기",
      color: "#adeda4",
      build: 0.96,
      speed: 1,
      scale: 1,
      prefix: "월영",
      kinds: [
        "swordThrust",
        "swordSlash",
        "swordRise",
        "swordLow",
        "swordSpin",
        "swordFall",
      ],
      specialty: "검의 긴 직선 / 회전 베기로 횡보 견제",
      counter: ["hook", "qcfPunch", "backKick"],
    },
    boru: {
      base: "goro",
      name: "BORU",
      title: "MOUNTAIN GUARDIAN",
      style: "야수권 · 발톱과 곰 포옹",
      color: "#d8a575",
      build: 1.45,
      speed: 0.77,
      scale: 1.14,
      prefix: "산곰",
      kinds: [
        "clawSwipe",
        "clawRise",
        "bearSlam",
        "bearSwipe",
        "clawLow",
        "bearCharge",
      ],
      specialty: "넓은 발톱 / 강한 포옹 / 느린 접근",
      counter: ["hook", "bodyBlow", "palm"],
    },
    atlas: {
      base: "goro",
      name: "ATLAS",
      title: "STEEL SENTINEL",
      style: "기계식 격투 · 피스톤과 강철 팔",
      color: "#8bc5d8",
      build: 1.38,
      speed: 0.8,
      scale: 1.12,
      prefix: "강철",
      kinds: [
        "piston",
        "robotHammer",
        "rocketUpper",
        "steelElbow",
        "robotStomp",
        "steelCharge",
      ],
      specialty: "직선 장거리 피스톤 / 강타 버티기 / 횡보에 약함",
      counter: ["i", "elbow", "rushStrike"],
    },
  };
  for (const [id, s] of Object.entries(specs)) {
    const p = structuredClone(roster[s.base]);
    Object.assign(p, s, { id, skeleton: s.base });
    for (const [index, [key, m]] of Object.entries(p.moves).entries()) {
      m.name = names[id].split("|")[index];
      if (
        !["j", "k", "low", "sweep", "toeKick", "hellSweep", "throw"].includes(
          key,
        )
      )
        m.kind = s.kinds[index % s.kinds.length];
      if (key === "u") m.kind = id === "hana" ? "checkJab" : s.kinds[0];
      if (key === "i")
        m.kind =
          id === "hana"
            ? "longCross"
            : id === "atlas"
              ? "steelElbow"
              : id === "boru"
                ? "bearSwipe"
                : "swordSlash";
      if (key === "throw") m.name = s.prefix + " 포획 메치기";
      m.damage = Math.max(1, Math.round(m.damage * s.scale));
      m.range +=
        id === "shin"
          ? 0.35
          : id === "atlas"
            ? 0.25
            : id === "boru"
              ? 0.1
              : 0.12;
      if (!["u", "oneTwo"].includes(key)) {
        m.startup += id === "hana" ? -1 : id === "boru" ? 2 : 1;
        m.recovery += id === "hana" ? -1 : 2;
      }
      m.windup = m.startup / 60;
      m.duration = (m.startup + m.active + m.recovery) / 60;
      m.stun = (m.active + m.recovery + m.onHit) / 60;
      m.blockStun = Math.max(1, m.active + m.recovery + m.onBlock) / 60;
      m.color = s.color;
      m.visual = {
        ...m.visual,
        angle: m.visual.angle + 0.1,
        size: m.visual.size * 1.08,
      };
      m.width =
        id === "boru"
          ? 0.95
          : id === "shin" && ["qcfKick", "backKick"].includes(key)
            ? 0.9
            : id === "atlas"
              ? 0.26
              : m.width;
      m.counterLaunch = s.counter.includes(key);
      m.motionWeight = id === "boru" ? 1.4 : 1.1;
    }
    roster[id] = p;
  }
  for (const p of Object.values(roster)) {
    p.skeleton ??= p.id;
    const symbols = {
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
    for (const rule of p.commands) {
      if (rule[2].some((d) => d >= 7))
        rule[2] = rule[0] === "hopKick" ? [6, 5, 4, 3] : [4, 5, 6, 3];
      if (
        rule[2].length === 1 &&
        rule[2][0] === 2 &&
        ["u", "k"].includes(rule[1])
      )
        rule[2] = [1];
      p.moves[rule[0]].command =
        rule[2].map((d) => symbols[d]).join(" ") +
        " + " +
        rule[1].toUpperCase() +
        (p.moves[rule[0]].justFrames ? " [2F]" : "");
    }
    for (const key of {
      kai: ["hook", "bodyBlow"],
      ren: ["kneeStrike", "hook"],
      mira: ["backKick", "elbow"],
      goro: ["hook", "bodyBlow"],
    }[p.id] ?? [])
      p.moves[key].counterLaunch = true;
    const defs = [
      ["crouchPunch", "u", "앉아 왼손", "S + U", 11, "mid", false],
      ["crouchKick", "low", "앉아 하단각", "S + K", 15, "low", false],
      [
        "risingUpper",
        "upper",
        "기상 띄우기",
        "S 유지 › 떼기 + I",
        15,
        "mid",
        true,
      ],
      ["risingKick", "j", "기상 견제각", "S 유지 › 떼기 + J", 13, "mid", false],
      ["jumpPunch", "i", "공중 타격", "W › U", 12, "mid", false],
      ["jumpKick", "k", "공중 차기", "W › J", 15, "mid", false],
      ["jumpFollow", "finish", "공중 이연각", "W › J › K", 13, "mid", false],
      ["crouchFollow", "i", "앉아 연환권", "S + U › I", 12, "mid", false],
    ];
    for (const [
      n,
      [key, template, name, command, startup, level, launch],
    ] of defs.entries()) {
      const source = p.moves[template];
      const m = (p.moves[key] = {
        ...structuredClone(source),
        name: p.name + " " + name,
        command,
        startup,
        active: 2,
        recovery: 19,
        level,
        launch,
        damage: launch ? 15 : 12,
        onHit: 7,
        onBlock: -9,
        hop: key.startsWith("jump") ? 0 : 0,
        knockdown: false,
        armorFrom: null,
        highCrushFrom: key.startsWith("crouch") ? 0 : null,
        justFrames: null,
        bound: false,
        lunge: 0.12,
        counterLaunch: key === "risingKick",
      });
      m.windup = startup / 60;
      m.duration = (startup + 2 + 19) / 60;
      m.stun = 28 / 60;
      m.blockStun = 12 / 60;
      m.side = ["crouchPunch", "risingKick", "jumpKick", "jumpPunch"].includes(
        key,
      )
        ? 1
        : 0;
      m.visual = {
        ...m.visual,
        step: m.visual.step + 3 + n * 0.2,
        arc: m.visual.arc - 4 - n * 0.3,
        coil: 0.4,
        size: m.visual.size + 0.2 + n * 0.01,
        angle: m.visual.angle + 0.013 + n * 0.07,
      };
    }
    p.followUps.push(
      ["jumpKick", "k", "jumpFollow"],
      ["crouchPunch", "i", "crouchFollow"],
    );
  }
}
