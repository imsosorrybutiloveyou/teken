import { STYLE_MOTIONS } from "./style-motion.js";
import { character, CHARACTER_IDS } from "./characters.js";
const images = new Map(),
  sounds = new Map(),
  decoded = new Map();
let config = { characters: {}, sounds: {} };
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
      /^(hit|kick|heavy|block|kai|ren|mira|goro)(\.[a-zA-Z]+)?$/.test(key)
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
        .flatMap((p) => [p.portrait, p.sheet])
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
  } catch (error) {
    console.warn("커스텀 에셋 설정 확인:", error.message);
  }
}
export function customPortrait(id) {
  return images.get(config.characters[id]?.portrait);
}
export function paintCustomSprite(c, f) {
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
