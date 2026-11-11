// Cockpit — synchronisation Garmin → Supabase, exécutée par GitHub Actions.
// API personnelle officielle de Garmin Connect (points d'accès et authentification d'après le client
// officiel github.com/garmin/connect-personal-api-python, Apache 2.0). Node 20+, aucune dépendance.
//
// Variables d'environnement (secrets du dépôt) :
//   GARMIN_PERSONAL_API_KEY     clé d'API personnelle créée sur Garmin Connect
//   SUPABASE_URL                https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   clé service_role (Project Settings › API Keys) — ne jamais la mettre dans l'app
//   COCKPIT_USER_ID             facultatif : identifiant de ton utilisateur si plusieurs comptes existent
//   FORCE=1                     synchroniser même si rien n'est demandé (lancement manuel)
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const env = process.env;
const GARMIN = (env.GARMIN_PERSONAL_API_BASE_URL || 'https://personal.connectapi.garmin.com').replace(/\/$/, '');
const SB = (env.SUPABASE_URL || '').replace(/\/$/, '');
const SRK = env.SUPABASE_SERVICE_ROLE_KEY || '';
const EVERY_H = Number(env.SYNC_EVERY_HOURS || 3);
const MAX_DOWNLOADS = Number(env.MAX_DOWNLOADS || 60);
const PAUSE = Number(env.GARMIN_PAUSE_MS ?? 250);

// Décodeur FIT de l'app, réutilisé tel quel
const ctx = { console, TextDecoder, DataView, Uint8Array, Response, Blob, DecompressionStream, Math, Date, JSON, Number, String, Object, Array, Set, Map, isFinite, isNaN, parseFloat, parseInt, Error, Promise };
vm.createContext(ctx);
vm.runInContext(['seed.js', 'engine.js'].map(f => readFileSync(here + '../src/' + f, 'utf8')).join('\n') + '\n;this.FIT = FIT; this.unzipFiles = unzipFiles;', ctx);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---------------- Supabase (REST, clé service_role) ----------------
async function sb(path, { method = 'GET', body, prefer, headers = {} } = {}) {
  // Les nouvelles clés « sb_secret_… » ne sont pas des JWT : elles se passent uniquement par l'en-tête apikey.
  // Les anciennes clés service_role (JWT) acceptent les deux en-têtes.
  const authHeader = SRK.split('.').length === 3 ? { Authorization: 'Bearer ' + SRK } : {};
  const r = await fetch(SB + '/rest/v1/' + path, { method, headers: Object.assign({ apikey: SRK, 'Content-Type': 'application/json', Accept: 'application/json' }, authHeader, prefer ? { Prefer: prefer } : {}, headers), body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`Supabase ${method} ${path.split('?')[0]} : ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

// ---------------- Garmin ----------------
class Garmin {
  constructor(userId) { this.userId = userId; this.calls = 0; }
  keyHash() { return createHash('sha256').update(env.GARMIN_PERSONAL_API_KEY).digest('hex').slice(0, 16); }
  async token(force) {
    if (!force) {
      const [c] = await sb(`garmin_token?user_id=eq.${this.userId}&select=access_token,expires_at,key_hash`);
      if (c && c.key_hash === this.keyHash() && new Date(c.expires_at) - Date.now() > 3600e3) return (this.tok = c.access_token);
    }
    const r = await fetch(GARMIN + '/personalapitoken-service/personal-api/personal-api-key/token', { method: 'POST', headers: { Accept: '*/*', Authorization: 'ApiKey ' + env.GARMIN_PERSONAL_API_KEY, 'User-Agent': 'Cockpit/1.0 (usage personnel)' } });
    const t = (await r.text()).trim().replace(/^"|"$/g, '');
    if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? `Garmin refuse la clé d'API (${r.status}) : clé expirée, révoquée ou mal copiée dans les secrets GitHub.` : `Jeton Garmin : HTTP ${r.status} ${t.slice(0, 200)}`);
    let exp = Date.now() + 23 * 3600e3;
    try { exp = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).exp * 1000; } catch (e) { }
    await sb('garmin_token?on_conflict=user_id', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { user_id: this.userId, access_token: t, expires_at: new Date(exp).toISOString(), key_hash: this.keyHash() } });
    return (this.tok = t);
  }
  async get(path, params, accept = 'application/json') {
    const url = GARMIN + path + (params ? '?' + new URLSearchParams(params) : '');
    for (let attempt = 0; attempt < 3; attempt++) {
      await sleep(PAUSE); this.calls++;
      const r = await fetch(url, { headers: { Accept: accept, Authorization: 'Bearer ' + this.tok, 'User-Agent': 'Cockpit/1.0 (usage personnel)' } });
      if (r.ok) return accept === 'application/json' ? (r.status === 204 ? null : JSON.parse((await r.text()) || 'null')) : Buffer.from(await r.arrayBuffer());
      if (r.status === 401 && attempt === 0) { await this.token(true); continue; }
      if (r.status === 429 && attempt < 2) { await sleep(15000 * (attempt + 1)); continue; }
      throw new Error(`HTTP ${r.status} sur ${path} : ${(await r.text()).slice(0, 200)}`);
    }
  }
}

