// Serveur de test : authentification Supabase simulée + sous-ensemble de PostgREST exécuté sur un vrai
// PostgreSQL (rôles et règles RLS réels) + faux serveur Garmin + fichiers statiques de l'app.
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';
const require = createRequire(import.meta.url);
const pg = require('pg'); pg.types.setTypeParser(20, Number); pg.types.setTypeParser(1082, s => s);

const PORT = 9910, ROOT = new URL('..', import.meta.url).pathname;
const pool = new pg.Pool({ host: '/var/tmp/cockpitpg', port: 5433, user: 'postgres', database: 'cockpit', max: 5 });
const SECRET = 'test-secret';
const b64u = b => Buffer.from(b).toString('base64url');
export const jwt = claims => { const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), p = b64u(JSON.stringify(claims)); return `${h}.${p}.${createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url')}`; };
const claimsOf = tok => { try { const [h, p, s] = tok.split('.'); if (createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url') !== s) return null; return JSON.parse(Buffer.from(p, 'base64url')); } catch (e) { return null; } };
const USERS = { 'benjamin@test.fr': { id: '11111111-1111-1111-1111-111111111111', pw: 'motdepasse' }, 'autre@test.fr': { id: '22222222-2222-2222-2222-222222222222', pw: 'autre' } };
const refresh = {};
const LOG = [];

function session(email) {
  const u = USERS[email], now = Math.floor(Date.now() / 1000), rt = randomUUID();
  refresh[rt] = email;
  const user = { id: u.id, aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  return { access_token: jwt({ sub: u.id, role: 'authenticated', email, aud: 'authenticated', exp: now + 3600, iat: now }), token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: rt, user };
}

// ---------- PostgREST (sous-ensemble) ----------
const ident = s => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Object.assign(new Error('identifiant invalide ' + s), { status: 400 }); return '"' + s + '"'; };
function colExpr(c) { const m = c.match(/^([a-z_]+)(->>?)([A-Za-z_]+)$/); return m ? `${ident(m[1])}${m[2]}'${m[3]}'` : ident(c); }
function parseSelect(sel) {
  if (!sel || sel === '*') return '*';
  return sel.split(',').map(x => { const [a, b] = x.includes(':') ? x.split(':') : [null, x]; return colExpr(b) + (a ? ' AS ' + ident(a) : (b.includes('->') ? ' AS ' + ident(b.split(/->>?/).pop()) : '')); }).join(', ');
}
function parseIn(v) { const inner = v.slice(1, -1), out = []; let cur = '', q = false; for (const ch of inner) { if (ch === '"') { q = !q; continue; } if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } if (inner.length) out.push(cur); return out; }
const OPS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };
function where(params, vals) {
  const w = [];
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    const dot = v.indexOf('.'), op = v.slice(0, dot), val = v.slice(dot + 1);
    if (op === 'in') { vals.push(parseIn(val)); w.push(`${ident(k)} = ANY($${vals.length})`); }
    else if (op === 'is') w.push(`${ident(k)} IS ${val === 'null' ? 'NULL' : val === 'true' ? 'TRUE' : 'FALSE'}`);
    else if (OPS[op]) { vals.push(val); w.push(`${ident(k)} ${OPS[op]} $${vals.length}`); }
    else throw Object.assign(new Error('opérateur non géré ' + op), { status: 400 });
  }
  return w.length ? ' WHERE ' + w.join(' AND ') : '';
}
async function rest(req, res, url, body) {
  const table = url.pathname.split('/')[3], T = 'public.' + ident(table), p = url.searchParams;
  const key = req.headers.apikey || '';
  if (key.startsWith('sb_secret_') && req.headers.authorization) return send(res, 401, { message: 'Invalid JWT: ne pas envoyer une clé sb_secret_ en Authorization' });
  const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
  const cl = key.startsWith('sb_secret_') ? { role: 'service_role' } : (claimsOf(tok) || claimsOf(key));
  if (!cl) return send(res, 401, { message: 'JWT invalide' });
  const prefer = req.headers.prefer || '', ret = prefer.includes('return=representation'), vals = [];
  let sql;
  if (req.method === 'GET') {
    sql = `SELECT ${parseSelect(p.get('select'))} FROM ${T}${where(p, vals)}`;
    if (p.get('order')) sql += ' ORDER BY ' + p.get('order').split(',').map(o => { const [c, d] = o.split('.'); return ident(c) + (d === 'desc' ? ' DESC' : ' ASC'); }).join(', ');
    if (p.get('limit')) sql += ' LIMIT ' + (+p.get('limit'));
    if (p.get('offset')) sql += ' OFFSET ' + (+p.get('offset'));
  } else if (req.method === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    const cols = p.get('columns') ? p.get('columns').split(',').map(c => c.replace(/"/g, '')) : Object.keys(rows[0]);
    vals.push(JSON.stringify(rows));
    const cl2 = cols.map(ident).join(', ');
    sql = `INSERT INTO ${T} (${cl2}) SELECT ${cl2} FROM json_populate_recordset(null::${T}, $1::json)`;
    if (p.get('on_conflict')) {
      const oc = p.get('on_conflict').split(',').map(ident).join(', ');
      sql += prefer.includes('ignore-duplicates') ? ` ON CONFLICT (${oc}) DO NOTHING` : ` ON CONFLICT (${oc}) DO UPDATE SET ` + cols.map(c => `${ident(c)} = EXCLUDED.${ident(c)}`).join(', ');
    }
    if (ret) sql += ' RETURNING ' + parseSelect(p.get('select'));
  } else if (req.method === 'PATCH') {
    const cols = Object.keys(body); vals.push(JSON.stringify(body));
    sql = `UPDATE ${T} SET (${cols.map(ident).join(', ')}) = (SELECT ${cols.map(ident).join(', ')} FROM json_populate_record(null::${T}, $1::json))${cols.length === 1 ? '' : ''}${where(p, vals)}`;
    if (cols.length === 1) sql = sql.replace(`SET (${ident(cols[0])}) =`, `SET (${ident(cols[0])}) = ROW`).replace('= ROW (SELECT', '= (SELECT');
    if (ret) sql += ' RETURNING ' + parseSelect(p.get('select'));
  } else if (req.method === 'DELETE') {
    sql = `DELETE FROM ${T}${where(p, vals)}`;
    if (ret) sql += ' RETURNING ' + parseSelect(p.get('select'));
  } else return send(res, 405, {});
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(`SET LOCAL ROLE ${cl.role === 'service_role' ? 'service_role' : cl.role === 'authenticated' ? 'authenticated' : 'anon'}`);
    await c.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [cl.sub || '']);
    const r = await c.query(sql, vals);
    await c.query('COMMIT');
    LOG.push(`${cl.role} ${req.method} ${table} → ${r.rowCount}`);
    if (req.method !== 'GET' && !ret) return send(res, req.method === 'POST' ? 201 : 204, null);
    const accept = req.headers.accept || '';
    if (accept.includes('vnd.pgrst.object')) { if (r.rows.length !== 1) return send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `${r.rows.length} rows` }); return send(res, 200, r.rows[0]); }
    return send(res, req.method === 'POST' ? 201 : 200, r.rows);
  } catch (e) {
    await c.query('ROLLBACK').catch(() => { });
    LOG.push(`${cl.role} ${req.method} ${table} ERREUR ${e.message}`);
    return send(res, e.status || (e.code === '42501' ? 403 : 400), { code: e.code, message: e.message, details: null, hint: null });
  } finally { c.release(); }
}

