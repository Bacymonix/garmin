// ===================== Compte et synchronisation Supabase =====================
// Une ligne « cockpit_state » par utilisateur (tout sauf les activités), une ligne par activité,
// courbes des activités chargées à la demande. Copie locale dans le navigateur pour démarrer
// instantanément et fonctionner hors ligne ; les modifications partent vers Supabase 1 s après.
const CFG = Object.assign({ supabaseUrl: '', supabaseAnonKey: '', githubRepo: '', workflow: 'garmin-sync.yml' }, window.COCKPIT_CONFIG || {});
const Cloud = {
  mode: 'local', sb: null, user: null, rev: 0, docJs: null, snap: {}, smUp: new Set(), deleted: new Set(),
  dirty: false, busy: false, again: false, timer: null, state: 'idle', msg: '',

  cacheKey() { return 'cockpit-cache-' + this.user.id; },
  stripAct(a) { const o = {}; for (const k in a) if (k !== 'samples' && k[0] !== '_') o[k] = a[k]; if (a.samples) o.nSamples = a.samples.length; return o; },
  stateDoc() { const o = {}; for (const k in S) if (k !== 'activities') o[k] = S[k]; return o; },
  writeCache() {
    try {
      localStorage.setItem(this.cacheKey(), JSON.stringify({ rev: this.rev, dirty: this.dirty, doc: this.stateDoc(), acts: S.activities.map(a => this.stripAct(a)), snap: this.snap, deleted: [...this.deleted], base: this.dirty ? (this.docJs || this.cachedBase || null) : null }));
    } catch (e) { /* quota : le cloud reste la référence */ }
  },
  baseDoc() { try { return JSON.parse(this.docJs || this.cachedBase || 'null'); } catch (e) { return null; } },
  readCache() { try { return JSON.parse(localStorage.getItem(this.cacheKey()) || 'null'); } catch (e) { return null; } },
  setState(st, msg = '') { this.state = st; this.msg = msg; const el = document.getElementById('cloudDot'); if (el) { el.dataset.st = st; el.title = msg || CLOUD_LABEL[st]; } },

  // appelé par save()
  saved() { this.dirty = true; this.writeCache(); this.setState('pending'); clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 1000); },

  async push() {
    if (this.mode !== 'cloud') return;
    if (this.busy) { this.again = true; return; }
    this.busy = true; this.setState('sync');
    try {
      if (JSON.stringify(this.stateDoc()) !== this.docJs) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const doc = this.stateDoc(), js = JSON.stringify(doc);
          const { data, error } = await this.sb.from('cockpit_state').update({ doc, rev: this.rev + 1 }).eq('user_id', this.user.id).eq('rev', this.rev).select('rev');
          if (error) throw error;
          if (data.length) { this.rev = data[0].rev; this.docJs = js; break; }
          if (attempt === 2) throw new Error('Conflit de version non résolu');
          await this.mergeRemote();           // un autre appareil a enregistré entre-temps ; on renvoie la version fusionnée
          render();
        }
      }
      const withS = [], without = [], present = new Set();
      for (const a of S.activities) {
        present.add(a.id);
        const meta = this.stripAct(a), mj = JSON.stringify(meta), row = { id: a.id, start_at: new Date(a.start).toISOString(), doc: meta };
        if (a.samples && !this.smUp.has(a.id)) withS.push(Object.assign(row, { samples: a.samples }));
        else if (this.snap[a.id] !== mj) without.push(row);
      }
      for (const [rows, label] of [[withS, 8], [without, 100]]) for (let i = 0; i < rows.length; i += label) {
        const part = rows.slice(i, i + label);
        const { error } = await this.sb.from('cockpit_activities').upsert(part, { onConflict: 'user_id,id' });
        if (error) throw error;
        for (const r of part) { this.snap[r.id] = JSON.stringify(r.doc); if (r.samples) this.smUp.add(r.id); }
      }
      const del = [...new Set([...Object.keys(this.snap).filter(id => !present.has(id)), ...this.deleted])];
      for (let i = 0; i < del.length; i += 100) {
        const part = del.slice(i, i + 100);
        const { error } = await this.sb.from('cockpit_activities').delete().in('id', part);
        if (error) throw error;
        part.forEach(id => { delete this.snap[id]; this.deleted.delete(id); });
      }
      this.dirty = false; this.writeCache(); this.setState('ok');
    } catch (e) {
      console.warn('Synchronisation Supabase', e);
      this.writeCache(); this.setState('offline', 'Hors ligne ou erreur : ' + (e.message || e) + '. Nouvel essai automatique.');
      clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 30000);
    } finally {
      this.busy = false;
      if (this.again) { this.again = false; this.push(); }
    }
  },

  async mergeRemote() {
    const { data, error } = await this.sb.from('cockpit_state').select('doc,rev').eq('user_id', this.user.id).maybeSingle();
    if (error) throw error;
    if (!data) return;
    const merged = merge3(this.baseDoc(), data.doc, this.stateDoc());
    S = Object.assign(fresh(), merged, { activities: S.activities });
    this.rev = data.rev; this.docJs = JSON.stringify(data.doc);
    toast('Modifications d\'un autre appareil fusionnées');
  },

  // Récupère l'état distant ; garde les modifications locales non envoyées
  async pull(first) {
    if (this.mode !== 'cloud' || this.busy) return;
    this.setState('sync');
    try {
      const { data: row, error } = await this.sb.from('cockpit_state').select('doc,rev').eq('user_id', this.user.id).maybeSingle();
      if (error) throw error;
      if (!row) {
        const { data, error: e2 } = await this.sb.from('cockpit_state').insert({ doc: this.stateDoc() }).select('rev').single();
        if (e2) throw e2;
        this.rev = data.rev; this.docJs = JSON.stringify(this.stateDoc());
      } else if (row.rev !== this.rev || first) {
        if (this.dirty && row.rev !== this.rev) S = Object.assign(fresh(), merge3(this.baseDoc(), row.doc, this.stateDoc()), { activities: S.activities });
        else if (!this.dirty) S = Object.assign(fresh(), row.doc, { activities: S.activities });
        this.rev = row.rev; this.docJs = JSON.stringify(row.doc);
      }
      // activités : métadonnées seulement (les courbes viennent à la demande)
      const remote = [];
      for (let from = 0; ; from += 1000) {
        const { data, error: e3 } = await this.sb.from('cockpit_activities').select('id,doc').order('start_at', { ascending: false }).range(from, from + 999);
        if (e3) throw e3;
        remote.push(...data); if (data.length < 1000) break;
      }
      const local = new Map(S.activities.map(a => [a.id, a])), next = [];
      this.snap = {};
      for (const r of remote) {
        if (this.deleted.has(r.id)) continue;
        this.snap[r.id] = JSON.stringify(r.doc);
        const l = local.get(r.id);
        if (l && this.dirty && JSON.stringify(this.stripAct(l)) !== this.snap[r.id]) next.push(l);   // modif locale en attente
        else next.push(Object.assign({}, r.doc, l?.samples ? { samples: l.samples } : {}));
        if (l?.samples) this.smUp.add(r.id);
        local.delete(r.id);
      }
      for (const l of local.values()) if (this.dirty && !(l.id in this.snap)) next.push(l);   // créées hors ligne
      S.activities = next;
      await garminMerge();
      this.writeCache();
      if (this.dirty) await this.push(); else this.setState('ok');
    } catch (e) {
      console.warn('Lecture Supabase', e);
      this.setState('offline', 'Hors ligne : données de cet appareil affichées. ' + (e.message || ''));
    }
    render();
  },

  async samples(list) {
    const need = list.filter(a => a.samples === undefined && a.nSamples);
    for (let i = 0; i < need.length; i += 15) {
      const part = need.slice(i, i + 15);
      const { data, error } = await this.sb.from('cockpit_activities').select('id,samples').in('id', part.map(a => a.id));
      if (error) { console.warn(error); continue; }
      const m = new Map(data.map(r => [r.id, r.samples]));
      for (const a of part) { a.samples = m.get(a.id) || []; this.smUp.add(a.id); delete a._smReq; }
    }
  },

  async start() {
    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || !window.supabase) return false;
    this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cockpit-auth' } });
    const { data } = await this.sb.auth.getSession();
    if (!data.session) { showLogin(); return true; }
    await this.boot(data.session.user);
    return true;
  },

  async boot(user) {
    this.user = user; this.mode = 'cloud';
    document.getElementById('login').className = '';
    const c = this.readCache();
    if (c) {
      S = Object.assign(fresh(), c.doc, { activities: c.acts || [] });
      this.rev = c.rev || 0; this.dirty = !!c.dirty; this.snap = c.snap || {}; this.deleted = new Set(c.deleted || []);
      this.docJs = c.dirty ? null : JSON.stringify(c.doc); this.cachedBase = c.base || null;
    } else { S = fresh(); this.rev = 0; }
    render();
    await this.pull(true);
    if (!S.activities.length && !Object.keys(S.metrics).length) migrateLocalOffer();
    setInterval(() => { if (document.visibilityState === 'visible' && !this.dirty) this.pull(); }, 5 * 60000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !this.dirty) this.pull(); else if (this.dirty) this.push(); });
    window.addEventListener('online', () => this.dirty ? this.push() : this.pull());
  },

  async signOut(wipe) {
    if (this.dirty) await this.push();
    if (wipe) try { localStorage.removeItem(this.cacheKey()); } catch (e) { }
    await this.sb.auth.signOut();
    location.reload();
  }
};
const CLOUD_LABEL = { idle: 'Local', ok: 'Synchronisé', pending: 'Modifications en attente', sync: 'Synchronisation…', offline: 'Hors ligne' };

