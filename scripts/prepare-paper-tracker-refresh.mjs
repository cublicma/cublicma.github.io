import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const today = new Date().toISOString().slice(0, 10);
const reportPath = `paper-tracker/reports/${today}.md`;
const dailyPath = `paper-tracker/data/daily/${today}.json`;
const contextPath = ".github/codex/refresh-context.json";
const refreshToday = String(process.env.REFRESH_TODAY || "false").toLowerCase() === "true";

mkdirSync("paper-tracker/data/daily", { recursive: true });

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

if (refreshToday) {
  rmSync(reportPath, { force: true });
  rmSync(dailyPath, { force: true });

  const reports = readJson("paper-tracker/data/reports.json", { reports: [] });
  reports.reports = (reports.reports || []).filter(report => report.date !== today);
  writeJson("paper-tracker/data/reports.json", reports);

  const seen = readJson("paper-tracker/data/seen-items.json", []);
  const nextSeen = seen.filter(item => item.reported_in !== reportPath);
  writeJson("paper-tracker/data/seen-items.json", nextSeen);
}

writeJson(contextPath, {
  run_date_utc: today,
  refresh_today: refreshToday,
  report_path: reportPath,
  daily_json_path: dailyPath,
  instructions: refreshToday
    ? "Manual refresh requested. Recreate today's report from scratch, ignoring any same-day prior output and same-day seen entries. Keep normal duplicate suppression against earlier dates."
    : "Normal scheduled or manual run. Use the existing seen-items state for novelty filtering."
});
