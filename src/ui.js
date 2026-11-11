'use strict';
// ===== État, stockage, interface =====

const TPL = Object.fromEntries(SESSION_TEMPLATES.map(t => [t.id, t]));
const STORE_KEY = 'cockpit-local-v1';
const defaultProfile = () => ({ name: 'Benjamin', sex: 'male', birthYear: null, heightCm: null, massKg: null, bodyFat: null, restingHR: null, maxHR: null,
  sleepNeed: 8, vma: 19, refs: 'EF 5:00–5:40 /km · Marathon visé 4:58 /km · Semi 1 h 30 = 4:16 /km · Seuil 4:00–4:15 /km · 400 m 1:25–1:32',
  inc: 1.25, formula: 'brzycki', suggestRIR: 2, defaultRest: 90 });
let S = fresh();
function fresh() { return { v: 1, profile: defaultProfile(), metrics: {}, wellness: {}, sessions: {}, activities: [], strength: [], events: JSON.parse(JSON.stringify(SEED_EVENTS)), adaptations: [], customEx: [], perfs: [], simDate: null }; }
function load() { try { const raw = localStorage.getItem(STORE_KEY); if (raw) return Object.assign(fresh(), JSON.parse(raw)); } catch (e) { } return fresh(); }
function save() { if (typeof Cloud !== 'undefined' && Cloud.mode === 'cloud') return Cloud.saved(); try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { toast('Stockage du navigateur plein ou indisponible : exporte une sauvegarde.'); } }
const LIB = () => { const o = Object.fromEntries(EXERCISES.map(e => [e.id, e])); for (const c of S.customEx) o[c.id] = c; return o; };
const today = () => S.simDate || D.realToday();

const ui = { tab: 'today', week: 0, stack: [], wo: null, timer: null };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fx = (v, d = 0) => v == null || !isFinite(v) ? '–' : Number(v).toFixed(d).replace('.', ',');
const fmtMin = m => { const t = Math.round(m); return t >= 60 ? `${Math.floor(t / 60)} h ${p2(t % 60)}` : `${t} min`; };
const fmtDur = s => { s = Math.round(s); return s >= 3600 ? `${Math.floor(s / 3600)}:${p2(Math.floor(s % 3600 / 60))}:${p2(s % 60)}` : `${Math.floor(s / 60)}:${p2(s % 60)}`; };
const parseDur = t => { const p = String(t).split(':').map(x => Number(x.trim())); if (!p.length || p.some(isNaN)) return null; return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0]; };
const pace = spk => isFinite(spk) && spk > 0 ? `${Math.floor(Math.round(spk) / 60)}:${p2(Math.round(spk) % 60)}` : '–';
const rng = (r, u, d = 0) => !r ? null : r[0] === r[1] ? `${fx(r[0], d)} ${u}` : `${fx(r[0], d)}–${fx(r[1], d)} ${u}`;
const num = v => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const uid = () => Math.random().toString(36).slice(2, 10);


// ===================== Agrégation (équivalent de Dashboard.swift) =====================
function dash(day) {
  const P = S.profile, lib = LIB();
  const readings = [], rhr = {}, nights = [], intake = {}, weight = {};
  for (const d in S.metrics) {
    if (d > day) continue; const m = S.metrics[d];
    if (m.hrv > 0) readings.push({ date: d, value: m.hrv, method: m.hrvMethod || 'rmssd' });
    if (m.rhr > 0) rhr[d] = m.rhr;
    if (m.sleepMin > 0) nights.push({ date: d, sleepMin: m.sleepMin, inBedMin: m.inBedMin, deepMin: m.deepMin, remMin: m.remMin, prov: m.sleepProv });
    if (m.intake > 0) intake[d] = m.intake; if (m.weight > 0) weight[d] = m.weight;
  }
  const counts = {}; readings.forEach(r => counts[r.method] = (counts[r.method] || 0) + 1);
  const method = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'rmssd';
  const hrv = hrvAnalyze(readings, method), rhrR = baselineAnalyze(rhr), sleep = sleepSummary(nights, day, P.sleepNeed || 8);
  const trimpDay = {}, kmEff = {}, mech = [];
  let from = D.add(day, -120);
  for (const a of S.activities) {
    const d = D.ofTime(a.start); if (d > day) continue; if (d < from) from = d;
    if (a.trimp != null) trimpDay[d] = (trimpDay[d] || 0) + a.trimp;
    if (['running', 'trailRunning', 'trackRunning', 'treadmillRunning', 'walking', 'hiking'].includes(a.sport)) {
      const km = (a.dist || 0) / 1000; mech.push({ d, km, up: a.up || 0, down: a.down || 0 }); kmEff[d] = (kmEff[d] || 0) + kmEffort(km, a.up || 0);
    }
  }
  const srpe = {}, legSets = {}, weekSets = [];
  for (const s of S.strength) {
    const d = D.ofTime(s.start); if (d > day) continue;
    if (s.rpe != null && s.end) srpe[d] = (srpe[d] || 0) + s.rpe * (s.end - s.start) / 60000;
    for (const x of s.sets) {
      if (x.warm) continue;
      if (d >= D.add(day, -6)) weekSets.push(Object.assign({ sid: s.id }, x));
      const e = lib[x.ex]; if (e && e.p.some(m => LOWER.has(m)) && (x.rir ?? 0) <= 4) legSets[d] = (legSets[d] || 0) + 1;
    }
  }
  const restDays = new Set();
  for (const k in S.sessions) {
    const r = S.sessions[k], d = k.split('|')[0]; if (d > day) continue;
    if (r.rpe != null && r.durationMin) srpe[d] = (srpe[d] || 0) + r.rpe * r.durationMin;
    if (r.status === 'completed' && (r.templateId || k.split('|')[2]) === 'rest') restDays.add(d);
  }
  const trimpByDay = trimpDay, trimpStates = loadStates(trimpDay, restDays, from, day), srpeStates = loadStates(srpe, restDays, from, day);
  const wser = { fatigue: {}, soreness: {}, stress: {}, motivation: {} };
  for (const d in S.wellness) { if (d > day) continue; for (const k in wser) if (S.wellness[d][k] != null) wser[k][d] = S.wellness[d][k]; }
  const wToday = {}; for (const k in wser) { const r = baselineAnalyze(wser[k]).pop(); if (r && r.date === day) wToday[k] = r; }
  const hT = hrv.find(x => x.date === day), rT = rhrR.find(x => x.date === day);
  const comp = []; if (hT?.z != null) comp.push(Math.max(-3, Math.min(3, hT.z))); if (rT?.z != null) comp.push(Math.max(-3, Math.min(3, -rT.z)));
  for (const k in wToday) if (wToday[k].z != null) comp.push(Math.max(-3, Math.min(3, (k === 'motivation' ? 1 : -1) * wToday[k].z)));
  const seqs = competitionSequences(S.events), upcoming = S.events.filter(e => e.end >= day && e.status !== 'cancelled').sort((a, b) => a.start < b.start ? -1 : 1);
  const sumMech = (a, b) => { const sel = mech.filter(m => m.d >= a && m.d <= b); const km = sel.reduce((s, m) => s + m.km, 0), up = sel.reduce((s, m) => s + m.up, 0); return { km, up, down: sel.reduce((s, m) => s + m.down, 0), ke: kmEffort(km, up) }; };
  const linked = new Set(S.activities.map(a => a.linked).filter(Boolean));
  const obs = observations({ today: day, hrv, rhr: rhrR, sleep, trimp: trimpStates[trimpStates.length - 1], kmEff, legSets,
    todaySessions: Plan.sessions(day), yestSessions: Plan.sessions(D.add(day, -1)), wellness: S.wellness[day], events: upcoming, sequences: seqs });
  const wts = Object.keys(weight).sort(); const lastW = wts.length ? weight[wts[wts.length - 1]] : P.massKg;
  const cat = dayCategory(Plan.enduranceMin(day));
  let bmr = null; if (lastW) { if (P.bodyFat != null) bmr = Energy.cunningham(lastW * (1 - P.bodyFat / 100)); else if (P.heightCm && P.birthYear) bmr = Energy.mifflin(lastW, P.heightCm, Number(day.slice(0, 4)) - P.birthYear, P.sex); }
  return { day, method, hrv, rhr: rhrR, sleep, nights, hT, rT, trimpByDay, lastNight: nights.find(n => n.date === day), comp: comp.length ? St.mean(comp) : null, compN: comp.length,
    trimpStates, srpeStates, obs, m7: sumMech(D.add(day, -6), day), m28: sumMech(D.add(day, -27), day), vol: volumeByMuscle(weekSets, lib), seqs, upcoming, linked,
    cat, lastW, bmr, tdee: Energy.adaptive(intake, weight, day) };
}

function ivText(i) {
  let s = (i.reps[0] === i.reps[1] ? i.reps[0] : i.reps.join('–')) + ' × ';
  const f = x => x >= 60 && x % 60 === 0 ? `${x / 60} min` : x >= 60 ? fmtDur(x) : `${x} s`;
  if (i.distM) s += i.distM + ' m'; else if (i.durS) s += i.durS[0] === i.durS[1] ? f(i.durS[0]) : `${f(i.durS[0])}–${f(i.durS[1])}`;
  s += ' · ' + i.int; if (i.grade) s += ' · ' + (i.grade[0] === i.grade[1] ? i.grade[0] : i.grade.join('–')) + ' %'; if (i.rec) s += ' · récup. ' + i.rec.toLowerCase();
  return s;
}
function rxText(x) {
  let s = x.sets + ' × ';
  if (x.reps) s += x.reps[0] === x.reps[1] ? x.reps[0] : x.reps.join('–');
  else if (x.durS) s += (x.durS[0] === x.durS[1] ? x.durS[0] : x.durS.join('–')) + ' s';
  else s = x.sets + ' série' + (x.sets > 1 ? 's' : '');
  return s + (x.side ? ' / côté' : '');
}
function sm(a) { // courbes d'une activité, chargées à la demande depuis le cloud
  if (a.samples) return a.samples;
  if (a.nSamples && typeof Cloud !== 'undefined' && Cloud.mode === 'cloud' && !a._smReq) { a._smReq = true; Cloud.samples([a]).then(() => render()); }
  return [];
}
async function recomputeTrimp() {
  if (typeof Cloud !== 'undefined' && Cloud.mode === 'cloud') { toast('Recalcul du TRIMP de toutes les activités…'); await Cloud.samples(S.activities); }
  S.activities.forEach(computeTrimp); save(); render();
}
function srcLabel(a, short) { return a.source === 'garmin' ? ((a.samples?.length || a.nSamples) ? 'Garmin' : 'Garmin (résumé)') : a.source === 'fitFile' ? (short ? 'FIT' : 'Fichier FIT') : a.source === 'demo' ? 'Démo' : 'Manuel'; }
function linkedMap() { const m = {}; for (const a of S.activities) if (a.linked) m[a.linked] = a; return m; }


