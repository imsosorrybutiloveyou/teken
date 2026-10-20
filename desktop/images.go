package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image/png"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

func customImagesHandler(filename string) http.Handler {
	var mu sync.Mutex
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		mu.Lock()
		defer mu.Unlock()
		if r.Method == "GET" {
			data, err := os.ReadFile(filename)
			if os.IsNotExist(err) {
				data = []byte("{}")
			} else if err != nil {
				http.Error(w, "이미지 설정을 읽을 수 없습니다.", 500)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write(data)
			return
		}
		if r.Method != "PUT" {
			w.Header().Set("Allow", "GET, PUT")
			http.Error(w, "Method not allowed", 405)
			return
		}
		host, _, _ := net.SplitHostPort(r.RemoteAddr)
		ip := net.ParseIP(host)
		// Only the PC running the EXE may replace its shared image pack.
		if ip == nil || !ip.IsLoopback() || (r.Header.Get("Origin") != "" && r.Header.Get("Origin") != "http://"+r.Host) {
			http.Error(w, "서버 PC에서만 공유 이미지를 저장할 수 있습니다.", 403)
			return
		}
		var pack map[string]map[string]string
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<20)).Decode(&pack); err != nil {
			http.Error(w, "Invalid image pack", 400)
			return
		}
		for id, fields := range pack {
			if !validCharacter(id) {
				http.Error(w, "Invalid character", 400)
				return
			}
			for kind, data := range fields {
				if (kind != "skin" && kind != "portrait") || !strings.HasPrefix(data, "data:image/png;base64,") || len(data) > 2<<20 {
					http.Error(w, "Invalid image", 400)
					return
				}
				raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(data, "data:image/png;base64,"))
				if err != nil {
					http.Error(w, "Invalid PNG", 400)
					return
				}
				size, err := png.DecodeConfig(bytes.NewReader(raw))
				if err != nil || size.Width > 1024 || size.Height > 1024 ||
					(kind == "skin" && (size.Width < 128 || size.Width%128 != 0 || size.Width != size.Height*2)) ||
					(kind == "portrait" && (size.Width != 160 || size.Height != 128)) {
					http.Error(w, "Invalid image dimensions", 400)
					return
				}
				if _, err = png.Decode(bytes.NewReader(raw)); err != nil {
					http.Error(w, "Invalid PNG", 400)
					return
				}
			}
		}
		data, err := json.Marshal(pack)
		if err != nil {
			http.Error(w, "Invalid image pack", 400)
			return
		}
		temp, err := os.CreateTemp(filepath.Dir(filename), ".axis-images-*")
		if err != nil {
			http.Error(w, "이미지 저장 폴더에 쓸 수 없습니다.", 500)
			return
		}
		defer os.Remove(temp.Name())
		_, err = temp.Write(data)
		closeErr := temp.Close()
		if err != nil || closeErr != nil {
			http.Error(w, "이미지를 저장할 수 없습니다.", 500)
			return
		}
		if err = os.Rename(temp.Name(), filename); err != nil {
			http.Error(w, "이미지를 교체할 수 없습니다.", 500)
			return
		}
		jsonResponse(w, 200, map[string]bool{"saved": true})
	})
}
