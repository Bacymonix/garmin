const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.COCKPIT_CONFIG={supabaseUrl:'http://127.0.0.1:9910/rest/v1/',supabaseAnonKey:'sb_publishable_PNO_test',githubRepo:'Bacymonix/garmin'};" }));
  await p.goto('http://127.0.0.1:9910/');
  await p.waitForSelector('#loginForm');
  await p.fill('[name=email]','benjamin@test.fr'); await p.fill('[name=password]','motdepasse');
  await p.click('#loginForm button');
  await p.waitForTimeout(4000);
  console.log('err brute :', await p.evaluate(async () => { try { const r = await Cloud.sb.auth.signInWithPassword({email:'a@b.c',password:'x'}); return JSON.stringify({status:r.error?.status, code:r.error?.code, msg:r.error?.message}); } catch(e){ return 'THROW '+e.message; } }));
  console.log('bouton :', JSON.stringify(await p.textContent('#loginForm button')));
  console.log('avertissement :', JSON.stringify(await p.textContent('#login .warn').catch(()=>null)));
  console.log('erreur affichée :', JSON.stringify(await p.textContent('#login .danger').catch(()=>null)));
  await p.screenshot({path:'badurl.png'});
  await b.close();
})();
