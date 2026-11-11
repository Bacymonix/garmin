'use strict';
// ===== Moteur (portage JavaScript de CockpitCore) =====

const p2 = n => String(n).padStart(2, '0');
const DAYMS = 86400000;
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const D = {
  num(iso) { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAYMS); },
  iso(n) { return new Date(n * DAYMS).toISOString().slice(0, 10); },
  add(iso, n) { return D.iso(D.num(iso) + n); },
  diff(a, b) { return D.num(b) - D.num(a); },
  wd(iso) { return ((D.num(iso) + 3) % 7 + 7) % 7 + 1; },
  monday(iso) { return D.add(iso, -(D.wd(iso) - 1)); },
  range(a, b) { const o = []; for (let n = D.num(a); n <= D.num(b); n++) o.push(D.iso(n)); return o; },
  realToday() { const t = new Date(); return `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}`; },
  ofTime(ms) { const t = new Date(ms); return `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}`; },
  at(iso, h, m = 0) { const [y, mo, d] = iso.split('-').map(Number); return new Date(y, mo - 1, d, h, m).getTime(); },
  short(iso) { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; },
  long(iso) { return `${WEEKDAYS[D.wd(iso) - 1]} ${D.short(iso)} ${iso.slice(0, 4)}`; },
  wdLabel(iso) { return WEEKDAYS[D.wd(iso) - 1]; }
};

const St = {
  mean: a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null,
  sd(a) { if (a.length < 2) return null; const m = St.mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); },
  median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; },
  linreg(x, y) {
    const n = x.length; if (n < 2) return null;
    const mx = St.mean(x), my = St.mean(y); let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); syy += (y[i] - my) ** 2; }
    if (sxx === 0) return null;
    const b = sxy / sxx, a = my - b * mx, res = x.map((xi, i) => y[i] - (a + b * xi)), sse = res.reduce((s, r) => s + r * r, 0);
    const s2 = n > 2 ? sse / (n - 2) : null;
    return { slope: b, intercept: a, r2: syy > 0 ? 1 - sse / syy : null, res, seB: s2 != null ? Math.sqrt(s2 / sxx) : null, seA: s2 != null ? Math.sqrt(s2 * (1 / n + mx * mx / sxx)) : null, n };
  }
};

const EWMA = {
  lambda: (tau, dt = 1) => 1 - Math.exp(-dt / tau),
  update: (prev, v, gap, tau) => prev == null ? v : EWMA.lambda(tau, Math.max(gap, 0)) * v + (1 - EWMA.lambda(tau, Math.max(gap, 0))) * prev
};

// ----- VFC et références individuelles -----
function classify(z, band = 0.5) { if (z == null) return 'insufficient'; return z < -band ? 'below' : z > band ? 'above' : 'within'; }
const BASE_LABEL = { within: 'Dans ta plage habituelle', below: 'Sous ta plage habituelle', above: 'Au-dessus de ta plage habituelle', insufficient: 'Historique insuffisant' };

function hrvAnalyze(readings, method, c = { win: 60, min: 14, tau: 7, band: 0.5, atyp: 3, lo: 3, hi: 300 }) {
  const byDay = {};
  for (const r of readings) if (r.method === method) byDay[r.date] = r.value;
  const valid = Object.keys(byDay).sort().filter(d => { const v = byDay[d]; return isFinite(v) && v > 0 && v >= c.lo && v <= c.hi; }).map(d => [d, byDay[d], Math.log(byDay[d])]);
  const out = []; let trend = null, last = null;
  valid.forEach(([day, value, ln], idx) => {
    const ws = D.add(day, -c.win);
    const base = valid.slice(0, idx).filter(v => v[0] >= ws && v[0] < day).map(v => v[2]);
    const flags = []; let mean = null, sd = null, z = null;
    if (base.length >= c.min) { mean = St.mean(base); sd = St.sd(base); if (sd > 0) z = (ln - mean) / sd; else flags.push('Écart-type de référence nul'); }
    else flags.push(`Référence : ${base.length}/${c.min} jours valides`);
    if (z != null && Math.abs(z) > c.atyp) flags.push('Valeur atypique : vérifier la mesure');
    trend = EWMA.update(trend, ln, last ? D.diff(last, day) : 1, c.tau); last = day;
    const tz = (mean != null && sd > 0) ? (trend - mean) / sd : null;
    out.push({ date: day, value, ln, mean, sd, n: base.length, z, trend, tz, status: classify(z, c.band), trendStatus: classify(tz, c.band), flags });
  });
  return out;
}

function baselineAnalyze(map, win = 60, min = 14, tau = 7, band = 0.5) {
  const items = Object.keys(map).filter(k => isFinite(map[k])).sort().map(k => [k, map[k]]);
  const out = []; let trend = null, last = null;
  items.forEach(([day, v], i) => {
    const ws = D.add(day, -win);
    const base = items.slice(0, i).filter(x => x[0] >= ws && x[0] < day).map(x => x[1]);
    let mean = null, sd = null, z = null;
    if (base.length >= min) { mean = St.mean(base); sd = St.sd(base); if (sd > 0) z = (v - mean) / sd; }
    trend = EWMA.update(trend, v, last ? D.diff(last, day) : 1, tau); last = day;
    const tz = (mean != null && sd > 0) ? (trend - mean) / sd : null;
    out.push({ date: day, value: v, mean, sd, n: base.length, z, trend, tz, status: classify(z, band), trendStatus: classify(tz, band) });
  });
  return out;
}

