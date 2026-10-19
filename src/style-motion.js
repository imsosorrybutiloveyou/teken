// Authored chamber/contact targets. Anatomy is constrained by scene.js after blending.
// arm / foot / knee / body determine the actual striking part, not just an effect tint.
export const STYLE_MOTIONS = {
  swordThrust: ["arm", [46, 50], [97, 40]],
  swordSlash: ["arm", [32, 19], [91, 58]],
  swordRise: ["arm", [46, 74], [75, 21]],
  swordLow: ["arm", [40, 74], [91, 88]],
  swordSpin: ["arm", [22, 36], [96, 37]],
  swordFall: ["both", [60, 10], [90, 65]],
  clawSwipe: ["arm", [31, 33], [94, 47]],
  clawRise: ["arm", [45, 73], [75, 24]],
  bearSlam: ["both", [59, 12], [85, 68]],
  bearSwipe: ["arm", [24, 39], [93, 50]],
  clawLow: ["arm", [42, 68], [90, 85]],
  bearCharge: ["body", [40, 62], [85, 55]],
  piston: ["arm", [45, 48], [99, 44]],
  robotHammer: ["both", [58, 13], [87, 65]],
  rocketUpper: ["arm", [48, 67], [78, 22]],
  steelElbow: ["arm", [60, 27], [78, 43]],
  robotStomp: ["foot", [58, 73], [73, 113]],
  steelCharge: ["body", [41, 60], [87, 53]],
  checkJab: ["arm", [56, 35], [91, 31]],
  longCross: ["arm", [47, 48], [96, 42]],
  shortElbow: ["arm", [61, 26], [75, 31]],
  teep: ["foot", [51, 77], [99, 66]],
  roundhouse: ["foot", [39, 74], [96, 35]],
  wheelKick: ["foot", [22, 70], [94, 31]],
  heelLift: ["foot", [58, 93], [80, 27]],
  calfKick: ["foot", [45, 96], [94, 104]],
  heelSweep: ["foot", [26, 99], [97, 104]],
  flyingKnee: ["knee", [47, 82], [79, 48]],
  drivingKnee: ["knee", [44, 87], [85, 61]],
  heelDrop: ["foot", [67, 25], [87, 60]],
  backThrust: ["foot", [35, 70], [99, 65]],
  clinchKnee: ["knee", [43, 84], [76, 54]],
  hookKick: ["foot", [75, 24], [96, 39]],
  scissorLow: ["foot", [31, 89], [94, 108]],
  flyingSide: ["foot", [49, 78], [99, 56]],
  probePalm: ["arm", [57, 42], [90, 35]],
  flowPalm: ["arm", [46, 52], [92, 47]],
  doublePalm: ["both", [49, 55], [90, 45]],
  crescent: ["foot", [34, 72], [91, 42]],
  turnPalm: ["arm", [28, 48], [91, 48]],
  liftingPalm: ["arm", [51, 71], [76, 24]],
  lowPalm: ["arm", [47, 69], [91, 91]],
  ankleReap: ["foot", [45, 103], [89, 110]],
  wristThrow: ["both", [71, 43], [84, 66]],
  knifeHand: ["arm", [42, 24], [93, 43]],
  fallingPalm: ["both", [62, 16], [87, 64]],
  slipPalm: ["arm", [34, 65], [91, 50]],
  heavyJab: ["arm", [52, 50], [85, 40]],
  overhand: ["arm", [40, 19], [85, 52]],
  heavyBoot: ["foot", [48, 92], [91, 69]],
  lariat: ["arm", [23, 37], [92, 36]],
  shoulderLift: ["body", [43, 65], [76, 32]],
  stomp: ["foot", [61, 75], [71, 112]],
  heavyReap: ["foot", [29, 98], [91, 107]],
  shoulder: ["body", [39, 65], [86, 57]],
  headbutt: ["body", [43, 43], [76, 46]],
  bearThrow: ["both", [84, 48], [65, 24]],
  heavyElbow: ["arm", [58, 29], [72, 43]],
  doubleHammer: ["both", [59, 14], [85, 65]],
  legThrow: ["both", [55, 73], [80, 84]],
  bodyPress: ["body", [42, 52], [92, 54]],
};
const blend = (point, target, weight) =>
  point.map((v, i) => v + (target[i] - v) * weight);
