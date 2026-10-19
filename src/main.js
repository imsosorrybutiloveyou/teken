import { createCampaign, advanceCampaign, createCPU } from "./arcade.js";
import { STYLE_MOTIONS } from "./style-motion.js";
import "./style.css";
import { createMatch, step, stepPractice, MAX_HP } from "./combat.js";
import { CHARACTER_IDS, character, moveFor } from "./characters.js";
import { KeyboardInput, RemoteInput, keyName } from "./input.js";
import { createScene, paintPortrait } from "./scene.js";
import { PeerSession, validSnapshot } from "./network.js";
import { loadCustomAssets, playCustomHit } from "./custom-assets.js";
import { LobbyClient } from "./lobby.js";
const $ = (id) => document.getElementById(id),
  keyboard = new KeyboardInput(),
  remoteInput = new RemoteInput(),
  remoteEvents = [];
let campaign = null,
  arcadeCPU = null;
let practiceIds = ["kai", "ren"],
  match = createMatch(practiceIds),
  role = null,
  connected = false,
  battleActive = false,
  paused = false,
  connectionLost = false,
  sound = true,
  audio = null,
  practiceBehavior = "cpu",
  infiniteHealth = true,
  lastInputAt = 0,
  lastStateAt = 0,
  activePair = null,
  lockedRoster = null,
  selectionMode = "practice",
  chosen = "kai",
  ownLocked = false,
  lobbyReady = false,
  connectedName = "",
  ownRoomId = null,
  busy = false;
