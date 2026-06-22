Run the paper tracker update for this GitHub Pages repository.

Repository contract:
- Read `paper-tracker/config.json` first. Treat it as the user-editable search configuration.
- Read `paper-tracker/data/seen-items.json` if it exists.
- Read `paper-tracker/data/latest.json` and `paper-tracker/data/reports.json` if they exist.
- Write user-facing report content in Chinese.
- Keep all JSON files valid, pretty-printed, and UTF-8.

Search goal:
Find genuinely new work published or announced since the last successful run that matches the configured topic, keywords, sources, inclusion criteria, and exclusion criteria in `paper-tracker/config.json`.

Default interpretation of the current config:
- The core topic is dexterous robotic hands, dexterous manipulation, multi-finger robotic hands, anthropomorphic robot hands, hand teleoperation, tactile sensing for robot hands, dexterous grasping, and in-hand manipulation.
- Be strict about relevance. Only include work where dexterous robot hands or dexterous manipulation are a central contribution.
- Exclude generic parallel-gripper grasping, generic robot manipulation without dexterous hands, human-hand tracking without robot-hand relevance, reposts, and duplicate announcements.

What to search:
- arXiv
- conference and journal websites
- labs, university pages, and company research blogs
- GitHub repositories and project pages
- Hugging Face pages if directly relevant
- Any extra sources listed in `paper-tracker/config.json`

Duplicate and novelty rules:
- Include only items that are new since the previous run.
- Do not repeat old items unless there is a major update such as code release, project page release, benchmark/data release, substantial new paper version, notable acceptance, or meaningful announcement.
- If multiple links refer to the same work, merge them into one item and prefer the original source.
- Use stable IDs when possible: DOI, arXiv ID, GitHub repository URL, project URL, or normalized title plus first public date.

For each item, capture:
1. title
2. date first publicly available
3. authors or organization
4. item type
5. why it is relevant
6. novelty signal
7. original source links
8. confidence score from 0 to 1
9. one substantial Chinese analysis paragraph covering: the main contribution, the problem being solved, the method, experiments, results, overall conclusion, and limitations

Analysis quality rules:
- Read the primary paper abstract and, when available, the paper, project page, or official repository before writing the analysis.
- Write `analysis_zh` as one self-contained Chinese paragraph of roughly 250 to 500 Chinese characters.
- Explicitly cover all seven aspects: `主要工作`, `解决问题`, `方法`, `实验`, `结果`, `总结`, and `限制`.
- Report quantitative results only when the source provides them. Never invent metrics, baselines, hardware setups, datasets, or conclusions.
- If the available source does not disclose an experimental detail or limitation, say that the public information is insufficient instead of guessing.
- Keep English model, benchmark, dataset, and system names in their original form when that improves accuracy and text-to-speech clarity.

Files to update:
- Create `paper-tracker/reports/YYYY-MM-DD.md` using the current UTC date.
- Update `paper-tracker/data/latest.json`.
- Update `paper-tracker/data/reports.json`.
- Update `paper-tracker/data/seen-items.json`.

Markdown report format:
- Start with a short executive summary in Chinese.
- Then list all items ranked by importance. Include the full `analysis_zh` paragraph for every item.
- If nothing substantial is found, say so clearly.
- Include a final section named `检索记录` with run date, search scope, and caveats.

`paper-tracker/data/latest.json` schema:
{
  "run_utc": "ISO-8601 timestamp",
  "report_path": "paper-tracker/reports/YYYY-MM-DD.md",
  "summary": "Chinese summary",
  "items": [
    {
      "id": "stable id",
      "title": "title",
      "first_public_date": "YYYY-MM-DD or best known date",
      "authors_or_org": "authors or organization",
      "type": "paper | code | project | dataset | benchmark | announcement | other",
      "relevance": "Chinese explanation",
      "novelty_signal": "Chinese explanation",
      "analysis_zh": "One detailed Chinese paragraph covering main contribution, problem, method, experiments, results, conclusion, and limitations",
      "links": ["https://..."],
      "confidence": 0.0
    }
  ],
  "caveats": ["Chinese caveat"]
}

`paper-tracker/data/reports.json` schema:
{
  "reports": [
    {
      "date": "YYYY-MM-DD",
      "path": "paper-tracker/reports/YYYY-MM-DD.md",
      "summary": "Chinese summary",
      "item_count": 0
    }
  ]
}

`paper-tracker/data/seen-items.json` schema:
[
  {
    "id": "stable id",
    "title": "title",
    "first_public_date": "YYYY-MM-DD or best known date",
    "type": "paper | code | project | dataset | benchmark | announcement | other",
    "primary_url": "https://...",
    "reported_in": "paper-tracker/reports/YYYY-MM-DD.md",
    "last_seen": "ISO-8601 timestamp"
  }
]

Do not change the GitHub Actions workflow unless it is necessary to keep this automation running.
Do not change `paper-tracker/config.json` unless the current file is invalid JSON and needs repair.
