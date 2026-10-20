package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/png"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func TestCustomImagesPersistenceAndValidation(t *testing.T) {
	filename := filepath.Join(t.TempDir(), "AXIS-custom-images.json")
	h := customImagesHandler(filename)
	var pngData bytes.Buffer
	png.Encode(&pngData, image.NewNRGBA(image.Rect(0, 0, 128, 64)))
	pack := map[string]map[string]string{"raon": {"skin": "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngData.Bytes())}}
	data, _ := json.Marshal(pack)
	put := func(handler http.Handler, body string, remote string, origin string) int {
		r := httptest.NewRequest("PUT", "http://127.0.0.1:8080/api/custom-images", strings.NewReader(body))
		r.RemoteAddr = remote
		r.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w.Code
	}
	if put(h, string(data), "127.0.0.1:1234", "http://127.0.0.1:8080") != 200 {
		t.Fatal("valid PNG skin not saved")
	}
	// A new handler (or EXE port) still reads the same on-disk pack.
	r := httptest.NewRequest("GET", "http://localhost:9999/api/custom-images", nil)
	w := httptest.NewRecorder()
	customImagesHandler(filename).ServeHTTP(w, r)
	if !bytes.Equal(bytes.TrimSpace(w.Body.Bytes()), data) {
		t.Fatal("saved images did not survive handler restart")
	}
	if put(h, string(data), "192.168.1.8:1234", "") != 403 {
		t.Fatal("remote clients may not replace the shared PC pack")
	}
	if put(h, string(data), "127.0.0.1:1234", "http://unrelated.example") != 403 {
		t.Fatal("cross-origin write accepted")
	}
	for _, bad := range []string{`{"unknown":{}}`, `{"raon":{"portrait":"data:image/png;base64,AA=="}}`, `{"kai":{"skin":"https://example.com/a.png"}}`} {
		if put(h, bad, "127.0.0.1:1234", "") != 400 {
			t.Fatal("invalid image pack accepted")
		}
	}
}
