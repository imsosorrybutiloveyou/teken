import { randomBytes, timingSafeEqual } from "node:crypto";
import { CHARACTER_IDS } from "../src/characters.js";
const id = () => randomBytes(16).toString("hex");
export function createLobby({
  graceMs = 15000,
  sessionTtl = 300000,
  maxSessions = 500,
} = {}) {
  let closing = false;
  const clients = new Map(),
    rooms = new Map(),
    matches = new Map(),
    queue = [],
    rates = new Map();
  const send = (client, message) => {
    if (!client) return;
    if (client.stream && !client.stream.destroyed) {
      client.stream.write(`data: ${JSON.stringify(message)}\n\n`);
    } else {
      client.pending.push(message);
      if (client.pending.length > 100) client.pending.shift();
    }
  };
  const roomList = () =>
    [...rooms.values()].map((r) => ({
      id: r.id,
      name: r.name,
      host: clients.get(r.host)?.name ?? "PLAYER",
      players: 1,
      capacity: 2,
    }));
  const broadcast = () => {
    const message = {
      type: "rooms",
      rooms: roomList(),
      online: clients.size,
      waiting: queue.length,
    };
    for (const c of clients.values()) send(c, message);
  };
  function leave(c, notify = true) {
    for (let n = queue.length - 1; n >= 0; n--)
      if (queue[n] === c.id) queue.splice(n, 1);
    for (const [key, r] of rooms) if (r.host === c.id) rooms.delete(key);
    if (c.match) {
      const match = matches.get(c.match);
      matches.delete(c.match);
      if (match)
        for (const key of match.players) {
          const other = clients.get(key);
          if (other) {
            other.match = null;
            if (notify && key !== c.id)
              send(other, {
                type: "opponentLeft",
                message: "상대가 대전을 떠났습니다.",
              });
          }
        }
      c.match = null;
    }
  }
  function pair(a, b, mode) {
    if (!a || !b || a === b || a.match || b.match)
      throw Error("이미 참가 중인 플레이어입니다.");
    leave(a, false);
    leave(b, false);
    const match = {
      id: id(),
      players: [a.id, b.id],
      picks: [null, null],
      mode,
    };
    matches.set(match.id, match);
    a.match = match.id;
    b.match = match.id;
    send(a, {
      type: "paired",
      matchId: match.id,
      role: "host",
      opponent: b.name,
      mode,
    });
    send(b, {
      type: "paired",
      matchId: match.id,
      role: "guest",
      opponent: a.name,
      mode,
    });
    broadcast();
  }
  const fail = (response, status, message) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: message }));
  };
  function auth(url, request) {
    const c = clients.get(url.searchParams.get("id") ?? request.sessionId);
    const provided =
      url.searchParams.get("token") ??
      request.headers.authorization?.replace(/^Bearer /, "");
    if (
      !c ||
      typeof provided !== "string" ||
      !/^[a-f0-9]{32}$/.test(provided) ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(c.token))
    )
      return null;
    c.seen = Date.now();
    return c;
  }
  async function json(request) {
    let size = 0,
      parts = [];
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 100000) throw Error("요청이 너무 큽니다.");
      parts.push(chunk);
    }
    try {
      return JSON.parse(Buffer.concat(parts).toString() || "{}");
    } catch {
      throw Error("올바른 JSON 요청이 필요합니다.");
    }
  }
  async function handler(request, response) {
    const url = new URL(request.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) return false;
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Cache-Control", "no-store");
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return true;
    }
    const address = request.socket.remoteAddress ?? "unknown",
      now = Date.now();
    let rate = rates.get(address);
    if (!rate || now - rate.at > 10000) {
      rate = { at: now, count: 0, sessions: 0 };
      rates.set(address, rate);
    }
    if (++rate.count > 600) {
      fail(response, 429, "요청이 너무 많습니다. 잠시 후 다시 시도하세요.");
      return true;
    }
    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            service: "axis-matchmaking",
            version: 5,
            online: clients.size,
          }),
        );
        return true;
      }
      if (url.pathname === "/api/sessions" && request.method === "POST") {
        if (clients.size >= maxSessions || ++rate.sessions > 12) {
          fail(response, 429, "서버가 혼잡합니다. 잠시 후 다시 시도하세요.");
          return true;
        }
        const body = await json(request),
          name =
            typeof body.name === "string"
              ? body.name.trim().slice(0, 24)
              : "PLAYER";
        const c = {
          id: id(),
          token: id(),
          name: name || "PLAYER",
          pending: [],
          stream: null,
          seen: now,
          match: null,
          disconnectTimer: null,
        };
        clients.set(c.id, c);
        response.writeHead(201, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ id: c.id, token: c.token }));
        return true;
      }
      if (url.pathname === "/api/events" && request.method === "GET") {
        const c = auth(url, request);
        if (!c) {
          fail(response, 401, "세션이 만료되었습니다. 다시 연결하세요.");
          return true;
        }
        clearTimeout(c.disconnectTimer);
        if (c.stream && !c.stream.destroyed) c.stream.end();
        c.stream = response;
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        response.write(": connected\n\n");
        send(c, { type: "welcome", id: c.id });
        for (const message of c.pending.splice(0)) send(c, message);
        send(c, {
          type: "rooms",
          rooms: roomList(),
          online: clients.size,
          waiting: queue.length,
        });
        if (c.match) {
          const m = matches.get(c.match);
          if (m) send(c, { type: "selection", picks: m.picks });
        }
        response.on("close", () => {
          if (closing || c.stream !== response) return;
          c.stream = null;
          c.disconnectTimer = setTimeout(() => {
            leave(c);
            clients.delete(c.id);
            broadcast();
          }, graceMs);
        });
        return true;
      }
      if (url.pathname === "/api/actions" && request.method === "POST") {
        const body = await json(request);
        request.sessionId = body.id;
        const c = auth(url, request);
        if (!c) {
          fail(response, 401, "세션이 만료되었습니다. 다시 연결하세요.");
          return true;
        }
        switch (body.type) {
          case "quick": {
            if (c.match) throw Error("현재 대전을 먼저 종료하세요.");
            leave(c);
            const candidate = queue
              .map((key) => clients.get(key))
              .find(
                (other) =>
                  other &&
                  other.id !== c.id &&
                  !other.match &&
                  other.stream &&
                  !other.stream.destroyed,
              );
            if (candidate) pair(candidate, c, "quick");
            else {
              queue.push(c.id);
              send(c, { type: "queued", mode: "quick" });
              broadcast();
            }
            break;
          }
          case "createRoom": {
            if (c.match) throw Error("현재 대전을 먼저 종료하세요.");
            leave(c);
            const name =
              typeof body.name === "string"
                ? body.name.trim().slice(0, 40)
                : "";
            if (!name) throw Error("방 제목을 입력하세요.");
            const room = { id: id(), name, host: c.id };
            rooms.set(room.id, room);
            send(c, { type: "queued", mode: "room", roomId: room.id });
            broadcast();
            break;
          }
          case "joinRoom": {
            if (c.match) throw Error("현재 대전을 먼저 종료하세요.");
            const r = rooms.get(body.roomId);
            if (!r) throw Error("이미 시작되었거나 종료된 방입니다.");
            const host = clients.get(r.host);
            if (!host || !host.stream || host.stream.destroyed)
              throw Error("방장이 연결되어 있지 않습니다.");
            if (host.id === c.id)
              throw Error("자신의 방에는 참가할 수 없습니다.");
            pair(host, c, "room");
            break;
          }
          case "cancel":
            leave(c);
            send(c, { type: "idle" });
            broadcast();
            break;
          case "select": {
            const m = matches.get(c.match);
            if (!m) throw Error("매칭된 후 캐릭터를 선택할 수 있습니다.");
            if (!CHARACTER_IDS.includes(body.character))
              throw Error("올바른 캐릭터를 선택하세요.");
            const index = m.players.indexOf(c.id);
            if (m.picks[index])
              throw Error("확정된 캐릭터는 변경할 수 없습니다.");
            m.picks[index] = body.character;
            for (const key of m.players)
              send(clients.get(key), { type: "selection", picks: m.picks });
            if (m.picks.every(Boolean))
              for (const key of m.players)
                send(clients.get(key), {
                  type: "rosterLocked",
                  characters: m.picks,
                });
            break;
          }
          case "signal": {
            const m = matches.get(c.match);
            if (!m) throw Error("연결할 상대가 없습니다.");
            const data = body.data;
            if (!data || !["offer", "answer", "candidate"].includes(data.type))
              throw Error("올바른 연결 메시지가 아닙니다.");
            if (
              data.type !== "candidate" &&
              (typeof data.sdp !== "string" || data.sdp.length > 64000)
            )
              throw Error("연결 데이터가 너무 큽니다.");
            if (
              data.type === "candidate" &&
              data.candidate !== null &&
              (typeof data.candidate?.candidate !== "string" ||
                data.candidate.candidate.length > 4096)
            )
              throw Error("올바른 ICE 후보가 아닙니다.");
            send(clients.get(m.players.find((key) => key !== c.id)), {
              type: "signal",
              data,
            });
            break;
          }
          default:
            throw Error("지원하지 않는 요청입니다.");
        }
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end('{"ok":true}');
        return true;
      }
      fail(response, 404, "API 경로를 찾을 수 없습니다.");
    } catch (error) {
      if (!response.headersSent) fail(response, 400, error.message);
      else response.end();
    }
    return true;
  }
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [key, c] of clients) {
      if (c.stream && !c.stream.destroyed) c.stream.write(": heartbeat\n\n");
      else if (!c.disconnectTimer && now - c.seen > sessionTtl) {
        leave(c);
        clients.delete(key);
      }
    }
    for (const [key, r] of rates) if (now - r.at > 60000) rates.delete(key);
  }, 10000);
  heartbeat.unref();
  return {
    handler,
    close() {
      closing = true;
      clearInterval(heartbeat);
      for (const c of clients.values()) {
        clearTimeout(c.disconnectTimer);
        c.stream?.end();
      }
      clients.clear();
      rooms.clear();
      matches.clear();
      queue.length = 0;
    },
    stats: () => ({
      sessions: clients.size,
      rooms: rooms.size,
      matches: matches.size,
      queued: queue.length,
    }),
  };
}
