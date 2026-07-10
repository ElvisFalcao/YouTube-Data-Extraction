# Shalina Campaign Metrics

A private, browser-only dashboard for turning YouTube Studio and Google Ads CSV exports into a clean campaign summary.

## Use it

Open `index.html` in any modern browser, then:

1. Enter the brand and market.
2. Upload one or more CSV exports.
3. Select **Process files**.
4. Copy the table or download the cleaned CSV.

## Metric rules

- **YouTube Studio:** reach = Unique viewers; engagement = Likes + Comments + Shares.
- **Google Ads:** reach = estimated as Impressions ÷ 2; engagement = Clicks.
- Google Ads files with extra introductory rows are recognized automatically.

No files are uploaded or stored: all parsing happens locally in the browser.
