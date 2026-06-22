const paths = {
  config: "./config.json",
  latest: "./data/latest.json",
  reports: "./data/reports.json"
};

const text = {
  unavailable: "暂无数据",
  loadFailed: "数据读取失败。请稍后刷新，或查看 GitHub Actions 运行记录。"
};

let currentConfig = null;
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

function formatDate(value) {
  if (!value) return text.unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function relativePath(path) {
  return path ? path.replace(/^paper-tracker\//, "") : "#";
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function configValue(value) {
  if (!Array.isArray(value)) return value || text.unavailable;
  if (value.length === 0) return text.unavailable;
  return `<ul class="config-values">${value.map(item => `<li>${item}</li>`).join("")}</ul>`;
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
    return "来源";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    "## Paper Tracker 配置修改",
    "",
    markerStart,
    "```json",
    JSON.stringify(config, null, 2),
    "```",
    markerEnd,
    "",
    "提交后，自动化会验证提交者并创建一个等待审核的 Pull Request。"
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
    ["主题", config.topic_name],
    ["关键词", config.keywords || []],
    ["来源", config.sources || []],
    ["最多条目", config.max_items_per_run],
    ["无状态回看", `${config.lookback_days_if_state_missing || 14} 天`]
  ];

  list.innerHTML = rows.map(([key, value]) => `
    <div>
      <dt>${key}</dt>
      <dd>${configValue(value)}</dd>
    </div>
  `).join("");
}

function analysisText(item) {
  if (item.analysis_zh) return item.analysis_zh;
  return `主要工作与相关性：${item.relevance || text.unavailable} 新颖性：${item.novelty_signal || text.unavailable} 完整的方法、实验、结果与限制分析将在下一次自动更新后生成。`;
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

function stopSpeech(status = "已停止") {
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
    pauseButton.setAttribute("aria-label", "暂停");
    pauseButton.title = "暂停";
  }
  if (stopButton) stopButton.disabled = true;
}

function speakNext() {
  if (speechIndex >= speechSegments.length) {
    stopSpeech("播放完成");
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
    setSpeechStatus(`正在播放 ${segment.itemIndex + 1}/${segment.itemCount}`);
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
    setSpeechStatus("浏览器不支持朗读");
    return;
  }

  playButton.addEventListener("click", () => {
    stopSpeech("准备播放");
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
      pauseButton.setAttribute("aria-label", "暂停");
      pauseButton.title = "暂停";
      setSpeechStatus("继续播放");
    } else {
      window.speechSynthesis.pause();
      speechPaused = true;
      pauseButton.textContent = "▶";
      pauseButton.setAttribute("aria-label", "继续");
      pauseButton.title = "继续";
      setSpeechStatus("已暂停");
    }
  });

  stopButton.addEventListener("click", () => stopSpeech());
  window.addEventListener("beforeunload", () => window.speechSynthesis.cancel());
}

function renderLatest(latest) {
  setText("run-time", formatDate(latest.run_utc));
  setText("item-count", `${(latest.items || []).length} 个条目`);
  setText("latest-summary", latest.summary || text.unavailable);
  setText("items-label", `${(latest.items || []).length} 个条目`);

  const link = document.getElementById("latest-report-link");
  if (link) {
    link.href = relativePath(latest.report_path);
  }

  const caveats = document.getElementById("caveats");
  if (caveats) {
    caveats.innerHTML = (latest.caveats || []).map(item => (
      `<div class="caveat">${item}</div>`
    )).join("");
  }

  const analysis = document.getElementById("daily-analysis");
  const playButton = document.getElementById("speech-play");
  const pauseButton = document.getElementById("speech-pause");
  const stopButton = document.getElementById("speech-stop");
  const latestItems = latest.items || [];

  speechSegments = latestItems.flatMap((item, index) => {
    const common = { itemIndex: index, itemCount: latestItems.length };
    return [
      { text: `第 ${index + 1} 篇。`, ...common },
      { text: item.title || "未命名文章", ...common },
      ...splitForSpeech(analysisText(item)).map(segment => ({ text: segment, ...common }))
    ];
  });

  if (analysis) {
    if (latestItems.length === 0) {
      analysis.innerHTML = `<p class="empty analysis-empty">今天还没有可供精读的文章。</p>`;
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
  setSpeechStatus(speechReady ? `${latestItems.length} 篇可播放` : "暂无可播放内容");

  const items = document.getElementById("items");
  if (!items) return;

  if (!latest.items || latest.items.length === 0) {
    items.innerHTML = `<p class="empty">本次没有发现符合条件的实质性新条目。</p>`;
    return;
  }

  items.innerHTML = latest.items.map(item => `
    <article class="item">
      <h3>${item.title || text.unavailable}</h3>
      <div class="meta">
        <span class="pill">${item.type || "item"}</span>
        <span class="pill">${item.first_public_date || "date unknown"}</span>
        <span class="pill">confidence ${item.confidence ?? "--"}</span>
      </div>
      <p><strong>作者/机构：</strong>${item.authors_or_org || text.unavailable}</p>
      <p><strong>相关性：</strong>${item.relevance || text.unavailable}</p>
      <p><strong>新颖信号：</strong>${item.novelty_signal || text.unavailable}</p>
      <div class="links">
        ${(item.links || []).map((url, index) => (
          `<a href="${url}" rel="noreferrer" target="_blank">${sourceLabel(url)}</a>`
        )).join("")}
      </div>
    </article>
  `).join("");
}

function renderReports(data) {
  const reports = data.reports || [];
  setText("reports-label", `${reports.length} 份报告`);

  const node = document.getElementById("reports");
  if (!node) return;

  if (reports.length === 0) {
    node.innerHTML = `<p class="empty">还没有历史报告。第一次 GitHub Actions 成功运行后会出现在这里。</p>`;
    return;
  }

  node.innerHTML = reports.map(report => `
    <article class="report-row">
      <time>${report.date || "--"}</time>
      <a href="${relativePath(report.path)}">${report.summary || "打开报告"}</a>
      <span>${report.item_count ?? 0} 条</span>
    </article>
  `).join("");
}

async function main() {
  try {
    const [config, latest, reports] = await Promise.all([
      readJson(paths.config),
      readJson(paths.latest),
      readJson(paths.reports)
    ]);
    currentConfig = config;
    renderConfig(config);
    renderLatest(latest);
    renderReports(reports);
  } catch (error) {
    console.error(error);
    setText("run-time", "读取失败");
    setText("item-count", "--");
    setText("latest-summary", text.loadFailed);
    const items = document.getElementById("items");
    if (items) items.innerHTML = `<p class="empty">${text.loadFailed}</p>`;
  }
}

setupConfigEditor();
setupSpeechPlayer();
main();
