'use strict';
// ===================== Coach =====================
// Des règles explicites, appliquées à tes propres références. Chaque conseil dit sur quoi il s'appuie,
// avec quel seuil et quelle confiance. Rien n'est modifié sans ton accord.

const LVL = { rest: 3, adjust: 2, watch: 1, ok: 0 };

function coachToday(d) {
  const day = d.day, P = S.profile, w = S.wellness[day] || {}, signals = [];
  const add = (lvl, what, detail, conf) => signals.push({ lvl, what, detail, conf });

  // --- Douleur : seul signal qui peut arrêter seul une séance à impact
  if (w.pain >= 5) add('rest', 'Douleur ' + w.pain + '/7' + (w.painLoc ? ` — ${w.painLoc}` : ''), 'Au-dessus de 4, on ne court pas dessus : c\'est le seuil que tu t\'es fixé dans le check-in.', 'high');
  else if (w.pain >= 3) add('adjust', 'Douleur ' + w.pain + '/7' + (w.painLoc ? ` — ${w.painLoc}` : ''), 'Supprime l\'intensité et la descente tant qu\'elle ne redescend pas.', 'high');

  // --- Variabilité cardiaque : la tendance, jamais une journée isolée
  const h = d.hT;
  if (h && h.z != null) {
    const recent = d.hrv.filter(x => x.date >= D.add(day, -2) && x.trendStatus === 'below').length;
    if (h.trendStatus === 'below' && recent >= 2) add('adjust', 'Variabilité basse depuis ' + recent + ' jours', `Tendance sur 7 jours sous ta plage habituelle (écart ${fx(h.z, 1)} écart-type). Une seule journée ne compterait pas.`, 'moderate');
    else if (h.trendStatus === 'below') add('watch', 'Variabilité sous ta plage', 'Un seul jour : à confirmer demain avant d\'en tirer quoi que ce soit.', 'low');
  }
  // --- Fréquence au repos
  const r = d.rT;
  if (r && r.z != null && r.status === 'above' && r.z > 1) add('adjust', 'Fréquence au repos élevée', `${Math.round(r.value)} bpm, soit ${fx(r.z, 1)} écart-type au-dessus de ta plage. Souvent une fatigue ou une infection qui démarre.`, 'moderate');

  // --- Sommeil
  const n = d.lastNight, need = P.sleepNeed || 8;
  if (n && n.sleepMin / 60 < need * 0.75) add('adjust', 'Nuit courte', `${fmtMin(n.sleepMin)} contre ${fx(need, 1)} h de besoin déclaré.`, 'high');
  if (d.sleep.nights >= 5 && d.sleep.deficit / 60 > 5) add('watch', 'Dette de sommeil', `${fx(d.sleep.deficit / 60, 1)} h accumulées sur 7 jours.`, 'moderate');

  // --- Ressenti
  const feels = [['fatigue', 'Fatigue'], ['soreness', 'Courbatures'], ['stress', 'Stress']].filter(([k]) => w[k] >= 6);
  if (feels.length) add('adjust', feels.map(f => f[1]).join(' et ') + ' au plus haut', 'Tu as noté ' + feels.map(f => `${f[1].toLowerCase()} ${w[f[0]]}/7`).join(', ') + ' ce matin.', 'high');

  // --- Charge
  const t = d.trimpStates[d.trimpStates.length - 1];
  if (t) {
    if (t.tsb < -25) add('watch', 'Charge récente lourde', `Écart fatigue/fond de ${Math.round(t.tsb)}. Normal en bloc, à surveiller si ça dure plus de deux semaines.`, t.initW > 0.37 ? 'low' : 'moderate');
    if (t.acwr != null && t.acwr > 1.5) add('watch', 'Montée de charge rapide', `Rapport 7 j / 28 j à ${fx(t.acwr, 2)}. Repère descriptif, pas un prédicteur de blessure.`, 'low');
  }
  const foster = fosterWeek(d.trimpByDay, D.add(day, -6), day);
  if (foster && foster.mono > 2) add('watch', 'Semaine trop uniforme', `Monotonie ${fx(foster.mono, 2)} (Foster) : tes journées se ressemblent trop, il manque du contraste dur/facile.`, 'moderate');

  const worst = signals.reduce((m, s) => Math.max(m, LVL[s.lvl]), 0);
  const adjustN = signals.filter(s => s.lvl === 'adjust').length;
  let level = 'ok';
  if (worst === LVL.rest) level = 'rest';
  else if (adjustN >= 2) level = 'rest';
  else if (adjustN === 1) level = 'adjust';
  else if (signals.length) level = 'watch';

  const sessions = Plan.sessions(day).filter(s => s.t.kind !== 'rest');
  const hard = sessions.filter(s => isHard(s.t.intensity) || s.t.intensity === 'mixed');
  const titles = { ok: 'Fais la séance comme prévu', watch: 'Fais la séance, en restant attentif', adjust: 'Allège aujourd\'hui', rest: 'Repose-toi ou garde le très facile' };
  const heads = {
    ok: sessions.length ? 'Rien dans tes données ne s\'oppose au programme du jour.' : 'Rien de prévu aujourd\'hui, et rien d\'inquiétant dans tes données.',
    watch: 'Un signal sort de l\'ordinaire, mais isolé. Pars comme prévu et arrête si les sensations ne suivent pas.',
    adjust: hard.length ? 'Un signal net pour un jour de séance dure : baisse l\'intensité plutôt que d\'annuler.' : 'Un signal net : garde le volume mais reste facile.',
    rest: 'Plusieurs signaux vont dans le même sens. Le gain d\'une séance dure aujourd\'hui est faible, le coût est réel.'
  };
  if (!signals.length && !Object.keys(S.metrics).length) {
    return { level: 'ok', title: 'Pas encore de quoi te conseiller', head: 'Fais quelques check-ins du matin et connecte ta montre : il faut environ deux semaines pour comparer une journée à tes habitudes.', signals: [], proposals: [] };
  }
  return { level, title: titles[level], head: heads[level], signals: signals.sort((a, b) => LVL[b.lvl] - LVL[a.lvl]), proposals: proposalsFor(level, sessions, day, w) };
}

