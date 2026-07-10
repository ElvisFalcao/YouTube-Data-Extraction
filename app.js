const input = document.querySelector('#fileInput');
const dropzone = document.querySelector('#dropzone');
const processButton = document.querySelector('#processButton');
const uploadStatus = document.querySelector('#uploadStatus');
const emptyState = document.querySelector('#emptyState');
const results = document.querySelector('.results');
let files = [];
let outputRows = [];
let currentSource = '';

const number = value => { const n = Number(String(value ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const fmt = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0);
const money = value => value ? `$${value.toFixed(2)}` : '—';
const lookup = (row, names) => { const key = Object.keys(row).find(k => names.some(name => k.trim().toLowerCase() === name)); return key ? row[key] : ''; };
function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) { const c = text[i], next = text[i + 1]; if (c === '"' && quoted && next === '"') { field += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === ',' && !quoted) { row.push(field); field = ''; } else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && next === '\n') i++; row.push(field); if (row.some(v => v.trim())) rows.push(row); row = []; field = ''; } else field += c; }
  if (field || row.length) { row.push(field); rows.push(row); } return rows;
}
function objectsFromCSV(text) {
  const all = parseCSV(text); let headerIndex = all.findIndex(row => row.some(v => /views|video|campaign|impressions/i.test(v)));
  if (headerIndex < 0) return []; const headers = all[headerIndex].map(v => v.trim());
  return all.slice(headerIndex + 1).filter(row => row.some(v => v.trim())).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])));
}
function detect(rows) { const keys = Object.keys(rows[0] || {}).join(' ').toLowerCase(); return /unique viewers|likes|comments added|shares/.test(keys) ? 'YouTube Studio' : 'Google Ads'; }
async function handleFiles(list) { files = [...list].filter(f => f.name.toLowerCase().endsWith('.csv')); uploadStatus.textContent = files.length ? `${files.length} file${files.length > 1 ? 's' : ''} ready to process` : 'No CSV files selected'; processButton.disabled = !files.length; }
input.addEventListener('change', e => handleFiles(e.target.files));
['dragenter','dragover'].forEach(event => dropzone.addEventListener(event, e => {e.preventDefault(); dropzone.classList.add('drag');}));
['dragleave','drop'].forEach(event => dropzone.addEventListener(event, e => {e.preventDefault(); dropzone.classList.remove('drag');}));
dropzone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
processButton.addEventListener('click', async () => {
  const combined = [];
  for (const file of files) combined.push(...objectsFromCSV(await file.text()));
  if (!combined.length) { uploadStatus.textContent = 'We could not find a usable table in those files.'; return; }
  currentSource = detect(combined); outputRows = combined.map((r, index) => mapRow(r, index)); render();
});
function mapRow(r, index) {
  const sourceYouTube = currentSource === 'YouTube Studio';
  const video = lookup(r, ['video','video title','ad','ad name','campaign','campaign name']) || `Video ${index + 1}`;
  const views = number(lookup(r, ['views','video views']));
  const impressions = number(lookup(r, ['impressions']));
  const engagement = sourceYouTube ? number(lookup(r,['likes'])) + number(lookup(r,['comments added','comments'])) + number(lookup(r,['shares'])) : number(lookup(r,['clicks']));
  const reach = sourceYouTube ? number(lookup(r,['unique viewers'])) : Math.round(impressions / 2);
  const spend = number(lookup(r,['cost','spend','cost (usd)','amount spent']));
  return { video, reach, views, engagement, impressions, spend };
}
function totals(rows) { return rows.reduce((a, r) => ({ reach:a.reach+r.reach, views:a.views+r.views, engagement:a.engagement+r.engagement, impressions:a.impressions+r.impressions, spend:a.spend+r.spend }), {reach:0,views:0,engagement:0,impressions:0,spend:0}); }
function render() {
  const total = totals(outputRows), brand = document.querySelector('#brandInput').value.trim(), market = document.querySelector('#marketInput').value.trim();
  document.querySelector('#resultMeta').textContent = [brand, market, currentSource].filter(Boolean).join(' · ') || currentSource;
  document.querySelector('#resultTitle').textContent = brand ? `${brand} performance` : 'Campaign performance'; document.querySelector('#sourceBadge').textContent = currentSource;
  document.querySelector('#stats').innerHTML = [['Reach',fmt(total.reach)],['Views',fmt(total.views)],['Engagement',fmt(total.engagement)],['Spend',money(total.spend)]].map(([k,v]) => `<article class="stat"><p>${k}</p><strong>${v}</strong></article>`).join('');
  const cells = row => `<td>${row.video}</td><td>${fmt(row.reach)}</td><td>${fmt(row.views)}</td><td>${fmt(row.engagement)}</td><td>${fmt(row.impressions)}</td><td>${money(row.spend)}</td>`;
  document.querySelector('#metricsBody').innerHTML = outputRows.map(row => `<tr>${cells(row)}</tr>`).join('') + `<tr class="total">${cells({video:'TOTAL',...total})}</tr>`;
  const rate = total.impressions ? ((total.views / total.impressions) * 100).toFixed(1) : null;
  document.querySelector('#insight').innerHTML = `<strong>Quick read:</strong> ${total.views ? `${fmt(total.views)} views across ${outputRows.length} item${outputRows.length === 1 ? '' : 's'}.` : 'Your export did not include view values.'}${rate ? ` The observed view rate is ${rate}%.` : ''}${currentSource === 'Google Ads' ? ' Reach is estimated at half of impressions.' : ' Reach is based on unique viewers.'}`;
  emptyState.classList.add('hidden'); results.classList.remove('hidden'); results.scrollIntoView({behavior:'smooth', block:'start'});
}
document.querySelector('#downloadButton').addEventListener('click', () => { const rows = [...outputRows, {video:'TOTAL',...totals(outputRows)}]; const text = ['Video,Reach,Views,Engagement,Impressions,Spend', ...rows.map(r => `"${String(r.video).replaceAll('"','""')}",${r.reach},${r.views},${r.engagement},${r.impressions},${r.spend.toFixed(2)}`)].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text],{type:'text/csv'})); a.download = 'campaign-summary.csv'; a.click(); URL.revokeObjectURL(a.href); });
document.querySelector('#copyButton').addEventListener('click', async e => { const rows = [...outputRows, {video:'TOTAL',...totals(outputRows)}]; await navigator.clipboard.writeText(['Video\tReach\tViews\tEngagement\tImpressions\tSpend', ...rows.map(r => `${r.video}\t${r.reach}\t${r.views}\t${r.engagement}\t${r.impressions}\t${r.spend.toFixed(2)}`)].join('\n')); e.target.textContent = 'Copied'; setTimeout(() => e.target.textContent = 'Copy table', 1300); });
document.querySelector('#resetButton').addEventListener('click', () => { files=[]; input.value=''; processButton.disabled=true; uploadStatus.textContent='No files selected'; results.classList.add('hidden'); emptyState.classList.remove('hidden'); });
