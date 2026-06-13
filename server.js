const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1");
const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
const bearerToken = process.env.X_BEARER_TOKEN;
const defaultFeedCacheMs = isProduction ? 3 * 60 * 1000 : 60_000;
const cacheTtlMs = Number(process.env.FEED_CACHE_MS || defaultFeedCacheMs);
const communityCacheTtlMs = Number(process.env.COMMUNITY_CACHE_MS || defaultFeedCacheMs);
const squadCacheTtlMs = Number(process.env.SQUAD_CACHE_MS || 6 * 60 * 60 * 1000);
const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://${displayHost}:${port}`;
const crawlerUserAgent =
  `Mozilla/5.0 (compatible; SpursPulse/1.0; Tottenham fan dashboard; +${publicBaseUrl})`;

const xAccounts = [
  { username: "SpursOfficial", label: "Spurs Official" },
  { username: "FabrizioRomano", label: "Fabrizio Romano" },
  { username: "pokeefe1", label: "Paul O'Keefe" },
  { username: "LastWordOnSpurs", label: "Last Word On Spurs" },
  { username: "AlasdairGold", label: "Alasdair Gold" },
];

const trustedReporterGroups = [
  ["Alasdair Gold", "알레스데어 골드", "알레스데어골드"],
  ["David Ornstein", "데이비드 온스테인", "온스테인", "Ornstein"],
  ["Fabrizio Romano", "파브리지오 로마노", "로마노", "Romano"],
  ["Dan Kilpatrick", "댄 킬패트릭", "Kilpatrick"],
  ["Jack Pitt-Brooke", "Jack Pitt Brooke", "잭 핏브룩", "핏브룩", "Pitt-Brooke", "Pitt Brooke"],
  ["Jay Harris", "제이 해리스"],
  ["Matt Law", "맷 로"],
  ["Sami Mokbel", "사미 목벨", "Mokbel"],
  ["Michael Bridge", "마이클 브릿지"],
  ["Lyall Thomas", "라일 토마스"],
  ["Nizaar Kinsella", "니자르 킨셀라", "Kinsella"],
  ["David Hytner", "데이비드 하이트너", "Hytner"],
  ["Gianluca Di Marzio", "지안루카 디마르지오", "디마르지오", "Di Marzio"],
  ["Florian Plettenberg", "플로리안 플레텐베르크", "Plettenberg"],
  ["Paul Joyce", "폴 조이스"],
  ["James Pearce", "제임스 피어스"],
  ["Jason Burt", "제이슨 버트"],
  ["Paul O'Keefe", "Paul O’Keefe", "PO", "피오", "O'Keefe", "O’Keefe", "pokeefe"],
  ["Charlie Eccleshare", "찰리 에클셰어", "Eccleshare"],
  ["Simon Stone", "사이먼 스톤"],
  ["Ben Jacobs", "벤 제이콥스"],
  ["Mike McGrath", "마이크 맥그래스"],
  ["Rob Dawson", "롭 도슨"],
  ["Mark Ogden", "마크 오그든"],
  ["Miguel Delaney", "미겔 딜레이니"],
  ["Duncan Castles", "던컨 캐슬스"],
  ["Alex Crook", "알렉스 크룩"],
  ["Dean Jones", "딘 존스"],
  ["Tom Barclay", "톰 바클레이"],
  ["Gary Jacob", "게리 제이콥"],
  ["Tom Allnutt", "톰 올넛"],
  ["Kaveh Solhekol", "카베 솔헤콜", "Solhekol"],
  ["Dharmesh Sheth", "다르메시 셰스"],
  ["Rob Dorsett", "롭 도싯"],
];

const expandedReporterGroups = [
  ["Matteo Moretto", "마테오 모레토", "모레토", "Moretto"],
  ["Peter Rutzler", "피터 루촐러", "피터 루츨러", "루촐러", "Rutzler"],
  ["Yagiz Sabuncuoglu", "Yağız Sabuncuoğlu", "아기즈 사분쿠오글루", "야기즈 사분쿠오글루", "사분쿠오글루", "Sabuncuoglu"],
  ["Matt Woosnam", "맷 웃남", "웃남", "Woosnam"],
  ["John Percy", "존 퍼시", "Percy"],
  ["Liam Keen", "리암 킨", "Keen"],
  ["Fabrizio Biasin", "파브리지오 비아신", "비아신", "Biasin"],
  ["Jack Gaughan", "잭 고헌", "고헌", "Gaughan"],
  ["Tom Bogert", "톰 보거츠", "보거츠", "Bogert"],
  ["Lee Ryder", "리 라이더", "Ryder"],
  ["Patrick Boyland", "패트릭 보일랜드", "보일랜드", "Boyland"],
  ["Phil Hay", "필 헤이", "Hay"],
  ["Jacob Tanswell", "제이콥 탄스웰", "탄스웰", "Tanswell"],
  ["Luca Bendoni", "루카 벤도니", "벤도니", "Bendoni"],
  ["El Bobble", "엘 보블", "보블", "Bobble"],
  ["Joe Donnohue", "조 다파니", "조 도노휴", "Donnohue"],
  ["Teamnewsandtix", "Team News", "팀 뉴스", "Teamnews", "Team News and Ticks"],
  ["Simon Bajkowski", "바이코프스키", "Bajkowski"],
  ["BBC", "BBC Sport", "비비씨"],
  ["PA", "Press Association"],
  ["Fabrice Hawkins", "파브리시오 호킨스", "파브리스 호킨스", "호킨스", "Hawkins"],
  ["Daniel Fink", "다니엘 핑크", "핑크", "Fink"],
  ["Antonio Vitiello", "안토니오 비티엘로", "비티엘로", "Vitiello"],
  ["Simon Johnson", "사이먼 존슨", "Johnson"],
  ["Simon Hughes", "사이먼 휴즈", "Hughes"],
  ["Craig Hope", "크레이그 호프", "Hope"],
  ["Sacha Tavolieri", "사샤 타볼리에리", "타볼리에리", "Tavolieri"],
  ["Gregg Evans", "그렉 에반스", "Greg Evans", "Evans"],
  ["Christian Falk", "크리스티안 폴크", "폴크", "Falk"],
  ["Loic Tanzi", "Loïc Tanzi", "로익 탄지", "탄지", "Tanzi"],
  ["Alan Nixon", "앨런 닉슨", "Nixon"],
  ["Jacob Steinberg", "제이콥 스테인버그", "Steinberg"],
  ["Philipp Hinze", "필립 힌지", "힌지", "Hinze"],
  ["The Athletic", "디 애슬레틱", "애슬레틱"],
  ["RMC", "RMC Sport"],
  ["L'Equipe", "L’Équipe", "L Equipe", "레퀴프", "르퀴프"],
  ["Le Parisien", "르 파리지앵", "르파리지앵"],
  ["Nicolo Schira", "Nicolò Schira", "니콜로 스키라", "스키라", "Schira"],
  ["James Olley", "제임스 올리", "Olley"],
  ["Sam Dean", "샘 딘", "Dean"],
  ["Pete Smith", "피트 스미스", "Smith"],
  ["Santi Aouna", "산티 아우나", "Aouna"],
  ["Di Natale", "디 나탈레", "나탈레"],
  ["Poseidon", "포세이돈"],
  ["Himoshi", "히모시"],
  ["The Source", "더소스"],
  ["MAS", "Mas"],
  ["Lihwaro", "릴화로"],
  ["Ekrem Konur", "에르렘 코누르", "에크렘 코누르", "코누르", "Konur"],
  ["Simon Phillips", "사이먼 필립스", "Phillips"],
  ["Fraser Fletcher", "프레이저 플레처", "Fletcher"],
  ["Zeus", "제우스"],
  ["Indykaila", "인다카일라"],
  ["Pedro Almeida", "페드로 알메이다", "알메이다", "Almeida"],
  ["Rudy Galetti", "루디 갈레티", "갈레티", "Galetti"],
  ["CaughtOffside", "컷옵사", "Caught Offside"],
  ["chef", "chef.", "셰프"],
  ["SZ", "Sport Zeitung", "Süddeutsche Zeitung"],
  ["Football Insider", "풋인싸", "Foot Insider", "풋볼 인사이더"],
  ["Diario Ole", "Diario Olé", "디아리오 올레", "올레"],
  ["John Cross", "존 크로스", "Cross"],
  ["Niccolo Santi", "Niccolò Santi", "니콜로 산티", "Santi"],
  ["Krrish", "크리쉬"],
  ["Pizzahut", "피자허스", "Pizza Hut"],
  ["Jorbi Sessions", "조르비 세션스"],
  ["Jeon Ha-ki", "전하기"],
  ["Jeonhwagi", "전화기"],
  ["Capology", "캐폴로지"],
  ["David Hytner", "데이비드 히트너", "히트너"],
  ["Tom Allnutt", "톰 올넛", "올넛"],
  ["Miguel Delaney", "미구엘 델라니", "델라니"],
];

const trustedReporters = [...trustedReporterGroups, ...expandedReporterGroups].map((aliases) => ({
  canonical: aliases[0],
  aliases,
}));

const allowedForeignNewsSources = [
  "BBC",
  "BBC Sport",
  "Sky Sports",
  "The Guardian",
  "The Athletic",
  "ESPN",
  "FotMob",
  "Football London",
  "football.london",
  "Spurs Web",
  "Evening Standard",
  "Standard",
  "Daily Mail",
  "Mail Sport",
  "Telegraph",
  "The Telegraph",
  "Independent",
  "The Independent",
  "Reuters",
  "Associated Press",
  "PA Media",
  "AP News",
  "Goal.com",
  "FourFourTwo",
  "90min",
  "CaughtOffside",
  "TBR Football",
  "TEAMtalk",
  "GiveMeSport",
  "Transfermarkt",
  "Fabrizio Romano",
  "Gianluca Di Marzio",
  "Football Italia",
  "Sport Witness",
  "Football Insider",
  "RMC Sport",
  "L'Equipe",
  "Le Parisien",
  "Süddeutsche Zeitung",
  "BILD",
];

