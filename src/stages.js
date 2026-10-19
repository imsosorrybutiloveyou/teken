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