loadCustomAssets().then(() => {
  if (document.getElementById("character-grid").children.length)
    renderCharacters();
});
let scene;
try {
  scene = createScene($("game"));
  $("loading").hidden = true;
} catch (error) {
  $("loading").textContent =
    "픽셀 화면을 열 수 없습니다. 최신 브라우저를 사용하세요.";
  console.error(error);
}
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4000);
}
function status(message) {
  $("online-status").textContent = message;
}
function unlockAudio() {
  if (!sound) return;
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume().catch(() => {});
}
function playHit(event) {
  if (!sound || !audio || audio.state !== "running") return;
  if (playCustomHit(audio, event)) return;
  const timbre =
    {
      kai: 1,
      ren: 1.3,
      mira: 1.65,
      goro: 0.66,
      hana: 1.4,
      shin: 1.8,
      boru: 0.55,
      atlas: 0.48,
    }[event.character] ?? 1;
  const now = audio.currentTime,
    blocked = event.type === "block",
    heavy = event.heavy,
    kick =
      /Kick|spin|sweep|knee|low/.test(event.kind || "") ||
      ["foot", "knee"].includes(STYLE_MOTIONS[event.kind]?.[0]);
  const bass = audio.createOscillator(),
    gain = audio.createGain();
  bass.type = "sine";
  bass.frequency.setValueAtTime(
    (blocked ? 180 : kick ? 105 : heavy ? 100 : 165) * timbre,
    now,
  );
  bass.frequency.exponentialRampToValueAtTime(35, now + 0.16);
  gain.gain.setValueAtTime(
    blocked ? 0.06 : heavy ? 0.24 : kick ? 0.18 : 0.13,
    now,
  );
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  bass.connect(gain);
  gain.connect(audio.destination);
  bass.start(now);
  bass.stop(now + 0.26);
  const buffer = audio.createBuffer(
      1,
      Math.floor(audio.sampleRate * 0.09),
      audio.sampleRate,
    ),
    data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = audio.createBufferSource(),
    filter = audio.createBiquadFilter(),
    snap = audio.createGain();
  noise.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value =
    (blocked ? 2500 : kick ? 1300 : heavy ? 1100 : 2400) * timbre;
  snap.gain.setValueAtTime(blocked ? 0.05 : 0.11, now);
  snap.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  noise.connect(filter);
  filter.connect(snap);
  snap.connect(audio.destination);
  noise.start(now);
}
function effects(events) {
  for (const event of events)
    if (["hit", "block"].includes(event.type)) {
      scene?.event(event);
      playHit(event);
    }
}
function resetMatch(
  ids = activePair && lockedRoster ? lockedRoster : practiceIds,
) {
  if (campaign && !activePair)
    ids = [campaign.id, campaign.opponents[Math.min(campaign.stage, 6)]];
  match = createMatch(ids);
  paused = false;
  connectionLost = false;
  keyboard.clear();
  remoteInput.clear();
  remoteEvents.length = 0;
  lastInputAt = performance.now();
  updateMode();
  updateRecommendations();
}
function updateMode() {
  $("p1-role").textContent = activePair
    ? role === "host"
      ? "YOU · HOST"
      : "OPPONENT"
    : "YOU";
  $("p2-role").textContent = activePair
    ? role === "guest"
      ? "YOU · PEER"
      : "OPPONENT"
    : campaign
      ? "CPU · " + campaign.difficulty
      : practiceBehavior === "cpu"
        ? "CPU · 공격"
        : "DUMMY · 정지";
  $("arcade-button").classList.toggle("selected", !!campaign);
  $("arena-mode").textContent = activePair
    ? "ONLINE P2P MATCH"
    : campaign
      ? `ARCADE ${Math.min(campaign.stage + 1, 7)}/7 · ${campaign.difficulty.toUpperCase()}`
      : "PRACTICE MATCH";
  $("connection-status").textContent = activePair
    ? battleActive
      ? "P2P 대전 중"
      : connected
        ? "캐릭터 선택 대기 · P2P 연결 완료"
        : "매칭 완료 · P2P 연결 중"
    : campaign
      ? `아케이드 ${Math.min(campaign.stage + 1, 7)}/7 · ${campaign.difficulty}`
      : `연습 · ${practiceBehavior === "cpu" ? "CPU 공격" : "정지 샌드백"} · ${infiniteHealth ? "1.2초 뒤 체력 회복" : "일반 체력"}`;
  $("practice-button").classList.toggle("selected", !activePair && !campaign);
  $("pvp-button").classList.toggle("selected", !!activePair);
  $("pause-button").innerHTML = paused
    ? "▶ <span>계속하기</span>"
    : "Ⅱ <span>일시정지</span>";
  $("pause-button").disabled = !!activePair;
  $("reset-button").disabled =
    !!activePair && (!battleActive || role === "guest");
  $("character-button").disabled = !!activePair;
  for (const id of ["create-room"])
    $(id).disabled = !!activePair || busy || !$("cancel-queue").hidden;
}
function startBattle() {
  if (!connected || !lockedRoster || battleActive) return;
  battleActive = true;
  resetMatch(lockedRoster);
  $("select-dialog").close();
  $("online-dialog").close();
  lastStateAt = performance.now();
  toast(
    "대전 시작 · " +
      (role === "host" ? "P1" : "P2") +
      " " +
      character(lockedRoster[role === "host" ? 0 : 1]).name,
  );
}
async function leaveOnline(message = "연습 대전으로 돌아왔습니다.") {
  campaign = null;
  activePair = null;
  lockedRoster = null;
  battleActive = false;
  connected = false;
  role = null;
  peer.close();
  if (lobbyReady) await lobby.action("cancel").catch(() => {});
  $("cancel-queue").hidden = true;
  if ($("select-dialog").open) $("select-dialog").close();
  resetMatch(practiceIds);
  status(message);
}
const peer = new PeerSession({
  onStatus(message) {
    status(message);
    if (activePair && !battleActive)
      $("connection-status").textContent = message;
  },
  onOpen(side) {
    connected = true;
    role = side;
    updateMode();
    startBattle();
  },
  onMessage(msg) {
    if (!battleActive) return;
    if (role === "host" && msg.type === "input") {
      remoteInput.receive(msg.input);
      lastInputAt = performance.now();
    }
    if (
      role === "guest" &&
      msg.type === "state" &&
      validSnapshot(msg.state) &&
      lockedRoster &&
      msg.state.fighters.every((f, i) => f.character === lockedRoster[i])
    ) {
      match = msg.state;
      lastStateAt = performance.now();
      connectionLost = false;
      if (Array.isArray(msg.events))
        effects(
          msg.events
            .filter(
              (e) =>
                ["hit", "block"].includes(e?.type) &&
                ["x", "y", "z"].every(
                  (k) => Number.isFinite(e[k]) && Math.abs(e[k]) < 1e12,
                ),
            )
            .slice(0, 20),
        );
    }
  },
  onClose(wasOpen, message) {
    if (activePair) {
      toast(message);
      leaveOnline(message);
    }
  },
});
const lobby = new LobbyClient(
  (event) => {
    switch (event.type) {
      case "rooms":
        renderRooms(event.rooms);
        $("lobby-count").textContent =
          `${event.online} ONLINE / ${event.rooms.length} ROOMS`;
        break;
      case "queued":
        ownRoomId = event.roomId;
        $("cancel-queue").hidden = false;
        status("방을 만들었습니다. 상대가 입장하면 캐릭터 선택이 열립니다.");
        $("create-room").disabled = true;
        break;
      case "idle":
        ownRoomId = null;
        $("cancel-queue").hidden = true;
        status("대기를 취소했습니다.");
        break;
      case "paired": {
        campaign = null;
        ownRoomId = null;
        activePair = event;
        role = event.role;
        lockedRoster = null;
        battleActive = false;
        connected = false;
        paused = true;
        keyboard.clear();
        ownLocked = false;
        chosen = role === "host" ? "kai" : "ren";
        selectionMode = "online";
        $("cancel-queue").hidden = true;
        $("online-dialog").close();
        openSelection();
        updateMode();
        peer
          .connect(role, (data) => lobby.action("signal", { data }))
          .catch((error) => {
            toast(error.message);
            leaveOnline(error.message);
          });
        break;
      }
      case "signal":
        if (activePair) peer.receive(event.data);
        break;
      case "selection":
        if (activePair) {
          const index = role === "host" ? 0 : 1;
          ownLocked = !!event.picks[index];
          $("your-pick").textContent =
            "내 선택: " +
            (event.picks[index] ? character(event.picks[index]).name : "미정");
          $("opponent-pick").textContent =
            "상대 선택: " +
            (event.picks[1 - index]
              ? character(event.picks[1 - index]).name
              : "선택 중");
          $("confirm-character").disabled = ownLocked;
          $("selection-status").textContent = ownLocked
            ? "상대 선택 및 P2P 연결을 기다리는 중…"
            : "원하는 격투가를 선택하고 확정하세요.";
          renderCharacters();
        }
        break;
      case "rosterLocked":
        if (
          activePair &&
          Array.isArray(event.characters) &&
          event.characters.length === 2 &&
          event.characters.every((id) => CHARACTER_IDS.includes(id))
        ) {
          lockedRoster = event.characters;
          startBattle();
        }
        break;
      case "opponentLeft":
        if (activePair) {
          toast(event.message);
          leaveOnline(event.message);
        }
        break;
    }
  },
  (message) => status(message),
);
async function job(task) {
  if (busy) return;
  busy = true;
  for (const id of ["connect-lobby", "create-room"]) $(id).disabled = true;
  try {
    await task();
  } catch (error) {
    status(error.message);
    toast(error.message);
  } finally {
    busy = false;
    updateMode();
    $("connect-lobby").disabled = false;
  }
}
async function ensureLobby() {
  const address = $("server-url").value.trim();
  if (
    lobbyReady &&
    lobby.session &&
    lobby.source?.readyState === 1 &&
    lobby.base === new URL(address).origin &&
    connectedName === ($("player-name").value.trim() || "PLAYER")
  )
    return;
  if (activePair) throw Error("서버를 바꾸기 전에 현재 대전을 종료하세요.");
  status("매칭 서버에 연결 중…");
  lobbyReady = false;
  const name = $("player-name").value.trim() || "PLAYER";
  await lobby.connect(address, name);
  connectedName = name;
  lobbyReady = true;
  localStorage.setItem("axis-match-server", address);
  localStorage.setItem("axis-player-name", $("player-name").value);
  status("서버 연결 완료 · 방을 만들거나 아래 목록에서 입장하세요.");
}
$("server-url").value = document.querySelector('meta[name="axis-desktop"]')
  ? location.origin
  : localStorage.getItem("axis-match-server") ||
    import.meta.env.VITE_MATCH_SERVER_URL ||
    location.origin;