function proposalsFor(level, sessions, day, w) {
  if (level === 'ok' || level === 'watch') return [];
  const out = [];
  for (const s of sessions) {
    const k = s.t.kind, hard = isHard(s.t.intensity) || s.t.intensity === 'mixed';
    if (level === 'rest') {
      if (k === 'strength' || k === 'mobility') out.push({ key: s.id, to: 'mob_hips_ankles', why: 'Mobilité à la place de la séance de force' });
      else out.push({ key: s.id, to: 'rest', why: 'Repos à la place de ' + s.t.title.toLowerCase() });
    } else if (hard) {
      const alt = k === 'track' || k === 'run' ? 'run_easy_ef' : k === 'trailRun' ? 'run_easy45_60' : k === 'treadmill' ? 'run_ef_30_40' : null;
      if (alt && TPL[alt]) out.push({ key: s.id, to: alt, why: 'Endurance facile à la place de l\'intensité' });
    } else if (k === 'strength') {
      out.push({ key: s.id, light: true, why: 'Même séance, une série de moins par exercice' });
    }
    if (w.pain >= 3 && ['trailRun', 'run', 'track'].includes(k)) out.push({ key: s.id, to: 'bike_z1', why: 'Vélo sans impact tant que la douleur est là' });
  }
  return out;
}

