import "./style.css";
import { createMatch, step, cpuInput, MOVES, MAX_HP } from "./combat.js";
import { KeyboardInput, RemoteInput, keyName } from "./input.js";
import { createScene } from "./scene.js";
import { PeerSession, validSnapshot } from "./network.js";
const $ = (id) => document.getElementById(id);
let match = createMatch(),
  role = null,
  paused = false,
  connected = false,
  connectionLost = false,
  sound = false,
  audio = null,
  lastInputAt = 0,
  lastStateAt = 0,
  tab = "host",
  networkBusy = false;
let scene;
try {
  scene = createScene($("game"));
  $("loading").hidden = true;
} catch (error) {
  $("loading").textContent =
    "픽셀 화면을 시작할 수 없습니다. 최신 브라우저에서 다시 열어 주세요.";
  console.error(error);
}
const keyboard = new KeyboardInput(),
  remoteInput = new RemoteInput(),
  remoteEvents = [];
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3500);
}
function unlockAudio() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
}
function playHit(blocked = false) {
  if (!sound) return;
  unlockAudio();
  const oscillator = audio.createOscillator(),
    gain = audio.createGain();
  oscillator.type = blocked ? "triangle" : "sawtooth";
  oscillator.frequency.setValueAtTime(blocked ? 460 : 125, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    40,
    audio.currentTime + 0.11,
  );
  gain.gain.setValueAtTime(0.065, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.13);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.14);
}
function resetMatch() {
  match = createMatch();
  paused = false;
  connectionLost = false;
  keyboard.clear();
  remoteInput.clear();
  lastInputAt = performance.now();
  setPauseLabel();
}
function setPauseLabel() {
  $("pause-button").innerHTML = paused
    ? "▶ <span>계속하기</span>"
    : "Ⅱ <span>일시정지</span>";
  $("pause-button").disabled = connected;
  $("reset-button").disabled = connected && role === "guest";
}
function localInput() {
  return keyboard.sample(performance.now());
}
function eventEffects(events) {
  for (const e of events) {
    if (e.type === "hit" || e.type === "block") {
      scene?.event(e);
      playHit(e.type === "block");
    }
  }
}
function updateMode() {
  $("p1-role").textContent = connected
    ? role === "host"
      ? "YOU · HOST"
      : "OPPONENT"
    : "YOU";
  $("p2-role").textContent = connected
    ? role === "guest"
      ? "YOU · PEER"
      : "OPPONENT"
    : "CPU · NORMAL";
  $("arena-mode").textContent = connected
    ? "ONLINE P2P MATCH"
    : "PRACTICE MATCH";
  $("connection-status").textContent = connected
    ? "P2P 연결됨 · " + (role === "host" ? "P1 호스트" : "P2 참가자")
    : "로컬 연습 · CPU 활성";
  $("practice-button").classList.toggle("selected", !connected);
  $("pvp-button").classList.toggle("selected", connected);
  setPauseLabel();
}
const peer = new PeerSession({
  onStatus(message) {
    $("online-status").textContent = message;
  },
  onOpen(side) {
    connected = true;
    role = side;
    resetMatch();
    lastStateAt = performance.now();
    updateMode();
    $("online-dialog").close();
    toast(
      side === "host"
        ? "상대 연결 완료! P1 KAI를 조작하세요."
        : "대전 시작! P2 REN을 조작하세요.",
    );
  },
  onMessage(msg) {
    if (role === "host" && msg.type === "input") {
      remoteInput.receive(msg.input);
      lastInputAt = performance.now();
    }
    if (role === "guest" && msg.type === "state" && validSnapshot(msg.state)) {
      match = msg.state;
      lastStateAt = performance.now();
      connectionLost = false;
      if (Array.isArray(msg.events)) {
        eventEffects(
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
    }
  },
  onClose(wasOpen, message) {
    if (wasOpen) {
      connected = false;
      role = null;
      connectionLost = true;
      paused = true;
      keyboard.clear();
      $("connection-status").textContent =
        "연결 종료 · 연습 대전으로 돌아가세요";
      setPauseLabel();
      toast(message);
    }
  },
});
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (
    e.target instanceof HTMLTextAreaElement ||
    e.target instanceof HTMLInputElement ||
    document.querySelector("dialog[open]")
  )
    return;
  const key = keyName(e);
  if (["w", "a", "s", "d", "u", "i", "j", "k", "l", "shift"].includes(key)) {
    e.preventDefault();
    if (!e.repeat) keyboard.down(key, performance.now(), !paused);
  }
  if (key === "escape" && !connected) {
    paused = !paused;
    keyboard.clear();
    setPauseLabel();
  }
});
window.addEventListener("keyup", (e) =>
  keyboard.up(keyName(e), performance.now()),
);
window.addEventListener("blur", () => {
  keyboard.clear();
});
document.addEventListener("visibilitychange", () => {
  keyboard.clear();
  if (document.hidden && !connected) {
    paused = true;
    setPauseLabel();
  }
});
$("camera-button").onclick = () => scene?.toggleCamera();
$("pause-button").onclick = () => {
  if (connected) return;
  paused = !paused;
  keyboard.clear();
  setPauseLabel();
};
$("reset-button").onclick = () => {
  if (connected && role !== "host") return;
  resetMatch();
  toast("새 대전을 시작합니다.");
};
$("sound-button").onclick = () => {
  sound = !sound;
  if (sound) unlockAudio();
  $("sound-button").innerHTML = `♫ <span>사운드 ${sound ? "ON" : "OFF"}</span>`;
  $("sound-button").setAttribute("aria-pressed", String(sound));
};
function practice() {
  if (connected && !confirm("온라인 연결을 종료하고 연습 대전으로 돌아갈까요?"))
    return;
  peer.close();
  connected = false;
  role = null;
  resetMatch();
  updateMode();
}
$("practice-button").onclick = practice;
function openOnline() {
  if (!connected) {
    paused = true;
    setPauseLabel();
  }
  keyboard.clear();
  $("online-dialog").showModal();
}
$("online-button").onclick = openOnline;
$("pvp-button").onclick = openOnline;
$("online-dialog").addEventListener("close", () => {
  keyboard.clear();
});
function setTab(value) {
  if (networkBusy || connected) return;
  if (tab !== value) {
    peer.close();
    $("local-code-panel").hidden = true;
    $("remote-code").value = "";
    $("local-code").value = "";
    $("online-status").textContent = "연결 대기 중";
  }
  tab = value;
  $("host-panel").hidden = value !== "host";
  $("guest-panel").hidden = value !== "guest";
  $("host-tab").classList.toggle("selected", value === "host");
  $("guest-tab").classList.toggle("selected", value === "guest");
  $("remote-label").textContent =
    value === "host" ? "상대의 응답 코드" : "상대의 초대 코드";
  $("apply-code").textContent =
    value === "host" ? "응답 적용 · 연결" : "응답 코드 생성 ↗";
}
$("host-tab").onclick = () => setTab("host");
$("guest-tab").onclick = () => setTab("guest");
async function networking(job) {
  networkBusy = true;
  for (const id of ["create-offer", "apply-code", "host-tab", "guest-tab"])
    $(id).disabled = true;
  try {
    await job();
  } catch (e) {
    $("online-status").textContent = e.message;
    toast(e.message);
  } finally {
    networkBusy = false;
    for (const id of ["create-offer", "apply-code", "host-tab", "guest-tab"])
      $(id).disabled = false;
  }
}
$("create-offer").onclick = () =>
  networking(async () => {
    if (connected)
      throw new Error("새 방을 만들려면 먼저 현재 연결을 해제하세요.");
    $("online-status").textContent =
      "연결 경로 수집 중… 최대 12초 정도 걸립니다.";
    $("local-code-panel").hidden = true;
    $("remote-code").value = "";
    const code = await peer.offer();
    $("local-code").value = code;
    $("local-label").textContent = "나의 초대 코드 · 상대에게 보내세요";
    $("local-code-panel").hidden = false;
    $("online-status").textContent =
      "초대 코드를 상대에게 보내고, 상대의 응답 코드를 적용하세요.";
  });
