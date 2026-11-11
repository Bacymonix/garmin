const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 440, height: 1500 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});
  p.on('dialog', d => d.accept());
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.COCKPIT_CONFIG={supabaseUrl:"",supabaseAnonKey:""};' }));
  await p.goto('file:///home/claude/cockpit-web/index.html'); await p.waitForSelector('.tabbar button');
  await p.click('[data-a=demo]'); await p.waitForTimeout(900);
  await p.evaluate(() => { const a = S.activities.filter(x=>x.sport==='trailRunning').sort((u,v)=>v.start-u.start)[0] || S.activities[0]; A.activity({id:a.id}); });
  await p.waitForTimeout(600); await p.screenshot({ path: 'y-act.png' });
  console.log(errs.length?errs.slice(0,5).join('\n'):'NO ERRORS'); await b.close();
})();
