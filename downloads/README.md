# AXIS ADVANCE v3 Windows 다운로드

[**AXIS-Windows-x64.exe 다운로드**](https://github.com/imsosorrybutiloveyou/teken/raw/refs/heads/main/downloads/AXIS-Windows-x64.exe)

Windows 10/11 64비트용입니다. 다운로드 후 더블클릭하면 기본 브라우저에서 게임이 열립니다. Node.js 설치나 압축 해제가 필요하지 않으며 게임 중 실행 창은 열어 두세요.

v3는 KAI/REN/MIRA/GORO 4명, 고유 커맨드·프레임, 후퇴 가드, 완화된 이동·히트스톱, 상대 중심 횡이동과 양쪽 대치 구도를 제공합니다. [사용 설명서](../사용설명서.md) · [프레임표](../docs/FRAME_DATA.md)

**인터넷 퀵 매치·방 목록에는 별도 공용 서버가 필요합니다. 현재 서버는 미배포 상태이며 [서버 코드와 배포 설정](../docs/DEPLOYMENT.md)을 제공합니다.** 배포 후 실제 서버 URL을 온라인 로비에 입력하면 자동 매칭/방 입장 후 캐릭터 선택과 P2P 연결을 사용할 수 있습니다. CPU 연습은 서버나 인터넷 없이 됩니다.

제작자 인증서로 서명되지 않은 빌드이며 실제 Windows에서의 직접 실행 검증은 아직 하지 않았습니다. [SHA-256](AXIS-Windows-x64.exe.sha256)은 PowerShell에서 다음 명령으로 비교할 수 있습니다.

```powershell
Get-FileHash .\AXIS-Windows-x64.exe -Algorithm SHA256
```

개발자는 Node.js 의존성과 Go 1.26 이상을 준비한 뒤 `npm run package:windows`로 EXE를 다시 만들고 `release/`의 EXE·체크섬을 이 폴더에 함께 복사합니다.
