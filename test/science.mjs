// Vérifie les calculs scientifiques contre des valeurs connues, hors navigateur.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { console, Math, Date, JSON, Number, String, Object, Array, Set, Map, isFinite, isNaN, parseFloat, parseInt, Error, localStorage: { getItem: () => null, setItem: () => {} }, window: {}, document: { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} }, navigator: {} };
vm.createContext(ctx);
const src = ['seed.js', 'engine.js', 'analytics.js', 'coach.js'].map(f => readFileSync('../src/' + f, 'utf8')).join('\n');
vm.runInContext(src.replace(/'use strict';/g, '') + '\n;this.X = {bestDistances,bestEfforts,gapSpeed,splits,dPrimeBalance,threeZones,fosterWeek,riegelFit,racePrediction,VDOT,csFit,St,D,minettiCost,strengthTrend,timeInZones,zoneOf};', ctx);
const X = ctx.X;
let ko = 0;
const ok = (c, m, extra) => { console.log((c ? '✔ ' : '✘ ') + m + (extra ? '  ' + extra : '')); if (!c) ko++; };
const close = (a, b, tol) => Math.abs(a - b) <= tol;

// --- échantillons synthétiques : 10 km à 4:00/km exactement, plat
const flat = []; for (let t = 0; t <= 2400; t += 5) flat.push([t, 150, 1000 / 240, t * 1000 / 240, 100]);
const be = X.bestEfforts(flat);
ok(close(be[1000], 240, 1), '1 km détecté à 4:00 sur une allure constante', `→ ${be[1000].toFixed(1)} s`);
ok(close(be[5000], 1200, 2), '5 km détecté à 20:00', `→ ${be[5000].toFixed(1)} s`);
ok(be[21097.5] === undefined, 'pas de semi inventé sur une sortie de 10 km');

// --- un sprint inséré doit ressortir comme meilleur effort
const mix = []; let d = 0;
for (let t = 0; t <= 2400; t += 5) { const v = (t >= 600 && t < 780) ? 1000 / 180 : 1000 / 300; d += v * 5; mix.push([t, 150, v, d, 100]); }
ok(close(X.bestEfforts(mix)[1000], 180, 2), 'le meilleur kilomètre est celui du bloc rapide', `→ ${X.bestEfforts(mix)[1000].toFixed(0)} s`);

// --- allure corrigée de la pente
ok(X.gapSpeed(3, 0.10) > 3 * 1.5, 'une montée à 10 % vaut nettement plus que le plat', `×${(X.gapSpeed(3, .1) / 3).toFixed(2)}`);
ok(close(X.gapSpeed(3, 0), 3, 1e-9), 'sur le plat, la correction ne change rien');
ok(X.gapSpeed(3, -0.10) < 3, 'une descente modérée vaut moins que le plat', `×${(X.gapSpeed(3, -.1) / 3).toFixed(2)}`);
ok(X.minettiCost(-0.2) < X.minettiCost(0) && X.minettiCost(-0.45) > X.minettiCost(-0.2), 'le coût est minimal vers −20 % puis remonte');

// --- tours
const sp = X.splits(flat);
ok(sp.length === 10 && sp.every(s => close(s.s, 240, 2)), '10 tours de 4:00', `→ ${sp.length} tours`);

// --- réserve anaérobie
const cs = 1000 / 240, dp = 150;
const hard = []; let dd = 0;
for (let t = 0; t <= 600; t += 5) { const v = cs * 1.25; dd += v * 5; hard.push([t, 170, v, dd, 100]); }
const bal = X.dPrimeBalance(hard, cs, dp);
ok(bal.exhausted, 'courir 25 % au-dessus de la vitesse critique épuise la réserve');
const easy = []; dd = 0;
for (let t = 0; t <= 600; t += 5) { const v = cs * 0.8; dd += v * 5; easy.push([t, 120, v, dd, 100]); }
ok(X.dPrimeBalance(easy, cs, dp).min > dp * 0.99, 'sous la vitesse critique, la réserve reste pleine');