// ----- Sommeil -----
function sleepSummary(nights, end, needH = 8) {
  const by = {}; for (const n of nights) by[n.date] = n;
  const last7 = D.range(D.add(end, -6), end).map(d => by[d]).filter(Boolean);
  const def = n => Math.max(0, needH * 60 - n.sleepMin);
  let ew = null, last = null;
  for (const d of Object.keys(by).sort()) { if (d > end) continue; ew = EWMA.update(ew, def(by[d]), last ? D.diff(last, d) : 1, 7); last = d; }
  const pts = D.range(D.add(end, -27), end).map((d, i) => by[d] ? [i, by[d].sleepMin] : null).filter(Boolean);
  const fit = pts.length >= 7 ? St.linreg(pts.map(p => p[0]), pts.map(p => p[1])) : null;
  const effs = last7.filter(n => n.inBedMin > 0 && n.sleepMin <= n.inBedMin).map(n => n.sleepMin / n.inBedMin * 100);
  const n7 = last7.length;
  return { nights: n7, missing: 7 - n7, avg: St.mean(last7.map(n => n.sleepMin)), deficit: last7.reduce((s, n) => s + def(n), 0), ewma: ew,
    eff: St.mean(effs), trend: fit ? fit.slope : null,
    deep: St.mean(last7.filter(n => n.deepMin != null).map(n => n.deepMin / n.sleepMin * 100)),
    rem: St.mean(last7.filter(n => n.remMin != null).map(n => n.remMin / n.sleepMin * 100)),
    conf: n7 === 0 ? 'insufficient' : n7 <= 3 ? 'low' : n7 <= 5 ? 'moderate' : 'high' };
}

// ----- TRIMP et charge -----
function trimpWeight(hrr, sex) { const [k, b] = sex === 'female' ? [0.86, 1.67] : [0.64, 1.92]; const x = Math.min(1, Math.max(0, hrr)); return x * k * Math.exp(b * x); }
function trimpBanister(samples, rest, max, sex, maxGap = 30) {
  // samples : [[t, hr], ...] ; somme de Riemann à gauche, pauses > maxGap exclues.
  if (!(max > rest) || !(rest > 0)) return null;
  const s = samples.filter(x => x[1] != null && isFinite(x[1])).sort((a, b) => a[0] - b[0]);
  if (s.length < 2) return null;
  let tot = 0, counted = 0, excl = 0, invalid = 0, above = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const dt = s[i + 1][0] - s[i][0]; if (dt <= 0) continue;
    if (dt > maxGap) { excl += dt / 60; continue; }
    const hr = s[i][1]; if (hr < 25 || hr > 250) { invalid++; continue; }
    const hrr = (hr - rest) / (max - rest); if (hrr > 1) above++;
    tot += dt / 60 * trimpWeight(hrr, sex); counted += dt / 60;
  }
  return { trimp: tot, counted, excl, invalid, above };
}
function trimpFromAverage(avg, minutes, rest, max, sex) { if (!(max > rest)) return null; return minutes * trimpWeight((avg - rest) / (max - rest), sex); }

function loadStates(loads, restDays, from, to) {
  const la = EWMA.lambda(7), lc = EWMA.lambda(42); let atl = 0, ctl = 0; const out = []; const unk = [];
  D.range(from, to).forEach((d, n) => {
    let status, load;
    if (loads[d] != null && isFinite(loads[d])) { status = 'recorded'; load = loads[d]; }
    else if (restDays.has(d)) { status = 'rest'; load = 0; } else { status = 'unknown'; load = 0; }
    atl = la * load + (1 - la) * atl; ctl = lc * load + (1 - lc) * ctl; unk.push(status === 'unknown');
    out.push({ date: d, load, status, atl, ctl, tsb: ctl - atl, acwr: ctl >= 1 ? atl / ctl : null, initW: Math.exp(-(n + 1) / 42), unknown42: unk.slice(-42).filter(Boolean).length });
  });
  return out;
}
const kmEffort = (km, up) => km + up / 100;
function recentVsRef(map, end, win = 3, ref = 28) {
  const sum = last => { let s = 0; for (let k = 0; k < win; k++) s += map[D.add(last, -k)] || 0; return s; };
  const recent = sum(end); const refs = []; for (let k = win; k < win + ref; k++) refs.push(sum(D.add(end, -k)));
  const m = St.mean(refs); return { recent, ref: m, ratio: m > 0 ? recent / m : null };
}

