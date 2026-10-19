import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const go = process.env.GO_BINARY || "go";
const env = { ...process.env, CGO_ENABLED: "0" };
const run = (exe, args, cwd = root, extraEnv = {}) =>
  execFileSync(exe, args, {
    cwd,
    env: { ...env, ...extraEnv },
    stdio: "inherit",
  });
// Build afresh so the executable never ships a stale game bundle.
run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
const embedded = path.join(root, "desktop", "web");
rmSync(embedded, { recursive: true, force: true });
cpSync(path.join(root, "dist"), embedded, { recursive: true });
const release = path.join(root, "release");
mkdirSync(release, { recursive: true });
run(go, ["test", "./..."], path.join(root, "desktop"));
const filename = "AXIS-Windows-x64.exe";
const executable = path.join(release, filename);
run(
  go,
  ["build", "-trimpath", "-ldflags=-s -w", "-o", executable, "."],
  path.join(root, "desktop"),
  { GOOS: "windows", GOARCH: "amd64" },
);
const bytes = readFileSync(executable);
const peOffset = bytes.readUInt32LE(0x3c);
if (
  bytes.toString("ascii", 0, 2) !== "MZ" ||
  bytes.toString("ascii", peOffset, peOffset + 4) !== "PE\0\0" ||
  bytes.readUInt16LE(peOffset + 4) !== 0x8664
) {
  throw new Error("The build is not a Windows x64 PE executable");
}
const checksum = createHash("sha256").update(bytes).digest("hex");
writeFileSync(
  path.join(release, filename + ".sha256"),
  `${checksum}  ${filename}\n`,
);
console.log(
  `\nWindows x64 executable created: ${executable}\nSize: ${(bytes.length / 1024 / 1024).toFixed(1)} MiB\nSHA-256: ${checksum}`,
);
