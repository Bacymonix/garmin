'use strict';
// ===================== Coach, musculation, analyses =====================

const VCOL = { ok: 'var(--good)', watch: 'var(--accent)', adjust: 'var(--mid)', rest: 'var(--low)' };
const VIC = { ok: 'check', watch: 'info', adjust: 'tune', rest: 'alert' };
const SIGC = { rest: 'var(--low)', adjust: 'var(--mid)', watch: 'var(--accent)', ok: 'var(--good)' };

function verdictCard(d) {
  const c = coachToday(d);
  ui.coach = c;
  return `<div class="verdict" style="--c:${VCOL[c.level]}">
    <div class="verdictTop"><span class="ic">${ic(VIC[c.level], 22)}</span>
      <div class="grow"><h2>${esc(c.title)}</h2><div class="lede">${esc(c.head)}</div></div></div>
    ${c.signals.length ? `<div style="margin-top:12px">${c.signals.slice(0, 3).map(sg => `<div class="sig" style="--c:${SIGC[sg.lvl]}"><i></i>
      <div class="grow"><div class="small">${esc(sg.what)}</div><div class="meta">${esc(sg.detail)}</div></div></div>`).join('')}
      ${c.signals.length > 3 ? `<div class="meta" style="padding-top:8px">et ${c.signals.length - 3} autre${c.signals.length > 4 ? 's' : ''} signal${c.signals.length > 4 ? 'ux' : ''}</div>` : ''}</div>` : ''}
    ${c.proposals.length ? `<div style="margin-top:12px">${c.proposals.map((p, i) => `<div class="prop">
      <span class="grow">${esc(p.why)}</span><button class="btn sm pri" data-a="applyProp" data-i="${i}">Appliquer</button></div>`).join('')}
      <div class="meta">Appliquer enregistre la décision et les indicateurs qui l'ont motivée. Tu peux revenir en arrière dans le détail de la séance.</div></div>` : ''}
    <div class="row" style="margin-top:12px"><button class="link" data-a="coachSheet">Bilan de la semaine</button>
      <span class="meta">${c.signals.length ? 'confiance ' + LABELS.conf[c.signals[0].conf].toLowerCase() : ''}</span></div>
  </div>`;
}

// ===================== Onglet Muscu =====================
function viewMuscu() {
  const day = today(), lib = LIB(), lk = new Set(Object.keys(linkedMap()));
  const todays = Plan.sessions(day).filter(s => s.t.kind === 'strength' || s.t.kind === 'mobility');
  const d = dash(day), vol = d.vol, ms = Object.keys(vol).sort((a, b) => vol[b].direct - vol[a].direct);
  const props = strengthProposals();
  const weeks = weeklyVolume(S.strength, lib, 6, day);
  const ton = tonnage(S.strength, lib, D.add(day, -6), day);
  const totalTon = Object.values(ton).reduce((a, b) => a + b, 0);
  const maxVol = Math.max(1, ...ms.map(m => vol[m].direct));
  return `<div class="screenTop"><div><div class="meta">7 derniers jours</div><h1>Musculation</h1></div>
    <button class="iconBtn" data-a="library" aria-label="Bibliothèque de mouvements">${ic('book', 20)}</button></div>

  ${todays.length ? todays.map(s => {
    const st = effectiveStatus(s, lk, day), done = ['completed', 'partial', 'modified'].includes(st);
    return sessionCard(s, st, null) + (done ? '' : `<div class="sessActs"><button class="btn pri sm" data-a="startWorkout" data-tpl="${s.t.id}" data-key="${esc(s.id)}">${ic('play', 15)} Démarrer</button>
      <button class="btn ghost sm" data-a="openSession" data-id="${esc(s.id)}">Voir le détail</button></div>`);
  }).join('') : `<div class="card"><div class="metricName">Pas de séance prévue aujourd'hui</div>
    <div class="meta">Tu peux quand même lancer n'importe quelle séance du programme.</div>
    <button class="btn full" data-a="freeWorkout">Lancer une séance libre</button></div>`}

  <div class="band"><h3>Ce que le coach propose</h3><span class="meta">double progression</span></div>
  ${props.length ? props.slice(0, 8).map(p => `<div class="card">
    <div class="mvRow"><div class="mvBox sm">${moveFor(p.id, lib[p.id]?.cat)?.svg || ''}</div>
      <div class="grow"><div class="row"><div class="metricName">${esc(p.name)}</div>
        <div class="num" style="font-size:17px;color:${p.action === 'load' ? 'var(--good)' : 'var(--text)'}">${p.action === 'load' ? '→ ' + fx(p.value, p.value % 1 ? 2 : 0) + ' kg' : fx(p.load, p.load % 1 ? 1 : 0) + ' kg'}</div></div>
      <div class="meta">${esc(p.why)}</div>
      ${p.trend ? `<div class="meta" style="color:${p.trend.sure && p.trend.perWeek > 0 ? 'var(--good)' : 'var(--faint)'}">${p.trend.perWeek >= 0 ? '+' : ''}${fx(p.trend.perWeek, 2)} kg par semaine${p.trend.ci ? ` (± ${fx(p.trend.ci, 2)})` : ''}${p.trend.sure ? '' : ' — pas encore significatif'}</div>` : ''}
      </div></div></div>`).join('')
    : hint('Enregistre quelques séances et le coach te proposera les charges de la suivante.')}

  <div class="band"><h3>Volume par muscle</h3><span class="meta">séries principales</span></div>
  <div class="card">
    ${ms.length ? ms.map(m => `<div style="margin:12px 0 0"><div class="row"><span class="small">${MUSCLES[m]}</span>
      <span class="meta">${vol[m].direct} séries · ${vol[m].hard} proches de l'échec</span></div>
      <div class="meter"><i style="width:${vol[m].direct / maxVol * 100}%;--c:var(--deep)"></i></div></div>`).join('')
      : hint('Aucune série cette semaine.')}
    ${totalTon ? `<div class="kv" style="margin-top:14px"><span>Tonnage total de la semaine</span><b>${fx(totalTon / 1000, 1)} t</b></div>` : ''}
    <div class="note tight">Une série compte pour un muscle quand il est moteur principal. Les repères MEV / MAV / MRV ne sont pas affichés : ils sont individuels et se construisent en observant ta propre réponse.</div>
  </div>
  ${weeks.some(w => Object.keys(w.by).length) ? `<div class="card"><div class="metricName">6 dernières semaines</div>
    ${chart({ h: 130, series: [{ pts: weeks.map((w, i) => [D.num(w.to), Object.values(w.by).reduce((a, b) => a + b, 0)]), color: 'var(--deep)', fill: true, dots: true }] })}
    <div class="meta">séries principales par semaine, tous muscles confondus</div></div>` : ''}

  <div class="band"><h3>Progression</h3><span class="meta">${S.profile.formula === 'epley' ? 'Epley' : 'Brzycki'}</span></div>
  ${KEY_LIFTS.map(id => ({ id, name: lib[id]?.name, pts: e1rmSeries(id) })).filter(l => l.pts.length > 1).map(l => `<div class="card">
    <div class="row"><div class="metricName">${esc(l.name)}</div><div class="num" style="font-size:20px">${fx(l.pts[l.pts.length - 1][1], 1)}<small style="font-size:12px;color:var(--dim)"> kg</small></div></div>
    ${chart({ h: 90, series: [{ pts: l.pts, color: 'var(--deep)', dots: true, fill: true }] })}</div>`).join('')
    || hint('La progression apparaîtra après quelques séances.')}

  <div class="list">
    ${row('book', 'Tous les mouvements', 'library')}
    ${row('strength', 'Historique des séances', 'strengthHistory')}
    ${row('play', 'Lancer une séance libre', 'freeWorkout')}
  </div>`;
}

// ===================== Blocs d'analyse (onglet Forme) =====================
function prStrip() {
  const { best, where } = csBundle();
  const ds = Object.keys(best).map(Number).sort((a, b) => a - b);
  if (!ds.length) return hint('Les records apparaîtront dès qu\'une sortie avec distance sera importée. Ils sont cherchés dans chaque activité, sur n\'importe quelle portion.');
  return `<div class="pr">${ds.map(d => `<div class="prCard" ${where[d] ? `data-a="activity" data-id="${esc(where[d])}" style="cursor:pointer"` : ''}>
    <b>${fmtDur(best[d])}</b><div class="meta">${DIST_LABEL[d] || Math.round(d) + ' m'}</div>
    <div class="meta">${pace(best[d] / (d / 1000))} /km</div></div>`).join('')}</div>`;
}
function predictionCard() {
  const b = csBundle();
  const targets = [5000, 10000, 21097.5, 42195];
  const rows = targets.map(t => ({ t, p: racePrediction(t, b) })).filter(r => r.p.range);
  if (!rows.length) return '';
  return `<div class="card"><div class="metricName">Si tu courais aujourd'hui</div>
    <table class="tbl"><tbody>
    ${rows.map(r => `<tr><td>${DIST_LABEL[r.t]}</td><td><b>${fmtDur(r.p.range[0])}${r.p.range[1] - r.p.range[0] > 30 ? ' – ' + fmtDur(r.p.range[1]) : ''}</b></td>
      <td class="meta">${pace(((r.p.range[0] + r.p.range[1]) / 2) / (r.t / 1000))} /km</td></tr>`).join('')}
    </tbody></table>
    <details><summary>Comment c'est calculé</summary>
      ${rows[0].p.models.map(m => `<div class="kv tiny"><span>${esc(m.name)}</span><b>${fmtDur(m.t)}${m.weak ? ' (hors domaine)' : ''}</b></div>`).join('')}
      <div class="meta" style="margin-top:6px">Trois modèles indépendants, appliqués à tes propres records. Quand ils s'écartent, c'est que l'un d'eux sort de son domaine de validité — en général le modèle de vitesse critique au-delà de 15 km. Rien ici ne tient compte du dénivelé ni de la chaleur.</div></details></div>`;
}
function csCard() {
  const b = csBundle(), cs = b.cs;
  if (!cs) return `<div class="card"><div class="metricName">Vitesse critique</div>
    <div class="meta">Il faut deux efforts maximaux de durées différentes, entre 2 et 15 minutes. Ils sont détectés tout seuls dans tes sorties, ou tu peux les saisir.</div>
    <button class="btn full" data-a="paces">Saisir un effort</button></div>`;
  const pts = b.used.filter(p => p.max).sort((a, b2) => a.t - b2.t);
  return `<div class="card">
    <div class="row"><div class="metricName">Vitesse critique</div><div class="num" style="font-size:20px">${fx(cs.cs * 3.6, 2)}<small style="font-size:12px;color:var(--dim)"> km/h</small></div></div>
    <div class="meta">${pace(1000 / cs.cs)} /km — l'allure que tu peux tenir longtemps sans puiser dans tes réserves</div>
    ${chart({ h: 120, xFmt: x => fx(x, 0) + ' min', yMin: 0,
      series: [{ pts: [[0, cs.dp / 1000], [Math.max(...pts.map(p => p.t)) / 60 * 1.1, (cs.dp + cs.cs * Math.max(...pts.map(p => p.t)) * 1.1) / 1000]], color: 'var(--deep)' },
        { pts: pts.map(p => [p.t / 60, p.d / 1000]), color: 'var(--accent)', line: false, dots: true, r: 3.6 }] })}
    <div class="meta">distance parcourue (km) selon la durée de l'effort (min) : les points sont tes efforts, la droite est le modèle</div>
    <div class="kv" style="margin-top:10px"><span>Réserve anaérobie D′</span><b>${Math.round(cs.dp)} m</b></div>
    <div class="kv"><span>Qualité de l'ajustement</span><b>R² ${cs.r2 != null ? fx(cs.r2, 3) : '–'} · ${LABELS.conf[cs.conf].toLowerCase()}</b></div>
    ${cs.warn.map(w => `<div class="meta warnTx">${esc(w)}</div>`).join('')}
    <div class="note tight">Modèle à deux paramètres (Jones &amp; Vanhatalo, 2017), valable sur des efforts de 2 à 15 minutes. ${b.used.filter(p => p.src === 'mesuré').length} effort(s) détecté(s) dans tes sorties.</div></div>`;
}
function zonesCard(d) {
  const P = S.profile, day = d.day;
  if (!P.maxHR) return `<div class="card"><div class="metricName">Zones cardiaques</div>
    <div class="meta">Renseigne ta fréquence cardiaque maximale pour voir la répartition de ton temps.</div>
    <button class="btn full" data-a="profile">Compléter le profil</button></div>`;
  const z = [0, 0, 0, 0, 0, 0];
  for (const a of S.activities) { const dd = D.ofTime(a.start); if (dd < D.add(day, -27) || dd > day) continue; const zz = anaOf(a).zones; if (zz) zz.forEach((v, i) => z[i] += v); }
  const tot = z.reduce((a, b) => a + b, 0);
  if (!tot) return '';
  const three = threeZones(z);
  return `<div class="card"><div class="row"><div class="metricName">Où passe ton temps</div><span class="meta">28 jours</span></div>
    ${z.map((v, i) => v > 0.5 ? `<div class="zrow" style="--c:${ZONE_COLOR[i]}"><span class="zl">${ZONE_LABEL[i]}</span>
      <span class="zb"><i style="width:${v / tot * 100}%"></i></span><span class="zv">${fmtMin(v)}</span></div>` : '').join('')}
    ${three ? `<div class="note tight">Répartition <b>${three.shape}</b> : ${Math.round(three.pct[0])} % facile, ${Math.round(three.pct[1])} % intermédiaire, ${Math.round(three.pct[2])} % dur.
      ${three.shape === 'centrée sur le seuil' ? 'Beaucoup de temps dans la zone intermédiaire, fatigante sans être franchement stimulante.' : 'Cohérent avec la répartition observée chez les coureurs d\'endurance entraînés (Seiler).'}</div>` : ''}
    <div class="meta">Zones en pourcentage de ta fréquence maximale (${Math.round(P.maxHR)} bpm).</div></div>`;
}
function efCard() {
  const P = S.profile; if (!P.maxHR) return '';
  const pts = efSeries(S.activities, P.maxHR);
  if (pts.length < 4) return '';
  const f = St.linreg(pts.map(p => p[0]), pts.map(p => p[1]));
  const better = f && f.slope > 0;
  return `<div class="card"><div class="row"><div class="metricName">Efficacité en endurance</div>
    <div class="num" style="font-size:19px">${fx(pts[pts.length - 1][1], 2)}</div></div>
    ${chart({ h: 110, series: [{ pts: pts.map(p => [p[0], p[1]]), color: 'var(--good)', dots: true, line: false, r: 2.6 },
      ...(f ? [{ pts: [[pts[0][0], f.intercept + f.slope * pts[0][0]], [pts[pts.length - 1][0], f.intercept + f.slope * pts[pts.length - 1][0]]], color: 'var(--accent)', w: 1.6 }] : [])] })}
    <div class="note tight">Mètres parcourus par minute et par battement, sur tes sorties faciles seulement, allure corrigée de la pente.
      ${f ? (better ? 'La droite monte : à fréquence égale, tu avances plus vite qu\'avant.' : 'La droite descend légèrement : fatigue, chaleur ou terrain peuvent l\'expliquer autant que la forme.') : ''}
      Comparable seulement entre sorties semblables.</div></div>`;
}
function raceCard(d) {
  const r = raceReadiness(d);
  if (!r) return '';
  const gap = r.pred?.range && r.ev.target ? r.pred.range[0] - r.ev.target : null;
  return `<div class="band"><h3>Objectif</h3><span class="meta">${r.weeks} semaine${r.weeks > 1 ? 's' : ''}</span></div>
  <div class="card">
    <div class="row top"><div class="grow"><h2>${esc(r.ev.name)}</h2><div class="meta">${D.long(r.ev.start)}${r.ev.distanceKm ? ` · ${fx(r.ev.distanceKm, r.ev.distanceKm < 30 ? 1 : 0)} km` : ''}</div></div></div>
    ${r.ev.target ? `<div class="kv" style="margin-top:10px"><span>Ton objectif</span><b>${fmtDur(r.ev.target)}${r.ev.distanceKm ? ` · ${pace(r.ev.target / r.ev.distanceKm)} /km` : ''}</b></div>` : ''}
    ${r.pred?.range ? `<div class="kv"><span>Estimation d'aujourd'hui</span><b>${fmtDur(r.pred.range[0])}${r.pred.range[1] - r.pred.range[0] > 30 ? ' – ' + fmtDur(r.pred.range[1]) : ''}</b></div>` : ''}
    ${gap != null ? `<div class="kv"><span>Écart à l'objectif</span><b style="color:${gap <= 0 ? 'var(--good)' : gap < 600 ? 'var(--mid)' : 'var(--low)'}">${gap <= 0 ? 'objectif déjà à portée' : '+' + fmtDur(gap)}</b></div>` : ''}
    ${r.longest ? `<div class="kv"><span>Plus longue sortie sur 8 semaines</span><b>${fmtMin(r.longest)}</b></div>` : ''}
    ${r.ctl ? `<div class="kv"><span>Fond actuel</span><b>${Math.round(r.ctl)}</b></div>` : ''}
    ${r.notes.map(n => `<div class="note tight">${esc(n)}</div>`).join('')}
    ${gap != null && gap > 0 ? `<div class="note tight">L'estimation vient de tes records sur des distances plus courtes. Elle suppose un entraînement spécifique suffisant : sur marathon, l'écart se comble surtout par les sorties longues avec des portions à l'allure visée.</div>` : ''}
  </div>`;
}

Object.assign(A, {
  coachSheet: () => push('coachWeek'),
  season: () => push('season'),
  applyProp(dd) {
    const c = ui.coach, p = c?.proposals[+dd.i]; if (!p) return;
    const s = findSession(p.key); if (!s) return;
    const ind = c.signals.map(x => `${x.what} — ${x.detail}`).join('\n');
    const conf = c.signals.map(x => x.conf).sort((a, b) => RANK[a] - RANK[b])[0] || 'low';
    S.adaptations.push({ id: uid(), at: Date.now(), key: p.key, original: s.t.id, decision: p.to === 'rest' ? 'skipForRecovery' : 'replace', replacement: p.to || null, reason: p.why + ' (proposé par le coach)', indicators: ind, conf });
    const r = S.sessions[p.key] = S.sessions[p.key] || { original: s.t.id };
    if (p.to) r.templateId = p.to;
    if (p.light) r.light = true;
    if (p.to === 'rest') r.status = 'skippedForRecovery';
    save(); render(); toast('Séance adaptée, décision enregistrée');
  }
});

Object.assign(MODALS, {
  season: () => ({ title: 'Saison 2026 — 2027', body: seasonBody() }),
  coachWeek() {
    const d = dash(today()), w = coachWeek(d);
    const C = { good: 'var(--good)', ok: 'var(--accent)', warn: 'var(--mid)' };
    return { title: 'Bilan de la semaine', body: `
      <div class="meta">${D.short(w.from)} — ${D.short(w.to)}</div>
      <h2 style="margin:2px 0 14px">${w.done}/${w.planned || '–'} séances · ${fx(w.km, 1)} km · ${fmtMin(w.minutes)}</h2>
      ${w.points.map(p => `<div class="card"><div class="row top"><i style="width:8px;height:8px;border-radius:50%;background:${C[p.lvl]};margin-top:8px;flex:none"></i>
        <div class="grow"><div class="metricName">${esc(p.title)}</div><div class="meta">${esc(p.text)}</div></div></div></div>`).join('')}
      ${w.three ? `<div class="card"><div class="metricName">Répartition de l'intensité</div>
        ${[['Facile', w.three.pct[0], 'var(--accent)'], ['Intermédiaire', w.three.pct[1], 'var(--mid)'], ['Dur', w.three.pct[2], 'var(--low)']].map(([l, v, c]) =>
          `<div class="zrow" style="--c:${c}"><span class="zl">${l}</span><span class="zb"><i style="width:${v}%"></i></span><span class="zv">${Math.round(v)} %</span></div>`).join('')}</div>` : ''}
      ${raceCard(d)}
      <div class="note">Ce bilan décrit ce qui s'est passé et le compare à la semaine précédente et à tes propres habitudes. Il ne prédit rien.</div>` };
  }
});

