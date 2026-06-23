const isEnglish = document.documentElement.lang.startsWith("en");
const basePath = isEnglish ? "../" : "./";
const params = new URLSearchParams(window.location.search);
const selectedDate = params.get("date");

const paths = {
  config: `${basePath}config.json`,
  latest: `${basePath}data/latest.json`,
  reports: `${basePath}data/reports.json`,
  daily: date => `${basePath}data/daily/${date}.json`
};

const copy = {
  zh: {
    unavailable: "暂无数据",
    loadFailed: "数据读取失败。请稍后刷新，或查看 GitHub Actions 运行记录。",
    brand: "Paper Tracker",
    editConfig: "编辑配置",
    manualRun: "手动运行",
    sourceReports: "报告源码",
    lastRun: "最近运行",
    briefingTitle: "今日摘要与精读",
    openMarkdown: "打开 Markdown",
    speechPlayer: "语音朗读",
    playAll: "播放全部",
    voice: "语音",
    voiceAuto: "中英自动",
    voiceChinese: "中文",
    speed: "语速",
    configTitle: "搜索配置",
    modify: "修改",
    discoveriesTitle: "本次发现",
    reportsTitle: "历史报告",
    configDialogTitle: "编辑搜索配置",
    keywords: "关键词",
    onePerLine: "每行一个关键词",
    sources: "搜索来源",
    sourcePerLine: "每行一个来源",
    lookbackDays: "回看天数",
    maxItems: "每次最多条目",
    advancedScope: "高级范围",
    includeCriteria: "收录条件",
    excludeCriteria: "排除条件",
    rankingPreference: "排序偏好",
    ownerOnly: "仅接受 cublicma 提交的请求",
    cancel: "取消",
    submitForReview: "提交审批",
    loading: "读取中",
    waiting: "等待数据",
    item: count => `${count} 个条目`,
    report: count => `${count} 份报告`,
    viewDate: date => `正在查看 ${date}`,
    latestView: "正在查看最新结果",
    noAnalysis: "今天还没有可供精读的文章。",
    noItems: "本次没有发现符合条件的实质性新条目。",
    noReports: "还没有历史报告。第一次 GitHub Actions 成功运行后会出现在这里。",
    unnamed: "未命名文章",
    itemIntro: index => `第 ${index + 1} 篇。`,
    pause: "暂停",
    resume: "继续",
    stop: "停止",
    stopped: "已停止",
    complete: "播放完成",
    preparing: "准备播放",
    unsupportedSpeech: "浏览器不支持朗读",
    playing: (current, total) => `正在播放 ${current}/${total}`,
    playable: count => `${count} 篇可播放`,
    noPlayable: "暂无可播放内容",
    topic: "主题",
    maxItemsRow: "最多条目",
    lookbackRow: "无状态回看",
    days: value => `${value} 天`,
    authors: "作者/机构：",
    relevance: "相关性：",
    novelty: "新颖信号：",
    confidence: value => `confidence ${value}`,
    dateUnknown: "date unknown",
    openReport: "打开报告",
    markdown: "Markdown"
  },
  en: {
    unavailable: "No data yet",
    loadFailed: "The tracker data could not be loaded. Refresh later or check the GitHub Actions run.",
    brand: "Paper Tracker",
    editConfig: "Edit Config",
    manualRun: "Run Now",
    sourceReports: "Report Source",
    lastRun: "Last Run",
    briefingTitle: "Briefing and Analysis",
    openMarkdown: "Open Markdown",
    speechPlayer: "Text to speech",
    playAll: "Play All",
    voice: "Voice",
    voiceAuto: "Auto",
    voiceChinese: "Chinese",
    speed: "Speed",
    configTitle: "Search Configuration",
    modify: "Edit",
    discoveriesTitle: "Findings",
    reportsTitle: "Daily Archive",
    configDialogTitle: "Edit Search Configuration",
    keywords: "Keywords",
    onePerLine: "One keyword per line",
    sources: "Sources",
    sourcePerLine: "One source per line",
    lookbackDays: "Lookback Days",
    maxItems: "Max Items per Run",
    advancedScope: "Advanced Scope",
    includeCriteria: "Include Criteria",
    excludeCriteria: "Exclude Criteria",
    rankingPreference: "Ranking Preference",
    ownerOnly: "Only cublicma can submit requests",
    cancel: "Cancel",
    submitForReview: "Submit for Review",
    loading: "Loading",
    waiting: "Waiting for data",
    item: count => `${count} item${count === 1 ? "" : "s"}`,
    report: count => `${count} report${count === 1 ? "" : "s"}`,
    viewDate: date => `Viewing ${date}`,
    latestView: "Viewing latest results",
    noAnalysis: "There are no articles ready for deep reading today.",
    noItems: "No substantial new items matched this run.",
    noReports: "No archived reports yet. They will appear after the first successful GitHub Actions run.",
    unnamed: "Untitled item",
    itemIntro: index => `Paper ${index + 1}.`,
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    stopped: "Stopped",
    complete: "Playback complete",
    preparing: "Preparing playback",
    unsupportedSpeech: "Text to speech is not supported in this browser",
    playing: (current, total) => `Playing ${current}/${total}`,
    playable: count => `${count} paper${count === 1 ? "" : "s"} ready`,
    noPlayable: "No playable content",
    topic: "Topic",
    maxItemsRow: "Max Items",
    lookbackRow: "Stateless Lookback",
    days: value => `${value} days`,
    authors: "Authors / Organization: ",
    relevance: "Relevance: ",
    novelty: "Novelty signal: ",
    confidence: value => `confidence ${value}`,
    dateUnknown: "date unknown",
    openReport: "Open report",
    markdown: "Markdown"
  }
};

