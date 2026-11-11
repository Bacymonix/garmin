'use strict';
// ===================== Analyses avancées =====================
// Tout ce qui est calculé ici est descriptif. Les modèles sont nommés, leur domaine de validité
// est vérifié, et chaque résultat porte une confiance. Rien n'est extrapolé en silence.

const BEST_DISTS = [400, 800, 1000, 1609, 3000, 5000, 10000, 15000, 21097.5, 42195];
const DIST_LABEL = { 400: '400 m', 800: '800 m', 1000: '1 km', 1609: '1 mile', 3000: '3 km', 5000: '5 km', 10000: '10 km', 15000: '15 km', 21097.5: 'Semi', 42195: 'Marathon' };
const FOOT = new Set(['running', 'trailRunning', 'trackRunning', 'treadmillRunning']);
const ROAD = new Set(['running', 'trackRunning', 'treadmillRunning']);

// ----- Meilleurs efforts d'une activité : temps le plus court couvrant chaque distance -----
function bestEfforts(samples, dists = BEST_DISTS) {
  const s = samples.filter(x => x[3] != null).sort((a, b) => a[0] - b[0]);
  const out = {};
  if (s.length < 3) return out;
  const span = s[s.length - 1][3] - s[0][3];
  for (const target of dists) {
    if (span < target) continue;
    let best = Infinity, j = 1;
    for (let i = 0; i < s.length - 1; i++) {
      if (j <= i) j = i + 1;
      while (j < s.length && s[j][3] - s[i][3] < target) j++;
      if (j >= s.length) break;
      const prev = s[j - 1], seg = s[j][3] - prev[3];
      const frac = seg > 0 ? (target - (prev[3] - s[i][3])) / seg : 0;
      const t = prev[0] + frac * (s[j][0] - prev[0]) - s[i][0];
      if (t > 0 && t < best) best = t;
    }
    if (isFinite(best)) out[target] = best;
  }
  return out;
}

// ----- Allure corrigée de la pente (coût énergétique de Minetti et al., 2002) -----
const FLAT_COST = minettiCost(0);
function gapSpeed(v, grade) {
  const c = minettiCost(Math.max(-0.45, Math.min(0.45, grade || 0)));
  return c ? v * c / FLAT_COST : v;
}
// Vitesse plate équivalente moyenne d'une activité
function activityGap(samples) {
  const s = samples.filter(x => x[2] != null).sort((a, b) => a[0] - b[0]);
  let num = 0, den = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const dt = s[i + 1][0] - s[i][0];
    if (!(dt > 0) || dt > 30 || !(s[i][2] > 0.5)) continue;
    const dd = (s[i + 1][3] != null && s[i][3] != null) ? s[i + 1][3] - s[i][3] : s[i][2] * dt;
    const da = (s[i + 1][4] != null && s[i][4] != null) ? s[i + 1][4] - s[i][4] : 0;
    num += gapSpeed(s[i][2], dd > 0 ? da / dd : 0) * dt; den += dt;
  }
  return den ? { v: num / den, movingS: den } : null;
}

// ----- Tours au kilomètre -----
function splits(samples, unit = 1000) {
  const s = samples.filter(x => x[3] != null).sort((a, b) => a[0] - b[0]);
  if (s.length < 3) return [];
  const out = []; let mark = s[0][3] + unit, t0 = s[0][0], alt0 = s[0][4], hrSum = 0, hrT = 0, gapNum = 0, gapDen = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const dt = s[i + 1][0] - s[i][0];
    if (dt > 0 && dt <= 30) {
      if (s[i][1]) { hrSum += s[i][1] * dt; hrT += dt; }
      if (s[i][2] > 0.5) {
        const dd = s[i + 1][3] - s[i][3], da = (s[i + 1][4] != null && s[i][4] != null) ? s[i + 1][4] - s[i][4] : 0;
        gapNum += gapSpeed(s[i][2], dd > 0 ? da / dd : 0) * dt; gapDen += dt;
      }
    }
    if (s[i + 1][3] >= mark) {
      const seg = s[i + 1][3] - s[i][3], frac = seg > 0 ? (mark - s[i][3]) / seg : 0;
      const t = s[i][0] + frac * (s[i + 1][0] - s[i][0]);
      const alt = s[i][4] != null && s[i + 1][4] != null ? s[i][4] + frac * (s[i + 1][4] - s[i][4]) : null;
      out.push({ km: out.length + 1, s: t - t0, hr: hrT ? hrSum / hrT : null, up: alt != null && alt0 != null ? alt - alt0 : null, gap: gapDen ? gapNum / gapDen : null });
      t0 = t; alt0 = alt; mark += unit; hrSum = hrT = gapNum = gapDen = 0;
    }
  }
  const restD = s[s.length - 1][3] - (mark - unit);
  if (restD > unit * 0.15) out.push({ km: out.length + 1, partial: restD / unit, s: s[s.length - 1][0] - t0, hr: hrT ? hrSum / hrT : null, up: alt0 != null && s[s.length - 1][4] != null ? s[s.length - 1][4] - alt0 : null, gap: gapDen ? gapNum / gapDen : null });
  return out;
}

