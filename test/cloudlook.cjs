const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 440, height: 920 }, deviceScaleFactor: 2 });
  p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:9910/');
  await p.waitForSelector('#loginForm');
  await p.screenshot({ path: 'c-login.png' });
  await p.fill('[name=email]', 'benjamin@test.fr'); await p.fill('[name=password]', 'motdepasse'); await p.click('#loginForm button');
  await p.waitForFunction(() => typeof Cloud !== 'undefined' && Cloud.state === 'ok');
  await p.click('.tabbar [data-tab=settings]'); await p.waitForTimeout(300); await p.screenshot({ path: 'c-settings.png' });
  await p.click('.tabbar [data-tab=forme]'); await p.waitForTimeout(300); await p.screenshot({ path: 'c-forme.png' });
  await b.close();
})();
