import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { createLobby } from "./lobby.js";
async function fixture(t) {
  const lobby = createLobby({ graceMs: 70 }),
    server = http.createServer((req, res) => {
      lobby.handler(req, res).then((handled) => {
        if (!handled) {
          res.writeHead(404);
          res.end();
        }
      });
    });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`,
    controllers = [];
  t.after(() => {
    for (const c of controllers) c.abort();
    lobby.close();
    server.closeAllConnections();
    server.close();
  });
  async function client(name) {
    const auth = await fetch(base + "/api/sessions", {
        method: "POST",
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
      control = new AbortController();
    controllers.push(control);
    const response = await fetch(
      `${base}/api/events?id=${auth.id}&token=${auth.token}`,
      { signal: control.signal },
    );
    const messages = [],
      waiters = [];
    const reader = response.body.getReader();
    let buffer = "";
    (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += new TextDecoder().decode(value);
          let end;
          while ((end = buffer.indexOf("\n\n")) !== -1) {
            const text = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const line = text.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const event = JSON.parse(line.slice(6));
            const index = waiters.findIndex(
              (w) => w.type === event.type && w.predicate(event),
            );
            if (index >= 0) {
              const [w] = waiters.splice(index, 1);
              clearTimeout(w.timer);
              w.resolve(event);
            } else messages.push(event);
          }
        }
      } catch {
        /* Test teardown aborts streams. */
      }
    })();
    return {
      ...auth,
      abort: () => control.abort(),
      async action(type, extra = {}) {
        const response = await fetch(base + "/api/actions", {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ id: auth.id, type, ...extra }),
        });
        return { status: response.status, data: await response.json() };
      },
      wait(type, predicate = () => true) {
        const index = messages.findIndex(
          (e) => e.type === type && predicate(e),
        );
        if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
        return new Promise((resolve, reject) => {
          const w = {
            type,
            predicate,
            resolve,
            timer: setTimeout(() => {
              waiters.splice(waiters.indexOf(w), 1);
              reject(Error("Missing SSE event " + type));
            }, 3000),
          };
          waiters.push(w);
        });
      },
    };
  }
  return { base, lobby, client };
}
test("quick match pairs distinct waiting players and selects characters only after matching", async (t) => {
  const f = await fixture(t),
    a = await f.client("Alpha"),
    b = await f.client("Beta");
  assert.equal((await a.action("select", { character: "kai" })).status, 400);
  await a.action("quick");
  await a.wait("queued");
  await b.action("quick");
  const pa = await a.wait("paired"),
    pb = await b.wait("paired");
  assert.equal(pa.matchId, pb.matchId);
  assert.equal(pa.role, "host");
  assert.equal(pb.role, "guest");
  await a.action("select", { character: "mira" });
  assert.deepEqual((await b.wait("selection")).picks, ["mira", null]);
  await b.action("select", { character: "goro" });
  assert.deepEqual((await a.wait("rosterLocked")).characters, ["mira", "goro"]);
  assert.deepEqual((await b.wait("rosterLocked")).characters, ["mira", "goro"]);
  assert.equal((await a.action("select", { character: "kai" })).status, 400);
});
test("player rooms are listed and chosen, then disappear when occupied", async (t) => {
  const f = await fixture(t),
    a = await f.client("Host"),
    b = await f.client("Guest");
  await a.action("createRoom", { name: "테스트 방" });
  const list = await b.wait("rooms", (e) =>
    e.rooms.some((r) => r.name === "테스트 방"),
  );
  const room = list.rooms.find((r) => r.name === "테스트 방");
  assert.equal((await b.action("joinRoom", { roomId: room.id })).status, 200);
  await a.wait("paired");
  await b.wait("paired");
  await b.wait("rooms", (e) => e.rooms.length === 0);
  assert.equal((await b.action("joinRoom", { roomId: room.id })).status, 400);
});
test("only paired players relay signals and cancellation permits another match", async (t) => {
  const f = await fixture(t),
    a = await f.client("A"),
    b = await f.client("B"),
    c = await f.client("C");
  assert.equal(
    (await c.action("signal", { data: { type: "offer", sdp: "v=0" } })).status,
    400,
  );
  await a.action("quick");
  await b.action("quick");
  await a.wait("paired");
  await a.action("signal", { data: { type: "offer", sdp: "v=0\r\ns=test" } });
  assert.equal((await b.wait("signal")).data.type, "offer");
  await b.action("cancel");
  await a.wait("opponentLeft");
  await a.action("quick");
  await c.action("quick");
  assert.equal((await c.wait("paired")).opponent, "A");
});
test("invalid session tokens cannot select, spoof or relay", async (t) => {
  const f = await fixture(t),
    a = await f.client("A"),
    b = await f.client("B");
  const response = await fetch(f.base + "/api/actions", {
    method: "POST",
    headers: { Authorization: `Bearer ${b.token}` },
    body: JSON.stringify({ id: a.id, type: "quick" }),
  });
  assert.equal(response.status, 401);
  const invalid = await fetch(
    f.base + "/api/events?id=" + a.id + "&token=not-a-token",
  );
  assert.equal(invalid.status, 401);
});
test("disconnect removes waiting rooms and informs a paired opponent", async (t) => {
  const f = await fixture(t),
    a = await f.client("A"),
    b = await f.client("B");
  await a.action("quick");
  await b.action("quick");
  await b.wait("paired");
  a.abort();
  await b.wait("opponentLeft");
  assert.equal(f.lobby.stats().matches, 0);
});
