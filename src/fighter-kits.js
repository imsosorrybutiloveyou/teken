// Move slots are shared by input/combo code; the authored attacks in each slot are not.
// name | motion | hit level | damage | range. Frames live beside the commands in characters.js.
const rows = {
  kai: `청류 잽|leftPunch|high|8|1.7
역정권|rightPunch|mid|12|1.85
전축 차기|leftKick|mid|13|1.85
회전 중단각|rightKick|mid|16|1.95
청류 원투|rightPunch|mid|11|1.9
청룡 회전각|spin|mid|21|2
승천권|upper|mid|19|1.85
로우 컷|low|low|11|1.7
수면각|sweep|low|21|1.95
뇌격 정권|powerPunch|mid|27|2.3
비룡 승천권|dragon|mid|23|1.95
청룡 회오리|spin|mid|23|2.05
청류 돌파|powerPunch|mid|25|2.45
파쇄 장타|palm|mid|29|2
백류 회전각|backKick|mid|19|2
천공 니|knee|mid|19|1.85
청류 어깨꺾기|throw|throw|27|1.3
청류 훅|leftHook|high|13|1.65
청류 팔꿈치|elbow|mid|15|1.45
수월 복부권|bodyBlow|mid|12|1.6
앞발 견제|toeKick|low|10|1.75
청류 옆차기|sideKick|mid|18|2
내려찍기|axeKick|mid|23|1.85
청룡 무릎|knee|mid|16|1.5
수룡 내려권|hammer|mid|15|1.8
청류 통발|rushPalm|mid|23|1.8
청룡 풍신권|dragon|mid|20|1.85
청룡 초풍|dragon|high|25|1.9
수룡 나락|hellSweep|low|26|1.85
청룡 공참각|runningKick|mid|24|1.9`,
  ren: `체크 잽|checkJab|high|7|1.6
밀어내는 정권|longCross|high|10|1.8
리드 티프|teep|mid|12|2.15
바깥 돌려차기|roundhouse|high|17|2.3
티프 투 하이|roundhouse|high|13|2.25
토네이도 힐|wheelKick|mid|24|2.4
오름 뒤꿈치|heelLift|mid|18|2.1
인사이드 로우|calfKick|low|12|1.95
뒤돌아 쓸기|heelSweep|low|23|2.1
블러드 크로스|longCross|mid|29|2.3
스위치 니|flyingKnee|mid|22|1.9
휠 엣지|wheelKick|high|25|2.45
슬라이딩 니|drivingKnee|mid|24|2.15
힐 브레이커|heelDrop|mid|28|2.1
뒤돌아 밀기|backThrust|mid|20|2.35
리프팅 니|flyingKnee|mid|19|1.9
목잡아 무릎|clinchKnee|throw|28|1.25
체크 훅|checkJab|high|12|1.7
클로즈 엘보|shortElbow|mid|15|1.4
리버 스트레이트|longCross|mid|13|1.7
발목 톡|calfKick|low|10|2
피스톤 사이드|backThrust|mid|20|2.45
길로틴 힐|heelDrop|mid|24|2.2
체스트 니|drivingKnee|mid|18|1.65
크래시 힐|heelDrop|mid|17|2
스텝 인 티프|teep|mid|22|2.3
오비탈 힐|heelLift|mid|24|2.25
플라밍고 훅킥|hookKick|high|27|2.4
시저스 로우|scissorLow|low|24|2.15
플라잉 사이드|flyingSide|mid|26|2.4`,
  mira: `탐수|probePalm|high|7|1.65
유수 우장|flowPalm|mid|11|1.75
연화 탄퇴|crescent|mid|12|1.9
선회 월각|crescent|high|15|2.05
유수 연환장|doublePalm|mid|10|1.85
회신 붕장|turnPalm|mid|20|1.9
탁장 띄우기|liftingPalm|mid|17|1.7
복호 탐수|lowPalm|low|10|1.55
낙엽 걸기|ankleReap|low|19|1.75
질풍 쌍장|doublePalm|mid|23|2
회피 천장|liftingPalm|mid|20|1.8
비연 선각|crescent|mid|21|2.05
복호 전진장|lowPalm|low|16|1.75
회신 반격장|turnPalm|mid|25|1.85
유수 흘리기|probePalm|high|11|1.6
비연 장타|liftingPalm|mid|18|1.75
손목 흘려 넘기기|wristThrow|throw|25|1.2
백련 수도|knifeHand|high|11|1.7
관통 수도|knifeHand|mid|13|1.55
복호 촌경|lowPalm|mid|11|1.6
낙엽 발걸기|ankleReap|low|9|1.7
유수 반월각|crescent|mid|16|1.95
낙화 장타|fallingPalm|mid|21|1.8
접신 팔꿈치|turnPalm|mid|14|1.4
낙화 쌍장|fallingPalm|mid|14|1.8
팔괘 보법장|turnPalm|mid|20|1.85
선회 탁장|liftingPalm|mid|19|1.7
회피 관통장|slipPalm|mid|21|1.75
복호 하단장|lowPalm|low|20|1.65
유수 활보장|doublePalm|mid|22|1.95`,
  goro: `거벽 견제|heavyJab|high|10|1.5
거암 망치|overhand|mid|16|1.7
대지 앞차기|heavyBoot|mid|16|1.8
장화 밀어차기|heavyBoot|mid|20|1.85
거벽 이연|heavyJab|mid|15|1.65
회전 철완|lariat|high|28|2.05
철산 어깨받기|shoulderLift|mid|23|1.65
발등 짓밟기|stomp|low|15|1.5
대지 걸기|heavyReap|low|25|1.7
산맥 몸통박치기|shoulder|mid|34|2.05
들어올려 박기|shoulderLift|mid|29|1.6
거암 회전완|lariat|mid|29|2
거벽 돌진|shoulder|mid|31|2.1
거암 머리받기|headbutt|mid|32|1.4
뒤돌아 철완|lariat|high|23|1.85
도약 어깨받기|shoulderLift|mid|25|1.65
거암 들어메치기|bearThrow|throw|38|1.4
관자 철완|lariat|high|17|1.65
거벽 팔꿈치|heavyElbow|mid|20|1.35
복부 머리받기|headbutt|mid|18|1.35
발등 누르기|stomp|low|13|1.55
거암 장화|heavyBoot|mid|23|1.95
거벽 해머|doubleHammer|mid|30|1.75
근접 어깨|shoulder|mid|21|1.4
산붕 양손망치|doubleHammer|mid|21|1.8
철산 태클|shoulder|mid|30|1.85
거암 퍼올리기|shoulderLift|mid|27|1.7
철벽 헤드차지|headbutt|mid|29|1.5
다리 잡아 메치기|legThrow|throw|35|1.35
달려 몸통박치기|bodyPress|mid|32|2.1`,
};
export const KIT_MOVES = Object.fromEntries(
  Object.entries(rows).map(([id, text]) => [
    id,
    Object.fromEntries(
      text.split("\n").map((row, i) => {
        const [name, kind, level, damage, range] = row.split("|");
        return [
          i,
          { name, kind, level, damage: Number(damage), range: Number(range) },
        ];
      }),
    ),
  ]),
);
export const KIT_RULES = {
  kai: {
    description: "정통 카라테 · 웨이브 이지선다",
    specialty: "초풍으로 띄우기 / 나락으로 선 가드 공략",
    moves: {},
  },
  ren: {
    description: "태권 킥복싱 · 긴 발차기와 공중 압박",
    specialty: "긴 티프 견제 / 도약으로 하단 회피 / 하이킥은 앉아서 회피 가능",
    moves: {
      dragon: { hop: 4.4 },
      hopKick: { hop: 4.8 },
      windGod: { hop: 4.5 },
      electric: {
        launch: false,
        knockdown: true,
        justFrames: null,
        onBlock: -9,
      },
      hellSweep: { highCrushFrom: 6 / 60, lunge: 0.45, onBlock: -23 },
      rushStrike: { knockdown: false, lunge: 0.8, onBlock: -6 },
      runningKick: { hop: 5.5, lunge: 1.3, onBlock: 3 },
    },
  },
  mira: {
    description: "팔괘장 · 낮은 보법과 회피 장타",
    specialty: "몸을 낮춰 상단 회피 / 짧은 장타 연계 / 전진 하단권",
    moves: {
      dashPunch: {
        launch: false,
        knockdown: false,
        highCrushFrom: 3 / 60,
        onBlock: -14,
      },
      upper: { lunge: 0.25 },
      dragon: { highCrushFrom: 3 / 60 },
      palm: { highCrushFrom: 4 / 60 },
      electric: {
        launch: false,
        justFrames: null,
        highCrushFrom: 2 / 60,
        onBlock: -4,
      },
      hellSweep: {
        knockdown: false,
        highCrushFrom: 3 / 60,
        lunge: 0.45,
        onBlock: -14,
        onHit: 7,
      },
      rushStrike: {
        knockdown: false,
        highCrushFrom: 4 / 60,
        lunge: 1,
        onBlock: -5,
      },
      runningKick: { hop: 0, lunge: 1.4, onBlock: 2 },
      backKick: { highCrushFrom: 2 / 60 },
    },
  },
  goro: {
    description: "레슬링 · 몸통 강타와 메치기",
    specialty: "근접 잡기 / 1회 버티는 몸통박치기 / 하단에 약한 돌진",
    moves: {
      upper: { lunge: 0.3 },
      throw: { knockdown: true },
      hellSweep: {
        knockdown: true,
        highCrushFrom: null,
        onBlock: 0,
        lunge: 0.35,
      },
      electric: {
        justFrames: null,
        launch: false,
        knockdown: true,
        armorFrom: 6 / 60,
        onBlock: -15,
      },
      qcfPunch: { armorFrom: 8 / 60, knockdown: true },
      rushStrike: { armorFrom: 7 / 60, onBlock: -14 },
      runningKick: { hop: 0, armorFrom: 8 / 60, lunge: 1.7, onBlock: -12 },
      palm: { knockdown: true },
    },
  },
};