// ----- Course -----
const VDOT = {
  vo2: v => -4.60 + 0.182258 * v + 0.000104 * v * v,
  frac: t => 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t),
  of(dist, secs) { const t = secs / 60; return VDOT.vo2(dist / t) / VDOT.frac(t); },
  vel(vo2) { const a = 0.000104, b = 0.182258, c = -4.60 - vo2; return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); },
  predict(dist, v) { let lo = 1, hi = 60000; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (VDOT.of(dist, m) > v) lo = m; else hi = m; } return (lo + hi) / 2; },
  pace(v, min = 60) { return 1000 / VDOT.vel(v * VDOT.frac(min)) * 60; }
};
function csFit(points) {
  const u = points.filter(p => p.max && p.d > 0 && p.t > 0);
  if (u.length < 2) return null;
  const f = St.linreg(u.map(p => p.t), u.map(p => p.d)); if (!f) return null;
  const warn = []; const out = u.filter(p => p.t < 120 || p.t > 900).length;
  if (out) warn.push(`${out} effort(s) hors de 2–15 min : CS probablement biaisée`);
  if (f.intercept < 0) warn.push('D′ négatif : données incohérentes');
  else if (f.intercept < 50 || f.intercept > 500) warn.push(`D′ de ${Math.round(f.intercept)} m, hors des valeurs habituelles (environ 100 à 300 m) : tes efforts n'étaient probablement pas tous maximaux`);
  if (u.length === 2) warn.push('Deux points : aucune estimation d\'erreur');
  let conf = u.length === 2 ? 'low' : u.length === 3 ? 'moderate' : 'high'; if (out || f.intercept < 50 || f.intercept > 500) conf = 'low';
  return { cs: f.slope, dp: f.intercept, r2: f.r2, res: f.res, se: f.seB, n: u.length, tmin: Math.min(...u.map(p => p.t)), tmax: Math.max(...u.map(p => p.t)), warn, conf };
}
const minettiCost = i => (i < -0.45 || i > 0.45) ? null : 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i * i + 19.5 * i + 3.6;
function decoupling(samples) {
  // samples : [t, hr, speed, dist, alt]
  const s = [...samples].sort((a, b) => a[0] - b[0]); const reasons = [];
  if (s.length < 10) return { pct: null, ok: false, reasons: ['Trop peu d\'échantillons'] };
  const iv = []; let pause = 0, total = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const dt = s[i + 1][0] - s[i][0]; if (dt <= 0) continue; total += dt;
    if (dt > 30) { pause += dt; continue; }
    if (!(s[i][1] > 0) || s[i][2] == null) continue;
    const climb = (s[i][4] != null && s[i + 1][4] != null) ? Math.max(0, s[i + 1][4] - s[i][4]) : 0;
    iv.push({ dt, v: s[i][2], hr: s[i][1], up: climb });
  }
  const moving = iv.reduce((a, x) => a + x.dt, 0);
  if (moving / 60 < 40) reasons.push('Durée en mouvement inférieure à 40 min');
  if (total > 0 && pause / total > 0.1) reasons.push(`Pauses trop importantes (${Math.round(pause / total * 100)} %)`);
  let acc = 0; const a = [], b = [];
  for (const x of iv) { (acc + x.dt / 2 <= moving / 2 ? a : b).push(x); acc += x.dt; }
  const ef = p => { const t = p.reduce((q, x) => q + x.dt, 0); if (!t) return null; const v = p.reduce((q, x) => q + x.v * x.dt, 0) / t * 60, h = p.reduce((q, x) => q + x.hr * x.dt, 0) / t; return v / h; };
  const u1 = a.reduce((q, x) => q + x.up, 0), u2 = b.reduce((q, x) => q + x.up, 0);
  if (Math.abs(u1 - u2) > 60) reasons.push(`Profil différent entre les moitiés (D+ ${Math.round(u1)} vs ${Math.round(u2)} m)`);
  const e1 = ef(a), e2 = ef(b); const pct = e1 && e2 ? (e1 - e2) / e1 * 100 : null;
  return { e1, e2, pct, ok: !reasons.length && pct != null, reasons };
}

// ----- Force -----
const Str = {
  epley: (w, r) => r <= 1 ? w : w * (1 + r / 30),
  brzycki: (w, r) => r >= 37 ? null : w * 36 / (37 - r),
  oneRM(w, r, f) { return f === 'epley' ? Str.epley(w, r) : Str.brzycki(w, r); },
  estimate(load, reps, rir, f = 'brzycki') {
    if (!(load > 0) || reps < 1) return null;
    const rEff = reps + Math.max(0, rir ?? 0); if (rEff > 15) return null;
    const value = Str.oneRM(load, rEff, f); if (value == null) return null;
    let rel = 'high'; const notes = [];
    if (rir == null) { rel = 'moderate'; notes.push('RIR non renseigné : série supposée à l\'échec'); }
    if (rir != null && rir > 4) { rel = 'moderate'; notes.push('RIR élevé : estimation moins précise'); }
    if (rEff > 10) { rel = 'low'; notes.push('Plus de 10 répétitions effectives'); }
    return { value, rEff, rel, notes, f };
  },
  suggest(orm, reps, rir, f = 'brzycki', inc = 1.25) {
    const rEff = reps + Math.max(0, rir); const raw = f === 'epley' ? (rEff <= 1 ? orm : orm / (1 + rEff / 30)) : orm * (37 - rEff) / 36;
    return inc > 0 ? Math.floor(raw / inc + 1e-9) * inc : raw;
  },
  inol: (reps, pct) => (pct >= 100 || pct < 0) ? null : reps / (100 - pct),
  stim(reps, rir, th = 4) { if (reps <= 0 || rir < 0) return 0; const firstK = Math.ceil(reps + rir - th); return Math.max(0, Math.min(reps, reps - Math.max(1, firstK) + 1)); }
};
const RANK = { insufficient: 0, low: 1, moderate: 2, high: 3 };

function volumeByMuscle(sets, lib) {
  const out = {}; const sess = {};
  const get = m => out[m] || (out[m] = { m, direct: 0, fract: 0, hard: 0, tonnage: 0, reps: 0, freq: 0, stim: 0 });
  for (const s of sets) {
    if (s.warm) continue; const e = lib[s.ex]; if (!e) continue;
    const hard = (s.rir ?? 0) <= 4, stim = Str.stim(s.reps, s.rir ?? 0);
    for (const m of e.p) { const v = get(m); v.direct++; v.fract++; if (hard) v.hard++; v.tonnage += s.load * s.reps; v.reps += s.reps; v.stim += stim; (sess[m] = sess[m] || new Set()).add(s.sid); }
    for (const m of e.s) if (!e.p.includes(m)) get(m).fract += 0.5;
  }
  for (const m in sess) out[m].freq = sess[m].size;
  return out;
}

