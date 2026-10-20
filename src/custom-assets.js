import { STYLE_MOTIONS } from "./style-motion.js";
import { character, CHARACTER_IDS } from "./characters.js";
import { loadImagePack, saveImagePack, imageData } from "./local-images.js";
const images = new Map(),
  sounds = new Map(),
  decoded = new Map();
let config = { characters: {}, sounds: {} };
let baseConfig = structuredClone(config),
  imagePack = {};
// Mods are local files included in the web build / portable EXE, never remote scripts.
const localPath = (path) =>
  typeof path === "string" &&
  /^\/mods\/[a-zA-Z0-9_./-]+$/.test(path) &&
  !path.includes("..");
export function parseAssetConfig(input) {
  const result = { characters: {}, sounds: {} };
  for (const id of CHARACTER_IDS) {
    const entry = input?.characters?.[id];
    if (!entry || typeof entry !== "object") continue;
    const p = {};
    if (entry.rig && typeof entry.rig === "object") {
      const rig = {};
      for (const key of [
        "head",
        "torso",
        "upperArm",
        "forearm",
        "hand",
        "thigh",
        "shin",
        "foot",
      ]) {
        const part = entry.rig[key];
        if (part && localPath(part.src))
          rig[key] = {
            src: part.src,
            width: Math.max(
              2,
              Math.min(
                64,
                Number(part.width) ||
                  {
                    head: 24,
                    torso: 28,
                    upperArm: 9,
                    forearm: 8,
                    hand: 11,
                    thigh: 12,
                    shin: 10,
                    foot: 19,
                  }[key],
              ),
            ),
            height: Math.max(
              2,
              Math.min(
                64,
                Number(part.height) ||
                  { head: 29, hand: 11, foot: 10 }[key] ||
                  20,
              ),
            ),
          };
      }
      if (Object.keys(rig).length === 8) p.rig = rig;
    }
    if (localPath(entry.skin)) {
      p.rig = Object.fromEntries(
        [
          "head",
          "torso",
          "upperArm",
          "forearm",
          "hand",
          "thigh",
          "shin",
          "foot",
        ].map((key, i) => [
          key,
          {
            src: entry.skin,
            cell: [i % 4, Math.floor(i / 4)],
            width: {
              head: 24,
              torso: 28,
              upperArm: 9,
              forearm: 8,
              hand: 11,
              thigh: 12,
              shin: 10,
              foot: 19,
            }[key],
            height: { head: 29, hand: 11, foot: 10 }[key] ?? 20,
          },
        ]),
      );
    }
    if (localPath(entry.portrait)) p.portrait = entry.portrait;
    if (
      localPath(entry.sheet) &&
      Number.isInteger(entry.frameWidth) &&
      Number.isInteger(entry.frameHeight) &&
      entry.frameWidth > 0 &&
      entry.frameWidth <= 1024 &&
      entry.frameHeight > 0 &&
      entry.frameHeight <= 1024
    ) {
      Object.assign(p, {
        sheet: entry.sheet,
        frameWidth: entry.frameWidth,
        frameHeight: entry.frameHeight,
        animations: {},
      });
      for (const [key, animation] of Object.entries(entry.animations ?? {})) {
        if (
          !Object.hasOwn(character(id).moves, key) &&
          !["idle", "walk", "guard", "crouch", "hit", "jump", "down"].includes(
            key,
          )
        )
          continue;
        if (
          !Number.isInteger(animation?.row) ||
          animation.row < 0 ||
          animation.row > 200 ||
          !Number.isInteger(animation.frames) ||
          animation.frames < 1 ||
          animation.frames > 120
        )
          continue;
        p.animations[key] = {
          row: animation.row,
          frames: animation.frames,
          fps: Math.max(1, Math.min(60, Number(animation.fps) || 12)),
        };
      }
    }
    result.characters[id] = p;
  }
  for (const [key, path] of Object.entries(input?.sounds ?? {})) {
    if (
      localPath(path) &&
      /^(hit|kick|heavy|block|kai|ren|mira|goro|hana|shin|boru|atlas|raon)(\.[a-zA-Z]+)?$/.test(
        key,
      )
    )
      result.sounds[key] = path;
  }
  return result;
}
export async function loadCustomAssets() {
  try {
    const response = await fetch("/custom-assets.json");
    if (!response.ok) return;
    config = parseAssetConfig(await response.json());
    const paths = new Set(
      Object.values(config.characters)
        .flatMap((p) => [
          p.portrait,
          p.sheet,
          ...Object.values(p.rig ?? {}).map((part) => part.src),
        ])
        .filter(Boolean),
    );
    await Promise.allSettled(
      [...paths].map(
        (path) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              images.set(path, img);
              resolve();
            };
            img.onerror = () => {
              console.warn("이미지 로드 실패:", path);
              reject(new Error(path));
            };
            img.src = path;
          }),
      ),
    );
    await Promise.allSettled(
      [...new Set(Object.values(config.sounds))].map(async (path) => {
        const r = await fetch(path);
        if (!r.ok) throw new Error(path);
        sounds.set(path, await r.arrayBuffer());
      }),
    );
    baseConfig = structuredClone(config);
    await applyImagePack(await loadImagePack());
  } catch (error) {
    console.warn("커스텀 에셋 설정 확인:", error.message);
  }
}
async function applyImagePack(pack) {
  config = structuredClone(baseConfig);
  imagePack = pack;
  for (const id of CHARACTER_IDS)
    for (const kind of ["portrait", "skin"]) {
      const data = pack[id]?.[kind];
      if (
        typeof data !== "string" ||
        !data.startsWith("data:image/png;base64,") ||
        data.length > 2 * 1024 * 1024
      )
        continue;
      try {
        const img = new Image();
        img.src = data;
        await img.decode();
        const path = `/mods/local-${id}-${kind}.png`;
        images.set(path, img);
        const entry = parseAssetConfig({
          characters: { [id]: { [kind]: path } },
        }).characters[id];
        config.characters[id] = { ...config.characters[id], ...entry };
      } catch {
        console.warn("저장 이미지 확인:", id, kind);
      }
    }
}
export async function importCustomImage(id, kind, file) {
  if (!CHARACTER_IDS.includes(id) || !["portrait", "skin"].includes(kind))
    throw Error("캐릭터와 이미지 종류를 선택하세요.");
  const next = structuredClone(imagePack);
  next[id] ??= {};
  if (file) next[id][kind] = await imageData(file, kind);
  else delete next[id][kind];
  const message = await saveImagePack(next);
  await applyImagePack(next);
  return message;
}
export function customPortrait(id) {
  return images.get(config.characters[id]?.portrait);
}
export function paintCustomSprite(c, f) {
  if (rigReady(f.character)) return false;
  const p = config.characters[f.character],
    sheet = images.get(p?.sheet);
  if (!sheet) return false;
  const key =
    f.downTime > 0
      ? "down"
      : f.attack
        ? f.attack.key
        : f.stun > 0
          ? "hit"
          : f.y > 0.1
            ? "jump"
            : f.guard
              ? "guard"
              : f.crouch
                ? "crouch"
                : f.move > 0
                  ? "walk"
                  : "idle";
  const a = p.animations[key];
  if (
    !a ||
    a.frames * p.frameWidth > sheet.naturalWidth ||
    (a.row + 1) * p.frameHeight > sheet.naturalHeight
  )
    return false;
  const column =
    f.attack && key === f.attack.key
      ? Math.min(
          a.frames - 1,
          Math.floor(
            (f.attack.t / character(f.character).moves[key].duration) *
              a.frames,
          ),
        )
      : Math.floor(f.commandTime * a.fps) % a.frames;
  c.imageSmoothingEnabled = false;
  c.drawImage(
    sheet,
    column * p.frameWidth,
    a.row * p.frameHeight,
    p.frameWidth,
    p.frameHeight,
    0,
    0,
    160,
    128,
  );
  return true;
}
export function playCustomHit(audio, event) {
  const kick = ["foot", "knee"].includes(STYLE_MOTIONS[event.kind]?.[0]);
  const kind =
    event.type === "block"
      ? "block"
      : event.heavy
        ? "heavy"
        : kick ||
            /Kick|kick|Knee|knee|Sweep|sweep|Boot|teep|roundhouse|heel|calf|crescent|stomp|Reap/.test(
              event.kind ?? "",
            )
          ? "kick"
          : "hit";
  const path =
    config.sounds[`${event.character}.${event.key}`] ??
    config.sounds[`${event.character}.${kind}`] ??
    config.sounds[kind];
  if (!path || !sounds.has(path)) return false;
  if (!decoded.has(path)) {
    decoded.set(path, null);
    audio
      .decodeAudioData(sounds.get(path).slice(0))
      .then((buffer) => decoded.set(path, buffer))
      .catch(() => {
        decoded.delete(path);
        sounds.delete(path);
      });
  }
  const buffer = decoded.get(path);
  if (!buffer) return false;
  const source = audio.createBufferSource(),
    gain = audio.createGain();
  source.buffer = buffer;
  gain.gain.value = 0.6;
  source.connect(gain);
  gain.connect(audio.destination);
  source.start();
  return true;
}

