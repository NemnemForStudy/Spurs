const articles = [
  {
    title: "부상 위기 리뷰: 의료·피지컬 부서와 접이식 피치까지 점검",
    url: "https://www.skysports.com/football/news/11675/13547360/spurs-conduct-major-review-into-injury-crisis-with-stadiums-retractable-pitch-one-area-investigated",
  },
  {
    title: "팔리냐 완전 이적 여론 급상승",
    url: "https://www.fourfourtwo.com/transfer/tottenham-hotspur-ready-to-complete-straightforward-first-summer-signing-report",
  },
  {
    title: "에버턴전 1-0 승리로 프리미어리그 생존 확정",
    url: "https://www.flashscore.com/news/premier-league-tottenham-everton-report-may-24-2026/KzxvhSbk/",
  },
  {
    title: "매디슨과 갤러거: 데 제르비가 재앙을 막았다",
    url: "https://www.theguardian.com/football/2026/may/25/roberto-de-zerbi-spurs-saved-disaster-james-maddison-senesi-robertson",
  },
  {
    title: "사비 시몬스 무릎 수술 공식 발표",
    url: "https://www.tottenhamhotspur.com/news/1064344/xavi-simons-undergoes-surgery-on-knee-injury",
  },
];

const feedState = {
  korean: { page: 1, items: [], payload: null },
  english: { page: 1, items: [], payload: null },
  transfer: { page: 1, items: [], payload: null },
};

const squadState = {
  items: [],
  payload: null,
  filter: "ALL",
  query: "",
};

const injuryState = {
  items: [],
  payload: null,
  filter: "ALL",
  query: "",
  season: "2025",
  requestId: 0,
};

const resultState = {
  items: [],
  payload: null,
  filter: "ALL",
  query: "",
  season: "2025",
  requestId: 0,
};

const feeds = {
  korean: {
    endpoint: "/api/korean-feed",
    grid: document.querySelector("#koreanGrid"),
    status: document.querySelector("#koreanStatus"),
    refresh: document.querySelector("#refreshKorean"),
    prev: document.querySelector("#prevKoreanPage"),
    next: document.querySelector("#nextKoreanPage"),
    pageStatus: document.querySelector("#koreanPageStatus"),
    empty: "국문 번역 피드를 불러오지 못했습니다.",
  },
  english: {
    endpoint: "/api/community-feed",
    grid: document.querySelector("#englishGrid"),
    status: document.querySelector("#englishStatus"),
    refresh: document.querySelector("#refreshEnglish"),
    prev: document.querySelector("#prevEnglishPage"),
    next: document.querySelector("#nextEnglishPage"),
    pageStatus: document.querySelector("#englishPageStatus"),
    empty: "영문 피드를 불러오지 못했습니다.",
  },
  transfer: {
    endpoint: "/api/transfer-feed",
    grid: document.querySelector("#transferGrid"),
    status: document.querySelector("#transferStatus"),
    refresh: document.querySelector("#refreshTransfer"),
    prev: document.querySelector("#prevTransferPage"),
    next: document.querySelector("#nextTransferPage"),
    pageStatus: document.querySelector("#transferPageStatus"),
    empty: "이적시장 기사를 아직 찾지 못했습니다.",
  },
};

const clientCacheTtlMs = 90_000;
const feedCacheVersion = "spurs-pulse-feed-v14";
const warmingEndpoints = new Set();

const warmableEndpoints = [
  "/api/korean-feed",
  "/api/community-feed",
  "/api/transfer-feed",
  "/api/squad",
  "/api/injuries",
  "/api/results",
];

const navEndpointByPage = {
  "korean.html": "/api/korean-feed",
  "english.html": "/api/community-feed",
  "market.html": "/api/transfer-feed",
  "players.html": "/api/squad",
  "injuries.html": "/api/injuries",
  "results.html": "/api/results",
};

const squadElements = {
  stats: document.querySelector("#squadStats"),
  status: document.querySelector("#squadStatus"),
  refresh: document.querySelector("#refreshSquad"),
  search: document.querySelector("#squadSearch"),
  filters: document.querySelector("#squadFilters"),
  depthChart: document.querySelector("#depthChart"),
  firstTeamTable: document.querySelector("#firstTeamTable"),
  loanTable: document.querySelector("#loanTable"),
  firstTeamCount: document.querySelector("#firstTeamCount"),
  loanCount: document.querySelector("#loanCount"),
  empty: document.querySelector("#squadEmpty"),
};

const playerDetailElement = document.querySelector("#playerDetail");

const injuryElements = {
  stats: document.querySelector("#injuryStats"),
  status: document.querySelector("#injuryStatus"),
  refresh: document.querySelector("#refreshInjuries"),
  search: document.querySelector("#injurySearch"),
  filters: document.querySelector("#injuryFilters"),
  seasons: document.querySelector("#injurySeasons"),
  table: document.querySelector("#injuryTable"),
  empty: document.querySelector("#injuryEmpty"),
};

const resultElements = {
  stats: document.querySelector("#resultStats"),
  status: document.querySelector("#resultStatus"),
  refresh: document.querySelector("#refreshResults"),
  search: document.querySelector("#resultSearch"),
  filters: document.querySelector("#resultFilters"),
  seasons: document.querySelector("#resultSeasons"),
  table: document.querySelector("#resultTable"),
  empty: document.querySelector("#resultEmpty"),
};

