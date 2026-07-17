const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const childProcess = require("node:child_process");
const crypto = require("node:crypto");

const root = process.cwd();
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1");
const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
const bearerToken = process.env.X_BEARER_TOKEN;
const defaultFeedCacheMs = isProduction ? 3 * 60 * 1000 : 60_000;
const cacheTtlMs = Number(process.env.FEED_CACHE_MS || defaultFeedCacheMs);
const communityCacheTtlMs = Number(process.env.COMMUNITY_CACHE_MS || defaultFeedCacheMs);
const squadCacheTtlMs = Number(process.env.SQUAD_CACHE_MS || 6 * 60 * 60 * 1000);
const disableTransfermarktLive = process.env.DISABLE_TRANSFERMARKT_LIVE === "1";
const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://${displayHost}:${port}`;
const crawlerUserAgent =
  `Mozilla/5.0 (compatible; SpursPulse/1.0; Tottenham fan dashboard; +${publicBaseUrl})`;
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const communityAdminKey = process.env.COMMUNITY_ADMIN_KEY || "";
const communityStorageFile = path.join(root, "data", "community-store.json");
const analyticsStorageFile = path.join(root, "data", "analytics-store.json");

function readGitValue(command) {
  try {
    return childProcess.execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1200,
    }).trim();
  } catch {
    return "";
  }
}

function buildInfo() {
  const commit =
    process.env.RENDER_GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    process.env.SOURCE_VERSION ||
    readGitValue("git rev-parse HEAD");
  const branch =
    process.env.RENDER_GIT_BRANCH ||
    process.env.BRANCH ||
    readGitValue("git rev-parse --abbrev-ref HEAD");

  return {
    mode: "version",
    name: "Spurs Pulse",
    environment: isProduction ? "production" : "local",
    service: process.env.RENDER_SERVICE_NAME || "",
    branch,
    commit,
    shortCommit: commit ? commit.slice(0, 7) : "unknown",
    checkedAt: new Date().toISOString(),
  };
}

const xAccounts = [
  { username: "SpursOfficial", label: "Spurs Official" },
  { username: "FabrizioRomano", label: "Fabrizio Romano" },
  { username: "pokeefe1", label: "Paul O'Keefe" },
  { username: "TheSpursWatch", label: "The Spurs Watch" },
  { username: "TheSpursExpress", label: "The Spurs Express" },
  { username: "HotspurRelated", label: "Hotspur Related" },
  { username: "SpursITKhub", label: "Spurs ITK Hub" },
  { username: "SpursJourno", label: "SpursJourno" },
  { username: "HeardFromSpurs", label: "Heard From Spurs" },
  { username: "szyexcl", label: "SzyExcl" },
  { username: "thfc_T_news", label: "Tottenham Transfer News" },
  { username: "SecretPrem", label: "The Source" },
  { username: "HimothyReports", label: "Himothy" },
  { username: "KrrishFT", label: "Krrish" },
  { username: "Lilywhite_Rose", label: "Lilywhite Rose" },
  { username: "LastWordOnSpurs", label: "Last Word On Spurs" },
  { username: "RyanTaylorSport", label: "Ryan Taylor" },
  { username: "Dan_KP", label: "Dan Kilpatrick" },
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
  ["Paul O'Keefe", "Paul O’Keefe", "Paul O Keefe", "Paul Okeefe", "P O'Keefe", "P O’Keefe", "폴 오키프", "오키프", "O'Keefe", "O’Keefe", "O Keefe", "pokeefe", "pokeefe1", "@pokeefe1"],
  ["PO", "피오"],
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
  ["Ryan Taylor", "RyanTaylorSport"],
  ["Ben Pearce"],
  ["George Sessions", "Sessions"],
  ["Jonathan Veal", "Veal"],
  ["The Spurs Watch", "TheSpursWatch", "Spurs Watch"],
  ["The Spurs Express", "TheSpursExpress", "Spurs Express"],
  ["Hotspur Related", "HotspurRelated"],
  ["Last Word On Spurs", "LastWordOnSpurs", "LWOS", "Ricky Sacks"],
  ["SpursJourno", "Spurs Journo", "@SpursJourno"],
  ["SzyExcl", "szyexcl", "SZYEXCL", "Szy Excl", "@szyexcl"],
  ["Heard From Spurs", "HeardFromSpurs", "@HeardFromSpurs"],
  ["Spurs ITK Hub", "SpursITKhub", "Spurs ITK"],
  ["Tottenham Transfer News", "THFC Transfer News", "thfc_T_news"],
  ["The Source", "SecretPrem", "@SecretPrem"],
  ["Himothy", "HimothyReports", "@HimothyReports"],
  ["KrrishFT", "Krrish FT", "@KrrishFT"],
  ["Lilywhite Rose", "Lilywhite_Rose", "@Lilywhite_Rose"],
  ["Pete O'Rourke", "Peter O'Rourke", "Pete O Rourke", "O'Rourke", "O Rourke"],
  ["Graeme Bailey", "Bailey"],
  ["Wayne Veysey", "Veysey"],
  ["Tom Gott", "Gott"],
  ["Steve Kay", "Kay"],
  ["Kieran Gill", "Gill"],
  ["Matt Barlow", "Barlow"],
  ["Darren Lewis", "Lewis"],
  ["Mike Keegan", "Keegan"],
  ["Gaston Edul", "Gastón Edul", "Edul"],
  ["Sebastian Stafford-Bloor", "Sebastian Stafford Bloor", "Stafford-Bloor", "Stafford Bloor"],
  ["Dan Sheldon", "Sheldon"],
  ["Tom Roddy", "Roddy"],
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

function displayReporterLabel(reporter) {
  if (!reporter) return null;
  if (reporter.canonical === "PO") return "PO";
  return reporter.aliases[1] || reporter.canonical;
}

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
  "Mirror",
  "Daily Mirror",
  "Telegraph",
  "The Telegraph",
  "Independent",
  "The Independent",
  "talkSPORT",
  "Reuters",
  "Associated Press",
  "PA Media",
  "AP News",
  "Goal.com",
  "FourFourTwo",
  "90min",
  "CaughtOffside",
  "TBR Football",
  "The Boot Room",
  "TEAMtalk",
  "GiveMeSport",
  "HITC",
  "HITC Football",
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

let worldCupFeedCache = {
  expiresAt: 0,
  payload: null,
};

let transfermarktSquadDetailCache = {
  expiresAt: 0,
  payload: new Map(),
};

let cafeHotFeedCache = {
  expiresAt: 0,
  payload: null,
};

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
  "agreed",
  "reached agreement",
  "undergoing medical",
  "done deal",
  "here we go",
  "set to sign",
  "set to leave",
  "wants to leave",
  "interest",
  "interested",
  "shortlist",
  "considering",
  "approach",
  "contact",
  "representatives",
  "scout",
  "scouts",
  "offered",
  "price tag",
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

const transfermarktSquadSource = {
  label: "Transfermarkt",
  url: "https://www.transfermarkt.com/tottenham-hotspur/kader/verein/148/plus/1",
};

const worldCupSource = {
  label: "ESPN",
  url: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200",
  publicUrl: "https://www.espn.com/soccer/scoreboard/_/league/fifa.world",
};

const injurySeasons = [
  { id: "2025", label: "25/26" },
  { id: "2024", label: "24/25" },
  { id: "2023", label: "23/24" },
];

const resultSeasons = [
  { id: "2026", label: "26/27" },
  ...injurySeasons,
];

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

const fotmobPlayerProfiles = {
  "Guglielmo Vicario": { id: "538501", slug: "guglielmo-vicario" },
  "Radu Drăgușin": { id: "1203661", slug: "radu-dragusin" },
  "Kevin Danso": { id: "754126", slug: "kevin-danso" },
  "Xavi Simons": { id: "1173787", slug: "xavi-simons" },
  Richarlison: { id: "654908", slug: "richarlison" },
  "James Maddison": { id: "493165", slug: "james-maddison" },
  "Mathys Tel": { id: "1288111", slug: "mathys-tel" },
  "Destiny Udogie": { id: "1052898", slug: "destiny-udogie" },
  "Archie Gray": { id: "1323305", slug: "archie-gray" },
  "Lucas Bergvall": { id: "1386775", slug: "lucas-bergvall" },
  "Cristian Romero": { id: "789066", slug: "cristian-romero" },
  "Dominic Solanke": { id: "591734", slug: "dominic-solanke" },
  "Mohammed Kudus": { id: "891743", slug: "mohammed-kudus" },
  "Dejan Kulusevski": { id: "935379", slug: "dejan-kulusevski" },
  "Conor Gallagher": { id: "966027", slug: "conor-gallagher" },
  "Pedro Porro": { id: "941573", slug: "pedro-porro" },
  "Djed Spence": { id: "894803", slug: "djed-spence" },
  "Wilson Odobert": { id: "1341387", slug: "wilson-odobert" },
  "Pape Matar Sarr": { id: "1107280", slug: "pape-sarr" },
  "Rodrigo Bentancur": { id: "620618", slug: "rodrigo-bentancur" },
  "Antonin Kinsky": { id: "1341475", slug: "antonin-kinsky" },
  "Ben Davies": { id: "276121", slug: "ben-davies" },
  "Micky van de Ven": { id: "1097466", slug: "micky-van-de-ven" },
  Souza: { id: "1636513", slug: "souza" },
  "Brandon Austin": { id: "862993", slug: "brandon-austin" },
  "Luka Vuskovic": { id: "1413996", slug: "luka-vuskovic" },
  "Yang Min-Hyeok": { id: "1609329", slug: "min-hyeok-yang" },
  "Manor Solomon": { id: "822237", slug: "manor-solomon" },
  "Ashley Phillips": { id: "1290962", slug: "ashley-phillips" },
  "Dane Scarlett": { id: "1113753", slug: "dane-scarlett" },
};

const detailedPositionLabels = {
  GK: "GK 골키퍼",
  CB: "CB 센터백",
  LB: "LB 레프트백",
  RB: "RB 라이트백",
  LWB: "LWB 왼쪽 윙백",
  RWB: "RWB 오른쪽 윙백",
  DM: "DM 수비형 미드필더",
  CM: "CM 중앙 미드필더",
  AM: "AM 공격형 미드필더",
  LM: "LM 왼쪽 미드필더",
  RM: "RM 오른쪽 미드필더",
  LW: "LW 왼쪽 윙어",
  RW: "RW 오른쪽 윙어",
  ST: "ST 스트라이커",
  CF: "CF 센터 포워드",
};

const fotmobPrimaryPositionCodes = {
  keeper: "GK",
  goalkeeper: "GK",
  "centre back": "CB",
  "center back": "CB",
  defender: "CB",
  "left back": "LB",
  "right back": "RB",
  "left wing back": "LWB",
  "right wing back": "RWB",
  "defensive midfielder": "DM",
  "central midfielder": "CM",
  midfielder: "CM",
  "attacking midfielder": "AM",
  "left midfielder": "LM",
  "right midfielder": "RM",
  "left winger": "LW",
  "right winger": "RW",
  winger: "RW",
  striker: "ST",
  forward: "ST",
  "centre forward": "CF",
  "center forward": "CF",
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
  "worldcup.html",
  "community.html",
  "styles.css",
  "app.js",
]);

