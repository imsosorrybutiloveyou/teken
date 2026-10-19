# GitHub에서 캐릭터 이미지·애니메이션·타격음 바꾸기

**v3.7의 권장 방식은 [팔·다리 부품으로 자동 애니메이션 만들기](BODY_PARTS.md)입니다.** 8개 그림을 한 번 등록하면 기존 관절 모션으로 전 기술이 움직입니다. 아래 스프라이트 시트 방식은 선택 기능입니다.

v3.5부터 `public/custom-assets.json`으로 그림·소리를 교체합니다. 기본 설정은 빈 객체이며 기본 관절 애니메이션과 합성 타격음을 사용합니다. 외부 라이브러리나 원격 스크립트는 필요 없습니다. 사용 권한이 있는 파일을 준비하세요.

## 1. GitHub에 파일 올리기

저장소의 `public/mods/` 폴더를 열고 **Add file → Upload files**로 PNG/WebP/SVG 이미지, WAV/OGG/MP3 소리를 올린 뒤 커밋하세요. 다음으로 `public/custom-assets.json`을 열고 연필 아이콘으로 수정합니다. JSON에는 파일 경로를 **`/mods/파일명`**으로 적습니다. `public/`은 경로에 넣지 않습니다. 대소문자를 맞추고 파일명은 영문·숫자·하이픈을 권장합니다. 외부 URL과 `..` 경로는 허용하지 않습니다.

## 2. 초상화 교체 예시

캐릭터 선택 화면만 바꾸려면 `portrait`만 지정하세요. 가로 160 × 세로 128 이미지가 권장되며 다른 크기는 그 크기로 맞춥니다. 게임 중 동작은 그대로 유지됩니다.

```json
{
  "characters": {
    "kai": { "portrait": "/mods/kai-face.png" },
    "ren": {},
    "mira": {},
    "goro": {}
  },
  "sounds": {}
}
```

캐릭터 ID는 `kai`, `ren`, `mira`, `goro`, `hana`, `shin`, `boru`, `atlas`입니다.

## 3. 전투 애니메이션 교체 예시

투명 배경 스프라이트 시트를 만드세요. **오른쪽을 바라보는** 캐릭터를 칸마다 그립니다. 기본 좌표는 160×128 한 칸, 발밑 기준점 `(64,115)`입니다. 왼쪽을 보는 캐릭터는 게임이 자동으로 뒤집고, 점프·이동·카메라 크기도 게임이 적용합니다. 이미지에는 바닥 그림자를 넣지 않는 편이 좋습니다.

한 줄이 한 동작이고 왼쪽부터 시간 순서입니다. 줄 번호 `row`는 **0부터** 셉니다. 아래 예시는 960×512 시트입니다. 첫 줄은 대기 4칸(남는 2칸은 투명), 둘째 줄은 이동 6칸, 셋째 줄은 기본 왼손 6칸, 넷째 줄은 띄우기 6칸입니다.

```json
{
  "characters": {
    "ren": {
      "portrait": "/mods/ren-face.png",
      "sheet": "/mods/ren-sheet.png",
      "frameWidth": 160,
      "frameHeight": 128,
      "animations": {
        "idle": { "row": 0, "frames": 4, "fps": 8 },
        "walk": { "row": 1, "frames": 6, "fps": 12 },
        "u": { "row": 2, "frames": 6 },
        "upper": { "row": 3, "frames": 6 }
      }
    }
  },
  "sounds": { "ren.upper": "/mods/ren-heel.wav" }
}
```

등록하지 않은 동작은 기본 관절 애니메이션을 사용합니다. 파일·행·칸이 잘못되어도 해당 동작은 기본 그림으로 돌아갑니다. 일반 상태는 `fps`로 반복합니다. **공격은 fps를 무시하고 실제 기술의 S+A+R 시간에 맞춰 전체 칸을 한 번 재생합니다.** 공격 이미지에서 접촉하는 칸은 `S / (S+A+R) × 칸 수` 부근에 배치하세요. 예를 들어 10/2/17F 잽을 29칸으로 그리면 10번째 프레임에 타격 자세가 오도록 그립니다. 이미지 교체는 판정·사거리·프레임을 바꾸지 않습니다.

상태 키: `idle` 대기, `walk` 이동, `guard` 가드, `crouch` 앉기, `hit` 피격, `jump` 공중, `down` 다운. `down`을 등록한다면 눕는 자세부터 일어나는 자세까지 전환은 이미지에서 직접 표현해야 합니다(현재 상태 시트는 fps 반복 방식).

기술 키는 아래와 같습니다. 키는 입력/연계 처리를 위한 슬롯 이름이며 **캐릭터가 같다는 뜻이 아닙니다.** 예를 들어 `upper`는 KAI의 어퍼, REN의 뒤꿈치, MIRA의 탁장, GORO의 어깨받기입니다. `electric`은 KAI의 섬뢰권이며 다른 캐릭터는 훅킥·회피장·헤드차지입니다.

```text
u i j k oneTwo finish upper low sweep qcfPunch dragon qcfKick
 dashPunch palm backKick hopKick throw hook elbow bodyBlow toeKick
 sideKick axeKick kneeStrike bound rushStrike windGod electric hellSweep runningKick hellFollow styleFollow
```

## 4. 타격음 교체