// ===================== Sommeil =====================
const SLEEP_COL = s => s >= 70 ? 'var(--good)' : s >= 55 ? 'var(--accent)' : s >= 40 ? 'var(--mid)' : 'var(--low)';
function hypnogram(sc) {
  if (sc.deepMin == null) return '';
  const light = sc.lightMin != null ? sc.lightMin : Math.max(0, sc.sleepMin - sc.deepMin - sc.remMin);
  const segs = [['Profond', sc.deepMin, 'var(--deep)'], ['Paradoxal', sc.remMin, '#B393F5'], ['Léger', light, 'var(--accent)'], ['Éveillé', sc.awake || 0, 'var(--line)']];
  const tot = segs.reduce((a, b) => a + (b[1] || 0), 0) || 1;
  return `<div class="hyp">${segs.filter(x => x[1] > 0).map(x => `<i style="width:${x[1] / tot * 100}%;background:${x[2]}" title="${x[0]}"></i>`).join('')}</div>
    <div class="legend">${segs.filter(x => x[1] > 0).map(x => `<span><i style="--c:${x[2]}"></i>${x[0]} ${fmtMin(x[1])}</span>`).join('')}</div>`;
}
function sleepCard(day) {
  const sc = sleepScore(day);
  if (!sc) return `<div class="card"><div class="metricName">Nuit non renseignée</div>
    <div class="meta">Garmin la remplit toute seule, sinon saisis la durée dans le check-in.</div></div>`;
  return `<div class="card">
    <div class="row top"><div class="grow"><div class="num" style="font-size:40px;color:${SLEEP_COL(sc.score)}">${sc.score}<small style="font-size:15px;color:var(--dim)"> /100</small></div>
      <div class="metricName">${SLEEP_WORD(sc.score)}</div>
      <div class="meta">${fmtMin(sc.sleepMin)} dormi sur ${fx(sc.need / 60, 1)} h de besoin${sc.start != null ? ` · couché vers ${fmtClock(sc.start)}` : ''}</div></div></div>
    ${hypnogram(sc)}
    <div style="margin-top:12px">${sc.used.map(p => `<div class="zrow" style="--c:${SLEEP_COL(sc.parts[p.id] / p.max * 100)}">
      <span class="zl">${p.label}</span><span class="zb"><i style="width:${sc.parts[p.id] / p.max * 100}%"></i></span>
      <span class="zv">${Math.round(sc.parts[p.id])}/${p.max}</span></div>`).join('')}</div>
    ${sc.missing.length ? `<div class="meta">Non mesuré cette nuit : ${sc.missing.map(m => SLEEP_PARTS.find(p => p.id === m).label.toLowerCase()).join(', ')}. Le score est ramené sur ce qui est connu.</div>` : ''}
    ${sc.weak ? `<div class="note tight">${esc(WEAK_TIP[sc.weak.id])}</div>` : ''}
    ${sc.parts.regularitySd != null ? `<div class="meta">Tes heures de coucher varient de ${Math.round(sc.parts.regularitySd)} min autour de ta moyenne sur 14 nuits.</div>` : ''}
  </div>`;
}
const fmtClock = min => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${p2(Math.floor(m / 60))} h ${p2(m % 60)}`; };

Object.assign(MODALS, {
  sleep() {
    const day = today(), d = dash(day), need = S.profile.sleepNeed || 8;
    const ser = sleepSeries(day, 30);
    const nights = D.range(D.add(day, -29), day).map(x => S.metrics[x]).filter(m => m?.sleepMin);
    const avg = nights.length ? St.mean(nights.map(n => n.sleepMin)) : null;
    const avgScore = ser.length ? St.mean(ser.map(x => x.s.score)) : null;
    const starts = ser.map(x => x.s.start).filter(v => v != null).map(v => v > 720 ? v - 1440 : v);
    return { title: 'Sommeil', body: `
      <div class="meta">${D.long(day)}</div>
      <h2 style="margin:2px 0 12px">La nuit dernière</h2>
      ${sleepCard(day)}
      ${sec('30 derniers jours')}
      <div class="pair">
        ${tile('Score moyen', avgScore != null ? Math.round(avgScore) : '–', '/100', `${ser.length} nuit${ser.length > 1 ? 's' : ''} notée${ser.length > 1 ? 's' : ''}`)}
        ${tile('Durée moyenne', avg ? fx(avg / 60, 1) : '–', 'h', `besoin ${fx(need, 1)} h`)}
      </div>
      ${ser.length > 2 ? `<div class="card">${chart({ h: 150, yMin: 0, yMax: 100,
        bars: { pts: ser.map(x => [D.num(x.d), x.s.score, SLEEP_COL(x.s.score)]), color: 'var(--accent)' } })}
        <div class="meta">score par nuit</div></div>` : ''}
      ${nights.length > 2 ? `<div class="card">${chart({ h: 140, rule: need, ruleLabel: 'ton besoin',
        series: [{ pts: D.range(D.add(day, -29), day).filter(x => S.metrics[x]?.sleepMin).map(x => [D.num(x), S.metrics[x].sleepMin / 60]), color: 'var(--deep)', fill: true }] })}
        <div class="meta">durée en heures</div>
        <div class="kv" style="margin-top:8px"><span>Dette sur 7 jours</span><b>${d.sleep.nights ? fx(d.sleep.deficit / 60, 1) + ' h' : '–'}</b></div>
        ${starts.length >= 5 ? `<div class="kv"><span>Heure de coucher habituelle</span><b>${fmtClock(St.mean(starts))} ± ${Math.round(St.sd(starts))} min</b></div>` : ''}</div>` : ''}
      ${sec('Comment le score est construit')}
      <div class="card">
        <div class="kv"><span>Durée</span><b>50 points</b></div><div class="meta">part de ton besoin déclaré réellement dormie, sans bonus au-delà</div>
        <div class="kv" style="margin-top:8px"><span>Continuité</span><b>20 points</b></div><div class="meta">temps passé éveillé pendant la nuit : plein à 20 min ou moins, nul à partir d'une heure</div>
        <div class="kv" style="margin-top:8px"><span>Phases</span><b>15 points</b></div><div class="meta">part de sommeil profond (13 à 23 %) et paradoxal (20 à 25 %), fourchettes usuelles chez l'adulte</div>
        <div class="kv" style="margin-top:8px"><span>Régularité</span><b>15 points</b></div><div class="meta">dispersion de ton heure de coucher sur 14 nuits : plein sous 30 min d'écart-type, nul au-delà de 90</div>
        <div class="note">Ce score est celui de Cockpit, pas celui de Garmin : il est calculé à partir des durées et des phases que ta montre transmet, avec des règles affichées ici. Les montres estiment les phases par le mouvement et la fréquence cardiaque, ce qui reste approximatif comparé à une polysomnographie. Ce n'est pas un examen médical.</div>
      </div>` };
  }
});

// ===================== Trace du parcours =====================
function routeMap(samples) {
  const r = routeOf(samples);
  if (!r) return '';
  const W = 400, H = Math.round(Math.max(150, Math.min(320, W / Math.max(0.5, Math.min(2.2, r.ratio))))), pad = 14;
  const sw = W - pad * 2, sh = H - pad * 2, sc = Math.min(sw, sh);
  const ox = pad + (sw - sc * Math.min(1, r.ratio >= 1 ? 1 : r.ratio)) / 2, oy = pad + (sh - sc * Math.min(1, r.ratio >= 1 ? 1 / r.ratio : 1)) / 2;
  const P = p => [ox + p[0] * sc, oy + p[1] * sc];
  const d = r.pts.map((p, i) => { const q = P(p); return `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`; }).join('');
  const a = P(r.pts[0]), b = P(r.pts[r.pts.length - 1]);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" style="background:var(--panel2);border-radius:var(--r-s)">
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity=".92"/>
    <circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="5" fill="var(--good)"/>
    <circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="5" fill="var(--low)"/></svg>
  <div class="legend"><span><i style="--c:var(--good)"></i>départ</span><span><i style="--c:var(--low)"></i>arrivée</span><span class="faint">${r.n} points GPS</span></div>`;
}

