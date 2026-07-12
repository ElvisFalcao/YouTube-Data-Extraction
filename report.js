(() => {
  const fileInput = document.querySelector('#reportFiles');
  const dropzone = document.querySelector('#reportDropzone');
  const status = document.querySelector('#reportStatus');
  const generateButton = document.querySelector('#generateReportButton');
  const output = document.querySelector('#reportOutput');
  const saveButton = document.querySelector('#saveReportButton');
  const savedList = document.querySelector('#savedReportList');
  const clearSavedButton = document.querySelector('#clearSavedReportsButton');
  const savedReportsKey = 'shalina-campaign-saved-reports-v1';
  let reportFiles = [];
  let reportRows = [];
  let currentSavedId = null;

  const number = value => { const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(parsed) ? parsed : 0; };
  const money = value => `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const count = value => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const rate = value => `${(Number(value || 0) * 100).toFixed(1)}%`;
  const safeDivide = (top, bottom) => bottom ? top / bottom : 0;
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const field = (row, aliases) => {
    const entries = Object.entries(row);
    const match = entries.find(([key]) => aliases.some(alias => normalize(key) === normalize(alias))) || entries.find(([key]) => aliases.some(alias => normalize(key).includes(normalize(alias))));
    return match ? match[1] : '';
  };
  const parseCSV = text => {
    const rows = []; let row = [], fieldValue = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) { const char = text[i], next = text[i + 1]; if (char === '"' && inQuotes && next === '"') { fieldValue += '"'; i++; } else if (char === '"') inQuotes = !inQuotes; else if (char === ',' && !inQuotes) { row.push(fieldValue); fieldValue = ''; } else if ((char === '\n' || char === '\r') && !inQuotes) { if (char === '\r' && next === '\n') i++; row.push(fieldValue); if (row.some(v => v.trim())) rows.push(row); row = []; fieldValue = ''; } else fieldValue += char; }
    if (fieldValue || row.length) { row.push(fieldValue); rows.push(row); }
    return rows;
  };
  const readRows = text => {
    const csv = parseCSV(text); const headerRow = csv.findIndex(row => row.some(value => /impressions|views|ad name|campaign|video/i.test(value)));
    if (headerRow < 0) return [];
    const headers = csv[headerRow].map(value => value.trim());
    return csv.slice(headerRow + 1).filter(row => row.some(value => value.trim())).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
  };
  const platformCode = (fileName, row) => {
    const title = `${fileName} ${field(row, ['platform', 'publisher platform', 'placement'])}`.toUpperCase();
    if (/\bBE\b|BACKEND/.test(title)) return 'BE';
    if (/\bFB\b|FACEBOOK/.test(title)) return 'FB';
    if (/\bIG\b|INSTAGRAM/.test(title)) return 'IG';
    if (/\bTK\b|\bTT\b|TIKTOK/.test(title)) return 'TK';
    if (/\bYT\b|YOUTUBE|GOOGLE ADS|GOOGLEADS/.test(title)) return 'YT';
    const keys = Object.keys(row).join(' ');
    if (/unique viewers|unique reach|likes|comments added/i.test(keys)) return 'YT';
    if (/thruplays|video plays|post engagements/i.test(keys)) return 'Meta';
    if (/clicks|view rate/i.test(keys)) return 'YT';
    return 'Other';
  };
  const sourceName = code => ({ FB: 'Facebook', IG: 'Instagram', TK: 'TikTok', YT: 'YouTube / Google Ads', BE: 'Backend post', Meta: 'Meta' }[code] || 'Other');
  const creativeName = name => {
    const clean = String(name || '').replace(/\s+/g, ' ').trim();
    const parts = clean.split(/\s[-–]\s/).map(value => value.trim()).filter(Boolean);
    let result = parts.length > 1 ? parts[parts.length - 1] : clean;
    result = result.replace(/\b(FB|IG|TK|TT|YT|BE|META)\b/gi, '').replace(/^pt\d+\s*/i, '').replace(/\s+/g, ' ').trim();
    return result || clean || 'Unlabelled creative';
  };
  const mapRow = (row, fileName, index) => {
    const code = platformCode(fileName, row);
    const adSetName = field(row, ['ad set name', 'adset name', 'ad set', 'adset']);
    const campaignName = field(row, ['campaign name', 'campaign']);
    const adName = adSetName || campaignName || field(row, ['ad name', 'ad', 'video title', 'video']) || `${fileName.replace(/\.csv$/i, '')} ${index + 1}`;
    const impressions = number(field(row, ['impressions']));
    const spend = number(field(row, ['amount spent (usd)', 'spend', 'cost', 'amount spent']));
    const likes = number(field(row, ['likes'])), comments = number(field(row, ['comments added', 'comments'])), shares = number(field(row, ['post shares', 'shares']));
    const engagement = number(field(row, ['post engagements', 'post engagement', 'engagements', 'clicks'])) || (likes + comments + shares);
    const views = number(field(row, ['video views', 'views', 'video plays']));
    const thruplays = number(field(row, ['thruplays', 'thru plays']));
    const videoPlays = number(field(row, ['video plays']));
    const uniqueViewers = number(field(row, ['unique viewers']));
    const uniqueReach = number(field(row, ['unique reach']));
    return { adName, platform: code, spend, impressions, cpm: safeDivide(spend, impressions) * 1000, engagement, engagementRate: safeDivide(engagement, impressions), views, thruplays, videoPlays, uniqueViewers, uniqueReach, shares, source: sourceName(code), creative: creativeName(adName), viewRate: safeDivide(views, impressions) };
  };
  const summarize = (rows, key) => [...rows.reduce((map, row) => {
    const label = row[key]; const total = map.get(label) || { label, spend: 0, impressions: 0, engagement: 0, views: 0, thruplays: 0, videoPlays: 0, uniqueViewers: 0, uniqueReach: 0, shares: 0 };
    ['spend', 'impressions', 'engagement', 'views', 'thruplays', 'videoPlays', 'uniqueViewers', 'uniqueReach', 'shares'].forEach(metric => total[metric] += row[metric] || 0);
    map.set(label, total); return map;
  }, new Map()).values()].map(total => ({ ...total, cpm: safeDivide(total.spend, total.impressions) * 1000, engagementRate: safeDivide(total.engagement, total.impressions), viewRate: safeDivide(total.views, total.impressions) }));
  const setFiles = list => { reportFiles = [...list].filter(file => file.name.toLowerCase().endsWith('.csv')); status.textContent = reportFiles.length ? `${reportFiles.length} export${reportFiles.length === 1 ? '' : 's'} ready to combine` : 'No platform exports selected'; generateButton.disabled = !reportFiles.length; };
  fileInput.addEventListener('change', event => setFiles(event.target.files));
  ['dragenter', 'dragover'].forEach(event => dropzone.addEventListener(event, e => { e.preventDefault(); dropzone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(event => dropzone.addEventListener(event, e => { e.preventDefault(); dropzone.classList.remove('drag'); }));
  dropzone.addEventListener('drop', event => setFiles(event.dataTransfer.files));
  generateButton.addEventListener('click', async () => {
    reportRows = [];
    for (const file of reportFiles) reportRows.push(...readRows(await file.text()).map((row, index) => mapRow(row, file.name, index)));
    reportRows = reportRows.filter(row => !/^total(s)?$/i.test(row.adName.trim()));
    if (!reportRows.length) { status.textContent = 'No reportable rows were found. Check that the files are CSV exports.'; return; }
    status.textContent = `${count(reportRows.length)} ad-level rows combined from ${count(reportFiles.length)} exports`;
    currentSavedId = null; renderReport(); saveCurrentReport(true); output.classList.remove('hidden'); output.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const renderReport = () => {
    const platformTotals = summarize(reportRows, 'platform'); const creativeTotals = summarize(reportRows, 'creative'); const budget = number(document.querySelector('#reportBudget').value); const spend = reportRows.reduce((total, row) => total + row.spend, 0); const pct = budget ? Math.min(spend / budget, 1) : 0;
    const market = document.querySelector('#reportMarket').value.trim(); const name = document.querySelector('#reportName').value.trim() || 'Campaign performance report';
    document.querySelector('#reportOutputMeta').textContent = [market, 'Multi-platform report'].filter(Boolean).join(' · '); document.querySelector('#reportOutputTitle').textContent = name;
    document.querySelector('#platformTotalsBody').innerHTML = platformTotals.map(row => `<tr><td>${row.label}</td><td>${money(row.spend)}</td><td>${count(row.impressions)}</td><td>${money(row.cpm)}</td><td>${count(row.engagement)}</td><td>${rate(row.engagementRate)}</td><td>${count(row.views)}</td><td>${rate(row.viewRate)}</td></tr>`).join('') + totalRow(platformTotals);
    document.querySelector('#creativeSummaryBody').innerHTML = creativeTotals.map(row => `<tr><td>${row.label}</td><td>${money(row.spend)}</td><td>${count(row.impressions)}</td><td>${money(row.cpm)}</td><td>${count(row.engagement)}</td><td>${rate(row.engagementRate)}</td><td>${count(row.views)}</td><td>${count(row.thruplays)}</td><td>${count(row.videoPlays)}</td><td>${row.uniqueViewers ? count(row.uniqueViewers) : '—'}</td><td>${row.uniqueReach ? count(row.uniqueReach) : '—'}</td><td>${rate(row.viewRate)}</td><td>${count(row.shares)}</td></tr>`).join('') + totalRow(creativeTotals, true);
    document.querySelector('#budgetProgress').textContent = budget ? rate(spend / budget) : 'No budget set'; document.querySelector('#budgetBar').style.width = `${pct * 100}%`; document.querySelector('#budgetTotal').textContent = budget ? money(budget) : '—'; document.querySelector('#budgetSpend').textContent = money(spend); document.querySelector('#budgetPending').textContent = budget ? money(Math.max(budget - spend, 0)) : '—';
  };
  const totalRow = (rows, detailed = false) => { const total = summarize(rows.map(row => ({ ...row, label: 'Total' })), 'label')[0]; return detailed ? `<tr class="total"><td>TOTAL</td><td>${money(total.spend)}</td><td>${count(total.impressions)}</td><td>${money(total.cpm)}</td><td>${count(total.engagement)}</td><td>${rate(total.engagementRate)}</td><td>${count(total.views)}</td><td>${count(total.thruplays)}</td><td>${count(total.videoPlays)}</td><td>${count(total.uniqueViewers)}</td><td>${count(total.uniqueReach)}</td><td>${rate(total.viewRate)}</td><td>${count(total.shares)}</td></tr>` : `<tr class="total"><td>TOTAL</td><td>${money(total.spend)}</td><td>${count(total.impressions)}</td><td>${money(total.cpm)}</td><td>${count(total.engagement)}</td><td>${rate(total.engagementRate)}</td><td>${count(total.views)}</td><td>${rate(total.viewRate)}</td></tr>`; };
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const getSavedReports = () => { try { return JSON.parse(localStorage.getItem(savedReportsKey) || '[]'); } catch { return []; } };
  const storeSavedReports = reports => localStorage.setItem(savedReportsKey, JSON.stringify(reports));
  const renderSavedReports = () => {
    const reports = getSavedReports(); clearSavedButton.classList.toggle('hidden', !reports.length);
    savedList.innerHTML = reports.length ? reports.map(report => `<article class="saved-item"><div><strong>${escapeHTML(report.name || 'Campaign performance report')}</strong><span>${escapeHTML(report.market || 'No market')} · ${new Date(report.savedAt).toLocaleString()} · ${count(report.rows.length)} rows</span></div><div class="saved-item-actions"><button class="secondary" type="button" data-load-report="${report.id}">Load</button><button class="secondary" type="button" data-delete-report="${report.id}">Delete</button></div></article>`).join('') : '<p>Reports you save will appear here. Saved reports stay only in this browser.</p>';
  };
  const saveCurrentReport = silent => {
    if (!reportRows.length) return;
    const reports = getSavedReports(); const saved = { id: currentSavedId || `report_${Date.now()}`, savedAt: new Date().toISOString(), market: document.querySelector('#reportMarket').value.trim(), name: document.querySelector('#reportName').value.trim() || 'Campaign performance report', budget: document.querySelector('#reportBudget').value, rows: reportRows };
    const existing = reports.findIndex(report => report.id === saved.id); if (existing >= 0) reports[existing] = saved; else reports.unshift(saved); currentSavedId = saved.id;
    try { storeSavedReports(reports); renderSavedReports(); saveButton.textContent = 'Saved locally'; if (!silent) status.textContent = 'Report saved locally in this browser.'; setTimeout(() => { if (saveButton.textContent === 'Saved locally') saveButton.textContent = 'Save report'; }, 1400); } catch { status.textContent = 'This browser could not save the report. Download the Excel file to keep a copy.'; }
  };
  saveButton.addEventListener('click', () => saveCurrentReport(false));
  savedList.addEventListener('click', event => {
    const loadId = event.target.dataset.loadReport, deleteId = event.target.dataset.deleteReport; const reports = getSavedReports();
    if (loadId) { const saved = reports.find(report => report.id === loadId); if (!saved) return; reportRows = saved.rows; currentSavedId = saved.id; reportFiles = []; fileInput.value = ''; document.querySelector('#reportMarket').value = saved.market || ''; document.querySelector('#reportName').value = saved.name || ''; document.querySelector('#reportBudget').value = saved.budget || ''; generateButton.disabled = true; status.textContent = `Loaded ${saved.name || 'saved report'} from this browser.`; renderReport(); output.classList.remove('hidden'); output.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (deleteId) { storeSavedReports(reports.filter(report => report.id !== deleteId)); if (currentSavedId === deleteId) currentSavedId = null; renderSavedReports(); }
  });
  clearSavedButton.addEventListener('click', () => { if (window.confirm('Clear every saved report from this browser?')) { localStorage.removeItem(savedReportsKey); currentSavedId = null; renderSavedReports(); } });
  document.addEventListener('workspace:reset', () => { reportFiles = []; reportRows = []; currentSavedId = null; fileInput.value = ''; document.querySelector('#reportMarket').value = ''; document.querySelector('#reportName').value = ''; document.querySelector('#reportBudget').value = ''; generateButton.disabled = true; status.textContent = 'No platform exports selected'; output.classList.add('hidden'); });
  renderSavedReports();
  const cell = (sheet, ref, formula, value) => sheet[ref] = { t: 'n', f: formula, v: value };
  const style = (sheet, range, color = 'D9EAF7') => { const start = XLSX.utils.decode_range(range); for (let row = start.s.r; row <= start.e.r; row++) for (let col = start.s.c; col <= start.e.c; col++) { const ref = XLSX.utils.encode_cell({ r: row, c: col }); if (sheet[ref]) sheet[ref].s = { fill: { fgColor: { rgb: color } }, font: { bold: true }, border: { top: { style: 'thin', color: { rgb: '5B6B75' } }, bottom: { style: 'thin', color: { rgb: '5B6B75' } }, left: { style: 'thin', color: { rgb: '5B6B75' } }, right: { style: 'thin', color: { rgb: '5B6B75' } } } }; } };
  document.querySelector('#downloadReportButton').addEventListener('click', () => {
    if (!reportRows.length || typeof XLSX === 'undefined') { status.textContent = 'Excel export library has not loaded. Please check your internet connection and try again.'; return; }
    const platformTotals = summarize(reportRows, 'platform'); const creativeTotals = summarize(reportRows, 'creative'); const budget = number(document.querySelector('#reportBudget').value); const market = document.querySelector('#reportMarket').value.trim() || 'Market'; const reportName = document.querySelector('#reportName').value.trim() || `${market} campaign report`;
    const dataHeaders = ['Ad name', 'Platform', 'Spends $', 'Impressions', 'CPM $', 'Post engagements', 'Eng. Rate', 'Views', 'ThruPlays', 'Video plays', 'Unique viewers (Reach)', 'Unique reach', 'Post shares', 'Source', 'Creative', 'View rate'];
    const rawValues = reportRows.map(row => [row.adName, row.platform, row.spend, row.impressions, row.cpm, row.engagement, row.engagementRate, row.views, row.thruplays, row.videoPlays, row.uniqueViewers, row.uniqueReach, row.shares, row.source, row.creative, row.viewRate]);
    const raw = XLSX.utils.aoa_to_sheet([dataHeaders, ...rawValues]);
    reportRows.forEach((row, index) => { const n = index + 2; cell(raw, `E${n}`, `IFERROR(C${n}/D${n}*1000,0)`, row.cpm); cell(raw, `G${n}`, `IFERROR(F${n}/D${n},0)`, row.engagementRate); cell(raw, `P${n}`, `IFERROR(H${n}/D${n},0)`, row.viewRate); });
    raw['!cols'] = [34, 10, 12, 14, 10, 16, 11, 14, 13, 14, 22, 15, 13, 21, 23, 12].map(wch => ({ wch })); style(raw, `A1:P1`);
    const report = XLSX.utils.aoa_to_sheet([['Report', reportName], ['Market', market], [], dataHeaders, ...rawValues]);
    reportRows.forEach((row, index) => { const n = index + 5; cell(report, `E${n}`, `IFERROR(C${n}/D${n}*1000,0)`, row.cpm); cell(report, `G${n}`, `IFERROR(F${n}/D${n},0)`, row.engagementRate); cell(report, `P${n}`, `IFERROR(H${n}/D${n},0)`, row.viewRate); });
    const platformStart = 4; XLSX.utils.sheet_add_aoa(report, [['Platforms', 'Spends $', 'Impressions', 'CPM $', 'Post engagements', 'Eng. Rate', 'Views', 'ThruPlays', 'Video plays', 'Unique viewers', 'Unique reach', 'View rate']], { origin: 'R4' });
    platformTotals.forEach((row, index) => { const n = index + 5; const sourceRow = n; XLSX.utils.sheet_add_aoa(report, [[row.label, row.spend, row.impressions, row.cpm, row.engagement, row.engagementRate, row.views, row.thruplays, row.videoPlays, row.uniqueViewers, row.uniqueReach, row.viewRate]], { origin: `R${n}` }); cell(report, `S${n}`, `SUMIF('Raw Data'!$B$2:$B$${reportRows.length + 1},R${n},'Raw Data'!$C$2:$C$${reportRows.length + 1})`, row.spend); cell(report, `T${n}`, `SUMIF('Raw Data'!$B$2:$B$${reportRows.length + 1},R${n},'Raw Data'!$D$2:$D$${reportRows.length + 1})`, row.impressions); cell(report, `U${n}`, `IFERROR(S${n}/T${n}*1000,0)`, row.cpm); cell(report, `V${n}`, `SUMIF('Raw Data'!$B$2:$B$${reportRows.length + 1},R${n},'Raw Data'!$F$2:$F$${reportRows.length + 1})`, row.engagement); cell(report, `W${n}`, `IFERROR(V${n}/T${n},0)`, row.engagementRate); cell(report, `X${n}`, `SUMIF('Raw Data'!$B$2:$B$${reportRows.length + 1},R${n},'Raw Data'!$H$2:$H$${reportRows.length + 1})`, row.views); cell(report, `AA${n}`, `IFERROR(X${n}/T${n},0)`, row.viewRate); });
    const summaryRow = reportRows.length + 8; XLSX.utils.sheet_add_aoa(report, [['Summary'], ['Creative', 'Spends $', 'Impressions', 'CPM $', 'Post engagements', 'Eng. Rate', 'Views', 'ThruPlays', 'Video plays', 'Unique viewers', 'Unique reach', 'View rate', 'Shares']], { origin: `A${summaryRow}` });
    creativeTotals.forEach((row, index) => { const n = summaryRow + 2 + index; XLSX.utils.sheet_add_aoa(report, [[row.label, row.spend, row.impressions, row.cpm, row.engagement, row.engagementRate, row.views, row.thruplays, row.videoPlays, row.uniqueViewers, row.uniqueReach, row.viewRate, row.shares]], { origin: `A${n}` }); cell(report, `B${n}`, `SUMIF('Raw Data'!$O$2:$O$${reportRows.length + 1},A${n},'Raw Data'!$C$2:$C$${reportRows.length + 1})`, row.spend); cell(report, `C${n}`, `SUMIF('Raw Data'!$O$2:$O$${reportRows.length + 1},A${n},'Raw Data'!$D$2:$D$${reportRows.length + 1})`, row.impressions); cell(report, `D${n}`, `IFERROR(B${n}/C${n}*1000,0)`, row.cpm); cell(report, `E${n}`, `SUMIF('Raw Data'!$O$2:$O$${reportRows.length + 1},A${n},'Raw Data'!$F$2:$F$${reportRows.length + 1})`, row.engagement); cell(report, `F${n}`, `IFERROR(E${n}/C${n},0)`, row.engagementRate); cell(report, `G${n}`, `SUMIF('Raw Data'!$O$2:$O$${reportRows.length + 1},A${n},'Raw Data'!$H$2:$H$${reportRows.length + 1})`, row.views); cell(report, `L${n}`, `IFERROR(G${n}/C${n},0)`, row.viewRate); });
    const budgetRow = summaryRow + creativeTotals.length + 4; const totalSpend = reportRows.reduce((sum, row) => sum + row.spend, 0); XLSX.utils.sheet_add_aoa(report, [['Total Budget', budget], ['Spends', totalSpend, budget ? safeDivide(totalSpend, budget) : 0], ['Pending', Math.max(budget - totalSpend, 0)]], { origin: `A${budgetRow}` }); cell(report, `B${budgetRow + 1}`, `SUM(B${summaryRow + 2}:B${summaryRow + creativeTotals.length + 1})`, totalSpend); cell(report, `C${budgetRow + 1}`, `IFERROR(B${budgetRow + 1}/B${budgetRow},0)`, budget ? safeDivide(totalSpend, budget) : 0); cell(report, `B${budgetRow + 2}`, `B${budgetRow}-B${budgetRow + 1}`, Math.max(budget - totalSpend, 0));
    report['!cols'] = [34, 12, 13, 15, 10, 17, 11, 14, 13, 14, 22, 15, 13, 20, 23, 12, 3, 15, 13, 15, 10, 17, 11, 14, 13, 14, 15, 12].map(wch => ({ wch })); style(report, 'A4:P4'); style(report, `R4:AC4`); style(report, `A${summaryRow + 1}:M${summaryRow + 1}`); style(report, `A${summaryRow}:M${summaryRow}`, 'D9EAF7');
    for (let r = 5; r <= reportRows.length + 4; r++) ['C', 'E', 'F', 'H', 'I', 'J', 'K', 'L', 'M', 'P'].forEach(col => { if (report[`${col}${r}`]) report[`${col}${r}`].z = ['G', 'P'].includes(col) ? '0.0%' : '#,##0'; });
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, report, market.slice(0, 31) || 'Market Report'); XLSX.utils.book_append_sheet(book, raw, 'Raw Data'); XLSX.writeFile(book, `${reportName.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '') || 'campaign-report'}.xlsx`);
  });
})();
