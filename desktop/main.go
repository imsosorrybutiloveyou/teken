// AXIS packages the complete web game into one executable using only Go's standard library.
package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strings"
	"time"
)

//go:embed all:web
var gameFiles embed.FS

func gameHandler() (http.Handler, error) {
	files, err := fs.Sub(gameFiles, "web")
	if err != nil {
		return nil, err
	}
	static := http.FileServer(http.FS(files))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			index, err := fs.ReadFile(files, "index.html")
			if err != nil {
				http.Error(w, "Game files missing", 500)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			fmt.Fprint(w, strings.Replace(string(index), "<head>", `<head><meta name="axis-desktop" content="true">`, 1))
			return
		}
		static.ServeHTTP(w, r)
	}), nil
}

func openBrowser(url string) error {
	switch runtime.GOOS {
	case "windows":
		return exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url).Run()
	case "darwin":
		return exec.Command("open", url).Run()
	default:
		return exec.Command("xdg-open", url).Run()
	}
}

func run() error {
	noBrowser := flag.Bool("no-browser", false, "Start the local game server without opening a browser")
	hostAddress := flag.String("host", "", "Join an existing host URL; empty automatically discovers a LAN host or becomes the host")
	flag.Parse()
	handler, err := gameHandler()
	if err != nil {
		return err
	}
	api, closeHost, err := startHost(*hostAddress)
	if err != nil {
		fmt.Println("  Online unavailable: " + err.Error())
		fmt.Println("  CPU practice is still available. Restart after fixing the host address or port.")
		api = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			jsonResponse(w, http.StatusServiceUnavailable, map[string]string{"error": "매칭 호스트를 시작하거나 연결할 수 없습니다. 실행 창을 확인하세요."})
		})
		closeHost = func() {}
	}
	defer closeHost()
	mux := http.NewServeMux()
	mux.Handle("/api/", api)
	mux.Handle("/", handler)
	// Keep the actual game in a localhost secure context for WebRTC.
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("cannot start AXIS: %w", err)
	}
	defer listener.Close()
	server := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	url := "http://" + listener.Addr().String()
	fmt.Println("\n  AXIS ADVANCE - Pixel Fighting | v3.5.0")
	fmt.Println("  --------------------------------")
	fmt.Println("  Game ready: " + url)
	fmt.Println("  Your browser will open the game automatically.")
	fmt.Println("  Keep this window open while playing.")
	fmt.Println("  To quit: close this window or press Ctrl+C.")
	fmt.Println("\n  Move: A/D | Sidestep: W/S | U: Left Punch | I: Right Punch | J: Left Kick | K: Right Kick")
	fmt.Print("  Guard: Hold Back | Crouch: Shift | 4 unique fighters | Check each fighter frame list\n")
	fmt.Print("  Online: PLAYER MATCH uses the first LAN host automatically; internet: run EXE --host http://HOST-IP:8787\n\n")
	if !*noBrowser {
		go func() {
			if err := openBrowser(url); err != nil {
				fmt.Println("  Open the game address above in Chrome, Edge or Firefox.")
			}
		}()
	}
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	defer signal.Stop(stop)
	go func() {
		<-stop
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			log.Println(err)
		}
	}()
	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
