# TapBoom

숏폼 시청자를 타깃으로 한 모바일 웹 캐주얼 게임 플랫폼.  
한 손가락으로 즉시 플레이, 10초 안에 도파민 피크, 짧은 판과 빠른 재시작이 핵심 설계 원칙이다.

## 구조

```
tapboom/
├── shared/          # 모든 게임이 공유하는 공통 모듈
│   ├── ads.js       # H5 Games Ad Placement API 래퍼 (광고 빈도 제어)
│   ├── storage.js   # localStorage 베스트 기록 (getBest / setBest)
│   ├── sound.js     # WebAudio 합성 효과음 (오디오 파일 0바이트)
│   ├── fx.js        # 파티클 · 화면흔들림 · 숫자팝업 · 플래시 (PixiJS 기반)
│   ├── input.js     # 패들 조작 — 터치 · 마우스 · 키보드 통합
│   ├── physics.js   # 공 반사 · 충돌 수학
│   ├── gameshell.js # 시작 · 게임오버 · 재시작 UI + 사운드 토글
│   └── base.css     # 공통 리셋 · 스타일
└── g/
    └── ballstorm/   # 게임 #001 — BALL STORM
        ├── index.html
        └── game.js
```

`shared/` 모듈은 특정 게임에 의존하지 않는다. 2호기부터는 `shared/`를 그대로 import하고 게임 로직만 새로 작성한다.

## 게임

| # | 이름 | 장르 | 경로 |
|---|------|------|------|
| 001 | BALL STORM | 벽돌깨기 (아이템 증식형) | `/g/ballstorm/` |

## 스택

- **렌더링**: [PixiJS](https://pixijs.com/) v7 (WebGL)
- **물리**: 자체 경량 수학 (`shared/physics.js`)
- **사운드**: WebAudio API 합성음 — 파일 없음
- **배포**: Cloudflare Pages (정적), iframe 임베드 가능
- **서버**: 없음 — 모든 상태는 `localStorage`

## 로컬 실행

```bash
npx serve .
# → http://localhost:3000/g/ballstorm/
```

Node.js 외 별도 의존성 없음.

## 설계 원칙

1. **플레이어가 폭발의 방아쇠를 쥔다** — 자동/방치 없음.
2. **시작 10~15초 내 음소거로도 읽히는 도파민 피크** — 드롭률 설계로 강제 보장.
3. **짧은 판 + 한 번 탭으로 재시작** — 마찰 최소화.
4. **익숙한 코어 + 비트는 한 방** — 진입 장벽은 낮게, 차별점은 분명하게.

## 광고

Google AdSense H5 Games Ad Placement API 사용.  
`shared/ads.js`가 타이밍을 판단·트리거한다 (게임 진입 1회, 게임오버 N판마다 1회).  
보상형 광고 없음. 광고 클릭 유도 등 정책 위반 요소 없음.
