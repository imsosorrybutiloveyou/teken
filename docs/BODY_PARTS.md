# 팔·다리 그림으로 자동 애니메이션 만들기

v3.7부터 캐릭터를 8개 부품으로 나누어 등록할 수 있습니다. **공격마다 그림을 그리지 않아도 됩니다.** 게임의 기존 관절·IK·준비/타격/회수 모션이 이미지를 자동으로 배치하고 회전합니다. 걷기·가드·앉기·피격·다운과 캐릭터별 기술에도 같은 부품을 사용합니다.

## 가장 빠르게 적용하기

1. [public/rig-example.json](../public/rig-example.json)을 엽니다. 예제 전체 내용을 [public/custom-assets.json](../public/custom-assets.json)에 복사하고 커밋하세요. 기존에 등록한 소리나 초상화가 있다면 해당 항목을 유지하면서 `characters.kai.rig`만 합치세요.
2. 예제는 [public/mods/rig-template/](../public/mods/rig-template/)의 SVG 부품 8개를 사용합니다. 먼저 `npm run dev`로 실행하고 KAI를 선택하면 부품 캐릭터가 자동으로 움직입니다.
3. 원하는 부품을 PNG/WebP/SVG로 그려 `public/mods/`에 업로드하고 JSON의 `src`를 바꾸세요. 기본 템플릿 SVG를 그대로 수정해도 됩니다.
4. 다른 캐릭터는 `characters.ren.rig`, `characters.mira.rig`, `characters.goro.rig`에 동일한 형식으로 등록합니다. 같은 그림을 써도 각자의 기술 모션은 다르게 동작합니다.
5. EXE는 파일을 내장하므로 [재빌드·GitHub 업로드 절차](CUSTOMIZATION.md#6-바꾼-파일을-exe에-넣고-github-다운로드-갱신하기)를 따라 새로 배포하세요. GitHub에 그림만 바꿔도 기존 EXE가 실시간으로 바뀌지는 않습니다.

## 어떤 부품을 그리나요?

| 키       | 그림               | 기본 렌더 폭 | 그리는 방향                  |
| -------- | ------------------ | -----------: | ---------------------------- |
| head     | 머리·얼굴·머리카락 |           24 | 얼굴은 오른쪽                |
| torso    | 목 아래 몸통·의상  |           28 | 위가 어깨, 아래가 허리       |
| upperArm | 위팔               |            9 | 위가 어깨, 아래가 팔꿈치     |
| forearm  | 아래팔             |            8 | 위가 팔꿈치, 아래가 손목     |
| hand     | 손·장갑            |           11 | 가운데를 손목 위치에 배치    |
| thigh    | 허벅지             |           12 | 위가 골반, 아래가 무릎       |
| shin     | 종아리             |           10 | 위가 무릎, 아래가 발목       |
| foot     | 발·신발            |           19 | 발끝은 오른쪽, 가운데가 발목 |

투명 배경으로 그리고 팔·다리는 세로 방향으로 길게 그리세요. 이미지의 위쪽·아래쪽 끝을 각 관절에 연결하므로 위아래에 큰 투명 여백을 넣지 마세요. 같은 팔·다리 부품을 양쪽 관절에 재사용합니다. 왼쪽을 바라볼 때는 캐릭터 전체를 자동으로 뒤집습니다.

머리·손·발은 `width`, `height`로 표시 크기를 정합니다. 몸통·위팔·아래팔·허벅지·종아리는 `width`로 두께를 정하며 길이는 실제 관절 사이 거리에 자동으로 맞춥니다. 단위는 내부 픽셀입니다. 관절 길이·무릎 방향은 게임에서 유지하므로 부품의 원본 이미지 해상도와 공격 타이밍은 별개입니다.

설정 예시(일부가 아닌 8개 모두 등록):

```json
{
  "characters": {
    "kai": {
      "rig": {
        "head": { "src": "/mods/my-head.png", "width": 24, "height": 29 },
        "torso": { "src": "/mods/my-body.png", "width": 28 },
        "upperArm": { "src": "/mods/my-upper-arm.png", "width": 9 },
        "forearm": { "src": "/mods/my-forearm.png", "width": 8 },
        "hand": { "src": "/mods/my-hand.png", "width": 11, "height": 11 },
        "thigh": { "src": "/mods/my-thigh.png", "width": 12 },
        "shin": { "src": "/mods/my-shin.png", "width": 10 },
        "foot": { "src": "/mods/my-foot.png", "width": 19, "height": 10 }
      }
    }
  },
  "sounds": {}
}
```

파일 경로는 `/mods/`로 시작하고, 실제 파일은 저장소 `public/mods/` 아래에 있어야 합니다. 8개가 모두 유효하고 로드되면 부품 렌더러를 사용합니다. 파일이 빠지거나 로드되지 않으면 기존 스프라이트 시트 또는 기본 그래픽으로 돌아갑니다. `portrait`을 지정하지 않으면 캐릭터 선택 초상화에도 부품 그림을 사용합니다.

완성된 `rig`가 스프라이트 시트보다 우선합니다. 기존 `sheet` 기능은 그대로 남아 있으므로 직접 프레임을 그리는 방식도 선택할 수 있습니다. 부품 이미지를 바꾸는 것만으로는 판정·기술 프레임·데미지가 바뀌지 않습니다. 모션 자체를 조정하려면 `src/style-motion.js`와 `src/scene.js`의 자세 좌표를 수정하세요. [전체 교체 가이드](CUSTOMIZATION.md)
