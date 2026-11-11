// ===================== Garmin Connect (API personnelle officielle, synchronisée par GitHub Actions) =====================
LABELS.prov.garmin = 'Garmin';
const GM = { runs: [], poll: null, days: 30, err: null };
const ghToken = () => { try { return localStorage.getItem('cockpit-gh-token') || ''; } catch (e) { return ''; } };

// Intègre ce que GitHub Actions a déposé dans Supabase : jours Garmin, nouvelles activités, comptes rendus
async function garminMerge() {
  if (Cloud.mode !== 'cloud') return;
  const sb = Cloud.sb; S.garmin = S.garmin || {};
  // 1. jours (VFC, sommeil, FC de repos, poids)
  const { data: days, error } = await sb.from('garmin_days').select('day,data,updated_at').gt('updated_at', S.garmin.daysCursor || '1970-01-01T00:00:00Z').order('updated_at', { ascending: true }).limit(2000);
  if (error) console.warn(error);
  const n = { hrv: 0, rhr: 0, sleep: 0, weight: 0, kept: 0 };
  for (const r of days || []) {
    const x = r.data, m = S.metrics[r.day] = S.metrics[r.day] || {};
    const can = prov => !prov || prov === 'garmin' || prov === 'demo';
    if (x.hrv > 0) { if (can(m.hrvProv)) { Object.assign(m, { hrv: x.hrv, hrvMethod: 'rmssd', hrvProv: 'garmin' }); n.hrv++; } else n.kept++; }
    if (x.rhr > 0) { if (can(m.rhrProv)) { Object.assign(m, { rhr: x.rhr, rhrProv: 'garmin' }); n.rhr++; } else n.kept++; }
    if (x.sleepMin > 0) { if (can(m.sleepProv)) { Object.assign(m, { sleepMin: x.sleepMin, inBedMin: x.inBedMin, deepMin: x.deepMin, remMin: x.remMin, lightMin: x.lightMin, sleepProv: 'garmin' });
      if (x.sleepScore != null) m.sleepScoreGarmin = x.sleepScore; if (x.sleepStart != null) m.sleepStart = x.sleepStart; n.sleep++; } else n.kept++; }
    for (const k of ['steps', 'stress', 'bodyBattery', 'kcal']) if (x[k] != null) m[k] = x[k];
    if (x.weight > 0) { if (can(m.weightProv) || m.weight == null) { m.weight = x.weight; m.weightProv = 'garmin'; n.weight++; } else n.kept++; }
    S.garmin.daysCursor = r.updated_at;
  }
  // 2. activités déposées par la synchro : TRIMP, doublons, rapprochement avec le programme
  const pending = S.activities.filter(a => a.pending);
  const rep = { ok: 0, dup: 0, auto: 0, pend: 0, err: [] };
  if (pending.length) {
    await Cloud.samples(pending);
    for (const a of pending) {
      delete a.pending;
      S.activities = S.activities.filter(x => x !== a);
      ingest(a, rep);
      if (!S.activities.includes(a)) Cloud.deleted.add(a.id);   // doublon d'un import manuel : retiré
    }
  }
  // 3. comptes rendus
  const { data: runs } = await sb.from('sync_runs').select('*').order('id', { ascending: false }).limit(8);
  GM.runs = runs || [];
  const P = S.profile, filled = [];
  for (const run of GM.runs.filter(r => (r.status === 'done' || r.status === 'error') && !r.merged).reverse()) {
    for (const [k, v] of Object.entries(run.report?.profile || {})) {
      if (k === 'vo2maxGarmin') { P.vo2maxGarmin = v; continue; }
      if (k !== 'sex' && P[k] == null && v != null) { P[k] = v; filled.push(k); }
    }
    await sb.from('sync_runs').update({ merged: true }).eq('id', run.id);
    run.merged = true;
  }
  if (filled.some(k => k === 'restingHR' || k === 'maxHR')) await recomputeTrimp();
  const changed = (days || []).length || pending.length || filled.length;
  if (changed) {
    S.garmin.lastMerge = { at: Date.now(), days: (days || []).length, hrv: n.hrv, sleep: n.sleep, rhr: n.rhr, kept: n.kept, acts: rep.ok, dup: rep.dup, auto: rep.auto, pend: rep.pend, profile: filled };
    save();
    const bits = [rep.ok && plural(rep.ok, 'activité'), n.sleep && plural(n.sleep, 'nuit'), n.hrv && plural(n.hrv, 'mesure de VFC', 'mesures de VFC')].filter(Boolean);
    if (bits.length) toast('Garmin : ' + bits.join(', ') + (bits.length > 1 || rep.ok > 1 || n.sleep > 1 ? ' ajoutées' : ' ajoutée'));
  }
  const active = GM.runs.some(r => r.status === 'requested' || r.status === 'running');
  clearTimeout(GM.poll);
  if (active) GM.poll = setTimeout(() => garminMerge().then(render), 15000);
}