// ===================== Flux d'activités =====================
const SPORT_GROUP = { running: 'Course', trackRunning: 'Course', treadmillRunning: 'Course', trailRunning: 'Trail', hiking: 'Rando', walking: 'Marche', cycling: 'Vélo', indoorCycling: 'Vélo', strengthTraining: 'Muscu' };
Object.assign(MODALS, {
  activities(m) {
    const filter = m.sport || '';
    const all = [...S.activities].sort((a, b) => b.start - a.start);
    const groups = [...new Set(all.map(a => SPORT_GROUP[a.sport] || LABELS.sport[a.sport]))];
    const acts = filter ? all.filter(a => (SPORT_GROUP[a.sport] || LABELS.sport[a.sport]) === filter) : all;
    const pend = all.filter(a => a.linkState === 'validate');
    const months = {};
    for (const a of acts) { const k = D.ofTime(a.start).slice(0, 7); (months[k] = months[k] || []).push(a); }
    const monthName = k => { const [y, mo] = k.split('-'); return `${MONTHS[+mo - 1].replace('.', '')} ${y}`; };
    return { title: `Activités (${acts.length})`, keepScroll: true, body: `
      ${pend.length && !filter ? sec('À associer à une séance') + `<div class="list">${pend.map(actRow).join('')}</div>` : ''}
      <div class="wrap" style="margin:10px 0 2px">
        <button class="pill ${filter ? '' : 'line'}" data-a="actFilter" data-s="" style="--c:var(--accent);border:0;cursor:pointer;font:inherit;font-size:12px">Tout</button>
        ${groups.map(g => `<button class="pill ${filter === g ? '' : 'line'}" data-a="actFilter" data-s="${esc(g)}" style="--c:var(--accent);border:0;cursor:pointer;font:inherit;font-size:12px">${esc(g)}</button>`).join('')}
      </div>
      ${Object.keys(months).sort().reverse().map(k => {
        const list = months[k], km = list.reduce((s, a) => s + (a.dist || 0), 0) / 1000;
        const min = list.reduce((s, a) => s + (a.timer || a.elapsed) / 60, 0), up = list.reduce((s, a) => s + (a.up || 0), 0);
        return `<div class="band"><h3 style="text-transform:capitalize">${monthName(k)}</h3>
          <span class="meta">${list.length} sorties · ${fx(km, 0)} km · ${fmtMin(min)}${up ? ' · D+ ' + Math.round(up) + ' m' : ''}</span></div>
          <div class="list">${list.map(actRow).join('')}</div>`;
      }).join('') || hint('Aucune activité. Connecte Garmin ou importe un fichier FIT.')}` };
  }
});
Object.assign(A, { actFilter(d) { const top = ui.stack[ui.stack.length - 1]; top.sport = d.s || ''; renderModal(); } });

