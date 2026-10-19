import { writeFileSync } from "node:fs";
import { CHARACTERS } from "../src/characters.js";
let text =
  "# AXIS ADVANCE v3.2 캐릭터별 커맨드·프레임표\n\n60 FPS 기준입니다. S=발동, A=지속, R=회수, G=가드 시 공격자 유불리, H=지상 적중 시 공격자 유불리. L은 띄우기, B는 공중에서 맞혔을 때 콤보당 1회 바운드입니다. 잡기의 G는 적용되지 않습니다. 명시된 유불리는 최초 활성 프레임에 맞고 연계 취소를 하지 않았을 때 기준이며 공중·거리·늦은 활성 프레임 적중에 따라 달라집니다. 히트스톱은 양쪽에 동일하게 적용합니다.\n\n→/←는 상대 기준 전진/후퇴, ↓/↑는 S/W, N은 중립(방향키 떼기)입니다. +는 동시 입력, ›는 연속 입력입니다. 프레임은 실제 전투 로직과 같은 src/characters.js에서 생성합니다.\n\n";
const sign = (n) => (n > 0 ? "+" + n : String(n));
for (const p of Object.values(CHARACTERS)) {
  text += `## ${p.name} — ${p.title}\n\n${p.style}. 기본 연계: **${p.chain.join(" › ").toUpperCase()}**.\n\n공중 5타 예시: **${p.moves.upper.command} › ${p.chain.slice(0, 2).join(" › ").toUpperCase()} › ${p.moves.bound.command} › ${p.moves.sideKick.command}**. 방향 기술 뒤에는 방향키를 떼고 다음 버튼을 입력하세요.\n\n| 기술 | 커맨드 | 종류 | 피해 | S | A | R | G | H |\n| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
  for (const move of Object.values(p.moves))
    text += `| ${move.name} | ${move.command} | ${{ high: "상단", mid: "중단", low: "하단", throw: "잡기" }[move.level]} | ${move.damage} | ${move.startup} | ${move.active} | ${move.recovery} | ${move.level === "throw" ? "—" : sign(move.onBlock)} | ${move.launch ? "L" : move.bound ? sign(move.onHit) + " / B" : sign(move.onHit)} |\n`;
  text += "\n";
}
writeFileSync(
  new URL("../docs/FRAME_DATA.md", import.meta.url),
  text.trimEnd() + "\n",
);