const fallbackItems = xAccounts.map((account) => ({
  id: `fallback-${account.username}`,
  account: account.label,
  username: account.username,
  createdAt: null,
  text: `${account.label} 계정은 X API 토큰을 설정하면 최신 포스트가 자동으로 들어옵니다.`,
  url: `https://x.com/${account.username}`,
  links: [`https://x.com/${account.username}`],
}));

let cache = {
  expiresAt: 0,
  payload: null,
};

let communityCache = {
  expiresAt: 0,
  payload: null,
};

let translatedFeedCache = {
  expiresAt: 0,
  payload: null,
};

let transferFeedCache = {
  expiresAt: 0,
  payload: null,
};

let squadFeedCache = {
  expiresAt: 0,
  payload: null,
};

const imageProxyCache = new Map();

const injuryFeedCache = new Map();

const resultFeedCache = new Map();

const playerDetailCache = new Map();

const translationCache = new Map();

const transferTerms = [
  "transfer",
  "signing",
  "bid",
  "target",
  "linked",
  "fee",
  "agreement",
  "verbal agreement",
  "hijack",
  "medical",
  "loan",
  "exit",
  "release clause",
  "replace",
  "talks",
  "set to join",
  "close to",
  "영입",
  "이적",
  "합의",
  "링크",
  "임대",
  "메디컬",
  "대체",
  "오피셜",
  "로마노",
  "찌라시",
];

const squadSource = {
  label: "Tottenham Hotspur",
  url: "https://www.tottenhamhotspur.com/teams/men/players/",
};

const injurySource = {
  label: "Transfermarkt",
  baseUrl: "https://www.transfermarkt.com/tottenham-hotspur/ausfallzeiten/verein/148/plus/1",
};

const resultSource = {
  label: "Transfermarkt",
  baseUrl: "https://www.transfermarkt.com/tottenham-hotspur/spielplan/verein/148/saison_id/",
};

const injurySeasons = [
  { id: "2025", label: "25/26" },
  { id: "2024", label: "24/25" },
  { id: "2023", label: "23/24" },
];

const resultSeasons = injurySeasons;