// ===================== Bilan de la semaine =====================
function coachWeek(d, endDay) {
  const to = endDay || d.day, from = D.add(to, -6), prevTo = D.add(from, -1), prevFrom = D.add(prevTo, -6);
  const lib = LIB(), P = S.profile;
  const acts = S.activities.filter(a => { const x = D.ofTime(a.start); return x >= from && x <= to; });
  const prevActs = S.activities.filter(a => { const x = D.ofTime(a.start); return x >= prevFrom && x <= prevTo; });
  const foot = acts.filter(a => FOOT.has(a.sport)), prevFoot = prevActs.filter(a => FOOT.has(a.sport));
  const km = foot.reduce((s, a) => s + (a.dist || 0), 0) / 1000, prevKm = prevFoot.reduce((s, a) => s + (a.dist || 0), 0) / 1000;
  const up = foot.reduce((s, a) => s + (a.up || 0), 0);
  const minutes = acts.reduce((s, a) => s + (a.timer || a.elapsed) / 60, 0);

  // séances prévues contre réalisées
  let planned = 0, done = 0;
  const lk = new Set(Object.keys(linkedMap()));
  for (const dd of D.range(from, to)) for (const s of Plan.sessions(dd)) {
    if (s.t.kind === 'rest' || s.opt) continue;
    planned++;
    if (['completed', 'partial', 'modified'].includes(effectiveStatus(s, lk, d.day))) done++;
  }
  // répartition d'intensité
  const zones = [0, 0, 0, 0, 0, 0];
  if (P.maxHR) for (const a of acts) { const z = anaOf(a).zones; if (z) z.forEach((v, i) => zones[i] += v); }
  const three = threeZones(zones);
  const foster = fosterWeek(d.trimpByDay, from, to);
  const nights = D.range(from, to).map(x => S.metrics[x]?.sleepMin).filter(Boolean);
  const vol = weeklyVolume(S.strength, lib, 2, to);
  const t = d.trimpStates[d.trimpStates.length - 1];
  const ctlPrev = d.trimpStates.find(x => x.date === prevTo);

  const points = [];
  const pt = (lvl, title, text) => points.push({ lvl, title, text });
  if (planned) pt(done >= planned ? 'good' : done >= planned * 0.7 ? 'ok' : 'warn', `${done} séances sur ${planned}`,
    done >= planned ? 'Semaine complète.' : `${planned - done} séance${planned - done > 1 ? 's' : ''} non réalisée${planned - done > 1 ? 's' : ''}. Les séances facultatives ne sont pas comptées.`);
  if (foot.length) pt(Math.abs(km - prevKm) < prevKm * 0.3 || !prevKm ? 'ok' : km > prevKm * 1.3 ? 'warn' : 'ok',
    `${fx(km, 1)} km à pied, D+ ${Math.round(up)} m`,
    prevKm ? `${km >= prevKm ? '+' : ''}${fx((km - prevKm) / prevKm * 100, 0)} % par rapport à la semaine d'avant.` + (km > prevKm * 1.3 ? ' Une hausse de plus de 30 % en une semaine est beaucoup.' : '') : 'Première semaine de référence.');
  if (three) pt(three.shape === 'centrée sur le seuil' ? 'warn' : 'good', `Intensité ${three.shape}`,
    `${Math.round(three.pct[0])} % facile, ${Math.round(three.pct[1])} % intermédiaire, ${Math.round(three.pct[2])} % dur. ` +
    (three.shape === 'centrée sur le seuil' ? 'Trop de temps dans la zone intermédiaire : c\'est fatigant sans être vraiment stimulant (Seiler).' : 'Répartition cohérente avec ce que font les coureurs d\'endurance entraînés.'));
  if (foster) pt(foster.mono > 2 ? 'warn' : 'good', `Monotonie ${fx(foster.mono, 2)}`,
    foster.mono > 2 ? 'Tes journées se ressemblent trop. Durcis les séances dures et facilite franchement les autres.' : 'Bon contraste entre les journées (Foster et al., 1998).');
  if (nights.length >= 4) {
    const avg = St.mean(nights) / 60, need = P.sleepNeed || 8;
    pt(avg >= need * .95 ? 'good' : avg >= need * .85 ? 'ok' : 'warn', `${fx(avg, 1)} h de sommeil en moyenne`,
      avg >= need * .95 ? 'Besoin couvert.' : `${fx(need - avg, 1)} h sous ton besoin chaque nuit, sur ${nights.length} nuits mesurées.`);
  }
  if (t && ctlPrev) {
    const dc = t.ctl - ctlPrev.ctl;
    pt(Math.abs(dc) < 5 ? 'ok' : dc > 0 ? 'good' : 'ok', `Fond ${dc >= 0 ? '+' : ''}${fx(dc, 1)} cette semaine`,
      dc > 7 ? 'Progression rapide : surveille le sommeil et les sensations.' : dc > 0 ? 'Le fond monte.' : 'Le fond baisse légèrement, normal en allègement ou après une coupure.');
  }
  const musc = Object.entries(vol[1]?.by || {}).sort((a, b) => b[1] - a[1]);
  if (musc.length) {
    const drop = musc.filter(([m, v]) => (vol[0].by[m] || 0) - v >= 4);
    pt('ok', `${musc.reduce((s, m) => s + m[1], 0)} séries de musculation`,
      musc.slice(0, 4).map(([m, v]) => `${MUSCLES[m]} ${v}`).join(', ') + (drop.length ? ` — en baisse nette sur ${drop.map(x => MUSCLES[x[0]].toLowerCase()).join(', ')}.` : '.'));
  }
  return { from, to, points, km, prevKm, minutes, up, three, foster, planned, done };
}

