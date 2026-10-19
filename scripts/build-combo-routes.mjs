import { createMatch, step, emptyInput } from "../src/combat.js";
import { CHARACTER_IDS } from "../src/characters.js";
import { commandInputs, searchComboRoutes } from "../src/combo-search.js";
import { writeFileSync } from "node:fs";
const result = {};
for (const id of CHARACTER_IDS) {
  result[id] = {};
  for (const stage of ["terminal", "dojo"]) {
    const m = createMatch([id, "kai"], stage);
    m.phase = "fight";
    m.fighters[0].x = -0.5;
    m.fighters[1].x = 0.5;
    if (stage === "dojo") {
      m.fighters[1].x = 6.45;
      m.fighters[0].x = 5.45;
    }
    const queue = commandInputs(m.fighters[0], "upper");
    for (let n = 0; n < 90; n++) {
      step(m, [queue.shift() ?? emptyInput(), emptyInput()], 1 / 60, true);
      if (m.fighters[1].airOwner === 0) break;
    }
    result[id][stage] = searchComboRoutes(m, 0, { depth: 7, width: 8 });
    console.log(id, stage, result[id][stage][0]);
  }
}
writeFileSync(
  new URL("../src/combo-routes.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
