export const STAGES = {
  terminal: {
    id: "terminal",
    name: "SUNSET TERMINAL",
    wall: 0,
    sky: [
      "#282e4d",
      "#3c3653",
      "#64455c",
      "#915769",
      "#b56c70",
      "#d68d78",
      "#e8ad85",
    ],
    floor: [83, 101, 106],
  },
  forest: {
    id: "forest",
    name: "JADE FOREST",
    wall: 0,
    sky: [
      "#102d30",
      "#174240",
      "#20564b",
      "#396a57",
      "#578463",
      "#8aa67b",
      "#c5cfa1",
    ],
    floor: [66, 91, 65],
  },
  dojo: {
    id: "dojo",
    name: "MOON DOJO",
    wall: 7,
    arena: [
      [-7, -5],
      [7, -5],
      [7, 5],
      [-7, 5],
    ],
    sky: [
      "#171a3b",
      "#27254b",
      "#3d355d",
      "#514265",
      "#725a78",
      "#95788c",
      "#ba9aa1",
    ],
    floor: [109, 81, 65],
  },
  foundry: {
    id: "foundry",
    name: "IRON FOUNDRY",
    wall: 8,
    arena: [
      [-5, -8],
      [5, -8],
      [9, -4],
      [9, 6],
      [-1, 6],
      [-5, 2],
    ],
    sky: [
      "#201e28",
      "#32242c",
      "#4f2d32",
      "#733a35",
      "#9b4b38",
      "#c26a41",
      "#e69550",
    ],
    floor: [92, 78, 74],
  },
};
export function chooseStage(id = "terminal", random = Math.random) {
  return id === "random"
    ? Object.keys(STAGES)[Math.min(3, Math.floor(random() * 4))]
    : typeof id === "string" && Object.hasOwn(STAGES, id)
      ? id
      : "terminal";
}

export function wallEdges(stage) {
  const points = STAGES[stage]?.arena ?? [];
  return points.map((a, i) => {
    const b = points[(i + 1) % points.length],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    return { a, b, nx: -dz / len, nz: dx / len };
  });
}
export function constrainToStage(f, stage) {
  const edges = wallEdges(stage);
  for (let pass = 0; pass < 6; pass++)
    for (const { a, nx, nz } of edges) {
      const d = (f.x - a[0]) * nx + (f.z - a[1]) * nz;
      if (d < 0.5) {
        f.x += nx * (0.5 - d);
        f.z += nz * (0.5 - d);
        const speed = f.vx * nx + f.vz * nz;
        if (speed < 0) {
          f.vx -= nx * speed;
          f.vz -= nz * speed;
        }
      }
    }
}
export function wallContact(f, angle, stage) {
  const dx = Math.cos(angle),
    dz = Math.sin(angle);
  return wallEdges(stage).find(
    ({ a, nx, nz }) =>
      dx * nx + dz * nz < -0.05 &&
      (f.x + dx * 0.65 - a[0]) * nx + (f.z + dz * 0.65 - a[1]) * nz < 0.5,
  );
}
export function wallImpact(f, angle, stage) {
  return !!wallContact(f, angle, stage);
}
