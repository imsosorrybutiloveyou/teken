import { STAGES } from "./stages.js";
import { STYLE_MOTIONS, styleStance, styleAttack } from "./style-motion.js";
import { drawKiAura, drawEnergyShot } from "./energy-effects.js";
import {
  paintCustomSprite,
  customPortrait,
  paintCustomRig,
} from "./custom-assets.js";
import { character, moveFor } from "./characters.js";
const W = 480,
  H = 270,
  OUTLINE = "#171827";
const mix = (a, b, t) => a + (b - a) * t;
const palettes = [
  {
    cloth: "#3365af",
    shade: "#213763",
    light: "#609be0",
    pants: "#ded0a9",
    pantShade: "#9a9c96",
    skin: "#d89e76",
    skinDark: "#985e51",
    skinLight: "#f4c6a0",
    hair: "#202c44",
    hairLight: "#46546a",
    belt: "#b53d50",
    glove: "#294d78",
  },
  {
    cloth: "#b94740",
    shade: "#652f42",
    light: "#e27c52",
    pants: "#383e50",
    pantShade: "#222b3e",
    skin: "#c99268",
    skinDark: "#88594f",
    skinLight: "#edbd8b",
    hair: "#c5cbd0",
    hairLight: "#fff1ca",
    belt: "#dbb863",
    glove: "#d79a56",
  },
];
palettes.push({
  ...palettes[0],
  cloth: "#28796a",
  shade: "#1c464c",
  light: "#6dbb95",
  pants: "#34384e",
  pantShade: "#222b3d",
  hair: "#283342",
  hairLight: "#647480",
  belt: "#e3b97a",
  glove: "#658e82",
});
palettes.push({
  ...palettes[1],
  cloth: "#6e548d",
  shade: "#342e53",
  light: "#b395b9",
  pants: "#42404a",
  pantShade: "#262b3a",
  skin: "#a97859",
  skinDark: "#674e46",
  skinLight: "#d2a277",
  hair: "#382f37",
  hairLight: "#61505a",
  belt: "#d6bb86",
  glove: "#5a506f",
});
function polygon(c, points, color) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) =>
    i
      ? c.lineTo(Math.round(x), Math.round(y))
      : c.moveTo(Math.round(x), Math.round(y)),
  );
  c.closePath();
  c.fill();
}
function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function limb(c, a, b, width, base, light) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    len = Math.hypot(dx, dy) || 1,
    nx = -dy / len,
    ny = dx / len;
  const ribbon = (w, color) =>
    polygon(
      c,
      [
        [a[0] + nx * w, a[1] + ny * w],
        [b[0] + nx * w, b[1] + ny * w],
        [b[0] - nx * w, b[1] - ny * w],
        [a[0] - nx * w, a[1] - ny * w],
      ],
      color,
    );
  ribbon(width / 2 + 1.5, OUTLINE);
  ribbon(width / 2, base);
  c.strokeStyle = light;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(
    Math.round(a[0] + nx * (width / 2 - 2)),
    Math.round(a[1] + ny * (width / 2 - 2)),
  );
  c.lineTo(
    Math.round(b[0] + nx * (width / 2 - 2)),
    Math.round(b[1] + ny * (width / 2 - 2)),
  );
  c.stroke();
}
const smooth = (v) => {
  const x = Math.max(0, Math.min(1, v));
  return x * x * (3 - 2 * x);
};
// Two-bone joints keep arms and legs the same length in every pose.
function fitLimb(root, hint, end, upper, lower, fixedSide = null) {
  let dx = end[0] - root[0],
    dy = end[1] - root[1];
  if (Math.hypot(dx, dy) < 1e-6) dx = 1;
  const raw = Math.hypot(dx, dy),
    // Knees cannot fold through the thigh or choose the opposite IK solution.
    minReach =
      fixedSide === null
        ? Math.abs(upper - lower) + 0.5
        : Math.sqrt(
            upper * upper +
              lower * lower -
              2 * upper * lower * Math.cos((35 * Math.PI) / 180),
          ),
    length = Math.max(minReach, Math.min(raw, upper + lower - 0.5));
  const ux = dx / raw,
    uy = dy / raw;
  const along =
    (upper * upper - lower * lower + length * length) / (2 * length);
  const side =
    fixedSide ??
    (Math.sign(dx * (hint[1] - root[1]) - dy * (hint[0] - root[0])) || 1);
  const bend = Math.sqrt(Math.max(0, upper * upper - along * along)) * side;
  return [
    [root[0] + ux * along - uy * bend, root[1] + uy * along + ux * bend],
    [root[0] + ux * length, root[1] + uy * length],
  ];
}
// Local-space stroke paths; each move has its own silhouette, count and angle.
export function attackEffectPaths(move, phase = 1) {
  const v = move.visual,
    paths = [],
    size = v.size;
  for (let ray = 0; ray < v.rays; ray++) {
    const offset = (ray - (v.rays - 1) / 2) * 0.09;
    let points;
    switch (v.shape) {
      case "line":
        points = [
          [-0.12, offset],
          [size, offset + 0.04 * ray],
        ];
        break;
      case "chevron": {
        const x = ray * 0.19;
        points = [
          [x - 0.15, -0.19],
          [x + 0.12, 0],
          [x - 0.15, 0.19],
        ];
        break;
      }
      case "electric": {
        points = Array.from({ length: 10 }, (_, i) => {
          const t = i / 9;
          return [
            0.12 + t * 0.55 + (i % 2 ? 0.12 : -0.09) + offset,
            0.2 - t * size + Math.sin(i * 2.3 + phase * 6) * 0.06,
          ];
        });
        break;
      }
      case "bolt":
        points = [
          [-0.2, offset],
          [0.1, offset - 0.08],
          [0.22, offset + 0.09],
          [0.42, offset - 0.06],
          [size, offset],
        ];
        break;
      case "rise":
        points = [
          [-0.2 + offset, 0.2],
          [0.1 + offset, 0.04],
          [0.32 + offset, -size * 0.55],
          [0.18 + offset, -size],
        ];
        break;
      case "fall":
        points = [
          [-0.18 + offset, -size],
          [0.12 + offset, -size * 0.4],
          [0.2 + offset, 0.18],
          [0.08 + offset, 0.08],
        ];
        break;
      case "fan": {
        const angle = -0.6 + (ray / Math.max(1, v.rays - 1)) * 1.15;
        points = [
          [-0.05, 0],
          [Math.cos(angle) * size, Math.sin(angle) * size],
        ];
        break;
      }
      case "grip": {
        const side = ray === 0 ? -1 : 1;
        points = [
          [side * size * 0.45, -0.18],
          [side * size * 0.7, -0.18],
          [side * size * 0.7, 0.18],
          [side * size * 0.45, 0.18],
        ];
        break;
      }
      default:
        points = Array.from({ length: 17 }, (_, i) => {
          const t = i / 16,
            spiral = v.shape === "spiral",
            ring = v.shape === "ring";
          const angle =
            (ring ? 0 : -1.25) +
            t * (spiral ? Math.PI * 3 : ring ? Math.PI * 1.85 : 2.1) +
            phase * 0.25;
          const radius = spiral
            ? 0.1 + t * size * 0.6 + ray * 0.04
            : ring
              ? size * 0.4 + ray * 0.08
              : size + ray * 0.045;
          return [Math.cos(angle) * radius, Math.sin(angle) * radius];
        });
    }
    const c = Math.cos(v.angle),
      sn = Math.sin(v.angle);
    paths.push(points.map(([x, y]) => [0.62 + x * c - y * sn, x * sn + y * c]));
  }
  return paths;
}
export function spritePose(f, t) {
  const walk = Math.sin(f.travel * 8),
    bob = Math.round(Math.sin(t * 5) * 1.1),
    crouch = f.crouch || f.attack?.key.startsWith("crouch") ? 16 : 0;
  const pose = {
    hip: [46, 67 + crouch],
    head: [47, 23 + crouch + bob],
    shoulders: [
      [39, 41 + crouch + bob],
      [51, 42 + crouch + bob],
    ],
    elbows: [
      [48, 55 + crouch],
      [65, 55 + crouch],
    ],
    hands: [
      [59, 39 + crouch],
      [75, 41 + crouch],
    ],
    knees: [
      [31 + walk * f.move * 10, 86],
      [57 - walk * f.move * 10, 86],
    ],
    feet: [
      [21 + walk * f.move * 17, 107],
      [66 - walk * f.move * 17, 109],
    ],
    lean: 0,
  };
  styleStance(pose, character(f.character).skeleton, !!crouch);
  if (f.running) {
    // Swing bent arms about the shoulders; wrists stay in front of elbows.
    pose.lean = 6;
    for (const arm of [0, 1]) {
      const phase = arm ? -walk : walk,
        shoulder = [pose.shoulders[arm][0] + pose.lean, pose.shoulders[arm][1]],
        angle = 0.25 + phase * 0.6,
        elbow = [
          shoulder[0] + Math.sin(angle) * 18,
          shoulder[1] + Math.cos(angle) * 18,
        ];
      pose.elbows[arm] = elbow;
      pose.hands[arm] = [
        elbow[0] + Math.cos(angle) * 18,
        elbow[1] - Math.sin(angle) * 18,
      ];
    }
  }
  if (crouch) {
    pose.knees = [
      [26, 94],
      [65, 94],
    ];
    pose.feet = [
      [22, 109],
      [71, 109],
    ];
  }
  if (f.guard) {
    pose.elbows = [
      [59, 49 + crouch],
      [63, 53 + crouch],
    ];
    pose.hands = [
      [65, 25 + crouch],
      [71, 33 + crouch],
    ];
    pose.lean = -2;
  }
  if (f.stun > 0 && !f.guard) {
    pose.lean = f.hitKind === "hammer" ? 5 : -6;
    pose.head[0] -= f.hitLevel === "high" ? 8 : 4;
    if (f.hitLevel === "low") {
      pose.hip[1] += 6;
      pose.head[1] += 3;
      pose.knees = [
        [24, 91],
        [68, 87],
      ];
    }
    if (["upper", "dragon", "knee"].includes(f.hitKind)) pose.head[1] -= 4;
    pose.hands = [
      [25, 48],
      [57, 59],
    ];
  }
  if (f.y > 0.1) {
    pose.knees = [
      [26, 79],
      [65, 80],
    ];
    pose.feet = [
      [18, 94],
      [75, 95],
    ];
    pose.hands = [
      [31, 29],
      [70, 24],
    ];
    pose.lean = -9;
  }
  if (f.attack) {
    const m = moveFor(f),
      at = f.attack.t;
    const v = m.visual;
    const activeEnd = m.windup + m.active / 60;
    const recovering = at > activeEnd;
    const recovery = recovering ? (at - activeEnd) / (m.recovery / 60) : 0;
    const startup = at / m.windup;
    // Chamber first, snap through contact, then fold back before settling.
    const chamber = recovering
      ? 1 - smooth(recovery / 0.72)
      : smooth(startup / v.coil);
    const e = recovering
      ? 1 - smooth((at - activeEnd) / Math.min(0.14, m.recovery / 60))
      : smooth((startup - v.coil) / (1 - v.coil));
    const aimOffset =
      (((f.attack.height ?? m.impactHeight) - f.y - m.impactHeight) * 91) /
      2.15;
    const set = (part, index, target, weight = e) => {
      pose[part][index] = pose[part][index].map((v, i) =>
        mix(v, target[i], weight),
      );
    };
    const contact = (part, index) => {
      pose[part][index][1] -= aimOffset * e;
    };
    const punch = [
      "leftPunch",
      "rightPunch",
      "powerPunch",
      "palm",
      "leftHook",
      "rightHook",
      "bodyBlow",
      "elbow",
      "rushPalm",
    ].includes(m.kind);
    if (punch) {
      const arm = m.side;
      const hook = m.kind.endsWith("Hook"),
        elbow = m.kind === "elbow",
        body = m.kind === "bodyBlow" || m.level === "low";
      set("hands", arm, [49, body ? 60 : 43], chamber * (1 - e));
      set("elbows", arm, [39, 58], chamber * (1 - e));
      set("hands", 1 - arm, [67, 31], chamber);
      set("elbows", 1 - arm, [57, 47], chamber);
      set(
        "elbows",
        arm,
        elbow ? [80, 43] : hook ? [76, 34] : [72, body ? 59 : 45],
      );
      set(
        "hands",
        arm,
        elbow
          ? [67, 33]
          : hook
            ? [84, 39]
            : [91, body ? 65 : m.level === "high" ? 33 : 46],
      );
      contact("hands", arm);
      contact("elbows", arm);
      pose.shoulders[arm][0] += e * (arm === 0 ? 8 : 3);
      pose.shoulders[1 - arm][0] -= e * 2;
      pose.hip[0] += 2 * e;
      pose.lean =
        -2 * chamber * (1 - e) + e * (m.kind === "powerPunch" ? 9 : 5);
      if (body) {
        pose.hip[1] += chamber * 5;
        pose.head[1] += chamber * 4;
      }
    }
    if (["upper", "dragon"].includes(m.kind)) {
      const arm = m.side;
      set("hands", arm, [53, 64], chamber * (1 - e));
      set("elbows", arm, [46, 57], chamber * (1 - e));
      set("elbows", arm, [67, 36]);
      set("hands", arm, [70, 26]);
      set("hands", 1 - arm, [68, 31], chamber);
      pose.hip[1] += chamber * (1 - e) * 7 - e * 2;
      pose.head[1] += chamber * (1 - e) * 5 - e * 3;
      pose.lean = e * 5;
    }
    const kicks = [
      "leftKick",
      "rightKick",
      "spin",
      "low",
      "sweep",
      "backKick",
      "toeKick",
      "sideKick",
      "axeKick",
      "hellSweep",
      "runningKick",
    ];
    if (kicks.includes(m.kind)) {
      const leg = m.side;
      const low = ["low", "sweep", "toeKick", "hellSweep"].includes(m.kind);
      const side = ["sideKick", "backKick"].includes(m.kind);
      // One foot bears the weight; the striking knee folds and the heel retracts.
      pose.hip[0] -= chamber * 3;
      set("knees", leg, [65, low ? 79 : 61], chamber);
      set("feet", leg, [51, low ? 100 : 84], chamber);
      set("hands", 1, [67, 30], chamber);
      set("hands", 0, [49, 36], chamber);
      if (m.kind === "axeKick") {
        set("knees", leg, [65, 44], chamber * (1 - e));
        set("feet", leg, [66, 23], chamber * (1 - e));
      }
      set("knees", leg, [75, low ? 87 : side ? 69 : 60]);
      set("feet", leg, [
        m.kind === "toeKick" ? 88 : 95,
        low ? 99 : side ? 66 : m.kind === "axeKick" ? 59 : 49,
      ]);
      pose.lean = -chamber * 3 - e * (side ? 5 : 3);
      if (low) pose.hip[1] += e * 4;
      if (m.kind === "hellSweep") {
        pose.hip[1] += chamber * 15;
        pose.head[1] += chamber * 12;
        set("feet", leg, [94, 107]);
        set("knees", leg, [74, 95]);
        set("hands", 1 - leg, [62, 52], chamber);
      }
      if (m.kind === "runningKick") {
        set("knees", 1 - leg, [55, 80], chamber);
        set("feet", 1 - leg, [34, 91], chamber);
        pose.hip[0] += 3 * e;
      }
      contact("feet", leg);
      contact("knees", leg);
      if (m.kind === "spin") {
        set("hands", 0, [28, 41], chamber);
        pose.hip[0] += e * 2;
      }
    }
    if (m.kind === "knee") {
      const leg = m.side;
      set("knees", leg, [67, 63], chamber);
      set("feet", leg, [48, 86], chamber);
      set("knees", leg, [79, 49]);
      set("feet", leg, [65, 75]);
      set("hands", 0, [66, 30], chamber);
      set("hands", 1, [74, 36], chamber);
      contact("knees", leg);
      contact("feet", leg);
      pose.lean = e * 3;
      pose.hip[0] += e * 3;
    }
    if (m.kind === "hammer") {
      for (const arm of [0, 1]) {
        set("hands", arm, [65 + arm * 5, 16], chamber * (1 - e));
        set("elbows", arm, [55 + arm * 9, 30], chamber * (1 - e));
        set("hands", arm, [83 + arm * 3, 62]);
        set("elbows", arm, [68, 45]);
        contact("hands", arm);
        contact("elbows", arm);
      }
      pose.lean = 8 * e;
      pose.hip[1] += 4 * e;
    }
    if (m.kind === "throw") {
      for (const arm of [0, 1]) {
        set("hands", arm, [86, 42 + arm * 10]);
        set("elbows", arm, [67, 45 + arm * 8]);
        if (recovering)
          set(
            "hands",
            arm,
            [56, 42 + arm * 7],
            Math.sin(Math.PI * smooth(recovery)),
          );
      }
      pose.lean = e * 5;
      pose.hip[0] += e * 2;
    }
    styleAttack(pose, m, chamber, e, aimOffset);
    // Authored overlays separate moves that share the same striking limb.
    const weight = m.motionWeight,
      swing = Math.sin(Math.PI * Math.min(1, startup));
    pose.hip[0] += v.step * chamber * weight;
    pose.lean += v.lean * e * weight - v.lean * 0.35 * chamber * (1 - e);
    pose.head[1] += Math.abs(v.lean) * 0.25 * chamber * (1 - e);
    const strikingLeg =
      ["foot", "knee"].includes(STYLE_MOTIONS[m.kind]?.[0]) ||
      [
        "leftKick",
        "rightKick",
        "spin",
        "low",
        "sweep",
        "backKick",
        "toeKick",
        "sideKick",
        "axeKick",
        "knee",
        "hellSweep",
        "runningKick",
      ].includes(m.kind);
    const tip = strikingLeg ? "feet" : "hands",
      joint = strikingLeg ? "knees" : "elbows";
    pose[tip][m.side][0] += v.reach * e * weight;
    pose[tip][m.side][1] += v.arc * swing * chamber * weight;
    pose[joint][m.side][1] += v.arc * swing * 0.4;
    if (["qcfKick", "finish"].includes(f.attack.key)) {
      pose.shoulders[0][0] += 5 * e;
      pose.shoulders[1][0] -= 5 * e;
      pose.hands[1 - m.side][0] -= 9 * chamber;
    }
    if (f.attack.key === "dashPunch") pose.feet[m.side][0] += 7 * chamber;
    if (f.attack.key === "palm") pose.hands[1 - m.side][1] -= 5 * chamber;
  }
  if (f.downTime > 0) {
    const prone =
      smooth((0.13 - f.hitFlash) / 0.12) * smooth(f.downTime / 0.14);
    pose.lean *= 1 - prone;
    for (const i of [0, 1]) {
      pose.feet[i][0] = mix(pose.feet[i][0], 43 + i * 12, prone);
      pose.hands[i][0] = mix(pose.hands[i][0], 48 + i * 14, prone);
    }
  }
  const anatomy = character(f.character).anatomy ?? {
    upperArm: 19,
    forearm: 20,
    thigh: 24,
    shin: 25,
  };
  if (f.character === "boru") {
    pose.hip[1] += 12;
    pose.shoulders[0][0] -= 3;
    pose.shoulders[1][0] += 3;
    for (const hand of pose.hands) hand[0] += 10;
  }
  for (const i of [0, 1]) {
    const shoulder = [pose.shoulders[i][0] + pose.lean, pose.shoulders[i][1]];
    [pose.elbows[i], pose.hands[i]] = fitLimb(
      shoulder,
      pose.elbows[i],
      pose.hands[i],
      anatomy.upperArm,
      anatomy.forearm,
    );
    [pose.knees[i], pose.feet[i]] = fitLimb(
      [pose.hip[0] + (i ? 5 : -5), pose.hip[1]],
      pose.knees[i],
      pose.feet[i],
      anatomy.thigh,
      anatomy.shin,
      -1,
    );
  }
  return pose;
}
function paintSprite(c, f, index, t) {
  const lowPose = f.crouch || f.attack?.key.startsWith("crouch");
  const profile = character(f.character),
    p = {
      ...palettes[
        { kai: 0, ren: 1, mira: 2, goro: 3, raon: 2 }[profile.skeleton]
      ],
      ...(profile.id === "hana"
        ? { cloth: "#e3e7e5", pants: "#d8e0df", belt: "#242a34" }
        : profile.id === "raon"
          ? {
              cloth: "#284c60",
              pants: "#dad2b0",
              belt: "#a9535d",
              glove: "#dfad66",
              hair: "#522e46",
            }
          : profile.id === "boru"
            ? {
                cloth: "#795337",
                pants: "#795337",
                skin: "#9f724c",
                hair: "#5d402d",
                glove: "#68482e",
              }
            : profile.id === "atlas"
              ? {
                  cloth: "#738d98",
                  pants: "#596f7c",
                  skin: "#a3b2b8",
                  glove: "#607481",
                  hair: "#445566",
                }
              : {}),
    },
    pose = spritePose(f, t);
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  if (paintCustomSprite(c, f)) return;
  c.save();
  c.translate(64, 6);
  c.scale(profile.build, profile.id === "mira" ? 0.98 : 1);
  c.translate(-48, 0);
  if (f.throwTime > 0 && f.throwRole === -1) {
    const swing = Math.sin((1 - f.throwTime / 0.42) * Math.PI);
    c.translate(55, 75);
    c.rotate(-swing * 1.5);
    c.translate(-55, -75 - swing * 12);
  }
  if (
    f.attack?.key.startsWith("wake") ||
    (f.lastMove === "backRise" && f.lastMoveAge < 0.2)
  ) {
    const rise = f.attack
      ? f.attack.t / (moveFor(f).windup * 0.7)
      : f.lastMoveAge / 0.2;
    c.translate(68, 82);
    c.rotate((-Math.PI / 2) * (1 - smooth(rise)));
    c.translate(-68, -82);
  }
  if (f.downTime > 0) {
    const prone =
      smooth((0.13 - f.hitFlash) / 0.12) * smooth(f.downTime / 0.14);
    c.translate(68, 82);
    c.rotate((-Math.PI / 2) * prone);
    c.translate(-68, -82);
  }
  if (paintCustomRig(c, f, pose)) {
    c.restore();
    return;
  }
  const hip = pose.hip,
    head = [pose.head[0] + pose.lean, pose.head[1]],
    shoulders = pose.shoulders.map((a) => [a[0] + pose.lean, a[1]]);
  const pants = (i) => {
    const h = [hip[0] + (i ? 5 : -5), hip[1]],
      k = pose.knees[i],
      foot = pose.feet[i];
    limb(
      c,
      h,
      k,
      f.character === "goro" ? 15 : 12,
      f.character === "ren" ? p.skin : p.pants,
      p.pantShade,
    );
    limb(
      c,
      k,
      foot,
      f.character === "goro" ? 13 : 10,
      f.character === "ren" ? p.skin : p.pants,
      p.pantShade,
    );
    if (f.character === "ren") {
      limb(
        c,
        h,
        [h[0] * 0.65 + k[0] * 0.35, h[1] * 0.65 + k[1] * 0.35],
        14,
        p.cloth,
        p.light,
      );
      limb(
        c,
        [k[0] * 0.45 + foot[0] * 0.55, k[1] * 0.45 + foot[1] * 0.55],
        foot,
        11,
        p.glove,
        p.belt,
      );
    }
    polygon(
      c,
      [
        [foot[0] - 7, foot[1] - 6],
        [foot[0] + 4, foot[1] - 5],
        [foot[0] + 11, foot[1] + 1],
        [foot[0] + 11, foot[1] + 5],
        [foot[0] - 7, foot[1] + 5],
      ],
      OUTLINE,
    );
    rect(c, foot[0] - 5, foot[1] - 3, 9, 5, p.glove);
    rect(c, foot[0] - 5, foot[1] + 2, 15, 2, p.belt);
  };
  const arm = (i) => {
    limb(
      c,
      shoulders[i],
      pose.elbows[i],
      f.character === "boru" ? 15 : 9,
      i ? p.skin : p.skinDark,
      p.skinLight,
    );
    limb(
      c,
      pose.elbows[i],
      pose.hands[i],
      f.character === "boru" ? 13 : 8,
      p.skin,
      p.skinLight,
    );
    const hand = pose.hands[i];
    c.save();
    if (f.running) {
      c.translate(hand[0], hand[1]);
      c.rotate(
        Math.atan2(hand[1] - pose.elbows[i][1], hand[0] - pose.elbows[i][0]),
      );
      c.translate(-hand[0], -hand[1]);
    }
    rect(c, hand[0] - 5, hand[1] - 5, 11, 11, OUTLINE);
    rect(c, hand[0] - 4, hand[1] - 4, 9, 8, p.glove);
    rect(c, hand[0] - 4, hand[1] - 3, 7, 2, p.light);
    rect(c, hand[0] - 5, hand[1] + 3, 9, 3, p.belt);
    c.restore();
  };
  pants(0);
  arm(0);
  const lx = pose.lean;
  polygon(
    c,
    [
      [37 + lx, 35 + (lowPose ? 16 : 0)],
      [52 + lx, 36 + (lowPose ? 16 : 0)],
      [59 + lx, 49 + (lowPose ? 16 : 0)],
      [hip[0] + 10, hip[1]],
      [hip[0] - 12, hip[1] + 2],
      [32 + lx, 50 + (lowPose ? 16 : 0)],
    ],
    OUTLINE,
  );
  polygon(
    c,
    [
      [38 + lx, 37 + (lowPose ? 16 : 0)],
      [51 + lx, 38 + (lowPose ? 16 : 0)],
      [56 + lx, 49 + (lowPose ? 16 : 0)],
      [hip[0] + 7, hip[1] - 2],
      [hip[0] - 10, hip[1]],
      [35 + lx, 48 + (lowPose ? 16 : 0)],
    ],
    p.cloth,
  );
  polygon(
    c,
    [
      [38 + lx, 39 + (lowPose ? 16 : 0)],
      [43 + lx, 40 + (lowPose ? 16 : 0)],
      [hip[0] - 4, hip[1] - 3],
      [hip[0] - 10, hip[1]],
    ],
    p.shade,
  );
  polygon(
    c,
    [
      [46 + lx, 37 + (lowPose ? 16 : 0)],
      [51 + lx, 38 + (lowPose ? 16 : 0)],
      [49 + lx, 53 + (lowPose ? 16 : 0)],
      [43 + lx, 49 + (lowPose ? 16 : 0)],
    ],
    p.skin,
  );
  rect(c, hip[0] - 12, hip[1] - 2, 22, 5, OUTLINE);
  rect(c, hip[0] - 11, hip[1] - 1, 20, 3, p.belt);
  polygon(
    c,
    [
      [hip[0] + 1, hip[1] + 2],
      [hip[0] + 6, hip[1] + 2],
      [hip[0] + 10, hip[1] + 17],
      [hip[0] + 5, hip[1] + 19],
    ],
    p.belt,
  );
  if (f.character === "goro") {
    polygon(
      c,
      [
        [34 + lx, 43],
        [57 + lx, 43],
        [hip[0] + 9, hip[1] - 2],
        [hip[0] - 11, hip[1]],
      ],
      p.skin,
    );
    polygon(
      c,
      [
        [35 + lx, 43],
        [39 + lx, 43],
        [hip[0] - 3, hip[1]],
        [hip[0] - 10, hip[1]],
      ],
      p.cloth,
    );
    polygon(
      c,
      [
        [53 + lx, 43],
        [57 + lx, 43],
        [hip[0] + 9, hip[1]],
        [hip[0] + 4, hip[1]],
      ],
      p.cloth,
    );
  }
  if (f.character === "mira") {
    polygon(
      c,
      [
        [hip[0] - 11, hip[1] - 2],
        [hip[0] + 9, hip[1] - 2],
        [hip[0] + 16, hip[1] + 21],
        [hip[0] + 2, hip[1] + 14],
        [hip[0] - 16, hip[1] + 20],
      ],
      p.cloth,
    );
    for (let n = 0; n < 3; n++)
      rect(c, 43 + lx, 45 + n * 6 + (lowPose ? 16 : 0), 8, 2, p.belt);
  }
  if (profile.id === "raon") {
    polygon(
      c,
      [
        [hip[0] - 12, hip[1] - 4],
        [hip[0] + 10, hip[1] - 4],
        [hip[0] + 17, hip[1] + 20],
        [hip[0] + 3, hip[1] + 12],
        [hip[0] - 14, hip[1] + 22],
      ],
      p.cloth,
    );
    rect(c, hip[0] - 12, hip[1] - 5, 24, 4, p.belt);
  }
  pants(1);
  rect(c, head[0] - 3, head[1] + 8, 9, 9, p.skinDark);
  c.save();
  c.translate(head[0], head[1]);
  c.scale(0.78, 0.8);
  c.translate(-head[0], -head[1]);
  polygon(
    c,
    [
      [head[0] - 9, head[1] - 8],
      [head[0] + 7, head[1] - 9],
      [head[0] + 11, head[1]],
      [head[0] + 15, head[1] + 3],
      [head[0] + 10, head[1] + 5],
      [head[0] + 7, head[1] + 12],
      [head[0] - 3, head[1] + 11],
      [head[0] - 10, head[1] + 2],
    ],
    OUTLINE,
  );
  polygon(
    c,
    [
      [head[0] - 7, head[1] - 7],
      [head[0] + 6, head[1] - 7],
      [head[0] + 8, head[1] + 1],
      [head[0] + 12, head[1] + 3],
      [head[0] + 8, head[1] + 5],
      [head[0] + 5, head[1] + 10],
      [head[0] - 2, head[1] + 9],
      [head[0] - 8, head[1] + 1],
    ],
    p.skin,
  );
  rect(c, head[0] + 1, head[1] - 5, 5, 7, p.skinLight);
  rect(c, head[0] + 5, head[1], 5, 2, OUTLINE);
  rect(c, head[0] + 7, head[1], 2, 1, "#fff1c5");
  rect(c, head[0] + 5, head[1] + 7, 4, 1, p.skinDark);
  if (profile.id === "raon") {
    polygon(
      c,
      [
        [head[0] - 10, head[1] - 3],
        [head[0] - 8, head[1] - 12],
        [head[0] + 5, head[1] - 13],
        [head[0] + 9, head[1] - 4],
      ],
      p.hair,
    );
    c.fillStyle = p.hair;
    c.beginPath();
    c.arc(head[0] - 10, head[1] - 12, 5, 0, Math.PI * 2);
    c.fill();
    rect(c, head[0] - 10, head[1] - 5, 19, 3, p.belt);
    polygon(
      c,
      [
        [head[0] - 9, head[1] - 3],
        [head[0] - 21, head[1] + 4],
        [head[0] - 18, head[1] + 10],
        [head[0] - 7, head[1]],
      ],
      p.belt,
    );
  } else {
    polygon(
      c,
      [
        [head[0] - 10, head[1] - 1],
        [head[0] - 12, head[1] - 12],
        [head[0] - 6, head[1] - 10],
        [head[0] - 3, head[1] - 18],
        [head[0] + 1, head[1] - 11],
        [head[0] + 7, head[1] - 16],
        [head[0] + 9, head[1] - 7],
        [head[0] + 5, head[1] - 3],
        [head[0] - 5, head[1] - 5],
        [head[0] - 5, head[1] + 2],
      ],
      p.hair,
    );
    polygon(
      c,
      [
        [head[0] - 7, head[1] - 10],
        [head[0] - 3, head[1] - 14],
        [head[0] - 2, head[1] - 8],
        [head[0] + 6, head[1] - 12],
        [head[0] + 3, head[1] - 6],
      ],
      p.hairLight,
    );
  }
  if (f.character === "mira") {
    polygon(
      c,
      [
        [head[0] - 7, head[1] - 10],
        [head[0] - 17, head[1] - 8],
        [head[0] - 24, head[1] + 18],
        [head[0] - 16, head[1] + 14],
        [head[0] - 11, head[1] - 2],
      ],
      p.hair,
    );
    rect(c, head[0] - 13, head[1] - 7, 5, 4, p.belt);
  }
  if (f.character === "goro") {
    rect(c, head[0] - 9, head[1] - 16, 20, 13, p.skinDark);
    rect(c, head[0] - 5, head[1] - 17, 12, 11, p.skin);
    polygon(
      c,
      [
        [head[0] - 7, head[1] + 5],
        [head[0] + 10, head[1] + 6],
        [head[0] + 5, head[1] + 15],
        [head[0] - 5, head[1] + 12],
      ],
      p.hair,
    );
  }
  c.restore();
  arm(1);
  if (profile.id === "shin") {
    const h = pose.hands[0],
      e = pose.elbows[0],
      dx = h[0] - e[0],
      dy = h[1] - e[1],
      len = Math.hypot(dx, dy) || 1;
    const tip = [h[0] + (dx / len) * 42, h[1] + (dy / len) * 42];
    limb(c, h, tip, 3, "#d7eceb", "#ffffff");
    rect(c, h[0] - 5, h[1] - 2, 10, 4, "#cfb65e");
  }
  if (profile.id === "boru") {
    rect(c, head[0] - 14, head[1] - 15, 9, 10, "#63442f");
    rect(c, head[0] + 6, head[1] - 15, 9, 10, "#63442f");
    rect(c, head[0] - 9, head[1] - 10, 23, 23, "#9b704a");
    rect(c, head[0] + 4, head[1] + 1, 15, 11, "#c4a177");
    rect(c, head[0] + 13, head[1] + 2, 5, 4, "#20232b");
    rect(c, head[0] + 7, head[1] - 4, 3, 3, "#151925");
    for (const hand of pose.hands)
      for (let n = 0; n < 3; n++)
        rect(c, hand[0] + 3 + n * 2, hand[1] - 3 + n * 3, 7, 2, "#edddbd");
  }
  if (profile.id === "atlas") {
    rect(c, head[0] - 12, head[1] - 13, 26, 29, "#536f7e");
    rect(c, head[0] - 8, head[1] - 9, 19, 19, "#aabac1");
    rect(c, head[0] + 1, head[1] - 2, 13, 4, "#ffb94e");
    rect(c, hip[0] - 9, hip[1] - 24, 17, 14, "#304d60");
    rect(c, hip[0] - 4, hip[1] - 20, 8, 4, "#a5eef1");
  }
  if (f.hitFlash > 0) {
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = "#fff3c9";
    c.globalAlpha = 0.65;
    c.fillRect(0, 0, 120, 122);
  }
  c.restore();
}
export function createScene(canvas) {
  const c = canvas.getContext("2d", { alpha: false });
  if (!c) throw new Error("Canvas 2D is unavailable");
  canvas.width = W;
  canvas.height = H;
  const sprites = [0, 1].map(() => {
    const image = document.createElement("canvas");
    image.width = 160;
    image.height = 128;
    return { image, context: image.getContext("2d") };
  });
  const floor = c.createImageData(W, H),
    pixels = new Uint32Array(floor.data.buffer);
  const effects = [];
  let centerX = 0,
    centerZ = 0,
    wide = false,
    last = performance.now(),
    clock = 0,
    shake = 0;
  let cameraDistance = 13,
    axisAngle = 0,
    impactFlash = 0;
  const rgba = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  function project(x, y, z) {
    const dx = x - centerX,
      dz = z - centerZ,
      co = Math.cos(axisAngle),
      si = Math.sin(axisAngle),
      u = dx * co + dz * si,
      v = -dx * si + dz * co;
    const scale = 600 / Math.max(1, cameraDistance - v);
    return { x: W / 2 + u * scale, y: 91 + 2.6 * scale - y * scale, scale };
  }
  let stage = STAGES.terminal;
  function background() {
    c.fillStyle = "#282e4d";
    c.fillRect(0, 0, W, H);
    const sky = stage.sky;
    sky.forEach((color, i) => rect(c, 0, i * 15, W, 16, color));
    c.fillStyle = "#f1c68e";
    c.beginPath();
    c.arc(
      352 - ((((centerX * 0.2 + axisAngle * 30) % 30) + 30) % 30),
      58,
      28,
      0,
      Math.PI * 2,
    );
    c.fill();
    for (let i = 0; i < 5; i++)
      rect(c, 310, 64 + i * 6, 80, 2, sky[Math.min(6, 4 + Math.floor(i / 2))]);
    polygon(
      c,
      [
        [0, 85],
        [28, 64],
        [52, 80],
        [88, 48],
        [119, 79],
        [165, 59],
        [200, 80],
        [246, 47],
        [296, 76],
        [338, 68],
        [390, 78],
        [432, 54],
        [480, 83],
        [480, 112],
        [0, 112],
      ],
      "#5b5868",
    );
    polygon(
      c,
      [
        [0, 96],
        [45, 77],
        [85, 91],
        [129, 71],
        [174, 95],
        [211, 77],
        [258, 97],
        [311, 74],
        [365, 89],
        [410, 70],
        [480, 95],
        [480, 115],
        [0, 115],
      ],
      "#424859",
    );
    for (let i = -1; i < 13; i++) {
      const parallax = (((centerX * 2 + axisAngle * 70) % 46) + 46) % 46,
        x = i * 46 - parallax,
        h = 15 + (((i + 12) * 17) % 25);
      rect(c, x, 96 - h, 25, h, "#373f50");
      rect(c, x - 3, 94 - h, 31, 3, "#3b4254");
      rect(c, x + 4, 100 - h, 3, 3, "#c39b87");
      if (i % 3 === 0) {
        rect(c, x + 9, 80 - h, 4, 15, "#373f50");
        polygon(
          c,
          [
            [x - 3, 82 - h],
            [x + 12, 76 - h],
            [x + 28, 82 - h],
          ],
          "#373f50",
        );
      }
    }
    if (stage.id === "forest")
      for (let i = 0; i < 12; i++) {
        const x = i * 47 - 20;
        rect(c, x + 14, 55, 7, 48, "#263f30");
        polygon(
          c,
          [
            [x - 4, 83],
            [x + 18, 31],
            [x + 43, 83],
          ],
          "#274f3a",
        );
        polygon(
          c,
          [
            [x, 65],
            [x + 18, 17],
            [x + 38, 65],
          ],
          "#356248",
        );
      }
    if (stage.id === "dojo") {
      rect(c, 34, 42, 412, 64, "#3b2844");
      for (let x = 42; x < 440; x += 49) {
        rect(c, x, 49, 39, 41, "#d8b4a1");
        for (let n = 0; n < 4; n++) rect(c, x + n * 10, 49, 2, 41, "#634259");
        rect(c, x, 69, 39, 2, "#634259");
      }
      polygon(
        c,
        [
          [10, 43],
          [70, 18],
          [410, 18],
          [470, 43],
        ],
        "#27263b",
      );
    }
    if (stage.id === "foundry")
      for (let i = 0; i < 7; i++) {
        rect(c, i * 76, 23, 18, 85, "#312c34");
        rect(c, i * 76 + 2, 45, 14, 3, "#f7b062");
        polygon(
          c,
          [
            [i * 76 + 30, 105],
            [i * 76 + 40, 72],
            [i * 76 + 50, 105],
          ],
          "#ee7646",
        );
      }
    rect(c, 0, 99, W, 6, "#74787c");
    rect(c, 0, 105, W, 3, "#b8ab95");
  }
  function ground() {
    const start = 108,
      co = Math.cos(axisAngle),
      si = Math.sin(axisAngle);
    for (let y = start; y < H; y++) {
      const depth = (600 * 2.6) / (y - 91),
        v = cameraDistance - depth,
        step = depth / 600,
        fade = Math.min(1, (y - start) / 150);
      for (let x = 0; x < W; x++) {
        const u = (x - W / 2) * step,
          wx = centerX + u * co - v * si,
          wz = centerZ + u * si + v * co;
        const tx = Math.floor(wx / 2),
          tz = Math.floor(wz / 2),
          fx = wx / 2 - tx,
          fz = wz / 2 - tz;
        const tile = (tx + tz) & 1,
          grid = Math.min(fx, 1 - fx, fz, 1 - fz) < step * 0.22;
        const stripe = ((tx % 8) + 8) % 8 === 0 && ((tz % 8) + 8) % 8 === 0,
          detail = ((tx * 17 + tz * 13) & 15) === 0;
        let r = stage.floor[0] + (tile ? 8 : 0) + fade * 24,
          g = stage.floor[1] + (tile ? 8 : 0) + fade * 22,
          b = stage.floor[2] + (tile ? 4 : 0) + fade * 8;
        if (grid) {
          r -= 20;
          g -= 20;
          b -= 16;
        } else if (stripe && fx > 0.45 && fx < 0.55) {
          r += 35;
          g += 27;
          b += 5;
        } else if (detail && fz > 0.75 && fz < 0.8 && fx > 0.2 && fx < 0.8) {
          r -= 15;
          g -= 12;
          b -= 9;
        }
        pixels[y * W + x] = rgba(r, g, b);
      }
    }
    c.putImageData(floor, 0, 0, 0, start, W, H - start);
  }
  return {
    render(match) {
      const now = performance.now(),
        dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const [a, b] = match.fighters,
        tx = (a.x + b.x) / 2,
        tz = (a.z + b.z) / 2;
      centerX = tx;
      centerZ = tz;
      axisAngle = match.viewAngle;
      const separation = Math.hypot(a.x - b.x, a.z - b.z);
      cameraDistance = mix(
        cameraDistance,
        Math.max(wide ? 15.5 : 12.4, separation * 1.5 + 7),
        dt * 4,
      );
      stage = STAGES[match.stage] ?? STAGES.terminal;
      background();
      ground();
      if (stage.wall) {
        const corners = stage.arena;
        for (let i = 0; i < corners.length; i++) {
          const a = corners[i],
            b = corners[(i + 1) % corners.length],
            pa = project(a[0], 0, a[1]),
            pb = project(b[0], 0, b[1]),
            ta = project(a[0], 1.7, a[1]),
            tb = project(b[0], 1.7, b[1]);
          polygon(
            c,
            [
              [pa.x, pa.y],
              [pb.x, pb.y],
              [tb.x, tb.y],
              [ta.x, ta.y],
            ],
            stage.id === "dojo" ? "#443855b8" : "#4e4141b8",
          );
          const trim = stage.id === "dojo" ? "#b9eeff" : "#ffcd72";
          for (const height of [0, 0.85, 1.7]) {
            const p = project(a[0], height, a[1]),
              q = project(b[0], height, b[1]);
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.lineTo(q.x, q.y);
            c.strokeStyle = "#171823";
            c.lineWidth = 5;
            c.stroke();
            c.strokeStyle = trim;
            c.lineWidth = height === 0 ? 3 : 2;
            c.stroke();
          }
          const posts = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.6);
          for (let n = 0; n <= posts; n++) {
            const x = mix(a[0], b[0], n / posts),
              z = mix(a[1], b[1], n / posts),
              p = project(x, 0, z),
              q = project(x, n === 0 ? 1.95 : 1.7, z);
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.lineTo(q.x, q.y);
            c.strokeStyle = "#171823";
            c.lineWidth = n === 0 ? 7 : 3;
            c.stroke();
            c.strokeStyle = trim;
            c.lineWidth = n === 0 ? 3 : 1;
            c.stroke();
          }
        }
      }
      c.imageSmoothingEnabled = false;
      match.fighters.forEach((f) => {
        const p = project(f.x, 0, f.z);
        c.fillStyle = "#252c3a88";
        c.beginPath();
        c.ellipse(
          Math.round(p.x),
          Math.round(p.y) + 2,
          p.scale * 0.45,
          p.scale * 0.11,
          0,
          0,
          Math.PI * 2,
        );
        c.fill();
        c.fillStyle = f === a ? "#7dc8ca" : "#e8aa7d";
        c.fillRect(Math.round(p.x) - 4, Math.round(p.y) + 5, 8, 1);
      });
      const order = [0, 1].sort(
        (i, j) =>
          project(match.fighters[i].x, 0, match.fighters[i].z).y -
          project(match.fighters[j].x, 0, match.fighters[j].z).y,
      );
      c.save();
      if (shake > 0) {
        c.translate(
          (Math.random() - 0.5) * (shake > 0.12 ? 7 : 4),
          (Math.random() - 0.5) * 3,
        );
        shake -= dt;
      }
      for (const i of order) {
        const f = match.fighters[i],
          p = project(f.x, f.y, f.z),
          s = (p.scale * 2.15) / 91;
        paintSprite(sprites[i].context, f, i, clock);
        c.save();
        c.translate(Math.round(p.x), Math.round(p.y));
        c.scale(Math.cos(f.angle - match.viewAngle) >= 0 ? 1 : -1, 1);
        c.drawImage(
          sprites[i].image,
          Math.round(-64 * s),
          Math.round(-115 * s),
          Math.round(160 * s),
          Math.round(128 * s),
        );
        c.restore();
        if (f.dash > 0 && f.move > 0) {
          c.fillStyle = "#cfdfbe55";
          for (let n = 0; n < 3; n++)
            c.fillRect(
              Math.round(p.x - f.facing * (22 + n * 8)),
              Math.round(p.y - 15 - n * 8),
              9 + n * 3,
              1,
            );
        }
        if (f.attack) {
          const m = moveFor(f),
            delta = f.attack.t - m.windup,
            progress = f.attack.t / m.windup;
          if (m.kiCost)
            drawKiAura(c, p, f.facing, clock, f.attack.t / m.duration);
          if (m.projectile && delta < 0) {
            const charge = project(
              f.x + Math.cos(f.attack.angle) * 0.65,
              f.y + m.impactHeight,
              f.z + Math.sin(f.attack.angle) * 0.65,
            );
            c.save();
            c.globalAlpha = Math.min(0.85, progress);
            drawEnergyShot(
              c,
              { ...charge, scale: charge.scale * (0.25 + progress * 0.45) },
              0,
              clock,
              !!m.kiCost,
            );
            c.restore();
          }
          const charged = m.onBlock <= -15;
          if (progress >= (charged ? 0.4 : 0.65) && delta < 6 / 60) {
            const height = (f.attack.height ?? m.impactHeight) - f.y;
            c.save();
            c.translate(p.x, p.y - p.scale * height);
            c.scale(f.facing * p.scale, p.scale);
            c.globalAlpha =
              delta < 0
                ? charged
                  ? 0.28
                  : 0.18
                : Math.max(0, 0.9 - delta * 8);
            c.strokeStyle = m.color;
            c.lineWidth = charged ? 0.052 : 0.032;
            c.lineCap = "round";
            for (const path of attackEffectPaths(m, progress)) {
              c.beginPath();
              path.forEach(([x, y], n) =>
                n ? c.lineTo(x, y) : c.moveTo(x, y),
              );
              c.stroke();
            }
            if (delta >= 0 && delta < 2 / 60) {
              c.globalAlpha = 0.7;
              c.strokeStyle = "#fff2ce";
              c.lineWidth = 0.015;
              for (const path of attackEffectPaths(m, progress)) {
                c.beginPath();
                path.forEach(([x, y], n) =>
                  n ? c.lineTo(x, y) : c.moveTo(x, y),
                );
                c.stroke();
              }
            }
            c.restore();
          }
        }
      }
      for (const shot of match.projectiles) {
        const p = project(shot.x, shot.y, shot.z);
        drawEnergyShot(
          c,
          p,
          Math.cos(shot.angle - match.viewAngle) >= 0 ? 0 : Math.PI,
          clock,
          shot.key === "exWave",
        );
      }
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.age += dt;
        if (
          e.age > (e.wallSplat || e.punish || e.type === "block" ? 0.65 : 0.3)
        ) {
          effects.splice(i, 1);
          continue;
        }
        const p = project(e.x, e.y, e.z),
          expand = e.age * (e.heavy ? 130 : 90);
        const impactMove =
          e.character && e.key
            ? moveFor({ character: e.character }, e.key)
            : null;
        const kiImpact = !!impactMove?.kiCost;
        if (kiImpact && e.age < 0.3)
          drawKiAura(c, { ...p, y: p.y + p.scale }, 1, clock, 0.3 + e.age * 2);
        if (
          e.wallSplat ||
          e.punish ||
          e.armor ||
          e.counter ||
          e.throw ||
          e.type === "block"
        ) {
          c.font = "bold 8px monospace";
          c.textAlign = "center";
          c.fillStyle = e.punish
            ? "#ffda70"
            : e.launcherWindow
              ? "#ffac8f"
              : "#b5e5ed";
          c.fillText(
            e.wallSplat
              ? "WALL SPLAT"
              : e.counter
                ? "COUNTER"
                : e.throw
                  ? "THROW"
                  : e.armor
                    ? "ARMOR"
                    : e.punish
                      ? "PUNISH"
                      : `GUARD ${e.advantage >= 0 ? "+" : ""}${e.advantage}F${e.launcherWindow ? " / UPPER" : ""}`,
            p.x,
            p.y - 18 - e.age * 25,
          );
        }
        if (e.age > 0.3) continue;
        c.strokeStyle =
          e.type === "block" ? "#c4ecf2" : kiImpact ? "#69caff" : "#ffe2a0";
        c.lineWidth = e.age < 0.1 ? (e.heavy ? 4 : 3) : 1;
        if (e.type === "hit") {
          c.strokeStyle = kiImpact
            ? "#57baff"
            : impactMove?.projectile
              ? "#6dffe5"
              : e.heavy
                ? "#ffc26b"
                : "#ffe9be";
          c.beginPath();
          c.ellipse(p.x, p.y, 4 + expand, 3 + expand * 0.55, 0, 0, Math.PI * 2);
          c.stroke();
        }

        for (let n = 0; n < 8; n++) {
          const a = (n * Math.PI) / 4;
          c.beginPath();
          c.moveTo(
            Math.round(p.x + Math.cos(a) * expand * 0.3),
            Math.round(p.y + Math.sin(a) * expand * 0.3),
          );
          c.lineTo(
            Math.round(p.x + Math.cos(a) * (expand + 8)),
            Math.round(p.y + Math.sin(a) * (expand + 8)),
          );
          c.stroke();
        }
        if (impactMove && e.type === "hit" && e.age < 0.16) {
          c.save();
          c.translate(p.x, p.y);
          c.scale(p.scale * 0.55, p.scale * 0.55);
          c.globalAlpha = 1 - e.age / 0.16;
          c.strokeStyle = impactMove.color;
          c.lineWidth = 0.045;
          for (const path of attackEffectPaths(impactMove, 1)) {
            c.beginPath();
            path.forEach(([x, y], n) =>
              n ? c.lineTo(x - 0.62, y) : c.moveTo(x - 0.62, y),
            );
            c.stroke();
          }
          c.restore();
        }
        if (e.age < 0.08) {
          rect(c, p.x - 3, p.y - 3, 6, 6, "#fff8d7");
          rect(c, p.x - 1, p.y - 10, 2, 20, "#fff8d7");
        }
      }
      c.restore();
      if (impactFlash > 0) {
        c.fillStyle = "#ffe9c5";
        c.globalAlpha = Math.min(0.13, impactFlash * 2);
        c.fillRect(0, 0, W, H);
        c.globalAlpha = 1;
        impactFlash -= dt;
      }
    },
    projectFighters(match) {
      return match.fighters.map((f) => project(f.x, f.y, f.z));
    },
    event(e) {
      effects.push({ ...e, age: 0 });
      if (e.type === "hit") {
        shake = e.wallSplat ? 0.25 : e.heavy ? 0.18 : 0.1;
        impactFlash = e.wallSplat ? 0.09 : e.heavy ? 0.065 : 0.035;
      }
    },
    toggleCamera() {
      wide = !wide;
    },
  };
}
export function paintPortrait(canvas, fighter, body = false) {
  canvas.width = 160;
  canvas.height = 128;
  const portrait = !body && customPortrait(fighter.character);
  if (portrait) canvas.getContext("2d").drawImage(portrait, 0, 0, 160, 128);
  else paintSprite(canvas.getContext("2d"), fighter, 0, 0);
}
