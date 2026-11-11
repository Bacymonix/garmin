const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 });
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.COCKPIT_CONFIG={supabaseUrl:"",supabaseAnonKey:""};' }));
  await p.goto('file:///home/claude/cockpit-web/index.html');
  await p.waitForSelector('.tabbar button');
  await p.evaluate(() => {
    document.body.innerHTML = '<div id="g" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:10px;background:#0A0E14"></div>';
    document.getElementById('g').innerHTML = Object.keys(MOVES).map(k => `<div style="background:#1B2430;border-radius:12px;padding:4px"><div style="color:#8D9AAA;font:11px sans-serif;text-align:center">${k}</div>${MOVES[k].build()}</div>`).join('');
  });
  await p.waitForTimeout(1300); await p.screenshot({ path: 'mv-a.png', fullPage: true });
  await p.waitForTimeout(1300); await p.screenshot({ path: 'mv-b.png', fullPage: true });
  await b.close();
})();