// ----- Énergie et nutrition -----
const Energy = {
  cunningham: lbm => 500 + 22 * lbm,
  mifflin: (m, h, a, sex) => 10 * m + 6.25 * h - 5 * a + (sex === 'female' ? -161 : 5),
  tef: (p, c, f) => 0.25 * p * 4 + 0.075 * c * 4 + 0.02 * f * 9,
  adaptive(intake, weight, end, win = 21) {
    const start = D.add(end, -(win - 1));
    const ins = D.range(start, end).map(d => intake[d]).filter(v => v > 0);
    const ws = D.range(start, end).map((d, i) => weight[d] > 0 ? [i, weight[d]] : null).filter(Boolean);
    if (ins.length < 7 || ws.length < 5) return null;
    const f = St.linreg(ws.map(x => x[0]), ws.map(x => x[1])); if (!f) return null;
    const mean = St.mean(ins), tdee = mean - 7700 * f.slope, cov = ins.length / win;
    let conf = 'low'; if (ws.length >= 10 && cov >= 0.8) conf = 'moderate'; if (win >= 21 && ws.length >= 15 && cov >= 0.9) conf = 'high';
    return { tdee, slope: f.slope, mean, range: f.seB != null ? [tdee - 1.96 * f.seB * 7700, tdee + 1.96 * f.seB * 7700] : null, conf, nIn: ins.length, nW: ws.length };
  }
};
const CARB = { light: [3, 5], moderate: [5, 7], high: [6, 10], veryHigh: [8, 12] };
const CARB_LABEL = { light: 'légère', moderate: 'modérée', high: 'élevée', veryHigh: 'très élevée' };
const dayCategory = min => min < 45 ? 'light' : min < 90 ? 'moderate' : min <= 240 ? 'high' : 'veryHigh';

// ----- Programmation -----
// Version allégée d'une séance : une série de moins par exercice (minimum 2, ou 1 pour la mobilité), durée réduite d'environ 25 %
const LIGHT_CACHE = {};
function lighten(t) {
  if (LIGHT_CACHE[t.id]) return LIGHT_CACHE[t.id];
  const c = JSON.parse(JSON.stringify(t));
  c.title = t.title + ' · allégée'; c.lightOf = t.id;
  if (c.dur) c.dur = c.dur.map(x => Math.round(x * 0.75 / 5) * 5);
  for (const b of c.blocks) for (const x of b.ex) if (x.sets > 2) x.sets -= 1;
  c.notes = ['Version allégée : une série de moins par exercice, charges habituelles, RIR 2–3', ...c.notes];
  return (LIGHT_CACHE[t.id] = c);
}
const Plan = {
  phase(iso) { let p = null; for (const ph of PHASES) if (iso >= ph.start && iso <= ph.end) p = ph; return p; },
  weekIndex(iso, ph) { return D.diff(D.monday(ph.start), D.monday(iso)) / 7; },
  variant(iso) { const ph = Plan.phase(iso); return ph && Plan.weekIndex(iso, ph) % 2 === 1 ? 'b' : 'a'; },
  deload(iso) { const ph = Plan.phase(iso); return !!(ph && ph.deload && (Plan.weekIndex(iso, ph) + 1) % ph.deload === 0); },
  key: (iso, slot, tid) => `${iso}|${slot}|${tid}`,
  raceTemplate(ev, idx) {
    const days = D.diff(ev.start, ev.end) + 1;
    return { id: 'race_' + ev.id, title: ev.name + (days > 1 ? ` — jour ${idx + 1}/${days}` : ''), kind: 'race', intensity: 'race', dur: null,
      dist: ev.distanceKm ? [ev.distanceKm, ev.distanceKm] : null, up: ev.upM ? [ev.upM, ev.upM] : null,
      obj: ev.priority ? 'Compétition ' + LABELS.priority[ev.priority] : 'Compétition (priorité non définie)',
      blocks: [], notes: [PROVISIONAL.has(ev.status) ? 'Statut : ' + LABELS.evStatus[ev.status] : null, ev.effort || null].filter(Boolean), leg: ['longRun'], toLog: false };
  },
  raw(iso) {
    const ph = Plan.phase(iso), v = Plan.variant(iso);
    const ev = S.events.find(e => e.status !== 'cancelled' && iso >= e.start && iso <= e.end);
    if (ev) {
      const idx = D.diff(ev.start, iso), t = Plan.raceTemplate(ev, idx);
      return [{ id: Plan.key(iso, 'day', t.id), date: iso, slot: 'day', t, phase: ph?.id, variant: v, opt: ev.status === 'conditional' || ev.priority === 'optional', cond: PROVISIONAL.has(ev.status) ? LABELS.evStatus[ev.status] : null, alt: [], deload: false, eventId: ev.id, eventIdx: idx }];
    }
    if (!ph) return [];
    const wk = (typeof S !== 'undefined' && S.weekEdits?.[ph.week]) || WEEK_TEMPLATES[ph.week];
    const slots = wk?.days[D.wd(iso)] || [];
    const order = { morning: 0, day: 1, evening: 2 };
    return [...slots].sort((a, b) => order[a.slot] - order[b.slot]).map(p => {
      const tid = v === 'b' && p.b ? p.b : p.a; let t = TPL[tid]; if (!t) return null;
      if (p.light) t = lighten(t);
      return { id: Plan.key(iso, p.slot, tid), date: iso, slot: p.slot, t, phase: ph.id, variant: v, opt: p.opt, cond: p.cond, alt: p.alt || [], deload: Plan.deload(iso), eventId: null, light: !!p.light };
    }).filter(Boolean);
  },
  sessions(iso) {
    return Plan.raw(iso).map(s => {
      const r = S.sessions[s.id]; if (!r) return s;
      if (r.status === 'deleted') return null;
      if (r.templateId && r.templateId !== s.t.id && TPL[r.templateId]) return Object.assign({}, s, { t: s.light ? lighten(TPL[r.templateId]) : TPL[r.templateId] });
      return s;
    }).filter(Boolean);
  },
  enduranceMin(iso) { let m = 0; for (const s of Plan.sessions(iso)) if (isEndurance(s.t.kind) && s.t.kind !== 'walk' && s.t.dur) m += (s.t.dur[0] + s.t.dur[1]) / 2; return m; }
};
const isEndurance = k => ['run', 'trailRun', 'track', 'treadmill', 'bike', 'crossTraining', 'walk', 'race'].includes(k);
const isHard = i => ['threshold', 'vo2', 'sprint', 'race', 'tempo'].includes(i);
function effectiveStatus(s, linkedKeys, today) {
  const r = S.sessions[s.id];
  if (r && r.status && r.status !== 'planned') return r.status;
  if (linkedKeys.has(s.id)) return 'completed';
  return s.date < today ? 'missedNoReason' : 'planned';
}