// --- modèle de vitesse critique sur des points parfaits
const pts = [240, 420, 600, 900].map(t => ({ d: dp + cs * t, t, max: true }));
const fit = X.csFit(pts);
ok(close(fit.cs, cs, 1e-6) && close(fit.dp, dp, 1e-6), 'CS et D′ retrouvés exactement sur des points parfaits', `CS ${(fit.cs * 3.6).toFixed(2)} km/h, D′ ${fit.dp.toFixed(0)} m`);

// --- exposant de Riegel
const k = 1.07, t5 = 1200;
const best = {}; [1000, 3000, 5000, 10000, 21097.5].forEach(dist => best[dist] = t5 * Math.pow(dist / 5000, k));
const rg = X.riegelFit(best);
ok(close(rg.k, k, 0.001), 'exposant de Riegel retrouvé', `→ ${rg.k.toFixed(3)}`);
ok(close(rg.predict(42195), t5 * Math.pow(42195 / 5000, k), 1), 'prédiction cohérente avec le modèle ajusté');

// --- VDOT : un semi en 1 h 28 donne un marathon plausible
const v = X.VDOT.of(21097.5, 5280), mar = X.VDOT.predict(42195, v);
ok(mar > 5280 * 2 && mar < 5280 * 2.3, 'marathon prédit entre 2,0 et 2,3 fois le semi', `→ ${(mar / 60).toFixed(0)} min, VDOT ${v.toFixed(1)}`);

// --- zones et polarisation
const z = [0, 100, 200, 10, 20, 5];
const th = X.threeZones(z);
ok(th.shape === 'polarisée', 'une semaine 75/3/8 est reconnue comme polarisée', `→ ${th.shape}`);
ok(X.threeZones([0, 10, 20, 60, 5, 0]).shape === 'centrée sur le seuil', 'trop de zone intermédiaire est signalé');

// --- monotonie de Foster
const even = {}, varied = {};
X.D.range('2026-11-01', '2026-11-07').forEach((day, i) => { even[day] = 50; varied[day] = [100, 20, 90, 10, 80, 0, 120][i]; });
ok(X.fosterWeek(even, '2026-11-01', '2026-11-07') === null || X.fosterWeek(even, '2026-11-01', '2026-11-07').mono > 5, 'des journées identiques donnent une monotonie très élevée');
ok(X.fosterWeek(varied, '2026-11-01', '2026-11-07').mono < 2, 'une semaine contrastée reste sous le seuil de 2');

// --- pente de progression en force
const series = []; for (let i = 0; i < 8; i++) series.push([20000 + i * 7, 60 + i * 0.5]);
const tr = X.strengthTrend(series, 12);
ok(close(tr.perWeek, 0.5, 0.01) && tr.sure, 'progression de 0,5 kg par semaine détectée et significative', `→ ${tr.perWeek.toFixed(2)} kg/sem`);

// --- zones de fréquence cardiaque
ok(X.zoneOf(190, 200) === 5 && X.zoneOf(120, 200) === 2 && X.zoneOf(95, 200) === 0, 'bornes de zones correctes');

// --- distance maximale sur une durée donnée
const bd = X.bestDistances(flat, [360, 720]);
ok(close(bd[360], 1500, 10), '6 min à 4:00/km couvrent 1500 m', `→ ${bd[360].toFixed(0)} m`);
ok(close(bd[720], 3000, 15), '12 min couvrent 3000 m', `→ ${bd[720].toFixed(0)} m`);
ok(close((bd[720] - 504.9) / 44.73, 55.8, 0.5), 'Cooper donne 55,8 ml/kg/min pour 3000 m en 12 min', `→ ${((bd[720] - 504.9) / 44.73).toFixed(1)}`);
ok(close(3.5 * (bd[360] / 360 * 3.6), 52.5, 0.5), 'Léger & Mercier donnent 52,5 pour une VMA de 15 km/h', `→ ${(3.5 * (bd[360] / 360 * 3.6)).toFixed(1)}`);
ok(close(15.3 * (195 / 48), 62.2, 0.2), 'Uth et al. : 195/48 bpm donnent 62,2', `→ ${(15.3 * (195 / 48)).toFixed(1)}`);
process.exit(ko ? 1 : 0);
