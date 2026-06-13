# Spurs Pulse 배포 메모

토트넘 팬카페에 공유하려면 로컬 실행이 아니라 Node.js 웹 서버로 배포해야 합니다.

## 배포 전 체크

- `npm run check`
- `npm start`
- 브라우저에서 `http://127.0.0.1:4173` 확인

## 필수 설정

대부분의 Node 호스팅 서비스는 `PORT`를 자동으로 넣어줍니다. 이 프로젝트는 `NODE_ENV=production`이면 자동으로 `0.0.0.0`에 바인딩됩니다.

권장 환경변수:

```text
NODE_ENV=production
COMMUNITY_CACHE_MS=300000
FEED_CACHE_MS=180000
MAX_REQUESTS_PER_MINUTE=120
PUBLIC_BASE_URL=https://배포주소
```

작게 테스트할 때는 `COMMUNITY_CACHE_MS=180000`도 괜찮지만, 팬카페에 공개 링크를 올릴 때는 3-5분 이상이 안전합니다.

## 실행 명령

```text
npm install
npm start
```

`package.json`에 이미 `start`가 있으므로 Render, Railway, Fly.io 같은 Node 호스팅에서 그대로 감지할 수 있습니다.

## 주의할 점

- 공개 공유 시 크롤링 대상 사이트에 부담이 가지 않게 캐시 시간을 늘리세요.
- Naver Cafe 글은 로그인/권한/카페 정책에 따라 서버에서 못 가져오는 항목이 생길 수 있습니다.
- 팬페이지 용도라도 원문 전체 복붙보다 제목, 요약, 원문 링크 중심으로 유지하는 편이 안전합니다.
- 처음에는 팬카페에 전체 공개보다 몇 명에게 먼저 테스트 링크를 공유해서 속도와 누락 데이터를 보는 것을 추천합니다.

## Render 무료 플랜 깨우기

Render 무료 인스턴스는 한동안 접속이 없으면 잠들 수 있습니다. UptimeRobot 같은 외부 모니터를 쓰려면 메인 페이지가 아니라 가벼운 헬스 체크 주소를 확인하게 하세요.

```text
https://배포주소/healthz
```

UptimeRobot 설정 예:

```text
Monitor Type: HTTP(s)
URL: https://배포주소/healthz
Monitoring Interval: 5 minutes
```

이 주소는 `ok`만 반환하므로 뉴스/카페/경기 결과 크롤링을 새로 돌리지 않습니다.

Render 자체 Health Check Path를 설정할 수 있다면 이것도 `/healthz`로 두면 됩니다.

## 로컬에서 공개 모드 테스트

PowerShell:

```powershell
$env:NODE_ENV="production"
$env:COMMUNITY_CACHE_MS="300000"
$env:FEED_CACHE_MS="180000"
$env:MAX_REQUESTS_PER_MINUTE="120"
npm start
```

같은 공유기 안의 다른 기기에서 보려면 Windows 방화벽과 공유기 네트워크 설정도 열어야 합니다. 외부 공개는 호스팅 서비스를 쓰는 편이 훨씬 편합니다.