function competitionSequences(events, horizon = 60, minFree = 14) {
  const list = events.filter(e => e.status !== 'cancelled').sort((a, b) => a.start < b.start ? -1 : 1);
  const out = [];
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1], gap = D.diff(a.end, b.start); if (gap > horizon) continue;
    const msg = [`${gap} jours entre ${a.name} et ${b.name}`]; let st = 'undetermined', free = null;
    if (gap <= 0) { out.push({ a, b, gap, free, st: 'conflict', msg: [...msg, 'Chevauchement'] }); continue; }
    if (a.recovery != null && gap <= a.recovery) { msg.push(`${b.name} tombe dans la récupération de ${a.name}`); st = 'conflict'; }
    if (b.taper != null) {
      const ts = D.add(b.start, -b.taper);
      if (a.end >= D.add(ts, -1)) { msg.push(`${a.name} a lieu juste avant ou pendant l'affûtage de ${b.name}`); if (st !== 'conflict') st = 'vigilance'; }
      else msg.push(`${D.diff(a.end, ts)} j entre ${a.name} et le début de l'affûtage de ${b.name}`);
    }
    if (a.recovery != null) {
      const f = gap - 1 - a.recovery - (b.taper ?? 0); free = f;
      if (b.taper == null) msg.push(`Affûtage de ${b.name} non défini (compté 0 j)`);
      if (f < 0) { msg.push(`Récupération et affûtage se chevauchent de ${-f} j`); st = 'conflict'; }
      else if (st !== 'conflict') { msg.push(`${f} j libres entre récupération et affûtage`); if (f < minFree) st = 'vigilance'; else if (st === 'undetermined') st = 'compatible'; }
    } else msg.push(`Fenêtre de récupération de ${a.name} non définie`);
    if (a.end > a.start) msg.push(`${a.name} s'étend sur ${D.diff(a.start, a.end) + 1} jours : efforts successifs`);
    if (a.priority === 'a' && b.priority === 'a') { msg.push('Deux objectifs A rapprochés'); if (st === 'compatible' || st === 'undetermined') st = 'vigilance'; }
    out.push({ a, b, gap, free, st, msg });
  }
  return out;
}
const SEQ_LABEL = { compatible: 'Compatible', vigilance: 'Vigilance', conflict: 'Chevauchement', undetermined: 'À évaluer' };

const COMPAT = {
  run: ['running', 'trailRunning', 'treadmillRunning', 'trackRunning'], trailRun: ['trailRunning', 'running', 'hiking'], track: ['trackRunning', 'running'],
  treadmill: ['treadmillRunning', 'running', 'walking'], bike: ['cycling', 'indoorCycling'], crossTraining: ['cycling', 'indoorCycling', 'hiking', 'walking', 'alpineSkiing', 'crossCountrySkiing', 'mobility'],
  walk: ['walking', 'hiking'], strength: ['strengthTraining', 'treadmillRunning', 'walking'], mobility: ['mobility', 'strengthTraining', 'other'],
  race: ['running', 'trailRunning', 'trackRunning', 'hiking', 'cycling', 'other'], rest: []
};
function matchActivity(a, sessions, linked) {
  const day = D.ofTime(a.start), hour = new Date(a.start).getHours();
  const cands = sessions.filter(s => !linked.has(s.id) && s.date === day && (COMPAT[s.t.kind] || []).includes(a.sport)).map(s => {
    const slotScore = s.slot === 'day' ? 1 : s.slot === 'morning' ? (hour >= 3 && hour < 12 ? 1 : 0.3) : (hour >= 15 ? 1 : 0.3);
    let score = slotScore;
    if (s.t.dur) { const m = (a.timer || a.elapsed) / 60, [lo, hi] = s.t.dur; const ds = m >= lo && m <= hi ? 1 : Math.max(0, 1 - Math.log2(m < lo ? lo / m : m / hi)); score = 0.5 * slotScore + 0.5 * ds; }
    return { id: s.id, score };
  }).filter(c => c.score >= 0.4).sort((x, y) => y.score - x.score);
  if (!cands.length) return { type: 'none' };
  const best = cands[0], second = cands[1];
  if (best.score >= 0.75 && (!second || best.score - second.score >= 0.15)) return { type: 'auto', id: best.id };
  return { type: 'validate', ids: cands.map(c => c.id) };
}
function isDuplicate(a, b) {
  const fam = s => ({ running: 'run', trailRunning: 'run', trackRunning: 'run', treadmillRunning: 'run', walking: 'walk', hiking: 'walk', cycling: 'bike', indoorCycling: 'bike' }[s] || s);
  if (fam(a.sport) !== fam(b.sport) || Math.abs(a.start - b.start) > 120000) return false;
  const l = Math.max(a.elapsed, b.elapsed); return l > 0 && Math.abs(a.elapsed - b.elapsed) / l <= 0.05;
}
function zoneOf(hr, max) { const f = hr / max; let z = 0; [0.5, 0.6, 0.7, 0.8, 0.9].forEach((b, i) => { if (f >= b) z = i + 1; }); return z; }
function timeInZones(samples, max) { const o = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < samples.length - 1; i++) { const dt = samples[i + 1][0] - samples[i][0]; if (dt > 0 && dt <= 30 && samples[i][1]) o[zoneOf(samples[i][1], max)] += dt / 60; } return o; }