`sounds`의 공통 키 `hit`(주먹/기본), `kick`(발·무릎), `heavy`(강타), `block`(가드)에 파일 경로를 지정합니다. 짧은 소리(약 0.05~0.5초)와 적당한 음량을 권장합니다. 브라우저가 지원하는 WAV가 호환성이 좋습니다.

```json
{
  "characters": {},
  "sounds": {
    "hit": "/mods/punch.wav",
    "kick": "/mods/kick.wav",
    "heavy": "/mods/heavy.wav",
    "block": "/mods/guard.wav",
    "goro.heavy": "/mods/goro-impact.wav",
    "kai.electric": "/mods/electric.wav",
    "ren.upper": "/mods/heel.wav"
  }
}
```

우선순위는 **캐릭터.기술 키 → 캐릭터.소리 종류 → 공통 종류 → 기본 합성음**입니다. 강타는 kick보다 heavy를 우선합니다. 파일이 없거나 디코딩되지 않으면 기본 소리가 납니다. 첫 타격 시 디코딩 중이면 합성음이 나오고 준비가 끝난 다음부터 새 소리가 납니다. 사운드 OFF에서는 둘 다 재생하지 않습니다. 에셋은 각 플레이어 EXE에 내장되며 상대에게 파일을 전송하지 않습니다.

## 5. 실제 기술과 관절 모션 수정

- `src/fighter-kits.js`: 캐릭터별 기본 30개 기술의 이름·타격 모션·상중하단/잡기·피해·리치, 특수 판정. 각 행 순서는 `src/characters.js`의 `keys`와 같습니다.
- `src/characters.js`: 캐릭터별 커맨드와 `[S,A,R,G,H]` 프레임, 연계 순서, 실제 전투 데이터 조립. REN/MIRA/GORO 특수 커맨드는 `specialCommands`에 있습니다.
- `src/style-motion.js`: REN/MIRA/GORO의 대기 자세와 손·발·어깨 공격의 준비/접촉 좌표. KAI의 카라테 모션은 `src/scene.js`에 있습니다. 공격 버튼 파생기 2개는 `src/characters.js`의 `followData`에 있습니다. 마지막에 IK가 관절 길이와 무릎 방향을 고정합니다.
- `src/scene.js`: 기본 팔레트·의상·외형·히트 이펙트.
- `src/main.js`: 에셋을 지정하지 않았을 때의 합성 타격음.

커맨드는 숫자 방향입니다. 6=전진, 4=후퇴, 2=아래, 8=위, 3=아래전진, 1=아래후퇴, 5=중립입니다. 수치만 바꿨을 때에도 게임 내 표와 문서가 맞도록 `npm run docs:frames`를 실행하세요. 판정을 바꾼 버전은 온라인 두 플레이어와 매칭 호스트를 함께 교체해야 합니다.

## 6. 바꾼 파일을 EXE에 넣고 GitHub 다운로드 갱신하기

**GitHub 원본 파일만 수정해도 이미 만들어진 EXE는 바뀌지 않습니다.** Node.js 22.12+와 Go 1.26+가 있는 PC에서 저장소를 내려받고 다음을 실행하세요.

```sh
npm ci
npm test
npm run docs:frames
npm run package:windows
```

`package:windows`는 웹 게임·`public/` 에셋을 새로 빌드하고 Go 테스트 후 Windows x64 EXE를 만듭니다. 결과:

```text
release/AXIS-Windows-x64.exe
release/AXIS-Windows-x64.exe.sha256
release/latest.json
```

세 파일을 `downloads/`에 복사해 기존 파일을 교체하세요. GitHub 웹에서는 `downloads/`의 **Add file → Upload files**로 같은 이름의 세 파일을 함께 업로드해 커밋할 수 있습니다. 소스·JSON·에셋·생성한 프레임표도 함께 반영하세요. 기존 **Windows EXE 다운로드** 링크가 새 파일을 가리킵니다. 이전 버전의 커밋에 고정된 링크는 계속 이전 파일을 받습니다.

로컬 확인은 `npm run dev`로 실행한 뒤 캐릭터 선택·기술·타격음을 확인하세요. 개발자 도구 Console/Network에서 파일명 오타·404·JSON 문법을 확인할 수 있습니다. EXE 배포 뒤에는 두 플레이어가 새 EXE를 다시 다운로드해야 합니다.

새 버전 번호 변경과 업데이트 감지 게시 방법은 [업데이트 안내](UPDATES.md)를 참고하세요.

v3.8의 추가 로스터·앉기/점프/기상 기술·카운터 목록은 `src/expanded-roster.js`에서 조정합니다. `counterLaunch`는 일반 적중이 아닌 카운터 적중일 때 띄우는 판정입니다.


v3.9 밸런스는 `src/expanded-roster.js`의 `comboScale`(후속 콤보 피해), `speed`(이동 배율), `anatomy`(위팔/아래팔/허벅지/종아리 길이), 각 기술의 `range`에서 조정합니다. BORU는 27/28/17/18 길이의 전용 골격을 쓰며 부품 rig도 같은 관절을 따릅니다. `wakeLow`/`wakeMid`는 누운 상태 J/K 전용 기술, `jumpPunch.bound`는 공중 내려찍기 바운드입니다. 섬뢰권 입력 허용치는 `justFrames`, 일반판은 `windGod` 슬롯입니다. 파일 수정 후 반드시 EXE를 다시 빌드하세요.