// ----- Journée : ce que la montre enregistre en dehors des séances -----
function dailyCard(day) {
  const m = S.metrics[day] || {}, prev = D.range(D.add(day, -13), day).map(x => S.metrics[x]).filter(Boolean);
  const has = ['steps', 'stress', 'bodyBattery'].filter(k => m[k] != null);
  if (!has.length) return '';
  const avgSteps = St.mean(prev.map(x => x.steps).filter(v => v != null));
  return `<div class="card"><div class="row"><div class="metricName">Ta journée</div><span class="meta">d'après la montre</span></div>
    <div class="trio" style="margin-top:10px">
      ${m.steps != null ? tile('Pas', (m.steps / 1000).toFixed(1).replace('.', ','), 'k', avgSteps ? `moy. ${(avgSteps / 1000).toFixed(1).replace('.', ',')} k` : '') : ''}
      ${m.stress != null ? tile('Stress', Math.round(m.stress), '/100', m.stress < 26 ? 'repos' : m.stress < 51 ? 'faible' : m.stress < 76 ? 'moyen' : 'élevé') : ''}
      ${m.bodyBattery != null ? tile('Body Battery', Math.round(m.bodyBattery), '', 'valeur Garmin') : ''}
    </div>
    <div class="note tight">Ces valeurs viennent telles quelles de Garmin. Le stress et la Body Battery sont des indices propriétaires, dont le calcul n'est pas public : Cockpit ne les utilise dans aucune de ses analyses.</div></div>`;
}