export function styleStance(p, id, crouch) {
  const down = crouch ? 16 : 0;
  if (id === "ren") {
    p.hip[1] -= 3;
    p.hands = [
      [62, 25 + down],
      [73, 29 + down],
    ];
    p.feet[0][0] -= 5;
    p.feet[1][0] += 6;
    p.shoulders[0][0] -= 2;
  } else if (id === "mira") {
    p.hip[1] += 5;
    p.head[1] += 3;
    p.hands = [
      [45, 51 + down],
      [80, 42 + down],
    ];
    p.feet[0][0] -= 7;
    p.feet[1][0] += 3;
    p.shoulders[0][0] -= 3;
    p.lean = -3;
  } else if (id === "goro") {
    p.hip[1] += 3;
    p.head[1] += 5;
    p.shoulders = [
      [34, 45 + down],
      [57, 45 + down],
    ];
    p.hands = [
      [50, 52 + down],
      [78, 52 + down],
    ];
    p.feet[0][0] -= 3;
    p.feet[1][0] += 3;
    p.lean = 3;
  }
}
export function styleAttack(p, m, chamber, extension, aimOffset) {
  const motion = STYLE_MOTIONS[m.kind];
  if (!motion) return;
  const [type, folded, contact] = motion,
    side = m.side,
    e = extension;
  const low = m.level === "low";
  const set = (part, i, target, w) => {
    p[part][i] = blend(p[part][i], target, w);
  };
  if (type === "foot" || type === "knee") {
    set("feet", side, folded, chamber);
    set(
      "feet",
      side,
      type === "knee" ? [contact[0] - 14, contact[1] + 27] : contact,
      e,
    );
    set("knees", side, type === "knee" ? contact : [70, low ? 91 : 61], e);
    p.feet[side][1] -= aimOffset * e;
    p.hands[1 - side] = blend(p.hands[1 - side], [65, 27], chamber);
    p.hip[0] -= chamber * 3;
    p.lean -= 6 * e;
    if (["wheelKick", "backThrust", "hookKick", "crescent"].includes(m.kind)) {
      p.shoulders[0][0] += e * 9;
      p.shoulders[1][0] -= e * 8;
      set("hands", side, [25, 44], chamber);
    }
    if (m.hop) set("feet", 1 - side, [35, 85], chamber);
    if (low) {
      p.hip[1] += chamber * 8;
      p.head[1] += chamber * 4;
    }
  } else {
    const arms = type === "both" ? [0, 1] : [side];
    for (const arm of arms) {
      set("hands", arm, [folded[0] + arm * 3, folded[1]], chamber);
      set(
        "hands",
        arm,
        [
          contact[0] + (type === "both" ? arm * 5 : 0),
          contact[1] + arm * 3 - aimOffset,
        ],
        e,
      );
      set("elbows", arm, [contact[0] - 20, contact[1] + 10], e);
    }
    if (type !== "both") set("hands", 1 - side, [61, 35], chamber);
    if (["lowPalm", "slipPalm", "legThrow"].includes(m.kind)) {
      p.hip[1] += chamber * 16;
      p.head[1] += chamber * 17;
      p.shoulders.forEach((s) => {
        s[1] += chamber * 13;
      });
    }
    if (["turnPalm", "lariat", "knifeHand"].includes(m.kind)) {
      p.shoulders[0][0] += e * 10;
      p.shoulders[1][0] -= e * 7;
      p.lean += e * 4;
    }
    if (type === "body") {
      p.lean += e * (m.kind === "headbutt" ? 17 : 21);
      p.head[1] += e * (m.kind === "shoulderLift" ? -4 : 13);
      p.shoulders.forEach((s) => {
        s[1] += e * 9;
      });
      p.hip[0] += e * 8;
      for (const arm of [0, 1])
        set("hands", arm, [57 + arm * 8, 59 + arm * 4], e);
    }
    if (m.kind === "bearThrow") {
      p.head[1] -= e * 6;
      p.hip[1] -= e * 4;
    }
  }
}