const text = isEnglish ? copy.en : copy.zh;

let currentConfig = null;
let latestData = null;
let reportsData = null;
let speechSegments = [];
let speechIndex = 0;
let speechPaused = false;

async function readJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path}: ${response.status}`);
  }
  return response.json();
}

function applyLanguageCopy() {
  document.querySelectorAll("[data-i18n]").forEach(node => {
    const value = text[node.dataset.i18n];
    if (typeof value === "string") node.textContent = value;
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach(node => {
    const value = text[node.dataset.i18nAriaLabel];
    if (typeof value === "string") node.setAttribute("aria-label", value);
  });

  const switcher = document.querySelector("[data-language-switch]");
  if (switcher) {
    const query = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : "";
    switcher.href = isEnglish ? `../${query}` : `en/${query}`;
    switcher.textContent = isEnglish ? "中文" : "English";
  }

  const pauseButton = document.getElementById("speech-pause");
  const stopButton = document.getElementById("speech-stop");
  if (pauseButton) {
    pauseButton.setAttribute("aria-label", text.pause);
    pauseButton.title = text.pause;
  }
  if (stopButton) {
    stopButton.setAttribute("aria-label", text.stop);
    stopButton.title = text.stop;
  }
}

function formatDate(value) {
  if (!value) return text.unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(isEnglish ? "en-US" : "zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function relativePath(path) {
  return path ? `${basePath}${path.replace(/^paper-tracker\//, "")}` : "#";
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function configValue(value) {
  if (!Array.isArray(value)) return escapeHtml(value || text.unavailable);
  if (value.length === 0) return text.unavailable;
  return `<ul class="config-values">${value.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function sourceLabel(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname === "arxiv.org") return "arXiv";
    if (hostname === "github.com") return "GitHub";
    if (hostname === "huggingface.co") return "Hugging Face";
    if (hostname === "doi.org") return "DOI";
    return hostname;
  } catch {
    return isEnglish ? "Source" : "来源";
  }
}

function lines(value) {
  return (value || [])
    .map(item => String(item).trim())
    .filter(Boolean);
}

function textareaLines(id) {
  const node = document.getElementById(id);
  return lines(node ? node.value.split("\n") : []);
}

function setInputValue(id, value) {
  const node = document.getElementById(id);
  if (node) node.value = value ?? "";
}

function populateConfigForm(config) {
  setInputValue("config-keywords", (config.keywords || []).join("\n"));
  setInputValue("config-sources", (config.sources || []).join("\n"));
  setInputValue("config-lookback", config.lookback_days_if_state_missing || 14);
  setInputValue("config-max-items", config.max_items_per_run || 12);
  setInputValue("config-include", (config.include_criteria || []).join("\n"));
  setInputValue("config-exclude", (config.exclude_criteria || []).join("\n"));
  setInputValue("config-ranking", (config.ranking_preferences || []).join("\n"));
}

function requestedConfig() {
  return {
    ...currentConfig,
    keywords: textareaLines("config-keywords"),
    sources: textareaLines("config-sources"),
    include_criteria: textareaLines("config-include"),
    exclude_criteria: textareaLines("config-exclude"),
    ranking_preferences: textareaLines("config-ranking"),
    lookback_days_if_state_missing: Number(document.getElementById("config-lookback").value),
    max_items_per_run: Number(document.getElementById("config-max-items").value)
  };
}

function openConfigRequest(config) {
  const markerStart = "<!-- paper-tracker-config:start -->";
  const markerEnd = "<!-- paper-tracker-config:end -->";
  const body = [
    isEnglish ? "## Paper Tracker configuration change" : "## Paper Tracker 配置修改",
    "",
    markerStart,
    "```json",
    JSON.stringify(config, null, 2),
    "```",
    markerEnd,
    "",
    isEnglish
      ? "After submission, automation validates the requester and opens a Pull Request for review."
      : "提交后，自动化会验证提交者并创建一个等待审核的 Pull Request。"
  ].join("\n");
  const issueUrl = new URL("https://github.com/cublicma/cublicma.github.io/issues/new");
  issueUrl.searchParams.set("title", `[Paper Tracker Config] ${new Date().toISOString().slice(0, 10)}`);
  issueUrl.searchParams.set("body", body);
  window.open(issueUrl.toString(), "_blank", "noopener,noreferrer");
}

function setupConfigEditor() {
  const dialog = document.getElementById("config-editor");
  const form = document.getElementById("config-form");
  if (!dialog || !form) return;

  document.querySelectorAll("[data-open-config]").forEach(button => {
    button.addEventListener("click", () => {
      if (!currentConfig) return;
      populateConfigForm(currentConfig);
      dialog.showModal();
    });
  });

  document.querySelectorAll("[data-close-config]").forEach(button => {
    button.addEventListener("click", () => dialog.close());
  });

  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const config = requestedConfig();
    if (config.keywords.length === 0 || config.sources.length === 0) return;
    openConfigRequest(config);
    dialog.close();
  });
}