const RUN_LABEL = { requested: 'En attente', running: 'En cours', done: 'Terminée', error: 'Échec' };
const RUN_COLOR = { requested: 'var(--dim)', running: 'var(--accent)', done: 'var(--good)', error: 'var(--low)' };
const plural = (n, one, many) => `${n} ${n > 1 ? (many || one + 's') : one}`;

function garminCard() {
  const head = sec('Garmin Connect', 'API personnelle officielle');
  if (typeof Cloud === 'undefined' || Cloud.mode !== 'cloud')
    return head + `<div class="card"><div class="metricName">Pas disponible en mode local</div>
      <div class="meta">La synchronisation automatique passe par ton compte et GitHub Actions. Ici, tu peux importer des fichiers FIT à la main.</div></div>`;

  const runs = GM.runs || [], active = runs.find(r => r.status === 'requested' || r.status === 'running');
  const lastDone = runs.find(r => r.status === 'done'), lastErr = runs.find(r => r.status === 'error');
  const failed = lastErr && (!lastDone || lastErr.id > lastDone.id);
  const lm = S.garmin?.lastMerge;
  const when = lm ? relTime(lm.at) : lastDone?.finished_at ? relTime(Date.parse(lastDone.finished_at)) : null;
  const nAct = S.activities.filter(a => a.source === 'garmin').length;
  const nNights = Object.values(S.metrics).filter(m => m.sleepProv === 'garmin').length;
  const nHrv = Object.values(S.metrics).filter(m => m.hrvProv === 'garmin').length;

  let state;
  if (active) state = { ic: 'sync', col: 'var(--accent)', title: 'Mise à jour en cours', sub: ghToken() ? 'GitHub a été prévenu, compte quelques minutes.' : 'Elle part au prochain passage automatique, dans 30 minutes au plus.' };
  else if (failed) state = { ic: 'alert', col: 'var(--low)', title: 'La dernière mise à jour a échoué', sub: lastErr.error || 'Raison inconnue.' };
  else if (when) state = { ic: 'check', col: 'var(--good)', title: 'À jour', sub: `Dernière mise à jour ${when}.` };
  else state = { ic: 'alert', col: 'var(--mid)', title: 'Pas encore connecté', sub: 'Ajoute ta clé Garmin dans les secrets du dépôt GitHub, puis lance une première mise à jour.' };

  return head + `<div class="card">
    <div class="row top"><span style="color:${state.col};flex:none;display:flex">${ic(state.ic, 22)}</span>
      <div class="grow"><div class="metricName">${esc(state.title)}</div><div class="meta">${esc(state.sub)}</div></div></div>

    ${nAct + nNights ? `<div class="row" style="margin-top:14px;gap:0">
      ${[[nAct, 'activité'], [nNights, 'nuit'], [nHrv, 'mesure de VFC', 'mesures de VFC']].map(([n, one, many]) =>
        `<div style="flex:1"><div class="num" style="font-size:21px">${n}</div><div class="meta">${esc((many && n > 1 ? many : one + (n > 1 ? 's' : '')))}</div></div>`).join('')}
    </div>` : ''}

    ${active ? '' : `<div class="row" style="margin-top:16px;gap:10px">
      <button class="btn pri grow" data-a="gmSync">${ic('sync', 17)} Mettre à jour</button>
      <select id="gmDays" style="width:auto;flex:none">${[[3, '3 j'], [7, '7 j'], [30, '30 j'], [90, '90 j'], [180, '6 mois'], [365, '1 an']].map(([d, l]) => `<option value="${d}" ${d === GM.days ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>`}
    ${GM.err ? `<div class="small danger" style="margin-top:8px">${esc(GM.err)}</div>` : ''}

    <details><summary>Ce que Garmin remplit, et l'historique</summary>
      <div class="meta" style="margin:6px 0 10px">Variabilité cardiaque nocturne, sommeil et ses phases, fréquence au repos, poids, et chaque activité avec son fichier d'origine. Une valeur que tu saisis toi-même n'est jamais remplacée. La mise à jour part toute seule toutes les 3 heures.</div>
      ${runs.length ? runs.slice(0, 6).map(r => `<div class="kv tiny"><span><span class="dot" style="background:${RUN_COLOR[r.status]}"></span>
        ${new Date(r.finished_at || r.started_at || r.requested_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        <b>${RUN_LABEL[r.status]}${r.report?.counts ? ` — ${Object.entries(r.report.counts).filter(([, v]) => v).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ')}` : ''}${r.error ? ' — ' + esc(r.error.slice(0, 120)) : ''}</b></div>`).join('')
        : '<div class="meta">Aucune mise à jour pour l\'instant.</div>'}
    </details>
    <details><summary>Lancer tout de suite plutôt qu'attendre</summary>
      <div class="meta" style="margin:6px 0 10px">Sans réglage, une demande part au prochain passage automatique, dans 30 minutes au plus. Pour qu'elle parte immédiatement, colle un jeton GitHub « fine-grained » limité au dépôt ${esc(CFG.githubRepo || 'garmin')}, avec la seule permission « Actions : Read and write ». Il reste sur cet appareil.</div>
      <div class="row" style="gap:8px"><input type="password" id="ghTok" placeholder="github_pat_…" value="${ghToken() ? '••••••••' : ''}"><button class="btn sm" data-a="ghTokSave">Enregistrer</button></div>
    </details></div>`;
}
async function garminRequest() {
  GM.err = null;
  const to = D.realToday(), from = D.add(to, -(GM.days - 1));
  const { error } = await Cloud.sb.from('sync_runs').insert({ source: 'app', status: 'requested', range_from: from, range_to: to });
  if (error) { GM.err = 'Demande impossible : ' + error.message; render(); return; }
  const tok = ghToken();
  if (tok && CFG.githubRepo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${CFG.githubRepo}/actions/workflows/${CFG.workflow}/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' }, body: JSON.stringify({ ref: 'main' }) });
      if (!r.ok) GM.err = `GitHub refuse le lancement immédiat (${r.status}) : la demande sera traitée au prochain passage automatique.`;
    } catch (e) { GM.err = 'GitHub injoignable : la demande sera traitée au prochain passage automatique.'; }
  }
  toast('Synchronisation Garmin demandée');
  await garminMerge(); render();
}

Object.assign(A, {
  gmSync() { GM.days = +(document.getElementById('gmDays')?.value || 30); garminRequest(); },
  ghTokSave() { const v = document.getElementById('ghTok')?.value.trim(); if (v && !v.startsWith('••')) { try { localStorage.setItem('cockpit-gh-token', v); } catch (e) { } toast('Jeton enregistré sur cet appareil'); } else if (!v) { try { localStorage.removeItem('cockpit-gh-token'); } catch (e) { } toast('Jeton retiré'); } render(); },
  logout() { if (confirm('Se déconnecter ?')) Cloud.signOut(false); },
  logoutWipe() { if (confirm('Se déconnecter et effacer la copie locale de cet appareil ? (Les données restent dans ton compte.)')) Cloud.signOut(true); }
});

// ===================== Démarrage =====================
(async () => {
  let cloud = false;
  try { cloud = await Cloud.start(); } catch (e) { console.warn(e); }
  if (!cloud) {
    try { const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem('cockpit-apercu-v1'); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { }
    render();
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
})();
