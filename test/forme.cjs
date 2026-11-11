const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 440, height: 2400 }, deviceScaleFactor: 2 });
  p.on('dialog', d => d.accept());
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.COCKPIT_CONFIG={supabaseUrl:"",supabaseAnonKey:""};' }));
  await p.goto('file:///home/claude/cockpit-web/index.html'); await p.waitForSelector('.tabbar button');
  await p.click('[data-a=demo]'); await p.waitForTimeout(900);
  await p.click('.tabbar [data-tab=forme]'); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('view').scrollTop = 1500); await p.waitForTimeout(400);
  await p.screenshot({ path: 'z-forme.png' });
  await p.click('.tabbar [data-tab=today]'); await p.click('[data-a=coachSheet]'); await p.waitForTimeout(500);
  await p.screenshot({ path: 'z-coach.png' });
  await b.close();
})();
