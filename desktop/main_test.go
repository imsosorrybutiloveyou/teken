package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
)

func TestEmbeddedGame(t *testing.T) {
	handler, err := gameHandler()
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(handler)
	defer server.Close()
	response, err := http.Get(server.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != 200 || !strings.Contains(string(body), "AXIS") {
		t.Fatal("embedded game index is missing")
	}
	paths := regexp.MustCompile(`(?:src|href)="(/(?:assets|fonts)/[^\"]+)"`).FindAllStringSubmatch(string(body), -1)
	if len(paths) < 2 {
		t.Fatal("production JS and CSS references are missing")
	}
	for _, path := range paths {
		asset, err := http.Get(server.URL + path[1])
		if err != nil {
			t.Fatal(err)
		}
		asset.Body.Close()
		if asset.StatusCode != 200 || asset.ContentLength <= 0 {
			t.Fatalf("embedded asset %s failed: %d", path[1], asset.StatusCode)
		}
	}
	for _, path := range []string{"/fonts/dm-sans-latin-standard-normal.woff2", "/fonts/BARLOW-LICENSE.txt", "/fonts/DM-SANS-LICENSE.txt"} {
		asset, err := http.Get(server.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		asset.Body.Close()
		if asset.StatusCode != 200 {
			t.Fatalf("font or license missing: %s", path)
		}
	}
	missing, err := http.Get(server.URL + "/does-not-exist")
	if err != nil {
		t.Fatal(err)
	}
	missing.Body.Close()
	if missing.StatusCode != 404 {
		t.Fatal("missing paths must return 404")
	}
}
