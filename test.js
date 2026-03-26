const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message);
  });

  await page.goto('file:///d:/%EB%B0%94%ED%83%95%ED%99%94%EB%A9%B4/%EC%A7%84%EC%95%84%EA%B8%80%EC%9E%90%EA%B3%B5%EB%B6%80/index.html', { waitUntil: 'networkidle0' });
  
  const title = await page.title();
  console.log('Title:', title);
  
  await browser.close();
})();