// ----- Observations explicables -----
function observations(i) {
  const out = [], f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
  const lastH = i.hrv[i.hrv.length - 1];
  if (lastH && lastH.date >= D.add(i.today, -1)) {
    const ind = { 'VFC du jour': Math.round(lastH.value) + ' ms', 'Jours de référence': lastH.n };
    if (lastH.z != null) ind['Z du jour'] = f2(lastH.z); if (lastH.tz != null) ind['Z tendance 7 j'] = f2(lastH.tz);
    if (lastH.trendStatus === 'below') out.push({ id: 'hrv-low', cat: 'Récupération', lvl: 'attention', msg: 'La tendance de ta VFC sur 7 jours est sous ta plage habituelle.', ind, conf: 'moderate' });
    else if (lastH.trendStatus === 'within') out.push({ id: 'hrv-ok', cat: 'Récupération', lvl: 'info', msg: 'La tendance de ta VFC est dans ta plage habituelle.' + (lastH.status === 'below' ? ' La valeur du jour est basse, mais une valeur isolée n\'est pas un signal.' : ''), ind, conf: 'moderate' });
    else if (lastH.trendStatus === 'above') out.push({ id: 'hrv-high', cat: 'Récupération', lvl: 'info', msg: 'La tendance de ta VFC est au-dessus de ta plage habituelle.', ind, conf: 'moderate' });
    else out.push({ id: 'hrv-base', cat: 'Données', lvl: 'info', msg: `Référence VFC en construction (${lastH.n}/14 jours).`, ind, conf: 'insufficient' });
  } else out.push({ id: 'hrv-missing', cat: 'Données', lvl: 'info', msg: 'Pas de VFC récente : saisis la valeur nocturne Garmin dans le check-in.', ind: {}, conf: 'insufficient' });
  const r = i.rhr[i.rhr.length - 1];
  if (r && r.date >= D.add(i.today, -1) && r.trendStatus === 'above') out.push({ id: 'rhr', cat: 'Récupération', lvl: 'attention', msg: 'La tendance de ta FC de repos est au-dessus de ta plage habituelle.', ind: { 'FC de repos': Math.round(r.value) + ' bpm', 'Z tendance': f2(r.tz) }, conf: 'moderate' });
  if (i.sleep && i.sleep.nights) {
    const h = i.sleep.deficit / 60, att = h >= 5;
    out.push({ id: 'sleep', cat: 'Sommeil', lvl: att ? 'attention' : 'info', msg: att ? 'Ton déficit de sommeil s\'accumule sur la semaine.' : `Sommeil de la semaine : déficit cumulé de ${f1(h)} h.`, ind: { 'Déficit 7 j': f1(h) + ' h', 'Nuits renseignées': i.sleep.nights + '/7', 'Moyenne': i.sleep.avg ? f1(i.sleep.avg / 60) + ' h' : '–' }, conf: i.sleep.conf });
  }
  const t = i.trimp;
  if (t && t.ctl > 0) {
    const ind = { ATL: f1(t.atl), CTL: f1(t.ctl), TSB: f1(t.tsb) }; if (t.acwr != null) ind.ACWR = f2(t.acwr);
    let msg = `Charge cardiaque : TSB ${f1(t.tsb)}.`;
    if (t.acwr != null && (t.acwr < 0.8 || t.acwr > 1.3)) msg += ' ACWR hors du repère 0,8–1,3 (indicatif, non prédictif).';
    if (t.initW > 0.37) msg += ' Historique court : CTL peu interprétable.';
    out.push({ id: 'trimp', cat: 'Charge', lvl: 'info', msg, ind, conf: t.initW > 0.37 ? 'low' : 'moderate' });
  }
  const yest = D.add(i.today, -1), km = recentVsRef(i.kmEff, yest), lg = recentVsRef(i.legSets, yest);
  const li = {}; let high = false;
  if (km.ratio != null) { li['Km-effort 3 j / réf.'] = `${f1(km.recent)} / ${f1(km.ref)} (×${f2(km.ratio)})`; if (km.ratio > 1.3) high = true; }
  if (lg.ratio != null) { li['Séries jambes 3 j / réf.'] = `${f1(lg.recent)} / ${f1(lg.ref)} (×${f2(lg.ratio)})`; if (lg.ratio > 1.3) high = true; }
  if (high) {
    const sp = i.todaySessions.some(s => s.t.leg.includes('sprints') || s.t.leg.includes('plyometric'));
    out.push({ id: 'legs', cat: 'Jambes', lvl: 'attention', msg: 'Le travail des jambes des trois derniers jours dépasse ta référence récente.' + (sp ? ' Les sprints ou la pliométrie prévus aujourd\'hui peuvent être retirés si la fraîcheur manque.' : ''), ind: li, conf: 'moderate' });
  }
  if (i.yestSessions.some(s => s.t.leg.includes('plyometric')) && i.todaySessions.some(s => s.t.leg.includes('longRun')))
    out.push({ id: 'plyo', cat: 'Jambes', lvl: 'info', msg: 'Pliométrie hier et sortie longue aujourd\'hui : surveille la fraîcheur des jambes.', ind: {}, conf: 'high' });
  if (i.wellness && i.wellness.pain >= 4)
    out.push({ id: 'pain', cat: 'Récupération', lvl: 'attention', msg: `Douleur déclarée (${i.wellness.pain}/7${i.wellness.painLoc ? ', ' + i.wellness.painLoc : ''}). Ce n'est pas un diagnostic : en cas de douleur persistante, consulte un professionnel de santé.`, ind: {}, conf: 'high' });
  for (const e of i.events) {
    const d = D.diff(i.today, e.start); if (d < 0 || d > 21) continue;
    let msg = d === 0 ? `${e.name} aujourd'hui.` : `${e.name} dans ${d} j.`;
    if (e.taper != null && i.today >= D.add(e.start, -e.taper) && i.today < e.start) msg += ' Période d\'affûtage.';
    if (PROVISIONAL.has(e.status)) msg += ' Statut : ' + LABELS.evStatus[e.status].toLowerCase() + '.';
    out.push({ id: 'ev-' + e.id, cat: 'Compétitions', lvl: 'info', msg, ind: { Priorité: e.priority ? LABELS.priority[e.priority] : 'Non définie' }, conf: 'high' });
  }
  for (const s of i.sequences) {
    if (s.st !== 'vigilance' && s.st !== 'conflict') continue;
    const d = D.diff(i.today, s.a.start); if (d < -s.gap || d > 60) continue;
    out.push({ id: 'seq-' + s.a.id, cat: 'Compétitions', lvl: 'info', msg: `Enchaînement ${s.a.name} → ${s.b.name} : ${SEQ_LABEL[s.st].toLowerCase()}.`, ind: { Écart: s.gap + ' j' }, conf: 'moderate' });
  }
  return out.sort((a, b) => (a.lvl === b.lvl ? 0 : a.lvl === 'attention' ? -1 : 1));
}

