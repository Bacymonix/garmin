const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 460, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.COCKPIT_CONFIG={supabaseUrl:"",supabaseAnonKey:""};' }));
  await p.goto('file:///home/claude/cockpit-web/index.html');
  const shot = async n => p.screenshot({ path: 'local-' + n + '.png' });
  await shot('0-empty');
  await p.click('[data-a=demo]'); await p.waitForTimeout(500);
  await shot('1-today');
  for (const t of ['plan', 'muscu', 'forme', 'settings']) { await p.click(`.tabbar [data-tab=${t}]`); await shot('2-' + t); }
  // modals
  const tryA = async (tab, sel, name) => { await p.click(`.tabbar [data-tab=${tab}]`); const el = await p.$(sel); if (!el) { errs.push('MISSING ' + sel); return; } await el.click(); await p.waitForTimeout(400); await shot('3-' + name); await p.click('#sheet [data-a=pop]').catch(()=>{}); };
  await tryA('forme', '[data-a=trends]', 'trends');
  await tryA('settings', '[data-a=profile]', 'profile');
  await tryA('settings', '[data-a=paces]', 'paces');
  await tryA('settings', '[data-a=measures]', 'measures');
  await tryA('settings', '[data-a=refs]', 'refs');
  await tryA('settings', '[data-a=activities]', 'activity');
  await tryA('settings', '[data-a=season]', 'season');
  
  await tryA('plan', '[data-a=phases]', 'phases');
  await tryA('plan', '[data-a=openSession]', 'session');
  await tryA('muscu', '[data-a=library]', 'library');
  await tryA('muscu', '[data-a=strengthHistory]', 'sdetail');
  await tryA('today', '[data-a=checkin]', 'checkin');
  await p.click('.tabbar [data-tab=today]'); const ad = await p.$('[data-a=adapt]'); if (ad) { await ad.click(); await shot('3-adapt'); await p.click('[data-a=saveAdapt]'); }
  // checkin save
  await p.click('[data-a=checkin]'); await p.click('[data-a=scale][data-k=fatigue][data-v="5"]'); await p.fill('input[name=hrv]', '55'); await p.click('[data-a=saveCheckin]');
  // workout
  await p.click('.tabbar [data-tab=muscu]');
  await p.click('[data-a=freeWorkout]'); await p.waitForSelector('#sheet [data-a=startWorkout]'); await p.click('#sheet [data-a=startWorkout]'); await p.waitForTimeout(200); await shot('4-wo');
  for (let i = 0; i < 4; i++) { await p.click('[data-a=woValidate]'); await p.waitForTimeout(100); if (i == 0) await shot('4-rest'); await p.click('[data-a=restEnd]').catch(()=>{}); }
  await p.click('#workout [data-a=woSummary]'); await p.waitForTimeout(100); await shot('5-summary');
  await p.click('[data-a=finishWorkout]');
  // sim date
  await p.click('.tabbar [data-tab=settings]'); await p.click('[data-a=jump]'); await p.click('[data-a=gotoDate][data-d="2027-04-17"]'); await shot('6-plan-marathon');
  await p.click('.tabbar [data-tab=today]'); await shot('6-today-marathon');
  // export
  await p.click('.tabbar [data-tab=settings]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=exportJSON]')]); console.log('download', dl.suggestedFilename());
  console.log(await p.evaluate(() => ({ acts: S.activities.length, str: S.strength.length, met: Object.keys(S.metrics).length, size: localStorage.getItem(STORE_KEY).length })));
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS'); await b.close();
})();