// ----- Réserve anaérobie D′ au fil de l'effort (forme différentielle de Skiba) -----
function dPrimeBalance(samples, cs, dp) {
  if (!(cs > 0 && dp > 0)) return null;
  const s = samples.filter(x => x[2] != null).sort((a, b) => a[0] - b[0]);
  let bal = dp, min = dp; const curve = [];
  for (let i = 0; i < s.length - 1; i++) {
    const dt = s[i + 1][0] - s[i][0]; if (!(dt > 0) || dt > 30) continue;
    const v = s[i][2];
    if (v > cs) bal -= (v - cs) * dt;
    else bal += (dp - bal) * (1 - Math.exp(-(cs - v) * dt / dp));
    bal = Math.min(dp, bal); if (bal < min) min = bal;
    curve.push([s[i][0], bal]);
  }
  return { curve, min, spent: dp - min, exhausted: min <= 0 };
}

// ----- Répartition en zones de fréquence cardiaque -----
const ZONE_LABEL = ['Sous Z1', 'Z1 récupération', 'Z2 endurance', 'Z3 tempo', 'Z4 seuil', 'Z5 maximale'];
const ZONE_COLOR = ['var(--line)', 'var(--deep)', 'var(--accent)', 'var(--good)', 'var(--mid)', 'var(--low)'];
// Trois domaines (Seiler) : facile sous le premier seuil, intermédiaire, dur au-dessus du second
function threeZones(minutes) {
  const easy = minutes[0] + minutes[1] + minutes[2], mod = minutes[3], hard = minutes[4] + minutes[5];
  const tot = easy + mod + hard;
  if (!tot) return null;
  const p = [easy / tot * 100, mod / tot * 100, hard / tot * 100];
  const shape = p[0] >= 75 && p[2] >= 5 && p[1] <= 15 ? 'polarisée' : p[1] > 25 ? 'centrée sur le seuil' : p[0] >= 85 ? 'surtout facile' : 'pyramidale';
  return { easy, mod, hard, pct: p, total: tot, shape };
}

// ----- Monotonie et contrainte hebdomadaires (Foster et al., 1998) -----
function fosterWeek(loadByDay, from, to) {
  const v = D.range(from, to).map(d => loadByDay[d] || 0);
  const total = v.reduce((a, b) => a + b, 0), m = St.mean(v), sd = St.sd(v);
  if (!total || !sd) return null;
  const mono = m / sd;
  return { total, mono, strain: total * mono, days: v.filter(x => x > 0).length };
}