const depthSlots = [
  ["GK", "GK"],
  ["CB", "CB"],
  ["RB", "RB"],
  ["LB", "LB"],
  ["DM", "DM"],
  ["CM", "CM"],
  ["AM", "AM"],
  ["LW", "LW"],
  ["RW", "RW"],
  ["ST", "ST"],
];

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHttpUrl(value = "") {
  try {
    const parsed = new URL(value, window.location.href);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function proxiedImageUrl(value = "") {
  const url = safeHttpUrl(value);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (["resources.thfc.pulselive.com", "tmssl.akamaized.net"].includes(parsed.hostname)) {
      return `/api/image?url=${encodeURIComponent(parsed.href)}`;
    }
    return url;
  } catch {
    return "";
  }
}

const countryLabels = {
  Argentina: "아르헨티나",
  Austria: "오스트리아",
  Brazil: "브라질",
  Croatia: "크로아티아",
  "Czech Republic": "체코",
  England: "잉글랜드",
  France: "프랑스",
  Ghana: "가나",
  Israel: "이스라엘",
  Italy: "이탈리아",
  Japan: "일본",
  Mali: "말리",
  Netherlands: "네덜란드",
  Portugal: "포르투갈",
  Romania: "루마니아",
  Senegal: "세네갈",
  "South Korea": "대한민국",
  Spain: "스페인",
  Sweden: "스웨덴",
  Uruguay: "우루과이",
  Wales: "웨일스",
};

function displayNationality(value = "") {
  return countryLabels[value] || value || "-";
}

function cleanDisplayText(value = "") {
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
        if (!trimmed || metaTokenPattern.test(trimmed)) return false;
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
    .replace(/^[\s·,.-]+|[\s·,.-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function feedCacheKey(endpoint) {
  return `${feedCacheVersion}:${endpoint}`;
}

function readCachedPayload(endpoint) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(feedCacheKey(endpoint)) || "null");
    if (!cached?.payload?.items?.length || Date.now() - cached.savedAt > clientCacheTtlMs) return null;
    return cached.payload;
  } catch {
    return null;
  }
}

function writeCachedPayload(endpoint, payload) {
  if (!payload?.items?.length) return;
  try {
    sessionStorage.setItem(feedCacheKey(endpoint), JSON.stringify({ savedAt: Date.now(), payload }));
  } catch {
    // Session storage can be full or disabled; the live fetch still works.
  }
}

async function warmEndpoint(endpoint) {
  if (!endpoint || readCachedPayload(endpoint) || warmingEndpoints.has(endpoint)) return;
  warmingEndpoints.add(endpoint);
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) return;
    writeCachedPayload(endpoint, await response.json());
  } catch {
    // Warming is only for faster navigation; ignore failures quietly.
  } finally {
    warmingEndpoints.delete(endpoint);
  }
}

function warmOtherCaches(currentEndpoint) {
  window.setTimeout(() => {
    warmableEndpoints.filter((endpoint) => endpoint !== currentEndpoint).forEach(warmEndpoint);
  }, 600);
}

function formatDate(value) {
  if (!value) return "방금 전";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function markActiveNav() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".top-nav a").forEach((link) => {
    const linkPage = new URL(link.href, window.location.href).pathname.split("/").pop() || "index.html";
    link.classList.toggle("is-active", linkPage === currentPage || (currentPage === "player.html" && linkPage === "players.html"));
  });
}