function renderConfig(config) {
  const list = document.getElementById("config-list");
  if (!list) return;

  const rows = [
    [text.topic, config.topic_name],
    [text.keywords, config.keywords || []],
    [text.sources, config.sources || []],
    [text.maxItemsRow, config.max_items_per_run],
    [text.lookbackRow, text.days(config.lookback_days_if_state_missing || 14)]
  ];

  list.innerHTML = rows.map(([key, value]) => `
    <div>
      <dt>${escapeHtml(key)}</dt>
      <dd>${configValue(value)}</dd>
    </div>
  `).join("");
}

function localizedSummary(data) {
  if (isEnglish) {
    return data.summary_en || (data.summary ? "English summary is not available for this archived run." : text.unavailable);
  }
  return data.summary || text.unavailable;
}

function localizedCaveat(value) {
  if (typeof value === "object" && value !== null) {
    return isEnglish ? value.en || value.zh || text.unavailable : value.zh || value.en || text.unavailable;
  }
  return isEnglish ? "A run caveat was recorded in Chinese for this older entry." : value;
}

function analysisText(item) {
  if (isEnglish) {
    return item.analysis_en
      || "English analysis is not available for this archived item. Future runs will generate native English analysis alongside the Chinese briefing.";
  }
  if (item.analysis_zh) return item.analysis_zh;
  return `主要工作与相关性：${item.relevance || text.unavailable} 新颖性：${item.novelty_signal || text.unavailable} 完整的方法、实验、结果与限制分析将在下一次自动更新后生成。`;
}

function localizedField(item, zhKey, enKey) {
  if (isEnglish) return item[enKey] || item[zhKey] || text.unavailable;
  return item[zhKey] || item[enKey] || text.unavailable;
}

function languageFor(value, selectedLanguage) {
  if (selectedLanguage !== "auto") return selectedLanguage;
  const chineseCharacters = (value.match(/[\u3400-\u9fff]/g) || []).length;
  const latinWords = (value.match(/[A-Za-z][A-Za-z0-9.-]*/g) || []).length;
  return chineseCharacters >= latinWords * 2 ? "zh-CN" : "en-US";
}

function splitForSpeech(value, maxLength = 180) {
  const sentences = String(value || "").match(/[^。！？.!?]+[。！？.!?]?/g) || [];
  const chunks = [];
  let current = "";

  sentences.forEach(sentence => {
    const next = `${current}${sentence}`.trim();
    if (current && next.length > maxLength) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = next;
    }
  });

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function preferredVoice(language) {
  const voices = window.speechSynthesis.getVoices();
  const prefix = language.toLowerCase().split("-")[0];
  return voices.find(voice => voice.lang.toLowerCase() === language.toLowerCase())
    || voices.find(voice => voice.lang.toLowerCase().startsWith(prefix))
    || null;
}

function setSpeechStatus(value) {
  setText("speech-status", value);
}