// ----- Meilleurs efforts de l'historique, et modèles de prédiction -----
function allBests(activities, from) {
  const best = {}, where = {};
  for (const a of activities) {
    if (!ROAD.has(a.sport) || !a.samples?.length) continue;
    if (from && D.ofTime(a.start) < from) continue;
    const b = bestEfforts(a.samples);
    for (const d in b) if (!best[d] || b[d] < best[d]) { best[d] = b[d]; where[d] = a.id; }
  }
  return { best, where };
}
// Exposant de Riegel ajusté sur ses propres records plutôt que la valeur générique de 1,06
function riegelFit(best) {
  const pts = Object.entries(best).map(([d, t]) => [Math.log(+d), Math.log(t)]).filter(p => isFinite(p[1]));
  if (pts.length < 3) return null;
  const f = St.linreg(pts.map(p => p[0]), pts.map(p => p[1]));
  if (!f) return null;
  return { k: f.slope, r2: f.r2, n: pts.length, predict: d => Math.exp(f.intercept + f.slope * Math.log(d)) };
}
// Plusieurs modèles indépendants ; on montre l'accord ou le désaccord entre eux
function racePrediction(dist, ctx) {
  const out = [];
  const { best, riegel, cs } = ctx;
  const ref = Object.entries(best).map(([d, t]) => ({ d: +d, t })).filter(p => p.t >= 180 && p.t <= 3600).sort((a, b) => b.d - a.d)[0];
  if (ref) {
    const v = VDOT.of(ref.d, ref.t);
    out.push({ name: 'VDOT (Daniels)', t: VDOT.predict(dist, v), note: `d'après ton ${DIST_LABEL[ref.d] || Math.round(ref.d) + ' m'} en ${fmtDur(ref.t)}` });
  }
  if (riegel && riegel.n >= 3) out.push({ name: `Riegel, exposant ${fx(riegel.k, 3)}`, t: riegel.predict(dist), note: `ajusté sur ${riegel.n} de tes records` });
  if (cs && RANK[cs.conf] >= 2 && dist <= 21098) {
    const t = (dist - cs.dp) / cs.cs;
    if (t > 0) out.push({ name: 'Vitesse critique', t, note: dist > 15000 ? 'au-delà du domaine du modèle' : `CS ${fx(cs.cs * 3.6, 2)} km/h`, weak: dist > 15000 });
  }
  const strong = out.filter(o => !o.weak);
  if (!strong.length) return { models: out, range: null };
  const ts = strong.map(o => o.t);
  return { models: out, range: [Math.min(...ts), Math.max(...ts)], spread: (Math.max(...ts) - Math.min(...ts)) / Math.min(...ts) };
}

// ----- Efficacité aérobie sur les sorties faciles -----
function efSeries(activities, maxHR) {
  const out = [];
  for (const a of activities) {
    if (!FOOT.has(a.sport) || !a.samples?.length || !a.avgHR) continue;
    const z = timeInZones(a.samples.filter(x => x[1]), maxHR), tot = z.reduce((x, y) => x + y, 0);
    if (!tot || (z[4] + z[5]) / tot > 0.08) continue;          // on écarte les séances intenses
    const g = activityGap(a.samples); if (!g) continue;
    out.push([D.num(D.ofTime(a.start)), g.v * 60 / a.avgHR, a.id]);   // mètres par minute et par battement
  }
  return out.sort((x, y) => x[0] - y[0]);
}

// ----- Force : pente de progression de la force estimée -----
function strengthTrend(series, weeks = 8) {
  if (series.length < 3) return null;
  const cut = series[series.length - 1][0] - weeks * 7;
  const pts = series.filter(p => p[0] >= cut);
  if (pts.length < 3) return null;
  const f = St.linreg(pts.map(p => p[0]), pts.map(p => p[1]));
  if (!f) return null;
  const perWeek = f.slope * 7, ci = f.seB != null ? 1.96 * f.seB * 7 : null;
  return { perWeek, ci, r2: f.r2, n: pts.length, sure: ci != null && Math.abs(perWeek) > ci };
}
// Tonnage hebdomadaire par muscle principal
function tonnage(strength, lib, from, to) {
  const out = {};
  for (const s of strength) {
    const d = D.ofTime(s.start); if (d < from || d > to) continue;
    for (const x of s.sets) {
      if (x.warm || !(x.load > 0) || !(x.reps > 0)) continue;
      const e = lib[x.ex]; if (!e) continue;
      for (const m of e.p) out[m] = (out[m] || 0) + x.load * x.reps;
    }
  }
  return out;
}
// Série hebdomadaire du volume par muscle (séries principales)
function weeklyVolume(strength, lib, weeks, endDay) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const to = D.add(endDay, -7 * w), from = D.add(to, -6), by = {};
    for (const s of strength) {
      const d = D.ofTime(s.start); if (d < from || d > to) continue;
      for (const x of s.sets) { if (x.warm) continue; const e = lib[x.ex]; if (!e) continue; for (const m of e.p) by[m] = (by[m] || 0) + 1; }
    }
    out.push({ from, to, by });
  }
  return out;
}