function fitCardSummaries(scope = document) {
  const summaries = scope.querySelectorAll(".live-card p[data-full-summary]");
  summaries.forEach((summary) => {
    const fullText = summary.dataset.fullSummary || "";
    summary.textContent = fullText;
    if (!fullText || summary.scrollHeight <= summary.clientHeight + 1) return;

    let low = 0;
    let high = fullText.length;
    let best = "";

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const candidate = fullText.slice(0, middle).trimEnd();
      summary.textContent = candidate;

      if (summary.scrollHeight <= summary.clientHeight + 1) {
        best = candidate;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    summary.textContent = best;
  });
}

function renderFeed(name) {
  const config = feeds[name];
  const state = feedState[name];
  if (!config.grid) return;

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(state.items.length / pageSize));
  state.page = Math.min(Math.max(1, state.page), totalPages);

  if (!state.items.length) {
    config.grid.innerHTML = `<div class="empty-state">${config.empty}</div>`;
    config.pageStatus.textContent = "1 / 1";
    config.prev.disabled = true;
    config.next.disabled = true;
    return;
  }

  config.grid.innerHTML = state.items
    .slice((state.page - 1) * pageSize, state.page * pageSize)
    .map((item) => {
      const source = cleanDisplayText(item.source || "");
      const title = cleanDisplayText(item.title || "");
      const summary = cleanDisplayText(item.summary || "");
      const label = cleanDisplayText(item.reporterLabel || item.reporter || "");
      const href = safeHttpUrl(item.url);
      return `
        <article class="live-card${summary ? "" : " no-summary"}">
          <header>
            <div class="live-source">
              <strong>${escapeHtml(source)}</strong>
              ${label ? `<span class="live-reporter">${escapeHtml(label)}</span>` : ""}
            </div>
            <time class="live-date">${formatDate(item.publishedAt)}</time>
          </header>
          <h3>${escapeHtml(title)}</h3>
          ${summary ? `<p data-full-summary="${escapeHtml(summary)}">${escapeHtml(summary)}</p>` : ""}
          <div class="live-links">
            ${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">원문 보기</a>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  config.pageStatus.textContent = `${state.page} / ${totalPages}`;
  config.prev.disabled = state.page <= 1;
  config.next.disabled = state.page >= totalPages;
  requestAnimationFrame(() => fitCardSummaries(config.grid));
}

function feedStatusText(payload) {
  const shown = payload.filter?.shownCount ?? payload.items?.length ?? 0;
  return `${shown}개 · ${formatDate(payload.refreshedAt)} 갱신`;
}

async function refreshFeed(name) {
  const config = feeds[name];
  const state = feedState[name];
  if (!config.grid) return;

  const cached = readCachedPayload(config.endpoint);
  if (cached && !state.items.length) {
    state.payload = cached;
    state.items = cached.items || [];
    config.status.textContent = feedStatusText(cached);
    renderFeed(name);
  } else {
    config.status.textContent = "새 소식 확인 중";
  }
  state.page = 1;

  try {
    const response = await fetch(config.endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("feed unavailable");
    const payload = await response.json();
    state.payload = payload;
    state.items = payload.items || [];
    writeCachedPayload(config.endpoint, payload);
    config.status.textContent = feedStatusText(payload);
    renderFeed(name);
    warmOtherCaches(config.endpoint);
  } catch {
    if (!state.items.length) {
      state.payload = null;
      state.items = [];
      config.status.textContent = "연결 실패";
    } else if (state.payload) {
      config.status.textContent = feedStatusText(state.payload);
    }
    renderFeed(name);
  }
}

function squadStatusText(payload) {
  const count = payload.filter?.shownCount ?? payload.items?.length ?? 0;
  const sourceLabel = payload.source?.dataSource === "fallback" ? "공식 백업" : "공식";
  return `${count}명 · ${sourceLabel} · ${formatDate(payload.refreshedAt)} 갱신`;
}

function renderSquadStats(payload) {
  if (!squadElements.stats) return;
  const filter = payload?.filter || {};
  const stats = [
    ["전체", filter.total ?? 0],
    ["1군", filter.firstTeam ?? 0],
    ["임대", filter.loan ?? 0],
    ["GK", filter.GK ?? 0],
    ["DF", filter.DF ?? 0],
    ["MF", filter.MF ?? 0],
    ["FW", filter.FW ?? 0],
  ];

  squadElements.stats.innerHTML = stats
    .map(
      ([label, value]) => `
        <div class="squad-stat">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join("");
}

function playerDetailUrl(item) {
  return `./player.html?id=${encodeURIComponent(item.id || "")}`;
}

function renderDepthChart(items = []) {
  if (!squadElements.depthChart) return;
  const firstTeamItems = items.filter((item) => item.status === "first-team");
  const loanItems = items.filter((item) => item.status === "loan");
  const allItems = [...firstTeamItems, ...loanItems];

  squadElements.depthChart.innerHTML = depthSlots
    .map(([role, label]) => {
      const roleItems = allItems.filter((item) => (item.depthRoles || []).includes(role));
      return `
        <article class="depth-lane">
          <header>
            <strong>${escapeHtml(label)}</strong>
            <span>${roleItems.length}명</span>
          </header>
          <div class="depth-list">
            ${
              roleItems.length
                ? roleItems
                    .map(
                      (item) => `
                        <a class="depth-player ${item.status === "loan" ? "is-loan" : ""}" href="${escapeHtml(playerDetailUrl(item))}">
                          <span class="depth-number">${escapeHtml(item.number || "-")}</span>
                          <span>
                            <strong>${escapeHtml(item.nameKo || item.name)}</strong>
                            <small>${escapeHtml(item.status === "loan" ? "임대" : item.name)}</small>
                          </span>
                        </a>
                      `,
                    )
                    .join("")
                : `<span class="depth-empty">-</span>`
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function filteredSquadItems() {
  const query = squadState.query.trim().toLowerCase();
  return squadState.items.filter((item) => {
    const matchesFilter =
      squadState.filter === "ALL" ||
      (squadState.filter === "LOAN" && item.status === "loan") ||
      item.positionGroup === squadState.filter;
    if (!matchesFilter) return false;
    if (!query) return true;

    const searchable = [
      item.name,
      item.nameKo,
      item.number,
      item.position,
      item.positionLabel,
      item.nationality,
      displayNationality(item.nationality),
      item.statusLabel,
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

function renderSquadRows(items) {
  return items
    .map((item) => {
      const href = safeHttpUrl(item.profileUrl);
      const imageUrl = proxiedImageUrl(item.imageUrl);
      const koreanName = item.nameKo || item.name;
      const showEnglishName = item.name && item.name !== koreanName;
      const initials = item.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
      return `
        <tr>
          <td>
            ${
              imageUrl
                ? `<img class="squad-photo" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)} 사진" loading="eager" decoding="async" />`
                : `<span class="squad-photo placeholder" aria-hidden="true">${escapeHtml(initials || "?")}</span>`
            }
          </td>
          <td><span class="squad-number">${escapeHtml(item.number || "-")}</span></td>
          <td>
            <a class="squad-name-link" href="${escapeHtml(playerDetailUrl(item))}">
              <strong class="squad-player-name">${escapeHtml(koreanName)}</strong>
            </a>
            ${showEnglishName ? `<span class="squad-player-english">${escapeHtml(item.name)}</span>` : ""}
          </td>
          <td>
            <span class="position-pill ${escapeHtml(item.positionGroup.toLowerCase())}">${escapeHtml(item.positionLabel)}</span>
          </td>
          <td>${escapeHtml(displayNationality(item.nationality))}</td>
          <td><span class="status-pill ${item.status === "loan" ? "loan" : "first"}">${escapeHtml(item.statusLabel)}</span></td>
          <td>
            ${href ? `<a class="squad-profile-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">공식</a>` : "-"}
          </td>
        </tr>
      `;
    })
    .join("");
}

function updateSquadBlock(table, countElement, items) {
  const block = table?.closest(".squad-block");
  if (!table || !block) return;
  table.innerHTML = renderSquadRows(items);
  block.hidden = !items.length;
  if (countElement) countElement.textContent = `${items.length}명`;
}

function renderSquad() {
  if (!squadElements.firstTeamTable || !squadElements.loanTable) return;
  const items = filteredSquadItems();
  const firstTeam = items.filter((item) => item.status === "first-team");
  const loan = items.filter((item) => item.status === "loan");

  updateSquadBlock(squadElements.firstTeamTable, squadElements.firstTeamCount, firstTeam);
  updateSquadBlock(squadElements.loanTable, squadElements.loanCount, loan);

  if (squadElements.empty) squadElements.empty.hidden = Boolean(items.length);
}

async function refreshSquad() {
  if (!squadElements.firstTeamTable || !squadElements.loanTable) return;

  const endpoint = "/api/squad";
  const cached = readCachedPayload(endpoint);
  if (cached && !squadState.items.length) {
    squadState.payload = cached;
    squadState.items = cached.items || [];
    if (squadElements.status) squadElements.status.textContent = squadStatusText(cached);
    renderSquadStats(cached);
    renderDepthChart(cached.items || []);
    renderSquad();
  } else if (squadElements.status) {
    squadElements.status.textContent = "공식 선수단 확인 중";
  }

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("squad unavailable");
    const payload = await response.json();
    squadState.payload = payload;
    squadState.items = payload.items || [];
    writeCachedPayload(endpoint, payload);
    if (squadElements.status) squadElements.status.textContent = squadStatusText(payload);
    renderSquadStats(payload);
    renderDepthChart(payload.items || []);
    renderSquad();
    warmOtherCaches(endpoint);
  } catch {
    if (squadElements.status) {
      squadElements.status.textContent = squadState.items.length ? squadStatusText(squadState.payload) : "선수단 연결 실패";
    }
    renderSquad();
  }
}

function formatIsoDate(value = "") {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

function displayFoot(value = "") {
  const normalized = value.toLowerCase();
  if (normalized === "left") return "왼발";
  if (normalized === "right") return "오른발";
  if (normalized === "both") return "양발";
  return value || "-";
}

function factRows(player) {
  const detail = player.detail || {};
  return [
    ["등번호", player.number || "-"],
    ["포지션", player.positionLabel || player.position || "-"],
    ["국적", displayNationality(player.nationality)],
    ["상태", player.statusLabel || "-"],
    ["생년월일", formatIsoDate(detail.birthDate) || "-"],
    ["나이", detail.age || "-"],
    ["키", detail.height || "-"],
    ["몸무게", detail.weight || "-"],
    ["주발", displayFoot(detail.preferredFoot)],
    ["입단일", detail.joined || "-"],
    ["데뷔", detail.debut || "-"],
    ["레거시 번호", detail.legacyNumber || "-"],
  ];
}

function renderPlayerDetail(payload) {
  if (!playerDetailElement) return;
  const player = payload.player;
  const imageUrl = proxiedImageUrl(player.imageUrl);
  const officialUrl = safeHttpUrl(player.profileUrl);
  const koreanName = player.nameKo || player.name;
  const summary = `${koreanName}는 ${displayNationality(player.nationality)} 국적의 ${player.positionLabel || player.position}입니다. 현재 상태는 ${player.statusLabel || "선수단"}이며, 포지션 뎁스차트에서는 ${(player.depthRoles || []).join(", ") || player.positionGroup}로 분류됩니다.`;

  document.title = `${koreanName} | Spurs Pulse`;
  playerDetailElement.innerHTML = `
    <article class="player-hero-card">
      <div class="player-portrait">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(koreanName)} 사진" />` : ""}
      </div>
      <div class="player-profile-main">
        <p class="eyebrow">Tottenham player</p>
        <h1>${escapeHtml(koreanName)}</h1>
        <p class="player-english-name">${escapeHtml(player.name)}</p>
        <div class="player-tags">
          <span>#${escapeHtml(player.number || "-")}</span>
          <span>${escapeHtml(player.positionLabel || player.position)}</span>
          <span>${escapeHtml(displayNationality(player.nationality))}</span>
          <span>${escapeHtml(player.statusLabel || "-")}</span>
        </div>
        <p class="player-summary">${escapeHtml(summary)}</p>
        <div class="player-actions">
          <a class="source-link" href="./players.html">선수단</a>
          ${officialUrl ? `<a class="source-link secondary" href="${escapeHtml(officialUrl)}" target="_blank" rel="noopener noreferrer">공식 프로필</a>` : ""}
        </div>
      </div>
    </article>

    <section class="player-info-grid" aria-label="선수 상세 정보">
      ${factRows(player)
        .map(
          ([label, value]) => `
            <div class="player-fact">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `,
        )
        .join("")}
    </section>
  `;
}

async function refreshPlayerDetail() {
  if (!playerDetailElement) return;
  const id = new URLSearchParams(window.location.search).get("id") || "";
  if (!id) {
    playerDetailElement.innerHTML = `<div class="empty-state">선수 ID가 없습니다.</div>`;
    return;
  }

  try {
    const response = await fetch(`/api/player-detail?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("player unavailable");
    renderPlayerDetail(await response.json());
  } catch {
    playerDetailElement.innerHTML = `<div class="empty-state">선수 정보를 불러오지 못했습니다.</div>`;
  }
}

function injuryStatusText(payload) {
  const count = payload.filter?.shownCount ?? payload.items?.length ?? 0;
  return `${payload.source?.season || "25/26"} · ${count}건 · ${formatDate(payload.refreshedAt)} 갱신`;
}

function renderInjuryStats(payload) {
  if (!injuryElements.stats) return;
  const filter = payload?.filter || {};
  const stats = [
    ["이력", filter.shownCount ?? 0],
    ["선수", filter.playersAffected ?? 0],
    ["결장 경기", filter.missedMatches ?? 0],
    ["복귀 예정", filter.expected ?? 0],
  ];

  injuryElements.stats.innerHTML = stats
    .map(
      ([label, value]) => `
        <div class="squad-stat">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join("");
}

function filteredInjuryItems() {
  const query = injuryState.query.trim().toLowerCase();
  return injuryState.items.filter((item) => {
    const positionGroup = item.positionLabel === "골키퍼" ? "GK" : item.positionLabel === "수비수" ? "DF" : item.positionLabel === "미드필더" ? "MF" : item.positionLabel === "공격수" ? "FW" : "";
    const matchesFilter =
      injuryState.filter === "ALL" ||
      (injuryState.filter === "EXPECTED" && item.status === "expected") ||
      positionGroup === injuryState.filter;
    if (!matchesFilter) return false;
    if (!query) return true;

    return [
      item.playerName,
      item.playerNameKo,
      item.injury,
      item.injuryKo,
      item.position,
      item.positionLabel,
      item.statusLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderInjuries() {
  if (!injuryElements.table) return;
  const items = filteredInjuryItems();
  injuryElements.table.innerHTML = items
    .map((item) => {
      const returnText = item.returnExpectedDate ? `예상 ${formatIsoDate(item.returnExpectedDate)}` : "";
      const matchdayText =
        item.fromMatchday === item.toMatchday
          ? `${item.fromMatchday}R`
          : `${item.fromMatchday}R-${item.toMatchday}R`;
      const imageUrl = proxiedImageUrl(item.playerImageUrl);
      return `
        <tr>
          <td>
            ${
              imageUrl
                ? `<img class="injury-photo" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.playerNameKo || item.playerName)} 사진" loading="eager" decoding="async" />`
                : `<span class="injury-photo placeholder" aria-hidden="true">TH</span>`
            }
          </td>
          <td>
            <a class="injury-player" href="./player.html?id=${encodeURIComponent(item.playerId)}">
              <strong>${escapeHtml(item.playerNameKo || item.playerName)}</strong>
              <span>${escapeHtml(item.playerName)}</span>
            </a>
          </td>
          <td>
            <strong class="injury-name">${escapeHtml(item.injuryKo || item.injury)}</strong>
            <span class="injury-original">${escapeHtml(item.injury)}</span>
          </td>
          <td>
            <span class="injury-round">${escapeHtml(matchdayText)}</span>
            ${returnText ? `<small>${escapeHtml(returnText)}</small>` : ""}
          </td>
          <td><span class="injury-missed">${escapeHtml(item.missedMatches)}경기</span></td>
          <td><span class="status-pill ${item.status === "expected" ? "loan" : "first"}">${escapeHtml(item.statusLabel)}</span></td>
        </tr>
      `;
    })
    .join("");

  if (injuryElements.empty) injuryElements.empty.hidden = Boolean(items.length);
}

async function refreshInjuries() {
  if (!injuryElements.table) return;
  const requestId = ++injuryState.requestId;
  const endpoint = `/api/injuries?season=${encodeURIComponent(injuryState.season)}`;
  const cached = readCachedPayload(endpoint);
  if (cached && !injuryState.items.length) {
    injuryState.payload = cached;
    injuryState.items = cached.items || [];
    if (injuryElements.status) injuryElements.status.textContent = injuryStatusText(cached);
    renderInjuryStats(cached);
    renderInjuries();
  } else if (injuryElements.status) {
    injuryElements.status.textContent = "부상 이력 확인 중";
    injuryState.items = [];
    renderInjuries();
  }

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("injuries unavailable");
    const payload = await response.json();
    if (requestId !== injuryState.requestId) return;
    injuryState.payload = payload;
    injuryState.items = payload.items || [];
    writeCachedPayload(endpoint, payload);
    if (injuryElements.status) injuryElements.status.textContent = injuryStatusText(payload);
    renderInjuryStats(payload);
    renderInjuries();
    warmOtherCaches(endpoint);
  } catch {
    if (injuryElements.status) {
      injuryElements.status.textContent = injuryState.items.length ? injuryStatusText(injuryState.payload) : "부상 이력 연결 실패";
    }
    renderInjuries();
  }
}

function resultStatusText(payload) {
  const count = payload.filter?.shownCount ?? payload.items?.length ?? 0;
  const played = payload.filter?.playedCount ?? 0;
  return `${payload.source?.season || "25/26"} · ${played}/${count}경기 · ${formatDate(payload.refreshedAt)} 갱신`;
}

function renderResultStats(payload) {
  if (!resultElements.stats) return;
  const filter = payload?.filter || {};
  const stats = [
    ["경기", filter.shownCount ?? 0],
    ["완료", filter.playedCount ?? 0],
    ["승", filter.wins ?? 0],
    ["무", filter.draws ?? 0],
    ["패", filter.losses ?? 0],
    ["대회", filter.competitions ?? 0],
  ];

  resultElements.stats.innerHTML = stats
    .map(
      ([label, value]) => `
        <div class="squad-stat">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join("");
}

function formatResultDate(item) {
  if (!item?.date) return item?.dateText || "-";
  const parsed = new Date(`${item.date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return item.dateText || item.date;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

const resultCompetitionLabels = {
  "Premier League": { ko: "프리미어리그", short: "리그" },
  "UEFA Champions League": { ko: "UEFA 챔피언스리그", short: "챔스" },
  "UEFA Europa League": { ko: "UEFA 유로파리그", short: "유로파" },
  "UEFA Super Cup": { ko: "UEFA 슈퍼컵", short: "슈퍼컵" },
  "FA Cup": { ko: "FA컵", short: "FA컵" },
  "EFL Cup": { ko: "리그컵", short: "리그컵" },
};

const resultOpponentLabels = {
  Arsenal: "아스널",
  "Aston Villa": "애스턴 빌라",
  Atlético: "아틀레티코",
  "AZ Alkmaar": "AZ 알크마르",
  "Bodø/Glimt": "보되/글림트",
  Bournemouth: "본머스",
  Brentford: "브렌트포드",
  Brighton: "브라이튼",
  Burnley: "번리",
  Chelsea: "첼시",
  Copenhagen: "코펜하겐",
  Coventry: "코번트리",
  "Crystal Palace": "크리스털 팰리스",
  Doncaster: "돈캐스터",
  Dortmund: "도르트문트",
  Elfsborg: "엘프스보리",
  Everton: "에버턴",
  Ferencváros: "페렌츠바로시",
  Frankfurt: "프랑크푸르트",
  Fulham: "풀럼",
  Galatasaray: "갈라타사라이",
  Hoffenheim: "호펜하임",
  Ipswich: "입스위치",
  Leeds: "리즈",
  Leicester: "레스터",
  Liverpool: "리버풀",
  Luton: "루턴",
  "Man City": "맨시티",
  "Man Utd": "맨유",
  Monaco: "모나코",
  Newcastle: "뉴캐슬",
  "Nott'm Forest": "노팅엄 포레스트",
  PSG: "파리 생제르맹",
  Qarabağ: "카라바흐",
  Rangers: "레인저스",
  Roma: "로마",
  "Sheff Utd": "셰필드 유나이티드",
  "Slavia Praha": "슬라비아 프라하",
  Southampton: "사우샘프턴",
  Sunderland: "선덜랜드",
  Tamworth: "탬워스",
  Villarreal: "비야레알",
  "West Ham": "웨스트햄",
  Wolves: "울버햄튼",
};

function resultCompetitionKorean(competition = "") {
  return resultCompetitionLabels[competition]?.ko || competition || "-";
}

function resultCompetitionLabel(competition = "") {
  if (resultCompetitionLabels[competition]) return resultCompetitionLabels[competition].short;
  const normalized = competition.toLowerCase();
  if (normalized.includes("premier league")) return "리그";
  if (normalized.includes("champions league")) return "챔스";
  if (normalized.includes("europa league")) return "유로파";
  if (normalized.includes("fa cup")) return "FA컵";
  if (normalized.includes("efl cup")) return "리그컵";
  if (normalized.includes("super cup")) return "슈퍼컵";
  return competition || "기타";
}

function resultCompetitionOrder(competition = "") {
  const normalized = competition.toLowerCase();
  if (normalized.includes("premier league")) return 1;
  if (normalized.includes("champions league")) return 2;
  if (normalized.includes("europa league")) return 3;
  if (normalized.includes("fa cup")) return 4;
  if (normalized.includes("efl cup")) return 5;
  if (normalized.includes("super cup")) return 6;
  return 99;
}

function resultCompetitions(items = []) {
  return [...new Set(items.map((item) => item.competition).filter(Boolean))].sort(
    (a, b) => resultCompetitionOrder(a) - resultCompetitionOrder(b) || a.localeCompare(b),
  );
}

function resultOpponentKorean(name = "") {
  return resultOpponentLabels[name] || name || "-";
}

function resultOpponentEnglish(item = {}) {
  const compact = item.opponentName || "";
  const full = item.opponentFullName || "";
  if (compact && full && compact !== full) return `${compact} · ${full}`;
  return compact || full || "-";
}

function renderResultFilters() {
  if (!resultElements.filters) return;
  const competitions = resultCompetitions(resultState.items);
  if (resultState.filter !== "ALL" && !competitions.includes(resultState.filter)) {
    resultState.filter = "ALL";
  }

  const buttons = [
    { value: "ALL", label: "전체", english: "All", count: resultState.items.length },
    ...competitions.map((competition) => ({
      value: competition,
      label: resultCompetitionLabel(competition),
      english: competition,
      count: resultState.items.filter((item) => item.competition === competition).length,
    })),
  ];

  resultElements.filters.innerHTML = buttons
    .map(
      (button) => `
        <button class="filter ${resultState.filter === button.value ? "is-active" : ""}" type="button" data-result-filter="${escapeHtml(button.value)}">
          <span class="result-filter-label">${escapeHtml(button.label)}</span>
          <small>${escapeHtml(button.english)}</small>
          <span class="result-filter-count">${escapeHtml(button.count)}</span>
        </button>
      `,
    )
    .join("");
}

function filteredResultItems() {
  const query = resultState.query.trim().toLowerCase();
  return resultState.items.filter((item) => {
    const matchesFilter = resultState.filter === "ALL" || item.competition === resultState.filter;
    if (!matchesFilter) return false;
    if (!query) return true;

    return [
      item.competition,
      resultCompetitionKorean(item.competition),
      item.matchday,
      item.opponentName,
      item.opponentFullName,
      resultOpponentKorean(item.opponentName),
      item.venueLabel,
      item.result,
      item.outcomeLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderResults() {
  if (!resultElements.table) return;
  const items = filteredResultItems();
  resultElements.table.innerHTML = items
    .map((item) => {
      const logoUrl = proxiedImageUrl(item.opponentLogoUrl);
      const reportUrl = safeHttpUrl(item.matchReportUrl);
      const opponentUrl = safeHttpUrl(item.opponentUrl);
      const opponentName = item.opponentName || item.opponentFullName || "-";
      const opponentNameKo = resultOpponentKorean(opponentName);
      const opponentNameEn = resultOpponentEnglish(item);
      const competitionKo = resultCompetitionKorean(item.competition);
      return `
        <tr class="result-row outcome-${escapeHtml(item.outcome || "played")}">
          <td>
            <time class="result-date">${escapeHtml(formatResultDate(item))}</time>
            <span class="result-time">${escapeHtml(item.time || item.timeText || "")}</span>
          </td>
          <td>
            <span class="result-competition">
              <strong>${escapeHtml(competitionKo)}</strong>
              ${item.competition && item.competition !== competitionKo ? `<small>${escapeHtml(item.competition)}</small>` : ""}
            </span>
            <span class="result-round">${escapeHtml(item.matchday || "-")}</span>
          </td>
          <td>
            <div class="result-opponent">
              ${
                logoUrl
                  ? `<img class="result-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(opponentNameKo)} 로고" loading="eager" decoding="async" />`
                  : `<span class="result-logo placeholder" aria-hidden="true">TH</span>`
              }
              <span>
                ${
                  opponentUrl
                    ? `<a href="${escapeHtml(opponentUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(opponentNameKo)}</a>`
                    : `<strong>${escapeHtml(opponentNameKo)}</strong>`
                }
                ${opponentNameEn && opponentNameEn !== opponentNameKo ? `<small>${escapeHtml(opponentNameEn)}</small>` : ""}
              </span>
            </div>
          </td>
          <td><span class="result-venue">${escapeHtml(item.venueLabel || "-")}</span></td>
          <td><strong class="result-score">${escapeHtml(item.result || "-")}</strong></td>
          <td><span class="result-badge ${escapeHtml(item.outcome || "played")}">${escapeHtml(item.outcomeLabel || "-")}</span></td>
          <td>${reportUrl ? `<a class="result-link" href="${escapeHtml(reportUrl)}" target="_blank" rel="noopener noreferrer">리포트</a>` : "-"}</td>
        </tr>
      `;
    })
    .join("");

  if (resultElements.empty) resultElements.empty.hidden = Boolean(items.length);
}

async function refreshResults() {
  if (!resultElements.table) return;
  const requestId = ++resultState.requestId;
  const endpoint = `/api/results?season=${encodeURIComponent(resultState.season)}`;
  const cached = readCachedPayload(endpoint);
  if (cached && !resultState.items.length) {
    resultState.payload = cached;
    resultState.items = cached.items || [];
    if (resultElements.status) resultElements.status.textContent = resultStatusText(cached);
    renderResultStats(cached);
    renderResultFilters();
    renderResults();
  } else if (resultElements.status) {
    resultElements.status.textContent = "경기 결과 확인 중";
    resultState.items = [];
    renderResultFilters();
    renderResults();
  }

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("results unavailable");
    const payload = await response.json();
    if (requestId !== resultState.requestId) return;
    resultState.payload = payload;
    resultState.items = payload.items || [];
    writeCachedPayload(endpoint, payload);
    if (resultElements.status) resultElements.status.textContent = resultStatusText(payload);
    renderResultStats(payload);
    renderResultFilters();
    renderResults();
    warmOtherCaches(endpoint);
  } catch {
    if (resultElements.status) {
      resultElements.status.textContent = resultState.items.length ? resultStatusText(resultState.payload) : "경기 결과 연결 실패";
    }
    renderResultFilters();
    renderResults();
  }
}

function renderTicker(items = articles) {
  const tickerTrack = document.querySelector("#tickerTrack");
  if (!tickerTrack) return;
  tickerTrack.innerHTML = items
    .map(
      (article) =>
        safeHttpUrl(article.url)
          ? `<a class="ticker-chip" href="${escapeHtml(safeHttpUrl(article.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(
              cleanDisplayText(article.title),
            )}</a>`
          : "",
    )
    .join("");
}

async function refreshTicker() {
  const tickerTrack = document.querySelector("#tickerTrack");
  if (!tickerTrack) return;

  try {
    const response = await fetch("/api/korean-feed", { cache: "no-store" });
    if (!response.ok) throw new Error("ticker unavailable");
    const payload = await response.json();
    writeCachedPayload("/api/korean-feed", payload);
    const items = (payload.items || [])
      .filter((item) => item.title && item.url)
      .slice(0, 12)
      .map((item) => ({ title: item.title, url: item.url }));
    if (items.length) renderTicker(items);
    warmOtherCaches("/api/korean-feed");
  } catch {
    renderTicker();
  }
}

Object.entries(feeds).forEach(([name, config]) => {
  config.refresh?.addEventListener("click", () => refreshFeed(name));
  config.prev?.addEventListener("click", () => {
    if (feedState[name].page <= 1) return;
    feedState[name].page -= 1;
    renderFeed(name);
  });
  config.next?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(feedState[name].items.length / 6));
    if (feedState[name].page >= totalPages) return;
    feedState[name].page += 1;
    renderFeed(name);
  });
});

squadElements.refresh?.addEventListener("click", refreshSquad);
squadElements.search?.addEventListener("input", (event) => {
  squadState.query = event.target.value || "";
  renderSquad();
});
squadElements.filters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-squad-filter]");
  if (!button) return;
  squadState.filter = button.dataset.squadFilter || "ALL";
  squadElements.filters.querySelectorAll("[data-squad-filter]").forEach((filter) => {
    filter.classList.toggle("is-active", filter === button);
  });
  renderSquad();
});

injuryElements.refresh?.addEventListener("click", refreshInjuries);
injuryElements.search?.addEventListener("input", (event) => {
  injuryState.query = event.target.value || "";
  renderInjuries();
});
injuryElements.filters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-injury-filter]");
  if (!button) return;
  injuryState.filter = button.dataset.injuryFilter || "ALL";
  injuryElements.filters.querySelectorAll("[data-injury-filter]").forEach((filter) => {
    filter.classList.toggle("is-active", filter === button);
  });
  renderInjuries();
});
injuryElements.seasons?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-injury-season]");
  if (!button) return;
  injuryState.season = button.dataset.injurySeason || "2025";
  injuryState.items = [];
  injuryState.payload = null;
  injuryElements.seasons.querySelectorAll("[data-injury-season]").forEach((seasonButton) => {
    seasonButton.classList.toggle("is-active", seasonButton === button);
  });
  refreshInjuries();
});

resultElements.refresh?.addEventListener("click", refreshResults);
resultElements.search?.addEventListener("input", (event) => {
  resultState.query = event.target.value || "";
  renderResults();
});
resultElements.filters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-result-filter]");
  if (!button) return;
  resultState.filter = button.dataset.resultFilter || "ALL";
  resultElements.filters.querySelectorAll("[data-result-filter]").forEach((filter) => {
    filter.classList.toggle("is-active", filter === button);
  });
  renderResults();
});
resultElements.seasons?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-result-season]");
  if (!button) return;
  resultState.season = button.dataset.resultSeason || "2025";
  resultState.filter = "ALL";
  resultState.items = [];
  resultState.payload = null;
  resultElements.seasons.querySelectorAll("[data-result-season]").forEach((seasonButton) => {
    seasonButton.classList.toggle("is-active", seasonButton === button);
  });
  refreshResults();
});

document.querySelectorAll(".top-nav a").forEach((link) => {
  const page = new URL(link.href, window.location.href).pathname.split("/").pop();
  const endpoint = navEndpointByPage[page];
  if (!endpoint) return;
  link.addEventListener("mouseenter", () => warmEndpoint(endpoint));
  link.addEventListener("focus", () => warmEndpoint(endpoint));
});

let summaryResizeTimer = null;
window.addEventListener("resize", () => {
  window.clearTimeout(summaryResizeTimer);
  summaryResizeTimer = window.setTimeout(() => {
    document.querySelectorAll(".live-grid").forEach((grid) => fitCardSummaries(grid));
  }, 120);
});

markActiveNav();
renderTicker();
refreshTicker();
refreshFeed("korean");
refreshFeed("english");
refreshFeed("transfer");
refreshSquad();
refreshPlayerDetail();
refreshInjuries();
refreshResults();
window.setInterval(() => {
  refreshFeed("korean");
  refreshFeed("english");
  refreshFeed("transfer");
  refreshResults();
}, 60_000);
