const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const axeCore = require('axe-core');
const { URL } = require('url');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const stream = require('stream');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(bodyParser.json({ limit: '20mb' }));

const highlightStyles = `
  .violation-highlight {
    outline: 4px solid #ff0000 !important;
    outline-offset: 2px !important;
    box-shadow: 0 0 12px 4px rgba(255,0,0,0.3) !important;
    background: none !important;
    position: relative !important;
    z-index: 9999 !important;
    transition: outline 0.2s, box-shadow 0.2s;
  }
  .violation-highlight-critical {
    outline-color: #dc2626 !important;
    box-shadow: 0 0 16px 4px rgba(220,38,38,0.4) !important;
    background: none !important;
  }
  .violation-highlight-serious {
    outline-color: #f59e0b !important;
    box-shadow: 0 0 16px 4px rgba(245,158,11,0.4) !important;
    background: none !important;
  }
  .violation-highlight-moderate {
    outline-color: #3498db !important;
    box-shadow: 0 0 16px 4px rgba(52,152,219,0.4) !important;
    background: none !important;
  }
  .violation-highlight-minor {
    outline-color: #64748b !important;
    box-shadow: 0 0 16px 4px rgba(100,116,139,0.4) !important;
    background: none !important;
  }
  .violation-icon {
    position: absolute;
    top: -12px;
    right: -12px;
    width: 24px;
    height: 24px;
    background: none !important;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: none !important;
    cursor: pointer;
    z-index: 10001;
    border: 2px solid #dc2626;
    user-select: none;
    color: #dc2626;
  }
  .violation-tooltip {
    position: absolute;
    top: 28px;
    left: 0;
    background: #222;
    color: #fff;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    white-space: pre-line;
    z-index: 10002;
    pointer-events: none;
    display: none;
    min-width: 120px;
    max-width: 240px;
  }
  .heatmap-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .heatmap-badge {
    position: absolute;
    pointer-events: auto;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none !important;
  }
  .badge-icon {
    background: none !important;
    color: #dc2626;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 13px;
    border: 2px solid #dc2626;
    box-shadow: none !important;
  }
  .heatmap-tooltip {
    position: absolute;
    top: 26px;
    left: 0;
    background: #222;
    color: #fff;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    white-space: pre-line;
    z-index: 100;
    min-width: 120px;
    max-width: 240px;
  }
`;

const GEMINI_API_KEY = 'AIzaSyDrp4FtAUzYyMjNc6TMiYuad0kiSPCbEGg';

app.post('/scan', async (req, res) => {
  console.log('Ricevuta richiesta di scansione per:', req.body.url);
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL mancante' });

  let browser;
  try {
    console.log('Avvio browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--remote-debugging-port=9222'
      ]
    });

    const page = await browser.newPage();
    await page.setBypassCSP(true);
    await page.setViewport({ width: 1920, height: 1080 });

    // Blocca solo media e tracking per non rovinare lo screenshot
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      const url = req.url();
      if (
        type === 'media' ||
        url.includes('googletagmanager') ||
        url.includes('doubleclick') ||
        url.includes('tracking')
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('Navigazione verso URL:', url);
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });
    } catch (err) {
      console.warn('Errore prima navigazione, fallback su domcontentloaded...');
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
    }

    console.log('Attendo caricamento font...');
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Cattura screenshot visivo...');
    const screenshot = await page.screenshot({
      fullPage: true,
      encoding: 'base64',
      type: 'jpeg',
      quality: 80
    });

    console.log('Iniezione axe-core...');
    await page.addScriptTag({ content: axeCore.source });

    console.log('Iniezione stili per evidenziazione...');
    await page.addStyleTag({ content: highlightStyles });

    console.log('Scrollo lentamente tutta la pagina...');
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;
        const distance = 300;
        const delay = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, delay);
      });
    });

    console.log('Attendo animazioni...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Calcolo heatmap e violazioni...');
    const results = await page.evaluate(async () => {
      const axeResults = await window.axe.run();
      let globalIndex = 0;
      let heatmapData = [];
      axeResults.violations.forEach((violation) => {
        violation.nodes.forEach((node) => {
          node.globalIndex = globalIndex;
          const element = document.querySelector(node.target[0]);
          if (element) {
            const rect = element.getBoundingClientRect();
            heatmapData.push({
              index: globalIndex,
              left: rect.left + window.scrollX,
              top: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height,
              impact: violation.impact,
              description: violation.help || 'Errore di accessibilità'
            });
          }
          globalIndex++;
        });
      });
      return {
        ...axeResults,
        heatmapData,
        pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    });

    // Lighthouse (opzionale, non bloccante)
    console.log('Eseguo Lighthouse...');
    let lighthouseResults = null;
    try {
      const lighthouseModule = await import('lighthouse');
      const lighthouse = lighthouseModule.default || lighthouseModule;
      const endpoint = new URL(browser.wsEndpoint());

      const { lhr } = await lighthouse(url, {
        port: 9222,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices'],
        disableStorageReset: true,
        screenEmulation: { disabled: true },
        throttling: { cpuSlowdownMultiplier: 1 },
        maxWaitForFcp: 15000,
        maxWaitForLoad: 30000
      });

      lighthouseResults = {
        performance: lhr.categories.performance.score * 100,
        accessibility: lhr.categories.accessibility.score * 100,
        bestPractices: lhr.categories['best-practices'].score * 100,
        seo: lhr.categories.seo.score * 100,
        lhr
      };
    } catch (lhErr) {
      console.error('Errore Lighthouse:', lhErr);
      lighthouseResults = {
        error: 'Errore durante Lighthouse',
        details: lhErr.message || lhErr.toString(),
        hint: 'Possibile NO_FCP o blocco rendering headless.'
      };
    }

    console.log('Invio risultati...');
    res.json({
      ...results,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      lighthouse: lighthouseResults
    });

  } catch (err) {
    console.error('Errore durante la scansione:', err);
    res.status(500).json({
      error: 'Errore durante la scansione',
      details: err.message || err.toString()
    });
  } finally {
    if (browser) {
      console.log('Chiusura browser...');
      await browser.close();
    }
  }
});