// Garmin ne documente pas les schémas de réponse : recherche défensive des champs
function* walk(o) { if (Array.isArray(o)) for (const v of o) yield* walk(v); else if (o && typeof o === 'object') { yield o; for (const v of Object.values(o)) yield* walk(v); } }
function num(o, ...paths) { for (const p of paths) { let c = o; for (const k of p.split('.')) c = c && typeof c === 'object' ? c[k] : undefined; if (typeof c === 'number' && isFinite(c)) return c; } return null; }
function dayOf(o) { for (const k of ['calendarDate', 'summaryDate', 'date', 'startDate']) { const v = o?.[k]; if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10); } return null; }
function* chunks(a, b, n) { for (let c = a; c <= b;) { const e = addDays(c, n - 1) < b ? addDays(c, n - 1) : b; yield [c, e]; c = addDays(e, 1); } }
const SPORTS = { running: 'running', street_running: 'running', trail_running: 'trailRunning', track_running: 'trackRunning', treadmill_running: 'treadmillRunning', indoor_running: 'treadmillRunning', walking: 'walking', hiking: 'hiking',
  cycling: 'cycling', road_biking: 'cycling', mountain_biking: 'cycling', gravel_cycling: 'cycling', indoor_cycling: 'indoorCycling', virtual_ride: 'indoorCycling', strength_training: 'strengthTraining',
  resort_skiing_snowboarding_ws: 'alpineSkiing', resort_skiing: 'alpineSkiing', cross_country_skiing_ws: 'crossCountrySkiing', yoga: 'mobility', pilates: 'mobility', mobility: 'mobility' };
const gmt = s => typeof s === 'string' ? Date.parse(s.slice(0, 19).replace(' ', 'T') + 'Z') || null : null;