// ----- Décodeur FIT (portage de FITDecoder.swift) -----
const FIT = {
  table: [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401, 0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400],
  crc(bytes, from, to) {
    let crc = 0;
    for (let i = from; i < to; i++) {
      const b = bytes[i]; let tmp = FIT.table[crc & 0xF]; crc = (crc >> 4) & 0x0FFF; crc = crc ^ tmp ^ FIT.table[b & 0xF];
      tmp = FIT.table[crc & 0xF]; crc = (crc >> 4) & 0x0FFF; crc = crc ^ tmp ^ FIT.table[(b >> 4) & 0xF];
    }
    return crc;
  },
  uint(b, p, n, big) { let v = 0; for (let i = 0; i < n; i++) v = v * 256 + b[p + (big ? i : n - 1 - i)]; return v; },
  num(b, p, size, bt, big) {
    const t = bt & 0x1F, w = { 0: 1, 1: 1, 2: 1, 10: 1, 13: 1, 3: 2, 4: 2, 11: 2, 5: 4, 6: 4, 8: 4, 12: 4 }[t];
    if (!w || size < w) return null;
    const raw = FIT.uint(b, p, w, big);
    switch (t) {
      case 0: case 2: case 13: return raw === 0xFF ? null : raw;
      case 10: return raw === 0 ? null : raw;
      case 1: return raw === 0x7F ? null : (raw > 127 ? raw - 256 : raw);
      case 3: return raw === 0x7FFF ? null : (raw > 32767 ? raw - 65536 : raw);
      case 4: return raw === 0xFFFF ? null : raw;
      case 11: return raw === 0 ? null : raw;
      case 5: return raw === 0x7FFFFFFF ? null : (raw > 0x7FFFFFFF ? raw - 0x100000000 : raw);
      case 6: return raw === 0xFFFFFFFF ? null : raw;
      case 12: return raw === 0 ? null : raw;
      case 8: { if (raw === 0xFFFFFFFF) return null; const dv = new DataView(new ArrayBuffer(4)); dv.setUint32(0, raw); const f = dv.getFloat32(0); return isFinite(f) ? f : null; }
    }
    return null;
  },
  decode(buf) {
    const b = new Uint8Array(buf); let pos = 0; const msgs = []; let parsed = false;
    while (pos < b.length) {
      if (b.length - pos < 12) { if (parsed) break; throw new Error('Fichier trop court pour être un FIT'); }
      const hs = b[pos]; if (hs !== 12 && hs !== 14) { if (parsed) break; throw new Error('En-tête FIT inattendu'); }
      if (String.fromCharCode(b[pos + 8], b[pos + 9], b[pos + 10], b[pos + 11]) !== '.FIT') throw new Error('Signature .FIT absente');
      const size = FIT.uint(b, pos + 4, 4, false), ds = pos + hs, de = ds + size;
      if (de + 2 > b.length) throw new Error('Fichier tronqué');
      if (FIT.uint(b, de, 2, false) !== FIT.crc(b, pos, de)) throw new Error('CRC invalide : fichier corrompu');
      const defs = {}; let p = ds, lastTs = null;
      const read = (def, at) => {
        const m = { g: def.g, f: {}, s: {} }; let q = at;
        for (const fd of def.fields) {
          if ((fd.bt & 0x1F) === 7) { let str = ''; for (let k = 0; k < fd.size && b[q + k]; k++) str += String.fromCharCode(b[q + k]); if (str) m.s[fd.n] = str; }
          else { const v = FIT.num(b, q, fd.size, fd.bt, def.big); if (v != null) m.f[fd.n] = v; }
          q += fd.size;
        }
        return m;
      };
      while (p < de) {
        const h = b[p++];
        if (h & 0x80) {
          const def = defs[(h >> 5) & 3]; if (!def) throw new Error('Message sans définition');
          const m = read(def, p); const off = h & 0x1F;
          if (lastTs != null) { let ts = (lastTs & 0xFFFFFFE0) + off; if (off < (lastTs & 0x1F)) ts += 0x20; m.f[253] = ts; lastTs = ts; }
          p += def.size; msgs.push(m);
        } else if (h & 0x40) {
          const big = b[p + 1] === 1, g = FIT.uint(b, p + 2, 2, big), n = b[p + 4]; p += 5;
          const fields = []; for (let k = 0; k < n; k++) fields.push({ n: b[p + 3 * k], size: b[p + 3 * k + 1], bt: b[p + 3 * k + 2] });
          p += 3 * n; let dev = 0;
          if (h & 0x20) { const nd = b[p++]; for (let k = 0; k < nd; k++) dev += b[p + 3 * k + 1]; p += 3 * nd; }
          defs[h & 0x0F] = { g, big, fields, size: fields.reduce((s, x) => s + x.size, 0) + dev };
        } else {
          const def = defs[h & 0x0F]; if (!def) throw new Error('Message sans définition');
          const m = read(def, p); if (m.f[253] != null) lastTs = m.f[253]; p += def.size; msgs.push(m);
        }
      }
      parsed = true; pos = de + 2;
    }
    return msgs;
  },
  sport(sp, sub) {
    if (sp === 1) return sub === 1 ? 'treadmillRunning' : sub === 3 ? 'trailRunning' : sub === 4 ? 'trackRunning' : 'running';
    if (sp === 2) return (sub === 5 || sub === 6) ? 'indoorCycling' : 'cycling';
    if (sp === 11) return 'walking'; if (sp === 16 || sp === 17) return 'hiking';
    if (sp === 12) return 'crossCountrySkiing'; if (sp === 13) return 'alpineSkiing';
    if (sp === 4 || sp === 10) return sub === 20 ? 'strengthTraining' : sub === 19 ? 'mobility' : 'other';
    return 'other';
  },
  activity(buf) {
    const msgs = FIT.decode(buf), g = n => msgs.filter(m => m.g === n);
    const fid = g(0)[0], ses = g(18)[0], sp = g(12)[0];
    if (fid && fid.f[0] != null && fid.f[0] !== 4) throw new Error('Ce fichier FIT n\'est pas une activité');
    const recs = g(20).filter(r => r.f[253] != null).sort((a, b) => a.f[253] - b.f[253]);
    const sport = FIT.sport(ses?.f[5] ?? sp?.f[0], ses?.f[6] ?? sp?.f[1]);
    const t0 = ses?.f[2] ?? recs[0]?.f[253] ?? fid?.f[4]; if (t0 == null) throw new Error('Aucune donnée exploitable');
    const fields = new Set(), samples = [];
    for (const r of recs) {
      const f = r.f, spd = f[73] != null ? f[73] / 1000 : f[6] != null ? f[6] / 1000 : null;
      const alt = f[78] != null ? f[78] / 5 - 500 : f[2] != null ? f[2] / 5 - 500 : null;
      const SEMI = 180 / 2147483648;
      samples.push([f[253] - t0, f[3] ?? null, spd, f[5] != null ? f[5] / 100 : null, alt,
        f[0] != null ? +(f[0] * SEMI).toFixed(5) : null, f[1] != null ? +(f[1] * SEMI).toFixed(5) : null, f[4] ?? null]);
      if (f[3] != null) fields.add('FC'); if (spd != null) fields.add('Vitesse'); if (alt != null) fields.add('Altitude');
      if (f[0] != null) fields.add('GPS'); if (f[4] != null) fields.add('Cadence'); if (f[7] != null) fields.add('Puissance');
      if (f[39] != null) fields.add('Oscillation verticale'); if (f[41] != null) fields.add('Temps de contact');
    }
    const hrs = samples.map(s => s[1]).filter(v => v != null);
    const elapsed = ses?.f[7] != null ? ses.f[7] / 1000 : (samples.length ? samples[samples.length - 1][0] : 0);
    const id = 'fitFile:' + (fid?.f[3] != null && fid?.f[4] != null ? `${fid.f[3]}-${fid.f[4]}` : `${t0}-${sport}`);
    if (g(19).length) fields.add('Tours'); if (ses?.f[11] != null) fields.add('Calories');
    // Sous-échantillonnage à 5 s pour limiter le stockage du navigateur.
    const thin = []; let lastT = -1e9;
    for (const s of samples) if (s[0] - lastT >= 5) { thin.push(s); lastT = s[0]; }
    return { id, source: 'fitFile', sport, start: (t0 + 631065600) * 1000, elapsed, timer: ses?.f[8] != null ? ses.f[8] / 1000 : null,
      dist: ses?.f[9] != null ? ses.f[9] / 100 : (samples.filter(s => s[3] != null).pop()?.[3] ?? null), up: ses?.f[22] ?? null, down: ses?.f[23] ?? null,
      avgHR: ses?.f[16] ?? (hrs.length ? St.mean(hrs) : null), maxHR: ses?.f[17] ?? (hrs.length ? Math.max(...hrs) : null), kcal: ses?.f[11] ?? null,
      samples: thin, fields: [...fields], warnings: hrs.length ? [] : ['Aucune fréquence cardiaque dans ce fichier'] };
  }
};

async function unzipFiles(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf); let e = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Archive ZIP illisible');
  const count = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = [];
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.slice(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (!/\.fit$/i.test(name)) continue;
    const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), data = u8.slice(start, start + csize);
    if (method === 0) out.push({ name, buf: data.buffer });
    else if (method === 8) out.push({ name, buf: await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer() });
  }
  return out;
}
