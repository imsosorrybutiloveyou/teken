import { MOVES, MAX_HP } from "./combat.js";
export function encodeDescription(description) {
  return (
    "AXIS2." +
    btoa(JSON.stringify({ type: description.type, sdp: description.sdp }))
  );
}
export function decodeDescription(code, expectedType) {
  if (
    typeof code !== "string" ||
    code.length > 100000 ||
    !code.trim().startsWith("AXIS2.")
  )
    throw new Error(
      "AXIS v2 연결 코드가 필요합니다. 두 사람 모두 최신 버전을 사용하세요.",
    );
  let v;
  try {
    v = JSON.parse(atob(code.trim().slice(6)));
  } catch {
    throw new Error("연결 코드가 손상되었습니다. 전체 코드를 다시 복사하세요.");
  }
  if (
    v?.type !== expectedType ||
    typeof v.sdp !== "string" ||
    !v.sdp.startsWith("v=0") ||
    v.sdp.length > 64000
  )
    throw new Error(
      expectedType === "offer"
        ? "방장이 보낸 초대 코드가 필요합니다."
        : "참가자가 보낸 응답 코드가 필요합니다.",
    );
  return { type: v.type, sdp: v.sdp };
}
export function validSnapshot(v) {
  if (
    !v ||
    v.version !== 2 ||
    !["ready", "fight", "roundEnd", "matchEnd"].includes(v.phase) ||
    !Number.isFinite(v.time) ||
    v.time < 0 ||
    v.time > 60 ||
    !Number.isInteger(v.round) ||
    v.round < 1 ||
    !Number.isFinite(v.phaseTime) ||
    !Number.isInteger(v.tick)
  )
    return false;
  if (
    !Array.isArray(v.wins) ||
    v.wins.length !== 2 ||
    !v.wins.every((n) => Number.isInteger(n) && n >= 0 && n <= 2)
  )
    return false;
  if (!Array.isArray(v.fighters) || v.fighters.length !== 2) return false;
  return v.fighters.every(
    (f) =>
      f &&
      [
        "x",
        "z",
        "y",
        "vy",
        "hp",
        "facing",
        "angle",
        "stun",
        "combo",
        "comboDamage",
        "comboAge",
        "chain",
        "chainAge",
        "bufferAge",
        "move",
        "hitFlash",
      ].every((k) => Number.isFinite(f[k]) && Math.abs(f[k]) < 1e12) &&
      f.hp >= 0 &&
      f.hp <= MAX_HP &&
      f.y >= 0 &&
      f.y < 5 &&
      Number.isFinite(f.commandTime) &&
      Number.isFinite(f.dash) &&
      Number.isFinite(f.lastMoveAge) &&
      Number.isFinite(f.travel) &&
      typeof f.lastMove === "string" &&
      f.lastMove.length < 40 &&
      Number.isInteger(f.direction) &&
      f.direction >= 1 &&
      f.direction <= 9 &&
      Array.isArray(f.commands) &&
      f.commands.length <= 16 &&
      f.commands.every(
        (e) =>
          e &&
          Number.isInteger(e.dir) &&
          e.dir >= 1 &&
          e.dir <= 9 &&
          Number.isFinite(e.at),
      ) &&
      typeof f.guard === "boolean" &&
      typeof f.crouch === "boolean" &&
      (!f.attack ||
        (Object.hasOwn(MOVES, f.attack.key) &&
          Number.isFinite(f.attack.t) &&
          Number.isFinite(f.attack.angle))),
  );
}
export class PeerSession {
  constructor({ onStatus, onOpen, onMessage, onClose }) {
    this.callbacks = { onStatus, onOpen, onMessage, onClose };
    this.peer = null;
    this.channel = null;
    this.role = null;
    this.generation = 0;
    this.opened = false;
    this.closed = true;
  }
  init(role) {
    this.close();
    if (!globalThis.RTCPeerConnection)
      throw new Error(
        "이 브라우저는 WebRTC를 지원하지 않습니다. 최신 Chrome 또는 Firefox를 사용하세요.",
      );
    this.closed = false;
    this.role = role;
    this.opened = false;
    const generation = this.generation;
    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.peer.onconnectionstatechange = () => {
      if (generation !== this.generation) return;
      const state = this.peer.connectionState;
      if (state === "failed")
        this.fail(
          "직접 연결 실패: 방화벽 또는 NAT 제한일 수 있습니다. 다른 네트워크에서 새 코드로 시도하세요.",
        );
      if (state === "disconnected") {
        this.callbacks.onStatus("연결이 끊겼습니다. 재연결을 기다리는 중…");
        clearTimeout(this.disconnectTimer);
        this.disconnectTimer = setTimeout(() => {
          if (this.peer?.connectionState === "disconnected")
            this.fail("연결이 복구되지 않았습니다. 새 방을 만들어 주세요.");
        }, 8000);
      }
      if (state === "connected") {
        clearTimeout(this.disconnectTimer);
        this.callbacks.onStatus("P2P 연결 완료 · 대전 중");
      }
    };
    this.peer.ondatachannel = (e) => this.attach(e.channel, generation);
    if (role === "host")
      this.attach(
        this.peer.createDataChannel("axis-match", { ordered: true }),
        generation,
      );
  }
  attach(channel, generation) {
    this.channel = channel;
    channel.onopen = () => {
      if (this.generation !== generation) return;
      this.opened = true;
      clearTimeout(this.connectTimer);
      this.callbacks.onStatus("P2P 연결 완료 · 대전 중");
      this.callbacks.onOpen(this.role);
    };
    channel.onmessage = (e) => {
      if (
        generation !== this.generation ||
        typeof e.data !== "string" ||
        e.data.length > 64000
      )
        return;
      try {
        const msg = JSON.parse(e.data);
        if (msg && typeof msg === "object") this.callbacks.onMessage(msg);
      } catch {
        /* Ignore malformed messages from untrusted peers. */
      }
    };
    channel.onclose = () => {
      if (generation === this.generation && !this.closed)
        this.fail("상대와의 연결이 종료되었습니다.");
    };
    channel.onerror = () => {
      if (generation === this.generation)
        this.fail("대전 채널 오류가 발생했습니다. 새 코드를 생성해 주세요.");
    };
  }
  async gather() {
    const peer = this.peer,
      generation = this.generation;
    await new Promise((resolve) => {
      if (peer.iceGatheringState === "complete") return resolve();
      const done = () => {
        clearTimeout(timer);
        peer.removeEventListener("icegatheringstatechange", check);
        resolve();
      };
      const check = () => {
        if (peer.iceGatheringState === "complete") done();
      };
      const timer = setTimeout(done, 12000);
      peer.addEventListener("icegatheringstatechange", check);
    });
    if (generation !== this.generation || !peer.localDescription)
      throw new Error("연결 준비가 취소되었습니다.");
    return encodeDescription(peer.localDescription);
  }
  async offer() {
    this.init("host");
    await this.peer.setLocalDescription(await this.peer.createOffer());
    return this.gather();
  }
  async answer(code) {
    const offer = decodeDescription(code, "offer");
    this.init("guest");
    await this.peer.setRemoteDescription(offer);
    await this.peer.setLocalDescription(await this.peer.createAnswer());
    return this.gather();
  }
  async accept(code) {
    if (this.role !== "host" || !this.peer)
      throw new Error("먼저 초대 코드를 생성하세요.");
    const answer = decodeDescription(code, "answer");
    await this.peer.setRemoteDescription(answer);
    this.waitForConnection();
  }
  waitForConnection() {
    clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => {
      if (!this.opened)
        this.fail(
          "연결 시간이 초과되었습니다. 양쪽에서 새 코드로 다시 시도하세요. 일부 NAT에서는 TURN 서버가 필요합니다.",
        );
    }, 40000);
  }
  send(message) {
    if (
      this.channel?.readyState === "open" &&
      this.channel.bufferedAmount < 64000
    ) {
      try {
        this.channel.send(JSON.stringify(message));
      } catch {
        this.fail("데이터 전송이 중단되었습니다.");
      }
    }
  }
  fail(message) {
    const wasOpen = this.opened;
    this.close();
    this.callbacks.onStatus(message);
    this.callbacks.onClose(wasOpen, message);
  }
  close() {
    this.closed = true;
    this.generation++;
    this.opened = false;
    clearTimeout(this.disconnectTimer);
    clearTimeout(this.connectTimer);
    this.channel?.close();
    this.peer?.close();
    this.channel = null;
    this.peer = null;
    this.role = null;
  }
}
