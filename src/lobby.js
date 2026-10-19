export class LobbyClient {
  constructor(onEvent, onError) {
    this.onEvent = onEvent;
    this.onError = onError;
    this.source = null;
    this.session = null;
    this.base = "";
  }
  async connect(address, name) {
    await this.close();
    let url;
    try {
      url = new URL(address);
    } catch {
      throw Error("매칭 서버의 전체 URL을 입력하세요.");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw Error("HTTP 또는 HTTPS 서버 주소가 필요합니다.");
    this.base = url.origin;
    const health = await fetch(this.base + "/api/health", {
      signal: AbortSignal.timeout(10000),
    })
      .then((r) => r.json())
      .catch(() => {
        throw Error(
          "호스트에 연결할 수 없습니다. 첫 PC의 EXE와 주소·방화벽을 확인하세요.",
        );
      });
    if (health.service !== "axis-matchmaking" || health.version !== 10)
      throw Error("양쪽 모두 최신 AXIS v3.8와 매칭 호스트를 사용하세요.");
    const response = await fetch(this.base + "/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "세션을 만들 수 없습니다.");
    this.session = result;
    await new Promise((resolve, reject) => {
      const source = new EventSource(
        `${this.base}/api/events?id=${encodeURIComponent(result.id)}&token=${encodeURIComponent(result.token)}`,
      );
      this.source = source;
      const timer = setTimeout(() => {
        source.close();
        reject(Error("서버 이벤트 연결 시간이 초과되었습니다."));
      }, 12000);
      source.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && typeof data.type === "string") this.onEvent(data);
        } catch {
          /* Ignore malformed transport messages. */
        }
      };
      source.onerror = () =>
        this.onError(
          "매칭 서버와 재연결 중입니다. 연결이 오래 끊기면 다시 접속하세요.",
        );
    });
  }
  async action(type, extra = {}) {
    if (!this.session) throw Error("먼저 매칭 서버에 연결하세요.");
    const response = await fetch(this.base + "/api/actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.session.token}`,
      },
      body: JSON.stringify({ id: this.session.id, type, ...extra }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "요청을 처리할 수 없습니다.");
    return data;
  }
  async close() {
    if (this.session) {
      await this.action("cancel").catch(() => {});
    }
    this.source?.close();
    this.source = null;
    this.session = null;
  }
}
