# Shalina Campaign Metrics

A private, browser-only dashboard for turning YouTube Studio and Google Ads CSV exports into a clean campaign summary.

## Use it

Open `index.html` in any modern browser, then:

1. Enter the brand and market.
2. Upload one or more CSV exports.
3. Select **Process files**.
4. Copy the table or download the cleaned CSV.

## Multi-platform market report

Use **Report generator** to combine CSV exports from Facebook, Instagram, TikTok, YouTube Studio, and Google Ads into a formula-based Excel report. It creates the same four sections as the July report: ad-level detail, platform totals, creative summary, and budget tracker.

Upload exports into their matching YouTube, Meta, or TikTok line. The selected line controls the platform total; the Meta line uses Ad Set, Campaign, or Ad names to split rows into `FB` and `IG`.

For report and creative labels, the generator uses the original **Ad Set name** first, then **Campaign name**, and finally falls back to the ad or video name. TikTok's **Ad group name** is treated as its Ad Set. Platform labels in those names are kept visible.

The same CSV can be used in more than one platform line when it represents separately reported platform data, and each selected upload is included in the total budget spend.

## Metric rules

- **YouTube Studio:** reach = Unique viewers; engagement = Likes + Comments + Shares.
- **Google Ads:** reach = estimated as Impressions ÷ 2; engagement = Clicks.
- Google Ads files with extra introductory rows are recognized automatically.
- **Market report:** CPM = Spend ÷ Impressions × 1,000; Engagement Rate = Engagements ÷ Impressions; View Rate = Views ÷ Impressions.

No files are uploaded or stored: all parsing happens locally in the browser.