// Fusion à trois versions (base = dernière version synchronisée sur cet appareil) :
// une valeur modifiée seulement sur un appareil est conservée ; modifiée des deux côtés, la version locale gagne.
// Les listes d'objets identifiés (séances de muscu, adaptations, compétitions…) sont fusionnées élément par élément.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const isIdList = x => Array.isArray(x) && x.every(e => isObj(e) && 'id' in e);
function merge3(base, remote, local) {
  if (same(local, base)) return remote;
  if (same(remote, base) || same(remote, local)) return local;
  if (isObj(remote) && isObj(local)) {
    const o = {}, b = isObj(base) ? base : {};
    for (const k of new Set([...Object.keys(remote), ...Object.keys(local)])) {
      if (!(k in local)) { if (k in b && same(remote[k], b[k])) continue; o[k] = remote[k]; continue; }   // supprimé localement
      if (!(k in remote)) { if (k in b && same(local[k], b[k])) continue; o[k] = local[k]; continue; }   // supprimé ailleurs
      o[k] = merge3(b[k], remote[k], local[k]);
    }
    return o;
  }
  if (isIdList(remote) && isIdList(local)) {
    const bm = new Map(isIdList(base) ? base.map(x => [x.id, x]) : []), lm = new Map(local.map(x => [x.id, x])), out = [];
    for (const r of remote) {
      if (lm.has(r.id)) { out.push(merge3(bm.get(r.id), r, lm.get(r.id))); lm.delete(r.id); }
      else if (!bm.has(r.id) || !same(r, bm.get(r.id))) out.push(r);   // sinon : supprimé localement
    }
    for (const l of lm.values()) if (!bm.has(l.id) || !same(l, bm.get(l.id))) out.push(l);           // ajouté localement (ou modifié et supprimé ailleurs)
    return out;
  }
  return local;
}