$("player-name").value = localStorage.getItem("axis-player-name") || "PLAYER";
$("connect-lobby").onclick = () => job(ensureLobby);
$("create-room").onclick = () =>
  job(async () => {
    await ensureLobby();
    await lobby.action("createRoom", {
      name: $("room-name").value.trim() || `${connectedName}의 대전방`,
    });
  });
$("cancel-queue").onclick = () =>
  job(async () => {
    await lobby.action("cancel");
  });
$("disconnect-button").onclick = async () => {
  await leaveOnline();
  $("online-dialog").close();
};
function renderRooms(rooms) {
  const root = $("room-list");
  root.replaceChildren();
  if (!Array.isArray(rooms) || !rooms.length) {
    const text = document.createElement("p");
    text.className = "network-note";
    text.textContent = "참가 가능한 방이 없습니다. 새 방을 만들어 보세요.";
    root.append(text);
    return;
  }
  for (const room of rooms.slice(0, 100)) {
    const row = document.createElement("div");
    row.className = "room-row";
    const label = document.createElement("div"),
      title = document.createElement("strong"),
      details = document.createElement("small"),
      button = document.createElement("button");
    title.textContent = room.name;
    details.textContent = `${room.host} · 1 / 2`;
    button.className = "button";
    button.textContent = room.id === ownRoomId ? "대기 중" : "입장";
    button.disabled = !!activePair || room.id === ownRoomId;
    button.onclick = () =>
      job(async () => {
        await ensureLobby();
        await lobby.action("joinRoom", { roomId: room.id });
      });
    label.append(title, details);
    row.append(label, button);
    root.append(row);
  }
}
function openOnline() {
  unlockAudio();
  keyboard.clear();
  if (!activePair) {
    paused = true;
    updateMode();
  }
  $("online-dialog").showModal();
  if (!activePair) job(ensureLobby);
}
$("online-button").onclick = openOnline;
$("pvp-button").onclick = openOnline;
function renderCharacters() {
  const grid = $("character-grid");
  grid.replaceChildren();
  for (const id of CHARACTER_IDS) {
    const p = character(id),
      button = document.createElement("button");
    button.type = "button";
    button.className = "character-card" + (chosen === id ? " selected" : "");
    button.style.setProperty("--fighter-color", p.color);
    button.dataset.character = id;
    button.disabled = ownLocked && selectionMode === "online";
    const canvas = document.createElement("canvas"),
      name = document.createElement("b"),
      style = document.createElement("small");
    name.textContent = p.name;
    style.textContent = p.style;
    paintPortrait(canvas, createMatch([id, "kai"]).fighters[0]);
    button.append(canvas, name, style);
    button.onclick = () => {
      chosen = id;
      renderCharacters();
    };
    grid.append(button);
  }
  const p = character(chosen);
  $("character-detail").textContent =
    `${p.name} · ${p.style} · ${p.specialty} | LP ${p.moves.u.startup}F / RP ${p.moves.i.startup}F / LK ${p.moves.j.startup}F / RK ${p.moves.k.startup}F · 고유기: ${p.moves.qcfPunch.command} ${p.moves.qcfPunch.name}`;
}
function openSelection() {
  const online = selectionMode === "online";
  $("select-eyebrow").textContent = online
    ? "MATCH FOUND / SELECT FIGHTER"
    : "PRACTICE / SELECT FIGHTER";
  $("select-title").textContent = online
    ? "상대가 정해졌습니다. 캐릭터를 선택하세요."
    : selectionMode === "arcade"
      ? "아케이드 캐릭터와 난이도를 선택하세요."
      : "연습할 격투가를 선택하세요.";
  $("select-opponent").textContent = online
    ? `VS ${activePair.opponent} · PLAYER MATCH`
    : "내 캐릭터와 CPU 상대를 고를 수 있습니다.";
  $("cpu-character").hidden = online || selectionMode === "arcade";
  $("cpu-label").hidden = online || selectionMode === "arcade";
  $("practice-settings").hidden = online || selectionMode === "arcade";
  $("arcade-settings").hidden = selectionMode !== "arcade";
  $("practice-behavior").value = practiceBehavior;
  $("infinite-health").checked = infiniteHealth;
  $("opponent-pick").hidden = !online;
  $("your-pick").textContent = "내 선택: 미정";
  $("opponent-pick").textContent = "상대 선택: 미정";
  $("confirm-character").disabled = false;
  $("selection-status").textContent = online
    ? "양쪽 모두 선택 확정 후 P2P 연결이 완료되면 시작됩니다."
    : "각 캐릭터의 기술표는 경기 화면에서 확인할 수 있습니다.";
  renderCharacters();
  if (!$("select-dialog").open) $("select-dialog").showModal();
}
for (const id of CHARACTER_IDS) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = character(id).name;
  $("cpu-character").append(option);
}
$("cpu-character").value = "ren";
$("confirm-character").onclick = async () => {
  unlockAudio();
  if (selectionMode === "online") {
    if (ownLocked) return;
    $("confirm-character").disabled = true;
    try {
      await lobby.action("select", { character: chosen });
    } catch (error) {
      toast(error.message);
      $("confirm-character").disabled = false;
    }
  } else if (selectionMode === "arcade") {
    campaign = createCampaign(chosen, $("arcade-difficulty").value);
    arcadeCPU = createCPU(campaign.difficulty);
    $("select-dialog").close();
    resetMatch([chosen, campaign.opponents[0]]);
  } else {
    campaign = null;
    practiceIds = [chosen, $("cpu-character").value];
    practiceBehavior = $("practice-behavior").value;
    infiniteHealth = $("infinite-health").checked;
    $("select-dialog").close();
    resetMatch(practiceIds);
  }
};
async function cancelSelection() {
  if (selectionMode === "online") {
    await leaveOnline("매칭을 취소했습니다.");
    $("online-dialog").showModal();
  } else {
    $("select-dialog").close();
    paused = false;
    updateMode();
  }
}
$("cancel-selection").onclick = cancelSelection;
$("select-dialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  cancelSelection();
});
async function practice() {
  if (activePair) await leaveOnline();
  campaign = null;
  selectionMode = "practice";
  ownLocked = false;
  chosen = practiceIds[0];
  paused = true;
  keyboard.clear();
  updateMode();
  openSelection();
}
$("arcade-button").onclick = async () => {
  if (activePair) await leaveOnline();
  selectionMode = "arcade";
  chosen = practiceIds[0];
  paused = true;
  openSelection();
};
$("practice-button").onclick = practice;
$("character-button").onclick = practice;
$("fullscreen-button").onclick = async () => {
  const arena = document.querySelector(".arena");
  if (arena.classList.contains("fullscreen-fallback")) {
    arena.classList.remove("fullscreen-fallback");
    return;
  }
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (!document.fullscreenEnabled || !arena.requestFullscreen) {
      arena.classList.add("fullscreen-fallback");
      return;
    }
    const request = arena.requestFullscreen();
    await Promise.race([
      request,
      new Promise((resolve) => setTimeout(resolve, 300)),
    ]);
    if (!document.fullscreenElement) arena.classList.add("fullscreen-fallback");
  } catch {
    arena.classList.add("fullscreen-fallback");
  }
};
for (const button of document.querySelectorAll("[data-key]")) {
  const release = (e) => {
    e.preventDefault();
    keyboard.up(button.dataset.key, performance.now());
  };
  button.onpointerdown = (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    unlockAudio();
    keyboard.down(button.dataset.key, performance.now(), !paused);
  };
  button.onpointerup = release;
  button.onpointercancel = release;
  button.onlostpointercapture = release;
}
$("camera-button").onclick = () => scene?.toggleCamera();
$("pause-button").onclick = () => {
  if (activePair) return;
  paused = !paused;
  keyboard.clear();
  updateMode();
};
$("reset-button").onclick = () => {
  if (activePair && (!battleActive || role !== "host")) return;
  if (campaign) {
    campaign = createCampaign(campaign.id, campaign.difficulty);
    arcadeCPU = createCPU(campaign.difficulty);
  }
  resetMatch();
};
$("sound-button").onclick = () => {
  sound = !sound;
  unlockAudio();
  $("sound-button").innerHTML = `♫ <span>사운드 ${sound ? "ON" : "OFF"}</span>`;
  $("sound-button").setAttribute("aria-pressed", String(sound));
};
window.addEventListener("keydown", (event) => {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement ||
    document.querySelector("dialog[open]")
  )
    return;
  const key = keyName(event);
  if (
    ["w", "a", "s", "d", "u", "i", "j", "k", "shift", "q", "e"].includes(key)
  ) {
    event.preventDefault();
    unlockAudio();
    if (!event.repeat) keyboard.down(key, performance.now(), !paused);
  }
  if (key === "h" && !event.repeat) {
    event.preventDefault();
    openMoves();
  }
  if (key === "escape" && !activePair) {
    paused = !paused;
    keyboard.clear();
    updateMode();
  }
});
window.addEventListener("keyup", (event) =>
  keyboard.up(keyName(event), performance.now()),
);
window.addEventListener("blur", () => keyboard.clear());
document.addEventListener("visibilitychange", () => {
  keyboard.clear();
  if (document.hidden && !activePair) {
    paused = true;
    updateMode();
  }
});
const levels = { high: "상단", mid: "중단", low: "하단", throw: "잡기" };
function renderMoves(id) {
  const p = character(id);
  $("move-air-combo").textContent =
    `공중 5타: ${p.moves.upper.command} › ${p.chain.slice(0, 2).join(" › ").toUpperCase()} › ${p.moves.bound.command} › ${p.moves.sideKick.command}. 띄우고 적중을 확인하며 다음 버튼을 입력하세요. 방향 기술 뒤에는 방향키를 떼세요. 재바운드는 다운. 누웠을 때 W 즉시 기상 · J/K 기상각 · 뒤로 기상. 후속 피해 계수 ${p.comboScale.toFixed(2)}.`;
  $("move-list").replaceChildren();
  for (const [key, m] of Object.entries(p.moves)) {
    const row = document.createElement("div");
    row.className = "move-item";
    const command = document.createElement("kbd"),
      info = document.createElement("div"),
      name = document.createElement("strong"),
      desc = document.createElement("p"),
      frames = document.createElement("div");
    command.textContent = m.command;
    name.textContent = m.name;
    desc.textContent = `${levels[m.level]} · ${m.damage} DMG · ${m.launch ? "띄우기" : m.knockdown ? "다운 · 기상 심리" : m.bound ? "공중 바운드 · 콤보당 1회" : m.range.toFixed(2) + "m"}`;
    if (m.level !== "throw") {
      const punish = -m.onBlock;
      desc.textContent +=
        m.onBlock > 0
          ? ` · 가드돼도 공격자 +${m.onBlock}F`
          : punish >= 16
            ? " · 가드 후 어퍼 확정(사거리 내)"
            : punish === 15
              ? " · 가드 후 15F 어퍼 확정"
              : punish >= 10
                ? " · 가드 후 10F 잽 확정"
                : " · 빠른 반격은 가드 가능";
    }
    frames.className = "frame-data";
    const sign = (n) => (n > 0 ? "+" + n : String(n));
    frames.textContent = `S ${m.startup} / A ${m.active} / R ${m.recovery} | G ${m.level === "throw" ? "—" : sign(m.onBlock)} / H ${m.launch ? "L" : m.knockdown ? "KD" : m.bound ? sign(m.onHit) + " / B" : sign(m.onHit)}`;
    if (m.armorFrom != null)
      desc.textContent += ` · ${Math.round(m.armorFrom * 60)}F부터 상·중단 1회 버티기(피해 받음)`;
    if (m.highCrushFrom != null)
      desc.textContent += ` · ${Math.round(m.highCrushFrom * 60)}F부터 상단 회피`;
    if (m.hop) desc.textContent += " · 도약 중 하단 회피";
    if (m.counterLaunch) desc.textContent += " · 카운터 적중 시 띄우기";
    info.append(name, desc);
    row.append(command, info, frames);
    $("move-list").append(row);
  }
  for (const button of $("move-character-tabs").children)
    button.classList.toggle("selected", button.dataset.character === id);
}
for (const id of CHARACTER_IDS) {
  const button = document.createElement("button");
  button.dataset.character = id;
  button.textContent = character(id).name;
  button.onclick = () => renderMoves(id);
  $("move-character-tabs").append(button);
}
function openMoves() {
  keyboard.clear();
  if (!activePair) {
    paused = true;
    updateMode();
  }
  renderMoves(match.fighters[role === "guest" ? 1 : 0].character);
  if (!$("moves-dialog").open) $("moves-dialog").showModal();
}
$("moves-button").onclick = openMoves;
$("arena-moves-button").onclick = openMoves;
function updateRecommendations() {
  const p = character(match.fighters[role === "guest" ? 1 : 0].character);
  $("recommended-string").textContent = p.chain.join(" › ").toUpperCase();
  $("recommended-name").textContent = p.name;
  $("recommended-special").textContent = p.moves.qcfPunch.command;
  $("special-name").textContent = p.moves.qcfPunch.name;
}
for (const dialog of [$("online-dialog"), $("moves-dialog")])
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
function updateHUD() {
  match.fighters.forEach((f, i) => {
    const p = character(f.character);
    $(`p${i + 1}-name`).textContent = p.name;
    $(`rounds-${i}`).querySelector("span").textContent = p.title;
    $(`health-${i}`).style.width = Math.max(0, (f.hp / MAX_HP) * 100) + "%";
    $(`rounds-${i}`)
      .querySelectorAll("i")
      .forEach((dot, n) => dot.classList.toggle("won", match.wins[i] > n));
  });
  $("timer").textContent = activePair
    ? String(Math.ceil(match.time)).padStart(2, "0")
    : "∞";
  $("round-number").textContent = String(match.round).padStart(2, "0");
  let title = "",
    sub = "";
  if (activePair && !battleActive) {
    title = "SELECT FIGHTER";
    sub = "매칭 완료 · 캐릭터 선택 대기";
  } else if (
    battleActive &&
    role === "guest" &&
    performance.now() - lastStateAt > 2500
  ) {
    title = "WAITING";
    sub = "호스트의 응답을 기다리는 중";
  } else if (paused) {
    title = "PAUSED";
    sub = "▶ 또는 ESC로 계속하기";
  } else if (match.phase === "ready") {
    title = match.phaseTime > 0.5 ? `ROUND ${match.round}` : "READY";
    sub = activePair ? "ONLINE P2P MATCH" : "PRACTICE MATCH";
  } else if (match.phase === "fight" && match.phaseTime > 0) {
    title = "FIGHT";
  } else if (match.phase === "roundEnd") {
    title = match.time > 0 ? "K.O." : "TIME UP";
    sub =
      match.winner === -1
        ? "DRAW"
        : `${character(match.fighters[match.winner].character).name} WINS THE ROUND`;
  } else if (match.phase === "matchEnd") {
    title =
      match.winner === -1
        ? "DRAW"
        : `${character(match.fighters[match.winner].character).name} WINS`;
    sub = campaign
      ? campaign.stage === 7
        ? "ARCADE CLEAR · 7명 격파"
        : "GAME OVER · 아케이드 버튼으로 다시 도전"
      : "다시 시작 ↻ 또는 로비로 돌아가기";
  }
  $("announcement").classList.toggle("hidden", !title);
  $("announcement-text").textContent = title;
  $("announcement-sub").textContent = sub;
  const f = match.fighters[role === "guest" ? 1 : 0],
    arrows = {
      1: "↙",
      2: "↓",
      3: "↘",
      4: "←",
      5: "·",
      6: "→",
      7: "↖",
      8: "↑",
      9: "↗",
    };
  $("input-history").textContent =
    f.commands
      .filter((e) => f.commandTime - e.at < 1.2)
      .slice(-8)
      .map((e) => arrows[e.dir])
      .join(" ") || "·";
  const move = moveFor(f, f.lastMove);
  $("current-move").textContent =
    f.lastMoveAge < 1.8 && move
      ? `${move.name} · ${move.startup}F`
      : "U LP / I RP / J LK / K RK";
  $("training-level").hidden = !!activePair || !!campaign;
  $("training-level").textContent = match.fighters
    .map((f, i) => {
      const move = f.attack ? moveFor(f) : null;
      const level = move?.level ?? (f.hitFlash > 0 ? f.hitLevel : null);
      return `P${i + 1}: ${level ? { high: "상단", mid: "중단", low: "하단", throw: "잡기" }[level] : "—"}`;
    })
    .join("  /  ");
  $("stage-depth").textContent =
    `AXIS ${((match.axisAngle * 180) / Math.PI).toFixed(0)}° · ∞`;
  $("combo-display").hidden = f.combo < 2 || f.comboAge > 1.5;
  $("combo-count").textContent = f.combo;
  $("combo-damage").textContent = `${f.comboDamage} DAMAGE`;
}
let previous = performance.now(),
  accumulator = 0,
  netTick = 0;
