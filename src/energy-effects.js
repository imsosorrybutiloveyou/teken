// World-space effects use the existing fighter/projectile snapshots on both peers.
const TAU = Math.PI * 2;
function ring(c, x, y, rx, ry, color, width = 0.035, rotation = 0) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.ellipse(x, y, rx, ry, rotation, 0, TAU);
  c.stroke();
}
export function drawKiAura(c, p, facing, time, progress) {
  c.save();
  c.translate(p.x, p.y);
  c.scale(facing * p.scale, p.scale);
  c.globalAlpha = Math.max(0, Math.min(1, progress * 6, (1 - progress) * 5));
  c.shadowColor = "#168cff";
  c.shadowBlur = 14;
  ring(c, 0, -0.12, 0.8, 0.18, "#55c8ff", 0.06);
  ring(c, 0, -1.05, 0.64, 1.15, "#278bff99", 0.08);
  for (let n = 0; n < 12; n++) {
    const phase = (time * 2 + n / 12) % 1;
    const angle = n * 2.4 + time * 3;
    const x = Math.cos(angle) * (0.35 + phase * 0.3);
    const y = -phase * 2.6;
    c.strokeStyle = n % 2 ? "#a7efff" : "#3797ff";
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.sin(angle) * 0.13, y - 0.13);
    c.lineTo(x - 0.08, y - 0.3);
    c.stroke();
  }
  for (let n = 0; n < 3; n++)
    ring(
      c,
      0.65,
      -1.3,
      0.2 + n * 0.12,
      0.15 + n * 0.11,
      "#73dcff",
      0.025,
      time * (n + 1),
    );
  c.restore();
}
export function drawEnergyShot(c, p, angle, time, enhanced) {
  c.save();
  c.translate(p.x, p.y);
  c.rotate(angle);
  c.scale(p.scale, p.scale);
  c.shadowColor = enhanced ? "#168cff" : "#4ee7da";
  c.shadowBlur = enhanced ? 18 : 10;
  const r = enhanced ? 0.3 : 0.22;
  for (let n = 7; n >= 1; n--) {
    c.globalAlpha = (1 - n / 8) * 0.45;
    c.fillStyle = enhanced ? "#247fff" : "#38bdaf";
    c.beginPath();
    c.ellipse(
      -n * 0.13,
      Math.sin(time * 25 - n) * 0.035,
      r * (1 - n / 10),
      r * (1 - n / 10),
      0,
      0,
      TAU,
    );
    c.fill();
  }
  c.globalAlpha = 1;
  ring(
    c,
    0,
    0,
    r * 1.55,
    r,
    enhanced ? "#58baff" : "#6dffe5",
    0.07,
    Math.sin(time * 20) * 0.3,
  );
  ring(c, 0, 0, r, r * 1.5, "#c3faff", 0.025, time * 14);
  for (let n = 0; n < (enhanced ? 10 : 6); n++) {
    const a = time * 12 + (n * TAU) / (enhanced ? 10 : 6);
    const d = r * (1.65 + 0.2 * Math.sin(time * 24 + n));
    c.strokeStyle = enhanced ? "#83d9ff" : "#a6ffed";
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    c.lineTo(Math.cos(a + 0.25) * d, Math.sin(a + 0.25) * d);
    c.stroke();
  }
  c.fillStyle = "#edffff";
  c.beginPath();
  c.ellipse(0, 0, r * 0.85, r * 0.6, 0, 0, TAU);
  c.fill();
  c.restore();
}