// ---------- Faux Garmin ----------
const FIT = readFileSync(new URL('./fixture.fit', import.meta.url));
function zipOf(name, data) { // archive ZIP minimale (deflate)
  const comp = zlib.deflateRawSync(data), crc = zlib.crc32 ? zlib.crc32(data) : 0, n = Buffer.from(name);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(n.length, 28);
  const cdOff = 30 + n.length + comp.length, cd = Buffer.concat([ch, n]);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(cdOff, 16);
  return Buffer.concat([lh, n, comp, cd, end]);
}
const ZIP = zipOf('20000001_ACTIVITY.fit', FIT);
const rnd = (seed) => { let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (a, b) => { h = (h * 1103515245 + 12345) >>> 0; return a + (h % (b - a + 1)); }; };
const days = (a, b) => { const out = []; for (let d = new Date(a + 'T12:00:00Z'); d <= new Date(b + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10)); return out; };
export const GARMIN = { hits: 0, keys: new Set(['good-key']) };
function garmin(req, res, url) {
  GARMIN.hits++;
  const p = url.pathname.replace('/garmin', ''), q = Object.fromEntries(url.searchParams), auth = req.headers.authorization || '', r = rnd(p + url.search);
  if (p.startsWith('/personalapitoken-service')) { const k = auth.replace('ApiKey ', ''); if (!GARMIN.keys.has(k)) return send(res, 401, { message: 'invalid' }); return send(res, 200, jwt({ exp: Math.floor(Date.now() / 1000) + 86400 }), 'text/plain'); }
  if (!auth.startsWith('Bearer ')) return send(res, 401, {});
  if (p.startsWith('/hrv-service/hrv/daily/')) { const [a, b] = p.split('/').slice(-2); return send(res, 200, { hrvSummaries: days(a, b).map(d => ({ calendarDate: d, weeklyAvg: 60, lastNightAvg: r(52, 72), status: 'BALANCED' })) }); }
  if (p === '/sleep-service/sleep/dailySleep') return send(res, 200, { dailySleepDTO: { calendarDate: q.date, sleepTimeSeconds: r(23000, 29000), deepSleepSeconds: 4500, remSleepSeconds: 6000, lightSleepSeconds: 14000, awakeSleepSeconds: 900, sleepScores: { overall: { value: 78 } }, sleepStartTimestampLocal: Date.parse(q.date + 'T22:4' + (r(0, 9)) + ':00Z') }, restingHeartRate: r(45, 51), avgOvernightHrv: 61 });
  if (p === '/usersummary-service/v2/dailysummaries') return send(res, 200, { data: days(q.startDate, q.endDate).map(d => ({ calendarDate: d, movement: { steps: 9000 }, totalSteps: r(7000, 14000), averageStressLevel: r(18, 42), bodyBatteryMostRecentValue: r(35, 80), totalKilocalories: r(2400, 3200), heartRate: { restingValue: r(45, 51) } })) });
  if (p.startsWith('/weight-service/weight/range/')) { const b = p.split('/').pop(); return send(res, 200, { dailyWeightSummaries: [{ summaryDate: b, latestWeight: { weight: 70800 } }] }); }
  if (p === '/userprofile-service/userprofile/settings') return send(res, 200, { userData: { weight: 70800, height: 178, birthDate: '2004-03-02', gender: 'MALE', vo2MaxRunning: 57 } });
  if (p === '/biometric-service/heartRateZones/v2') return send(res, 200, [{ sport: 'DEFAULT', maxHeartRateUsed: 193, restingHeartRateUsed: 47 }]);
  if (p === '/activitylist-service/activities/search/activities') {
    if (q.start !== '0') return send(res, 200, []);
    const y = new Date(Date.now() - 86400e3).toISOString().slice(0, 10);
    return send(res, 200, [{ activityId: 20000001, activityName: 'Trail fixture', startTimeGMT: '2024-11-08 11:33:20', activityType: { typeKey: 'trail_running' }, duration: 620, distance: 1808 },
      { activityId: 20000002, activityName: 'Footing Annecy', startTimeGMT: y + ' 17:05:00', activityType: { typeKey: 'running' }, duration: 2700, movingDuration: 2650, distance: 8900, elevationGain: 40, averageHR: 141, maxHR: 158 }]);
  }
  if (p === '/download-service/files/activity/20000001') { res.writeHead(200, { 'Content-Type': 'application/zip' }); return res.end(ZIP); }
  if (p.startsWith('/download-service/')) return send(res, 500, { error: 'boom' });
  send(res, 404, {});
}

