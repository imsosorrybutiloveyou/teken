package main

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestVersionComparison(t *testing.T) {
	for _, r := range []struct {
		next, old string
		want      bool
	}{{"3.10.0", "3.9.0", true}, {"3.6.0", "3.6.0", false}, {"3.5.9", "3.6.0", false}, {"4.0.0", "3.99.0", true}, {"../oops", "3.6.0", false}, {"03.7.0", "3.6.0", false}} {
		if newerVersion(r.next, r.old) != r.want {
			t.Fatal(r)
		}
	}
}
func TestUpdatePromptDownloadAndChecksum(t *testing.T) {
	original := currentVersion
	currentVersion = "3.6.0"
	defer func() { currentVersion = original }()
	payload := []byte("verified EXE test fixture")
	hash := fmt.Sprintf("%x", sha256.Sum256(payload))
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/manifest" {
			fmt.Fprintf(w, `{"version":"3.7.0","sha256":"%s"}`, hash)
			return
		}
		w.Write(payload)
	}))
	defer server.Close()
	dir := t.TempDir()
	var output bytes.Buffer
	offerUpdate(strings.NewReader("bad\ny\n"), &output, server.Client(), server.URL+"/manifest", server.URL+"/exe", dir)
	data, err := os.ReadFile(filepath.Join(dir, "AXIS-v3.7.0-Windows-x64.exe"))
	if err != nil || !bytes.Equal(data, payload) {
		t.Fatal(err, string(data))
	}
	if !strings.Contains(output.String(), "다운로드 하시겠습니까?[y/n]") || !strings.Contains(output.String(), "다운로드 완료") {
		t.Fatal(output.String())
	}
	if _, err := downloadUpdate(server.Client(), server.URL+"/exe", dir, updateManifest{"3.8.0", strings.Repeat("0", 64)}); err == nil {
		t.Fatal("checksum mismatch accepted")
	}
	if _, err := os.Stat(filepath.Join(dir, "AXIS-v3.8.0-Windows-x64.exe")); !os.IsNotExist(err) {
		t.Fatal("bad download retained")
	}
	if _, err := downloadUpdate(server.Client(), server.URL+"/exe", dir, updateManifest{"3.7.0", hash}); err == nil {
		t.Fatal("existing EXE overwritten")
	}
	for _, answer := range []string{"n\n", ""} {
		var out bytes.Buffer
		skipDir := t.TempDir()
		offerUpdate(strings.NewReader(answer), &out, server.Client(), server.URL+"/manifest", server.URL+"/exe", skipDir)
		files, _ := os.ReadDir(skipDir)
		if len(files) != 0 {
			t.Fatal("declined update downloaded")
		}
	}
}