function highlightSpeakingItem(itemIndex) {
  document.querySelectorAll(".analysis-entry").forEach((node, index) => {
    node.classList.toggle("is-speaking", index === itemIndex);
  });
}

function stopSpeech(status = text.stopped) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  speechIndex = 0;
  speechPaused = false;
  highlightSpeakingItem(-1);
  setSpeechStatus(status);
  const pauseButton = document.getElementById("speech-pause");
  const stopButton = document.getElementById("speech-stop");
  if (pauseButton) {
    pauseButton.disabled = true;
    pauseButton.textContent = "Ⅱ";
    pauseButton.setAttribute("aria-label", text.pause);
    pauseButton.title = text.pause;
  }
  if (stopButton) stopButton.disabled = true;
}

function speakNext() {
  if (speechIndex >= speechSegments.length) {
    stopSpeech(text.complete);
    return;
  }

  const segment = speechSegments[speechIndex];
  const languageSelect = document.getElementById("speech-language");
  const rateSelect = document.getElementById("speech-rate");
  const language = languageFor(segment.text, languageSelect?.value || "auto");
  const utterance = new SpeechSynthesisUtterance(segment.text);
  utterance.lang = language;
  utterance.rate = Number(rateSelect?.value || 1);
  utterance.voice = preferredVoice(language);
  utterance.onstart = () => {
    highlightSpeakingItem(segment.itemIndex);
    setSpeechStatus(text.playing(segment.itemIndex + 1, segment.itemCount));
  };
  utterance.onend = () => {
    speechIndex += 1;
    speakNext();
  };
  utterance.onerror = event => {
    if (event.error === "canceled" || event.error === "interrupted") return;
    speechIndex += 1;
    speakNext();
  };
  window.speechSynthesis.speak(utterance);
}

function setupSpeechPlayer() {
  const playButton = document.getElementById("speech-play");
  const pauseButton = document.getElementById("speech-pause");
  const stopButton = document.getElementById("speech-stop");
  if (!playButton || !pauseButton || !stopButton) return;

  if (!("speechSynthesis" in window)) {
    setSpeechStatus(text.unsupportedSpeech);
    return;
  }

  playButton.addEventListener("click", () => {
    stopSpeech(text.preparing);
    speechIndex = 0;
    pauseButton.disabled = false;
    stopButton.disabled = false;
    speakNext();
  });

  pauseButton.addEventListener("click", () => {
    if (speechPaused) {
      window.speechSynthesis.resume();
      speechPaused = false;
      pauseButton.textContent = "Ⅱ";
      pauseButton.setAttribute("aria-label", text.pause);
      pauseButton.title = text.pause;
      setSpeechStatus(text.resume);
    } else {
      window.speechSynthesis.pause();
      speechPaused = true;
      pauseButton.textContent = "▶";
      pauseButton.setAttribute("aria-label", text.resume);
      pauseButton.title = text.resume;
      setSpeechStatus(text.pause);
    }
  });

  stopButton.addEventListener("click", () => stopSpeech());
  window.addEventListener("beforeunload", () => window.speechSynthesis.cancel());
}

