const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 440, height: 1800 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});
  p.on('dialog', d => d.accept());
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.COCKPIT_CONFIG={supabaseUrl:"",supabaseAnonKey:""};' }));
  await p.goto('file:///home/claude/cockpit-web/index.html'); await p.waitForSelector('.tabbar button');
  await p.click('[data-a=demo]'); await p.waitForTimeout(900);
  await p.click('[data-a=sleepDetail]'); await p.waitForTimeout(500); await p.screenshot({ path: 'w-sleep.png' });
  await p.click('#sheet [data-a=pop]');
  await p.evaluate(() => { const a = S.activities.filter(x=>x.samples?.some(s=>s[5]!=null)).sort((u,v)=>v.start-u.start)[0]; A.activity({id:a.id}); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { const el=[...document.querySelectorAll('.band h3')].find(h=>h.textContent==='Parcours'); el?.scrollIntoView(); });
  await p.waitForTimeout(300); await p.screenshot({ path: 'w-route.png' });
  console.log(errs.length?errs.slice(0,5).join('\n'):'NO ERRORS'); await b.close();
})();
