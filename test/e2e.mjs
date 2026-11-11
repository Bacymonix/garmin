// Test de bout en bout : connexion, synchro Supabase, Garmin via le script GitHub Actions, multi-appareils.
import { createRequire } from 'node:module'; const { chromium } = createRequire('/home/claude/.npm-global/lib/node_modules/x.js')('playwright');
import { execSync, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const BASE = 'http://127.0.0.1:9910';
const SR = process.env.NEWKEY === '1' ? 'sb_secret_test_key' : readFileSync(new URL('./mock.log', import.meta.url), 'utf8').match(/service_role=(\S+)/)[1];
const psql = q => execFileSync('psql', ['-h', '/var/tmp/cockpitpg', '-p', '5433', '-U', 'postgres', '-d', 'cockpit', '-tAc', q]).toString().trim();
const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) process.exitCode = 1; };
psql('truncate cockpit_state, cockpit_activities, garmin_days, sync_runs, garmin_token');
const action = (extra = {}) => { try { return execFileSync('node', [new URL('../sync/garmin-sync.mjs', import.meta.url).pathname], { env: Object.assign({}, process.env, { SUPABASE_URL: BASE, SUPABASE_SERVICE_ROLE_KEY: SR, GARMIN_PERSONAL_API_KEY: 'good-key', GARMIN_PERSONAL_API_BASE_URL: BASE + '/garmin', GARMIN_PAUSE_MS: '0' }, extra) }).toString(); } catch (e) { return 'EXIT ' + e.status + ' ' + e.stdout + e.stderr; } };

const b = await chromium.launch();
const errs = [];
async function device(name) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 } }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ' PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/400|401|403|406|ERR_INTERNET_DISCONNECTED/.test(m.text())) errs.push(name + ' CON ' + m.text()); });
  p.on('dialog', d => d.accept(d.type() === 'prompt' ? 'EFFACER' : undefined));
  await p.goto(BASE + '/'); return p;
}
const p1 = await device('pc');
await p1.waitForSelector('#loginForm');
await p1.fill('[name=email]', 'benjamin@test.fr'); await p1.fill('[name=password]', 'faux'); await p1.click('#loginForm button');
await p1.waitForSelector('#login .danger'); ok((await p1.textContent('#login .danger')).includes('incorrect'), 'mauvais mot de passe refusé');
await p1.fill('[name=email]', 'benjamin@test.fr'); await p1.fill('[name=password]', 'motdepasse'); await p1.click('#loginForm button');
await p1.waitForSelector('.tabbar'); await p1.waitForFunction(() => Cloud.state === 'ok');
ok(psql('select count(*) from cockpit_state') === '1', 'ligne d\'état créée au premier login');
await p1.screenshot({ path: 'w1-today.png' });

