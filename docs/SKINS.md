# 한 장 격자 스킨

[편집할 투명 PNG 원본](../public/mods/skin-template.png) · [격자와 부품명이 표시된 안내 PNG](../public/mods/skin-grid-guide.png) · [설정 예제](../public/skin-example.json)

128×64 픽셀 PNG 한 장을 32×32 칸 8개로 나눕니다. 256×128, 512×256처럼 정수 배율로 확대해도 됩니다. 가로:세로는 반드시 2:1이고 가로는 128의 배수여야 합니다. 마인크래프트의 실제 스킨 UV와 호환되는 것은 아니며 AXIS 전용 부품 배치입니다.

| 왼쪽부터 | 1열 | 2열 | 3열 | 4열 |
|---|---|---|---|---|
| 위 행 | 머리 head | 몸통 torso | 위팔 upperArm | 아래팔 forearm |
| 아래 행 | 손 hand | 허벅지 thigh | 종아리 shin | 발 foot |

1. PNG 원본을 내려받아 그림판·픽셀 편집기에서 각 칸을 수정합니다. 격자 안내 파일은 위치를 보는 용도입니다. 안내 글자와 선을 실제 스킨에 그리면 게임에도 나타납니다.
2. 머리와 발은 오른쪽을 향하게 그립니다. 몸통·팔·다리는 세로 방향으로, 위가 어깨/골반 쪽입니다. 투명 배경을 유지하고 칸 밖으로 그리지 마세요.
3. 저장소 `public/mods/my-skin.png`에 업로드합니다.
4. `public/custom-assets.json`의 원하는 캐릭터에 아래처럼 `skin`을 지정합니다. 8개 그림을 따로 등록할 필요가 없습니다.

```json
{
  "characters": {
    "kai": { "skin": "/mods/my-skin.png" },
    "boru": { "skin": "/mods/bear-skin.png" }
  },
  "sounds": {}
}
```

팔·다리 칸은 양쪽 관절에 재사용하고, 반대 방향을 볼 때 자동 반전합니다. 게임의 골격과 기술별 모션을 따라 자동으로 움직입니다. 곰의 짧은 다리·긴 팔도 유지됩니다. 완성된 `skin`은 기존 8부품 rig와 스프라이트 시트보다 우선합니다. 비율이 틀리거나 파일을 읽지 못하면 기본 그래픽을 사용합니다.

5. `npm run package:windows`로 게임과 AXIS SERVER를 다시 빌드하고 `release`의 실행 파일을 `downloads`에 교체합니다. 이미 받은 EXE는 GitHub 그림만 바꿔도 실시간으로 바뀌지 않습니다. [빌드·배포 방법](CUSTOMIZATION.md#6-바꾼-파일을-exe에-넣고-github-다운로드-갱신하기)

타격음 교체는 [기존 에셋 설정 안내](CUSTOMIZATION.md)를 사용합니다. 기존 부품별·프레임별 방식도 사용할 수 있습니다.