$("apply-code").onclick = () =>
  networking(async () => {
    if (connected) throw new Error("이미 대전에 연결되어 있습니다.");
    if (tab === "host") {
      await peer.accept($("remote-code").value);
      $("online-status").textContent = "상대와 연결 중…";
    } else {
      $("online-status").textContent = "응답 코드 생성 중…";
      const code = await peer.answer($("remote-code").value);
      $("local-code").value = code;
      $("local-label").textContent = "나의 응답 코드 · 방장에게 보내세요";
      $("local-code-panel").hidden = false;
      $("online-status").textContent =
        "응답 코드를 방장에게 보내세요. 방장이 적용하면 대전이 시작됩니다.";
    }
  });
$("copy-code").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("local-code").value);
    toast("연결 코드를 복사했습니다.");
  } catch {
    $("local-code").select();
    toast("코드가 선택되었습니다. Ctrl+C / ⌘C로 복사하세요.");
  }
};
$("disconnect-button").onclick = () => {
  peer.close();
  connected = false;
  role = null;
  resetMatch();
  updateMode();
  $("online-dialog").close();
  $("online-status").textContent = "연결을 해제했습니다.";
  $("local-code-panel").hidden = true;
  $("remote-code").value = "";
};
const levels = { high: "상단", mid: "중단", low: "하단", throw: "잡기" };
$("move-list").innerHTML = Object.entries(MOVES)
  .map(
    ([key, m]) =>
      `<div class="move-item"><kbd>${m.command.split(" · ")[0]}</kbd><div>${m.name}<p>${levels[m.level]} · ${m.launch ? "공중으로 띄우기" : m.level === "throw" ? "근접 · 가드 불가" : `사거리 ${m.range.toFixed(1)}m`}</p></div><small>${m.damage} DMG</small></div>`,
  )
  .join("");