// Synchro Garmin demandée depuis l'app → script GitHub Actions → intégration
await p1.click('.tabbar [data-tab=settings]'); await p1.selectOption('#gmDays', '7'); await p1.click('[data-a=gmSync]');
await p1.waitForFunction(() => GM.runs.some(r => r.status === 'requested'));
ok(psql("select status||'/'||source from sync_runs") === 'requested/app', 'demande de synchro enregistrée');
const out = action(); console.log(out.split('\n').filter(Boolean).map(l => '   │ ' + l).join('\n'));
ok(psql("select status from sync_runs") === 'done', 'synchro terminée côté GitHub Actions');
ok(+psql('select count(*) from garmin_days') === 7, '7 jours Garmin enregistrés');
ok(+psql("select count(*) from cockpit_activities where doc->>'pending' = 'true'") === 2, '2 activités déposées en attente');
await p1.evaluate(() => Cloud.pull()); await p1.waitForFunction(() => S.activities.length === 2 && !S.activities.some(a => a.pending));
await p1.waitForFunction(() => Cloud.state === 'ok' && !Cloud.dirty);
const st = await p1.evaluate(() => ({ today: S.metrics[D.realToday()], prof: [S.profile.maxHR, S.profile.restingHR, S.profile.massKg], acts: S.activities.map(a => [a.id, a.trimp != null, a.linkState, a.nSamples]) }));
console.log('   ', JSON.stringify(st));
ok(st.today?.hrvProv === 'garmin' && st.today.sleepMin > 0, 'VFC et sommeil du jour intégrés');
ok(st.today?.steps > 0 && st.today?.stress != null && st.today?.sleepStart != null, 'pas, stress et heure de coucher récupérés');
ok(await p1.evaluate(() => { const s2 = sleepScore(D.realToday()); return s2 && s2.score >= 0 && s2.score <= 100 && s2.used.length >= 2; }), 'score de sommeil calculé à partir des données Garmin');
ok(st.prof[0] === 193 && st.prof[1] === 47, 'profil complété (FC max, FC repos)');
ok(psql("select count(*) from cockpit_activities where doc->>'pending' is null") === '2', 'activités intégrées et renvoyées sans « pending »');
ok(psql("select count(*) from sync_runs where merged") === '1', 'compte rendu marqué intégré');
ok(action().includes('Rien à faire'), 'passage automatique suivant : rien à faire (< 3 h)');
ok(action({ FORCE: '1' }).includes('Nouvelles activités":0'), 'resynchro forcée : aucune activité en double');

// Saisie manuelle prioritaire sur Garmin
await p1.click('.tabbar [data-tab=today]'); await p1.click('[data-a=checkin]'); await p1.fill('input[name=hrv]', '44'); await p1.click('[data-a=saveCheckin]');
await p1.waitForFunction(() => Cloud.state === 'ok' && !Cloud.dirty);
psql("update garmin_days set data = data || '{\"hrv\": 99}', updated_at = now() where day = current_date");
await p1.evaluate(() => Cloud.pull()); await p1.waitForFunction(() => Cloud.state === 'ok');
ok(await p1.evaluate(() => S.metrics[D.realToday()].hrv) === 44, 'VFC saisie à la main non écrasée par Garmin');

// Démo + courbes à la demande
await p1.click('.tabbar [data-tab=settings]'); await p1.click('[data-a=demo]'); await p1.waitForFunction(() => Cloud.state === 'ok' && !Cloud.dirty, null, { timeout: 30000 });
const nAct = +psql('select count(*) from cockpit_activities'); ok(nAct > 30, `démo envoyée (${nAct} activités)`);
ok(+psql('select count(*) from cockpit_activities where samples is not null and jsonb_array_length(samples) > 0') >= nAct - 2, 'courbes enregistrées');

// Second appareil : cache vide, chargement depuis Supabase
const p2 = await device('tel');
await p2.fill('[name=email]', 'benjamin@test.fr'); await p2.fill('[name=password]', 'motdepasse'); await p2.click('#loginForm button');
await p2.waitForFunction(() => Cloud.state === 'ok' && S.activities.length > 30);
ok(await p2.evaluate(() => S.activities.every(a => a.samples === undefined)), 'téléphone : activités chargées sans les courbes');
await p2.click('.tabbar [data-tab=settings]'); await p2.evaluate(() => A.activity({ id: S.activities.find(a => a.nSamples > 100).id })); await p2.waitForFunction(() => S.activities.some(a => a.samples?.length));
await p2.waitForTimeout(300); ok(await p2.locator('#sheet svg.chart').count() > 0, 'courbes chargées à la demande et affichées');
await p2.screenshot({ path: 'w2-activity.png' }); await p2.click('#sheet [data-a=pop]');

