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
	"time"
)

//go:embed all:web
var gameFiles embed.FS

func gameHandler() (http.Handler, error) {
	files, err := fs.Sub(gameFiles, "web")
	if err != nil {
		return nil, err
	}
	return http.FileServer(http.FS(files)), nil
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
	flag.Parse()
	handler, err := gameHandler()
	if err != nil {
		return err
	}
	// A random loopback port avoids collisions and never exposes a server to the LAN.
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("cannot start AXIS: %w", err)
	}
	defer listener.Close()
	server := &http.Server{Handler: handler, ReadHeaderTimeout: 5 * time.Second}
	url := "http://" + listener.Addr().String()
	fmt.Println("\n  AXIS - 3D Fighting Arena | v1.0.0")
	fmt.Println("  --------------------------------")
	fmt.Println("  Game ready: " + url)
	fmt.Println("  Your browser will open the game automatically.")
	fmt.Println("  Keep this window open while playing.")
	fmt.Println("  To quit: close this window or press Ctrl+C.")
	fmt.Println("\n  Move: A/D | Sidestep: W/S | Attacks: J K U I O")
	fmt.Print("  Guard: L | Crouch: Shift | Combo: J J K / I J K\n\n")
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