// ===================== Écran de connexion =====================
function urlWarning() {
  const u = CFG.supabaseUrl || '';
  if (/\/(rest|auth)\/v\d/.test(u)) return `L'adresse dans config.js contient « ${u.replace(/^https?:\/\/[^/]+/, '')} » : elle doit s'arrêter à .supabase.co`;
  if (u && !/^https?:\/\//.test(u)) return 'L\'adresse dans config.js doit commencer par https://';
  if (/^sb_secret_|service_role/.test(CFG.supabaseAnonKey || '')) return 'config.js contient la clé service_role : utilise la clé anon (publishable).';
  return null;
}
function showLogin(err) {
  const el = document.getElementById('login'); el.className = 'on';
  const warn = urlWarning();
  el.innerHTML = `<div class="loginBox">
    <svg class="mark" viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round">
      <path d="M8 34a18 18 0 1 1 32 0"/><path d="M24 26l9-9" stroke="var(--mid)"/></svg>
    <h1>Cockpit</h1><div class="lede">Entraînement, récupération, musculation</div>
    <form id="loginForm">
      <div class="field"><label>E-mail</label><input type="email" name="email" autocomplete="username" required></div>
      <div class="field"><label>Mot de passe</label><input type="password" name="password" autocomplete="current-password" required></div>
      <button class="btn pri lg" type="submit">Se connecter</button>
      ${err ? `<div class="small danger" style="margin-top:12px">${esc(err)}</div>` : ''}
      ${warn ? `<div class="small warnTx" style="margin-top:12px">${esc(warn)}</div>` : ''}
    </form>
    <div class="meta" style="margin-top:18px">Un seul compte, créé dans Supabase. Les étapes sont dans le README du dépôt.</div></div>`;
  document.getElementById('loginForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), btn = ev.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Connexion…';
    let data, error;
    try { ({ data, error } = await Cloud.sb.auth.signInWithPassword({ email: f.get('email').trim(), password: f.get('password') })); }
    catch (e) { error = e; }
    if (error) {
      const code = error.code || '', st = error.status;
      if (code === 'invalid_credentials' || (st === 400 && /invalid login/i.test(error.message || ''))) return showLogin('E-mail ou mot de passe incorrect.');
      if (code === 'email_not_confirmed') return showLogin('Cet e-mail n\'est pas confirmé : dans Supabase, Authentication › Users, coche « Auto Confirm User ».');
      if (st === 404) return showLogin(`Serveur d'authentification introuvable (404). Vérifie « supabaseUrl » dans config.js : l'adresse doit s'arrêter à .supabase.co, sans /rest/v1. Adresse utilisée : ${CFG.supabaseUrl}`);
      if (st === 401 || code === 'invalid_api_key' || /api key/i.test(error.message || '')) return showLogin('Clé Supabase refusée : vérifie « supabaseAnonKey » dans config.js (clé anon ou publishable, pas la clé service_role).');
      if (st === 429 || code === 'over_request_rate_limit') return showLogin('Trop de tentatives : réessaie dans quelques minutes.');
      if (!st) return showLogin(`Serveur Supabase injoignable (${error.message || 'pas de réponse'}). Vérifie ta connexion et « supabaseUrl » dans config.js : ${CFG.supabaseUrl}`);
      return showLogin(`Erreur ${st} : ${error.message}`);
    }
    await Cloud.boot(data.user);
  });
}

// Données créées dans l'aperçu local (même navigateur) : proposer de les envoyer dans le compte
function migrateLocalOffer() {
  let old = null; try { old = JSON.parse(localStorage.getItem('cockpit-local-v1') || localStorage.getItem('cockpit-apercu-v1') || 'null'); } catch (e) { }
  if (!old || !(old.activities?.length || Object.keys(old.metrics || {}).length)) return;
  if (!confirm('Des données Cockpit existent déjà dans ce navigateur (mode local). Les envoyer dans ton compte ?')) return;
  S = Object.assign(fresh(), old); save(); render(); toast('Données envoyées dans ton compte');
}
