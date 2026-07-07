const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  await page.goto('http://localhost:8000/tabs/model-converters/model-converters.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btn = document.querySelector('#model-converters-xml-cii-rich-btn');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => {
    const tab = document.querySelector('[data-modal-tab="json-trace"]');
    if (tab) tab.click();
    else console.log('TAB NOT FOUND');
  });
  await new Promise(r => setTimeout(r, 1000));
  const html = await page.evaluate(() => {
    const body = document.querySelector('[data-xml-cii-workflow-body]');
    return body ? body.innerHTML.substring(0, 500) : 'NO BODY';
  });
  console.log('HTML after click:', html);
  await browser.close();
})();
