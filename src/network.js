import { STAGES } from "./stages.js";
import { MAX_HP } from "./combat.js";
import { CHARACTER_IDS, character } from "./characters.js";
export function validSnapshot(v) {
  if (
    !v ||
    v.version !== 17 ||
    typeof v.stage !== "string" ||
    !Object.hasOwn(STAGES, v.stage) ||
    !["ready", "fight", "roundEnd", "matchEnd"].includes(v.phase) ||
    !Number.isFinite(v.time) ||
    v.time < 0 ||
    v.time > 60 ||
    !Number.isInteger(v.round) ||
    v.round < 1 ||
    !Number.isFinite(v.phaseTime) ||
    !Number.isInteger(v.tick) ||
    !Number.isFinite(v.axisAngle) ||
    !Number.isFinite(v.viewAngle) ||
    !Number.isFinite(v.hitstop) ||
    v.hitstop < 0 ||
    v.hitstop > 1
  )
    return false;
  if (
    !Array.isArray(v.wins) ||
    v.wins.length !== 2 ||
    !v.wins.every((n) => Number.isInteger(n) && n >= 0 && n <= 2) ||
    !Array.isArray(v.fighters) ||
    v.fighters.length !== 2
  )
    return false;
  if (
    !Array.isArray(v.projectiles) ||
    v.projectiles.length > 8 ||
    !v.projectiles.every(
      (s) =>
        s &&
        [0, 1].includes(s.index) &&
        character(v.fighters[s.index]?.character).moves[s.key]?.projectile &&
        ["x", "z", "y", "angle", "life"].every(
          (k) => Number.isFinite(s[k]) && Math.abs(s[k]) < 1e12,
        ) &&
        s.life >= 0 &&
        s.life <= 1.6 &&
        s.y >= 0 &&
        s.y <= 3,
    )
  )
    return false;
  return v.fighters.every(
    (f) =>
      f &&
      CHARACTER_IDS.includes(f.character) &&
      [
        "x",
        "z",
        "y",
        "vy",
        "vx",
        "vz",
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
        "commandTime",
        "dash",
        "lastMoveAge",
        "travel",
        "riseWindow",
        "throwTime",
        "throwRole",
        "airHits",
        "airOwner",
        "wakeUp",
        "downTime",
        "lastHitBy",
      ].every((k) => Number.isFinite(f[k]) && Math.abs(f[k]) < 1e12) &&
      f.riseWindow >= 0 &&
      f.riseWindow <= 0.23 &&
      f.throwTime >= 0 &&
      f.throwTime <= 0.43 &&
      [-1, 0, 1].includes(f.throwRole) &&
      typeof f.wasCrouch === "boolean" &&
      ["verticalDir", "verticalTapDir", "sideStepDir"].every((k) =>
        [-1, 0, 1].includes(f[k]),
      ) &&
      ["verticalTime", "verticalTapAge", "sideStepTime", "backDash"].every(
        (k) => Number.isFinite(f[k]) && f[k] >= 0 && f[k] < 1e7,
      ) &&
      Number.isInteger(f.verticalCount) &&
      f.verticalCount >= 0 &&
      f.verticalCount < 1e7 &&
      Number.isInteger(f.wallHits) &&
      f.wallHits >= 0 &&
      f.wallHits <= 3 &&
      typeof f.wallSplatUsed === "boolean" &&
      Number.isFinite(f.ki) &&
      f.ki >= 0 &&
      f.ki <= 40 &&
      Number.isFinite(f.runCharge) &&
      f.runCharge >= 0 &&
      f.runCharge < 1e7 &&
      typeof f.running === "boolean" &&
      typeof f.punishCombo === "boolean" &&
      Number.isInteger(f.basicAirHits) &&
      f.basicAirHits >= 0 &&
      f.basicAirHits < 1000000 &&
      typeof f.verticalUsed === "boolean" &&
      typeof f.hopCombo === "boolean" &&
      Number.isFinite(f.effectiveOrbit) &&
      Math.abs(f.effectiveOrbit) <= 1 &&
      typeof f.jumpHeld === "boolean" &&
      typeof f.jumpActive === "boolean" &&
      Number.isFinite(f.jumpBuffer) &&
      f.jumpBuffer >= 0 &&
      f.jumpBuffer <= 0.25 &&
      f.hp >= 0 &&
      f.hp <= MAX_HP &&
      f.y >= 0 &&
      f.y < 5 &&
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
      Number.isInteger(f.airHits) &&
      f.airHits >= 0 &&
      f.airHits <= 1000000 &&
      [-1, 0, 1].includes(f.airOwner) &&
      [-1, 0, 1].includes(f.lastHitBy) &&
      f.downTime >= 0 &&
      f.downTime <= 2 &&
      f.wakeUp >= 0 &&
      f.wakeUp <= 2 &&
      typeof f.bounceUsed === "boolean" &&
      typeof f.bouncePending === "boolean" &&
      ["high", "mid", "low", "throw"].includes(f.hitLevel) &&
      typeof f.hitKind === "string" &&
      f.hitKind.length <= 24 &&
      typeof f.guard === "boolean" &&
      typeof f.crouch === "boolean" &&
      (!f.attack ||
        (Object.hasOwn(character(f.character).moves, f.attack.key) &&
          Number.isFinite(f.attack.t) &&
          Number.isFinite(f.attack.angle) &&
          (f.attack.height === undefined ||
            (Number.isFinite(f.attack.height) &&
              f.attack.height >= 0 &&
              f.attack.height <= 3)))),
  );
}
export class PeerSession {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.generation = 0;
    this.closed = true;
    this.peer = null;
    this.channel = null;
  }
  async connect(role, sendSignal) {
    this.close();
    if (document.querySelector('meta[name="axis-server"]')) {
      this.role = role;
      this.closed = false;
      this.opened = true;
      this.relayQueue = [];
      this.relayTimer = setInterval(async () => {
        if (this.relayBusy || !this.relayQueue.length) return;
        this.relayBusy = true;
        try {
          await sendSignal({
            type: "relay",
            packets: this.relayQueue.splice(0, 8),
          });
        } catch {
          this.fail("LAN 서버 연결이 끊겼습니다.");
        } finally {
          this.relayBusy = false;
        }
      }, 20);
      this.callbacks.onStatus("AXIS SERVER · LAN 중계 연결");
      this.callbacks.onOpen(role);
      return;
    }
    if (!globalThis.RTCPeerConnection)
      throw Error("최신 Chrome, Edge 또는 Firefox가 필요합니다.");
    this.role = role;
    this.closed = false;
    this.opened = false;
    this.candidates = [];
    this.signalChain = Promise.resolve();
    const generation = this.generation;
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.peer = peer;
    peer.onicecandidate = (e) => {
      if (generation === this.generation && e.candidate)
        Promise.resolve(
          sendSignal({ type: "candidate", candidate: e.candidate.toJSON() }),
        ).catch(() =>
          this.fail("연결 후보를 전달하지 못했습니다. 매칭 서버를 확인하세요."),
        );
    };
    this.sendSignal = sendSignal;
    peer.ondatachannel = (e) => this.attach(e.channel, generation);
    peer.onconnectionstatechange = () => {
      if (generation !== this.generation) return;
      if (peer.connectionState === "failed")
        this.fail(
          "P2P 연결 실패: NAT/방화벽 제한일 수 있습니다. 다른 네트워크를 사용하거나 TURN 중계를 설정해야 합니다.",
        );
      if (peer.connectionState === "disconnected") {
        this.callbacks.onStatus("상대와 재연결 중…");
        clearTimeout(this.disconnectTimer);
        this.disconnectTimer = setTimeout(() => {
          if (peer.connectionState === "disconnected")
            this.fail("상대와의 연결이 복구되지 않았습니다.");
        }, 8000);
      }
      if (peer.connectionState === "connected")
        clearTimeout(this.disconnectTimer);
    };
    if (role === "host") {
      this.attach(
        peer.createDataChannel("axis-v13", { ordered: true }),
        generation,
      );
      await peer.setLocalDescription(await peer.createOffer());
      if (generation !== this.generation) return;
      await sendSignal({ type: "offer", sdp: peer.localDescription.sdp });
    }
    this.connectTimer = setTimeout(() => {
      if (!this.opened)
        this.fail(
          "P2P 연결 시간이 초과되었습니다. 매칭은 되었지만 직접 연결이 불가능할 수 있습니다.",
        );
    }, 30000);
  }
  receive(data) {
    if (this.relayTimer && data?.type === "relay") {
      for (const packet of (Array.isArray(data.packets)
        ? data.packets
        : []
      ).slice(0, 8))
        if (
          packet &&
          typeof packet === "object" &&
          ["input", "state"].includes(packet.type)
        )
          this.callbacks.onMessage(packet);
      return;
    }
    const generation = this.generation;
    this.signalChain = this.signalChain
      .then(async () => {
        if (this.closed || generation !== this.generation) return;
        const peer = this.peer;
        if (data.type === "candidate") {
          if (!data.candidate) return;
          if (peer.remoteDescription)
            await peer.addIceCandidate(data.candidate);
          else this.candidates.push(data.candidate);
          return;
        }
        if (
          !["offer", "answer"].includes(data.type) ||
          typeof data.sdp !== "string"
        )
          return;
        if (
          (data.type === "offer" && this.role !== "guest") ||
          (data.type === "answer" && this.role !== "host")
        )
          return;
        await peer.setRemoteDescription({ type: data.type, sdp: data.sdp });
        for (const candidate of this.candidates.splice(0))
          await peer.addIceCandidate(candidate);
        if (data.type === "offer") {
          await peer.setLocalDescription(await peer.createAnswer());
          await this.sendSignal({
            type: "answer",
            sdp: peer.localDescription.sdp,
          });
        }
      })
      .catch(() => {
        if (generation === this.generation)
          this.fail("P2P 연결 정보를 적용하지 못했습니다. 다시 매칭해 주세요.");
      });
  }
  attach(channel, generation) {
    this.channel = channel;
    channel.onopen = () => {
      if (generation !== this.generation) return;
      this.opened = true;
      clearTimeout(this.connectTimer);
      this.callbacks.onStatus("P2P 연결 완료");
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
        /* Untrusted packets are ignored. */
      }
    };
    channel.onclose = () => {
      if (generation === this.generation && !this.closed)
        this.fail("상대가 대전을 종료했습니다.");
    };
    channel.onerror = () => {
      if (generation === this.generation)
        this.fail("P2P 채널에 오류가 발생했습니다.");
    };
  }
  send(message) {
    if (this.relayTimer && !this.closed) {
      if (this.relayQueue.length >= 32) {
        this.fail("LAN 서버가 응답하지 않습니다.");
        return;
      }
      this.relayQueue.push(message);
      return;
    }
    if (
      this.channel?.readyState === "open" &&
      this.channel.bufferedAmount < 64000
    ) {
      try {
        this.channel.send(JSON.stringify(message));
      } catch {
        this.fail("상대에게 데이터를 전송하지 못했습니다.");
      }
    }
  }
  fail(message) {
    if (this.closed) return;
    const wasOpen = this.opened;
    this.close();
    this.callbacks.onStatus(message);
    this.callbacks.onClose(wasOpen, message);
  }
  close() {
    clearInterval(this.relayTimer);
    this.relayTimer = null;
    this.relayQueue = [];
    this.relayBusy = false;
    this.closed = true;
    this.generation++;
    this.opened = false;
    clearTimeout(this.connectTimer);
    clearTimeout(this.disconnectTimer);
    this.channel?.close();
    this.peer?.close();
    this.channel = null;
    this.peer = null;
    this.role = null;
  }
}
