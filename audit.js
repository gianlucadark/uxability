const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const { writeFileSync } = require('fs');
const axeCore = require('axe-core');


(async () => {
  // Avvia Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--remote-debugging-port=9222'],
    defaultViewport: null,
  });

  // Ottieni la pagina principale
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle2' });

  // Esegui axe-core per l'accessibilità
  await page.addScriptTag({ content: axeCore.source });
  const axeResults = await page.evaluate(async () => {
    return await window.axe.run();
  });
  console.log('Risultati axe-core (accessibilità):');
  console.log(JSON.stringify(axeResults, null, 2));
  writeFileSync('axe-results.json', JSON.stringify(axeResults, null, 2));

  // Esegui Lighthouse
  const { lhr } = await lighthouse(URL, {
    port: 9222,
    output: 'json',
    logLevel: 'info',
  });
  console.log('Risultati Lighthouse:');
  console.log(`Performance: ${lhr.categories.performance.score * 100}`);
  console.log(`Accessibilità: ${lhr.categories.accessibility.score * 100}`);
  console.log(`Best Practices: ${lhr.categories['best-practices'].score * 100}`);
  console.log(`SEO: ${lhr.categories.seo.score * 100}`);
  writeFileSync('lighthouse-report.json', JSON.stringify(lhr, null, 2));

  await browser.close();
})();
