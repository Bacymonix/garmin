const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 440, height: 920 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.COCKPIT_CONFIG={supabaseUrl:"",supabaseAnonKey:""};' }));
  await p.goto('file:///home/claude/cockpit-web/index.html');
  await p.waitForSelector('.tabbar button');
  await p.click('[data-a=demo]'); await p.waitForTimeout(900);
  const shot = n => p.screenshot({ path: 'x-' + n + '.png' });
  await shot('today');
  for (const t of ['plan','muscu','forme','settings']) { await p.click(`.tabbar [data-tab=${t}]`); await p.waitForTimeout(350); await shot(t); }
  await p.click('.tabbar [data-tab=forme]'); await p.evaluate(() => document.querySelector('[data-a=paces]')?.scrollIntoView());
  await p.waitForTimeout(200); await shot('forme2');
  await p.click('.tabbar [data-tab=today]'); await p.click('[data-a=coachSheet]'); await p.waitForTimeout(400); await shot('coach'); await p.click('[data-a=pop]');
  await p.click('.tabbar [data-tab=muscu]'); await p.click('[data-a=library]'); await p.waitForTimeout(300);
  await p.click('#sheet [data-a=exercise]'); await p.waitForTimeout(500); await shot('exercise');
  console.log(errs.length ? errs.slice(0,6).join('\n') : 'NO ERRORS');
  await b.close();
})();