// ===================== Progression en musculation =====================
// Double progression : on monte les répétitions dans la fourchette, puis la charge.
function strengthProposals(limitDays = 21) {
  const lib = LIB(), day = today(), cut = D.add(day, -limitDays), out = [];
  const byEx = {};
  for (const s of S.strength) {
    const d = D.ofTime(s.start); if (d < cut) continue;
    for (const x of s.sets) {
      if (x.warm || !(x.reps > 0)) continue;
      (byEx[x.ex] = byEx[x.ex] || []).push({ d, start: s.start, ...x });
    }
  }
  // fourchette prescrite par le programme
  const rx = {};
  for (const t of SESSION_TEMPLATES) for (const b of t.blocks) for (const x of b.ex) if (x.reps && !rx[x.id]) rx[x.id] = x.reps;
  for (const [id, sets] of Object.entries(byEx)) {
    const e = lib[id]; if (!e) continue;
    const last = Math.max(...sets.map(s => s.start));
    const lastSets = sets.filter(s => s.start === last).sort((a, b) => a.n - b.n);
    if (!lastSets.length || !lastSets.some(s => s.load > 0)) continue;
    const range = rx[id] || [8, 12], top = range[1];
    const allTop = lastSets.every(s => s.reps >= top), rirs = lastSets.map(s => s.rir ?? 2);
    const minRir = Math.min(...rirs), load = St.median(lastSets.map(s => s.load));
    const inc = S.profile.inc || 1.25;
    let p = null;
    if (allTop && minRir >= 1) p = { action: 'load', value: load + inc, why: `Toutes tes séries à ${top} répétitions avec au moins ${minRir} en réserve : c'est le moment de monter la charge.` };
    else if (minRir <= 0) p = { action: 'hold', value: load, why: 'Tu as fini à l\'échec ou presque : garde la même charge et vise une répétition de plus avec un peu de marge.' };
    else p = { action: 'reps', value: load, why: `Reste à ${fx(load, load % 1 ? 1 : 0)} kg et ajoute une répétition par série jusqu'à ${top}.` };
    const series = e1rmSeries(id), tr = strengthTrend(series);
    out.push({ id, name: e.name, load, reps: lastSets.map(s => s.reps), rir: minRir, range, when: last, trend: tr, ...p });
  }
  return out.sort((a, b) => b.when - a.when);
}

// ===================== Objectif de course =====================
function raceReadiness(d) {
  const day = d.day;
  const ev = S.events.filter(e => e.start >= day && e.priority === 'a' && e.status !== 'cancelled').sort((a, b) => a.start < b.start ? -1 : 1)[0];
  if (!ev) return null;
  const weeks = Math.max(0, Math.round(D.diff(day, ev.start) / 7));
  const bundle = csBundle();
  const pred = ev.distanceKm && ROAD.has('running') && ev.discipline !== 'trail'
    ? racePrediction(ev.distanceKm * 1000, { best: bundle.best, riegel: bundle.riegel, cs: bundle.cs }) : null;
  const notes = [];
  if (ev.discipline === 'trail') notes.push('Aucune prédiction de chrono en trail : les modèles de route n\'y sont pas valides.');
  else if (!pred || !pred.range) notes.push('Pas encore assez de records mesurés pour prédire un temps. Fais une sortie avec un effort maximal de 5 à 15 minutes.');
  // plus longue sortie des 8 dernières semaines
  const longest = S.activities.filter(a => FOOT.has(a.sport) && D.ofTime(a.start) >= D.add(day, -56))
    .reduce((m, a) => Math.max(m, (a.timer || a.elapsed) / 60), 0);
  const t = d.trimpStates[d.trimpStates.length - 1];
  return { ev, weeks, pred, longest, ctl: t?.ctl, notes };
}