// Conflit : modifications simultanées sur deux appareils
await p2.evaluate(() => { S.profile.vma = 19.5; save(); }); await p2.waitForFunction(() => Cloud.state === 'ok' && !Cloud.dirty);
await p1.evaluate(() => { S.profile.sleepNeed = 8.5; S.events[1].notes = 'note PC'; save(); }); await p1.waitForFunction(() => Cloud.state === 'ok' && !Cloud.dirty);
const doc = JSON.parse(psql('select doc from cockpit_state')); console.log('   ', doc.profile.vma, doc.profile.sleepNeed, doc.events[1].notes, await p1.evaluate(() => [Cloud.rev, Cloud.docJs && JSON.parse(Cloud.docJs).profile.vma]));
ok(doc.profile.vma === 19.5 && doc.profile.sleepNeed === 8.5 && doc.events[1].notes === 'note PC', 'conflit fusionné sans perte (VMA du téléphone + sommeil du PC)');

// Séance de muscu sur le téléphone, visible sur le PC
await p2.click('.tabbar [data-tab=muscu]'); await p2.click('[data-a=freeWorkout]'); await p2.waitForSelector('#sheet [data-a=startWorkout][data-tpl=up_A]'); await p2.click('#sheet [data-a=startWorkout][data-tpl=up_A]');
await p2.click('[data-a=woValidate]'); await p2.click('[data-a=restEnd]'); await p2.click('[data-a=woValidate]');
await p2.screenshot({ path: 'w3-rest.png' });
await p2.click('#workout [data-a=woSummary]'); await p2.click('[data-a=finishWorkout]'); await p2.waitForFunction(() => Cloud.state === 'ok' && !Cloud.dirty);
await p1.evaluate(() => Cloud.pull()); await p1.waitForFunction(() => Cloud.state === 'ok');
ok(await p1.evaluate(() => S.strength.some(s => s.templateId === 'up_A' && !s.demo && s.sets.length === 2)), 'séance du téléphone visible sur le PC');

// Isolation entre comptes
const other = await (await fetch(BASE + '/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: 'autre@test.fr', password: 'autre' }) })).json();
const seen = await (await fetch(BASE + '/rest/v1/cockpit_activities?select=id', { headers: { Authorization: 'Bearer ' + other.access_token } })).json();
ok(Array.isArray(seen) && seen.length === 0, 'un autre compte ne voit aucune donnée');

// Hors ligne puis reconnexion
await p1.context().setOffline(true); await p1.evaluate(() => { S.profile.vma = 20; save(); }); await p1.waitForFunction(() => Cloud.state === 'offline');
await p1.screenshot({ path: 'w4-offline.png' });
await p1.context().setOffline(false); await p1.evaluate(() => window.dispatchEvent(new Event('online'))); await p1.waitForFunction(() => Cloud.state === 'ok' && !Cloud.dirty);
ok(JSON.parse(psql('select doc from cockpit_state')).profile.vma === 20, 'modification hors ligne envoyée au retour du réseau');

// Effacer la démo
await p1.click('.tabbar [data-tab=settings]'); await p1.click('[data-a=clearDemo]'); await p1.waitForFunction(() => Cloud.state === 'ok' && !Cloud.dirty);
ok(psql("select count(*) from cockpit_activities where doc->>'source'='demo'") === '0' && psql('select count(*) from cockpit_activities') === '2', 'démo effacée, activités Garmin conservées');

// Programme
await p1.click('.tabbar [data-tab=plan]'); await p1.screenshot({ path: 'w5-plan.png' });
await p1.click('[data-a=weekEdit]'); await p1.screenshot({ path: 'w6-weekedit.png' }); await p1.click('#sheet [data-a=pop]');
await p1.click('.tabbar [data-tab=settings]'); await p1.screenshot({ path: 'w7-data.png', fullPage: true });

// Clé Garmin refusée
psql("insert into sync_runs(user_id, source, status) values ('11111111-1111-1111-1111-111111111111','app','requested')"); psql('truncate garmin_token');
const bad = action({ GARMIN_PERSONAL_API_KEY: 'mauvaise' });
ok(bad.includes('EXIT 1') && psql("select error from sync_runs order by id desc limit 1").includes('refuse la clé'), 'clé Garmin invalide : erreur claire dans le compte rendu');
console.log(errs.length ? errs.join('\n') : '✔ aucune erreur JavaScript');
await b.close();
