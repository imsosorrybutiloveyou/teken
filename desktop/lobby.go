package main

// The portable host implements the same lobby protocol as server/lobby.js.
// Matches themselves use browser-to-browser WebRTC; no game state passes here.
import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type lobbyClient struct {
	ID, Token, Name, Match string
	Events                 chan any
	Connected              bool
	Seen                   time.Time
}
type lobbyRoom struct {
	Side     int    `json:"side"`
	Stage    string `json:"stage"`
	ID       string `json:"id"`
	Name     string `json:"name"`
	Host     string `json:"host"`
	Players  int    `json:"players"`
	Capacity int    `json:"capacity"`
}
type lobbyMatch struct {
	ID      string
	Players [2]string
	Picks   [2]any
	Side    int
	Stage   string
}
type lobbyRate struct {
	At              time.Time
	Count, Sessions int
}
type portableLobby struct {
	sync.Mutex
	rates   map[string]*lobbyRate
	clients map[string]*lobbyClient
	rooms   map[string]lobbyRoom
	matches map[string]*lobbyMatch
	done    chan struct{}
}

func randomID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
func newPortableLobby() *portableLobby {
	l := &portableLobby{rates: map[string]*lobbyRate{}, clients: map[string]*lobbyClient{}, rooms: map[string]lobbyRoom{}, matches: map[string]*lobbyMatch{}, done: make(chan struct{})}
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-l.done:
				return
			case now := <-ticker.C:
				l.Lock()
				for id, c := range l.clients {
					if !c.Connected && now.Sub(c.Seen) > 15*time.Second {
						l.leave(c)
						delete(l.clients, id)
					}
				}
				for address, rate := range l.rates {
					if now.Sub(rate.At) > time.Minute {
						delete(l.rates, address)
					}
				}
				l.broadcast()
				l.Unlock()
			}
		}
	}()
	return l
}
func (l *portableLobby) close() { close(l.done) }
func (l *portableLobby) send(c *lobbyClient, v any) {
	if c == nil {
		return
	}
	select {
	case c.Events <- v:
	default: /* bounded queues; disconnected clients expire */
	}
}
func (l *portableLobby) roomList() []lobbyRoom {
	result := []lobbyRoom{}
	for _, r := range l.rooms {
		r.Host = l.clients[r.Host].Name
		result = append(result, r)
	}
	return result
}
func (l *portableLobby) broadcast() {
	v := map[string]any{"type": "rooms", "rooms": l.roomList(), "online": len(l.clients)}
	for _, c := range l.clients {
		l.send(c, v)
	}
}
func (l *portableLobby) leave(c *lobbyClient) {
	for id, r := range l.rooms {
		if r.Host == c.ID {
			delete(l.rooms, id)
		}
	}
	if m := l.matches[c.Match]; m != nil {
		delete(l.matches, m.ID)
		for _, id := range m.Players {
			if other := l.clients[id]; other != nil {
				other.Match = ""
				if id != c.ID {
					l.send(other, map[string]any{"type": "opponentLeft", "message": "상대가 대전을 떠났습니다."})
				}
			}
		}
	}
	c.Match = ""
}
func (l *portableLobby) pair(a, b *lobbyClient, mode string) {
	side, stage := 0, "terminal"
	for _, room := range l.rooms {
		if room.Host == a.ID {
			side = room.Side
			stage = room.Stage
			break
		}
	}
	l.leave(a)
	l.leave(b)
	if stage == "random" {
		stage = []string{"terminal", "forest", "dojo", "foundry"}[time.Now().UnixNano()%4]
	}
	m := &lobbyMatch{ID: randomID(), Players: [2]string{a.ID, b.ID}, Side: side, Stage: stage}
	l.matches[m.ID] = m
	a.Match = m.ID
	b.Match = m.ID
	l.send(a, map[string]any{"type": "paired", "matchId": m.ID, "role": "host", "side": side, "stage": stage, "opponent": b.Name, "mode": mode})
	l.send(b, map[string]any{"type": "paired", "matchId": m.ID, "role": "guest", "side": 1 - side, "stage": stage, "opponent": a.Name, "mode": mode})
	l.broadcast()
}
func jsonResponse(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
func shortName(s string, limit int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) > limit {
		r = r[:limit]
	}
	return string(r)
}
func (l *portableLobby) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Cache-Control", "no-store")
	fail := func(status int, msg string) { jsonResponse(w, status, map[string]string{"error": msg}) }
	if r.Method == "OPTIONS" {
		w.WriteHeader(204)
		return
	}
	if r.URL.Path == "/api/health" && r.Method == "GET" {
		l.Lock()
		n := len(l.clients)
		l.Unlock()
		jsonResponse(w, 200, map[string]any{"service": "axis-matchmaking", "version": 19, "online": n, "portable": true})
		return
	}
	var body struct {
		ID, Name, Type, RoomID, Character string
		Data                              json.RawMessage
		Side                              int
		Stage                             string
	}
	if r.Method == "POST" {
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 100000))
		if err := decoder.Decode(&body); err != nil {
			fail(400, "올바른 JSON 요청이 필요합니다.")
			return
		}
		if err := decoder.Decode(new(any)); err != io.EOF {
			fail(400, "단일 JSON 요청이 필요합니다.")
			return
		}
	}
	l.Lock()
	address, _, _ := net.SplitHostPort(r.RemoteAddr)
	now := time.Now()
	rate := l.rates[address]
	if rate == nil || now.Sub(rate.At) > 10*time.Second {
		rate = &lobbyRate{At: now}
		l.rates[address] = rate
	}
	rate.Count++
	limit := 600
	if body.Type == "signal" {
		limit = 1200
	}
	if rate.Count > limit {
		l.Unlock()
		fail(429, "요청이 너무 많습니다.")
		return
	}
	if r.URL.Path == "/api/sessions" && r.Method == "POST" {
		defer l.Unlock()
		rate.Sessions++
		if len(l.clients) >= 128 || rate.Sessions > 12 {
			fail(429, "서버가 혼잡합니다.")
			return
		}
		name := shortName(body.Name, 24)
		if name == "" {
			name = "PLAYER"
		}
		c := &lobbyClient{ID: randomID(), Token: randomID(), Name: name, Events: make(chan any, 128), Seen: time.Now()}
		l.clients[c.ID] = c
		jsonResponse(w, 201, map[string]string{"id": c.ID, "token": c.Token})
		return
	}
	id := body.ID
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if r.Method == "GET" {
		id = r.URL.Query().Get("id")
		token = r.URL.Query().Get("token")
	}
	c := l.clients[id]
	if c == nil || subtle.ConstantTimeCompare([]byte(token), []byte(c.Token)) != 1 {
		l.Unlock()
		fail(401, "세션이 만료되었습니다. 다시 연결하세요.")
		return
	}
	c.Seen = time.Now()
	if r.URL.Path == "/api/events" && r.Method == "GET" {
		if c.Connected {
			l.Unlock()
			fail(409, "이미 연결된 세션입니다.")
			return
		}
		c.Connected = true
		rooms := l.roomList()
		online := len(l.clients)
		var picks [2]any
		matched := false
		if m := l.matches[c.Match]; m != nil {
			picks = m.Picks
			matched = true
		}
		l.Unlock()
		defer func() { l.Lock(); c.Connected = false; c.Seen = time.Now(); l.Unlock() }()
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("X-Accel-Buffering", "no")
		flusher, ok := w.(http.Flusher)
		if !ok {
			fail(500, "Streaming unavailable")
			return
		}
		write := func(v any) bool {
			data, err := json.Marshal(v)
			if err != nil {
				return false
			}
			http.NewResponseController(w).SetWriteDeadline(time.Now().Add(10 * time.Second))
			_, err = fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
			return err == nil
		}
		if !write(map[string]any{"type": "welcome", "id": c.ID}) || !write(map[string]any{"type": "rooms", "rooms": rooms, "online": online}) {
			return
		}
		if matched {
			if !write(map[string]any{"type": "selection", "picks": picks}) {
				return
			}
		}
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-l.done:
				return
			case <-r.Context().Done():
				return
			case v := <-c.Events:
				if !write(v) {
					return
				}
			case <-ticker.C:
				if !write(map[string]string{"type": "heartbeat"}) {
					return
				}
			}
		}
	}
	defer l.Unlock()
	if r.URL.Path != "/api/actions" || r.Method != "POST" {
		fail(404, "API 경로를 찾을 수 없습니다.")
		return
	}
	m := l.matches[c.Match]
	if m != nil && (body.Type == "createRoom" || body.Type == "joinRoom") {
		fail(400, "현재 대전을 먼저 종료하세요.")
		return
	}
	switch body.Type {
	case "createRoom":
		name := shortName(body.Name, 40)
		if name == "" {
			fail(400, "방 제목을 입력하세요.")
			return
		}
		l.leave(c)
		id := randomID()
		if body.Side != 0 && body.Side != 1 {
			fail(400, "Invalid side")
			return
		}
		stage := body.Stage
		if stage == "" {
			stage = "terminal"
		}
		if stage != "terminal" && stage != "forest" && stage != "dojo" && stage != "foundry" && stage != "random" {
			fail(400, "Invalid stage")
			return
		}
		l.rooms[id] = lobbyRoom{ID: id, Name: name, Host: c.ID, Players: 1, Capacity: 2, Side: body.Side, Stage: stage}
		l.send(c, map[string]string{"type": "queued", "mode": "room", "roomId": id})
		l.broadcast()
	case "joinRoom":
		room, ok := l.rooms[body.RoomID]
		host := l.clients[room.Host]
		if !ok || host == nil || !host.Connected || host == c || host.Match != "" {
			fail(400, "참가할 수 없는 방입니다.")
			return
		}
		l.pair(host, c, "room")
	case "cancel":
		l.leave(c)
		l.send(c, map[string]string{"type": "idle"})
		l.broadcast()
	case "select":
		if m == nil {
			fail(400, "매칭된 후 캐릭터를 선택하세요.")
			return
		}
		if !validCharacter(body.Character) {
			fail(400, "올바른 캐릭터를 선택하세요.")
			return
		}
		index := 0
		if m.Players[1] == c.ID {
			index = 1
		}
		if m.Picks[index] != nil {
			fail(400, "이미 확정한 캐릭터입니다.")
			return
		}
		m.Picks[index] = body.Character
		for _, id := range m.Players {
			l.send(l.clients[id], map[string]any{"type": "selection", "picks": m.Picks})
			if m.Picks[0] != nil && m.Picks[1] != nil {
				l.send(l.clients[id], map[string]any{"type": "rosterLocked", "characters": m.Picks})
			}
		}
	case "signal":
		var signal struct {
			Type      string
			SDP       string
			Candidate json.RawMessage
			Packets   []json.RawMessage
		}
		if m == nil || json.Unmarshal(body.Data, &signal) != nil {
			fail(400, "연결할 상대가 없습니다.")
			return
		}
		if signal.Type != "offer" && signal.Type != "answer" && signal.Type != "candidate" && signal.Type != "relay" {
			fail(400, "올바른 연결 메시지가 아닙니다.")
			return
		}
		if signal.Type != "candidate" && signal.Type != "relay" && (signal.SDP == "" || len(signal.SDP) > 64000) {
			fail(400, "올바른 SDP가 필요합니다.")
			return
		}
		if signal.Type == "relay" && (len(signal.Packets) == 0 || len(signal.Packets) > 8 || len(body.Data) > 64000) {
			fail(400, "Invalid relay packet")
			return
		}
		if signal.Type == "candidate" && string(signal.Candidate) != "null" {
			var candidate struct{ Candidate *string }
			if json.Unmarshal(signal.Candidate, &candidate) != nil || candidate.Candidate == nil || len(*candidate.Candidate) > 4096 {
				fail(400, "올바른 ICE 후보가 필요합니다.")
				return
			}
		}
		for _, id := range m.Players {
			if id != c.ID {
				l.send(l.clients[id], map[string]any{"type": "signal", "data": body.Data})
			}
		}
	default:
		fail(400, "지원하지 않는 요청입니다.")
		return
	}
	jsonResponse(w, 200, map[string]bool{"ok": true})
}

func validCharacter(id string) bool {
	switch id {
	case "kai", "ren", "mira", "goro", "hana", "shin", "boru", "atlas", "raon":
		return true
	}
	return false
}