function send(res, code, obj, ct = 'application/json') {
  const body = obj === null ? '' : typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': '*' });
  res.end(body);
}
const MIME = { html: 'text/html', js: 'text/javascript', json: 'application/json', webmanifest: 'application/manifest+json', png: 'image/png', css: 'text/css' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204, null);
  let raw = ''; for await (const c of req) raw += c;
  const body = raw ? JSON.parse(raw) : null;
  try {
    if (url.pathname.startsWith('/garmin')) return garmin(req, res, url);
    if (url.pathname === '/__log') return send(res, 200, LOG.splice(0));
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password') { const u = USERS[body.email]; if (!u || u.pw !== body.password) return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials', error: 'invalid_grant', error_description: 'Invalid login credentials' }); return send(res, 200, session(body.email)); }
      if (url.searchParams.get('grant_type') === 'refresh_token') { const e = refresh[body.refresh_token]; if (!e) return send(res, 400, { error: 'invalid_grant' }); return send(res, 200, session(e)); }
    }
    if (url.pathname === '/auth/v1/user') { const cl = claimsOf((req.headers.authorization || '').slice(7)); if (!cl) return send(res, 401, {}); return send(res, 200, { id: cl.sub, email: cl.email, aud: 'authenticated', role: 'authenticated' }); }
    if (url.pathname === '/auth/v1/logout') return send(res, 204, null);
    if (url.pathname.startsWith('/rest/v1/')) return await rest(req, res, url, body);
    // fichiers statiques de l'app ; config.js de test
    if (url.pathname === '/config.js') return send(res, 200, `window.COCKPIT_CONFIG={supabaseUrl:'http://127.0.0.1:${PORT}',supabaseAnonKey:'${jwt({ role: 'anon', iss: 'test' })}',githubRepo:'Bacymonix/garmin',workflow:'garmin-sync.yml'};`, 'text/javascript');
    const f = ROOT + (url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    if (existsSync(f)) { res.writeHead(200, { 'Content-Type': MIME[f.split('.').pop()] || 'application/octet-stream' }); return res.end(readFileSync(f)); }
    send(res, 404, { message: 'introuvable ' + url.pathname });
  } catch (e) { console.error(e); send(res, 500, { message: e.message }); }
}).listen(PORT, () => console.log('mock prêt', PORT, 'service_role=' + jwt({ role: 'service_role' })));
