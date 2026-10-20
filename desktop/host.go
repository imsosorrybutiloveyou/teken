package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

const discoveryPort = 38787
const hostPort = 8787
const discoveryQuery = "AXIS-HOST-v18"

// Only the matchmaking API is exposed to the network. The browser stays on
// localhost, which is a secure context required by WebRTC even without HTTPS.
func startHost(address string) (http.Handler, func(), error) {
	if address == "" {
		address = discoverHost(450 * time.Millisecond)
		if address == "" && healthyHost("http://127.0.0.1:8787") {
			address = "http://127.0.0.1:8787"
		}
	}
	if address != "" {
		target, err := url.Parse(address)
		if err != nil || target.Host == "" || (target.Scheme != "http" && target.Scheme != "https") || target.User != nil {
			return nil, nil, fmt.Errorf("invalid host URL: use http://IP:8787 or https://host")
		}
		if !healthyHost(target.String()) {
			return nil, nil, fmt.Errorf("cannot reach AXIS host %s; check that their EXE is open and port 8787 is reachable", target.Host)
		}
		fmt.Println("  Matchmaking: joined first host " + target.String())
		proxy := httputil.NewSingleHostReverseProxy(target)
		proxy.FlushInterval = -1
		return proxy, func() {}, nil
	}
	listener, err := net.Listen("tcp4", fmt.Sprintf("0.0.0.0:%d", hostPort))
	if err != nil {
		return nil, nil, fmt.Errorf("cannot host on TCP %d: %w; another AXIS instance may be starting, try again", hostPort, err)
	}
	lobby := newPortableLobby()
	server := &http.Server{Handler: lobby, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 30 * time.Second}
	go server.Serve(listener)
	udp, err := net.ListenUDP("udp4", &net.UDPAddr{Port: discoveryPort})
	if err == nil {
		go func() {
			buffer := make([]byte, 128)
			for {
				n, from, err := udp.ReadFromUDP(buffer)
				if err != nil {
					return
				}
				if string(buffer[:n]) == discoveryQuery {
					udp.WriteToUDP([]byte(discoveryQuery), from)
				}
			}
		}()
	}
	fmt.Printf("  Matchmaking: FIRST HOST (TCP %d, LAN discovery UDP %d)\n", hostPort, discoveryPort)
	fmt.Println("  Keep this EXE open while others use its lobby. Allow AXIS through your firewall.")
	if addresses, err := net.InterfaceAddrs(); err == nil {
		for _, a := range addresses {
			if ip, _, err := net.ParseCIDR(a.String()); err == nil && ip.To4() != nil && !ip.IsLoopback() {
				fmt.Printf("  LAN host address: http://%s:%d\n", ip, hostPort)
			}
		}
	}
	return lobby, func() {
		lobby.close()
		if udp != nil {
			udp.Close()
		}
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		server.Shutdown(ctx)
	}, nil
}
func healthyHost(address string) bool {
	client := &http.Client{Timeout: 1200 * time.Millisecond}
	r, err := client.Get(strings.TrimRight(address, "/") + "/api/health")
	if err != nil {
		return false
	}
	defer r.Body.Close()
	var result struct {
		Service string
		Version int
	}
	return r.StatusCode == 200 && json.NewDecoder(r.Body).Decode(&result) == nil && result.Service == "axis-matchmaking" && result.Version == 18
}
func discoverHost(timeout time.Duration) string {
	conn, err := net.ListenUDP("udp4", &net.UDPAddr{})
	if err != nil {
		return ""
	}
	defer conn.Close()
	destinations := []net.IP{net.IPv4(127, 0, 0, 1), net.IPv4bcast}
	// Directed broadcasts work on networks that block the all-interfaces broadcast.
	if addrs, err := net.InterfaceAddrs(); err == nil {
		for _, a := range addrs {
			if ipNet, ok := a.(*net.IPNet); ok && ipNet.IP.To4() != nil && !ipNet.IP.IsLoopback() {
				ip := ipNet.IP.To4()
				broadcast := make(net.IP, 4)
				for i := range 4 {
					broadcast[i] = ip[i] | ^ipNet.Mask[i]
				}
				destinations = append(destinations, broadcast)
			}
		}
	}
	for _, ip := range destinations {
		conn.WriteToUDP([]byte(discoveryQuery), &net.UDPAddr{IP: ip, Port: discoveryPort})
	}
	conn.SetReadDeadline(time.Now().Add(timeout))
	buffer := make([]byte, 128)
	for {
		n, from, err := conn.ReadFromUDP(buffer)
		if err != nil {
			return ""
		}
		if string(buffer[:n]) != discoveryQuery {
			continue
		}
		address := fmt.Sprintf("http://%s:%d", from.IP, hostPort)
		if healthyHost(address) {
			return address
		}
	}
}
