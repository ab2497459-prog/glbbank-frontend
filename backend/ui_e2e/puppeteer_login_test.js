const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '..', '..');
  const fileUrl = 'file://' + path.join(root, 'landing-page', 'index.html');
  console.log('Opening', fileUrl);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.on('dialog', async dialog => { console.log('Dialog:', dialog.message()); await dialog.dismiss(); });
  try {
    await page.goto(fileUrl, { waitUntil: 'load' });
    // open login modal
    await page.evaluate(() => { const b = document.getElementById('openLoginBtn') || document.getElementById('heroLoginBtn'); if (b) b.click(); });
    await page.waitForTimeout(500);
    // set role, credentials
    await page.select('#loginRole', 'admin');
    await page.type('#loginEmail', 'tilakrajbhargava4@gmail.com');
    await page.type('#loginPassword', 'Admintilak12@');
    // submit
    await page.$eval('#portalLoginForm', form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    // wait for navigation or redirect
    await page.waitForTimeout(2000);
    console.log('Current URL after submit:', page.url());
  } catch (err) {
    console.error('E2E UI test error:', err.message);
    await browser.close();
    process.exit(1);
  }
  await browser.close();
  console.log('Done');
})();
