# cublicma.github.io
OKEX
ETH
0xd379defaf69171fac69375a2dbcc8b9b4c221bf2

BTC
3Qki5RfFx1ebAihh6yviJVhLZ6arNvoE9W

https://docs.google.com/presentation/d/1zeMkyIMkLSSlYqOCJVvAFg_YmuKJT-Io2SUHxjxjtn8/edit?usp=sharing

## Paper Tracker

Static page:

- https://cublicma.github.io/paper-tracker/

Main files:

- `paper-tracker/config.json`: edit keywords, sources, inclusion rules, exclusion rules, and ranking preferences.
- `.github/workflows/daily-paper-refresh.yml`: scheduled GitHub Actions workflow.
- `.github/codex/prompts/paper-tracker.md`: Codex research/update prompt.
- `paper-tracker/data/latest.json`: latest result consumed by the web page.
- `paper-tracker/data/reports.json`: report index consumed by the web page.
- `paper-tracker/data/seen-items.json`: duplicate tracking state.
- `paper-tracker/reports/`: generated Markdown reports.

GitHub repository setup:

- Add a repository secret named `OPENAI_API_KEY`.
- Enable GitHub Actions if GitHub asks.
- Use the Actions tab to run `Daily Paper Refresh` manually, or wait for the daily schedule.