function rigReady(id) {
  const rig = config.characters[id]?.rig;
  return (
    rig &&
    Object.values(rig).every((part) => {
      const img = images.get(part.src);
      return (
        img &&
        (!part.cell ||
          (img.naturalWidth >= 128 &&
            img.naturalWidth % 128 === 0 &&
            img.naturalWidth === img.naturalHeight * 2))
      );
    })
  );
}
function drawPart(c, part, x, y, width, height) {
  const img = images.get(part.src);
  if (part.cell) {
    const size = img.naturalWidth / 4;
    c.drawImage(
      img,
      part.cell[0] * size,
      part.cell[1] * size,
      size,
      size,
      x,
      y,
      width,
      height,
    );
  } else c.drawImage(img, x, y, width, height);
}
// Draw each vertical limb from joint to joint. IK supplies all attack/guard/walk poses.
export function paintCustomRig(c, f, pose) {
  if (!rigReady(f.character)) return false;
  const rig = config.characters[f.character].rig;
  const limb = (key, a, b) => {
    const part = rig[key],
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    c.save();
    c.translate(...a);
    c.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2);
    drawPart(c, part, -part.width / 2, -1, part.width, length + 2);
    c.restore();
  };
  const stamp = (key, at, angle = 0) => {
    const part = rig[key];
    c.save();
    c.translate(...at);
    c.rotate(angle);
    drawPart(
      c,
      part,
      -part.width / 2,
      -part.height / 2,
      part.width,
      part.height,
    );
    c.restore();
  };
  const shoulder = pose.shoulders.map((a) => [a[0] + pose.lean, a[1]]);
  const leg = (i) => {
    const root = [pose.hip[0] + (i ? 5 : -5), pose.hip[1]];
    limb("thigh", root, pose.knees[i]);
    limb("shin", pose.knees[i], pose.feet[i]);
    stamp("foot", [pose.feet[i][0] + 2, pose.feet[i][1]]);
  };
  const arm = (i) => {
    limb("upperArm", shoulder[i], pose.elbows[i]);
    limb("forearm", pose.elbows[i], pose.hands[i]);
    stamp(
      "hand",
      pose.hands[i],
      f.running
        ? Math.atan2(
            pose.hands[i][1] - pose.elbows[i][1],
            pose.hands[i][0] - pose.elbows[i][0],
          ) -
            Math.PI / 2
        : 0,
    );
  };
  leg(0);
  arm(0);
  limb(
    "torso",
    [
      (shoulder[0][0] + shoulder[1][0]) / 2,
      (shoulder[0][1] + shoulder[1][1]) / 2 - 5,
    ],
    pose.hip,
  );
  leg(1);
  stamp("head", [pose.head[0] + pose.lean, pose.head[1] + 1]);
  arm(1);
  if (f.hitFlash > 0) {
    c.save();
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = 0.5;
    c.fillStyle = "#fff3c9";
    c.fillRect(-30, -30, 220, 190);
    c.restore();
  }
  return true;
}
