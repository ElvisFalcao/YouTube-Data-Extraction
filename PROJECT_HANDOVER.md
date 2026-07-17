# Shalina Campaign Metrics — Project Handover

Last updated: 12 July 2026

## Purpose

This is a browser-based campaign reporting tool for Shalina Healthcare / Regency Flux. It turns advertising-platform CSV exports into clean campaign tables and downloadable Excel market reports.

The tool is designed to work without a backend: source files are read in the browser, and saved report data stays in that browser unless the user downloads the Excel output.

---

## User instructions and decisions

### Initial request

The original workflow document requested a repeatable process for extracting campaign performance from:

- YouTube Studio
- Google Ads

The desired core output per brand/video was a clean table with reach, views, engagement, impressions, and a total row.

### Metrics requested

The user then requested separate reporting for:

- **Unique viewers (Reach):** people who watched the video.
- **Unique reach:** people shown the video (available in relevant YouTube exports).

For standard Google Ads exports, unique reach is not available. The tool therefore uses an estimated reach of `Impressions ÷ 2` for Google Ads and leaves Unique Reach empty.

### Report-generator request

The user provided `Shaltoux July Report 2nd July (1).xlsx` and requested that it be studied in detail—formulas, calculations, tables, and layout—so the application could generate the same style of market report from:

- YouTube Studio data
- Google Ads data
- Meta / Facebook data
- Instagram data
- TikTok data
- Backend-post data

The user’s platform codes are:

| Code | Meaning |
|---|---|
| `FB` | Facebook |
| `IG` | Instagram |
| `TK` | TikTok |
| `YT` | YouTube Studio or Google Ads |
| `BE` | Backend post |

The user also requested a later GPT-powered learning/insights function that explains what worked and what did not work. This has intentionally been left for the next phase; the report generator was the priority.

### Storage decision

Supabase was considered, but the user chose not to link a Supabase project for now. Instead, completed reports are saved locally in the browser using browser storage.

### Naming decision

The user noted that ad naming was not being picked up reliably. The report generator now chooses report/creative labels in this order:

1. **Ad Set name**
2. **Campaign name**
3. **Ad name or video name**

---

## Reference workbook analysis

The supplied July workbook had market tabs for Nigeria, Ghana, Zambia, and Angola. Its consistent reporting pattern is:

1. **Ad-level detail table** — one row per creative/platform combination.
2. **Platform totals** — aggregation by platform, placed to the right of the detail table.
3. **Creative summary** — aggregation by creative.
4. **Budget tracker** — total budget, actual spend, spend percentage, and pending budget.

### Extracted calculation rules

| Metric | Formula |
|---|---|
| CPM | `Spend ÷ Impressions × 1,000` |
| Engagement Rate | `Post Engagements ÷ Impressions` |
| View Rate | `Views ÷ Impressions` |
| Total Spend | Sum of all detailed spend rows |
| Pending Budget | `Total Budget − Spend` |
| Spend Percentage | `Spend ÷ Total Budget` |

The reference workbook used formulas for the calculated columns and for roll-ups, rather than hardcoding summary totals. The generated Excel workbook follows the same approach, using formulas such as `SUMIF` for platform and creative summaries.

---

## Features implemented

### 1. Campaign summary workflow

The original dashboard supports uploading YouTube Studio and Google Ads CSV files. It:

- Recognizes the platform from the CSV headers.
- Maps views, engagement, impressions, and spend.
- Separates **Unique viewers (Reach)** from **Unique reach**.
- Calculates YouTube engagement as Likes + Comments + Shares.
- Uses Google Ads Clicks as the engagement proxy.
- Provides Copy Table and Download CSV actions.

### 2. Multi-platform report generator

The **Report generator** section accepts multiple CSV exports in one upload session and combines their rows into a single report.

It supports platform recognition from filename and export fields. For best results, source files should include the code in their filename, for example:

```text
FB Nigeria July.csv
IG Nigeria July.csv
TK Nigeria July.csv
YT Nigeria July.csv
BE Nigeria July.csv
```

The report-generator interface collects:

- Market
- Report name
- Total budget in USD
- One or more CSV exports

It produces a browser preview containing:

- Platform totals
- Creative summary
- Budget tracker

It can download a formula-based `.xlsx` workbook with:

- A market report sheet matching the reference layout.
- A `Raw Data` sheet containing the combined normalized detail rows.

### 3. Excel output columns

The generated raw/report output includes:

- Ad name / report label
- Platform code
- Spend
- Impressions
- CPM
- Post engagements
- Engagement rate
- Views
- ThruPlays
- Video plays
- Unique viewers (Reach)
- Unique reach
- Post shares
- Source
- Creative
- View rate

### 4. Saved reports

Generated reports are automatically saved to browser storage on the current computer/browser. The Saved reports area supports:

- Loading a prior saved report.
- Deleting one saved report.
- Clearing all saved reports.

Important limitations:

- Saved reports are only available in the same browser profile and on the same computer.
- They are not shared with colleagues automatically.
- Downloading the Excel report remains the durable/shareable copy.

### 5. Reset Workspace

The Reset Workspace action now clears all temporary workspace content:

- Campaign upload files and fields.
- Campaign summary preview.
- Report-generator upload files and fields.
- Report-generator preview.

It does **not** delete saved reports, since those are intentionally persistent. Use **Clear saved reports** in the Saved reports area to remove those.

---

## Files in the project

| File | Role |
|---|---|
| `index.html` | Main dashboard and report-generator user interface. |
| `styles.css` | Existing dashboard styling. |
| `app.js` | YouTube / Google Ads campaign summary parsing and workspace reset. |
| `report.js` | Multi-platform normalization, report calculations, browser saves, and Excel export. |
| `report.css` | Report-generator styling. |
| `saved-reports.css` | Saved reports list styling. |
| `README.md` | Short operating guide. |
| `PROJECT_HANDOVER.md` | This detailed implementation and decision record. |

---

## Git and GitHub status

The project is initialized as a Git repository connected to:

`https://github.com/ElvisFalcao/YouTube-Data-Extraction.git`

### Already committed locally

| Commit | Description |
|---|---|
| `5ecb2b0` | Build campaign metrics dashboard |
| `4fce6c2` | Add multi-platform report generator |

At the time this document was created, the reset/save improvements, Ad Set/Campaign naming logic, and this handover document are local changes that still need to be committed and pushed.

### Manual push steps

From PowerShell in the project folder:

```powershell
cd "C:\Users\denyf\Documents\YouTube Data Extraction"

git add README.md app.js index.html report.js saved-reports.css PROJECT_HANDOVER.md
git commit -m "Improve report naming and local saves"

gh auth logout -h github.com -u ElvisFalcao
gh auth login -h github.com

git push origin main
```

During `gh auth login`, choose GitHub.com, HTTPS, and browser login. Complete the browser approval before running the final push command.

---

## Next phase: report learnings

The next intended feature is a GPT-powered report-learning function. It should use the generated, normalized report data to answer questions such as:

- Which creative had the strongest view rate?
- Which platform delivered the most efficient CPM?
- Which creative generated the strongest engagement rate?
- Which placements had weak performance relative to spend?
- What should be repeated, refined, paused, or tested next?

The feature should produce evidence-based written learnings, clearly distinguish observed results from recommendations, and avoid assumptions where the platform export does not provide a metric.