async function syncRange(g, from, to, known) {
  const days = {}, counts = {}, errors = [], profile = {};
  const D = d => (days[d] = days[d] || {});
  const attempt = async (label, fn) => { try { return await fn(); } catch (e) { errors.push(`${label} : ${e.message}`); return null; } };
  const inRange = d => d >= from && d <= to;

  let nHrv = 0;
  for (const [a, b] of chunks(from, to, 28)) {
    const r = await attempt('VFC', () => g.get(`/hrv-service/hrv/daily/${a}/${b}`));
    for (const o of walk(r)) { const d = dayOf(o), v = num(o, 'lastNightAvg', 'lastNightAverage', 'hrvValue'); if (d && v && inRange(d)) { D(d).hrv = v; if (typeof o.status === 'string') D(d).hrvStatus = o.status; nHrv++; } }
  }
  log('VFC', nHrv);
  let nSleep = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const r = await attempt(`Sommeil ${d}`, () => g.get('/sleep-service/sleep/dailySleep', { date: d }));
    if (!r || typeof r !== 'object') continue;
    const dto = r.dailySleepDTO && typeof r.dailySleepDTO === 'object' ? r.dailySleepDTO : r, s = num(dto, 'sleepTimeSeconds');
    if (s > 0) {
      const x = D(d); x.sleepMin = s / 60;
      for (const [k, f] of [['deepMin', 'deepSleepSeconds'], ['remMin', 'remSleepSeconds'], ['lightMin', 'lightSleepSeconds'], ['awakeMin', 'awakeSleepSeconds']]) { const v = num(dto, f); if (v != null) x[k] = v / 60; }
      x.inBedMin = x.sleepMin + (x.awakeMin || 0);
      const sc = num(dto, 'sleepScores.overall.value'); if (sc != null) x.sleepScore = sc;
      nSleep++;
    }
    const st = dto.sleepStartTimestampLocal ?? dto.sleepStartTimestampGMT ?? r.sleepStartTimestampLocal;
    if (st != null) {
      const ms = typeof st === 'number' ? st : Date.parse(st);
      if (isFinite(ms)) D(d).sleepStart = Math.round(((new Date(ms).getUTCHours() * 60 + new Date(ms).getUTCMinutes()) + 1440) % 1440);
    }
    const rhr = num(r, 'restingHeartRate', 'dailySleepDTO.restingHeartRate'); if (rhr > 25 && rhr < 120) D(d).rhrSleep = rhr;
    const ah = num(r, 'avgOvernightHrv'); if (ah && !D(d).hrv) { D(d).hrv = ah; nHrv++; }
  }
  log('Nuits', nSleep);
  let nRhr = 0;
  for (const [a, b] of chunks(from, to, 28)) {
    const r = await attempt('Résumés quotidiens', () => g.get('/usersummary-service/v2/dailysummaries', { startDate: a, endDate: b }));
    for (const o of walk(r)) {
      const d = dayOf(o); if (!d || !inRange(d)) continue;
      let v = num(o, 'restingHeartRate', 'restingHeartRateValue', 'heartRate.restingValue', 'heartRate.restingHeartRate', 'heartRate.resting');
      if (v == null) for (const sub of walk(o)) { for (const [k, val] of Object.entries(sub)) if (/^resting(heart)?(rate)?(value)?$/i.test(k) && typeof val === 'number') { v = val; break; } if (v != null) break; }
      if (v > 25 && v < 120) { D(d).rhr = v; nRhr++; }
      const steps = num(o, 'totalSteps', 'steps', 'movement.steps');
      if (steps > 0) D(d).steps = Math.round(steps);
      const stress = num(o, 'averageStressLevel', 'avgStressLevel', 'stress.avgStressLevel');
      if (stress >= 0) D(d).stress = Math.round(stress);
      const bb = num(o, 'bodyBatteryMostRecentValue', 'bodyBatteryHighestValue', 'bodyBattery.highest');
      if (bb >= 0) D(d).bodyBattery = Math.round(bb);
      const kcal = num(o, 'totalKilocalories', 'activeKilocalories');
      if (kcal > 0) D(d).kcal = Math.round(kcal);
    }
  }
  for (const x of Object.values(days)) if (!x.rhr && x.rhrSleep) { x.rhr = x.rhrSleep; nRhr++; }
  log('FC repos', nRhr);
  let nW = 0;
  const wr = await attempt('Poids', () => g.get(`/weight-service/weight/range/${from}/${to}`, { includeAll: 'true' }));
  for (const o of walk(wr)) { const d = dayOf(o), w = num(o, 'latestWeight.weight', 'weight'); if (d && w && inRange(d)) { D(d).weight = Math.round((w > 500 ? w / 1000 : w) * 100) / 100; nW++; } }

  const pr = await attempt('Profil', () => g.get('/userprofile-service/userprofile/settings'));
  if (pr && typeof pr === 'object') {
    const u = pr.userData && typeof pr.userData === 'object' ? pr.userData : pr, w = num(u, 'weight'), h = num(u, 'height');
    if (w) profile.massKg = Math.round((w > 500 ? w / 1000 : w) * 10) / 10;
    if (h) profile.heightCm = Math.round(h > 3 ? h : h * 100);
    if (typeof u.birthDate === 'string') profile.birthYear = +u.birthDate.slice(0, 4);
    const v = num(u, 'vo2MaxRunning'); if (v) profile.vo2maxGarmin = v;
  }
  const zr = await attempt('Zones FC', () => g.get('/biometric-service/heartRateZones/v2'));
  for (const o of walk(zr)) { const mx = num(o, 'maxHeartRateUsed', 'maxHeartRate'), rs = num(o, 'restingHeartRateUsed', 'restingHeartRate'); if (mx > 120 && mx < 230 && !profile.maxHR) profile.maxHR = mx; if (rs > 25 && rs < 100 && !profile.restingHR) profile.restingHR = rs; }

  // Activités
  const found = [];
  for (let start = 0; start <= 1000; start += 50) {
    const r = await attempt('Activités', () => g.get('/activitylist-service/activities/search/activities', { start, limit: 50, startDate: from, endDate: to }));
    const lst = Array.isArray(r) ? r : (r?.activityList || r?.activities || []);
    found.push(...lst.filter(a => a && a.activityId)); if (lst.length < 50) break;
  }
  const fresh = found.filter(a => !known.has(String(a.activityId)));
  const rows = []; let nFit = 0;
  for (const [i, a] of fresh.entries()) {
    const id = String(a.activityId), t = a.activityType || {};
    let act = null;
    if (i < MAX_DOWNLOADS) {
      const zip = await attempt(`FIT ${id}`, () => g.get(`/download-service/files/activity/${id}`, null, 'application/zip, application/x-zip-compressed, application/octet-stream'));
      if (zip) {
        try {
          const ab = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength);
          const isZip = zip[0] === 0x50 && zip[1] === 0x4b;
          const files = isZip ? await ctx.unzipFiles(ab) : [{ name: id + '.fit', buf: ab }];
          if (files[0]) { act = ctx.FIT.activity(files[0].buf); nFit++; }
        } catch (e) { errors.push(`FIT ${a.activityName || id} illisible : ${e.message} (résumé utilisé)`); }
      }
    }
    if (!act) {
      const start = gmt(a.startTimeGMT) || gmt(a.startTimeLocal); if (!start) { errors.push(`${a.activityName || id} : date inconnue`); continue; }
      act = { sport: SPORTS[t.typeKey] || 'other', start, elapsed: num(a, 'elapsedDuration', 'duration') || 0, timer: num(a, 'movingDuration', 'duration'), dist: num(a, 'distance'), up: num(a, 'elevationGain'), down: num(a, 'elevationLoss'),
        avgHR: num(a, 'averageHR'), maxHR: num(a, 'maxHR'), kcal: num(a, 'calories'), samples: [], fields: ['Résumé Garmin (sans fichier FIT)'], warnings: ['Fichier FIT non récupéré : pas de courbes ni de découplage.'] };
    } else if (act.sport === 'other' && SPORTS[t.typeKey]) act.sport = SPORTS[t.typeKey];
    const samples = act.samples || []; delete act.samples;
    Object.assign(act, { id: 'garmin:' + id, garminId: id, source: 'garmin', name: a.activityName || null, nSamples: samples.length, pending: true });
    rows.push({ id: act.id, start_at: new Date(act.start).toISOString(), doc: act, samples });
  }
  if (fresh.length > MAX_DOWNLOADS) errors.push(`${fresh.length - MAX_DOWNLOADS} activité(s) sans fichier FIT (limite de ${MAX_DOWNLOADS} par synchronisation) : relance une synchronisation.`);
  const nSteps = Object.values(days).filter(x => x.steps).length;
  Object.assign(counts, { 'VFC nocturne': nHrv, 'Nuits': nSleep, 'FC de repos': nRhr, 'Pesées': nW, 'Journées de pas': nSteps, 'Activités trouvées': found.length, 'Nouvelles activités': fresh.length, 'Fichiers FIT': nFit });
  return { days, rows, counts, errors, profile };
}

