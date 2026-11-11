const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 440, height: 920 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.COCKPIT_CONFIG={supabaseUrl:"",supabaseAnonKey:""};' }));
  await p.goto('file:///home/claude/cockpit-web/index.html');
  await p.waitForSelector('.tabbar button');
  await p.click('[data-a=demo]'); await p.waitForTimeout(700);
  const shot = n => p.screenshot({ path: 'n-' + n + '.png' });
  await shot('today');
  for (const t of ['plan','forme','season','settings']) { await p.click(`.tabbar [data-tab=${t}]`); await p.waitForTimeout(200); await shot(t); }
  await p.click('.tabbar [data-tab=today]'); await p.click('[data-a=checkin]'); await p.waitForTimeout(200); await shot('checkin'); await p.click('[data-a=pop]');
  await p.click('[data-a=startWorkout]'); await p.waitForTimeout(300); await shot('wo');
  await p.click('[data-a=woValidate]'); await p.waitForTimeout(300); await shot('rest');
  console.log(errs.length ? errs.slice(0,8).join('\n') : 'NO ERRORS');
  await b.close();
})();