// ===================== Fenêtres (modales) =====================
const MODALS = {
  checkin() {
    const day = today(), w = S.wellness[day] || {}, m = S.metrics[day] || {}, prev = S.metrics[D.add(day, -1)] || {};
    const garmin = k => m[k + 'Prov'] === 'garmin';
    const scale = (k, t, lo, hi) => `<div class="field"><div class="row"><span>${t}</span><b class="acc" id="v-${k}">${w[k] ? w[k] : '–'}</b></div>
      <div class="scale" data-k="${k}">${[1, 2, 3, 4, 5, 6, 7].map(i => `<button class="${w[k] === i ? 'on' : ''}" data-a="scale" data-k="${k}" data-v="${i}">${i}</button>`).join('')}</div>
      <div class="ladderEnds"><span>${lo}</span><span>${hi}</span></div></div>`;
    return { title: 'Check-in', action: '<button class="link" data-a="saveCheckin">Enregistrer</button>', body: `
      <div class="meta">${D.long(day)}</div>
      <h2 style="margin:2px 0 12px">Comment tu te sens</h2>
      <div class="card">
        ${scale('fatigue', 'Fatigue', 'aucune', 'épuisé')}
        ${scale('soreness', 'Courbatures', 'aucune', 'très fortes')}
        ${scale('stress', 'Stress', 'serein', 'très tendu')}
        ${scale('motivation', 'Motivation', 'très basse', 'excellente')}
        ${scale('sleepQuality', 'Qualité du sommeil', 'très mauvaise', 'excellente')}
      </div>
      <div class="note tight">Échelle de Hooper &amp; Mackinnon (1995). Après deux semaines, chaque réponse est comparée à ta propre moyenne, pas à une norme.</div>
      <div class="card">
        <div class="field"><label>Douleur — 0 si rien ne te fait mal</label><input type="number" min="0" max="7" name="pain" value="${w.pain ?? 0}"></div>
        <div class="field"><label>Où</label><input name="painLoc" value="${esc(w.painLoc || '')}" placeholder="tendon d'Achille gauche…"></div>
      </div>
      <h2 style="margin:22px 0 4px">Mesures du matin</h2>
      <div class="note tight">Laisse vide ce que tu ne sais pas. ${typeof Cloud !== 'undefined' && Cloud.mode === 'cloud' ? 'Ce que tu saisis ici n\'est jamais écrasé par Garmin.' : ''}</div>
      <div class="card">
        <div class="field"><label>Variabilité cardiaque (ms)${garmin('hrv') ? ' — Garmin a déjà rempli' : ''}</label><input inputmode="decimal" name="hrv" value="${m.hrvMethod !== 'sdnn' && m.hrv ? Math.round(m.hrv) : ''}"></div>
        <div class="field"><label>Fréquence cardiaque au repos (bpm)${garmin('rhr') ? ' — Garmin a déjà rempli' : ''}</label><input inputmode="decimal" name="rhr" value="${m.rhr ? Math.round(m.rhr) : ''}"></div>
        <div class="field"><label>Sommeil (heures)${garmin('sleep') ? ' — Garmin a déjà rempli' : ''}</label><input inputmode="decimal" name="sleep" value="${m.sleepMin ? fx(m.sleepMin / 60, 1) : ''}"></div>
        <div class="field"><label>Poids (kg)</label><input inputmode="decimal" name="weight" value="${m.weight ? fx(m.weight, 1) : ''}"></div>
        <div class="field"><label>Calories mangées hier</label><input inputmode="decimal" name="intake" value="${prev.intake || ''}"></div>
      </div>
      <div class="card"><div class="field"><label>Quelque chose à noter</label><textarea name="note">${esc(w.note || '')}</textarea></div></div>` };
  },
  session(m) {
    const s = findSession(m.id); if (!s) return { title: 'Séance', body: hint('Séance introuvable.') };
    const t = s.t, lib = LIB(), r = S.sessions[s.id] || {}, lm = linkedMap(), act = lm[s.id], st = effectiveStatus(s, new Set(Object.keys(lm)), today());
    const sameDay = S.activities.filter(a => D.ofTime(a.start) === s.date && !a.linked);
    const hist = S.adaptations.filter(a => a.key === s.id).sort((a, b) => b.at - a.at);
    return { title: LABELS.slot[s.slot], body: `
      <div class="card"><div class="srow">${badge(LABELS.kind[t.kind], KCOL[t.kind])}${badge(LABELS.intensity[t.intensity], 'var(--t2)')}${badge(s.variant === 'b' ? 'Semaine B' : 'Semaine A', 'var(--calm)')}</div>
        <h2>${esc(t.title)}</h2><div class="tiny t2">${D.long(s.date)} · ${LABELS.slot[s.slot]}</div><p class="small">${esc(t.obj)}</p>
        ${t.dur ? `<div class="small">🕐 ${rng(t.dur, 'min')}</div>` : ''}${s.cond ? `<div class="small warn">❓ ${esc(s.cond)}</div>` : ''}
        ${t.notes.map(n => `<div class="tiny t2">• ${esc(n)}</div>`).join('')}
        ${t.kind === 'strength' || t.kind === 'mobility' ? `<button class="btn pri full" data-a="startWorkout" data-tpl="${t.id}" data-key="${esc(s.id)}">▶ Démarrer la séance</button>` : ''}</div>
      ${t.blocks.map(b => `<div class="sec"><span>${esc(b.title)}${b.dur ? ' · ' + rng(b.dur, 'min') : ''}</span></div><div class="card">
        ${b.iv.map(i => `<div class="small">${esc(ivText(i))}</div>`).join('')}
        ${b.ex.map(x => `<div class="exrow click" data-a="exercise" data-id="${x.id}"><div class="row"><span class="small b">${esc(lib[x.id]?.name || x.id)}</span><span class="acc small">${rxText(x)}</span></div><div class="tiny t2">${[x.tempo, x.rest ? 'repos ' + x.rest + ' s' : null, x.ss ? 'superset ' + x.ss : null, x.note].filter(Boolean).map(esc).join(' · ')}</div></div>`).join('')}
        ${b.notes.map(n => `<div class="tiny t2">${esc(n)}</div>`).join('')}</div>`).join('')}
      ${sec('Suivi')}
      <div class="card"><div class="field"><label>Statut</label><select data-a2="setStatus" data-key="${esc(s.id)}">${Object.keys(LABELS.status).map(k => `<option value="${k}" ${k === st ? 'selected' : ''}>${LABELS.status[k]}</option>`).join('')}</select></div>
        ${s.alt.length || (r.templateId && r.templateId !== r.original) ? `<div class="field"><label>Variante</label><select data-a2="setVariant" data-key="${esc(s.id)}"><option value="">${esc(t.title)} (actuelle)</option>${(r.original && r.original !== t.id ? [r.original] : []).concat(s.alt).filter(a => a !== t.id).map(a => `<option value="${a}">${esc(TPL[a].title)}</option>`).join('')}</select></div>` : ''}
        <div class="tiny t3">Une séance manquée n'est jamais reportée automatiquement. « Supprimée » retire définitivement une séance non réalisée.</div></div>
      ${sec('Ressenti et contenu réel')}
      <div class="card"><div class="field"><label>RPE de séance : <b class="acc" id="rpeV">${r.rpe ?? 5}/10</b></label><input type="range" min="0" max="10" step="1" name="rpe" value="${r.rpe ?? 5}" oninput="document.getElementById('rpeV').textContent=this.value+'/10'"></div>
        <div class="field"><label>Durée (min)</label><input inputmode="numeric" name="dur" value="${r.durationMin ?? ''}"></div>
        <div class="field"><label>${t.toLog ? 'Contenu réel de la séance (ex. 10 × 400 m, récup. 1\')' : 'Note'}</label><textarea name="note">${esc(r.note || '')}</textarea></div>
        <button class="btn full" data-a="saveLog" data-key="${esc(s.id)}">Enregistrer</button><div class="tiny t3">sRPE = RPE × durée (Foster et al., 2001), suivi à part du TRIMP.</div></div>
      ${sec('Activité associée')}
      <div class="card">${act ? comparison(s, act) + `<button class="btn full danger" data-a="unlink" data-id="${esc(act.id)}">Dissocier</button>` :
        (sameDay.length ? sameDay.map(a => `<div class="li click" data-a="link" data-id="${esc(a.id)}" data-key="${esc(s.id)}">🔗 ${LABELS.sport[a.sport]} · ${fmtMin(a.elapsed / 60)} · ${new Date(a.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>`).join('') : '<div class="small t2">Aucune activité importée ce jour-là.</div>')}</div>
      ${hist.length ? sec('Historique des adaptations') + hist.map(a => `<div class="card"><div class="small b">${LABELS.decision[a.decision]} · ${new Date(a.at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</div>${a.reason ? `<div class="tiny">${esc(a.reason)}</div>` : ''}<div class="tiny t2 pre">${esc(a.indicators)}</div><div class="tiny t3">Confiance : ${LABELS.conf[a.conf].toLowerCase()} · cockpit-core-1.0.0</div></div>`).join('') : ''}` };
  },
  adapt(m) {
    const s = findSession(m.key), d = dash(today()), obs = d.obs.filter(o => o.cat !== 'Compétitions' || o.lvl === 'attention');
    const opts = [...new Set([...s.alt, ...(s.t.leg.includes('sprints') ? ['run_easy_hilly'] : []), ...(isEndurance(s.t.kind) ? ['run_easy45', 'bike_z1', 'walk_recovery'] : []), 'mob_hips_ankles', 'rest'])].filter(x => x !== s.t.id);
    return { title: 'Adapter la séance', action: '<button class="link b" data-a="saveAdapt">Valider</button>', body: `
      <div class="card"><b>${esc(s.t.title)}</b><div class="tiny t2">${D.long(s.date)} · ${LABELS.slot[s.slot]}</div></div>
      ${sec('Ce que montrent les données')}
      <div class="card">${obs.length ? obs.map(o => `<div class="small" style="color:${o.lvl === 'attention' ? 'var(--warn)' : 'var(--t2)'}">${o.lvl === 'attention' ? '⚠' : 'ℹ'} ${esc(o.msg)}</div>`).join('') : '<div class="small t2">Aucune observation particulière.</div>'}
        <div class="tiny t3">Aucune règle automatique : une valeur isolée ne justifie pas à elle seule de modifier la séance.</div></div>
      ${sec('Décision')}
      <div class="card"><input type="hidden" name="key" value="${esc(s.id)}"><div class="field"><label>Décision</label><select name="decision" onchange="document.getElementById('repl').style.display=this.value==='replace'?'block':'none'">${Object.keys(LABELS.decision).map(k => `<option value="${k}">${LABELS.decision[k]}</option>`).join('')}</select></div>
        <div class="field" id="repl" style="display:none"><label>Remplacer par</label><select name="replacement">${opts.map(o => `<option value="${o}">${esc(TPL[o].title)}</option>`).join('')}</select></div>
        <div class="field"><label>Raison</label><textarea name="reason">${esc(obs.filter(o => o.lvl === 'attention').map(o => o.msg).join(' '))}</textarea></div>
        <div class="tiny t3">« Reporter » marque la séance reportée sans la déplacer, pour ne pas empiler les charges.</div></div>` };
  },
  weekEdit(m) {
    const w = ui.weekDraft, names = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const opts = cur => SESSION_TEMPLATES.map(t => `<option value="${t.id}" ${t.id === cur ? 'selected' : ''}>${esc(t.title)}</option>`).join('');
    const edited = !!S.weekEdits?.[m.w];
    return { title: w.name, action: '<button class="link b" data-a="weekSave">Enregistrer</button>', body: `
      <div class="card tiny t2">Semaine type utilisée par toutes les phases « ${esc(w.name)} ». Les séances déjà réalisées gardent leur historique. ${edited ? '<b class="warn">Modifiée par toi.</b>' : 'Version d\'origine.'}</div>
      ${[1, 2, 3, 4, 5, 6, 7].map(d => `<div class="sec"><span>${names[d]}</span><small><a data-a="weekAdd" data-d="${d}">＋ ajouter</a></small></div><div class="card">${(w.days[d] || []).map((p, i) => `
        <div class="exrow"><div class="row"><select data-a2="wkSlot" data-d="${d}" data-i="${i}" style="width:auto">${Object.entries(LABELS.slot).map(([k, v]) => `<option value="${k}" ${k === p.slot ? 'selected' : ''}>${v}</option>`).join('')}</select><a class="tiny danger" data-a="weekDel" data-d="${d}" data-i="${i}">Retirer</a></div>
        <div class="field"><select data-a2="wkA" data-d="${d}" data-i="${i}">${opts(p.a)}</select></div>
        <div class="field"><label>Semaine B (facultatif)</label><select data-a2="wkB" data-d="${d}" data-i="${i}"><option value="">— identique —</option>${opts(p.b)}</select></div>
        <div class="srow small"><label><input type="checkbox" data-a2="wkOpt" data-d="${d}" data-i="${i}" ${p.opt ? 'checked' : ''}> Facultative</label><label><input type="checkbox" data-a2="wkLight" data-d="${d}" data-i="${i}" ${p.light ? 'checked' : ''}> Allégée</label></div>
        <div class="field"><input placeholder="Condition (ex. si la récupération le permet)" value="${esc(p.cond || '')}" data-a2="wkCond" data-d="${d}" data-i="${i}"></div></div>`).join('') || '<div class="tiny t3">Rien de prévu</div>'}</div>`).join('')}
      ${edited ? `<button class="btn full danger" data-a="weekReset" data-w="${m.w}">Revenir à la version d'origine</button>` : ''}` };
  },
  phases() {
    const day = today();
    return { title: 'Saison 2026–2027', body: PHASES.map(p => `<div class="card"><div class="row"><b>${esc(p.name)}</b>${day >= p.start && day <= p.end ? badge('En cours') : ''}</div>
      <div class="tiny t2">${D.short(p.start)} ${p.start.slice(0, 4)} → ${D.short(p.end)} ${p.end.slice(0, 4)} · ${p.kind}</div><div class="small">${esc(p.obj)}</div>
      ${p.targets.map(t => `<div class="tiny t2">🎯 ${esc(t)}</div>`).join('')}${p.cons.map(c => `<div class="tiny warn">⚠ ${esc(c)}</div>`).join('')}
      ${p.deload ? `<div class="tiny" style="color:var(--calm)">Allègement suggéré toutes les ${p.deload} semaines, si justifié</div>` : ''}
      <div class="tiny t3">Semaine type : ${esc((S.weekEdits?.[p.week] || WEEK_TEMPLATES[p.week]).name)}${S.weekEdits?.[p.week] ? ' (modifiée)' : ''}</div><button class="btn sm" data-a="gotoDate" data-d="${p.start}">Voir cette phase</button></div>`).join('') +
      sec('Objectifs de saison') + `<div class="card">${SEASON_GOALS.map(g => `<div class="small">• ${esc(g)}</div>`).join('')}</div>` + sec('Règles de la semaine') + `<div class="card">${WEEK_RULES.map(g => `<div class="small">• ${esc(g)}</div>`).join('')}</div>` };
  },
  jump() {
    return { title: 'Simuler une date', body: `<div class="card"><div class="small t2">Pratique pour voir le programme d'une autre période (préparation marathon, affûtage, UT4M…). Toute l'app se comporte comme si nous étions à cette date.</div>
      <div class="field"><label>Date</label><input type="date" name="sim" value="${today()}" min="2026-09-01" max="2027-09-30"></div>
      <button class="btn pri full" data-a="setSim">Appliquer</button><button class="btn full" data-a="simReset">Revenir à aujourd'hui</button></div>
      <div class="card">${['2026-11-07|Semi du 7 novembre', '2026-12-22|Allègement base aérobie', '2027-02-04|Prépa marathon, semaine A', '2027-04-10|Affûtage marathon', '2027-04-17|Marathon d\'Annecy', '2027-05-08|Prépa trail', '2027-07-16|UT4M jour 2', '2027-08-07|Prépa OCC'].map(x => { const [d, l] = x.split('|'); return `<div class="li click" data-a="gotoDate" data-d="${d}">${l} <span class="tiny t2">${D.short(d)}</span></div>`; }).join('')}</div>` };
  },
  event(m) {
    const e = m.id ? S.events.find(x => x.id === m.id) : { id: 'event-' + uid(), name: '', start: today(), end: today(), discipline: 'trail', status: 'toConfirm', priority: null, isNew: true };
    if (!e) return { title: 'Compétition', body: '' };
    const sel = (name, obj, cur, none) => `<select name="${name}">${none ? `<option value="">${none}</option>` : ''}${Object.keys(obj).map(k => `<option value="${k}" ${k === cur ? 'selected' : ''}>${obj[k]}</option>`).join('')}</select>`;
    const f = (l, n, v, t = 'text', ph = '') => `<div class="field"><label>${l}</label><input type="${t}" name="${n}" value="${esc(v ?? '')}" placeholder="${ph}"></div>`;
    return { title: e.isNew ? 'Nouvelle compétition' : e.name, action: `<button class="link b" data-a="saveEvent" data-id="${e.id}" data-new="${e.isNew ? 1 : ''}">Enregistrer</button>`, body: `
      <div class="card">${f('Nom', 'name', e.name)}<div class="grid2">${f('Début', 'start', e.start, 'date')}${f('Fin', 'end', e.end, 'date')}</div>
        <div class="field"><label>Discipline</label>${sel('discipline', LABELS.discipline, e.discipline)}</div>${f('Format', 'format', e.format)}
        <div class="grid3">${f('Distance (km)', 'distanceKm', e.distanceKm, 'text', 'non renseigné')}${f('D+ (m)', 'upM', e.upM, 'text', '–')}${f('D− (m)', 'downM', e.downM, 'text', '–')}</div></div>
      <div class="card"><div class="field"><label>Priorité</label>${sel('priority', LABELS.priority, e.priority, 'Non définie')}</div><div class="field"><label>Statut</label>${sel('status', LABELS.evStatus, e.status)}</div>
        <div class="grid2">${f('Objectif chrono', 'target', e.target ? fmtDur(e.target) : '', 'text', 'h:mm:ss')}${f('Résultat', 'result', e.result ? fmtDur(e.result) : '', 'text', 'h:mm:ss')}</div><div class="tiny t3">La priorité n'est jamais choisie par l'application. « Inscrit » seulement si l'inscription est confirmée.</div></div>
      <div class="card"><div class="grid2">${f('Affûtage (jours avant)', 'taper', e.taper, 'text', 'non défini')}${f('Récupération (jours après)', 'recovery', e.recovery, 'text', 'non défini')}</div>
        <div class="tiny t3">Aucun pourcentage d'affûtage imposé (Bosquet et al., 2007).</div></div>
      <div class="card"><div class="field"><label>Stratégie d'effort</label><textarea name="effort">${esc(e.effort)}</textarea></div><div class="field"><label>Stratégie nutritionnelle</label><textarea name="nutrition">${esc(e.nutrition)}</textarea></div>
        <div class="field"><label>Notes</label><textarea name="notes">${esc(e.notes)}</textarea></div><div class="field"><label>Bilan après course</label><textarea name="debrief">${esc(e.debrief)}</textarea></div></div>
      ${e.isNew ? '' : `<button class="btn full danger" data-a="deleteEvent" data-id="${e.id}">Supprimer cette compétition</button>`}` };
  },
  library(m) {
    const lib = Object.values(LIB()), q = (m.q || '').toLowerCase();
    return { title: 'Exercices', action: '<button class="link b" data-a="newExercise">＋</button>', body: `<input class="search" placeholder="Rechercher un exercice" value="${esc(m.q || '')}" data-a2="searchEx">` +
      Object.keys(CATS).map(c => { const it = lib.filter(e => e.cat === c && (!q || e.name.toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name)); return it.length ? sec(CATS[c]) + `<div class="card list">${it.map(e => `<div class="li click" data-a="exercise" data-id="${e.id}"><div><div class="small">${esc(e.name)} ${e.custom ? badge('Perso', 'var(--calm)') : ''}</div><div class="tiny t2">${e.p.map(x => MUSCLES[x]).join(', ')}</div></div><span>›</span></div>`).join('')}</div>` : ''; }).join('') };
  },
  exercise(m) {
    const lib = LIB(), e = lib[m.id], hist = e1rmSeries(e.id), mvv = moveFor(e.id, e.cat);
    const dots = n => `<span style="letter-spacing:2px">${'●'.repeat(n)}<span class="faint">${'○'.repeat(Math.max(0, 3 - n))}</span></span>`;
    const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><b>${v}</b></div>` : '';
    const sets = S.strength.flatMap(x => x.sets.filter(y => y.ex === e.id && !y.warm));
    const last = [...S.strength].filter(x => x.sets.some(y => y.ex === e.id)).sort((a, b) => b.start - a.start)[0];
    return { title: e.name, body: `
      ${mvv ? `<div class="mvBox" style="margin:10px 0">${mvv.svg}</div><div class="meta" style="text-align:center;margin-bottom:6px">${esc(mvv.title)} — amplitude visée, à adapter à ta morphologie</div>` : ''}
      <p class="lede">${esc(e.sum)}</p>
      <div class="card">
        ${kv('Muscles moteurs', esc(e.p.map(x => MUSCLES[x]).join(', ')))}
        ${kv('Aussi sollicités', esc(e.s.map(x => MUSCLES[x]).join(', ')))}
        ${kv('Matériel', esc(e.eq.join(', ')))}
        ${kv('Difficulté', dots(e.diff))}
        ${kv('Exigence technique', dots(e.tech))}
        ${kv('Amplitude', esc(e.rom))}
        ${kv('Tempo conseillé', esc(e.tempo))}
      </div>
      ${sec('Comment l\'exécuter')}
      <div class="card">${e.cues.map((c, i2) => `<div class="row top" style="padding:6px 0"><b class="num faint" style="width:18px;flex:none">${i2 + 1}</b><span class="grow small">${esc(c)}</span></div>`).join('')}</div>
      ${e.err.length ? sec('Ce qui rate le plus souvent') + `<div class="card">${e.err.map(c => `<div class="row top" style="padding:6px 0"><span style="color:var(--mid);flex:none;display:flex">${ic('alert', 16)}</span><span class="grow small">${esc(c)}</span></div>`).join('')}</div>` : ''}
      ${e.vars.length || e.rep.filter(r => lib[r]).length ? sec('Variantes et remplacements') + `<div class="card">
        ${e.vars.map(v => `<div class="small" style="padding:4px 0">${esc(v)}</div>`).join('')}</div>
        ${e.rep.filter(r => lib[r]).length ? `<div class="list">${e.rep.filter(r => lib[r]).map(r => `<div class="li" data-a="exercise" data-id="${r}"><span class="ic">${ic('tune')}</span><span class="grow">${esc(lib[r].name)}</span><span class="chev">${ic('chev', 18)}</span></div>`).join('')}</div>` : ''}` : ''}
      ${hist.length ? sec('Ta progression') + `<div class="card">
        ${hist.length > 1 ? chart({ series: [{ pts: hist, color: 'var(--deep)', dots: true, fill: true }], h: 110 }) : ''}
        <div class="kv"><span>Force maximale estimée</span><b>${fx(hist[hist.length - 1][1], 1)} kg</b></div>
        ${last ? `<div class="kv"><span>Dernière séance</span><b>${new Date(last.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${last.sets.filter(y => y.ex === e.id && !y.warm).map(y => `${fx(y.load, y.load % 1 ? 1 : 0)}×${y.reps}`).join('  ')}</b></div>` : ''}
        <div class="kv"><span>Séries enregistrées</span><b>${sets.length}</b></div></div>` : ''}
      <div class="note">${esc(e.src)}</div>` };
  },
  newExercise() {
    return { title: 'Nouvel exercice', action: '<button class="link b" data-a="saveExercise">Créer</button>', body: `<div class="card"><div class="field"><label>Nom</label><input name="name"></div>
      <div class="field"><label>Catégorie</label><select name="cat">${Object.keys(CATS).map(k => `<option value="${k}">${CATS[k]}</option>`).join('')}</select></div>
      <div class="field"><label>Muscles principaux</label><div class="chips">${Object.keys(MUSCLES).map(k => `<label><input type="checkbox" name="p" value="${k}"> ${MUSCLES[k]}</label>`).join('')}</div></div>
      <div class="field"><label>Matériel</label><input name="eq"></div><div class="field"><label>Consignes (une par ligne)</label><textarea name="cues"></textarea></div>
      <label class="small"><input type="checkbox" name="timed"> Mesuré en durée</label><br><label class="small"><input type="checkbox" name="bw"> Charge incluant le poids du corps</label></div>` };
  },
  strengthDetail(m) {
    const s = S.strength.find(x => x.id === m.id), lib = LIB(); if (!s) return { title: '', body: '' };
    const dur = s.end ? (s.end - s.start) / 60000 : null;
    return { title: s.title, action: `<button class="link danger" data-a="deleteStrength" data-id="${s.id}">Supprimer</button>`, body: `<div class="card"><div class="small">${new Date(s.start).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</div>${dur ? `<div class="small">Durée : ${fmtMin(dur)}</div>` : ''}${s.rpe != null && dur ? `<div class="small">sRPE : ${Math.round(s.rpe * dur)} UA (RPE ${s.rpe})</div>` : ''}${s.notes ? `<div class="small t2">${esc(s.notes)}</div>` : ''}</div>
      ${sec('Séries')}<div class="card">${s.sets.map(x => `<div class="kv"><span>${esc(lib[x.ex]?.name || x.ex)}</span><b>${x.dur ? x.dur + ' s' : fx(x.load, 1) + ' kg × ' + x.reps}${x.rir != null ? ` <small class="t2">RIR ${x.rir}</small>` : ''}${x.warm ? ' ' + badge('Échauff.', 'var(--t2)') : ''}</b></div>`).join('')}</div>` };
  },
  profile() {
    const P = S.profile, f = (l, n, v, ph = '–') => `<div class="field"><label>${l}</label><input name="${n}" value="${esc(v ?? '')}" placeholder="${ph}" inputmode="decimal"></div>`;
    return { title: 'Profil', action: '<button class="link b" data-a="saveProfile">Enregistrer</button>', body: `
      <div class="card"><div class="field"><label>Prénom</label><input name="name" value="${esc(P.name)}"></div>
        <div class="field"><label>Sexe (coefficients TRIMP, BMR)</label><select name="sex"><option value="male" ${P.sex === 'male' ? 'selected' : ''}>Homme</option><option value="female" ${P.sex === 'female' ? 'selected' : ''}>Femme</option></select></div>
        <div class="grid2">${f('Année de naissance', 'birthYear', P.birthYear)}${f('Taille (cm)', 'heightCm', P.heightCm)}${f('Masse (kg)', 'massKg', P.massKg)}${f('Masse grasse (%)', 'bodyFat', P.bodyFat)}</div></div>
      ${sec('Fréquence cardiaque')}<div class="card"><div class="grid2">${f('FC de repos (bpm)', 'restingHR', P.restingHR)}${f('FC max (bpm)', 'maxHR', P.maxHR)}</div>
        <div class="tiny t3">Utilisées pour le TRIMP et les zones. Le TRIMP de toutes les activités est recalculé à l'enregistrement. Préfère une FC max observée à une formule d'âge.</div></div>
      ${sec('Course')}<div class="card">${f('VMA estimée (km/h)', 'vma', P.vma)}<div class="field"><label>Repères d'allure</label><textarea name="refs">${esc(P.refs)}</textarea></div>
        <div class="tiny t3">Valeurs de départ, à recalibrer (Données › Allures).</div></div>
      ${sec('Sommeil')}<div class="card">${f('Besoin de sommeil (h)', 'sleepNeed', P.sleepNeed)}<div class="tiny t3">Au moins 7 h chez l'adulte (Watson et al., 2015) ; besoin individuel.</div></div>
      ${sec('Musculation')}<div class="card"><div class="field"><label>Formule de 1RM</label><select name="formula"><option value="brzycki" ${P.formula === 'brzycki' ? 'selected' : ''}>Brzycki</option><option value="epley" ${P.formula === 'epley' ? 'selected' : ''}>Epley</option></select></div>
        <div class="grid3">${f('Pas de charge (kg)', 'inc', P.inc)}${f('RIR visé', 'suggestRIR', P.suggestRIR)}${f('Repos défaut (s)', 'defaultRest', P.defaultRest)}</div>
        <div class="tiny t3">Les suggestions de charge restent des propositions à valider.</div></div>` };
  },
  paces() {
    const pts = S.perfs || [], cs = csFit(pts);
    return { title: 'Allures et modèles', body: `
      <div class="card"><b class="small">Recalibrer à partir d'une course récente (VDOT)</b><div class="grid2"><div class="field"><label>Distance (m)</label><input id="vd" value="${m_vd.d}" data-a2="vdot"></div><div class="field"><label>Temps</label><input id="vt" value="${m_vd.t}" data-a2="vdot"></div></div><div id="vdotOut">${vdotOut()}</div></div>
      ${sec('Vitesse critique (D = CS·t + D′)')}
      <div class="card">${pts.length ? pts.map((p, i) => `<div class="kv"><span>${p.d} m en ${fmtDur(p.t)} ${p.max ? '' : '<small class="t3">(non maximal)</small>'}</span><b><a data-a="delPerf" data-i="${i}">✕</a></b></div>`).join('') : '<div class="small t2">Ajoute au moins deux efforts maximaux de durées différentes (idéalement entre 2 et 15 min).</div>'}
        <div class="grid3"><div class="field"><label>Distance (m)</label><input name="pd"></div><div class="field"><label>Temps</label><input name="pt" placeholder="m:ss"></div><div class="field"><label>Maximal ?</label><select name="pm"><option value="1">Oui</option><option value="">Non</option></select></div></div>
        <button class="btn full" data-a="addPerf">Ajouter l'effort</button>
        ${cs ? `<div class="kv"><span>CS</span><b class="acc">${fx(cs.cs * 3.6, 2)} km/h · ${pace(1000 / cs.cs)} /km</b></div><div class="kv"><span>D′</span><b>${Math.round(cs.dp)} m</b></div><div class="kv"><span>R²</span><b>${cs.r2 != null ? fx(cs.r2, 4) : '–'}</b></div><div class="kv"><span>Erreur-type de CS</span><b>${cs.se != null ? fx(cs.se * 3.6, 2) + ' km/h' : '–'}</b></div><div class="kv"><span>Résidus</span><b>${cs.res.map(r => Math.round(r) + ' m').join(' · ')}</b></div><div class="kv"><span>Confiance</span><b>${LABELS.conf[cs.conf]}</b></div>${cs.warn.map(w => `<div class="tiny warn">⚠ ${esc(w)}</div>`).join('')}<div class="tiny t3">Domaine de validité : efforts d'environ 2 à 15 min (Jones & Vanhatalo, 2017). Pas d'extrapolation au-delà.</div>` : ''}</div>` };
  },
  measures() {
    const ds = Object.keys(S.metrics).sort().reverse();
    return { title: 'Mesures', body: ds.length ? ds.slice(0, 120).map(d => { const m = S.metrics[d]; const parts = [m.hrv ? `${m.hrvMethod === 'sdnn' ? 'SDNN' : 'RMSSD'} ${Math.round(m.hrv)} ms (${LABELS.prov[m.hrvProv || 'manual'].toLowerCase()})` : '', m.rhr ? `FC repos ${Math.round(m.rhr)}` : '', m.sleepMin ? `Sommeil ${fx(m.sleepMin / 60, 1)} h` : '', m.weight ? fx(m.weight, 1) + ' kg' : '', m.intake ? `Apports ${m.intake} kcal` : ''].filter(Boolean); return `<div class="card"><div class="row"><b class="small">${D.long(d)}</b><a class="tiny danger" data-a="delMetric" data-d="${d}">Supprimer</a></div><div class="tiny t2">${parts.join(' · ') || '—'}</div></div>`; }).join('') : hint('Aucune mesure. Fais un check-in ou génère la démo.') };
  },
  trends(mo) {
    const day = today(), d = dash(day), lim = D.add(day, -90), need = S.profile.sleepNeed || 8;
    const hv = d.hrv.filter(x => x.date >= D.add(day, -60)), rh = d.rhr.filter(x => x.date >= D.add(day, -60));
    const sl = D.range(D.add(day, -27), day).map(x => S.metrics[x]?.sleepMin
      ? [D.num(x), S.metrics[x].sleepMin / 60, S.metrics[x].sleepMin / 60 >= need ? 'var(--good)' : 'var(--accent)'] : null).filter(Boolean);
    const load = (states, title, note) => {
      const s = states.filter(x => x.date >= lim);
      if (!s.some(x => x.load > 0)) return sec(title) + hint(note);
      return sec(title, '90 jours') + `<div class="card">${chart({ h: 180, bars: { pts: s.map(x => [D.num(x.date), x.load]), color: 'var(--line)' },
        series: [{ pts: s.map(x => [D.num(x.date), x.ctl]), color: 'var(--accent)', fill: true }, { pts: s.map(x => [D.num(x.date), x.atl]), color: 'var(--mid)', w: 1.6 }] })}
        ${legend([['var(--accent)', 'fond (42 jours)'], ['var(--mid)', 'fatigue récente (7 jours)'], ['var(--line)', 'charge du jour']])}</div>`;
    };
    const blocks = {
      sleep: sec('Sommeil', '28 nuits') + (sl.length ? `<div class="card">${chart({ h: 160, bars: { pts: sl, color: 'var(--accent)' }, rule: need, ruleLabel: 'ton besoin' })}
        <div class="kv" style="margin-top:8px"><span>Moyenne sur 7 jours</span><b>${d.sleep.avg ? fx(d.sleep.avg / 60, 1) + ' h' : '–'}</b></div>
        <div class="kv"><span>Dette accumulée sur 7 jours</span><b>${d.sleep.nights ? fx(d.sleep.deficit / 60, 1) + ' h' : '–'}</b></div>
        ${d.lastNight && d.lastNight.deepMin ? `<div class="kv"><span>Dernière nuit — profond / paradoxal</span><b>${Math.round(d.lastNight.deepMin)} / ${Math.round(d.lastNight.remMin || 0)} min</b></div>` : ''}</div>`
        : hint('Aucune nuit mesurée. Garmin les remplit automatiquement, sinon saisis-les dans le check-in.')),
      hrv: sec('Variabilité cardiaque', '60 jours') + (hv.length ? `<div class="card">${hrvChart(hv, 180)}
        ${legend([['var(--accent)', 'tendance 7 jours'], ['var(--faint)', 'mesure du jour']])}
        <div class="note tight">${d.method === 'sdnn' ? 'SDNN' : 'RMSSD'} en millisecondes. La bande est ta zone habituelle sur 60 jours (± un demi écart-type). Une seule journée basse ne signifie rien.</div></div>`
        : hint('Aucune mesure de variabilité pour l\'instant.')),
      rhr: sec('Fréquence cardiaque au repos', '60 jours') + (rh.length ? `<div class="card">${chart({ h: 150, series: [{ pts: rh.map(x => [D.num(x.date), x.value]), color: 'var(--deep)', fill: true }] })}
        <div class="note tight">Une hausse qui dure plusieurs jours accompagne souvent une fatigue ou une infection qui commence.</div></div>`
        : hint('Aucune fréquence au repos enregistrée.'))
    };
    const order = mo.focus ? [mo.focus, ...Object.keys(blocks).filter(k => k !== mo.focus)] : Object.keys(blocks);
    return { title: 'Courbes', body: order.map(k => blocks[k]).join('') + load(d.trimpStates, 'Charge cardiaque', 'Pas encore de charge : il faut des activités avec fréquence cardiaque.')
      + load(d.srpeStates, 'Charge perçue', 'Pas encore de charge perçue : note le RPE de tes séances.')
      + `<div class="note">Les deux charges mesurent des choses différentes et ne s'additionnent pas.</div>` };
  },
  activity(m) {
    const a = S.activities.find(x => x.id === m.id); if (!a) return { title: '', body: '' };
    const day = D.ofTime(a.start), ss = Plan.sessions(day), linked = a.linked ? ss.find(s => s.id === a.linked) : null;
    const smp = sm(a), foot = FOOT.has(a.sport);
    const dc = foot && smp.length ? decoupling(smp) : null;
    const an2 = smp.length ? anaOf(a) : { splits: [], best: {}, zones: null, three: null, gap: null, dp: null };
    const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
    const hrc = smp.some(x => x[1]) ? chart({ h: 110, series: [{ pts: smp.filter(x => x[1]).map(x => [x[0] / 86400, x[1]]), color: 'var(--low)', fill: true }] }).replace(/<text[^>]*>[^<]*<\/text>/g, '') : '';
    const prof = smp.some(x => x[4] != null) ? chart({ h: 90, series: [{ pts: smp.filter(x => x[4] != null).map(x => [x[0] / 86400, x[4]]), color: 'var(--good)', fill: true }] }).replace(/<text[^>]*>[^<]*<\/text>/g, '') : '';
    const zt = an2.zones ? an2.zones.reduce((x, y) => x + y, 0) : 0;
    const sp = an2.splits;
    const paces = sp.map(x => x.partial ? x.s / x.partial : x.s);
    const pMin = paces.length ? Math.min(...paces) : 0, pMax = paces.length ? Math.max(...paces) : 1;
    const barW = i2 => pMax > pMin ? 38 + 62 * (pMax - paces[i2]) / (pMax - pMin) : 100;
    const bests = Object.keys(an2.best).map(Number).sort((x, y) => x - y);
    return { title: LABELS.sport[a.sport], body: `
      <div class="meta">${new Date(a.start).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</div>
      <h2 style="margin:2px 0 12px">${esc(a.name || LABELS.sport[a.sport])}</h2>
      <div class="trio">
        ${tile('Durée', fmtMin((a.timer || a.elapsed) / 60))}
        ${a.dist ? tile('Distance', fx(a.dist / 1000, 2), 'km') : tile('Charge', a.trimp != null ? Math.round(a.trimp) : '–', 'TRIMP')}
        ${a.dist && a.timer ? tile('Allure', pace(a.timer / (a.dist / 1000)), '/km') : tile('FC moy.', a.avgHR ? Math.round(a.avgHR) : '–', 'bpm')}
      </div>
      <div class="card">
        ${an2.gap && a.up > 20 ? kv('Allure corrigée de la pente', pace(1000 / an2.gap.v) + ' /km') : ''}
        ${a.up != null ? kv('D+ / D−', `${Math.round(a.up)} / ${Math.round(a.down || 0)} m`) : ''}
        ${a.avgHR ? kv('FC moyenne / max', `${Math.round(a.avgHR)} / ${Math.round(a.maxHR || 0)} bpm`) : ''}
        ${a.trimp != null ? kv('Charge cardiaque', fx(a.trimp, 1) + ' TRIMP' + (a.trimpAvg ? ', estimée depuis la FC moyenne' : '')) : kv('Charge cardiaque', '<span class="faint">renseigne FC de repos et FC max</span>')}
        ${a.kcal ? kv('Dépense annoncée par la montre', Math.round(a.kcal) + ' kcal') : ''}
        ${kv('Source', srcLabel(a))}
      </div>
      ${bests.length ? sec('Meilleurs efforts de cette sortie') + `<div class="pr">${bests.map(dd => `<div class="prCard"><b>${fmtDur(an2.best[dd])}</b>
        <div class="meta">${DIST_LABEL[dd] || Math.round(dd) + ' m'}</div><div class="meta">${pace(an2.best[dd] / (dd / 1000))} /km</div></div>`).join('')}</div>` : ''}
      ${sp.length ? sec('Tours', an2.gap && a.up > 20 ? 'allure réelle et corrigée' : '') + `<div class="card"><table class="tbl">
        <thead><tr><th>km</th><th>temps</th>${an2.gap && a.up > 20 ? '<th>corrigé</th>' : ''}<th>FC</th><th>D+</th><th class="bar"></th></tr></thead><tbody>
        ${sp.map((x, i3) => `<tr><td>${x.partial ? fx(x.km - 1 + x.partial, 2) : x.km}</td><td><b>${fmtDur(x.s)}</b></td>
          ${an2.gap && a.up > 20 ? `<td>${x.gap ? pace(1000 / x.gap) : '–'}</td>` : ''}
          <td>${x.hr ? Math.round(x.hr) : '–'}</td><td>${x.up != null ? (x.up > 0 ? '+' : '') + Math.round(x.up) : '–'}</td>
          <td class="bar"><i style="width:${barW(i3)}%;--c:${x.hr && S.profile.maxHR ? ZONE_COLOR[zoneOf(x.hr, S.profile.maxHR)] : 'var(--accent)'}"></i></td></tr>`).join('')}
        </tbody></table>${an2.gap && a.up > 20 ? '<div class="note tight">L\'allure corrigée est celle que tu tiendrais sur le plat au même coût énergétique (Minetti et al., 2002).</div>' : ''}</div>` : ''}
      ${hrc ? sec('Fréquence cardiaque') + `<div class="card">${hrc}
        ${zt ? an2.zones.map((v, i2) => v > 0.5 ? `<div class="zrow" style="--c:${ZONE_COLOR[i2]}"><span class="zl">${ZONE_LABEL[i2]}</span>
          <span class="zb"><i style="width:${v / zt * 100}%"></i></span><span class="zv">${fmtMin(v)}</span></div>` : '').join('') : ''}</div>` : ''}
      ${smp.some(x => x[5] != null) ? sec('Parcours') + `<div class="card">${routeMap(smp)}</div>` : ''}
      ${prof ? sec('Profil') + `<div class="card">${prof}</div>` : ''}
      ${an2.dp ? sec('Réserve anaérobie') + `<div class="card">
        ${chart({ h: 110, series: [{ pts: an2.dp.curve.map(x => [x[0] / 86400, x[1]]), color: an2.dp.exhausted ? 'var(--low)' : 'var(--mid)', fill: true }] }).replace(/<text[^>]*>[^<]*<\/text>/g, '')}
        ${kv('Plus bas niveau atteint', Math.round(an2.dp.min) + ' m sur ' + Math.round(csCurrent().dp) + ' m')}
        <div class="note tight">Modèle de Skiba : la réserve se vide au-dessus de la vitesse critique et se reconstitue en dessous. ${an2.dp.exhausted ? 'Elle est tombée à zéro : tu es allé au bout.' : ''}</div></div>` : ''}
      ${dc && dc.pct != null ? sec('Dérive cardiaque') + `<div class="card">${kv('Découplage sur la sortie', fx(dc.pct, 1) + ' %')}
        ${dc.reasons.map(r => `<div class="meta warnTx">${esc(r)}</div>`).join('')}
        <div class="note tight">Comparaison de l'efficacité entre la première et la seconde moitié (Friel). Au-delà de 5 % sur une sortie régulière, l'allure était probablement trop rapide pour le jour.</div></div>` : ''}
      ${sec('Séance prévue')}
      <div class="card">${linked ? comparison(linked, a) + `<button class="btn full danger" data-a="unlink" data-id="${esc(a.id)}">Dissocier</button>`
        : (ss.length ? `<div class="list">${ss.map(s2 => `<div class="li" data-a="link" data-id="${esc(a.id)}" data-key="${esc(s2.id)}"><span class="grow">${LABELS.slot[s2.slot]} — ${esc(s2.t.title)}</span>${(a.candidates || []).includes(s2.id) ? badge('probable', 'var(--mid)') : ''}</div>`).join('')}</div>`
          : '<div class="meta">Aucune séance prévue ce jour-là.</div>') + `<button class="btn full" data-a="ignoreAct" data-id="${esc(a.id)}">Ne pas associer</button>`}</div>
      ${sec('Ce que le fichier contenait')}
      <div class="card"><div class="small">${(a.fields || []).join(', ') || '—'}</div>
        <div class="note tight">Un champ absent n'est jamais estimé à la place de la montre.</div>
        ${(a.warnings || []).map(w => `<div class="meta warnTx">${esc(w)}</div>`).join('')}</div>
      <button class="btn full danger" data-a="deleteAct" data-id="${esc(a.id)}">Supprimer l'activité</button>` };
  },
  refs() {
    return { title: 'Références', body: REFERENCES.map(r => `<div class="card"><div class="small b">${esc(r[0])} (${r[1]})</div><div class="small">${esc(r[2])}</div><div class="tiny t2">${esc(r[3])}</div>${r[4] ? `<div class="srow"><span class="tiny">${esc(r[4])}</span>${badge(r[5] ? 'Identifiant vérifié' : 'À confirmer', r[5] ? 'var(--accent)' : 'var(--warn)')}</div>` : ''}<div class="tiny t2">${esc(r[6])}</div></div>`).join('') + hint('Aucune recommandation de Cockpit n\'est un diagnostic médical. Une corrélation n\'établit pas une cause.') };
  },
  summary() {
    const w = ui.wo, s = S.strength.find(x => x.id === w.sid), lib = LIB(), sets = s.sets.filter(x => !x.warm);
    const vol = volumeByMuscle(sets.map(x => Object.assign({ sid: s.id }, x)), lib), min = ((s.end || Date.now()) - s.start) / 60000;
    const stim = sets.reduce((t, x) => t + Str.stim(x.reps, x.rir ?? 0), 0);
    const exIds = [...new Set(sets.map(x => x.ex))];
    const exLine = id => {
      const ref = S.strength.filter(o => o.start < s.start).flatMap(o => o.sets).filter(x => x.ex === id && !x.warm && x.load > 0).map(x => Str.estimate(x.load, x.reps, x.rir, S.profile.formula)).filter(e => e && RANK[e.rel] >= 2).sort((a, b) => b.value - a.value)[0];
      const mine = sets.filter(x => x.ex === id); let inol = null;
      if (ref) inol = mine.filter(x => !x.dur).reduce((t, x) => t + (Str.inol(x.reps, x.load / ref.value * 100) ?? NaN), 0);
      const best = mine.map(x => Str.estimate(x.load, x.reps, x.rir, S.profile.formula)).filter(Boolean).sort((a, b) => b.value - a.value)[0];
      return `<div class="exrow"><div class="small b">${esc(lib[id]?.name || id)}</div><div class="tiny t2">${mine.map(x => x.dur ? x.dur + ' s' : fx(x.load, 1) + '×' + x.reps).join(' · ')}</div><div class="tiny">${best ? 'e1RM ' + fx(best.value, 1) + ' kg' : ''} ${inol != null && isFinite(inol) ? ' · INOL ' + fx(inol, 2) : ref ? '' : ' · <span class="t3">INOL : pas d\'e1RM de référence</span>'}</div></div>`;
    };
    return { title: 'Bilan', action: '<button class="link b" data-a="finishWorkout">Enregistrer</button>', body: `
      <div class="grid2">${tile('Durée', fmtMin(min))}${tile('Séries', sets.length, '', 'hors échauffement')}</div>
      ${sec('Volume par muscle (principal)')}<div class="card">${Object.keys(vol).filter(k => vol[k].direct).map(k => `<div class="kv"><span>${MUSCLES[k]}</span><b>${vol[k].direct} séries · ${vol[k].hard} proches de l'échec</b></div>`).join('') || '<div class="small t2">Aucune série.</div>'}<div class="tiny t3">Proxy de répétitions proches de l'échec (RIR ≤ 4) : ${stim}. Hypothèse (Beardsley), pas un décompte physiologique.</div></div>
      ${sec('Exercices')}<div class="card">${exIds.map(exLine).join('')}<div class="tiny t3">L'INOL utilise un e1RM antérieur à la séance ; c'est un indice de dosage, pas une mesure de fatigue.</div></div>
      ${sec('Ressenti')}<div class="card"><div class="field"><label>RPE de séance : <b class="acc" id="srpeV">7/10</b></label><input type="range" min="0" max="10" value="7" name="rpe" oninput="document.getElementById('srpeV').textContent=this.value+'/10'"></div><div class="field"><label>Notes</label><textarea name="notes"></textarea></div><div class="tiny t3">sRPE = RPE × durée, suivi séparément du TRIMP.</div></div>
      <button class="btn full" data-a="resumeWorkout">Reprendre la séance</button>` };
  }
};
const m_vd = { d: '21097.5', t: '1:28:00' };
function vdotOut() {
  const d = num(m_vd.d), t = parseDur(m_vd.t); if (!(d > 0 && t > 0)) return '';
  const v = VDOT.of(d, t), rows = [[5000, '5 km'], [10000, '10 km'], [21097.5, 'Semi'], [42195, 'Marathon']].map(([dist, l]) => { const p = VDOT.predict(dist, v); return `<div class="kv"><span>${l}</span><b>${fmtDur(p)} · ${pace(p / dist * 1000)} /km</b></div>`; }).join('');
  return `<div class="small acc">VDOT ${fx(v, 1)} — indice de performance, pas une VO₂max mesurée</div>${rows}<div class="kv"><span>Allure seuil (≈ 60 min, Daniels)</span><b>${pace(VDOT.pace(v))} /km</b></div>${t / 60 < 3.5 || t / 60 > 300 ? '<div class="tiny warn">Durée hors du domaine des tables de Daniels.</div>' : ''}<div class="tiny t3">Équivalences sur route plate ; inapplicables en trail.</div>`;
}
function findSession(id) { const d = id.split('|')[0]; return Plan.sessions(d).find(s => s.id === id) || Plan.raw(d).find(s => s.id === id); }
function comparison(s, a) {
  const t = s.t, min = (a.timer || a.elapsed) / 60, km = a.dist ? a.dist / 1000 : null;
  const cmp = (v, r) => !r ? 'Non prévu' : v == null ? 'Non mesuré' : v < r[0] ? 'En dessous' : v > r[1] ? 'Au-dessus' : 'Dans la cible';
  const row = (k, pl, ac, st) => `<div class="kv tiny"><span>${k}</span><b>${pl || '–'} → ${ac || '–'} ${badge(st, st === 'Dans la cible' ? 'var(--accent)' : 'var(--t2)')}</b></div>`;
  const P = S.profile, hr = sm(a).filter(x => x[1]).map(x => [x[0], x[1]]);
  let zones = '';
  if (P.maxHR && hr.length > 2) { const z = timeInZones(hr, P.maxHR), tot = z.reduce((x, y) => x + y, 0) || 1, col = ['var(--t3)', 'var(--calm)', 'var(--accent)', '#e8d44d', 'var(--warn)', 'var(--alert)']; zones = `<div class="zbar">${z.map((v, i) => `<i style="width:${v / tot * 100}%;background:${col[i]}"></i>`).join('')}</div><div class="tiny t2">${z.map((v, i) => v > 0.5 ? (i ? 'Z' + i : '<Z1') + ' ' + Math.round(v) + ' min' : '').filter(Boolean).join(' · ')}</div>`; }
  return `<div class="small b">${LABELS.sport[a.sport]} · ${srcLabel(a, true)}</div>
    ${row('Durée', rng(t.dur, 'min'), fmtMin(min), cmp(min, t.dur))}${row('Distance', rng(t.dist, 'km', 1), km ? fx(km, 2) + ' km' : null, cmp(km, t.dist))}${row('D+', rng(t.up, 'm'), a.up != null ? Math.round(a.up) + ' m' : null, cmp(a.up, t.up))}
    <div class="kv tiny"><span>Intensité prévue</span><b>${LABELS.intensity[t.intensity]}</b></div>${zones}${a.trimp != null ? `<div class="tiny t2">TRIMP ${fx(a.trimp, 1)}</div>` : ''}
    ${t.toLog ? '<div class="tiny t3">Contenu de séance à saisir manuellement</div>' : ''}${hr.length ? '' : '<div class="tiny t3">Activité sans FC : intensité non vérifiable</div>'}
    <div class="tiny t3">Écart décrit, jamais pénalisé.</div>`;
}

// ===================== Lecteur de séance =====================
function buildSteps(t) {
  const out = [];
  for (const b of t.blocks) {
    let i = 0;
    while (i < b.ex.length) {
      if (b.ex[i].ss) { const g = b.ex[i].ss, mem = []; while (i < b.ex.length && b.ex[i].ss === g) mem.push(b.ex[i++]); const rounds = Math.max(...mem.map(m => m.sets)); for (let r = 0; r < rounds; r++) for (const m of mem) if (r < m.sets) out.push({ rx: m, n: r + 1, block: b.title }); }
      else { const x = b.ex[i++]; for (let s = 0; s < Math.max(1, x.sets); s++) out.push({ rx: x, n: s + 1, block: b.title }); }
    }
  }
  return out;
}
function prevSets(exId, sid) { const ss = [...S.strength].filter(s => s.id !== sid && s.sets.some(x => x.ex === exId && !x.warm)).sort((a, b) => b.start - a.start)[0]; return ss ? ss.sets.filter(x => x.ex === exId && !x.warm) : []; }
function bestE1rm(exId, sid) { const lim = D.at(D.add(today(), -60), 0); return S.strength.filter(s => s.id !== sid && s.start >= lim).flatMap(s => s.sets).filter(x => x.ex === exId && !x.warm && x.load > 0).map(x => Str.estimate(x.load, x.reps, x.rir, S.profile.formula)).filter(e => e && RANK[e.rel] >= 2).sort((a, b) => b.value - a.value)[0]; }
function suggestion(step, sid) { if (!step.rx.reps) return null; const b = bestE1rm(step.rx.id, sid); if (!b) return null; const l = Str.suggest(b.value, step.rx.reps[0], S.profile.suggestRIR ?? 2, S.profile.formula, S.profile.inc || 1.25); return l > 0 ? { l, b } : null; }
function startWorkout(tid, key) {
  const sess = key ? findSession(key) : null, t = sess?.t || TPL[tid], s = { id: uid(), key: key || null, templateId: tid, title: t.title, start: Date.now(), end: null, rpe: null, notes: '', sets: [] };
  S.strength.push(s); save();
  ui.wo = { sid: s.id, t, steps: buildSteps(t), i: 0, rest: null, cues: true, summary: false };
  prefill(); ui.stack = []; render();
  if (!ui.timer) ui.timer = setInterval(tick, 500);
  try { navigator.wakeLock?.request('screen').then(l => ui.wake = l).catch(() => { }); } catch (e) { }
}
function prefill() {
  const w = ui.wo, st = w.steps[w.i]; if (!st) return; const lib = LIB(), e = lib[st.rx.id];
  w.reps = st.rx.reps ? st.rx.reps[1] : 8; w.secs = st.rx.durS ? st.rx.durS[0] : 30; w.rir = 2; w.warm = false;
  const prev = prevSets(st.rx.id, w.sid), same = prev.find(x => x.n === st.n) || prev[0], sg = suggestion(st, w.sid);
  w.load = same ? same.load : sg ? sg.l : e?.bw ? (S.profile.massKg || 0) : 0;
}
function tick() {
  const w = ui.wo; if (!w) return;
  const el = document.getElementById('woClock'); if (el) el.textContent = fmtDur((Date.now() - S.strength.find(s => s.id === w.sid).start) / 1000);
  if (w.rest) {
    const rem = w.rest.target - (Date.now() - w.rest.start) / 1000, r = document.getElementById('restClock'), bar = document.getElementById('restBar');
    if (r) { r.textContent = rem >= 0 ? fmtDur(rem) : '+' + fmtDur(-rem); r.style.color = rem >= 0 ? '' : 'var(--mid)'; }
    if (bar) bar.style.width = Math.min(100, (1 - rem / w.rest.target) * 100) + '%';
    if (rem <= 0 && !w.rest.beeped) { w.rest.beeped = true; beep(); }
  }
}
function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); [0, 0.25, 0.5].forEach(d => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.15); }); navigator.vibrate?.(300); } catch (e) { } }
function renderWorkout() {
  const el = document.getElementById('workout'), w = ui.wo;
  if (!w || w.summary) { el.className = ''; el.innerHTML = ''; return; }
  el.className = 'on';
  const lib = LIB(), st = w.steps[w.i];
  let body;
  if (!st) {
    body = `<div class="center"><div style="color:var(--good);display:flex;justify-content:center">${ic('check', 54, 1.6)}</div>
      <h2 style="margin-top:14px">Séance terminée</h2><div class="lede">Toutes les séries sont validées.</div>
      <button class="btn pri lg" style="margin-top:22px" data-a="woSummary">Voir le bilan</button></div>`;
  } else if (w.rest) {
    body = `<div class="rest">
      <div class="meta">Récupération</div>
      <div id="restClock" class="restNum">${fmtDur(w.rest.target)}</div>
      <div class="pbar"><i id="restBar"></i></div>
      <div class="meta">${Math.round(w.rest.target)} s — ${esc(w.rest.src)}</div>
      <div class="pair" style="margin:18px 0"><button class="btn" data-a="restAdj" data-d="-15">−15 s</button><button class="btn" data-a="restAdj" data-d="15">+15 s</button></div>
      <div class="card" style="text-align:left"><div class="meta">Ensuite</div><div class="metricName">${esc(lib[st.rx.id]?.name || st.rx.id)}</div>
        <div class="meta">série ${st.n} sur ${st.rx.sets}</div></div>
      <button class="btn pri lg" data-a="restEnd">${ic('play', 16)} Série suivante</button></div>`;
  } else {
    const e = lib[st.rx.id], timed = e?.timed || !!st.rx.durS, sg = suggestion(st, w.sid), prev = prevSets(st.rx.id, w.sid), best = bestE1rm(st.rx.id, w.sid);
    const stp = (lab, val, a) => `<div class="stepper"><button data-a="${a}" data-d="-1" aria-label="Diminuer">−</button>
      <div class="stepVal"><b>${val}</b><span>${esc(lab)}</span></div><button data-a="${a}" data-d="1" aria-label="Augmenter">+</button></div>`;
    body = `<div class="meta">${esc(st.block)}</div>
      <h2>${esc(e?.name || st.rx.id)}</h2>
      <div class="wrap">${badge(`Série ${st.n} sur ${st.rx.sets}`)}${st.rx.ss ? badge('Superset ' + st.rx.ss, 'var(--deep)') : ''}${st.rx.side ? badge('Chaque côté', 'var(--faint)') : ''}</div>
      ${e ? `<div class="mvRow" style="margin:10px 0"><div class="mvBox sm">${moveFor(e.id, e.cat)?.svg || ''}</div>
        <div class="grow"><div class="meta">${esc(e.p.map(m => MUSCLES[m]).join(', '))}</div>
        <button class="link" style="padding:2px 0" data-a="exercise" data-id="${e.id}">Voir le mouvement en détail</button></div></div>` : ''}
      <div class="target">
        <div><small>Objectif</small><b>${st.rx.reps ? (st.rx.reps[0] === st.rx.reps[1] ? st.rx.reps[0] : st.rx.reps.join('–')) + ' reps' : st.rx.durS ? st.rx.durS.join('–') + ' s' : '—'}</b></div>
        ${st.rx.tempo ? `<div><small>Tempo</small><b style="font-size:15px;font-stretch:100%">${esc(st.rx.tempo)}</b></div>` : ''}
      </div>
      ${st.rx.note ? `<div class="note tight">${esc(st.rx.note)}</div>` : ''}
      <div class="card">
        ${sg ? `<div class="row"><div class="grow"><div class="small">${fx(sg.l, 2)} kg pour ${st.rx.reps[0]} reps</div>
          <div class="meta">d'après ta force estimée (${fx(sg.b.value, 1)} kg) — à toi de valider</div></div>
          <button class="btn sm" data-a="applySug" data-v="${sg.l}">Utiliser</button></div>` : ''}
        ${!timed || e?.cat === 'strength' ? stp(e?.bw ? 'kg (corps + lest)' : 'kg', fx(w.load, w.load % 1 ? 2 : 0), 'woLoad') : ''}
        ${timed ? stp('secondes', w.secs, 'woSecs') : stp('répétitions', w.reps, 'woReps')}
        <div class="meta" style="margin-top:14px">Répétitions encore possibles (RIR)</div>
        <div class="seg">${[0, 1, 2, 3, 4, 5].map(i => `<button class="${w.rir === i ? 'on' : ''}" data-a="woRir" data-v="${i}">${i === 5 ? '5+' : i}</button>`).join('')}</div>
        <label class="switchRow"><span class="small">Série d'échauffement</span><input type="checkbox" ${w.warm ? 'checked' : ''} data-a="woWarm"></label>
      </div>
      <button class="btn pri lg" data-a="woValidate">${ic('check', 17, 2.2)} Valider la série</button>
      <div class="row" style="margin-top:4px"><button class="link quiet" data-a="woMove" data-d="-1" ${w.i === 0 ? 'disabled' : ''}>Précédente</button>
        <button class="link quiet" data-a="woMove" data-d="1">Passer</button></div>
      ${e ? `<details><summary>Consignes et erreurs fréquentes</summary>
        ${e.cues.map(c => `<div class="small" style="margin:5px 0">${esc(c)}</div>`).join('')}
        ${e.err.map(c => `<div class="small warnTx" style="margin:5px 0">${esc(c)}</div>`).join('')}
        <div class="meta">${esc(e.src)}</div></details>` : ''}
      <div class="card quiet"><div class="meta">${prev.length ? 'Dernière fois' : 'Première fois sur cet exercice'}</div>
        ${prev.length ? `<div class="small">${prev.map(x => `${fx(x.load, x.load % 1 ? 1 : 0)} × ${x.reps}${x.rir != null ? ' @' + x.rir : ''}`).join('   ')}</div>` : ''}
        ${best ? `<div class="meta">force estimée ${fx(best.value, 1)} kg — fiabilité ${LABELS.conf[best.rel].toLowerCase()}</div>` : ''}</div>`;
  }
  el.innerHTML = `<div class="sheetBox">
    <div class="sheetHead"><button class="link quiet" data-a="woQuit">Quitter</button><b>${esc(w.t.title)}</b><button class="link" data-a="woSummary">Terminer</button></div>
    <div class="woTop"><div class="row"><span class="meta">Série ${Math.min(w.i + 1, w.steps.length)} sur ${w.steps.length}</span><span class="meta num" id="woClock">0:00</span></div>
      <div class="woProg">${w.steps.map((_, i) => `<i class="${i < w.i ? 'done' : ''}"></i>`).join('')}</div></div>
    <div class="sheetBody">${body}</div></div>`;
  tick();
}
// ===================== Démo =====================
function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random()); }
function accountCard() {
  if (typeof Cloud === 'undefined' || Cloud.mode !== 'cloud')
    return `<div class="card"><div class="metricName">Mode local</div><div class="meta">${CFG.supabaseUrl ? 'Tu n\'es pas connecté.' : 'config.js ne contient pas encore l\'adresse Supabase : les données restent sur cet appareil.'}</div></div>`;
  return `<div class="card">
    <div class="row"><div class="grow"><div class="metricName">${esc(Cloud.user.email)}</div>
      <div class="meta"><span class="dot" data-st="${Cloud.state}"></span> ${esc(Cloud.msg || CLOUD_LABEL[Cloud.state])}</div></div>
      <button class="iconBtn" data-a="syncNow" aria-label="Synchroniser">${ic('sync', 19)}</button></div>
    <div class="row" style="margin-top:6px"><button class="link quiet" data-a="logout">Se déconnecter</button>
      <button class="link quiet danger" data-a="logoutWipe">Effacer cet appareil</button></div></div>`;
}
function clearDemo() {
  if (!confirm('Effacer toutes les données de démo (activités, séances de muscu, mesures et ressentis fictifs) ? Tes vraies données sont conservées.')) return;
  S.activities = S.activities.filter(a => a.source !== 'demo'); S.strength = S.strength.filter(x => !x.demo);
  for (const d in S.wellness) if (S.wellness[d].demo) delete S.wellness[d];
  for (const k in S.sessions) if (S.sessions[k].demo) delete S.sessions[k];
  for (const d in S.metrics) { const m = S.metrics[d]; if (m.hrvProv === 'demo') { delete m.hrv; delete m.hrvProv; } if (m.rhrProv === 'demo') { delete m.rhr; delete m.rhrProv; } if (m.sleepProv === 'demo') { ['sleepMin', 'inBedMin', 'deepMin', 'remMin', 'lightMin', 'sleepStart', 'steps', 'sleepProv'].forEach(k => delete m[k]); } if (m.weightProv === 'demo') { delete m.weight; delete m.weightProv; } if (m.intakeDemo) { delete m.intake; delete m.intakeDemo; } if (!Object.keys(m).length) delete S.metrics[d]; }
  if (S.demoNote) { const P = S.profile; if (P.restingHR === 48) P.restingHR = null; if (P.maxHR === 192) P.maxHR = null; if (P.massKg === 71) P.massKg = null; if (P.heightCm === 178) P.heightCm = null; delete S.demoNote; }
  S.perfs = (S.perfs || []).filter(p => !p.demo);
  save(); render(); toast('Données de démo effacées');
}
function demo() {
  if (Cloud.mode === 'cloud' && !confirm('Ajouter 90 jours de données FICTIVES dans ton compte ? Tu pourras les effacer avec « Effacer les données de démo ».')) return;
  const day = today(), start = D.add(day, -89), P = S.profile;
  if (!P.restingHR) P.restingHR = 48; if (!P.maxHR) P.maxHR = 192; if (!P.massKg) P.massKg = 71; if (!P.heightCm) P.heightCm = 178; if (!P.birthYear) P.birthYear = 2004;
  S.demoNote = 'FC repos 48, FC max 192, 71 kg, 178 cm : valeurs de démonstration à remplacer';
  const base = { standing_military_press: 40, cable_fly: 12.5, overhead_triceps_extension: 20, incline_db_curl: 10, step_up: 14, single_leg_calf_raise: 10, pullup_pronated: 82, row_barbell_db: 30, lateral_raise: 9, face_pull: 20, biceps_curl: 13, hammer_curl: 14, hanging_leg_raise: 0, pallof_press: 15, bench_press: 62, incline_db_press: 22, seated_shoulder_press: 20, triceps_pushdown: 25, seated_calf_raise: 50, lat_pulldown: 60, chest_press: 55, seated_row: 55, single_leg_rdl: 20, bulgarian_split_squat: 16, eccentric_step_down: 0, single_leg_glute_bridge: 0, box_jump: 0 };
  let k = 0;
  for (const d of D.range(start, day)) {
    k++; const prog = k / 90;
    const late = D.diff(d, day) < 4; // légère baisse de VFC sur les derniers jours pour illustrer les observations
    S.metrics[d] = Object.assign(S.metrics[d] || {}, { hrv: Math.round(64 + 6 * gauss() - (late ? 9 : 0)), hrvMethod: 'rmssd', hrvProv: 'demo', rhr: Math.round(48 + 1.6 * gauss() + (late ? 2 : 0)), rhrProv: 'demo',
      sleepMin: Math.round((7.3 + 0.55 * gauss() - (late ? 0.6 : 0)) * 60), sleepProv: 'demo', weight: +(71.4 - 0.6 * prog + 0.3 * gauss()).toFixed(1), weightProv: 'demo', intake: Math.round(2750 + 250 * gauss()), intakeDemo: true });
    const m = S.metrics[d]; m.inBedMin = m.sleepMin + Math.round(12 + Math.abs(18 * gauss()));
    m.deepMin = Math.round(m.sleepMin * (0.16 + 0.03 * gauss())); m.remMin = Math.round(m.sleepMin * (0.22 + 0.03 * gauss()));
    m.lightMin = Math.max(0, m.sleepMin - m.deepMin - m.remMin);
    m.sleepStart = Math.round(1382 + 26 * gauss()); m.steps = Math.round(9500 + 2600 * gauss());
    if (Math.random() < 0.85 && d !== day) S.wellness[d] = { demo: true, fatigue: Math.max(1, Math.min(7, Math.round(3 + gauss()))), soreness: Math.max(1, Math.min(7, Math.round(3 + gauss()))), stress: Math.max(1, Math.min(7, Math.round(3 + gauss()))), motivation: Math.max(1, Math.min(7, Math.round(5 + gauss()))), sleepQuality: Math.max(1, Math.min(7, Math.round(5 + gauss()))), pain: 0 };
    if (d >= day) continue;
    let sessions = Plan.sessions(d);
    if (!sessions.length) { const wd = D.wd(d); sessions = [1, 3, 6].includes(wd) ? [{ id: 'free|' + d, date: d, slot: wd === 6 ? 'day' : 'evening', t: wd === 6 ? TPL.long_reprise : TPL.run_easy45 }] : wd === 2 || wd === 5 ? [{ id: 'free|' + d, date: d, slot: 'morning', t: wd === 2 ? TPL.str_A : TPL.str_B }] : []; }
    for (const s of sessions) {
      if (Math.random() < 0.08) continue; // quelques séances manquées
      const t = s.t, hour = s.slot === 'morning' ? 6 : s.slot === 'evening' ? 18 : 9;
      if (t.kind === 'strength') {
        const st = D.at(d, hour, 5), sets = []; let n = 0;
        for (const step of buildSteps(t)) {
          const b = base[step.rx.id]; n++;
          if (step.rx.durS || b == null) { sets.push({ ex: step.rx.id, n: step.n, load: 0, reps: 1, dur: step.rx.durS ? step.rx.durS[0] : 30, rir: 2, warm: false, at: st + n * 150000 }); continue; }
          const reps = step.rx.reps ? Math.round((step.rx.reps[0] + step.rx.reps[1]) / 2) : 8, load = b ? Math.round(b * (1 + 0.06 * prog) / 1.25) * 1.25 : 0;
          sets.push({ ex: step.rx.id, n: step.n, load, reps: Math.max(1, reps - (step.n - 1)), rir: Math.max(0, Math.min(4, Math.round(2 + 0.8 * gauss()))), warm: false, at: st + n * 150000, rest: 90 + Math.round(20 * gauss()) });
        }
        S.strength.push({ id: uid(), demo: true, key: s.id.startsWith('free') ? null : s.id, templateId: t.id, title: t.title, start: st, end: st + n * 150000 + 120000, rpe: Math.round(6 + gauss()), notes: '', sets });
        if (!s.id.startsWith('free')) S.sessions[s.id] = Object.assign(S.sessions[s.id] || {}, { status: 'completed', demo: true });
      } else if (t.kind === 'mobility' || t.kind === 'rest') {
        if (!s.id.startsWith('free')) S.sessions[s.id] = Object.assign(S.sessions[s.id] || {}, { status: 'completed', demo: true });
      } else if (['run', 'trailRun', 'track', 'bike', 'walk', 'crossTraining'].includes(t.kind)) {
        const minutes = t.dur ? (t.dur[0] + t.dur[1]) / 2 * (0.95 + 0.1 * Math.random()) : t.kind === 'track' ? 70 : t.kind === 'walk' ? 40 : 45;
        const sport = t.kind === 'trailRun' ? 'trailRunning' : t.kind === 'track' ? 'trackRunning' : t.kind === 'bike' ? 'indoorCycling' : t.kind === 'walk' ? 'walking' : t.kind === 'crossTraining' ? 'hiking' : 'running';
        const hard = isHard(t.intensity) || t.intensity === 'mixed', trail = t.kind === 'trailRun';
        const samples = []; let dist = 0, alt = 300, up = 0, down = 0;
        const CTR = trail ? [45.1885, 5.7245] : [45.8992, 6.1294];     // Grenoble pour le trail, Annecy pour la route
        const seedAng = Math.random() * 6.28;
        for (let sec = 0; sec <= minutes * 60; sec += 10) {
          const ph = sec / 60, inWork = hard && ph > 20 && ph < minutes - 12 && Math.floor(ph / 5) % 2 === 0;
          const hrBase = sport === 'indoorCycling' ? 118 : sport === 'walking' || sport === 'hiking' ? 105 : 138 + (prog * -2);
          const hr = Math.round(Math.min(188, hrBase + (inWork ? 28 : 0) + Math.min(10, ph / 6) * (trail ? 1.2 : 0.6) + 2 * gauss()));
          const v = sport === 'indoorCycling' ? 0 : sport === 'walking' || sport === 'hiking' ? 1.4 : (trail ? 2.6 : 3.15) + (inWork ? 0.9 : 0) + 0.1 * gauss();
          if (sec) { dist += v * 10; const na = 300 + (trail ? 260 * Math.sin(ph / 22) + 80 * Math.sin(ph / 7) : 15 * Math.sin(ph / 9)); const dd = na - alt; if (dd > 0) up += dd; else down -= dd; alt = na; }
          let la = null, lo = null;
          if (sport !== 'indoorCycling' && minutes > 0) {
            const th = 2 * Math.PI * (dist / Math.max(1, v * minutes * 60)) + seedAng;
            const rad = 420 + 170 * Math.sin(3 * th + seedAng) + (trail ? 260 : 60);
            const dx = rad * Math.cos(th), dy = rad * Math.sin(th);
            la = +(CTR[0] + dy / 111320).toFixed(5); lo = +(CTR[1] + dx / (111320 * Math.cos(CTR[0] * Math.PI / 180))).toFixed(5);
          }
          samples.push([sec, hr, sport === 'indoorCycling' ? null : +v.toFixed(2), Math.round(dist), sport === 'indoorCycling' ? null : +alt.toFixed(1), la, lo, sport === 'indoorCycling' ? null : Math.round(84 + 4 * gauss())]);
        }
        const hrs = samples.map(x => x[1]), startMs = D.at(d, hour, 10 + Math.floor(Math.random() * 30));
        const a = { id: 'demo:' + uid(), source: 'demo', sport, start: startMs, elapsed: minutes * 60, timer: minutes * 60, dist: sport === 'indoorCycling' ? null : dist, up: sport === 'indoorCycling' ? null : Math.round(up), down: sport === 'indoorCycling' ? null : Math.round(down),
          avgHR: St.mean(hrs), maxHR: Math.max(...hrs), kcal: Math.round(minutes * 11), samples,
          fields: sport === 'indoorCycling' ? ['FC'] : ['FC', 'Vitesse', 'Altitude', 'GPS', 'Cadence'], warnings: [] };
        computeTrimp(a); S.activities.push(a);
        if (!s.id.startsWith('free')) { a.linked = s.id; a.linkState = 'auto'; if (t.toLog) S.sessions[s.id] = Object.assign(S.sessions[s.id] || {}, { rpe: 7, durationMin: Math.round(minutes), note: '10 × 400 m, récup. 1 min (démo)' }); }
      }
    }
  }
  S.perfs = S.perfs?.length ? S.perfs : [{ d: 1000, t: 192, max: true, demo: true }, { d: 2000, t: 420, max: true, demo: true }, { d: 3000, t: 660, max: true, demo: true }];
  save(); toast('90 jours de données de démo générés.'); render();
}
function computeTrimp(a) {
  const P = S.profile; if (a.samples === undefined && a.nSamples) return; // courbes pas encore chargées : TRIMP conservé
  a.trimp = null; a.trimpAvg = false; if (!(P.restingHR && P.maxHR)) return;
  const hr = (a.samples || []).filter(x => x[1]).map(x => [x[0], x[1]]);
  if (hr.length >= 2) { const r = trimpBanister(hr, P.restingHR, P.maxHR, P.sex); if (r) a.trimp = r.trimp; }
  else if (a.avgHR) { a.trimp = trimpFromAverage(a.avgHR, (a.timer || a.elapsed) / 60, P.restingHR, P.maxHR, P.sex); a.trimpAvg = true; }
}

// ===================== Import =====================
function ingest(a, rep) {
  const dup = S.activities.find(x => x.id === a.id || isDuplicate(x, a));
  if (dup) { rep.dup++; if (a.garminId && !dup.garminId) dup.garminId = a.garminId; return; }
  computeTrimp(a); a.linkState = 'none';
  const day = D.ofTime(a.start), linked = new Set(S.activities.map(x => x.linked).filter(Boolean)), m = matchActivity(a, Plan.sessions(day), linked);
  if (m.type === 'auto') { a.linked = m.id; a.linkState = 'auto'; rep.auto++; } else if (m.type === 'validate') { a.candidates = m.ids; a.linkState = 'validate'; rep.pend++; }
  S.activities.push(a); rep.ok++;
}
async function importFiles(files) {
  const rep = { ok: 0, dup: 0, auto: 0, pend: 0, err: [] }; const items = [];
  for (const f of files) {
    try { const buf = await f.arrayBuffer(); if (/\.zip$/i.test(f.name)) items.push(...await unzipFiles(buf)); else items.push({ name: f.name, buf }); }
    catch (e) { rep.err.push(f.name + ' : ' + e.message); }
  }
  for (const it of items) {
    try { ingest(FIT.activity(it.buf), rep); } catch (e) { rep.err.push(it.name + ' : ' + e.message); }
  }
  save(); render();
  alert([`${rep.ok} activité(s) importée(s)`, rep.dup ? rep.dup + ' doublon(s) ignoré(s)' : '', rep.auto ? rep.auto + ' associée(s) à une séance' : '', rep.pend ? rep.pend + ' à valider' : '', ...rep.err].filter(Boolean).join('\n'));
}

// ===================== Actions =====================
function formVals(root) { const o = {}; root.querySelectorAll('[name]').forEach(el => { if (el.type === 'checkbox') { if (el.name === 'p') { (o.p = o.p || []); if (el.checked) o.p.push(el.value); } else o[el.name] = el.checked; } else o[el.name] = el.value; }); return o; }
const A = {
  pop, demo, clearDemo,
  syncNow() { Cloud.dirty ? Cloud.push() : Cloud.pull(); },
  checkin: () => push('checkin', { draft: {} }),
  scale(d, el) { const k = d.k, v = +d.v, box = el.parentElement; const was = el.classList.contains('on'); box.querySelectorAll('button').forEach(b => b.classList.remove('on')); if (!was) el.classList.add('on'); document.getElementById('v-' + k).textContent = was ? '–' : v + '/7'; },
  saveCheckin() {
    const day = today(), root = modalRoot(), v = formVals(root), w = S.wellness[day] = S.wellness[day] || {};
    root.querySelectorAll('.scale').forEach(s => { const on = s.querySelector('.on'); w[s.dataset.k] = on ? +on.dataset.v : null; });
    w.pain = num(v.pain) ?? 0; w.painLoc = v.painLoc; w.note = v.note;
    const m = S.metrics[day] = S.metrics[day] || {};
    if (num(v.hrv) > 0) Object.assign(m, { hrv: num(v.hrv), hrvMethod: 'rmssd', hrvProv: 'manual' });
    if (num(v.rhr) > 0) Object.assign(m, { rhr: num(v.rhr), rhrProv: 'manual' });
    if (num(v.sleep) > 0) Object.assign(m, { sleepMin: num(v.sleep) * 60, sleepProv: 'manual' });
    if (num(v.weight) > 0) m.weight = num(v.weight);
    if (num(v.intake) > 0) (S.metrics[D.add(day, -1)] = S.metrics[D.add(day, -1)] || {}).intake = num(v.intake);
    save(); pop(); toast('Check-in enregistré');
  },
  openSession: d => push('session', { id: d.id, keepScroll: true }),
  adapt: d => push('adapt', { key: d.key }),
  restDone(d) { const s = findSession(d.key); S.sessions[d.key] = Object.assign(S.sessions[d.key] || { original: s.t.id }, { status: 'completed' }); save(); render(); },
  saveAdapt() {
    const v = formVals(modalRoot()), s = findSession(v.key), obs = dash(today()).obs.filter(o => o.cat !== 'Compétitions' || o.lvl === 'attention');
    const ind = obs.map(o => o.msg + (Object.keys(o.ind).length ? ' [' + Object.entries(o.ind).map(([k, x]) => k + ' : ' + x).join(' ; ') + ']' : '')).join('\n');
    const conf = obs.map(o => o.conf).sort((a, b) => RANK[a] - RANK[b])[0] || 'low';
    S.adaptations.push({ id: uid(), at: Date.now(), key: v.key, original: s.t.id, decision: v.decision, replacement: v.decision === 'replace' ? v.replacement : null, reason: v.reason, indicators: ind, conf });
    const r = S.sessions[v.key] = S.sessions[v.key] || { original: s.t.id };
    if (v.decision === 'postpone') r.status = 'postponed'; if (v.decision === 'cancel') r.status = 'cancelledVoluntarily'; if (v.decision === 'skipForRecovery') r.status = 'skippedForRecovery';
    if (v.decision === 'replace') r.templateId = v.replacement; if (v.reason) r.note = v.reason;
    save(); pop(); toast('Décision enregistrée avec ses indicateurs');
  },
  saveLog(d) { const v = formVals(modalRoot()), s = findSession(d.key); const r = S.sessions[d.key] = S.sessions[d.key] || { original: s.t.id }; r.rpe = num(v.rpe); r.durationMin = num(v.dur); r.note = v.note; save(); toast('Enregistré'); render(); },
  link(d) { const a = S.activities.find(x => x.id === d.id); a.linked = d.key; a.linkState = 'validated'; a.candidates = []; save(); render(); },
  unlink(d) { const a = S.activities.find(x => x.id === d.id); a.linked = null; a.linkState = 'none'; save(); render(); },
  ignoreAct(d) { const a = S.activities.find(x => x.id === d.id); a.linkState = 'ignored'; a.candidates = []; save(); render(); },
  deleteAct(d) { if (!confirm('Supprimer cette activité ?')) return; S.activities = S.activities.filter(x => x.id !== d.id); save(); pop(); },
  activity: d => push('activity', { id: d.id }),
  week(d) { ui.week = +d.d === 0 ? 0 : ui.week + +d.d; render(); },
  phases: () => push('phases'),
  weekEdit(d) { ui.weekDraft = JSON.parse(JSON.stringify(S.weekEdits?.[d.w] || WEEK_TEMPLATES[d.w])); push('weekEdit', { w: d.w, keepScroll: true }); },
  weekAdd(d) { (ui.weekDraft.days[d.d] = ui.weekDraft.days[d.d] || []).push(P('evening', 'run_easy45')); renderModal(); },
  weekDel(d) { ui.weekDraft.days[d.d].splice(+d.i, 1); renderModal(); },
  weekSave() { const w = ui.stack[ui.stack.length - 1].w; (S.weekEdits = S.weekEdits || {})[w] = ui.weekDraft; save(); pop(); toast('Semaine type enregistrée'); },
  weekReset(d) { if (!confirm('Revenir à la semaine type d\'origine ?')) return; delete S.weekEdits[d.w]; save(); pop(); }, jump: () => push('jump'),
  gotoDate(d) { S.simDate = d.d === D.realToday() ? null : d.d; ui.week = 0; save(); ui.stack = []; ui.tab = 'plan'; render(); },
  setSim() { const v = formVals(modalRoot()).sim; if (v) { S.simDate = v === D.realToday() ? null : v; ui.week = 0; save(); ui.stack = []; render(); } },
  simReset() { S.simDate = null; ui.week = 0; save(); ui.stack = []; render(); },
  editEvent: d => push('event', { id: d.id }), newEvent: () => push('event', {}),
  saveEvent(d) {
    const v = formVals(modalRoot()); if (!v.name.trim()) return toast('Nom obligatoire');
    let e = S.events.find(x => x.id === d.id); if (!e) { e = Object.assign({}, EV(d.id, '', v.start, {})); S.events.push(e); }
    Object.assign(e, { name: v.name.trim(), start: v.start, end: v.end && v.end >= v.start ? v.end : v.start, discipline: v.discipline, format: v.format, distanceKm: num(v.distanceKm), upM: num(v.upM), downM: num(v.downM),
      priority: v.priority || null, status: v.status, target: v.target ? parseDur(v.target) : null, result: v.result ? parseDur(v.result) : null, taper: num(v.taper), recovery: num(v.recovery), effort: v.effort, nutrition: v.nutrition, notes: v.notes, debrief: v.debrief });
    save(); pop(); toast('Compétition enregistrée');
  },
  deleteEvent(d) { if (!confirm('Supprimer définitivement ?')) return; S.events = S.events.filter(e => e.id !== d.id); save(); pop(); },
  library: () => push('library', { q: '' }), exercise: d => push('exercise', { id: d.id }), newExercise: () => push('newExercise'),
  saveExercise() { const v = formVals(modalRoot()); if (!v.name?.trim() || !v.p?.length) return toast('Nom et au moins un muscle'); S.customEx.push(ex('custom_' + uid(), v.name.trim(), 'Exercice personnalisé', v.cat, v.p, [], { eq: v.eq ? [v.eq] : [], cues: v.cues ? v.cues.split('\n').filter(Boolean) : ['Consignes à compléter'], timed: !!v.timed, bw: !!v.bw, custom: true, src: 'Exercice créé par l\'utilisateur' })); save(); pop(); },
  strengthDetail: d => push('strengthDetail', { id: d.id }),
  deleteStrength(d) { if (!confirm('Supprimer cette séance ?')) return; S.strength = S.strength.filter(s => s.id !== d.id); save(); pop(); },
  profile: () => push('profile'), measures: () => push('measures'), trends: () => push('trends'), paces: () => push('paces'), refs: () => push('refs'),
  saveProfile() {
    const v = formVals(modalRoot()), P = S.profile, old = [P.restingHR, P.maxHR, P.sex].join();
    Object.assign(P, { name: v.name, sex: v.sex, birthYear: num(v.birthYear), heightCm: num(v.heightCm), massKg: num(v.massKg), bodyFat: num(v.bodyFat), restingHR: num(v.restingHR), maxHR: num(v.maxHR), vma: num(v.vma), refs: v.refs, sleepNeed: num(v.sleepNeed) || 8, formula: v.formula, inc: num(v.inc) || 1.25, suggestRIR: num(v.suggestRIR) ?? 2, defaultRest: num(v.defaultRest) || 90 });
    if (old !== [P.restingHR, P.maxHR, P.sex].join()) recomputeTrimp();
    save(); pop(); toast('Profil enregistré');
  },
  addPerf() { const v = formVals(modalRoot()), d = num(v.pd), t = parseDur(v.pt); if (!(d > 0 && t > 0)) return toast('Distance et temps requis'); S.perfs.push({ d, t, max: !!v.pm }); save(); render(); },
  delPerf(d) { S.perfs.splice(+d.i, 1); save(); render(); },
  delMetric(d) { delete S.metrics[d.d]; save(); render(); },
  exportJSON() { const blob = new Blob([JSON.stringify(Object.assign({ exportedAt: new Date().toISOString(), engineVersion: 'cockpit-core-1.0.0' }, S), null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cockpit-sauvegarde-${D.realToday()}.json`; a.click(); },
  reset() { if (!confirm(Cloud.mode === 'cloud' ? 'Effacer TOUTES les données de ton compte (programme personnalisé, mesures, activités, musculation) ? Exporte une sauvegarde avant si besoin.' : 'Effacer toutes les données de ce navigateur ?')) return; if (Cloud.mode === 'cloud' && prompt('Tape EFFACER pour confirmer') !== 'EFFACER') return; S = fresh(); save(); ui.stack = []; ui.wo = null; render(); },
  startWorkout: d => startWorkout(d.tpl, d.key),
  woLoad(d) { ui.wo.load = Math.max(0, +(ui.wo.load + +d.d * (S.profile.inc || 1.25)).toFixed(2)); renderWorkout(); },
  woReps(d) { ui.wo.reps = Math.max(1, ui.wo.reps + +d.d); renderWorkout(); },
  woSecs(d) { ui.wo.secs = Math.max(5, ui.wo.secs + 5 * +d.d); renderWorkout(); },
  woRir(d) { ui.wo.rir = +d.v; renderWorkout(); },
  woWarm(d, el) { ui.wo.warm = el.checked; },
  applySug(d) { ui.wo.load = +d.v; renderWorkout(); },
  woValidate() {
    const w = ui.wo, st = w.steps[w.i], e = LIB()[st.rx.id], timed = e?.timed || !!st.rx.durS, s = S.strength.find(x => x.id === w.sid);
    s.sets.push({ ex: st.rx.id, n: st.n, load: w.load, reps: timed ? 1 : w.reps, dur: timed ? w.secs : null, rir: w.rir, warm: w.warm, at: Date.now() });
    w.lastSet = s.sets[s.sets.length - 1]; navigator.vibrate?.(40);
    let target, src;
    if (st.rx.rest) { target = st.rx.rest; src = 'repos prescrit'; }
    else { const habit = St.median(S.strength.flatMap(x => x.sets).filter(x => x.ex === st.rx.id && x.rest).map(x => x.rest)); if (habit) { target = Math.round(habit / 15) * 15; src = 'ta durée habituelle sur cet exercice'; } else { target = S.profile.defaultRest || 90; src = 'ton réglage par défaut'; } }
    w.i++; save();
    if (w.i < w.steps.length) { w.rest = { start: Date.now(), target, src }; prefill(); }
    renderWorkout();
  },
  restAdj(d) { ui.wo.rest.target = Math.max(0, ui.wo.rest.target + +d.d); ui.wo.rest.beeped = false; tick(); renderWorkout(); },
  restEnd() { const w = ui.wo; if (w.lastSet) w.lastSet.rest = Math.round((Date.now() - w.rest.start) / 1000); w.rest = null; save(); renderWorkout(); },
  woMove(d) { const w = ui.wo; w.i = Math.max(0, Math.min(w.steps.length, w.i + +d.d)); w.rest = null; prefill(); renderWorkout(); },
  woQuit() { if (confirm('Abandonner la séance sans l\'enregistrer ?\n(Annuler = continuer)')) { S.strength = S.strength.filter(s => s.id !== ui.wo.sid); ui.wo = null; save(); render(); } },
  woSummary() { const s = S.strength.find(x => x.id === ui.wo.sid); s.end = s.end || Date.now(); ui.wo.summary = true; ui.stack = [{ type: 'summary' }]; render(); },
  resumeWorkout() { const s = S.strength.find(x => x.id === ui.wo.sid); s.end = null; ui.wo.summary = false; ui.stack = []; render(); },
  finishWorkout() {
    const v = formVals(modalRoot()), s = S.strength.find(x => x.id === ui.wo.sid); s.rpe = num(v.rpe); s.notes = v.notes; s.end = s.end || Date.now();
    if (s.key) S.sessions[s.key] = Object.assign(S.sessions[s.key] || { original: s.templateId }, { status: 'completed' });
    ui.wo = null; ui.stack = []; try { ui.wake?.release(); } catch (e) { } save(); render(); toast('Séance enregistrée');
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  if (el.tagName !== 'INPUT') e.preventDefault();
  fn(el.dataset, el, e);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'fitInput' && el.files.length) { importFiles([...el.files]); el.value = ''; }
  if (el.id === 'jsonInput' && el.files[0]) { el.files[0].text().then(t => { try { const o = JSON.parse(t); S = Object.assign(fresh(), o); save(); render(); toast('Sauvegarde restaurée'); } catch (x) { alert('Fichier illisible'); } }); el.value = ''; }
  if (el.dataset.a2 === 'setStatus') { const s = findSession(el.dataset.key); S.sessions[el.dataset.key] = Object.assign(S.sessions[el.dataset.key] || { original: s.t.id }, { status: el.value }); save(); if (el.value === 'deleted') { pop(); } else render(); }
  if (el.dataset.a2?.startsWith('wk')) { const p = ui.weekDraft.days[el.dataset.d][+el.dataset.i], k = el.dataset.a2; if (k === 'wkSlot') p.slot = el.value; if (k === 'wkA') p.a = el.value; if (k === 'wkB') p.b = el.value || null; if (k === 'wkOpt') p.opt = el.checked; if (k === 'wkLight') p.light = el.checked; if (k === 'wkCond') p.cond = el.value || null; }
  if (el.dataset.a2 === 'setVariant' && el.value) { const s = findSession(el.dataset.key); const r = S.sessions[el.dataset.key] = S.sessions[el.dataset.key] || { original: s.t.id }; r.original = r.original || s.t.id; r.templateId = el.value; save(); render(); }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.a2 === 'searchEx') { const top = ui.stack[ui.stack.length - 1]; top.q = el.value; const pos = el.selectionStart; renderModal(); const n = modalRoot().querySelector('.search'); n.focus(); n.setSelectionRange(pos, pos); }
  if (el.dataset.a2 === 'vdot') { m_vd.d = document.getElementById('vd').value; m_vd.t = document.getElementById('vt').value; document.getElementById('vdotOut').innerHTML = vdotOut(); }
});
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => { ui.tab = b.dataset.tab; ui.stack = []; document.getElementById('view').scrollTop = 0; render(); }));

