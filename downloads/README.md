# AXIS ADVANCE v2 Windows 다운로드

[**AXIS-Windows-x64.exe 다운로드**](https://github.com/imsosorrybutiloveyou/teken/raw/refs/heads/main/downloads/AXIS-Windows-x64.exe)

Windows 10/11 64비트용, 약 6.1MiB입니다. 파일을 다운로드해 더블클릭하면 기본 브라우저에서 게임이 열립니다. Node.js 설치나 압축 해제는 필요하지 않습니다. 게임 중에는 함께 열린 실행 창을 유지하세요. 자세한 조작과 온라인 연결은 [사용 설명서](../사용설명서.md)에 있습니다.

v2는 2D 픽셀 캐릭터, 깊이 방향 횡이동, 무한 맵, 방향 커맨드, U/I/J/K 4버튼 조작을 지원합니다. 이전 파일은 종료하고 새로 받은 파일로 교체하세요.

게임과 글꼴이 EXE에 포함되어 있습니다. CPU 연습은 인터넷 없이 가능하며, P2P 온라인 대전에는 인터넷 연결과 두 사람의 초대·응답 코드 교환이 필요합니다.

실행 파일은 제작자 인증서로 서명되지 않았습니다. 실제 Windows 실행은 아직 검증하지 않았고, Linux에서 Windows x64 빌드 형식과 내장 게임의 동작을 검증했습니다.

## 파일 확인

[SHA-256 체크섬](AXIS-Windows-x64.exe.sha256)을 함께 제공합니다. Windows PowerShell에서 EXE를 받은 폴더로 이동해 다음 명령을 실행하고 결과를 체크섬 파일과 비교하세요.

```powershell
Get-FileHash .\AXIS-Windows-x64.exe -Algorithm SHA256
```

## 새 버전 만들기

저장소 루트에서 Node.js 의존성과 Go 1.26 이상을 준비한 뒤 실행합니다.

```sh
npm ci
npm run package:windows
```

`release/`의 새 EXE와 `.sha256` 파일을 이 `downloads/` 폴더에 함께 복사하고 커밋하세요.