// ----- Cache par activité -----
const ANA = new Map();
function anaOf(a) {
  const key = a.id + '|' + (a.samples?.length || 0);
  if (ANA.has(key)) return ANA.get(key);
  const P = S.profile, smp = a.samples || [];
  const r = { splits: [], best: {}, zones: null, three: null, gap: null, dp: null };
  if (smp.length > 2 && FOOT.has(a.sport)) {
    r.splits = splits(smp);
    r.best = bestEfforts(smp);
    r.gap = activityGap(smp);
  }
  if (smp.some(x => x[1]) && P.maxHR) { r.zones = timeInZones(smp, P.maxHR); r.three = threeZones(r.zones); }
  const cs = csCurrent();
  if (cs && RANK[cs.conf] >= 2 && FOOT.has(a.sport) && smp.length > 2) r.dp = dPrimeBalance(smp, cs.cs, cs.dp);
  ANA.set(key, r);
  return r;
}

// ----- Vitesse critique : efforts maximaux saisis à la main, complétés par les records mesurés -----
let CS_CACHE = { key: null, val: null, bests: null };
function csCurrent() { return csBundle().cs; }
function csBundle() {
  const key = S.activities.length + '|' + (S.perfs || []).length + '|' + S.activities.filter(a => a.samples).length;
  if (CS_CACHE.key === key) return CS_CACHE.val;
  const { best, where } = allBests(S.activities);
  const pts = (S.perfs || []).map(p => ({ d: p.d, t: p.t, max: p.max, src: 'manuel' }));
  for (const d in best) if (best[d] >= 120 && best[d] <= 900) pts.push({ d: +d, t: best[d], max: true, src: 'mesuré', act: where[d] });
  // un seul point par distance : le meilleur
  const byD = {};
  for (const p of pts) if (!byD[p.d] || p.t < byD[p.d].t) byD[p.d] = p;
  const used = Object.values(byD);
  const val = { cs: csFit(used), used, best, where, riegel: riegelFit(best) };
  CS_CACHE = { key, val };
  return val;
}

// ===================== Sommeil =====================
// Score explicite, construit à partir de quatre composantes mesurables. Ce n'est pas le score Garmin,
// et ce n'est pas une mesure clinique : c'est un résumé de ce que tes propres données montrent.
const SLEEP_PARTS = [
  { id: 'duration', label: 'Durée', max: 50 },
  { id: 'continuity', label: 'Continuité', max: 20 },
  { id: 'stages', label: 'Phases', max: 15 },
  { id: 'regularity', label: 'Régularité', max: 15 }
];
function sleepScore(day, needH) {
  const m = S.metrics[day]; if (!m || !(m.sleepMin > 0)) return null;
  const need = (needH || S.profile.sleepNeed || 8) * 60;
  const parts = {}, missing = [];
  // Durée : pleine au-dessus du besoin, puis deux points perdus pour un point manquant
  const ratio = m.sleepMin / need;
  parts.duration = 50 * Math.max(0, Math.min(1, 1 - 2 * (1 - ratio)));
  parts.ratio = ratio;
  // Continuité : temps éveillé pendant la nuit
  const awake = m.inBedMin != null && m.inBedMin > m.sleepMin ? m.inBedMin - m.sleepMin : m.awakeMin;
  if (awake != null) parts.continuity = 20 * Math.max(0, Math.min(1, (60 - awake) / 40));
  else missing.push('continuity');
  // Phases : part de sommeil profond et paradoxal dans les fourchettes usuelles de l'adulte
  if (m.deepMin != null && m.remMin != null && m.sleepMin > 0) {
    const deep = m.deepMin / m.sleepMin, rem = m.remMin / m.sleepMin;
    const band = (v, lo, hi) => v >= lo && v <= hi ? 1 : Math.max(0, 1 - (v < lo ? (lo - v) / lo : (v - hi) / hi) * 2);
    parts.stages = 15 * (band(deep, 0.13, 0.23) * 0.5 + band(rem, 0.20, 0.25) * 0.5);
  } else missing.push('stages');
  // Régularité : dispersion de l'heure d'endormissement sur 14 nuits
  const starts = D.range(D.add(day, -13), day).map(d => S.metrics[d]?.sleepStart).filter(v => v != null)
    .map(v => v > 720 ? v - 1440 : v);        // ramène 23 h 30 à −30 min pour éviter la coupure de minuit
  if (starts.length >= 5) {
    const sd = St.sd(starts);
    parts.regularity = 15 * Math.max(0, Math.min(1, (90 - sd) / 60));
    parts.regularitySd = sd;
  } else missing.push('regularity');
  const used = SLEEP_PARTS.filter(p2 => parts[p2.id] != null);
  const got = used.reduce((a, p2) => a + parts[p2.id], 0), maxi = used.reduce((a, p2) => a + p2.max, 0);
  const score = Math.round(got / maxi * 100);
  const weak = used.filter(p2 => parts[p2.id] / p2.max < 0.7).sort((x, y) => parts[x.id] / x.max - parts[y.id] / y.max)[0];
  return { score, parts, missing, used, weak, conf: missing.length === 0 ? 'high' : missing.length === 1 ? 'moderate' : 'low',
    need, sleepMin: m.sleepMin, awake, deepMin: m.deepMin, remMin: m.remMin, lightMin: m.lightMin, start: m.sleepStart, prov: m.sleepProv };
}
const SLEEP_WORD = s => s >= 85 ? 'Excellente nuit' : s >= 72 ? 'Bonne nuit' : s >= 58 ? 'Nuit correcte' : s >= 42 ? 'Nuit juste' : 'Mauvaise nuit';
const WEAK_TIP = { duration: 'C\'est la durée qui manque : tout le reste était bon.', continuity: 'Nuit hachée : tu es resté éveillé longtemps au milieu.',
  stages: 'Répartition des phases inhabituelle pour toi — alcool, repas tardif ou séance tard le soir en sont les causes les plus fréquentes.',
  regularity: 'Tes heures de coucher sont très variables : c\'est le levier le plus simple à corriger.' };
