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
    if (x.sleepMin > 0) { if (can(m.sleepProv)) { Object.assign(m, { sleepMin: x.sleepMin, inBedMin: x.inBedMin, deepMin: x.deepMin, remMin: x.remMin, sleepProv: 'garmin' }); if (x.sleepScore != null) m.sleepScore = x.sleepScore; n.sleep++; } else n.kept++; }
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
    if (rep.ok || n.sleep) toast(`Garmin : ${rep.ok} activité(s), ${n.sleep} nuit(s), ${n.hrv} VFC intégrées`);
  }
  const active = GM.runs.some(r => r.status === 'requested' || r.status === 'running');
  clearTimeout(GM.poll);
  if (active) GM.poll = setTimeout(() => garminMerge().then(render), 15000);
}

const RUN_LABEL = { requested: 'En attente de GitHub Actions', running: 'En cours', done: 'Terminée', error: 'Échec' };
function garminCard() {
  const head = `<div class="sec"><span>Garmin Connect</span><small>API personnelle officielle</small></div>`;
  if (Cloud.mode !== 'cloud') return head + `<div class="card small t2">La synchronisation Garmin passe par ton compte Supabase et GitHub Actions. Mode local : utilise l'import de fichiers FIT ci-dessous.</div>`;
  const last = GM.runs[0], active = GM.runs.find(r => r.status === 'requested' || r.status === 'running'), lm = S.garmin?.lastMerge;
  const fmt = t => t ? new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '–';
  const runRow = r => `<details><summary class="small">${r.status === 'done' ? '✅' : r.status === 'error' ? '⚠️' : '⏳'} ${fmt(r.finished_at || r.started_at || r.requested_at)} · ${RUN_LABEL[r.status]}${r.source === 'auto' ? ' · auto' : ''}${r.range_from ? ` <span class="tiny t3">(${D.short(r.range_from)} → ${D.short(r.range_to)})</span>` : ''}</summary>
    ${r.error ? `<div class="tiny danger">${esc(r.error)}</div>` : ''}${Object.entries(r.report?.counts || {}).map(([k, v]) => `<div class="kv tiny"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}${(r.report?.errors || []).map(e => `<div class="tiny warn">${esc(e)}</div>`).join('')}</details>`;
  return head + `<div class="card">
    ${!GM.runs.length ? `<div class="small">Aucune synchronisation pour l'instant. Une fois ta clé Garmin enregistrée dans les secrets du dépôt GitHub (voir README), lance la première ici.</div>` : ''}
    ${active ? `<div class="small">⏳ ${RUN_LABEL[active.status]}… <span class="tiny t3">demandée ${fmt(active.requested_at)}</span></div><div class="tiny t3">${ghToken() ? 'Lancement immédiat demandé à GitHub.' : 'Prise en charge au prochain passage automatique (toutes les 30 min au plus), ou lance le workflow « Garmin sync » depuis GitHub.'}</div>`
      : `<div class="row"><select id="gmDays" style="width:auto">${[[3, '3 derniers jours'], [7, '7 jours'], [30, '30 jours'], [90, '90 jours'], [180, '180 jours'], [365, '1 an']].map(([d, l]) => `<option value="${d}" ${d === GM.days ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn pri" data-a="gmSync">⟳ Synchroniser</button></div>`}
    ${GM.err ? `<div class="tiny danger">${esc(GM.err)}</div>` : ''}
    ${lm ? `<div class="tiny t2" style="margin-top:6px">Dernière intégration ${fmt(lm.at)} : ${lm.acts} activité(s), ${lm.sleep} nuit(s), ${lm.hrv} VFC, ${lm.rhr} FC de repos${lm.kept ? `, ${lm.kept} saisie(s) manuelle(s) conservée(s)` : ''}${lm.pend ? `, ${lm.pend} à valider` : ''}${lm.profile?.length ? ', profil complété' : ''}.</div>` : ''}
    ${GM.runs.length ? `<div style="margin-top:6px">${GM.runs.slice(0, 5).map(runRow).join('')}</div>` : ''}
    <div class="tiny t3" style="margin-top:6px">Synchro automatique toutes les 3 h par GitHub Actions : VFC nocturne (RMSSD), sommeil et phases, FC de repos, poids, activités avec fichier FIT original. Une saisie manuelle n'est jamais écrasée.</div>
    <details><summary class="tiny t2">Lancement immédiat (facultatif)</summary><div class="tiny t3">Sans réglage, une demande est traitée au prochain passage automatique (30 min au plus). Pour un lancement immédiat, colle un jeton GitHub « fine-grained » limité au dépôt ${esc(CFG.githubRepo || 'cockpit')} avec la seule permission « Actions : Read and write ». Il reste sur cet appareil.</div>
      <div class="row"><input type="password" id="ghTok" placeholder="github_pat_…" value="${ghToken() ? '••••••••' : ''}"><button class="btn sm" data-a="ghTokSave">OK</button></div></details></div>`;
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
