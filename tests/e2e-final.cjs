const { chromium } = require('playwright');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const DL = path.resolve('tests/downloads');
const SOFFICE = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';

(async () => {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({ acceptDownloads: true });
  const p = await c.newPage();
  await p.goto('http://localhost:5173/old/qrcode.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForSelector('#credInput');

  // Tab 1: 5 rows
  console.log('=== Tab 1: 5 rows ===');
  await p.fill('#credInput', 'admin/Passw0rd!2026/系統管理員\nops/Op$ecure#99/產線人員\nroot/R00t@2026!/主帳號\ntest/Test#1234/測試帳號\ndev/Dev@5678/開發人員');
  const [d1] = await Promise.all([
    p.waitForEvent('download'),
    p.click('#btnGenerate').then(() => p.waitForFunction(() => document.querySelectorAll('#qrGrid .qr-card').length === 5, { timeout: 10000 })).then(() => p.click('#btnDownloadXlsx')),
  ]);
  await d1.saveAs(path.join(DL, 'e2e_final_tab1.xlsx'));

  const zip1 = await JSZip.loadAsync(fs.readFileSync(path.join(DL, 'e2e_final_tab1.xlsx')));
  const media1 = Object.keys(zip1.files).filter(f => f.match(/^xl\/media\/image\d+\.png$/));
  const sheet1 = await zip1.file('xl/worksheets/sheet1.xml').async('string');
  const r2m = sheet1.match(/<row r="2">([\s\S]*?)<\/row>/);
  if (r2m) {
    const cells = r2m[1].match(/<c r="([^"]+)"[^>]*>[\s\S]*?<\/c>/g);
    cells.forEach(c => {
      const ref = c.match(/r="([^"]+)"/)[1];
      const t = c.match(/<t>([\s\S]*?)<\/t>/);
      console.log('  ' + ref + ': ' + JSON.stringify(t ? t[1] : '(empty)'));
    });
  }

  // LibreOffice check
  const pdf1 = path.join(DL, 'e2e_final_tab1.pdf');
  try { fs.unlinkSync(pdf1); } catch(e){}
  execSync('"' + SOFFICE + '" --headless --convert-to pdf --outdir "' + DL + '" "' + path.join(DL, 'e2e_final_tab1.xlsx') + '"', { timeout: 30000, stdio: 'pipe' });
  const result1 = execSync('python -c "import fitz,sys;d=fitz.open(sys.argv[1]);print(len(d[0].get_images()));d.close()" "' + pdf1 + '"', { encoding: 'utf-8', timeout: 10000 });
  console.log('  Images in PDF: ' + result1.trim() + ' expect=10');

  // Tab 2: upload sample.xlsx
  console.log('\n=== Tab 2: sample.xlsx ===');
  await p.evaluate(() => document.querySelector('[data-tab="1"]').click());
  await p.waitForTimeout(500);
  const buf = fs.readFileSync(path.resolve('tests', 'sample.xlsx'));
  await p.locator('#xlsxFile').setInputFiles({ name: 'sample.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf });
  await p.waitForFunction(() => document.querySelectorAll('#xlsxTable tr').length >= 3, { timeout: 15000 });
  const [d2] = await Promise.all([
    p.waitForEvent('download'),
    p.click('#btnXlsxDownloadXlsx'),
  ]);
  await d2.saveAs(path.join(DL, 'e2e_final_tab2.xlsx'));

  const zip2 = await JSZip.loadAsync(fs.readFileSync(path.join(DL, 'e2e_final_tab2.xlsx')));
  const media2 = Object.keys(zip2.files).filter(f => f.match(/^xl\/media\/image\d+\.png$/));
  console.log('  Tab2 images: ' + media2.length + ' expect=' + (media2.length >= 6 ? 'OK' : 'FAIL'));

  await b.close();
  console.log('\nDONE');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
