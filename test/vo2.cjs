const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 440, height: 2600 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});
  p.on('dialog', d => d.accept());
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.COCKPIT_CONFIG={supabaseUrl:"",supabaseAnonKey:""};' }));
  await p.goto('file:///home/claude/cockpit-web/index.html'); await p.waitForSelector('.tabbar button');
  await p.click('[data-a=demo]'); await p.waitForTimeout(900);
  await p.evaluate(() => { S.profile.vo2maxGarmin = 56; save(); });
  await p.click('.tabbar [data-tab=forme]'); await p.waitForTimeout(400);
  await p.click('[data-a=vo2]'); await p.waitForTimeout(700); await p.screenshot({ path: 'v-vo2.png' });
  console.log(await p.evaluate(() => { const e = vo2maxEstimates(); return JSON.stringify({ med: e.median && +e.median.toFixed(1), spread: e.spread && +e.spread.toFixed(1), conf: e.conf, list: e.list.map(o => [o.id, +o.v.toFixed(1)]) }); }));
  console.log(errs.length?errs.slice(0,5).join('\n'):'NO ERRORS'); await b.close();
})();
