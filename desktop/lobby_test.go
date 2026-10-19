package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type testPlayer struct {
	ID, Token string
	events    <-chan map[string]any
	close     func()
}

func player(t *testing.T, server string, name string) testPlayer {
	t.Helper()
	response, err := http.Post(server+"/api/sessions", "application/json", strings.NewReader(`{"name":"`+name+`"}`))
	if err != nil {
		t.Fatal(err)
	}
	var p testPlayer
	json.NewDecoder(response.Body).Decode(&p)
	response.Body.Close()
	response, err = http.Get(server + "/api/events?id=" + p.ID + "&token=" + p.Token)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != 200 {
		t.Fatal(response.StatusCode)
	}
	events := make(chan map[string]any, 256)
	go func() {
		defer close(events)
		scanner := bufio.NewScanner(response.Body)
		for scanner.Scan() {
			if strings.HasPrefix(scanner.Text(), "data: ") {
				var message map[string]any
				if json.Unmarshal([]byte(strings.TrimPrefix(scanner.Text(), "data: ")), &message) == nil {
					events <- message
				}
			}
		}
	}()
	p.events = events
	p.close = func() { response.Body.Close() }
	t.Cleanup(p.close)
	return p
}
func action(t *testing.T, server string, p testPlayer, body map[string]any) int {
	t.Helper()
	body["id"] = p.ID
	data, _ := json.Marshal(body)
	request, _ := http.NewRequest("POST", server+"/api/actions", bytes.NewReader(data))
	request.Header.Set("Authorization", "Bearer "+p.Token)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	return response.StatusCode
}
func event(t *testing.T, p testPlayer, kind string) map[string]any {
	t.Helper()
	timer := time.NewTimer(2 * time.Second)
	defer timer.Stop()
	for {
		select {
		case e, ok := <-p.events:
			if !ok {
				t.Fatal("stream closed")
			}
			if e["type"] == kind {
				return e
			}
		case <-timer.C:
			t.Fatalf("missing event %s", kind)
			return nil
		}
	}
}
func TestPortableLobby(t *testing.T) {
	l := newPortableLobby()
	defer l.close()
	server := httptest.NewServer(l)
	t.Cleanup(server.Close)
	a, b := player(t, server.URL, "FIRST"), player(t, server.URL, "SECOND")
	if action(t, server.URL, a, map[string]any{"type": "select", "character": "kai"}) != 400 {
		t.Fatal("selection before pairing")
	}
	if action(t, server.URL, a, map[string]any{"type": "quick"}) != 400 {
		t.Fatal("obsolete quick match accepted")
	}
	action(t, server.URL, a, map[string]any{"type": "createRoom", "name": "FIRST ROOM"})
	firstRoom := event(t, a, "queued")["roomId"]
	action(t, server.URL, b, map[string]any{"type": "joinRoom", "roomId": firstRoom})
	if event(t, a, "paired")["role"] != "host" || event(t, b, "paired")["role"] != "guest" {
		t.Fatal("first waiting player must host")
	}
	action(t, server.URL, a, map[string]any{"type": "select", "character": "mira"})
	action(t, server.URL, b, map[string]any{"type": "select", "character": "goro"})
	roster := event(t, a, "rosterLocked")["characters"].([]any)
	if roster[0] != "mira" || roster[1] != "goro" {
		t.Fatal(roster)
	}
	if action(t, server.URL, a, map[string]any{"type": "signal", "data": map[string]any{"type": "candidate", "candidate": nil}}) != 200 {
		t.Fatal("signal rejected")
	}
	event(t, b, "signal")
	bad := a
	bad.Token = "wrong"
	if action(t, server.URL, bad, map[string]any{"type": "cancel"}) != 401 {
		t.Fatal("token bypass")
	}
	action(t, server.URL, a, map[string]any{"type": "cancel"})
	event(t, b, "opponentLeft")
	action(t, server.URL, a, map[string]any{"type": "createRoom", "name": "HOST ROOM"})
	room := event(t, a, "queued")["roomId"]
	if action(t, server.URL, b, map[string]any{"type": "joinRoom", "roomId": room}) != 200 {
		t.Fatal("cannot join room")
	}
	event(t, a, "paired")
	event(t, b, "paired")
	if action(t, server.URL, a, map[string]any{"type": "select", "character": "fake"}) != 400 {
		t.Fatal("unknown character accepted")
	}
}
func TestHostDiscovery(t *testing.T) {
	handler, cleanup, err := startHost("")
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	if handler == nil {
		t.Fatal("missing API")
	}
	address := discoverHost(time.Second)
	if address == "" || !healthyHost(address) {
		t.Fatal("first host was not discovered")
	}
	_, leave, err := startHost(address)
	if err != nil {
		t.Fatal(err)
	}
	leave()
}

func TestLANRelay(t *testing.T) {
	l := newPortableLobby()
	defer l.close()
	s := httptest.NewServer(l)
	defer s.Close()
	a, b := player(t, s.URL, "A"), player(t, s.URL, "B")
	defer a.close()
	defer b.close()
	action(t, s.URL, a, map[string]any{"type": "createRoom", "name": "LAN"})
	room := event(t, a, "queued")["roomId"]
	action(t, s.URL, b, map[string]any{"type": "joinRoom", "roomId": room})
	if action(t, s.URL, a, map[string]any{"type": "signal", "data": map[string]any{"type": "relay", "packets": []any{map[string]any{"type": "input", "input": map[string]any{"action": "u"}}}}}) != 200 {
		t.Fatal("relay rejected")
	}
	event(t, b, "signal")
	if action(t, s.URL, a, map[string]any{"type": "signal", "data": map[string]any{"type": "relay", "packets": []any{}}}) != 400 {
		t.Fatal("empty relay accepted")
	}
}