async function main() {
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) if (!env[k]) throw new Error(`Secret ${k} manquant (Settings › Secrets and variables › Actions)`);
  // Utilisateur
  let userId = env.COCKPIT_USER_ID;
  if (!userId) {
    const st = await sb('cockpit_state?select=user_id&order=updated_at.desc&limit=2');
    if (!st.length) { log('Aucun utilisateur : connecte-toi une première fois à l\'app.'); return; }
    if (st.length > 1) throw new Error('Plusieurs comptes : renseigne le secret COCKPIT_USER_ID');
    userId = st[0].user_id;
  }
  // Faut-il synchroniser ?
  const runs = await sb(`sync_runs?user_id=eq.${userId}&select=id,status,source,range_from,range_to,finished_at,requested_at&order=id.desc&limit=30`);
  const requested = runs.filter(r => r.status === 'requested');
  const lastDone = runs.find(r => r.status === 'done');
  const due = !lastDone || Date.now() - new Date(lastDone.finished_at) > EVERY_H * 3600e3;
  const stale = runs.filter(r => r.status === 'running' && Date.now() - new Date(r.requested_at) > 3 * 3600e3);
  for (const r of stale) await sb(`sync_runs?id=eq.${r.id}`, { method: 'PATCH', body: { status: 'error', error: 'Interrompue (délai dépassé)', finished_at: new Date().toISOString() } });
  if (!requested.length && !due && env.FORCE !== '1') { log('Rien à faire (dernière synchro', lastDone?.finished_at, ')'); return; }

  const today = iso(new Date());
  let from, to = today, runIds;
  if (requested.length) {
    from = requested.map(r => r.range_from).filter(Boolean).sort()[0] || addDays(today, -29);
    to = requested.map(r => r.range_to).filter(Boolean).sort().pop() || today;
    runIds = requested.map(r => r.id);
  } else {
    from = lastDone?.range_to ? addDays(lastDone.range_to, -2) : addDays(today, -89);
    if (from < addDays(today, -29) && lastDone) from = addDays(today, -29);
    const [run] = await sb('sync_runs', { method: 'POST', prefer: 'return=representation', body: { user_id: userId, source: env.FORCE === '1' ? 'manual' : 'auto', status: 'running', range_from: from, range_to: to, started_at: new Date().toISOString() } });
    runIds = [run.id];
  }
  if (from > to) from = to;
  const ids = runIds.join(',');
  await sb(`sync_runs?id=in.(${ids})`, { method: 'PATCH', body: { status: 'running', started_at: new Date().toISOString() } });
  log(`Synchro ${from} → ${to} (demandes ${ids})`);
  try {
    if (!env.GARMIN_PERSONAL_API_KEY) throw new Error('Secret GARMIN_PERSONAL_API_KEY manquant (Settings › Secrets and variables › Actions)');
    const g = new Garmin(userId); await g.token();
    // Activités déjà connues : identifiants Garmin des lignes existantes
    const known = new Set();
    for (let off = 0; ; off += 1000) {
      const page = await sb(`cockpit_activities?user_id=eq.${userId}&select=id,gid:doc->>garminId&limit=1000&offset=${off}`);
      for (const r of page) { if (r.gid) known.add(String(r.gid)); if (r.id.startsWith('garmin:')) known.add(r.id.slice(7)); }
      if (page.length < 1000) break;
    }
    const res = await syncRange(g, from, to, known);
    const dayRows = Object.entries(res.days).map(([day, data]) => ({ user_id: userId, day, data }));
    for (let i = 0; i < dayRows.length; i += 200) await sb('garmin_days?on_conflict=user_id,day', { method: 'POST', prefer: 'resolution=merge-duplicates', body: dayRows.slice(i, i + 200) });
    for (const r of res.rows) await sb('cockpit_activities?on_conflict=user_id,id', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: Object.assign({ user_id: userId }, r) });
    res.counts['Requêtes Garmin'] = g.calls;
    await sb(`sync_runs?id=in.(${ids})`, { method: 'PATCH', body: { status: 'done', finished_at: new Date().toISOString(), range_from: from, range_to: to, report: { counts: res.counts, errors: res.errors, profile: res.profile } } });
    log('Terminé', JSON.stringify(res.counts), res.errors.length ? `${res.errors.length} alerte(s)` : '');
    for (const e of res.errors) log('  ⚠', e);
  } catch (e) {
    await sb(`sync_runs?id=in.(${ids})`, { method: 'PATCH', body: { status: 'error', finished_at: new Date().toISOString(), error: String(e.message || e).slice(0, 500) } });
    throw e;
  }
}

main().catch(e => { console.error('Échec :', e.message); process.exit(1); });