function frame(now) {
  const delta = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  accumulator += delta;
  while (accumulator >= 1 / 60) {
    accumulator -= 1 / 60;
    if (battleActive && role === "guest")
      peer.send({ type: "input", input: keyboard.sample(performance.now()) });
    else if (!paused && (!activePair || battleActive)) {
      const input = keyboard.sample(performance.now());
      if (
        battleActive &&
        performance.now() - lastInputAt > 500 &&
        !remoteInput.queue.length
      )
        remoteInput.clear();
      const opponent = battleActive ? remoteInput.sample() : null;
      if (battleActive) step(match, [input, opponent]);
      else if (campaign) {
        if (match.phase === "matchEnd" && !campaign.finished) {
          const result = advanceCampaign(campaign, match.winner);
          if (result === "next") {
            arcadeCPU = createCPU(campaign.difficulty);
            resetMatch([campaign.id, campaign.opponents[campaign.stage]]);
          } else {
            campaign.finished = true;
            toast(
              result === "cleared"
                ? "ARCADE CLEAR · 7명 모두 격파!"
                : "GAME OVER · 아케이드를 다시 시작하세요.",
            );
          }
        } else step(match, [input, arcadeCPU(match)]);
      } else
        stepPractice(match, input, {
          behavior: practiceBehavior,
          infiniteHealth,
        });
      effects(match.events);
      if (battleActive) {
        remoteEvents.push(...match.events);
        if (++netTick % 2 === 0)
          peer.send({
            type: "state",
            state: { ...match, events: [] },
            events: remoteEvents.splice(0),
          });
      }
    }
  }
  updateHUD();
  scene?.render(match);
  requestAnimationFrame(frame);
}
updateMode();
updateRecommendations();
requestAnimationFrame(frame);
window.axis = {
  get arcade() {
    return campaign ? structuredClone(campaign) : null;
  },
  get practice() {
    return { behavior: practiceBehavior, infiniteHealth };
  },
  get state() {
    return structuredClone(match);
  },
  get role() {
    return role;
  },
  get connected() {
    return connected;
  },
  get paused() {
    return paused;
  },
  get battleActive() {
    return battleActive;
  },
  get matched() {
    return !!activePair;
  },
  get projection() {
    return scene?.projectFighters(match);
  },
  get inputs() {
    return {
      held: [...keyboard.held],
      remote: structuredClone(remoteInput.latest),
    };
  },
};
