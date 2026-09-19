import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating...");
  await page.goto('http://localhost:5173/project/3dc8db72-11e4-4ccb-a2ae-c23cbf1994a0/viewer', { waitUntil: 'networkidle0' });
  
  console.log("Done waiting.");
  await browser.close();
})();
