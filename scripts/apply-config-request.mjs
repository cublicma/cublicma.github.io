import { readFileSync, writeFileSync } from "node:fs";

const allowedOwner = "cublicma";
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const issue = event.issue || {};

if (issue.user?.login !== allowedOwner) {
  throw new Error(`Only ${allowedOwner} may submit tracker configuration changes.`);
}

if (!String(issue.title || "").startsWith("[Paper Tracker Config]")) {
  throw new Error("Issue title is not a Paper Tracker configuration request.");
}

const match = String(issue.body || "").match(
  /<!-- paper-tracker-config:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- paper-tracker-config:end -->/
);

if (!match) {
  throw new Error("Configuration payload markers were not found.");
}

const requested = JSON.parse(match[1]);
const current = JSON.parse(readFileSync("paper-tracker/config.json", "utf8"));

function stringList(name, value, { min = 0, max = 50 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new Error(`${name} must contain between ${min} and ${max} entries.`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string") throw new Error(`${name}[${index}] must be text.`);
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 300) {
      throw new Error(`${name}[${index}] must contain 1 to 300 characters.`);
    }
    return trimmed;
  });
}

function integer(name, value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

const next = {
  ...current,
  keywords: stringList("keywords", requested.keywords, { min: 1, max: 50 }),
  sources: stringList("sources", requested.sources, { min: 1, max: 20 }),
  include_criteria: stringList("include_criteria", requested.include_criteria, { max: 30 }),
  exclude_criteria: stringList("exclude_criteria", requested.exclude_criteria, { max: 30 }),
  ranking_preferences: stringList("ranking_preferences", requested.ranking_preferences, { max: 30 }),
  lookback_days_if_state_missing: integer(
    "lookback_days_if_state_missing",
    requested.lookback_days_if_state_missing,
    1,
    365
  ),
  max_items_per_run: integer("max_items_per_run", requested.max_items_per_run, 1, 50)
};

writeFileSync("paper-tracker/config.json", `${JSON.stringify(next, null, 2)}\n`);
