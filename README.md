# Spurs Pulse

토트넘 팬을 위한 로컬 팬페이지입니다. 최신 핵심 기사와 이적시장 피드를 무료 공개 소스와 커뮤니티 목록에서 모아 보여줍니다.

## 실행

```powershell
node server.js
```

브라우저에서 `http://127.0.0.1:4173`을 열면 됩니다.

정적 미리보기만 필요하면 `npx --yes serve -l 4173 .`도 동작하지만, 무료 뉴스·커뮤니티 피드는 `server.js`로 실행해야 합니다.

팬카페 공유용으로 서버에 올릴 때는 [DEPLOY.md](./DEPLOY.md)를 먼저 확인하세요.

## 무료 뉴스·커뮤니티 피드

`/api/community-feed`, `/api/korean-feed`, `/api/transfer-feed`가 아래 공개 소스를 1분 캐시로 확인합니다. `/api/squad`는 Tottenham Hotspur 공식 남자 선수단 페이지를 6시간 캐시로 확인하고, `/api/player-detail`은 선수별 공식 프로필을 필요할 때 확인합니다. `/api/injuries`는 Transfermarkt의 시즌별 토트넘 결장 기록을 현재 선수단 기준으로 정리합니다. `/api/results`는 Transfermarkt의 시즌별 일정/결과를 경기 결과 페이지에 맞게 정리합니다.

- Google News RSS: 토트넘, Tottenham, 이적시장 키워드
- FMKorea 해외축구 토트넘 카테고리
- DCInside 토트넘 핫스퍼 갤러리
- Naver Cafe The Lilywhites: 오피셜, 이적 소식, 뉴스, SNS 소식, 전문 번역 게시판 목록 수집

국문/영문 피드는 해외 매체, Google News, 네이버 카페 게시판 목록을 함께 보여주되 제목, 요약, 출처에서 지정 기자 이름을 찾아 우선 정렬합니다. 이적 시장은 기자 또는 신뢰 출처가 매칭된 항목만 표시합니다. 예: Alasdair Gold, David Ornstein, Fabrizio Romano, Paul O'Keefe, Dan Kilpatrick, Jack Pitt-Brooke 등.

기본 갱신 간격은 로컬 60초, 배포 모드 3분입니다. 더 천천히 돌리고 싶으면:

```powershell
$env:COMMUNITY_CACHE_MS="300000"
node server.js
```

## X 실시간 피드

X API는 비용 부담이 있을 수 있어 기본 화면에서는 사용하지 않습니다. 그래도 공식 X API Bearer Token이 있으면 `/api/x-feed`는 아래처럼 사용할 수 있습니다.

```powershell
$env:X_BEARER_TOKEN="여기에_토큰"
node server.js
```

추적 계정:

- `@SpursOfficial`
- `@FabrizioRomano`
- `@pokeefe1` Paul O'Keefe
- `@LastWordOnSpurs`
- `@AlasdairGold`

토큰이 없으면 페이지가 깨지지 않도록 설정 안내 카드와 계정 바로가기를 표시합니다.

## 구성

- `index.html` - 홈 화면
- `korean.html`, `english.html`, `market.html` - 피드별 페이지
- `players.html` - 공식 선수단/임대 선수 표, 포지션 뎁스차트
- `player.html` - 선수 상세 정보 페이지
- `injuries.html` - 시즌별 부상/결장 이력 페이지
- `results.html` - 시즌별 경기 결과 페이지
- `styles.css` - 반응형 UI 스타일
- `app.js` - 피드 렌더링, 페이지 이동, 클라이언트 캐시
- `server.js` - 로컬 서버, 무료 크롤링, 보안 헤더, 피드/선수단/경기 결과 API

## 보안 메모

서버는 기본적으로 로컬에서는 `127.0.0.1`에만 바인딩됩니다. `NODE_ENV=production`이면 클라우드 배포용으로 `0.0.0.0`에 바인딩됩니다. 외부에서 접속시키려면 방화벽, 프록시, 접근 제한을 먼저 정리하세요.

- 정적 파일은 `index.html`, 피드 HTML, `styles.css`, `app.js`만 제공합니다.
- `server.js`, `package.json`, `.git` 같은 내부 파일은 URL로 열리지 않습니다.
- CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` 헤더를 붙입니다.
- API와 화면 렌더링 모두 원문 링크를 HTTP/HTTPS만 허용합니다.
- 기본 요청 제한은 1분에 240회입니다. 조정하려면:

```powershell
$env:MAX_REQUESTS_PER_MINUTE="120"
node server.js
```

## 데이터 메모

피드와 이적시장은 서버 실행 중 크롤링 결과로 갱신됩니다. X는 로그인, API, 스크래핑 제한이 자주 바뀌므로 기본값에서는 사용하지 않습니다.

사진은 Wikimedia Commons 공개 라이선스 이미지를 원격으로 불러옵니다. 사용한 주요 파일은 `Tottenham_Hotspur_Stadium.jpg`, `Tottenham_Hotspur_Stadium_golden_hour_London_01.jpg`, `Concourse_inside_the_Tottenham_Hotspur_Stadium.jpg`, `London_Tottenham_Hotspur_Stadium.jpg`입니다.
