import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url),
  read = (name) => readFileSync(new URL(name, root)),
  pkg = JSON.parse(read("package.json")),
  latest = JSON.parse(read("downloads/latest.json"));
assert.equal(
  latest.version,
  pkg.version,
  "manifest must match package version",
);
assert.match(
  read("docs/RELEASE_NOTES.md").toString(),
  new RegExp(`^# AXIS ADVANCE v${pkg.version.replaceAll(".", "\\.")}`),
);
for (const name of ["AXIS-Windows-x64.exe", "AXIS-SERVER-Windows-x64.exe"]) {
  const bytes = read("downloads/" + name),
    hash = createHash("sha256").update(bytes).digest("hex"),
    checksum = read("downloads/" + name + ".sha256")
      .toString()
      .trim()
      .split(/\s+/);
  assert.equal(checksum[0], hash, name + " checksum");
  assert.equal(checksum[1], name);
  assert.equal(bytes.toString("ascii", 0, 2), "MZ");
  const pe = bytes.readUInt32LE(0x3c);
  assert.equal(bytes.toString("ascii", pe, pe + 4), "PE\0\0");
  assert.equal(
    bytes.readUInt16LE(pe + 4),
    0x8664,
    name + " must be Windows x64",
  );
  if (name === "AXIS-Windows-x64.exe") assert.equal(latest.sha256, hash);
  console.log("Verified", name, hash);
}