// ===================== VO2max =====================
function vo2Card() {
  const e = vo2maxEstimates();
  if (!e.list.length) return `<div class="card"><div class="metricName">VO2max</div>
    <div class="meta">Il faut un effort maximal de 6 à 12 minutes dans une sortie, ou ta fréquence cardiaque maximale et de repos dans le profil.</div></div>`;
  const col = e.conf === 'high' ? 'var(--good)' : e.conf === 'moderate' ? 'var(--accent)' : 'var(--mid)';
  return `<div class="card" data-a="vo2" style="cursor:pointer">
    <div class="row top"><div class="grow"><div class="metricName">VO2max estimée</div>
      <div class="meta">${e.list.length} méthode${e.list.length > 1 ? 's' : ''}${e.spread != null ? ` · écart de ${fx(e.spread, 1)} entre elles` : ''}</div></div>
      <div style="text-align:right"><div class="num" style="font-size:30px;color:${col}">${fx(e.median, 1)}</div><div class="meta">ml/kg/min</div></div></div>
    <div style="margin-top:10px">${e.list.slice(0, 3).map(o => `<div class="kv tiny"><span>${esc(o.name)}</span><b>${fx(o.v, 1)}</b></div>`).join('')}</div>
    ${e.list.length > 3 ? `<div class="meta">et ${e.list.length - 3} autre${e.list.length > 4 ? 's' : ''}</div>` : ''}
  </div>`;
}
Object.assign(A, { vo2: () => push('vo2') });
Object.assign(MODALS, {
  vo2() {
    const day = today(), e = vo2maxEstimates(), tr = vo2Trend(day), P = S.profile;
    const col = v => v == null ? 'var(--faint)' : 'var(--text)';
    return { title: 'VO2max', body: `
      ${e.median != null ? `<div class="card" style="text-align:center">
        <div class="num" style="font-size:56px">${fx(e.median, 1)}</div>
        <div class="metricName">ml d'oxygène par kg et par minute</div>
        <div class="meta">médiane de ${e.list.length} estimation${e.list.length > 1 ? 's' : ''}, qui vont de ${fx(e.lo, 1)} à ${fx(e.hi, 1)}</div>
        <div class="wrap" style="justify-content:center;margin-top:8px">${badge('fiabilité ' + LABELS.conf[e.conf].toLowerCase(), e.conf === 'high' ? 'var(--good)' : e.conf === 'moderate' ? 'var(--accent)' : 'var(--mid)')}</div>
      </div>` : hint('Aucune estimation possible pour l\'instant.')}

      ${sec('Les méthodes')}
      ${e.list.map(o => `<div class="card">
        <div class="row top"><div class="grow"><div class="metricName">${esc(o.name)}</div><div class="meta">${esc(o.src)} — ${esc(o.ref)}</div></div>
          <div class="num" style="font-size:22px;color:${col(o.v)}">${fx(o.v, 1)}</div></div>
        ${o.se ? `<div class="meta">± ${fx(o.se, 1)} ml/kg/min d'erreur type</div>` : ''}
        <div class="note tight">${esc(o.caveat)}</div>
        ${o.act ? `<button class="link" style="padding:4px 0" data-a="activity" data-id="${esc(o.act)}">Voir la sortie</button>` : ''}
      </div>`).join('')}

      ${tr.length > 2 ? sec('Évolution', '6 mois') + `<div class="card">
        ${chart({ h: 150, series: [{ pts: tr, color: 'var(--accent)', dots: true, fill: true }] })}
        <div class="meta">médiane des méthodes basées sur la performance, calculée sur 28 jours glissants</div>
        <div class="note tight">Cette courbe bouge avec tes performances. Une baisse après une période sans effort maximal ne veut pas dire que ta VO2max a baissé : elle veut dire que tu n'as rien couru d'assez dur pour l'estimer.</div></div>` : ''}

      ${e.mas ? sec('Ta vitesse maximale aérobie') + `<div class="card">
        <div class="row"><div class="grow"><div class="metricName">${fx(e.mas, 1)} km/h mesurée</div>
          <div class="meta">${pace(1000 / (e.mas / 3.6))} /km, d'après ton meilleur 6 minutes${P.vma ? ` · ${fx(P.vma, 1)} km/h dans ton profil` : ''}</div></div>
          ${P.vma && Math.abs(P.vma - e.mas) > 0.3 ? `<button class="btn sm" data-a="useMas" data-v="${e.mas.toFixed(2)}">Mettre à jour</button>` : ''}</div></div>` : ''}

      ${sec('Ce que ce chiffre vaut')}
      <div class="card">
        <div class="small">Aucune de ces valeurs n'est une mesure. Une VO2max se mesure en laboratoire, avec un masque, sur un test à effort croissant jusqu'à l'épuisement.</div>
        <div class="small" style="margin-top:8px">Les méthodes basées sur une performance mélangent trois choses : ta consommation maximale d'oxygène, ton économie de course, et ta capacité à te gérer sur l'effort. Deux coureurs ayant la même VO2max mesurée n'auront pas le même chiffre ici si l'un court plus économe que l'autre.</div>
        <div class="small" style="margin-top:8px">Elles supposent aussi que l'effort était vraiment maximal. Un 6 minutes couru à 95 % sous-estime le résultat, sans qu'aucun calcul ne puisse le détecter.</div>
        <div class="small" style="margin-top:8px">Le rapport des fréquences cardiaques ne dépend d'aucune performance, mais il est très sensible à ta fréquence de repos, qui bouge avec le sommeil, le stress et la caféine.</div>
        <div class="note">C'est pour cela que l'app affiche plusieurs méthodes au lieu d'un chiffre unique : quand elles s'accordent, l'estimation est solide ; quand elles divergent, l'écart te dit à quel point il faut s'en méfier.</div>
      </div>` };
  }
});
Object.assign(A, {
  useMas(d) { S.profile.vma = +d.v; save(); toast('Vitesse maximale aérobie mise à jour'); render(); }
});