const securityHeaders = {
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' https://commons.wikimedia.org https://upload.wikimedia.org https://resources.thfc.pulselive.com https://tmssl.akamaized.net https://a.espncdn.com data:",
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
  "a.espncdn.com",
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
    if (parsed.hostname === "a.espncdn.com") return "https://www.espn.com/";
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

function detailedPositionLabel(roles = []) {
  return roles
    .map((role) => detailedPositionLabels[role] || role)
    .filter(Boolean)
    .join(" / ");
}

function primaryPositionCode(value = "") {
  return fotmobPrimaryPositionCodes[String(value || "").trim().toLowerCase()] || "";
}

function primaryPositionLabel(value = "", code = "") {
  const resolvedCode = code || primaryPositionCode(value);
  return detailedPositionLabels[resolvedCode] || decodeHtml(value).trim();
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
  const depthRoles = squadDepthRoles[name] || [playerPositionGroup(position)];
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
    depthRoles,
    positionDetailLabel: detailedPositionLabel(depthRoles),
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

function playerNameKey(value = "") {
  return decodeHtml(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMetricHeight(value = "") {
  const metric = String(value).match(/(\d)[,.](\d{2})\s*m/i);
  if (metric) return `${Number(metric[1]) * 100 + Number(metric[2])} cm`;
  const cm = String(value).match(/(\d{3})\s*cm/i);
  return cm ? `${cm[1]} cm` : String(value || "").trim();
}

function parseEuropeanDate(value = "") {
  const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseLooseDate(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const european = parseEuropeanDate(raw);
  if (european) return european;

  const monthMap = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };
  const english = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (english) {
    const [, day, month, year] = english;
    const monthNumber = monthMap[month.toLowerCase()];
    if (monthNumber) return `${year}-${monthNumber}-${day.padStart(2, "0")}`;
  }

  return "";
}

function formatKoreanDate(value = "") {
  const iso = parseLooseDate(value);
  if (!iso) return String(value || "").trim();
  const [year, month, day] = iso.split("-");
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
}

function normalizeFoot(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("both")) return "both";
  if (raw.includes("left")) return "left";
  if (raw.includes("right")) return "right";
  return raw;
}

function extractNextData(html = "") {
  const match = html.match(/<script id=["']__NEXT_DATA__["'] type=["']application\/json["']>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function parseTransfermarktSquadDetails(html = "") {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
  const details = new Map();

  rows.forEach((row) => {
    const profile = row.match(/<a href="([^"]+\/profil\/spieler\/\d+)">\s*([^<]+?)\s*<\/a>/i);
    if (!profile) return;

    const [, profilePath, rawName] = profile;
    const name = decodeHtml(stripTags(rawName));
    const inlineTable = row.match(/<table class="inline-table">([\s\S]*?)<\/table>/i)?.[1] || "";
    const inlineValues = [...inlineTable.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((cell) => stripTags(cell[1]))
      .filter(Boolean);
    const mainPosition = inlineValues[inlineValues.length - 1] || "";
    const cellValues = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((cell) => stripTags(cell[1]))
      .filter(Boolean);
    const height = parseMetricHeight(cellValues.find((value) => /\d[,.]\d{2}\s*m/i.test(value)) || "");
    const preferredFoot = normalizeFoot(cellValues.find((value) => /^(left|right|both)$/i.test(value)) || "");
    const dates = [...row.matchAll(/\d{1,2}\/\d{1,2}\/\d{4}/g)].map((match) => match[0]);
    const joinedIso = parseEuropeanDate(dates[1] || "");

    details.set(playerNameKey(name), {
      name,
      mainPosition,
      height,
      preferredFoot,
      joinedIso,
      joined: formatKoreanDate(joinedIso),
      transfermarktUrl: absoluteUrl(profilePath, "https://www.transfermarkt.com"),
    });
  });

  return details;
}

async function getTransfermarktSquadDetails() {
  if (transfermarktSquadDetailCache.payload && Date.now() < transfermarktSquadDetailCache.expiresAt) {
    return transfermarktSquadDetailCache.payload;
  }

  let payload = new Map();
  try {
    payload = parseTransfermarktSquadDetails(await fetchText(transfermarktSquadSource.url, { timeoutMs: 12_000 }));
  } catch {
    payload = new Map();
  }

  transfermarktSquadDetailCache = {
    expiresAt: Date.now() + squadCacheTtlMs,
    payload,
  };

  return payload;
}

function infoFallback(infoItems = [], title = "") {
  const item = infoItems.find((entry) => String(entry.title || "").toLowerCase() === title.toLowerCase());
  const value = item?.value;
  if (!value) return "";
  if (typeof value.fallback === "string" || typeof value.fallback === "number") return String(value.fallback);
  if (value.dateValue) return value.dateValue;
  if (value.numberValue) return String(value.numberValue);
  return "";
}

function parseFotMobPlayerDetail(html = "", sourceUrl = "") {
  const data = extractNextData(html)?.props?.pageProps?.data;
  if (!data) return {};

  const infoItems = data.playerInformation || [];
  const jsonLd = data.meta?.personJSONLD || {};
  const heightValue = jsonLd.height?.value ? `${jsonLd.height.value} ${jsonLd.height.unitText || "cm"}` : infoFallback(infoItems, "Height");
  const weightValue = jsonLd.weight?.value ? `${jsonLd.weight.value} ${jsonLd.weight.unitText || "kg"}` : "";
  const positions = (data.positionDescription?.positions || [])
    .map((position) => ({
      code: position.strPosShort?.label || "",
      label: position.strPos?.label || "",
      main: Boolean(position.isMainPosition),
    }))
    .filter((position) => position.code || position.label);
  const mainPosition = positions.find((position) => position.main) || {};
  const rawPrimaryPosition = data.positionDescription?.primaryPosition?.label || mainPosition.label || "";
  const rawPrimaryCode = mainPosition.code || primaryPositionCode(rawPrimaryPosition);
  const positionCodes = [...new Set(positions.map((position) => position.code).filter(Boolean))];
  const positionLabels = [...new Set(positions.map((position) => position.label).filter(Boolean))];

  return {
    height: parseMetricHeight(heightValue),
    weight: weightValue,
    preferredFoot: normalizeFoot(infoFallback(infoItems, "Preferred foot")),
    marketValue: infoFallback(infoItems, "Market value"),
    contractEnd: formatKoreanDate(infoFallback(infoItems, "Contract end")),
    primaryPosition: primaryPositionLabel(rawPrimaryPosition, rawPrimaryCode),
    primaryPositionCode: rawPrimaryCode,
    positionCodes,
    positionLabels,
    fotmobUrl: sourceUrl,
  };
}

async function fetchFotMobPlayerDetail(player) {
  const profile = fotmobPlayerProfiles[player.name];
  if (!profile) return {};
  const url = `https://www.fotmob.com/players/${profile.id}/${profile.slug}`;
  try {
    return parseFotMobPlayerDetail(await fetchText(url, { timeoutMs: 12_000 }), url);
  } catch {
    return { fotmobUrl: url };
  }
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
    const transfermarktDetails = await getTransfermarktSquadDetails();
    const transfermarktDetail = transfermarktDetails.get(playerNameKey(player.name)) || {};
    const fotmobDetail = await fetchFotMobPlayerDetail(player);
    const joinedRaw = keyInfo.Joined || keyInfo.Debut?.match(/Joined\s+(.+)$/i)?.[1] || transfermarktDetail.joinedIso || "";
    const debutRaw = keyInfo.Debut?.replace(/\s*Joined\s+.+$/i, "") || "";
    const positionCodes = fotmobDetail.positionCodes?.length ? fotmobDetail.positionCodes : player.depthRoles || [];
    const positionDetailLabel = detailedPositionLabel(positionCodes);
    const primaryPosition = fotmobDetail.primaryPosition || primaryPositionLabel(transfermarktDetail.mainPosition) || "";
    detail = {
      birthDate: jsonLd.birthDate || "",
      height: fotmobDetail.height || (jsonLd.height?.value ? `${jsonLd.height.value} cm` : highLevel.Height) || transfermarktDetail.height || "",
      weight: fotmobDetail.weight || highLevel.Weight || "",
      preferredFoot: fotmobDetail.preferredFoot || normalizeFoot(highLevel["Preferred Foot"] || keyInfo["Preferred Foot"] || transfermarktDetail.preferredFoot || ""),
      age: highLevel.Age || keyInfo.Age || "",
      joinedIso: parseLooseDate(joinedRaw),
      joined: formatKoreanDate(joinedRaw),
      debutIso: parseLooseDate(debutRaw),
      debut: formatKoreanDate(debutRaw),
      legacyNumber: keyInfo["Legacy Number"] || "",
      primaryPosition,
      positionCodes,
      positionDetailLabel,
      positionLabels: fotmobDetail.positionLabels || [],
      marketValue: fotmobDetail.marketValue || "",
      contractEnd: fotmobDetail.contractEnd || "",
      transfermarktUrl: transfermarktDetail.transfermarktUrl || "",
      fotmobUrl: fotmobDetail.fotmobUrl || "",
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

async function readSeasonSnapshot(kind, seasonId) {
  try {
    const raw = await fs.readFile(path.join(root, "data", `${kind}-${seasonId}.json`), "utf8");
    const snapshot = JSON.parse(raw);
    return Array.isArray(snapshot.items) ? snapshot : null;
  } catch {
    return null;
  }
}

const fallbackTeams = [
  {
    id: "tottenham",
    slug: "tottenham",
    badge: "TH",
    nameKo: "토트넘",
    nameEn: "Tottenham Hotspur",
    shortName: "Spurs",
    status: "active",
    color: "#0b1f43",
    accent: "#d7a84b",
    description: "Spurs Pulse의 토트넘 커뮤니티 설정입니다. 토트넘 뉴스, 이적시장, 선수단, 경기 결과, 팬 게시판을 한 곳에 묶습니다.",
    cafeUrl: "https://cafe.naver.com/spurskoreaspurs",
    pages: [
      { label: "국문 피드", href: "/korean.html" },
      { label: "영문 피드", href: "/english.html" },
      { label: "이적 시장", href: "/market.html" },
      { label: "선수단", href: "/players.html" },
      { label: "부상 이력", href: "/injuries.html" },
      { label: "경기 결과", href: "/results.html" },
      { label: "월드컵", href: "/worldcup.html" },
      { label: "커뮤니티", href: "/community.html?team=tottenham" },
    ],
  },
];

const communityBoards = [
  { id: "general", label: "자유", description: "가볍게 이야기하는 팬 게시판" },
  { id: "match", label: "경기", description: "프리뷰, 리뷰, 라인업 이야기" },
  { id: "transfer", label: "이적", description: "기자 소식과 루머 토론" },
  { id: "question", label: "질문", description: "전술, 선수, 일정 질문" },
];

function normalizeTeamId(value = "") {
  return String(value || "tottenham").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "tottenham";
}

function normalizeCommunityBoard(value = "") {
  const board = String(value || "general").toLowerCase().replace(/[^a-z0-9-]/g, "");
  return communityBoards.some((item) => item.id === board) ? board : "general";
}

function cleanSingleLine(value = "", maxLength = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMultiline(value = "", maxLength = 4000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
}

function normalizeCommunityAuthor(value = "") {
  return cleanSingleLine(value, 24) || "익명";
}

function communityNow() {
  return new Date().toISOString();
}

function publicTeam(team = {}) {
  const id = normalizeTeamId(team.id || team.slug);
  return {
    id,
    slug: normalizeTeamId(team.slug || id),
    badge: cleanSingleLine(team.badge || "FC", 4).toUpperCase(),
    nameKo: cleanSingleLine(team.nameKo || team.name || "팀", 60),
    nameEn: cleanSingleLine(team.nameEn || team.name || "Football Club", 80),
    shortName: cleanSingleLine(team.shortName || team.nameKo || team.nameEn || id, 40),
    status: team.status === "planned" ? "planned" : "active",
    color: cleanSingleLine(team.color || "#0b1f43", 20),
    accent: cleanSingleLine(team.accent || "#d7a84b", 20),
    description: cleanMultiline(team.description || "", 500),
    cafeUrl: cleanSingleLine(team.cafeUrl || "", 220),
    href: `/community.html?team=${id}`,
    communityHref: `/community.html?team=${id}`,
    pages: Array.isArray(team.pages) ? team.pages : [],
  };
}

async function readTeamsConfig() {
  try {
    const raw = await fs.readFile(path.join(root, "data", "teams.json"), "utf8");
    const parsed = JSON.parse(raw);
    const teams = Array.isArray(parsed) ? parsed : parsed.items;
    return teams.length ? teams.map(publicTeam) : fallbackTeams.map(publicTeam);
  } catch {
    return fallbackTeams.map(publicTeam);
  }
}

async function getTeamsPayload() {
  const teams = await readTeamsConfig();
  return {
    mode: "teams",
    refreshedAt: new Date().toISOString(),
    items: teams,
    filter: {
      shownCount: teams.length,
      active: teams.filter((team) => team.status === "active").length,
    },
  };
}

async function getTeamPayload(teamId = "") {
  const teams = await readTeamsConfig();
  const id = normalizeTeamId(teamId);
  const team = teams.find((item) => item.id === id || item.slug === id) || null;
  if (!team) return null;
  return {
    mode: "team",
    refreshedAt: new Date().toISOString(),
    item: team,
    boards: communityBoards,
  };
}

function hasSupabaseCommunityStore() {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

function communityDataSource() {
  return hasSupabaseCommunityStore() ? "supabase" : "local-file";
}

async function readJsonBody(request, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > maxBytes) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

async function readLocalCommunityStore() {
  try {
    const raw = await fs.readFile(communityStorageFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      votes: Array.isArray(parsed.votes) ? parsed.votes : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
  } catch {
    return { posts: [], comments: [], votes: [], reports: [] };
  }
}

let localCommunityWriteQueue = Promise.resolve();

async function writeLocalCommunityStore(store) {
  const write = async () => {
    await fs.mkdir(path.dirname(communityStorageFile), { recursive: true });
    await fs.writeFile(communityStorageFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  };
  localCommunityWriteQueue = localCommunityWriteQueue.then(write, write);
  await localCommunityWriteQueue;
}

function emptyAnalyticsStore() {
  return {
    totals: {
      pageViews: 0,
      visits: 0,
      totalDurationMs: 0,
    },
    visitors: {},
    sessions: {},
    pages: {},
  };
}

async function readLocalAnalyticsStore() {
  try {
    const raw = await fs.readFile(analyticsStorageFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...emptyAnalyticsStore(),
      ...parsed,
      totals: {
        ...emptyAnalyticsStore().totals,
        ...(parsed.totals || {}),
      },
      visitors: parsed.visitors || {},
      sessions: parsed.sessions || {},
      pages: parsed.pages || {},
    };
  } catch {
    return emptyAnalyticsStore();
  }
}

let localAnalyticsWriteQueue = Promise.resolve();

async function writeLocalAnalyticsStore(store) {
  const write = async () => {
    await fs.mkdir(path.dirname(analyticsStorageFile), { recursive: true });
    await fs.writeFile(analyticsStorageFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  };
  localAnalyticsWriteQueue = localAnalyticsWriteQueue.then(write, write);
  await localAnalyticsWriteQueue;
}

function analyticsHash(value = "") {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 32);
}

function analyticsCountry(request) {
  const value =
    request.headers["cf-ipcountry"] ||
    request.headers["x-vercel-ip-country"] ||
    request.headers["x-country-code"] ||
    request.headers["cloudfront-viewer-country"] ||
    "";
  return cleanSingleLine(Array.isArray(value) ? value[0] : value, 8).toUpperCase() || "UNK";
}

function analyticsPath(value = "/") {
  const raw = String(value || "/");
  try {
    const parsed = new URL(raw, publicBaseUrl);
    return parsed.pathname === "/" ? "/" : parsed.pathname.slice(0, 120);
  } catch {
    const safe = raw.split("?")[0].replace(/[^a-zA-Z0-9/_./-]/g, "").slice(0, 120);
    return safe.startsWith("/") ? safe : "/";
  }
}

function analyticsLabelForPath(pathname = "") {
  const labels = {
    "/": "홈",
    "/index.html": "홈",
    "/community.html": "토트넘 커뮤니티",
    "/korean.html": "국문 피드",
    "/english.html": "영문 피드",
    "/market.html": "이적 시장",
    "/players.html": "선수단",
    "/injuries.html": "부상 이력",
    "/results.html": "경기 결과",
    "/worldcup.html": "월드컵",
  };
  if (pathname.startsWith("/community/")) return "토트넘 커뮤니티";
  return labels[pathname] || pathname || "페이지";
}

function analyticsSummaryFromStore(store = emptyAnalyticsStore(), dataSource = "local-file") {
  const visitors = Object.values(store.visitors || {});
  const sessions = Object.values(store.sessions || {});
  const totalVisits = Number(store.totals?.visits || sessions.length || 0);
  const pageViews = Number(store.totals?.pageViews || 0);
  const uniqueVisitors = visitors.length;
  const returningVisitors = visitors.filter((visitor) => Number(visitor.visits || 0) > 1).length;
  const totalDurationMs = Number(store.totals?.totalDurationMs || 0);
  const averageSessionSeconds = totalVisits ? Math.round(totalDurationMs / totalVisits / 1000) : 0;
  const pagesPerVisit = totalVisits ? Number((pageViews / totalVisits).toFixed(2)) : 0;
  const countries = new Map();
  visitors.forEach((visitor) => {
    const country = visitor.country || "UNK";
    const current = countries.get(country) || { country, visitors: 0, visits: 0 };
    current.visitors += 1;
    current.visits += Number(visitor.visits || 0);
    countries.set(country, current);
  });
  const topPages = Object.entries(store.pages || {})
    .map(([pathname, item]) => ({
      path: pathname,
      label: analyticsLabelForPath(pathname),
      views: Number(item.views || 0),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return {
    mode: "analytics-summary",
    refreshedAt: new Date().toISOString(),
    source: {
      label: "Spurs Pulse first-party analytics",
      dataSource,
      countryPrecision: "request-header",
    },
    metrics: {
      uniqueVisitors,
      totalVisits,
      pageViews,
      returningVisitors,
      returnRate: uniqueVisitors ? Number((returningVisitors / uniqueVisitors).toFixed(3)) : 0,
      averageSessionSeconds,
      pagesPerVisit,
      totalDurationSeconds: Math.round(totalDurationMs / 1000),
    },
    countries: [...countries.values()].sort((a, b) => b.visitors - a.visitors).slice(0, 8),
    topPages,
  };
}

async function getAnalyticsSummary() {
  if (hasSupabaseCommunityStore()) return getSupabaseAnalyticsSummary();
  return analyticsSummaryFromStore(await readLocalAnalyticsStore());
}

async function getSupabaseAnalyticsSummary() {
  const rows = await supabaseRequest(
    "site_analytics_events?select=event_type,visitor_key,session_key,path,country,duration_ms,created_at&order=created_at.desc&limit=10000",
  );
  const store = emptyAnalyticsStore();
  (rows || []).forEach((row) => {
    const visitorId = row.visitor_key || "";
    const sessionId = row.session_key || "";
    if (!visitorId || !sessionId) return;
    const createdAt = row.created_at || communityNow();
    const country = row.country || "UNK";
    const visitor = store.visitors[visitorId] || {
      firstSeenAt: createdAt,
      lastSeenAt: createdAt,
      visits: 0,
      pageViews: 0,
      totalDurationMs: 0,
      country,
    };
    visitor.lastSeenAt = createdAt > visitor.lastSeenAt ? createdAt : visitor.lastSeenAt;
    visitor.firstSeenAt = createdAt < visitor.firstSeenAt ? createdAt : visitor.firstSeenAt;
    visitor.country = visitor.country && visitor.country !== "UNK" ? visitor.country : country;
    store.visitors[visitorId] = visitor;

    const isNewSession = !store.sessions[sessionId];
    const session = store.sessions[sessionId] || {
      visitorId,
      startedAt: createdAt,
      lastSeenAt: createdAt,
      pageViews: 0,
      totalDurationMs: 0,
      country,
    };
    session.lastSeenAt = createdAt > session.lastSeenAt ? createdAt : session.lastSeenAt;
    session.startedAt = createdAt < session.startedAt ? createdAt : session.startedAt;
    store.sessions[sessionId] = session;
    if (isNewSession) {
      store.totals.visits += 1;
      visitor.visits = Number(visitor.visits || 0) + 1;
    }

    if (row.event_type === "pageview") {
      store.totals.pageViews += 1;
      visitor.pageViews = Number(visitor.pageViews || 0) + 1;
      session.pageViews = Number(session.pageViews || 0) + 1;
      const pathname = row.path || "/";
      const page = store.pages[pathname] || { views: 0 };
      page.views += 1;
      page.lastSeenAt = createdAt;
      store.pages[pathname] = page;
    } else if (row.event_type === "engagement") {
      const durationMs = Math.max(0, Math.min(30 * 60 * 1000, Number(row.duration_ms || 0)));
      store.totals.totalDurationMs += durationMs;
      visitor.totalDurationMs = Number(visitor.totalDurationMs || 0) + durationMs;
      session.totalDurationMs = Number(session.totalDurationMs || 0) + durationMs;
    }
  });
  return analyticsSummaryFromStore(store, "supabase");
}

async function recordAnalyticsEvent(request) {
  const body = await readJsonBody(request, 16 * 1024);
  const type = body.type === "engagement" ? "engagement" : "pageview";
  const now = communityNow();
  const visitorSeed =
    cleanSingleLine(body.visitorId, 160) ||
    `${request.headers["x-forwarded-for"] || request.socket?.remoteAddress || ""}|${request.headers["user-agent"] || ""}`;
  const sessionSeed = cleanSingleLine(body.sessionId, 160) || `${visitorSeed}|${new Date().toISOString().slice(0, 10)}`;
  const visitorId = analyticsHash(visitorSeed);
  const sessionId = analyticsHash(sessionSeed);
  const pathname = analyticsPath(body.path || request.headers.referer || "/");
  const country = analyticsCountry(request);

  if (hasSupabaseCommunityStore()) {
    const durationMs = type === "engagement" ? Math.max(0, Math.min(30 * 60 * 1000, Number(body.durationMs || 0))) : 0;
    await supabaseRequest("site_analytics_events", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        event_type: type,
        visitor_key: visitorId,
        session_key: sessionId,
        path: pathname,
        country,
        duration_ms: durationMs,
        created_at: now,
      }),
    });
    return getAnalyticsSummary();
  }

  const store = await readLocalAnalyticsStore();

  const visitor = store.visitors[visitorId] || {
    firstSeenAt: now,
    lastSeenAt: now,
    visits: 0,
    pageViews: 0,
    totalDurationMs: 0,
    country,
  };
  visitor.lastSeenAt = now;
  visitor.country = visitor.country && visitor.country !== "UNK" ? visitor.country : country;
  store.visitors[visitorId] = visitor;

  const isNewSession = !store.sessions[sessionId];
  const session = store.sessions[sessionId] || {
    visitorId,
    startedAt: now,
    lastSeenAt: now,
    pageViews: 0,
    totalDurationMs: 0,
    country,
  };
  session.lastSeenAt = now;
  session.country = session.country && session.country !== "UNK" ? session.country : country;
  store.sessions[sessionId] = session;

  if (isNewSession) {
    store.totals.visits = Number(store.totals.visits || 0) + 1;
    visitor.visits = Number(visitor.visits || 0) + 1;
  }

  if (type === "pageview") {
    store.totals.pageViews = Number(store.totals.pageViews || 0) + 1;
    visitor.pageViews = Number(visitor.pageViews || 0) + 1;
    session.pageViews = Number(session.pageViews || 0) + 1;
    const page = store.pages[pathname] || { views: 0 };
    page.views = Number(page.views || 0) + 1;
    page.lastSeenAt = now;
    store.pages[pathname] = page;
  } else {
    const durationMs = Math.max(0, Math.min(30 * 60 * 1000, Number(body.durationMs || 0)));
    store.totals.totalDurationMs = Number(store.totals.totalDurationMs || 0) + durationMs;
    visitor.totalDurationMs = Number(visitor.totalDurationMs || 0) + durationMs;
    session.totalDurationMs = Number(session.totalDurationMs || 0) + durationMs;
  }

  await writeLocalAnalyticsStore(store);
  return analyticsSummaryFromStore(store);
}

function communityVoterKey(request, targetType, targetId) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const remote = request.socket?.remoteAddress || "";
  const userAgent = request.headers["user-agent"] || "";
  return crypto
    .createHash("sha256")
    .update(`${forwarded || remote}|${userAgent}|${targetType}|${targetId}`)
    .digest("hex");
}

function communityOwnerKey(value = "") {
  const token = cleanSingleLine(value, 200);
  return token ? crypto.createHash("sha256").update(token).digest("hex") : "";
}

function isCommunityAdmin(value = "") {
  if (!communityAdminKey) return false;
  const provided = communityOwnerKey(value);
  const expected = communityOwnerKey(communityAdminKey);
  if (!provided || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function canManageCommunityTarget(target = {}, body = {}) {
  if (isCommunityAdmin(body.adminKey)) return true;
  const ownerKey = communityOwnerKey(body.ownerToken);
  return Boolean(ownerKey && target.ownerKey && ownerKey === target.ownerKey);
}

function countVotes(votes = [], targetType, targetId) {
  return votes
    .filter((vote) => vote.targetType === targetType && vote.targetId === targetId)
    .reduce((sum, vote) => sum + Number(vote.value || 1), 0);
}

function publicCommunityComment(comment = {}, votes = [], viewerOwnerKey = "") {
  return {
    id: comment.id,
    postId: comment.postId,
    author: comment.author || "익명",
    body: comment.body || "",
    createdAt: comment.createdAt || comment.created_at || communityNow(),
    score: countVotes(votes, "comment", comment.id),
    ownedByMe: Boolean(viewerOwnerKey && comment.ownerKey && viewerOwnerKey === comment.ownerKey),
  };
}

function publicCommunityPost(post = {}, comments = [], votes = [], includeComments = false, viewerOwnerKey = "") {
  const postComments = comments
    .filter((comment) => comment.postId === post.id && !comment.hidden)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  return {
    id: post.id,
    teamId: post.teamId,
    board: post.board || "general",
    boardLabel: communityBoards.find((board) => board.id === post.board)?.label || "자유",
    author: post.author || "익명",
    title: post.title || "",
    body: post.body || "",
    createdAt: post.createdAt || communityNow(),
    updatedAt: post.updatedAt || post.createdAt || communityNow(),
    score: countVotes(votes, "post", post.id),
    commentCount: postComments.length,
    ownedByMe: Boolean(viewerOwnerKey && post.ownerKey && viewerOwnerKey === post.ownerKey),
    comments: includeComments ? postComments.map((comment) => publicCommunityComment(comment, votes, viewerOwnerKey)) : [],
  };
}

function dbPostToCommunity(row = {}) {
  return {
    id: row.id,
    teamId: row.team_id,
    board: row.board,
    author: row.author,
    title: row.title,
    body: row.body,
    hidden: row.hidden,
    ownerKey: row.owner_key || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbCommentToCommunity(row = {}) {
  return {
    id: row.id,
    postId: row.post_id,
    author: row.author,
    body: row.body,
    hidden: row.hidden,
    ownerKey: row.owner_key || "",
    createdAt: row.created_at,
  };
}

function dbVoteToCommunity(row = {}) {
  return {
    targetType: row.target_type,
    targetId: row.target_id,
    value: Number(row.value || 1),
  };
}

async function supabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: supabaseServiceKey,
      authorization: `Bearer ${supabaseServiceKey}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase request failed: ${response.status} ${text}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function readSupabaseCommunity({ teamId, board, postId }) {
  const filters = [
    "select=*",
    "hidden=eq.false",
    `team_id=eq.${encodeURIComponent(teamId)}`,
    "order=created_at.desc",
    "limit=120",
  ];
  if (board && board !== "all") filters.push(`board=eq.${encodeURIComponent(board)}`);
  if (postId) filters.push(`id=eq.${encodeURIComponent(postId)}`);

  const rows = await supabaseRequest(`community_posts?${filters.join("&")}`);
  const posts = (rows || []).map(dbPostToCommunity);
  const postIds = posts.map((post) => post.id);
  if (!postIds.length) return { posts, comments: [], votes: [] };

  const postIdFilter = postIds.map(encodeURIComponent).join(",");
  const commentRows = await supabaseRequest(
    `community_comments?select=*&hidden=eq.false&post_id=in.(${postIdFilter})&order=created_at.asc&limit=500`,
  );
  const comments = (commentRows || []).map(dbCommentToCommunity);

  const postVotes = await supabaseRequest(
    `community_votes?select=target_type,target_id,value&target_type=eq.post&target_id=in.(${postIdFilter})&limit=1000`,
  );
  let commentVotes = [];
  const commentIds = comments.map((comment) => comment.id);
  if (commentIds.length) {
    commentVotes = await supabaseRequest(
      `community_votes?select=target_type,target_id,value&target_type=eq.comment&target_id=in.(${commentIds.map(encodeURIComponent).join(",")})&limit=1000`,
    );
  }

  return {
    posts,
    comments,
    votes: [...(postVotes || []), ...(commentVotes || [])].map(dbVoteToCommunity),
  };
}

async function readCommunityRows(options) {
  if (hasSupabaseCommunityStore()) return readSupabaseCommunity(options);

  const store = await readLocalCommunityStore();
  const teamId = options.teamId;
  const board = options.board || "all";
  const postId = options.postId || "";
  const posts = store.posts
    .filter((post) => !post.hidden)
    .filter((post) => post.teamId === teamId)
    .filter((post) => !postId || post.id === postId)
    .filter((post) => board === "all" || post.board === board)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const postIds = new Set(posts.map((post) => post.id));
  const comments = store.comments.filter((comment) => !comment.hidden && postIds.has(comment.postId));
  const targetIds = new Set([...posts.map((post) => post.id), ...comments.map((comment) => comment.id)]);
  const votes = store.votes.filter((vote) => targetIds.has(vote.targetId));
  return { posts, comments, votes };
}

async function getCommunityPostsPayload({ teamId = "tottenham", board = "all", postId = "", ownerToken = "" } = {}) {
  const team = await getTeamPayload(teamId);
  if (!team) return null;
  const normalizedBoard = board === "all" ? "all" : normalizeCommunityBoard(board);
  const rows = await readCommunityRows({ teamId: team.item.id, board: normalizedBoard, postId });
  const includeComments = Boolean(postId);
  const viewerOwnerKey = communityOwnerKey(ownerToken);
  const items = rows.posts.map((post) => publicCommunityPost(post, rows.comments, rows.votes, includeComments, viewerOwnerKey));
  return {
    mode: "community-posts",
    refreshedAt: new Date().toISOString(),
    source: {
      label: "Spurs Pulse Community",
      dataSource: communityDataSource(),
    },
    team: team.item,
    boards: communityBoards,
    filter: {
      board: normalizedBoard,
      shownCount: items.length,
      comments: rows.comments.length,
    },
    items,
  };
}

async function createCommunityPost(request) {
  const body = await readJsonBody(request);
  const team = await getTeamPayload(body.teamId || body.team || "tottenham");
  if (!team) return { status: 404, payload: { message: "팀을 찾지 못했습니다." } };

  const title = cleanSingleLine(body.title, 120);
  const postBody = cleanMultiline(body.body, 4000);
  if (title.length < 2 || postBody.length < 2) {
    return { status: 400, payload: { message: "제목과 내용을 입력해주세요." } };
  }

  const now = communityNow();
  const post = {
    id: crypto.randomUUID(),
    teamId: team.item.id,
    board: normalizeCommunityBoard(body.board),
    author: normalizeCommunityAuthor(body.author),
    title,
    body: postBody,
    hidden: false,
    ownerKey: communityOwnerKey(body.ownerToken),
    createdAt: now,
    updatedAt: now,
  };

  if (hasSupabaseCommunityStore()) {
    await supabaseRequest("community_posts", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        id: post.id,
        team_id: post.teamId,
        board: post.board,
        author: post.author,
        title: post.title,
        body: post.body,
        owner_key: post.ownerKey,
        hidden: false,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
      }),
    });
  } else {
    const store = await readLocalCommunityStore();
    store.posts.unshift(post);
    await writeLocalCommunityStore(store);
  }

  const payload = await getCommunityPostsPayload({ teamId: post.teamId, postId: post.id, ownerToken: body.ownerToken });
  payload.createdPostId = post.id;
  return { status: 201, payload };
}

async function createCommunityComment(request) {
  const body = await readJsonBody(request);
  const postId = cleanSingleLine(body.postId, 80);
  const commentBody = cleanMultiline(body.body, 1500);
  if (!postId || commentBody.length < 1) {
    return { status: 400, payload: { message: "댓글 내용을 입력해주세요." } };
  }

  const rows = await readCommunityRows({ teamId: normalizeTeamId(body.teamId || "tottenham"), board: "all", postId });
  const post = rows.posts[0];
  if (!post) return { status: 404, payload: { message: "게시글을 찾지 못했습니다." } };

  const now = communityNow();
  const ownerKey = communityOwnerKey(body.ownerToken);
  const isPostOwner = Boolean(ownerKey && post.ownerKey && ownerKey === post.ownerKey);
  const comment = {
    id: crypto.randomUUID(),
    postId,
    author: isPostOwner ? normalizeCommunityAuthor(post.author) : normalizeCommunityAuthor(body.author),
    body: commentBody,
    hidden: false,
    ownerKey,
    createdAt: now,
  };

  if (hasSupabaseCommunityStore()) {
    await supabaseRequest("community_comments", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        id: comment.id,
        post_id: comment.postId,
        author: comment.author,
        body: comment.body,
        owner_key: comment.ownerKey,
        hidden: false,
        created_at: comment.createdAt,
      }),
    });
  } else {
    const store = await readLocalCommunityStore();
    store.comments.push(comment);
    await writeLocalCommunityStore(store);
  }

  const payload = await getCommunityPostsPayload({ teamId: post.teamId, postId, ownerToken: body.ownerToken });
  payload.createdCommentId = comment.id;
  return { status: 201, payload };
}

async function createCommunityVote(request) {
  const body = await readJsonBody(request);
  const targetType = body.targetType === "comment" ? "comment" : "post";
  const targetId = cleanSingleLine(body.targetId, 80);
  if (!targetId) return { status: 400, payload: { message: "추천 대상을 찾지 못했습니다." } };

  const voterKey = communityVoterKey(request, targetType, targetId);
  if (hasSupabaseCommunityStore()) {
    const existing = await supabaseRequest(
      `community_votes?select=id&target_type=eq.${targetType}&target_id=eq.${encodeURIComponent(targetId)}&voter_key=eq.${voterKey}&limit=1`,
    );
    if (!existing?.length) {
      await supabaseRequest("community_votes", {
        method: "POST",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          target_type: targetType,
          target_id: targetId,
          voter_key: voterKey,
          value: 1,
          created_at: communityNow(),
        }),
      });
    }
  } else {
    const store = await readLocalCommunityStore();
    const exists = store.votes.some(
      (vote) => vote.targetType === targetType && vote.targetId === targetId && vote.voterKey === voterKey,
    );
    if (!exists) {
      store.votes.push({
        id: crypto.randomUUID(),
        targetType,
        targetId,
        voterKey,
        value: 1,
        createdAt: communityNow(),
      });
      await writeLocalCommunityStore(store);
    }
  }

  return { status: 200, payload: { mode: "community-vote", ok: true } };
}

async function findLocalCommunityTarget(store, targetType, targetId) {
  if (targetType === "comment") {
    return store.comments.find((comment) => comment.id === targetId && !comment.hidden) || null;
  }
  return store.posts.find((post) => post.id === targetId && !post.hidden) || null;
}

async function findSupabaseCommunityTarget(targetType, targetId) {
  const table = targetType === "comment" ? "community_comments" : "community_posts";
  const rows = await supabaseRequest(
    `${table}?select=*&id=eq.${encodeURIComponent(targetId)}&hidden=eq.false&limit=1`,
  );
  const row = rows?.[0];
  if (!row) return null;
  return targetType === "comment" ? dbCommentToCommunity(row) : dbPostToCommunity(row);
}

async function createCommunityReport(request) {
  const body = await readJsonBody(request);
  const targetType = body.targetType === "comment" ? "comment" : "post";
  const targetId = cleanSingleLine(body.targetId, 80);
  const reason = cleanSingleLine(body.reason || "기타", 80) || "기타";
  const details = cleanMultiline(body.details || "", 1000);
  if (!targetId) return { status: 400, payload: { message: "신고 대상을 찾지 못했습니다." } };

  const reporterKey = communityVoterKey(request, `report-${targetType}`, targetId);
  if (hasSupabaseCommunityStore()) {
    const target = await findSupabaseCommunityTarget(targetType, targetId);
    if (!target) return { status: 404, payload: { message: "신고 대상을 찾지 못했습니다." } };
    const existing = await supabaseRequest(
      `community_reports?select=id&target_type=eq.${targetType}&target_id=eq.${encodeURIComponent(targetId)}&reporter_key=eq.${reporterKey}&limit=1`,
    );
    if (!existing?.length) {
      await supabaseRequest("community_reports", {
        method: "POST",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          target_type: targetType,
          target_id: targetId,
          reason,
          details,
          reporter_key: reporterKey,
          status: "open",
          created_at: communityNow(),
        }),
      });
    }
    return { status: 200, payload: { mode: "community-report", ok: true, duplicate: Boolean(existing?.length) } };
  }

  const store = await readLocalCommunityStore();
  const target = await findLocalCommunityTarget(store, targetType, targetId);
  if (!target) return { status: 404, payload: { message: "신고 대상을 찾지 못했습니다." } };
  const exists = store.reports.some(
    (report) => report.targetType === targetType && report.targetId === targetId && report.reporterKey === reporterKey,
  );
  if (!exists) {
    store.reports.push({
      id: crypto.randomUUID(),
      targetType,
      targetId,
      reason,
      details,
      reporterKey,
      status: "open",
      createdAt: communityNow(),
    });
    await writeLocalCommunityStore(store);
  }
  return { status: 200, payload: { mode: "community-report", ok: true, duplicate: exists } };
}

async function deleteCommunityTarget(request) {
  const body = await readJsonBody(request);
  const targetType = body.targetType === "comment" ? "comment" : "post";
  const targetId = cleanSingleLine(body.targetId, 80);
  if (!targetId) return { status: 400, payload: { message: "삭제 대상을 찾지 못했습니다." } };

  if (hasSupabaseCommunityStore()) {
    const target = await findSupabaseCommunityTarget(targetType, targetId);
    if (!target) return { status: 404, payload: { message: "삭제 대상을 찾지 못했습니다." } };
    if (!canManageCommunityTarget(target, body)) {
      return { status: 403, payload: { message: "작성한 브라우저에서만 삭제할 수 있습니다." } };
    }
    const table = targetType === "comment" ? "community_comments" : "community_posts";
    await supabaseRequest(`${table}?id=eq.${encodeURIComponent(targetId)}`, {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ hidden: true }),
    });
    return { status: 200, payload: { mode: "community-delete", ok: true, targetType, targetId } };
  }

  const store = await readLocalCommunityStore();
  const target = await findLocalCommunityTarget(store, targetType, targetId);
  if (!target) return { status: 404, payload: { message: "삭제 대상을 찾지 못했습니다." } };
  if (!canManageCommunityTarget(target, body)) {
    return { status: 403, payload: { message: "작성한 브라우저에서만 삭제할 수 있습니다." } };
  }
  target.hidden = true;
  target.deletedAt = communityNow();
  if (targetType === "post") {
    store.comments.forEach((comment) => {
      if (comment.postId === targetId) {
        comment.hidden = true;
        comment.deletedAt = target.deletedAt;
      }
    });
  }
  await writeLocalCommunityStore(store);
  return { status: 200, payload: { mode: "community-delete", ok: true, targetType, targetId } };
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
  let snapshotFilter = null;

  try {
    if (disableTransfermarktLive) {
      throw new Error("Transfermarkt live fetch disabled");
    }
    const html = await fetchText(injurySeasonUrl(season.id), {
      timeoutMs: 45_000,
      headers: {
        "accept-language": "en-US,en;q=0.9",
      },
    });
    items = parseTransfermarktInjuries(html, squad.items);
  } catch {
    const snapshot = await readSeasonSnapshot("injuries", season.id);
    if (snapshot) {
      dataSource = "snapshot";
      items = snapshot.items;
      snapshotFilter = snapshot.filter || null;
    } else {
      dataSource = "unavailable";
      items = [];
    }
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
    filter: snapshotFilter || summarizeInjuries(items),
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

  return sortResultItems(items);
}

function sortResultItems(items = []) {
  const allScheduled = items.length > 0 && items.every((item) => item.outcome === "scheduled");
  return [...items].sort((a, b) => {
    const dateSort = allScheduled
      ? String(a.sortKey || "").localeCompare(String(b.sortKey || ""))
      : String(b.sortKey || "").localeCompare(String(a.sortKey || ""));
    return dateSort || String(a.competition || "").localeCompare(String(b.competition || ""));
  });
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
  let snapshotFilter = null;

  try {
    if (disableTransfermarktLive) {
      throw new Error("Transfermarkt live fetch disabled");
    }
    const html = await fetchText(resultSeasonUrl(season.id), {
      timeoutMs: 45_000,
      headers: {
        "accept-language": "en-US,en;q=0.9",
      },
    });
    items = parseTransfermarktResults(html, season.id);
  } catch {
    const snapshot = await readSeasonSnapshot("results", season.id);
    if (snapshot) {
      dataSource = "snapshot";
      items = snapshot.items;
      snapshotFilter = snapshot.filter || null;
    } else {
      dataSource = "unavailable";
      items = [];
    }
  }

  items = sortResultItems(items);

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
    filter: snapshotFilter || summarizeResults(items),
    items,
  };

  resultFeedCache.set(season.id, {
    expiresAt: Date.now() + cacheTtlMs,
    payload,
  });

  return payload;
}

const worldCupTeamLabels = {
  Algeria: "알제리",
  Argentina: "아르헨티나",
  Australia: "호주",
  Austria: "오스트리아",
  Belgium: "벨기에",
  "Bosnia-Herzegovina": "보스니아 헤르체고비나",
  Brazil: "브라질",
  Canada: "캐나다",
  "Cape Verde": "카보베르데",
  Colombia: "콜롬비아",
  "Congo DR": "DR콩고",
  Croatia: "크로아티아",
  "Curaçao": "퀴라소",
  Czechia: "체코",
  Ecuador: "에콰도르",
  Egypt: "이집트",
  England: "잉글랜드",
  France: "프랑스",
  Germany: "독일",
  Ghana: "가나",
  Haiti: "아이티",
  Iran: "이란",
  Iraq: "이라크",
  "Ivory Coast": "코트디부아르",
  Japan: "일본",
  Jordan: "요르단",
  Mexico: "멕시코",
  Morocco: "모로코",
  Netherlands: "네덜란드",
  "New Zealand": "뉴질랜드",
  Norway: "노르웨이",
  Panama: "파나마",
  Paraguay: "파라과이",
  Portugal: "포르투갈",
  Qatar: "카타르",
  "Saudi Arabia": "사우디아라비아",
  Scotland: "스코틀랜드",
  Senegal: "세네갈",
  "South Africa": "남아공",
  "South Korea": "대한민국",
  Spain: "스페인",
  Sweden: "스웨덴",
  Switzerland: "스위스",
  Tunisia: "튀니지",
  Türkiye: "튀르키예",
  "United States": "미국",
  Uruguay: "우루과이",
  Uzbekistan: "우즈베키스탄",
};

function worldCupTeamKo(name = "") {
  if (worldCupTeamLabels[name]) return worldCupTeamLabels[name];

  const groupWinner = name.match(/^Group ([A-L]) Winner$/i);
  if (groupWinner) return `${groupWinner[1].toUpperCase()}조 1위`;

  const groupSecond = name.match(/^Group ([A-L]) 2nd Place$/i);
  if (groupSecond) return `${groupSecond[1].toUpperCase()}조 2위`;

  const thirdPlace = name.match(/^Third Place Group (.+)$/i);
  if (thirdPlace) return `3위 와일드카드 ${thirdPlace[1]}`;

  const roundWinner = name.match(/^Round of (\d+) (\d+) Winner$/i);
  if (roundWinner) return `${roundWinner[1]}강 ${roundWinner[2]}경기 승자`;

  const quarterWinner = name.match(/^Quarterfinal (\d+) Winner$/i);
  if (quarterWinner) return `8강 ${quarterWinner[1]}경기 승자`;

  const semiResult = name.match(/^Semifinal (\d+) (Winner|Loser)$/i);
  if (semiResult) return `준결승 ${semiResult[1]}경기 ${semiResult[2].toLowerCase() === "winner" ? "승자" : "패자"}`;

  return name || "-";
}

function worldCupPhaseKo(slug = "", note = "") {
  const group = note.match(/Group ([A-L])/i);
  if (group) return `${group[1].toUpperCase()}조`;

  const labels = {
    "group-stage": "조별리그",
    "round-of-32": "32강",
    "round-of-16": "16강",
    quarterfinals: "8강",
    semifinals: "준결승",
    "3rd-place-match": "3·4위전",
    final: "결승",
  };
  return labels[slug] || "월드컵";
}

function worldCupStatusKo(status = {}) {
  const type = status.type || {};
  if (type.state === "in") return type.shortDetail || type.detail || "진행중";
  if (type.completed) return "종료";
  return "예정";
}

function normalizeWorldCupCompetitor(competitor = {}) {
  const team = competitor.team || {};
  const name = team.displayName || team.shortDisplayName || team.name || "";
  return {
    id: team.id || competitor.id || "",
    name,
    nameKo: worldCupTeamKo(name),
    abbreviation: team.abbreviation || "",
    logoUrl: team.logo || "",
    score: competitor.score ?? "",
    homeAway: competitor.homeAway || "",
    winner: Boolean(competitor.winner),
    record: competitor.records?.find((record) => record.type === "total")?.summary || "",
  };
}

function normalizeWorldCupEvent(event = {}) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find((item) => item.homeAway === "home") || competitors[0] || {};
  const away = competitors.find((item) => item.homeAway === "away") || competitors[1] || {};
  const status = event.status || competition.status || {};
  const summaryUrl =
    event.links?.find((link) => link.rel?.includes("summary"))?.href ||
    competition.links?.find((link) => link.rel?.includes("summary"))?.href ||
    "";
  const broadcasts = competition.broadcasts?.flatMap((broadcast) => broadcast.names || []).filter(Boolean) || [];
  const venue = competition.venue || {};
  const venueCity = venue.address?.city || "";
  const venueCountry = venue.address?.country || "";

  return {
    id: event.id || competition.id || "",
    date: event.date || competition.date || "",
    sortKey: event.date || competition.date || "",
    phase: worldCupPhaseKo(event.season?.slug || "", competition.altGameNote || ""),
    phaseSlug: event.season?.slug || "",
    note: competition.altGameNote || "",
    status: status.type?.state || "",
    statusLabel: worldCupStatusKo(status),
    completed: Boolean(status.type?.completed),
    detail: status.type?.detail || "",
    shortDetail: status.type?.shortDetail || "",
    clock: status.displayClock || "",
    venue: venue.fullName || event.venue?.displayName || "",
    venueCity,
    venueCountry,
    broadcasts: [...new Set(broadcasts)].slice(0, 4),
    home: normalizeWorldCupCompetitor(home),
    away: normalizeWorldCupCompetitor(away),
    summaryUrl: absoluteUrl(summaryUrl, worldCupSource.publicUrl),
  };
}

function worldCupCountryForNationality(nationality = "") {
  const aliases = {
    "Korea, South": "South Korea",
    Korea: "South Korea",
    "Republic of Ireland": "Ireland",
    USA: "United States",
    "United States of America": "United States",
    "Cote d'Ivoire": "Ivory Coast",
    "Côte d’Ivoire": "Ivory Coast",
    Turkiye: "Türkiye",
    Turkey: "Türkiye",
    Czech: "Czechia",
    "Czech Republic": "Czechia",
  };
  return aliases[nationality] || nationality;
}

function attachSpursPlayersToWorldCupItems(items = [], players = []) {
  const byCountry = new Map();
  players.forEach((player) => {
    const country = worldCupCountryForNationality(player.nationality || "");
    if (!country) return;
    const entry = {
      id: player.id,
      name: player.name,
      nameKo: player.nameKo || player.name,
      position: player.position,
      number: player.number,
      nationality: country,
    };
    byCountry.set(country, [...(byCountry.get(country) || []), entry]);
  });

  return items.map((item) => {
    const homePlayers = byCountry.get(item.home?.name) || [];
    const awayPlayers = byCountry.get(item.away?.name) || [];
    return {
      ...item,
      hasSpursPlayers: Boolean(homePlayers.length || awayPlayers.length),
      home: {
        ...item.home,
        spursPlayers: homePlayers,
      },
      away: {
        ...item.away,
        spursPlayers: awayPlayers,
      },
    };
  });
}

function sortWorldCupItems(items = []) {
  return [...items].sort((a, b) => String(a.sortKey || "").localeCompare(String(b.sortKey || "")));
}

function summarizeWorldCup(items = []) {
  const now = new Date();
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const dateKey = (value) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));

  return {
    shownCount: items.length,
    completed: items.filter((item) => item.completed).length,
    live: items.filter((item) => item.status === "in").length,
    scheduled: items.filter((item) => item.status === "pre").length,
    today: items.filter((item) => item.date && dateKey(item.date) === todayKey).length,
    korea: items.filter((item) => [item.home?.name, item.away?.name].includes("South Korea")).length,
    spurs: items.filter((item) => item.hasSpursPlayers).length,
  };
}

async function getWorldCupFeed() {
  if (worldCupFeedCache.payload && Date.now() < worldCupFeedCache.expiresAt) {
    return worldCupFeedCache.payload;
  }

  let items = [];
  let dataSource = "espn";

  try {
    const raw = await fetchText(worldCupSource.url, {
      timeoutMs: 20_000,
      headers: {
        accept: "application/json,text/plain,*/*",
      },
    });
    const data = JSON.parse(raw);
    items = sortWorldCupItems((data.events || []).map(normalizeWorldCupEvent).filter((item) => item.id));
    const squad = await getSquadFeed();
    items = attachSpursPlayersToWorldCupItems(items, squad.items || []);
  } catch {
    dataSource = "unavailable";
    items = [];
  }

  const payload = {
    mode: "world-cup",
    refreshedAt: new Date().toISOString(),
    source: {
      label: worldCupSource.label,
      url: worldCupSource.publicUrl,
      dataSource,
    },
    filter: summarizeWorldCup(items),
    items,
  };

  worldCupFeedCache = {
    expiresAt: Date.now() + defaultFeedCacheMs,
    payload,
  };

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
  if (item.platform === "X" && item.reporterMatchedBy?.startsWith("x-")) return true;
  if (item.reporterMatchedBy === "news-search" && item.platform === "Google News") return true;

  const communityText = `${item.title || ""} ${item.summary || ""}`;
  if (isCommunityPlatform(item)) {
    return Boolean(findTrustedReporterInText(communityText));
  }

  return Boolean(findTrustedReporterInText(`${item.title || ""} ${item.source || ""} ${item.summary || ""}`));
}

function isReliableTransferItem(item) {
  if (!isTransferRelated(item)) return false;
  const trusted = hasTrustedReporterSignal(item);
  if (isTransferNoise(item) && !trusted) return false;
  return trusted;
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
          reporterLabel: displayReporterLabel(reporter),
          reporterMatchedBy: "headline-source-summary",
        }
      : item;
  });
}

function reporterPriorityScore(item) {
  if (item.reporter === "PO") return 7;
  if (item.reporter === "Paul O'Keefe") return 6;
  if (item.reporter === "Fabrizio Romano") return 3;
  if (["Alasdair Gold", "David Ornstein", "Dan Kilpatrick", "Jack Pitt-Brooke"].includes(item.reporter)) return 2;
  return item.reporter ? 1 : 0;
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
  const haystack = normalizeForMatch(
    `${item.section || ""} ${item.sourceKey || ""} ${item.source || ""} ${item.title || ""} ${item.summary || ""}`,
  );
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

async function fetchXTransferItems() {
  if (!bearerToken) return [];
  const feed = await getXFeed();
  if (feed.mode !== "live") return [];

  return (feed.items || [])
    .map((tweet) => {
      const reporter = findTrustedReporterInText(`${tweet.account || ""} ${tweet.username || ""} ${tweet.text || ""}`);
      return {
        id: `x-${tweet.id}`,
        type: "social",
        source: `X · ${tweet.account || tweet.username || "ITK"}`,
        sourceKey: `X · @${tweet.username || ""}`,
        platform: "X",
        title: cleanArticleSummary(tweet.text || "", 180),
        summary: cleanArticleSummary(tweet.text || "", 700),
        url: tweet.url,
        publishedAt: tweet.createdAt,
        reporter: reporter?.canonical || tweet.account || null,
        reporterLabel: displayReporterLabel(reporter) || tweet.account || null,
        reporterMatchedBy: reporter ? "x-account-text" : "x-account",
        score: 88,
      };
    })
    .filter((item) => item.title && item.url);
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
        reporterLabel: displayReporterLabel(reporter),
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
    "Ryan Taylor",
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
    "Pete O'Rourke",
    "Graeme Bailey",
    "Wayne Veysey",
    "Tom Gott",
    "Kieran Gill",
    "Matt Barlow",
    "Mike Keegan",
    "Darren Lewis",
    "George Sessions",
    "Jonathan Veal",
    "Ben Pearce",
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
  pagesPerMenu: 4,
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

async function fetchNaverCafeMenuPage(menu, page = 1) {
  const url = new URL(
    `https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${naverCafeConfig.clubId}/menus/${menu.id}/articles`,
  );
  url.searchParams.set("perPage", "50");
  url.searchParams.set("page", String(page));
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

async function fetchNaverCafeMenu(menu) {
  const pages = Array.from({ length: menu.pages || naverCafeConfig.pagesPerMenu }, (_, index) => index + 1);
  const settled = await Promise.allSettled(pages.map((page) => fetchNaverCafeMenuPage(menu, page)));
  return dedupeItems(settled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
}

async function fetchNaverCafe() {
  const settled = await Promise.allSettled(naverCafeConfig.menus.map(fetchNaverCafeMenu));
  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

function cafeHeatScore(item) {
  const stats = item.stats || {};
  const publishedAt = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
  const ageHours = publishedAt ? Math.max(0, (Date.now() - publishedAt) / 36e5) : 72;
  const recency = Math.max(0, 48 - ageHours) * 0.35;
  const likes = Number(stats.likes || 0);
  const comments = Number(stats.comments || 0);
  const views = Number(stats.views || 0);
  return likes * 5 + comments * 2.4 + Math.log10(views + 1) * 4 + recency;
}

async function getCafeHotFeed() {
  if (cafeHotFeedCache.payload && Date.now() < cafeHotFeedCache.expiresAt) {
    return cafeHotFeedCache.payload;
  }

  let rawItems = [];
  let dataSource = "naver-cafe";
  try {
    rawItems = await fetchNaverCafe();
  } catch {
    dataSource = "unavailable";
    rawItems = [];
  }

  const items = rawItems
    .map((item) => ({
      ...item,
      heat: cafeHeatScore(item),
    }))
    .sort((a, b) => b.heat - a.heat || new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 8)
    .map((item) =>
      sanitizeFeedItem({
        ...item,
        source: item.sourceKey || item.source,
        summary: item.summary || `${item.section || "카페"} 게시판에서 반응이 올라오는 글입니다.`,
        heatLabel: item.heat >= 28 ? "HOT" : "Cafe",
      }),
    )
    .filter((item) => item.title && item.url);

  cafeHotFeedCache = {
    expiresAt: Date.now() + communityCacheTtlMs,
    payload: {
      mode: "cafe-hot",
      refreshedAt: new Date().toISOString(),
      source: {
        label: "스퍼스 코리아 카페",
        url: naverCafeConfig.homeUrl,
        dataSource,
      },
      filter: {
        rawCount: rawItems.length,
        shownCount: items.length,
      },
      items,
    },
  };

  return cafeHotFeedCache.payload;
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
      const priorityDiff = reporterPriorityScore(b) - reporterPriorityScore(a);
      const reporterDiff = Number(Boolean(b.reporter)) - Number(Boolean(a.reporter));
      return priorityDiff || reporterDiff || dateDiff || b.score - a.score;
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
  const xSource = await safeSource("X", fetchXTransferItems);
  const transferItems = diversifyBySource(
    [...baseFeed.items, ...xSource.items]
      .filter(isReliableTransferItem)
      .sort((a, b) => {
        const priorityDiff = reporterPriorityScore(b) - reporterPriorityScore(a);
        const dateDiff = new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
        return priorityDiff || dateDiff || b.score - a.score;
      }),
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
      sources: [
        ...(baseFeed.sources || []),
        {
          name: xSource.name,
          count: xSource.items.length,
          ok: !xSource.error,
          error: xSource.error,
        },
      ],
      filter: {
        ...baseFeed.filter,
        xCount: xSource.items.length,
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
  if (pathname === "/community") pathname = "/community.html";
  if (/^\/community\/[a-z0-9-]+$/i.test(pathname)) pathname = "/community.html";
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

async function handleRequest(request, response) {
  try {
    if (!["GET", "HEAD", "POST"].includes(request.method)) {
      sendText(response, 405, "Method not allowed", { allow: "GET, HEAD, POST" });
      return;
    }

    if (isRateLimited(request)) {
      sendText(response, 429, "Too many requests", { "retry-after": "60" });
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/healthz" || url.pathname === "/api/healthz") {
      sendHealth(request, response);
      return;
    }
    if (url.pathname === "/api/teams") {
      sendJson(response, 200, await getTeamsPayload());
      return;
    }
    if (url.pathname.startsWith("/api/teams/")) {
      const payload = await getTeamPayload(url.pathname.split("/").pop() || "");
      if (!payload) {
        sendJson(response, 404, { mode: "not-found", message: "팀을 찾지 못했습니다.", items: [] });
        return;
      }
      sendJson(response, 200, payload);
      return;
    }
    if (url.pathname === "/api/community-posts") {
      if (request.method === "POST") {
        const result = await createCommunityPost(request);
        sendJson(response, result.status, result.payload);
        return;
      }
      const payload = await getCommunityPostsPayload({
        teamId: url.searchParams.get("team") || "tottenham",
        board: url.searchParams.get("board") || "all",
        postId: url.searchParams.get("post") || "",
        ownerToken: request.headers["x-community-owner-token"] || "",
      });
      if (!payload) {
        sendJson(response, 404, { mode: "not-found", message: "팀을 찾지 못했습니다.", items: [] });
        return;
      }
      sendJson(response, 200, payload);
      return;
    }
    if (url.pathname === "/api/community-comments") {
      if (request.method !== "POST") {
        sendText(response, 405, "Method not allowed", { allow: "POST" });
        return;
      }
      const result = await createCommunityComment(request);
      sendJson(response, result.status, result.payload);
      return;
    }
    if (url.pathname === "/api/community-votes") {
      if (request.method !== "POST") {
        sendText(response, 405, "Method not allowed", { allow: "POST" });
        return;
      }
      const result = await createCommunityVote(request);
      sendJson(response, result.status, result.payload);
      return;
    }
    if (url.pathname === "/api/community-reports") {
      if (request.method !== "POST") {
        sendText(response, 405, "Method not allowed", { allow: "POST" });
        return;
      }
      const result = await createCommunityReport(request);
      sendJson(response, result.status, result.payload);
      return;
    }
    if (url.pathname === "/api/community-delete") {
      if (request.method !== "POST") {
        sendText(response, 405, "Method not allowed", { allow: "POST" });
        return;
      }
      const result = await deleteCommunityTarget(request);
      sendJson(response, result.status, result.payload);
      return;
    }
    if (url.pathname === "/api/analytics-summary") {
      if (!isCommunityAdmin(request.headers["x-admin-key"] || "")) {
        sendJson(response, 403, { mode: "admin-required", message: "관리자 인증이 필요합니다." });
        return;
      }
      sendJson(response, 200, await getAnalyticsSummary());
      return;
    }
    if (url.pathname === "/api/analytics-event") {
      if (request.method !== "POST") {
        sendText(response, 405, "Method not allowed", { allow: "POST" });
        return;
      }
      sendJson(response, 200, await recordAnalyticsEvent(request));
      return;
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      sendText(response, 405, "Method not allowed", { allow: "GET, HEAD" });
      return;
    }
    if (url.pathname === "/api/version") {
      sendJson(response, 200, buildInfo());
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
    if (url.pathname === "/api/world-cup") {
      sendJson(response, 200, await getWorldCupFeed());
      return;
    }
    if (url.pathname === "/api/cafe-hot") {
      sendJson(response, 200, await getCafeHotFeed());
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
}

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(port, host, () => {
    console.log(`Spurs Pulse running at http://${displayHost}:${port}`);
    console.log(`Listening host: ${host}. Mode: ${isProduction ? "production" : "local"}.`);
    console.log(`Free community crawler refresh: ${Math.round(communityCacheTtlMs / 1000)}s.`);
    if (!bearerToken) {
      console.log("Set X_BEARER_TOKEN to enable live X API ingestion.");
    }
  });
}

module.exports = {
  handleRequest,
};
