# AXIS ADVANCE v3.13 Windows 다운로드

[**AXIS-Windows-x64.exe 다운로드**](https://github.com/imsosorrybutiloveyou/teken/raw/refs/heads/main/downloads/AXIS-Windows-x64.exe)

Windows 10/11 64비트용입니다. 다운로드 후 더블클릭하면 기본 브라우저에서 게임이 열립니다. Node.js 설치나 압축 해제가 필요하지 않으며 게임 중 실행 창은 열어 두세요.

8명의 캐릭터와 369개 기술, 후퇴 가드, 횡이동, 연습·아케이드·온라인 Player Match를 제공합니다. [사용 설명서](../사용설명서.md) · [프레임표](../docs/FRAME_DATA.md)

**첫 실행자가 매칭 호스트가 되며 같은 LAN의 다음 실행자는 자동 검색해 참가합니다.** 인터넷에서는 첫 PC의 공인/VPN 주소를 온라인 로비에 넣고, 호스트 TCP 8787 접근이 가능해야 합니다. 별도 Node.js 설치는 필요 없습니다. 호스트 EXE는 계속 켜 두세요. 공용 서버 없이 인터넷의 낯선 상대를 주소 없이 검색하는 기능은 없습니다. [상세 접속 방법](../사용설명서.md#6-온라인-준비-첫-pc가-호스트)

v3.13은 기본기 공중 콤보 약화, 아케이드 매 라운드 랜덤 맵, 서로 다른 벽 배치, 상대 콤보 표시, KAI 외 7명 캐릭터 특성 강화를 포함합니다. [변경 설명서](../docs/BALANCE_V313.md) · [백대시·횡이동·기존 조작](../docs/COMBAT_V312.md). 온라인 양쪽과 첫 호스트 또는 AXIS SERVER를 모두 v3.13으로 교체하세요.

제작자 인증서로 서명되지 않은 빌드이며 실제 Windows에서의 직접 실행 검증은 아직 하지 않았습니다. [SHA-256](AXIS-Windows-x64.exe.sha256)은 PowerShell에서 다음 명령으로 비교할 수 있습니다.

```powershell
Get-FileHash .\AXIS-Windows-x64.exe -Algorithm SHA256
```

개발자는 Node.js 의존성과 Go 1.26 이상을 준비한 뒤 `npm run package:windows`로 EXE를 다시 만들고 `release/`의 EXE·체크섬·latest.json을 이 폴더에 함께 복사합니다.


[AXIS SERVER 다운로드](AXIS-SERVER-Windows-x64.exe) · [같은 네트워크 접속 설명서](../docs/AXIS_SERVER.md) · [격자 스킨 편집](../docs/SKINS.md)