function renderLatest(data, { isArchive = false } = {}) {
  const itemCount = (data.items || []).length;
  setText("run-time", formatDate(data.run_utc));
  setText("item-count", text.item(itemCount));
  setText("latest-summary", localizedSummary(data));
  setText("items-label", text.item(itemCount));
  setText("view-date", isArchive && selectedDate ? text.viewDate(selectedDate) : text.latestView);

  const link = document.getElementById("latest-report-link");
  if (link) {
    link.href = relativePath(data.report_path);
  }

  const caveats = document.getElementById("caveats");
  if (caveats) {
    caveats.innerHTML = (data.caveats || []).map(item => (
      `<div class="caveat">${escapeHtml(localizedCaveat(item))}</div>`
    )).join("");
  }

  const analysis = document.getElementById("daily-analysis");
  const playButton = document.getElementById("speech-play");
  const pauseButton = document.getElementById("speech-pause");
  const stopButton = document.getElementById("speech-stop");
  const latestItems = data.items || [];

  speechSegments = latestItems.flatMap((item, index) => {
    const common = { itemIndex: index, itemCount: latestItems.length };
    return [
      { text: text.itemIntro(index), ...common },
      { text: item.title || text.unnamed, ...common },
      ...splitForSpeech(analysisText(item)).map(segment => ({ text: segment, ...common }))
    ];
  });

  if (analysis) {
    if (latestItems.length === 0) {
      analysis.innerHTML = `<p class="empty analysis-empty">${text.noAnalysis}</p>`;
    } else {
      analysis.innerHTML = latestItems.map((item, index) => `
        <article class="analysis-entry">
          <span class="analysis-index">${index + 1}</span>
          <div>
            <h3>${escapeHtml(item.title || text.unavailable)}</h3>
            <p>${escapeHtml(analysisText(item))}</p>
          </div>
        </article>
      `).join("");
    }
  }

  const speechReady = speechSegments.length > 0 && "speechSynthesis" in window;
  if (playButton) playButton.disabled = !speechReady;
  if (pauseButton) pauseButton.disabled = true;
  if (stopButton) stopButton.disabled = true;
  setSpeechStatus(speechReady ? text.playable(latestItems.length) : text.noPlayable);

  const items = document.getElementById("items");
  if (!items) return;

  if (!data.items || data.items.length === 0) {
    items.innerHTML = `<p class="empty">${text.noItems}</p>`;
    return;
  }

  items.innerHTML = data.items.map(item => `
    <article class="item">
      <h3>${escapeHtml(item.title || text.unavailable)}</h3>
      <div class="meta">
        <span class="pill">${escapeHtml(item.type || "item")}</span>
        <span class="pill">${escapeHtml(item.first_public_date || text.dateUnknown)}</span>
        <span class="pill">${escapeHtml(text.confidence(item.confidence ?? "--"))}</span>
      </div>
      <p><strong>${text.authors}</strong>${escapeHtml(item.authors_or_org || text.unavailable)}</p>
      <p><strong>${text.relevance}</strong>${escapeHtml(localizedField(item, "relevance", "relevance_en"))}</p>
      <p><strong>${text.novelty}</strong>${escapeHtml(localizedField(item, "novelty_signal", "novelty_signal_en"))}</p>
      <div class="links">
        ${(item.links || []).map(url => (
          `<a href="${escapeHtml(url)}" rel="noreferrer" target="_blank">${escapeHtml(sourceLabel(url))}</a>`
        )).join("")}
      </div>
    </article>
  `).join("");
}

function reportUrl(report) {
  const date = encodeURIComponent(report.date || "");
  const prefix = isEnglish ? "./" : "./";
  return date ? `${prefix}?date=${date}` : relativePath(report.path);
}

function renderReports(data) {
  const reports = data.reports || [];
  setText("reports-label", text.report(reports.length));

  const node = document.getElementById("reports");
  if (!node) return;

  if (reports.length === 0) {
    node.innerHTML = `<p class="empty">${text.noReports}</p>`;
    return;
  }

  node.innerHTML = reports.map(report => {
    const summary = isEnglish
      ? report.summary_en || "Open this day's briefing"
      : report.summary || text.openReport;
    return `
      <article class="report-row">
        <time>${escapeHtml(report.date || "--")}</time>
        <a href="${reportUrl(report)}">${escapeHtml(summary)}</a>
        <span>${text.item(report.item_count ?? 0)}</span>
      </article>
    `;
  }).join("");
}

async function loadSelectedDaily() {
  if (!selectedDate) return { data: latestData, isArchive: false };
  try {
    return { data: await readJson(paths.daily(selectedDate)), isArchive: true };
  } catch {
    const match = (reportsData.reports || []).find(report => report.date === selectedDate);
    if (match && latestData?.report_path === match.path) return { data: latestData, isArchive: true };
    return {
      data: {
        run_utc: null,
        report_path: match?.path || null,
        summary: isEnglish ? "" : "这个日期的网页数据还没有生成，可以打开 Markdown 查看旧报告。",
        summary_en: isEnglish ? "Structured page data is not available for this older date. Open the Markdown report instead." : "",
        items: [],
        caveats: []
      },
      isArchive: true
    };
  }
}

async function main() {
  applyLanguageCopy();

  try {
    const [config, latest, reports] = await Promise.all([
      readJson(paths.config),
      readJson(paths.latest),
      readJson(paths.reports)
    ]);
    currentConfig = config;
    latestData = latest;
    reportsData = reports;
    const selected = await loadSelectedDaily();
    renderConfig(config);
    renderLatest(selected.data, { isArchive: selected.isArchive });
    renderReports(reports);
  } catch (error) {
    console.error(error);
    setText("run-time", text.loadFailed);
    setText("item-count", "--");
    setText("latest-summary", text.loadFailed);
    const items = document.getElementById("items");
    if (items) items.innerHTML = `<p class="empty">${text.loadFailed}</p>`;
  }
}

setupConfigEditor();
setupSpeechPlayer();
main();