app.post('/api/gemini/axe', async (req, res) => {
  const { description } = req.body;
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  if (!description) {
    return res.status(400).json({ error: 'description mancante.' });
  }
  try {
    const prompt = `Errore: ${description}

    Rispondi in italiano con:
    - Cosa significa (1 frase)
    - Come risolverlo (1-2 punti pratici)
    - Massimo 50 parole totali`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    res.json({ summary: text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gemini/lighthouse', async (req, res) => {
  const { descriptions } = req.body;
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  if (!Array.isArray(descriptions)) {
    return res.status(400).json({ error: 'descriptions deve essere un array.' });
  }
  try {
    const promises = descriptions.map(async (desc) => {
    const prompt = `Errore: ${description}

    Rispondi in italiano con:
    - Cosa significa (1 frase)
    - Come risolverlo (1-2 punti pratici)
    - Massimo 50 parole totali`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
    const explanations = await Promise.all(promises);
    res.json({ explanations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint proxy per scaricare HTML da siti esterni (CORS bypass)
app.post('/proxy-html', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send('URL mancante');
  try {
    const response = await fetch(url); // fetch nativa di Node 18+
    const html = await response.text();
    res.send(html);
  } catch (err) {
    res.status(500).send('Errore nel proxy HTML');
  }
});

/**
app.post('/proxy-html', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send('URL mancante');

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    await browser.close();
    res.send(html);
  } catch (err) {
    res.status(500).send('Errore nel proxy HTML');
  }
});
*/

// Endpoint per generare e scaricare il report PDF
app.post('/download-report/pdf', async (req, res) => {
  const { results } = req.body;
  if (!results) return res.status(400).json({ error: 'Dati mancanti per il report.' });

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  let buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
    res.send(pdfData);
  });

  // --- HEADER ---
  doc.fontSize(28).fillColor('#2563EB').font('Helvetica-Bold').text('UXABILITY', { align: 'center', characterSpacing: 2 });
  doc.moveDown(0.5);
  doc.fontSize(18).fillColor('#222').font('Helvetica-Bold').text('Report Analisi Usabilità, Accessibilità e SEO', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#222').font('Helvetica').text(`Data: ${results.timestamp || new Date().toLocaleString()}`, { align: 'center' });
  doc.text(`URL: ${results.url || ''}`, { align: 'center' });
  doc.moveDown(1);
  // Separatore blu
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#2563EB').lineWidth(2).stroke();
  doc.moveDown(1.5);

  // --- PUNTEGGI LIGHTHOUSE ---
  if (results.lighthouse) {
    doc.fontSize(16).fillColor('#2563EB').font('Helvetica-Bold').text('Punteggi Lighthouse', { underline: true });
    doc.moveDown(0.5);

    const scores = [
      { label: 'Performance', value: results.lighthouse.performance, color: '#2563EB' },
      { label: 'Accessibilità', value: results.lighthouse.accessibility, color: '#10b981' },
      { label: 'Best Practices', value: results.lighthouse.bestPractices, color: '#f59e0b' },
      { label: 'SEO', value: results.lighthouse.seo, color: '#6366f1' }
    ];

    let startY = doc.y;
    const startX = 60;
    const circleRadius = 16; // più grande
    const rowHeight = 38;    // più spazio tra le righe

    scores.forEach((s, i) => {
      // Cerchio colorato
      doc.save();
      doc.circle(startX, startY + i * rowHeight + circleRadius, circleRadius).fill(s.color);
      doc.restore();

      // Testo punteggio (bianco, centrato nel cerchio)
      doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
        .text(
          `${s.value}`,
          startX - circleRadius,
          startY + i * rowHeight + circleRadius - 10, // regola -10 per centrare verticalmente
          { width: circleRadius * 2, align: 'center' }
        );

      // Testo label (a destra del cerchio)
      doc.fillColor('#222').fontSize(15).font('Helvetica')
        .text(s.label, startX + circleRadius + 16, startY + i * rowHeight + circleRadius - 10);
    });

    doc.moveDown(scores.length * 1.1 + 0.5);
  }

  // --- VIOLAZIONI ---
  doc.moveDown(0.5);
  doc.fontSize(16).fillColor('#dc2626').font('Helvetica-Bold').text('Violazioni rilevate', { underline: true });
  doc.moveDown(0.5);
  if (results.violations && results.violations.length > 0) {
    results.violations.forEach((v, idx) => {
      // Box colorato per impatto
      let color = '#64748b';
      if (v.impact === 'critical') color = '#dc2626';
      else if (v.impact === 'serious') color = '#f59e0b';
      else if (v.impact === 'moderate') color = '#3498db';
      doc.rect(40, doc.y, 515, 60).fillOpacity(0.12).fill(color).fillOpacity(1);
      doc.fillColor('#222').fontSize(13).font('Helvetica-Bold').text(`${idx + 1}. [${v.impact.toUpperCase()}] ${v.help || v.description}`, 45, doc.y + 5);
      doc.font('Helvetica').fontSize(12).fillColor('#222').text(`Descrizione: ${v.description}`, 55, doc.y + 20, { width: 490 });
      if (v.nodes && v.nodes[0]?.failureSummary) {
        doc.fontSize(11).fillColor('#222').text(`Dettaglio: ${v.nodes[0].failureSummary}`, 55, doc.y + 35, { width: 490 });
      }
      doc.moveDown(2.2);
    });
  } else {
    doc.fontSize(13).fillColor('#10b981').text('Nessuna violazione rilevata! Il sito rispetta le linee guida di accessibilità. 🎉');
  }

  // --- SCREENSHOT ---
  if (results.screenshot) {
    try {
      // Salva temporaneamente il base64 come file
      const fs = require('fs');
      const path = require('path');
      const tempPath = path.join(__dirname, 'temp_screenshot.jpg');
      const base64Data = results.screenshot.replace(/^data:image\/(png|jpeg);base64,/, '');
      fs.writeFileSync(tempPath, base64Data, 'base64');
      doc.addPage();
      doc.fontSize(16).fillColor('#2563EB').font('Helvetica-Bold').text('Screenshot della pagina analizzata', { align: 'center' });
      doc.moveDown(1);
      doc.image(tempPath, { fit: [500, 350], align: 'center', valign: 'center' });
      fs.unlinkSync(tempPath);
    } catch (e) {
      doc.addPage();
      doc.fontSize(14).fillColor('#dc2626').text('Errore nel caricamento dello screenshot.');
    }
  }

  // --- FOOTER ---
  doc.addPage();
  doc.fontSize(12).fillColor('#2563EB').font('Helvetica-Bold').text('UXABILITY', { align: 'center' });
  doc.fontSize(10).fillColor('#222').font('Helvetica').text('Report generato automaticamente da UXABILITY. Per info visita uxability.com', { align: 'center' });
  doc.end();
});

// Endpoint per generare e scaricare il report CSV
app.post('/download-report/csv', async (req, res) => {
  const { results } = req.body;
  if (!results || !results.violations) return res.status(400).json({ error: 'Dati mancanti per il report.' });

  const fields = [
    { label: 'Impatto', value: 'impact' },
    { label: 'Titolo', value: 'help' },
    { label: 'Descrizione', value: 'description' },
    { label: 'Dettaglio', value: row => row.nodes && row.nodes[0]?.failureSummary || '' },
    { label: 'Selettore', value: row => row.nodes && row.nodes[0]?.target[0] || '' }
  ];
  const parser = new Parser({ fields });
  let csv;
  try {
    csv = parser.parse(results.violations);
  } catch (e) {
    return res.status(500).json({ error: 'Errore nella generazione del CSV.' });
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
  res.send(csv);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
