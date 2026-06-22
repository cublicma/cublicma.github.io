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
main();