function sleepSeries(day, n = 30) {
  return D.range(D.add(day, -(n - 1)), day).map(d => ({ d, s: sleepScore(d) })).filter(x => x.s);
}

// ----- Trace GPS : projection locale simple, suffisante pour dessiner un parcours -----
function routeOf(samples) {
  const pts = samples.filter(x => x[5] != null && x[6] != null);
  if (pts.length < 8) return null;
  const lat0 = St.mean(pts.map(p => p[5])), k = Math.cos(lat0 * Math.PI / 180);
  const xs = pts.map(p => p[6] * k), ys = pts.map(p => -p[5]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = x1 - x0 || 1e-6, h = y1 - y0 || 1e-6, sc = 1 / Math.max(w, h);
  return { pts: pts.map((p, i) => [(xs[i] - x0) * sc, (ys[i] - y0) * sc]), ratio: w / h, n: pts.length };
}

// ===================== VO2max =====================
// Plusieurs estimations indépendantes, chacune avec sa source et sa limite. Aucune n'est une mesure :
// toutes passent par une performance ou une fréquence cardiaque, donc elles mélangent consommation
// maximale d'oxygène, économie de course et gestion de l'allure.
const BEST_DURS = [360, 720, 1200, 1800, 3600];
function bestDistances(samples, durs = BEST_DURS) {
  const s = samples.filter(x => x[3] != null).sort((a, b) => a[0] - b[0]);
  const out = {};
  if (s.length < 3) return out;
  const span = s[s.length - 1][0] - s[0][0];
  for (const T of durs) {
    if (span < T) continue;
    let best = 0, j = 1;
    for (let i = 0; i < s.length - 1; i++) {
      if (j <= i) j = i + 1;
      while (j < s.length && s[j][0] - s[i][0] < T) j++;
      if (j >= s.length) break;
      const prev = s[j - 1], dt = s[j][0] - prev[0];
      const frac = dt > 0 ? (T - (prev[0] - s[i][0])) / dt : 0;
      const d = prev[3] + frac * (s[j][3] - prev[3]) - s[i][3];
      if (d > best) best = d;
    }
    if (best > 0) out[T] = best;
  }
  return out;
}
// Meilleures distances sur une fenêtre, à plat sur toutes les sorties sur route
function allBestDistances(from, to) {
  const out = {}, where = {};
  for (const a of S.activities) {
    if (!ROAD.has(a.sport) || !a.samples?.length) continue;
    const d = D.ofTime(a.start); if ((from && d < from) || (to && d > to)) continue;
    const b = bestDistances(a.samples);
    for (const k in b) if (!out[k] || b[k] > out[k]) { out[k] = b[k]; where[k] = a.id; }
  }
  return { dist: out, where };
}

function vo2maxEstimates(from, to) {
  const P = S.profile, out = [];
  const { dist, where } = allBestDistances(from, to);
  // Demi-Cooper : la vitesse tenue 6 minutes sert de vitesse maximale aérobie
  let mas = null;
  if (dist[360]) {
    mas = dist[360] / 360 * 3.6;
    out.push({ id: 'leger', name: 'Vitesse maximale aérobie', v: 3.5 * mas, src: `6 min à ${fx(mas, 1)} km/h`,
      ref: 'Léger & Mercier, 1984', act: where[360], caveat: 'Juste seulement si ces 6 minutes étaient un vrai effort maximal.' });
    out.push({ id: 'acsm', name: 'Équation de course ACSM', v: 0.2 * (dist[360] / 6) + 3.5, src: `6 min à ${fx(mas, 1)} km/h`,
      ref: 'ACSM, composante horizontale', act: where[360], caveat: 'Valable sur le plat ; la pente et le vent la faussent.' });
  }
  if (dist[720]) out.push({ id: 'cooper', name: 'Test de Cooper', v: (dist[720] - 504.9) / 44.73, src: `${Math.round(dist[720])} m en 12 min`,
    ref: 'Cooper, 1968', act: where[720], caveat: 'Conçu pour un 12 minutes couru à fond, sur piste.' });
  // Daniels : effort entre 3 et 15 minutes
  const { best } = csBundle();
  // On retient le record qui donne le VDOT le plus haut : c'est celui qui était
  // le plus proche d'un effort maximal, les autres étant forcément sous-maximaux.
  const cand = Object.entries(best).map(([d, t]) => ({ d: +d, t, lbl: DIST_LABEL[+d] || Math.round(+d) + ' m' }))
    // Les meilleures distances sur durée fixe comptent aussi : un 6 ou 12 minutes
    // pris dans une sortie est un effort continu, au même titre qu'un record.
    .concat([360, 720].filter(s => dist[s]).map(s => ({ d: dist[s], t: s, lbl: Math.round(dist[s]) + ' m' })))
    .map(p => ({ ...p, v: VDOT.of(p.d, p.t) }))
    .filter(p => p.t >= 180 && p.t <= 900 && isFinite(p.v));
  const ref = cand.sort((a, b) => b.v - a.v)[0];
  if (ref) out.push({ id: 'vdot', name: 'VDOT de Daniels', v: ref.v, src: `${ref.lbl} en ${fmtDur(ref.t)}`,
    ref: 'Daniels & Gilbert', caveat: 'Indice de performance : une bonne économie de course le fait monter sans que la consommation d\'oxygène change.' });
  // Rapport des fréquences cardiaques, indépendant de toute performance
  if (P.maxHR > 100 && P.restingHR > 25) out.push({ id: 'uth', name: 'Rapport FC max / FC repos', v: 15.3 * (P.maxHR / P.restingHR),
    src: `${Math.round(P.maxHR)} / ${Math.round(P.restingHR)} bpm`, ref: 'Uth et al., 2004', se: 2.7,
    caveat: 'Erreur type de 2,7 ml/kg/min chez des hommes entraînés. Très sensible à la fréquence de repos, qui varie avec le sommeil et le stress.' });
  if (P.vo2maxGarmin) out.push({ id: 'garmin', name: 'Estimation de ta montre', v: P.vo2maxGarmin, src: 'Garmin', ref: 'modèle Firstbeat, non public',
    caveat: 'Calculée par la montre à partir de la fréquence cardiaque et de l\'allure ; sa méthode n\'est pas publiée.' });
  const vals = out.map(o => o.v).filter(v => isFinite(v) && v > 20 && v < 95);
  if (!vals.length) return { list: out, median: null, mas };
  const med = St.median(vals), lo = Math.min(...vals), hi = Math.max(...vals);
  return { list: out.sort((a, b) => b.v - a.v), median: med, lo, hi, spread: hi - lo, mas,
    conf: out.length >= 3 && hi - lo <= 5 ? 'high' : out.length >= 2 && hi - lo <= 9 ? 'moderate' : 'low' };
}
// Évolution : une estimation par fenêtre glissante de 28 jours
function vo2Trend(day, weeks = 26) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const to = D.add(day, -7 * w), from = D.add(to, -27);
    const e = vo2maxEstimates(from, to);
    const perf = e.list.filter(x => ['leger', 'cooper', 'vdot', 'acsm'].includes(x.id)).map(x => x.v);
    if (perf.length) out.push([D.num(to), St.median(perf)]);
  }
  return out;
}