const squadFallbackPlayers = [
  { name: "Guglielmo Vicario", number: "1", position: "Goalkeeper", nationality: "Italy", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/184254/guglielmo-vicario" },
  { name: "Radu Drăgușin", number: "3", position: "Defender", nationality: "Romania", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/493125/radu-dr-gu-in" },
  { name: "Kevin Danso", number: "4", position: "Defender", nationality: "Austria", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/135720/kevin-danso" },
  { name: "João Palhinha", number: "6", position: "Midfielder", nationality: "Portugal", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/154296/jo-o-palhinha" },
  { name: "Xavi Simons", number: "7", position: "Midfielder", nationality: "Netherlands", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/493362/xavi-simons" },
  { name: "Yves Bissouma", number: "8", position: "Midfielder", nationality: "Mali", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/227127/yves-bissouma" },
  { name: "Richarlison", number: "9", position: "Forward", nationality: "Brazil", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/212319/-richarlison" },
  { name: "James Maddison", number: "10", position: "Midfielder", nationality: "England", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/172780/james-maddison" },
  { name: "Mathys Tel", number: "11", position: "Forward", nationality: "France", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/511499/mathys-tel" },
  { name: "Destiny Udogie", number: "13", position: "Defender", nationality: "Italy", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/487053/destiny-udogie" },
  { name: "Archie Gray", number: "14", position: "Midfielder", nationality: "England", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/547701/archie-gray" },
  { name: "Lucas Bergvall", number: "15", position: "Midfielder", nationality: "Sweden", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/570526/lucas-bergvall" },
  { name: "Cristian Romero", number: "17", position: "Defender", nationality: "Argentina", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/221632/cristian-romero" },
  { name: "Dominic Solanke", number: "19", position: "Forward", nationality: "England", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/154566/dominic-solanke" },
  { name: "Mohammed Kudus", number: "20", position: "Forward", nationality: "Ghana", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/460842/mohammed-kudus" },
  { name: "Dejan Kulusevski", number: "21", position: "Forward", nationality: "Sweden", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/445044/dejan-kulusevski" },
  { name: "Conor Gallagher", number: "22", position: "Midfielder", nationality: "England", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/232787/conor-gallagher" },
  { name: "Pedro Porro", number: "23", position: "Defender", nationality: "Spain", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/441164/pedro-porro" },
  { name: "Djed Spence", number: "24", position: "Defender", nationality: "England", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/232859/djed-spence" },
  { name: "Wilson Odobert", number: "28", position: "Midfielder", nationality: "France", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/550839/wilson-odobert" },
  { name: "Pape Matar Sarr", number: "29", position: "Midfielder", nationality: "Senegal", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/482442/pape-matar-sarr" },
  { name: "Rodrigo Bentancur", number: "30", position: "Midfielder", nationality: "Uruguay", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/202993/rodrigo-bentancur" },
  { name: "Antonin Kinsky", number: "31", position: "Goalkeeper", nationality: "Czech Republic", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/485055/antonin-kinsky" },
  { name: "Ben Davies", number: "33", position: "Defender", nationality: "Wales", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/115556/ben-davies" },
  { name: "Micky van de Ven", number: "37", position: "Defender", nationality: "Netherlands", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/491279/micky-van-de-ven" },
  { name: "Souza", number: "38", position: "Defender", nationality: "Brazil", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/616221/-souza" },
  { name: "Randal Kolo Muani", number: "39", position: "Forward", nationality: "France", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/247693/randal-kolo-muani" },
  { name: "Brandon Austin", number: "40", position: "Goalkeeper", nationality: "England", status: "first-team", profileUrl: "https://www.tottenhamhotspur.com/player/214572/brandon-austin" },
  { name: "Luka Vuskovic", number: "16", position: "Defender", nationality: "Croatia", status: "loan", profileUrl: "https://www.tottenhamhotspur.com/player/610799/luka-vuskovic" },
  { name: "Yang Min-Hyeok", number: "18", position: "Midfielder", nationality: "South Korea", status: "loan", profileUrl: "https://www.tottenhamhotspur.com/player/623095/yang-min-hyeok" },
  { name: "Manor Solomon", number: "27", position: "Forward", nationality: "Israel", status: "loan", profileUrl: "https://www.tottenhamhotspur.com/player/235674/manor-solomon" },
  { name: "Ashley Phillips", number: "35", position: "Defender", nationality: "England", status: "loan", profileUrl: "https://www.tottenhamhotspur.com/player/548308/ashley-phillips" },
  { name: "Alejo Veliz", number: "36", position: "Forward", nationality: "Argentina", status: "loan", profileUrl: "https://www.tottenhamhotspur.com/player/536908/alejo-veliz" },
  { name: "Alfie Devine", number: "45", position: "Midfielder", nationality: "England", status: "loan", profileUrl: "https://www.tottenhamhotspur.com/player/496179/alfie-devine" },
  { name: "Kota Takai", number: "25", position: "Defender", nationality: "Japan", status: "loan", profileUrl: "https://www.tottenhamhotspur.com/player/553299/kota-takai" },
  { name: "Dane Scarlett", number: "", position: "Forward", nationality: "England", status: "loan", profileUrl: "https://www.tottenhamhotspur.com/player/490145/dane-scarlett" },
];

const departedSquadNames = new Set([
  "Yves Bissouma",
]);

const squadKoreanNames = {
  "Guglielmo Vicario": "굴리엘모 비카리오",
  "Radu Drăgușin": "라두 드라구신",
  "Kevin Danso": "케빈 단소",
  "João Palhinha": "주앙 팔리냐",
  "Xavi Simons": "사비 시몬스",
  Richarlison: "히샬리송",
  "James Maddison": "제임스 매디슨",
  "Mathys Tel": "마티스 텔",
  "Destiny Udogie": "데스티니 우도기",
  "Archie Gray": "아치 그레이",
  "Lucas Bergvall": "루카스 베리발",
  "Cristian Romero": "크리스티안 로메로",
  "Dominic Solanke": "도미닉 솔랑케",
  "Mohammed Kudus": "모하메드 쿠두스",
  "Dejan Kulusevski": "데얀 쿨루셉스키",
  "Conor Gallagher": "코너 갤러거",
  "Pedro Porro": "페드로 포로",
  "Djed Spence": "제드 스펜스",
  "Wilson Odobert": "윌송 오도베르",
  "Pape Matar Sarr": "파페 마타르 사르",
  "Rodrigo Bentancur": "로드리고 벤탕쿠르",
  "Antonin Kinsky": "안토닌 킨스키",
  "Ben Davies": "벤 데이비스",
  "Micky van de Ven": "미키 판더펜",
  Souza: "소우자",
  "Randal Kolo Muani": "랑달 콜로 무아니",
  "Brandon Austin": "브랜던 오스틴",
  "Luka Vuskovic": "루카 부슈코비치",
  "Yang Min-Hyeok": "양민혁",
  "Manor Solomon": "마노르 솔로몬",
  "Ashley Phillips": "애슐리 필립스",
  "Alejo Veliz": "알레호 벨리스",
  "Alfie Devine": "알피 디바인",
  "Kota Takai": "코타 타카이",
  "Dane Scarlett": "데인 스칼렛",
};

const squadDepthRoles = {
  "Guglielmo Vicario": ["GK"],
  "Antonin Kinsky": ["GK"],
  "Brandon Austin": ["GK"],
  "Radu Drăgușin": ["CB"],
  "Kevin Danso": ["CB"],
  "Cristian Romero": ["CB"],
  "Micky van de Ven": ["CB"],
  "Ben Davies": ["CB", "LB"],
  Souza: ["CB"],
  "Luka Vuskovic": ["CB"],
  "Ashley Phillips": ["CB"],
  "Kota Takai": ["CB"],
  "Pedro Porro": ["RB"],
  "Djed Spence": ["RB", "LB"],
  "Destiny Udogie": ["LB"],
  "João Palhinha": ["DM"],
  "Rodrigo Bentancur": ["DM", "CM"],
  "Pape Matar Sarr": ["CM", "DM"],
  "Archie Gray": ["CM", "RB", "DM"],
  "Lucas Bergvall": ["CM", "AM"],
  "Conor Gallagher": ["CM", "AM"],
  "James Maddison": ["AM"],
  "Xavi Simons": ["AM", "LW", "RW"],
  "Dejan Kulusevski": ["RW", "AM"],
  "Mohammed Kudus": ["RW", "LW"],
  "Wilson Odobert": ["LW", "RW"],
  "Mathys Tel": ["LW", "ST"],
  Richarlison: ["ST", "LW"],
  "Dominic Solanke": ["ST"],
  "Randal Kolo Muani": ["ST", "RW"],
  "Manor Solomon": ["LW"],
  "Yang Min-Hyeok": ["RW", "LW"],
  "Alejo Veliz": ["ST"],
  "Dane Scarlett": ["ST"],
  "Alfie Devine": ["CM", "AM"],
};

const injuryTranslations = [
  [/cruciate ligament tear/i, "십자인대 파열"],
  [/hamstring injury/i, "햄스트링 부상"],
  [/knee surgery/i, "무릎 수술"],
  [/knee injury/i, "무릎 부상"],
  [/ankle surgery/i, "발목 수술"],
  [/ankle sprain/i, "발목 염좌"],
  [/foot injury/i, "발 부상"],
  [/groin injury/i, "사타구니 부상"],
  [/calf problems/i, "종아리 문제"],
  [/calf injury/i, "종아리 부상"],
  [/muscle contusion/i, "근육 타박"],
  [/muscle injury/i, "근육 부상"],
  [/adductor injury/i, "내전근 부상"],
  [/shoulder injury/i, "어깨 부상"],
  [/toe injury/i, "발가락 부상"],
  [/concussion/i, "뇌진탕"],
  [/knock/i, "타박"],
  [/fitness/i, "컨디션"],
  [/ill/i, "질병"],
  [/surgery/i, "수술"],
  [/unknown injury/i, "미상 부상"],
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const allowedStaticFiles = new Set([
  "index.html",
  "korean.html",
  "english.html",
  "market.html",
  "players.html",
  "player.html",
  "injuries.html",
  "results.html",
  "styles.css",
  "app.js",
]);

const securityHeaders = {
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' https://commons.wikimedia.org https://upload.wikimedia.org https://resources.thfc.pulselive.com https://tmssl.akamaized.net data:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "cross-origin-opener-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

const requestBuckets = new Map();
const requestWindowMs = 60_000;
const maxRequestsPerWindow = Number(process.env.MAX_REQUESTS_PER_MINUTE || (isProduction ? 120 : 240));
let lastBucketPruneAt = 0;

function responseHeaders(headers = {}) {
  return {
    ...securityHeaders,
    ...headers,
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, responseHeaders({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  }));
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text, headers = {}) {
  response.writeHead(statusCode, responseHeaders({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  }));
  response.end(text);
}

function sendHealth(request, response) {
  response.writeHead(200, responseHeaders({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  }));
  response.end(request.method === "HEAD" ? undefined : "ok");
}

function isRateLimited(request) {
  const key = request.socket.remoteAddress || "local";
  const now = Date.now();
  if (now - lastBucketPruneAt > requestWindowMs) {
    for (const [bucketKey, bucket] of requestBuckets.entries()) {
      if (now > bucket.resetAt) requestBuckets.delete(bucketKey);
    }
    lastBucketPruneAt = now;
  }

  const bucket = requestBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    requestBuckets.set(key, { count: 1, resetAt: now + requestWindowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > maxRequestsPerWindow;
}

function decodeHtml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanBoardMeta(value = "") {
  let text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  const metaTokenPattern = /^(말머리|작성|댓글|조회|추천|링크 포함|조회수|추천수|댓글수)\b/i;
  const parts = text.split(/\s*·\s*/);
  const firstMetaIndex = parts.findIndex((part) => metaTokenPattern.test(part.trim()));
  if (firstMetaIndex !== -1) {
    text = parts
      .filter((part, index) => {
        const trimmed = part.trim();
        const looksLikeBoardDate = /^\d{4}[-.]\d{1,2}[-.]\d{1,2}/.test(trimmed);
        if (!trimmed || metaTokenPattern.test(trimmed)) return false;
        if (looksLikeBoardDate) return false;
        return !(index < firstMetaIndex && firstMetaIndex <= 2 && trimmed.length <= 24);
      })
      .join(" · ");
  }

  return text
    .replace(/\b말머리\s+[^·\n]+/gi, " ")
    .replace(/\b작성\s+[^·\n]+/gi, " ")
    .replace(/\b댓글\s*\d+/gi, " ")
    .replace(/\b조회\s*[\d,.]+/gi, " ")
    .replace(/\b추천\s*[\d,.]+/gi, " ")
    .replace(/\b링크 포함\b/gi, " ")
    .replace(/\b\d{4}[-.]\d{1,2}[-.]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?\b/g, " ")
    .replace(/\s*·\s*·\s*/g, " · ")
    .replace(/^[\s·,.-]+|[\s·,.-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFeedItem(item) {
  const cleaned = {
    ...item,
    title: cleanBoardMeta(item.title || ""),
    summary: cleanBoardMeta(item.summary || ""),
    url: isSafeHttpUrl(item.url || "") ? item.url : "",
  };
  delete cleaned.stats;
  return cleaned;
}

function absoluteUrl(url, base) {
  if (!url) return "";
  try {
    const parsed = new URL(decodeHtml(url), base);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function isSafeHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const allowedImageProxyHosts = new Set([
  "resources.thfc.pulselive.com",
  "tmssl.akamaized.net",
]);

const imageProxyCacheTtlMs = Number(process.env.IMAGE_CACHE_MS || 12 * 60 * 60 * 1000);
const maxImageProxyBytes = Number(process.env.MAX_IMAGE_BYTES || 5 * 1024 * 1024);

function normalizeProxyImageUrl(value = "") {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || !allowedImageProxyHosts.has(parsed.hostname)) return "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function imageRefererFor(url = "") {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "resources.thfc.pulselive.com") return "https://www.tottenhamhotspur.com/";
    if (parsed.hostname === "tmssl.akamaized.net") return "https://www.transfermarkt.com/";
  } catch {
    return publicBaseUrl;
  }
  return publicBaseUrl;
}

async function sendProxiedImage(request, response, imageUrl = "") {
  const url = normalizeProxyImageUrl(imageUrl);
  if (!url) {
    sendText(response, 400, "Unsupported image URL");
    return;
  }

  const cached = imageProxyCache.get(url);
  if (cached && Date.now() < cached.expiresAt) {
    response.writeHead(200, responseHeaders({
      "content-type": cached.contentType,
      "cache-control": "public, max-age=43200",
      "content-length": cached.buffer.length,
    }));
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.end(cached.buffer);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const upstream = await fetch(url, {
      headers: {
        "user-agent": crawlerUserAgent,
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        referer: imageRefererFor(url),
      },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      sendText(response, upstream.status, "Image unavailable");
      return;
    }

    const contentType = (upstream.headers.get("content-type") || "").split(";")[0].toLowerCase();
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(contentType)) {
      sendText(response, 415, "Unsupported image type");
      return;
    }

    const contentLength = Number(upstream.headers.get("content-length") || 0);
    if (contentLength && contentLength > maxImageProxyBytes) {
      sendText(response, 413, "Image too large");
      return;
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length > maxImageProxyBytes) {
      sendText(response, 413, "Image too large");
      return;
    }

    imageProxyCache.set(url, {
      buffer: bytes,
      contentType,
      expiresAt: Date.now() + imageProxyCacheTtlMs,
    });

    response.writeHead(200, responseHeaders({
      "content-type": contentType,
      "cache-control": "public, max-age=43200",
      "content-length": bytes.length,
    }));
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.end(bytes);
  } catch {
    sendText(response, 502, "Image proxy failed");
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 10_000);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": crawlerUserAgent,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "";
    const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.toLowerCase() || options.charset || "utf-8";
    return new TextDecoder(charset).decode(buffer);
  } finally {
    clearTimeout(timeout);
  }
}

function playerPositionGroup(position = "") {
  const normalized = position.toLowerCase();
  if (normalized.includes("goalkeeper")) return "GK";
  if (normalized.includes("defender")) return "DF";
  if (normalized.includes("midfielder")) return "MF";
  if (normalized.includes("forward")) return "FW";
  return "OTHER";
}

function playerPositionLabel(position = "") {
  const group = playerPositionGroup(position);
  if (group === "GK") return "골키퍼";
  if (group === "DF") return "수비수";
  if (group === "MF") return "미드필더";
  if (group === "FW") return "공격수";
  return position || "기타";
}

function extractSquadImageUrl(card = "") {
  const resourceImages = [
    ...card.matchAll(/https:\/\/resources\.thfc\.pulselive\.com\/photo-resources\/[^"',<>\s]+/gi),
  ].map((match) => match[0]);
  const directImages = [
    ...card.matchAll(/<img\b[^>]*\bsrc=["']([^"']+\.(?:png|jpg|jpeg|webp)(?:\?[^"']*)?)["']/gi),
  ].map((match) => match[1]);
  const candidates = [...resourceImages, ...directImages];
  const directImage = candidates.find((url) => /\.jpe?g(?:\?|$)/i.test(url)) || candidates[0] || "";
  return directImage ? absoluteUrl(decodeHtml(directImage), squadSource.url) : "";
}

function isAllowedSquadImageUrl(url = "") {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "resources.thfc.pulselive.com";
  } catch {
    return false;
  }
}

function squadThumbnailUrl(url = "") {
  return url;
}

function normalizeSquadPlayer(player, index) {
  const name = stripTags(player.name || "");
  const position = stripTags(player.position || "");
  const status = player.status === "loan" ? "loan" : "first-team";
  const profileUrl = absoluteUrl(player.profileUrl || "", squadSource.url);
  const imageUrl = absoluteUrl(player.imageUrl || "", squadSource.url);
  const safeImageUrl = isAllowedSquadImageUrl(imageUrl) ? squadThumbnailUrl(imageUrl) : "";
  const normalized = {
    id: `${status}-${stripTags(player.number || "no-number")}-${stripTags(player.name || `player-${index}`)}`
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/gi, "-")
      .replace(/^-+|-+$/g, ""),
    name,
    nameKo: squadKoreanNames[name] || name,
    number: stripTags(player.number || ""),
    position,
    positionGroup: playerPositionGroup(position),
    positionLabel: playerPositionLabel(position),
    depthRoles: squadDepthRoles[name] || [playerPositionGroup(position)],
    nationality: stripTags(player.nationality || ""),
    status,
    statusLabel: status === "loan" ? "임대 중" : "1군",
    profileUrl: isSafeHttpUrl(profileUrl) ? profileUrl : "",
    imageUrl: safeImageUrl,
  };

  return name ? normalized : null;
}

function parseTottenhamSquad(html) {
  const sections = [
    ...html.matchAll(
      /<h3 class="w-team-listing__title">([\s\S]*?)<\/h3>\s*<ul class="w-team-listing__list">([\s\S]*?)<\/ul>/gi,
    ),
  ];

  return sections
    .flatMap((section) => {
      const sectionTitle = stripTags(section[1]);
      const status = /loan/i.test(sectionTitle) ? "loan" : "first-team";
      return [...section[2].matchAll(/<li class="w-team-listing__item">([\s\S]*?)<\/li>/gi)].map((item) => {
        const card = item[1];
        const anchor =
          card.match(/<a\b[^>]*class=["']o-person-pod__inner["'][^>]*>/i)?.[0] ||
          card.match(/<a\b[^>]*class='o-person-pod__inner'[^>]*>/i)?.[0] ||
          "";
        const href = anchor.match(/href=["']([^"']+)["']/i)?.[1] || "";
        return {
          name: stripTags(card.match(/<h4 class="o-person-pod__name">([\s\S]*?)<\/h4>/i)?.[1] || ""),
          number: stripTags(card.match(/<span class="o-person-pod__number">([\s\S]*?)<\/span>/i)?.[1] || ""),
          position: stripTags(card.match(/<span class="o-person-pod__position">([\s\S]*?)<\/span>/i)?.[1] || ""),
          nationality: stripTags(
            card.match(/<span class="o-person-pod__nationality">([\s\S]*?)<\/span>/i)?.[1] || "",
          ),
          status,
          profileUrl: href,
          imageUrl: extractSquadImageUrl(card),
        };
      });
    })
    .map(normalizeSquadPlayer)
    .filter(Boolean);
}

function summarizeSquad(items) {
  return {
    total: items.length,
    firstTeam: items.filter((item) => item.status === "first-team").length,
    loan: items.filter((item) => item.status === "loan").length,
    GK: items.filter((item) => item.positionGroup === "GK").length,
    DF: items.filter((item) => item.positionGroup === "DF").length,
    MF: items.filter((item) => item.positionGroup === "MF").length,
    FW: items.filter((item) => item.positionGroup === "FW").length,
  };
}

async function getSquadFeed() {
  if (squadFeedCache.payload && Date.now() < squadFeedCache.expiresAt) {
    return squadFeedCache.payload;
  }

  let items = [];
  let dataSource = "official";

  try {
    const html = await fetchText(squadSource.url, { timeoutMs: 12_000 });
    items = parseTottenhamSquad(html);
    if (items.length < 20) throw new Error("official squad parse returned too few players");
  } catch {
    dataSource = "fallback";
    items = squadFallbackPlayers.map(normalizeSquadPlayer).filter(Boolean);
  }

  items = items.filter((item) => !departedSquadNames.has(item.name));

  const payload = {
    mode: "squad",
    refreshedAt: new Date().toISOString(),
    source: {
      ...squadSource,
      dataSource,
    },
    filter: {
      shownCount: items.length,
      ...summarizeSquad(items),
    },
    items,
  };

  squadFeedCache = {
    expiresAt: Date.now() + squadCacheTtlMs,
    payload,
  };

  return payload;
}

function parsePlayerJsonLd(html = "") {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    try {
      const data = JSON.parse(script[1].trim());
      const nodes = Array.isArray(data) ? data : [data];
      const athlete = nodes.find((node) => /Athlete/i.test(String(node?.["@type"] || "")));
      if (athlete) return athlete;
    } catch {
      // Ignore malformed third-party JSON-LD blocks.
    }
  }
  return {};
}

function parseDetailBlocks(html = "", blockClass = "") {
  const escapedClass = blockClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blocks = [
    ...html.matchAll(new RegExp(`<div class="${escapedClass}">([\\s\\S]*?)<\\/div>`, "gi")),
  ];
  const details = {};

  blocks.forEach((block) => {
    const content = block[1];
    const label = stripTags(
      content.match(/<(?:h3|p)[^>]*class="[^"]*(?:title|label)[^"]*"[^>]*>([\s\S]*?)<\/(?:h3|p)>/i)?.[1] || "",
    );
    const value = stripTags(
      content.match(/<(?:span|h2)[^>]*class="[^"]*(?:info|value)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|h2)>/i)?.[1] || "",
    );
    if (label && value) details[label] = value;
  });

  return details;
}

function parsePlayerBiography(html = "") {
  const bioBlock = html.match(/<div class="w-player-bio-story__bio cms-content">([\s\S]*?)<\/div>/i)?.[1] || "";
  const paragraphs = [...bioBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((paragraph) => stripTags(paragraph[1]))
    .filter(Boolean)
    .slice(0, 3);
  return paragraphs.join("\n\n");
}

function safeTottenhamProfileUrl(url = "") {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "www.tottenhamhotspur.com" && parsed.pathname.startsWith("/player/");
  } catch {
    return false;
  }
}

async function getPlayerDetail(id = "") {
  const squad = await getSquadFeed();
  const player = squad.items.find((item) => item.id === id);
  if (!player || !safeTottenhamProfileUrl(player.profileUrl)) {
    return null;
  }

  const cacheKey = player.id;
  const cached = playerDetailCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.payload;
  }

  let detail = {};
  try {
    const html = await fetchText(player.profileUrl, { timeoutMs: 12_000 });
    const jsonLd = parsePlayerJsonLd(html);
    const highLevel = parseDetailBlocks(html, "w-hl-bio__detail");
    const keyInfo = parseDetailBlocks(html, "w-player-key-info__detail");
    detail = {
      birthDate: jsonLd.birthDate || "",
      height: jsonLd.height?.value ? `${jsonLd.height.value} cm` : highLevel.Height || "",
      weight: highLevel.Weight || "",
      preferredFoot: highLevel["Preferred Foot"] || keyInfo["Preferred Foot"] || "",
      age: highLevel.Age || keyInfo.Age || "",
      joined: keyInfo.Joined || keyInfo.Debut?.match(/Joined\s+(.+)$/i)?.[1] || "",
      debut: keyInfo.Debut?.replace(/\s*Joined\s+.+$/i, "") || "",
      legacyNumber: keyInfo["Legacy Number"] || "",
      hasOfficialBiography: Boolean(parsePlayerBiography(html)),
    };
  } catch {
    detail = {};
  }

  const payload = {
    mode: "player-detail",
    refreshedAt: new Date().toISOString(),
    source: squad.source,
    player: {
      ...player,
      detail,
    },
  };

  playerDetailCache.set(cacheKey, {
    expiresAt: Date.now() + squadCacheTtlMs,
    payload,
  });

  return payload;
}

function translateInjuryLabel(injury = "") {
  const match = injuryTranslations.find(([pattern]) => pattern.test(injury));
  return match ? match[1] : injury || "부상";
}

function parseTransfermarktDate(value = "") {
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseTransfermarktInjuryTitle(title = "") {
  const cleanTitle = decodeHtml(title).replace(/\s+/g, " ").trim();
  const [injuryPart, returnPart = ""] = cleanTitle.split(/\s+-\s+Return expected on\s+/i);
  const injury = injuryPart.trim();
  const returnExpectedDate = parseTransfermarktDate(returnPart);
  return {
    injury,
    injuryKo: translateInjuryLabel(injury),
    returnExpectedRaw: returnPart.trim(),
    returnExpectedDate,
  };
}

function isFutureDate(isoDate = "") {
  if (!isoDate) return false;
  const today = new Date();
  const date = new Date(`${isoDate}T23:59:59`);
  return !Number.isNaN(date.getTime()) && date > today;
}

function injuryNameKey(value = "") {
  return decodeHtml(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const injuryNameAliases = new Map([
  [injuryNameKey("Antonín Kinský"), injuryNameKey("Antonin Kinsky")],
  [injuryNameKey("Min-hyeok Yang"), injuryNameKey("Yang Min-Hyeok")],
]);

function parseTransfermarktInjuries(html = "", squadItems = []) {
  const squadByName = new Map(squadItems.map((item) => [injuryNameKey(item.name), item]));
  const table = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].find((match) =>
    match[0].includes("ausfallzeiten-table"),
  )?.[0] || "";
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
  const records = [];

  rows.forEach((row) => {
    const playerName = decodeHtml(
      row.match(/<a title="([^"]+)" href="\/[^"]+\/profil\/spieler\/\d+"/i)?.[1] || "",
    );
    const playerKey = injuryNameKey(playerName);
    const squadPlayer = squadByName.get(injuryNameAliases.get(playerKey) || playerKey);
    if (!squadPlayer) return;

    const position = stripTags(row.match(/<td[^>]*class="[^"]*ausfallzeiten_pos[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || "");
    const cells = [...row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)];
    const events = [];
    let matchday = 0;

    cells.forEach((cell) => {
      const attrs = cell[1];
      const body = cell[2];
      if (!/\bafz\b/.test(attrs) || /\bhide\b/.test(attrs)) return;
      matchday += 1;
      const title = body.match(/<span[^>]*title="([^"]+)"[^>]*class="verletzt-table/i)?.[1] || "";
      if (!title) return;
      events.push({ matchday, title: decodeHtml(title) });
    });

    const groups = [];
    events.forEach((event) => {
      const last = groups[groups.length - 1];
      if (last && last.title === event.title && event.matchday === last.toMatchday + 1) {
        last.toMatchday = event.matchday;
        last.missedMatches += 1;
        return;
      }
      groups.push({
        title: event.title,
        fromMatchday: event.matchday,
        toMatchday: event.matchday,
        missedMatches: 1,
      });
    });

    groups.forEach((group, index) => {
      const parsed = parseTransfermarktInjuryTitle(group.title);
      records.push({
        id: `${squadPlayer.id}-injury-${group.fromMatchday}-${index}`,
        playerId: squadPlayer.id,
        playerName: squadPlayer.name,
        playerNameKo: squadPlayer.nameKo,
        playerNumber: squadPlayer.number,
        playerImageUrl: squadPlayer.imageUrl,
        position: position || squadPlayer.positionGroup,
        positionLabel: squadPlayer.positionLabel,
        injury: parsed.injury,
        injuryKo: parsed.injuryKo,
        returnExpectedRaw: parsed.returnExpectedRaw,
        returnExpectedDate: parsed.returnExpectedDate,
        fromMatchday: group.fromMatchday,
        toMatchday: group.toMatchday,
        missedMatches: group.missedMatches,
        status: isFutureDate(parsed.returnExpectedDate) ? "expected" : "recorded",
        statusLabel: isFutureDate(parsed.returnExpectedDate) ? "복귀 예정" : "시즌 중 기록",
      });
    });
  });

  return records.sort((a, b) => {
    if (a.status !== b.status) return a.status === "expected" ? -1 : 1;
    if (b.toMatchday !== a.toMatchday) return b.toMatchday - a.toMatchday;
    return b.missedMatches - a.missedMatches;
  });
}

function summarizeInjuries(items = []) {
  return {
    shownCount: items.length,
    playersAffected: new Set(items.map((item) => item.playerId)).size,
    missedMatches: items.reduce((sum, item) => sum + item.missedMatches, 0),
    expected: items.filter((item) => item.status === "expected").length,
  };
}

function resolveInjurySeason(seasonId = "") {
  return injurySeasons.find((season) => season.id === String(seasonId)) || injurySeasons[0];
}

function injurySeasonUrl(seasonId = "") {
  const url = new URL(injurySource.baseUrl);
  url.searchParams.set("saison_id", resolveInjurySeason(seasonId).id);
  return url.toString();
}

async function getInjuryFeed(seasonId = "") {
  const season = resolveInjurySeason(seasonId);
  const cached = injuryFeedCache.get(season.id);
  if (cached?.payload && Date.now() < cached.expiresAt) {
    return cached.payload;
  }

  const squad = await getSquadFeed();
  let items = [];
  let dataSource = "transfermarkt";

  try {
    const html = await fetchText(injurySeasonUrl(season.id), {
      timeoutMs: 14_000,
      headers: {
        "accept-language": "en-US,en;q=0.9",
      },
    });
    items = parseTransfermarktInjuries(html, squad.items);
  } catch {
    dataSource = "unavailable";
    items = [];
  }

  const payload = {
    mode: "injuries",
    refreshedAt: new Date().toISOString(),
    source: {
      label: injurySource.label,
      url: injurySeasonUrl(season.id),
      season: season.label,
      seasonId: season.id,
      seasons: injurySeasons,
      dataSource,
    },
    filter: summarizeInjuries(items),
    items,
  };

  injuryFeedCache.set(season.id, {
    expiresAt: Date.now() + squadCacheTtlMs,
    payload,
  });

  return payload;
}

function resolveResultSeason(seasonId = "") {
  return resultSeasons.find((season) => season.id === String(seasonId)) || resultSeasons[0];
}

function resultSeasonUrl(seasonId = "") {
  return `${resultSource.baseUrl}${resolveResultSeason(seasonId).id}`;
}

function normalizeTransfermarktAssetUrl(url = "") {
  const absolute = absoluteUrl(String(url || "").replace("https://tmssl.akamaized.net//", "https://tmssl.akamaized.net/"), resultSource.baseUrl);
  if (!absolute) return "";
  try {
    const parsed = new URL(absolute);
    return parsed.protocol === "https:" && parsed.hostname === "tmssl.akamaized.net" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function parseTransfermarktTime(value = "") {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function transfermarktCells(row = "") {
  return [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => ({
    html: match[1],
    text: stripTags(match[1]),
  }));
}

function parseResultScore(value = "") {
  const match = value.match(/(\d+)\s*:\s*(\d+)/);
  if (!match) return null;
  return {
    home: Number(match[1]),
    away: Number(match[2]),
  };
}

function resolveResultOutcome(resultHtml = "", resultText = "", venue = "") {
  const score = parseResultScore(resultText);
  if (!score) return "scheduled";
  if (/greentext/i.test(resultHtml)) return "win";
  if (/redtext/i.test(resultHtml)) return "loss";
  if (score.home === score.away) return "draw";
  if (venue === "H") return score.home > score.away ? "win" : "loss";
  if (venue === "A") return score.away > score.home ? "win" : "loss";
  return "played";
}

function resultOutcomeLabel(outcome = "") {
  if (outcome === "win") return "승";
  if (outcome === "draw") return "무";
  if (outcome === "loss") return "패";
  if (outcome === "scheduled") return "예정";
  return "종료";
}

function venueLabel(venue = "") {
  if (venue === "H") return "홈";
  if (venue === "A") return "원정";
  if (venue === "N") return "중립";
  return venue || "-";
}

function parseTransfermarktResults(html = "", seasonId = "") {
  const boxes = [...html.matchAll(/<div class="box">([\s\S]*?)<\/table>\s*<\/div>\s*<\/div>/gi)]
    .map((match) => match[0])
    .filter((box) => /Opponent/i.test(box) && /Result/i.test(box));
  const items = [];

  boxes.forEach((box) => {
    const competition = stripTags(box.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "");
    if (!competition) return;

    const rows = [...box.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((match) => match[1])
      .filter((row) => row.includes("<td"));

    rows.forEach((row, index) => {
      const cells = transfermarktCells(row);
      if (cells.length < 10) return;

      const matchday = cells[0].text;
      const dateText = cells[1].text;
      const date = parseTransfermarktDate(dateText);
      const timeText = cells[2].text;
      const time = parseTransfermarktTime(timeText);
      const venue = cells[3].text;
      const ranking = cells[4].text;
      const logoUrl = normalizeTransfermarktAssetUrl(
        cells[5].html.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ||
          cells[5].html.match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
          "",
      );
      const opponentAnchor = cells[6].html.match(/<a\b[^>]*title=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const opponentName = (opponentAnchor ? stripTags(opponentAnchor[3]) : cells[6].text)
        .replace(/\s*\(\d+\.\)\s*$/g, "")
        .trim();
      const opponentFullName = opponentAnchor ? decodeHtml(opponentAnchor[1]) : opponentName;
      const opponentUrl = opponentAnchor ? absoluteUrl(opponentAnchor[2], resultSeasonUrl(seasonId)) : "";
      const system = cells[7].text;
      const attendance = cells[8].text;
      const resultHtml = cells[9].html;
      const resultText = cells[9].text.replace(/\s+/g, " ").trim();
      const outcome = resolveResultOutcome(resultHtml, resultText, venue);
      const reportPath = resultHtml.match(/href=["']([^"']*spielbericht[^"']+)["']/i)?.[1] || "";
      const matchReportUrl = absoluteUrl(reportPath, resultSeasonUrl(seasonId));
      const reportId = resultHtml.match(/\bid=["']([^"']+)["']/i)?.[1] || reportPath.match(/spielbericht\/(\d+)/i)?.[1] || "";
      const sortKey = date ? `${date}T${time || "00:00"}:00` : `${seasonId}-${competition}-${index}`;

      items.push({
        id: `${seasonId}-${competition.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${reportId || index}`,
        competition,
        matchday,
        date,
        dateText,
        time,
        timeText,
        sortKey,
        venue,
        venueLabel: venueLabel(venue),
        ranking,
        opponentName,
        opponentFullName,
        opponentLogoUrl: logoUrl,
        opponentUrl,
        system,
        attendance,
        result: resultText || "-",
        outcome,
        outcomeLabel: resultOutcomeLabel(outcome),
        matchReportUrl,
      });
    });
  });

  return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.competition.localeCompare(b.competition));
}

function summarizeResults(items = []) {
  const played = items.filter((item) => item.outcome !== "scheduled");
  return {
    shownCount: items.length,
    playedCount: played.length,
    wins: played.filter((item) => item.outcome === "win").length,
    draws: played.filter((item) => item.outcome === "draw").length,
    losses: played.filter((item) => item.outcome === "loss").length,
    scheduled: items.filter((item) => item.outcome === "scheduled").length,
    competitions: new Set(items.map((item) => item.competition)).size,
  };
}

async function getResultFeed(seasonId = "") {
  const season = resolveResultSeason(seasonId);
  const cached = resultFeedCache.get(season.id);
  if (cached?.payload && Date.now() < cached.expiresAt) {
    return cached.payload;
  }

  let items = [];
  let dataSource = "transfermarkt";

  try {
    const html = await fetchText(resultSeasonUrl(season.id), {
      timeoutMs: 14_000,
      headers: {
        "accept-language": "en-US,en;q=0.9",
      },
    });
    items = parseTransfermarktResults(html, season.id);
  } catch {
    dataSource = "unavailable";
    items = [];
  }

  const payload = {
    mode: "results",
    refreshedAt: new Date().toISOString(),
    source: {
      label: resultSource.label,
      url: resultSeasonUrl(season.id),
      season: season.label,
      seasonId: season.id,
      seasons: resultSeasons,
      dataSource,
    },
    filter: summarizeResults(items),
    items,
  };

  resultFeedCache.set(season.id, {
    expiresAt: Date.now() + cacheTtlMs,
    payload,
  });

  return payload;
}

async function translateToKorean(text) {
  const cleanText = stripTags(text || "");
  if (!cleanText || /[가-힣]/.test(cleanText)) return cleanText;
  if (translationCache.has(cleanText)) return translationCache.get(cleanText);

  try {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", "ko");
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", cleanText.slice(0, 900));
    const raw = await fetchText(url.toString(), {
      timeoutMs: 8_000,
      headers: { accept: "application/json,text/plain,*/*" },
    });
    const data = JSON.parse(raw);
    const translated = (data?.[0] || []).map((part) => part?.[0] || "").join("").trim() || cleanText;
    translationCache.set(cleanText, translated);
    return translated;
  } catch {
    return cleanText;
  }
}

function pickMeta(text, maxLength = 700) {
  const normalized = stripTags(text);
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trimEnd() : normalized;
}

function cleanArticleSummary(text, maxLength = 900) {
  return pickMeta(text, maxLength)
    .replace(/\s*The post\s+.+?\s+appeared first on\s+.+$/i, "")
    .replace(/\s*DOWNLOAD THE OFFICIAL CAUGHTOFFSIDE APP[\s\S]*?(APPLE|GOOGLE PLAY)\s*/i, " ")
    .replace(/\s*ON APPLE\s*&\s*GOOGLE PLAY\s*/i, " ")
    .replace(/\s*&\s*GOOGLE PLAY\s*/i, " ")
    .replace(/\s*\[(?:…|\.{3}|&#8230;)\]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getXmlTagValue(xml, tagName) {
  return xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"))?.[1] || "";
}

function normalizeForMatch(value = "") {
  return value
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[\[\]()[\]{}.,!?:"“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findTrustedReporter(item) {
  return findTrustedReporterInText(`${item.title || ""} ${item.source || ""} ${item.summary || ""}`);
}

function findTrustedReporterInText(value = "") {
  const haystack = normalizeForMatch(value);
  return trustedReporters.find((reporter) =>
    reporter.aliases.some((alias) => {
      const normalizedAlias = normalizeForMatch(alias);
      if (!normalizedAlias) return false;
      if (/^[a-z]{2,4}$/.test(normalizedAlias) || normalizedAlias.length <= 2) {
        const escapedAlias = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|\\s)${escapedAlias}(\\s|$)`, "i").test(haystack);
      }
      return haystack.includes(normalizedAlias);
    }),
  );
}

function isCommunityPlatform(item) {
  return ["Naver Cafe", "FMKorea", "DCInside"].includes(item.platform);
}

function isTransferNoise(item) {
  const haystack = normalizeForMatch(`${item.section || ""} ${item.sourceKey || ""} ${item.source || ""} ${item.title || ""}`);
  return (
    haystack.includes("sns 소식") ||
    haystack.includes("sns") ||
    haystack.includes("일반")
  );
}

function hasTrustedReporterSignal(item) {
  if (!item.reporter) return false;
  if (item.reporterMatchedBy === "news-search" && item.platform === "Google News") return true;

  const communityText = `${item.title || ""} ${item.summary || ""}`;
  if (isCommunityPlatform(item)) {
    return Boolean(findTrustedReporterInText(communityText));
  }

  return Boolean(findTrustedReporterInText(`${item.title || ""} ${item.source || ""} ${item.summary || ""}`));
}

function isReliableTransferItem(item) {
  if (!isTransferRelated(item)) return false;
  if (isTransferNoise(item)) return false;
  return hasTrustedReporterSignal(item);
}

function filterTrustedReporterItems(items) {
  return items.map((item) => {
    if (item.reporter) {
      return item;
    }

    const reporter = findTrustedReporter(item);
    return reporter
      ? {
          ...item,
          reporter: reporter.canonical,
          reporterLabel: reporter.aliases[1] || reporter.canonical,
          reporterMatchedBy: "headline-source-summary",
        }
      : item;
  });
}

function isTottenhamRelated(item) {
  if (item.platform === "Naver Cafe") return true;

  const haystack = normalizeForMatch(`${item.title || ""} ${item.summary || ""}`);
  const terms = [
    "tottenham",
    "spurs",
    "thfc",
    "hotspur",
    "토트넘",
    "스퍼스",
    "홋스퍼",
    "손흥민",
    "팔리냐",
    "로버트슨",
    "세네시",
  ];
  return terms.some((term) => haystack.includes(normalizeForMatch(term)));
}

function isAllowedForeignNews(item) {
  if (item.platform !== "Google News") return true;
  const source = normalizeForMatch(item.source || "");
  const title = normalizeForMatch(item.title || "");
  return allowedForeignNewsSources.some((allowed) => {
    const normalized = normalizeForMatch(allowed);
    return source.includes(normalized) || title.endsWith(` ${normalized}`) || title.includes(`- ${normalized}`);
  });
}

function isTransferRelated(item) {
  const haystack = normalizeForMatch(`${item.title || ""} ${item.summary || ""}`);
  return transferTerms.some((term) => {
    const normalizedTerm = normalizeForMatch(term);
    if (!normalizedTerm) return false;
    if (/^[a-z0-9 ]+$/.test(normalizedTerm)) {
      return new RegExp(`(^|\\s)${normalizedTerm.replace(/\s+/g, "\\s+")}(\\s|$)`, "i").test(haystack);
    }
    return haystack.includes(normalizedTerm);
  });
}

function diversifyBySource(items, maxPerSource = 4, limit = 24) {
  const buckets = new Map();
  items.forEach((item) => {
    const source = item.sourceKey || item.source || "Unknown";
    if (!buckets.has(source)) buckets.set(source, []);
    if (buckets.get(source).length < maxPerSource) {
      buckets.get(source).push(item);
    }
  });

  const result = [];
  while (result.length < limit) {
    let added = false;
    for (const bucket of buckets.values()) {
      const next = bucket.shift();
      if (next) {
        result.push(next);
        added = true;
        if (result.length >= limit) break;
      }
    }
    if (!added) break;
  }

  return result;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await mapper(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

function getAttr(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1] || "";
}

function kstDateTimeToIso(dateText, timeText = "00:00") {
  const time = timeText.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const date = dateText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!date || !time) return null;

  const [, year, month, day] = date;
  const [, hour, minute, second = "00"] = time;
  return new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+09:00`,
  ).toISOString();
}

function todayKstIso(timeText) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dateText = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(
    kst.getUTCDate(),
  ).padStart(2, "0")}`;
  return kstDateTimeToIso(dateText, timeText);
}

function parseKoreanBoardDate(value) {
  const text = stripTags(value);
  if (/^\d{1,2}:\d{2}$/.test(text)) return todayKstIso(text);

  const shortDate = text.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})$/);
  if (shortDate) {
    const [, year, month, day] = shortDate;
    return kstDateTimeToIso(`20${year}-${month}-${day}`, "00:00");
  }

  const fullDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (fullDate) {
    const [, year, month, day, time] = fullDate;
    return kstDateTimeToIso(`${year}-${month}-${day}`, time);
  }

  return null;
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.source}:${item.url || item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeTweet(tweet, user) {
  const links = (tweet.entities?.urls || [])
    .map((item) => item.expanded_url || item.url)
    .filter((url) => url && isSafeHttpUrl(url));
  return {
    id: tweet.id,
    account: user.name,
    username: user.username,
    createdAt: tweet.created_at,
    text: tweet.text,
    url: `https://x.com/${user.username}/status/${tweet.id}`,
    links,
  };
}

async function xFetch(url) {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("X API request failed");
  }

  return response.json();
}

async function fetchAccountTweets(account) {
  const userUrl = `https://api.twitter.com/2/users/by/username/${account.username}?user.fields=name,username`;
  const userPayload = await xFetch(userUrl);
  const user = userPayload.data;

  const tweetUrl = new URL(`https://api.twitter.com/2/users/${user.id}/tweets`);
  tweetUrl.searchParams.set("max_results", "5");
  tweetUrl.searchParams.set("exclude", "replies,retweets");
  tweetUrl.searchParams.set("tweet.fields", "created_at,entities");

  const tweetPayload = await xFetch(tweetUrl);
  return (tweetPayload.data || []).map((tweet) => normalizeTweet(tweet, user));
}

async function getXFeed() {
  if (!bearerToken) {
    return {
      mode: "setup-required",
      refreshedAt: new Date().toISOString(),
      accounts: xAccounts,
      items: fallbackItems,
      message: "X_BEARER_TOKEN 환경변수를 설정하면 실시간 계정 피드를 불러옵니다.",
    };
  }

  if (cache.payload && Date.now() < cache.expiresAt) {
    return cache.payload;
  }

  const settled = await Promise.allSettled(xAccounts.map(fetchAccountTweets));
  const items = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const errors = settled
    .filter((result) => result.status === "rejected")
    .map(() => "X API 요청 실패");

  cache = {
    expiresAt: Date.now() + cacheTtlMs,
    payload: {
      mode: "live",
      refreshedAt: new Date().toISOString(),
      accounts: xAccounts,
      items,
      errors,
    },
  };

  return cache.payload;
}

function parseGoogleNews(xml, label, reporter = null) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, 20)
    .map((match) => {
      const item = match[1];
      const title = decodeHtml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
      const url = decodeHtml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
      const publishedAt = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || null;
      const source = decodeHtml(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || label);
      const description = cleanArticleSummary(getXmlTagValue(item, "description") || title, 900);

      return {
        id: `google-${Buffer.from(url || title).toString("base64url").slice(0, 18)}`,
        type: "news",
        source,
        platform: "Google News",
        title,
        summary: description,
        url,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        reporter: reporter?.canonical || null,
        reporterLabel: reporter?.aliases?.[1] || reporter?.canonical || null,
        reporterMatchedBy: reporter ? "news-search" : null,
        score: 70,
      };
    })
    .filter((item) => item.title && item.url);
}

function parseGenericRss(xml, sourceName, platform = "Foreign RSS") {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, 30)
    .map((match) => {
      const item = match[1];
      const title = decodeHtml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
      const url = decodeHtml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
      const publishedAt =
        item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ||
        item.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1] ||
        null;
      const encodedContent = getXmlTagValue(item, "content:encoded");
      const description = cleanArticleSummary(encodedContent || getXmlTagValue(item, "description") || title, 1100);

      return {
        id: `rss-${Buffer.from(`${sourceName}-${url || title}`).toString("base64url").slice(0, 18)}`,
        type: "news",
        source: sourceName,
        platform,
        title,
        summary: description,
        url,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        score: 72,
      };
    })
    .filter((item) => item.title && item.url);
}

async function fetchForeignRssNews() {
  const feeds = [
    {
      source: "Football London",
      url: "https://www.football.london/tottenham-hotspur-fc/?service=rss",
    },
    { source: "Spurs Web", url: "https://www.spurs-web.com/feed/" },
    { source: "CaughtOffside", url: "https://www.caughtoffside.com/tags/tottenham-hotspur/feed/" },
    { source: "BBC Sport Tottenham", url: "https://feeds.bbci.co.uk/sport/football/teams/tottenham-hotspur/rss.xml" },
    { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
    { source: "Evening Standard", url: "https://www.standard.co.uk/sport/football/tottenham-hotspur-fc/rss" },
    { source: "The Guardian", url: "https://www.theguardian.com/football/rss" },
    { source: "RMC Sport", url: "https://rmcsport.bfmtv.com/rss/football/" },
    { source: "Sky Sports Spurs", url: "https://www.skysports.com/rss/11675" },
    { source: "Sky Sports", url: "https://www.skysports.com/rss/12040" },
    { source: "ESPN", url: "https://www.espn.com/espn/rss/soccer/news" },
  ];

  const settled = await Promise.allSettled(
    feeds.map(async (feed) => parseGenericRss(await fetchText(feed.url, { timeoutMs: 10_000 }), feed.source)),
  );

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function fetchGoogleNews() {
  const priorityReporterNames = [
    "Alasdair Gold",
    "David Ornstein",
    "Fabrizio Romano",
    "Matteo Moretto",
    "Dan Kilpatrick",
    "Jack Pitt-Brooke",
    "Jay Harris",
    "Matt Law",
    "Sami Mokbel",
    "Michael Bridge",
    "Lyall Thomas",
    "Nizaar Kinsella",
    "David Hytner",
    "Gianluca Di Marzio",
    "Florian Plettenberg",
    "Fabrice Hawkins",
    "Ben Jacobs",
    "Sacha Tavolieri",
    "Nicolo Schira",
    "Rudy Galetti",
    "Ekrem Konur",
    "Christian Falk",
    "Paul O'Keefe",
    "The Athletic",
    "BBC",
    "PA",
    "RMC",
    "CaughtOffside",
    "Football Insider",
  ];
  const priorityReporters = trustedReporters.filter((reporter) =>
    priorityReporterNames.includes(reporter.canonical),
  );
  const directReporterQueries = priorityReporters.slice(0, 16).map((reporter) => ({
    q: `"${reporter.canonical}" Tottenham when:30d`,
    label: "Google News Reporters",
    reporter,
  }));
  const groupedReporterQueries = [];
  for (let index = 16; index < priorityReporters.length; index += 7) {
    const group = priorityReporters.slice(index, index + 7);
    groupedReporterQueries.push({
      q: `(${group.map((reporter) => `"${reporter.canonical}"`).join(" OR ")}) Tottenham when:30d`,
      label: "Google News Reporter Groups",
      reporter: null,
    });
  }

  const queries = [
    { q: "토트넘 OR Tottenham OR THFC OR Spurs when:7d", label: "Google News", reporter: null },
    { q: "토트넘 이적 OR Tottenham transfer OR THFC transfer when:7d", label: "Google News Transfers", reporter: null },
    ...directReporterQueries,
    ...groupedReporterQueries,
  ];

  const feeds = await Promise.allSettled(
    queries.map(async (query) => {
      const url = new URL("https://news.google.com/rss/search");
      url.searchParams.set("q", query.q);
      url.searchParams.set("hl", "ko");
      url.searchParams.set("gl", "KR");
      url.searchParams.set("ceid", "KR:ko");
      return parseGoogleNews(await fetchText(url.toString(), { timeoutMs: 10_000 }), query.label, query.reporter);
    }),
  );

  return feeds.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

function parseFmkorea(html) {
  const rows = [...html.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)];
  return rows
    .map((rowMatch) => {
      const row = rowMatch[0];
      if (!/document_srl=/.test(row) || !/class="hx"/.test(row)) return null;

      const anchor =
        [...row.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map((match) => match[0]).find((tag) => /\bclass="[^"]*\bhx\b/i.test(tag)) || "";
      const href = getAttr(anchor, "href");
      const title = stripTags(anchor);
      const time = stripTags(row.match(/<td class="time">([\s\S]*?)<\/td>/i)?.[1] || "");
      const views = stripTags(row.match(/<td class="m_no">\s*([\s\S]*?)\s*<\/td>/i)?.[1] || "");
      const votes = stripTags(row.match(/<td class="m_no m_no_voted">\s*([\s\S]*?)\s*<\/td>/i)?.[1] || "");
      const url = absoluteUrl(href, "https://www.fmkorea.com");
      const publishedAt = parseKoreanBoardDate(time);

      if (!title || !url) return null;

      return {
        id: `fmk-${Buffer.from(url).toString("base64url").slice(0, 18)}`,
        type: "community",
        source: "FMKorea 토트넘",
        platform: "FMKorea",
        title,
        summary: "",
        stats: {
          views,
          votes,
          time,
        },
        url,
        publishedAt,
        score: Number(votes.replace(/[^\d-]/g, "")) || 40,
      };
    })
    .filter(Boolean)
    .slice(0, 30);
}

async function fetchFmkorea() {
  const url = "https://www.fmkorea.com/index.php?mid=football_world&category=1798914341";
  return parseFmkorea(await fetchText(url, { timeoutMs: 10_000 }));
}

function parseDcinside(html) {
  const rows = [...html.matchAll(/<tr class="ub-content[\s\S]*?<\/tr>/gi)];
  return rows
    .map((rowMatch) => {
      const row = rowMatch[0];
      const subject = stripTags(row.match(/<td class="gall_subject"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || "");
      if (["AD", "설문", "공지"].includes(subject)) return null;

      const href = row.match(/<td class="gall_tit[\s\S]*?<a[^>]+href="([^"]+)"/i)?.[1];
      const titleRaw = row.match(/<td class="gall_tit[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] || "";
      const title = stripTags(titleRaw).replace(/^공지\s*/, "");
      const dateTitle = row.match(/<td class="gall_date"[^>]*title="([^"]+)"/i)?.[1];
      const dateText = stripTags(row.match(/<td class="gall_date"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || "");
      const views = stripTags(row.match(/<td class="gall_count"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || "");
      const votes = stripTags(row.match(/<td class="gall_recommend"[^>]*>([\s\S]*?)<\/td>/i)?.[1] || "");
      const url = absoluteUrl(href, "https://gall.dcinside.com");
      const publishedAt = parseKoreanBoardDate(dateTitle || dateText);

      if (!title || !href || href.startsWith("javascript:")) return null;

      return {
        id: `dc-${Buffer.from(url).toString("base64url").slice(0, 18)}`,
        type: "community",
        source: "디시 토트넘 갤러리",
        platform: "DCInside",
        title,
        summary: "",
        stats: {
          subject,
          views,
          votes,
          time: dateTitle || dateText,
        },
        url,
        publishedAt,
        score: Number(votes.replace(/[^\d-]/g, "")) || 35,
      };
    })
    .filter(Boolean)
    .slice(0, 30);
}

async function fetchDcinside() {
  const url = "https://gall.dcinside.com/mgallery/board/lists/?id=tottenham";
  return parseDcinside(await fetchText(url, { timeoutMs: 10_000 }));
}

const naverCafeConfig = {
  clubId: "29267144",
  homeUrl: "https://cafe.naver.com/spurskoreaspurs",
  menus: [
    { id: 116, label: "오피셜" },
    { id: 58, label: "이적 소식" },
    { id: 60, label: "뉴스" },
    { id: 9, label: "SNS 소식" },
    { id: 96, label: "전문 번역" },
  ],
};

function naverCafeArticleUrl(menuId, articleId) {
  return `https://cafe.naver.com/f-e/cafes/${naverCafeConfig.clubId}/articles/${articleId}?menuid=${menuId}&referrerAllArticles=false`;
}

function normalizeNaverCafeArticle(article, menu) {
  const item = article?.item;
  if (!item || article.type !== "ARTICLE" || item.blindArticle) return null;

  const title = stripTags(item.subject || "");
  if (!title) return null;

  const commentCount = Number(item.commentCount || 0);
  const readCount = Number(item.readCount || 0);
  const likeCount = Number(item.likeCount || 0);
  const rawSummary = cleanBoardMeta(stripTags(item.summary || ""));

  return {
    id: `naver-cafe-${item.articleId}`,
    type: "community",
    source: "네이버 카페",
    sourceKey: `네이버 카페 · ${menu.label}`,
    section: menu.label,
    platform: "Naver Cafe",
    title,
    summary: rawSummary,
    stats: {
      comments: commentCount,
      views: readCount,
      likes: likeCount,
      writer: item.writerInfo?.nickName || "",
      headName: item.headName || "",
      hasLink: Boolean(item.hasLink),
    },
    url: naverCafeArticleUrl(menu.id, item.articleId),
    publishedAt: item.writeDateTimestamp ? new Date(Number(item.writeDateTimestamp)).toISOString() : null,
    score: 78 + Math.min(30, likeCount * 2 + commentCount),
  };
}

async function fetchNaverCafeMenu(menu) {
  const url = new URL(
    `https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${naverCafeConfig.clubId}/menus/${menu.id}/articles`,
  );
  url.searchParams.set("perPage", "30");
  url.searchParams.set("page", "1");
  url.searchParams.set("sortBy", "TIME");
  url.searchParams.set("viewType", "L");

  const raw = await fetchText(url.toString(), {
    timeoutMs: 10_000,
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
      origin: "https://cafe.naver.com",
      referer: `${naverCafeConfig.homeUrl}/`,
    },
  });
  const payload = JSON.parse(raw);
  return (payload.result?.articleList || []).map((article) => normalizeNaverCafeArticle(article, menu)).filter(Boolean);
}

async function fetchNaverCafe() {
  const settled = await Promise.allSettled(naverCafeConfig.menus.map(fetchNaverCafeMenu));
  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function safeSource(name, fetcher) {
  try {
    return { name, items: await fetcher(), error: null };
  } catch (error) {
    return { name, items: [], error: "수집 실패" };
  }
}

async function getCommunityFeed() {
  if (communityCache.payload && Date.now() < communityCache.expiresAt) {
    return communityCache.payload;
  }

  const sources = await Promise.all([
    safeSource("Foreign RSS", fetchForeignRssNews),
    safeSource("Google News", fetchGoogleNews),
    safeSource("FMKorea", fetchFmkorea),
    safeSource("DCInside", fetchDcinside),
    safeSource("Naver Cafe", fetchNaverCafe),
  ]);

  const rawItems = dedupeItems(sources.flatMap((source) => source.items))
    .filter(isTottenhamRelated)
    .filter(isAllowedForeignNews);
  const annotatedItems = filterTrustedReporterItems(rawItems);
  const sortedItems = annotatedItems
    .filter(
      (item) =>
        item.platform === "Google News" ||
        item.platform === "Foreign RSS" ||
        item.platform === "Naver Cafe" ||
        item.reporter,
    )
    .sort((a, b) => {
      const dateDiff = new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
      const reporterDiff = Number(Boolean(b.reporter)) - Number(Boolean(a.reporter));
      return reporterDiff || dateDiff || b.score - a.score;
    });
  const items = diversifyBySource(sortedItems, 12, 84).map(sanitizeFeedItem).filter((item) => item.title && item.url);

  communityCache = {
    expiresAt: Date.now() + communityCacheTtlMs,
    payload: {
      mode: "free-crawl",
      refreshedAt: new Date().toISOString(),
      nextRefreshAt: new Date(Date.now() + communityCacheTtlMs).toISOString(),
      intervalMs: communityCacheTtlMs,
      sources: sources.map((source) => ({
        name: source.name,
        count: source.items.length,
        ok: !source.error,
        error: source.error,
      })),
      filter: {
        mode: "trusted-reporters",
        reporterCount: trustedReporters.length,
        rawCount: rawItems.length,
        matchedCount: items.filter((item) => item.reporter).length,
        shownCount: items.length,
      },
      items,
    },
  };

  return communityCache.payload;
}

async function getTransferFeed() {
  if (transferFeedCache.payload && Date.now() < transferFeedCache.expiresAt) {
    return transferFeedCache.payload;
  }

  const baseFeed = await getCommunityFeed();
  const transferItems = diversifyBySource(
    baseFeed.items
      .filter(isReliableTransferItem)
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)),
    12,
    84,
  );

  const items = await mapWithConcurrency(
    transferItems.slice(0, 48),
    6,
    async (item) => ({
      ...item,
      originalTitle: item.title,
      originalSummary: item.summary,
      title: await translateToKorean(item.title),
      summary: await translateToKorean(item.summary || ""),
      platform: "이적시장",
    }),
  );

  transferFeedCache = {
    expiresAt: Date.now() + communityCacheTtlMs,
    payload: {
      ...baseFeed,
      mode: "transfer-feed",
      filter: {
        ...baseFeed.filter,
        shownCount: items.length,
      },
      items,
    },
  };

  return transferFeedCache.payload;
}

async function getTranslatedFeed() {
  if (translatedFeedCache.payload && Date.now() < translatedFeedCache.expiresAt) {
    return translatedFeedCache.payload;
  }

  const baseFeed = await getCommunityFeed();
  const items = await mapWithConcurrency(
    baseFeed.items.slice(0, 48),
    6,
    async (item) => ({
      ...item,
      originalTitle: item.title,
      originalSummary: item.summary,
      title: await translateToKorean(item.title),
      summary: await translateToKorean(item.summary || ""),
      platform: "국문 번역",
    }),
  );

  translatedFeedCache = {
    expiresAt: Date.now() + communityCacheTtlMs,
    payload: {
      ...baseFeed,
      mode: "translated-feed",
      filter: {
        ...baseFeed.filter,
        shownCount: items.length,
      },
      items,
    },
  };

  return translatedFeedCache.payload;
}

function resolveStaticFile(urlPathname) {
  let pathname = "";
  try {
    pathname = decodeURIComponent(urlPathname);
  } catch {
    return null;
  }

  if (pathname === "/") pathname = "/index.html";
  if (!pathname.startsWith("/") || pathname.includes("\0") || pathname.includes("\\")) return null;

  const fileName = pathname.replace(/^\/+/, "");
  if (!allowedStaticFiles.has(fileName)) return null;

  const filePath = path.resolve(root, fileName);
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return null;

  return filePath;
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const filePath = resolveStaticFile(url.pathname);
  if (!filePath) {
    sendText(response, 404, "Not found");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, responseHeaders({
      "content-type": mimeTypes[ext] || "application/octet-stream",
      "cache-control": ["html", "css", "js"].includes(ext.slice(1)) ? "no-store" : "public, max-age=3600",
    }));
    response.end(file);
  } catch {
    sendText(response, 404, "Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      sendText(response, 405, "Method not allowed", { allow: "GET, HEAD" });
      return;
    }

    if (isRateLimited(request)) {
      sendText(response, 429, "Too many requests", { "retry-after": "60" });
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/healthz") {
      sendHealth(request, response);
      return;
    }
    if (url.pathname === "/api/image") {
      await sendProxiedImage(request, response, url.searchParams.get("url") || "");
      return;
    }
    if (url.pathname === "/api/x-feed") {
      sendJson(response, 200, await getXFeed());
      return;
    }
    if (url.pathname === "/api/community-feed") {
      sendJson(response, 200, await getCommunityFeed());
      return;
    }
    if (url.pathname === "/api/korean-feed") {
      sendJson(response, 200, await getTranslatedFeed());
      return;
    }
    if (url.pathname === "/api/transfer-feed") {
      sendJson(response, 200, await getTransferFeed());
      return;
    }
    if (url.pathname === "/api/squad") {
      sendJson(response, 200, await getSquadFeed());
      return;
    }
    if (url.pathname === "/api/player-detail") {
      const payload = await getPlayerDetail(url.searchParams.get("id") || "");
      if (!payload) {
        sendJson(response, 404, { mode: "not-found", message: "선수를 찾지 못했습니다.", items: [] });
        return;
      }
      sendJson(response, 200, payload);
      return;
    }
    if (url.pathname === "/api/injuries") {
      sendJson(response, 200, await getInjuryFeed(url.searchParams.get("season") || ""));
      return;
    }
    if (url.pathname === "/api/results") {
      sendJson(response, 200, await getResultFeed(url.searchParams.get("season") || ""));
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, {
      mode: "error",
      message: "요청을 처리하지 못했습니다.",
      items: fallbackItems,
    });
  }
});

server.listen(port, host, () => {
  console.log(`Spurs Pulse running at http://${displayHost}:${port}`);
  console.log(`Listening host: ${host}. Mode: ${isProduction ? "production" : "local"}.`);
  console.log(`Free community crawler refresh: ${Math.round(communityCacheTtlMs / 1000)}s.`);
  if (!bearerToken) {
    console.log("Set X_BEARER_TOKEN to enable live X API ingestion.");
  }
});
