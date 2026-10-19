package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var currentVersion = "3.8.0"

const updateManifestURL = "https://raw.githubusercontent.com/imsosorrybutiloveyou/teken/main/downloads/latest.json"
const updateDownloadURL = "https://raw.githubusercontent.com/imsosorrybutiloveyou/teken/main/downloads/AXIS-Windows-x64.exe"
const maxUpdateBytes = 64 << 20

type updateManifest struct {
	Version string `json:"version"`
	SHA256  string `json:"sha256"`
}

func versionParts(v string) ([3]int, error) {
	var result [3]int
	parts := strings.Split(v, ".")
	if len(parts) != 3 {
		return result, fmt.Errorf("invalid version")
	}
	for i, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil || n < 0 || n > 9999 || strconv.Itoa(n) != p {
			return result, fmt.Errorf("invalid version")
		}
		result[i] = n
	}
	return result, nil
}
func newerVersion(next, current string) bool {
	a, err := versionParts(next)
	if err != nil {
		return false
	}
	b, err := versionParts(current)
	if err != nil {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return a[i] > b[i]
		}
	}
	return false
}
func fetchUpdate(client *http.Client, url string) (updateManifest, error) {
	var m updateManifest
	r, err := client.Get(url)
	if err != nil {
		return m, err
	}
	defer r.Body.Close()
	if r.StatusCode != 200 {
		return m, fmt.Errorf("GitHub HTTP %d", r.StatusCode)
	}
	if err = json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&m); err != nil {
		return m, err
	}
	if _, err = versionParts(m.Version); err != nil {
		return m, err
	}
	hash, err := hex.DecodeString(m.SHA256)
	if err != nil || len(hash) != 32 {
		return m, fmt.Errorf("invalid SHA-256")
	}
	return m, nil
}
func downloadUpdate(client *http.Client, url, directory string, m updateManifest) (string, error) {
	if _, err := versionParts(m.Version); err != nil {
		return "", err
	}
	expected, err := hex.DecodeString(m.SHA256)
	if err != nil || len(expected) != 32 {
		return "", fmt.Errorf("invalid SHA-256")
	}
	target := filepath.Join(directory, "AXIS-v"+m.Version+"-Windows-x64.exe")
	// Never overwrite an executable, including one that may already be running.
	if data, err := os.ReadFile(target); err == nil {
		digest := sha256.Sum256(data)
		if strings.EqualFold(hex.EncodeToString(digest[:]), m.SHA256) {
			return target, nil
		}
		return "", fmt.Errorf("existing file has a different checksum: %s", target)
	} else if !os.IsNotExist(err) {
		return "", err
	}
	r, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer r.Body.Close()
	if r.StatusCode != 200 {
		return "", fmt.Errorf("download HTTP %d", r.StatusCode)
	}
	temp, err := os.CreateTemp(directory, ".axis-update-*.tmp")
	if err != nil {
		return "", err
	}
	defer os.Remove(temp.Name())
	hash := sha256.New()
	n, copyErr := io.Copy(io.MultiWriter(temp, hash), io.LimitReader(r.Body, maxUpdateBytes+1))
	closeErr := temp.Close()
	if copyErr != nil {
		return "", copyErr
	}
	if closeErr != nil {
		return "", closeErr
	}
	if n > maxUpdateBytes {
		return "", fmt.Errorf("update exceeds 64 MiB")
	}
	if !strings.EqualFold(hex.EncodeToString(hash.Sum(nil)), m.SHA256) {
		return "", fmt.Errorf("SHA-256 mismatch; try again after GitHub finishes updating")
	}
	if err = os.Link(temp.Name(), target); err != nil {
		return "", err
	} // Atomic publication without replacing any existing file.
	return target, nil
}
func offerUpdate(input io.Reader, output io.Writer, client *http.Client, manifestURL, downloadURL, directory string) string {
	fmt.Fprintln(output, "  GitHub 업데이트 확인 중…")
	m, err := fetchUpdate(client, manifestURL)
	if err != nil {
		fmt.Fprintln(output, "  업데이트 확인 실패. 현재 버전으로 계속합니다:", err)
		return ""
	}
	if !newerVersion(m.Version, currentVersion) {
		fmt.Fprintln(output, "  최신 버전입니다:", currentVersion)
		return ""
	}
	fmt.Fprintln(output, "  새 버전:", m.Version)
	fmt.Fprintln(output, "  다운로드 후 새 게임을 실행하고 이전 AXIS 파일을 정리합니다.")
	scanner := bufio.NewScanner(input)
	for {
		fmt.Fprint(output, "  다운로드 하시겠습니까?[y/n] ")
		if !scanner.Scan() {
			fmt.Fprintln(output, "\n  다운로드를 건너뜁니다.")
			return ""
		}
		answer := strings.ToLower(strings.TrimSpace(scanner.Text()))
		if answer == "n" {
			fmt.Fprintln(output, "  현재 버전으로 계속합니다.")
			return ""
		}
		if answer != "y" {
			continue
		}
		fmt.Fprintln(output, "  다운로드 중…")
		path, err := downloadUpdate(&http.Client{Timeout: 2 * time.Minute}, downloadURL, directory, m)
		if err != nil {
			fmt.Fprintln(output, "  다운로드 실패. 현재 버전으로 계속합니다:", err)
			return ""
		}
		fmt.Fprintln(output, "  다운로드 완료 (SHA-256 확인):", path)
		return path
	}
}

func validReplacement(old, current string) bool {
	a, err := filepath.Abs(old)
	if err != nil {
		return false
	}
	b, err := filepath.Abs(current)
	if err != nil {
		return false
	}
	name := filepath.Base(a)
	return !strings.EqualFold(a, b) && strings.EqualFold(filepath.Dir(a), filepath.Dir(b)) && (name == "AXIS-Windows-x64.exe" || (strings.HasPrefix(name, "AXIS-v") && strings.HasSuffix(name, "-Windows-x64.exe")))
}
func launchUpdated(path, old string, pid int, args []string) error {
	if !validReplacement(old, path) {
		return fmt.Errorf("keep the AXIS executable filename; run the downloaded file manually")
	}
	command := exec.Command(path, append([]string{"--no-update", "--replace-old", old, "--replace-pid", strconv.Itoa(pid)}, args...)...)
	command.Stdin = os.Stdin
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	return command.Start()
}
