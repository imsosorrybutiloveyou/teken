# AXIS SERVER — 같은 네트워크에서 주소로 플레이

[AXIS-SERVER-Windows-x64.exe 다운로드](https://github.com/imsosorrybutiloveyou/teken/raw/refs/heads/main/downloads/AXIS-SERVER-Windows-x64.exe)

1. Windows PC에서 AXIS SERVER를 실행하고 콘솔을 열어 둡니다. 설치·Node.js·Go가 필요 없습니다.
2. Windows 방화벽 알림에서 개인 네트워크 통신을 허용합니다(TCP 8080).
3. 콘솔의 `Open on phones/PCs: http://192.168.x.x:8080` 주소를 같은 Wi-Fi/LAN의 PC나 휴대폰 브라우저에서 엽니다. `127.0.0.1`이나 `0.0.0.0`을 휴대폰에 입력하지 마세요.
4. 온라인 → 서버 연결 → Player Match 방 생성/입장 → 양쪽 캐릭터 확정으로 대전합니다. AXIS SERVER에서 제공한 같은 주소로 두 기기 모두 접속하세요. 별도 게임 EXE를 실행할 필요가 없습니다.

연습과 아케이드도 같은 주소에서 사용할 수 있습니다. 휴대폰에는 방향키·횡보·U/I/J/K 버튼이 나타나고, 여러 손가락으로 방향+공격·잡기를 입력할 수 있습니다. ⛶ 전체화면으로 경기장을 확장합니다. 전체화면 API를 지원하지 않는 브라우저에서는 페이지 안에서 화면을 채웁니다. 브라우저 주소창은 기기 지원에 따라 남을 수 있습니다.

AXIS SERVER 브라우저 대전은 HTTP 환경의 모바일 제약을 피하기 위해 서버 중계를 사용합니다(입력/상태 전송을 최대 약 50회/초로 묶고 전투는 60Hz). 서버가 꺼지면 연결이 종료됩니다. 기존 일반 AXIS EXE 두 개 사이 대전은 WebRTC P2P를 유지합니다. AXIS SERVER는 별도 파일이며 게임용 자동 업데이트로 자신을 교체하지 않습니다. 새 서버 버전은 이 링크에서 다시 받아 실행하세요.

접속되지 않으면 같은 네트워크인지, 게스트 Wi-Fi의 기기 간 차단이 켜져 있는지, PC 주소와 8080 포트가 맞는지 확인하세요. 인터넷 공개용 인증/HTTPS 서버는 포함하지 않으며 같은 네트워크에서 사용하도록 구성했습니다. 기존 8787 매칭 호스트와는 별개로 8080에서 동작합니다.

개발자는 일반 빌드와 동일하게 `npm run package:windows`를 실행하면 `release/AXIS-SERVER-Windows-x64.exe`와 체크섬을 얻습니다. 명령행의 `--server` 옵션으로도 같은 기능을 켤 수 있습니다.


v3.12에서는 경기 위에서 자리와 맵을 선택하고 방을 만듭니다. 참가자는 반대 자리와 같은 맵으로 자동 설정됩니다. 서버와 양쪽 게임을 모두 v3.12로 맞추세요. [새 조작](COMBAT_V312.md)


v3.13은 프로토콜 15입니다. 게임 양쪽과 서버를 함께 업데이트하세요. [최신 밸런스·벽 배치](BALANCE_V313.md)


v3.14는 프로토콜 16이며 벽꽝을 지원합니다. 양쪽 게임과 서버를 함께 교체하세요. 앞으로 서버 EXE도 [GitHub Releases](https://github.com/imsosorrybutiloveyou/teken/releases/latest)에 게임 EXE와 함께 게시합니다. [변경 설명](RELEASE_NOTES.md)


v3.15는 프로토콜 17, RAON·랜덤 선택·기 게이지·장풍·강화기를 지원합니다. 서버 PC의 로컬 주소에서 이미지 변경으로 저장하면 새로 접속한 휴대폰에도 적용됩니다. 휴대폰에서 저장하면 해당 브라우저에만 저장됩니다. [이미지 안내](CUSTOMIZATION.md)