$("moves-button").onclick = () => {
  if (!connected) {
    paused = true;
    setPauseLabel();
  }
  keyboard.clear();
  $("moves-dialog").showModal();
};
for (const dialog of document.querySelectorAll("dialog"))
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
function updateHUD() {
  match.fighters.forEach((f, i) => {
    $(`health-${i}`).style.width = `${Math.max(0, (f.hp / MAX_HP) * 100)}%`;
    const dots = $(`rounds-${i}`).querySelectorAll("i");
    dots.forEach((dot, n) => dot.classList.toggle("won", match.wins[i] > n));
  });
  $("timer").textContent = String(Math.ceil(match.time)).padStart(2, "0");
  $("round-number").textContent = String(match.round).padStart(2, "0");
  let title = "",
    sub = "";
  if (connectionLost) {
    title = "DISCONNECTED";
    sub = "연결 종료 · 연습 대전을 선택하세요";
  } else if (
    connected &&
    role === "guest" &&
    performance.now() - lastStateAt > 2000
  ) {
    title = "WAITING";
    sub = "호스트의 응답을 기다리는 중";
  } else if (paused) {
    title = "PAUSED";
    sub = "계속하려면 ▶ 버튼 또는 ESC";
  } else if (match.phase === "ready") {
    title = match.phaseTime > 0.5 ? `ROUND ${match.round}` : "READY";
    sub = connected ? "P2P ONLINE MATCH" : "PRACTICE MATCH";
  } else if (match.phase === "fight" && match.time > 59.4) {
    title = "FIGHT";
    sub = "";
  } else if (match.phase === "roundEnd") {
    title = match.time > 0 ? "K.O." : "TIME UP";
    sub =
      match.winner === -1
        ? "DRAW"
        : `${match.winner === 0 ? "KAI" : "REN"} WINS THE ROUND`;
  } else if (match.phase === "matchEnd") {
    title =
      match.winner === -1
        ? "DRAW"
        : `${match.winner === 0 ? "KAI" : "REN"} WINS`;
    sub =
      connected && role === "guest"
        ? "호스트가 다음 대전을 시작할 수 있습니다"
        : "다시 시작 ↻ 버튼으로 다음 대전";
  }
  $("announcement").classList.toggle("hidden", !title);
  $("announcement-text").textContent = title;
  $("announcement-sub").textContent = sub;
  const f = match.fighters[connected && role === "guest" ? 1 : 0];
  const arrows = {
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
  $("current-move").textContent =
    f.lastMoveAge < 1.5 && MOVES[f.lastMove]
      ? MOVES[f.lastMove].name
      : "U LP / I RP / J LK / K RK";
  $("stage-depth").textContent =
    `X ${f.x.toFixed(1)} / Z ${f.z.toFixed(1)} · ∞`;

  $("combo-display").hidden = f.combo < 2 || f.comboAge > 1.3;
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
    if (connected && role === "guest") {
      peer.send({ type: "input", input: localInput() });
    } else if (!paused && !connectionLost) {
      const input = localInput();
      if (
        connected &&
        performance.now() - lastInputAt > 500 &&
        remoteInput.queue.length === 0
      )
        remoteInput.clear();
      const opponent = connected ? remoteInput.sample() : cpuInput(match);
      step(match, [input, opponent]);
      eventEffects(match.events);
      if (connected) {
        remoteEvents.push(...match.events);
        if (++netTick % 3 === 0) {
          peer.send({
            type: "state",
            state: { ...match, events: [] },
            events: remoteEvents.splice(0),
          });
        }
      }
    }
  }
  updateHUD();
  scene?.render(match);
  requestAnimationFrame(frame);
}
updateMode();
requestAnimationFrame(frame);
// Read-only inspection hooks for smoke tests and debugging, with no network credentials.
window.axis = {
  get inputs() {
    return {
      held: [...keyboard.held],
      remote: structuredClone(remoteInput.latest),
      remoteAge: performance.now() - lastInputAt,
      queued: remoteInput.queue.length,
    };
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
};
