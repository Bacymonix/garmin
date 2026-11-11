'use strict';
// ===================== Écrans =====================

const ICONS = {
  today: '<path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  forme: '<path d="M3 16l4-6 4 4 3-7 3 5 4-3"/>',
  season: '<path d="M6 3v8a6 6 0 0 0 12 0V3z"/><path d="M9 21h6M12 17v4M18 5h2a3 3 0 0 1-3 3M6 5H4a3 3 0 0 0 3 3"/>',
  muscu: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.3 2.4 2.7-.5.4 2.7 2.4 1.3-1.4 2.4 1.4 2.4-2.4 1.3-.4 2.7-2.7-.5L12 21.5l-1.3-2.4-2.7.5-.4-2.7-2.4-1.3 1.4-2.4-1.4-2.4 2.4-1.3.4-2.7 2.7.5z"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', back: '<path d="M15 6l-6 6 6 6"/>',
  strength: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
  mobility: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v6M7 10l5 2 5-2M9 21l3-8 3 8"/>',
  run: '<circle cx="14" cy="4.5" r="2"/><path d="M13 8l-3 3 2 3 1 5M10 11L6 13M15 14l4 2"/>',
  trailRun: '<path d="M3 19l6-9 3.5 5M10 19l5-8 6 8z"/>',
  track: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  treadmill: '<path d="M4 18h10a4 4 0 0 0 4-4V6"/><circle cx="9" cy="5" r="2"/><path d="M8 8l-3 3 3 2 1 4"/>',
  bike: '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5M9 9h5l3 8"/>',
  crossTraining: '<path d="M4 20l5-7 3 3 3-5 5 9z"/><circle cx="9" cy="6" r="2"/>',
  walk: '<circle cx="13" cy="4.5" r="2"/><path d="M13 7l-2 4 3 3 1 6M11 11l-3 2-1 5"/>',
  rest: '<path d="M20 14a8 8 0 1 1-9-9 7 7 0 0 0 9 9z"/>',
  race: '<path d="M5 21V4M5 5h13l-3 4 3 4H5"/>',
  heart: '<path d="M12 20s-7-4.6-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.4 12 20 12 20z"/>',
  moon: '<path d="M20 14a8 8 0 1 1-9-9 7 7 0 0 0 9 9z"/>',
  wave: '<path d="M3 12c2.5-6 4.5-6 7 0s4.5 6 7 0"/><path d="M3 17c2.5-4 4.5-4 7 0s4.5 4 7 0"/>',
  gauge: '<path d="M4.5 18a9 9 0 1 1 15 0"/><path d="M12 14l4-4"/>',
  sync: '<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 16M4 20v-4h4"/>',
  download: '<path d="M12 4v11M8 11l4 4 4-4M4 19h16"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/>',
  flag: '<path d="M5 21V4M5 5h13l-3 4 3 4H5"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M4 12.5l5 5L20 7"/>', play: '<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor" stroke="none"/>',
  tune: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  alert: '<path d="M12 8v5M12 16.5v.5"/><path d="M10.3 4l-7 12A2 2 0 0 0 5 19h14a2 2 0 0 0 1.7-3l-7-12a2 2 0 0 0-3.4 0z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.5"/>'
};
const ic = (n, s = 20, w = 1.7) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

const TABS = [['today', 'Aujourd\'hui'], ['plan', 'Programme'], ['muscu', 'Muscu'], ['forme', 'Forme'], ['settings', 'Réglages']];
const KCOL = { strength: 'var(--deep)', mobility: '#B393F5', run: 'var(--accent)', trailRun: 'var(--good)', track: 'var(--accent)', treadmill: 'var(--accent)', bike: '#8FB4D9', crossTraining: '#8FB4D9', walk: '#8FB4D9', rest: 'var(--faint)', race: 'var(--mid)' };
const SCOL = { completed: 'var(--good)', partial: 'var(--accent)', modified: 'var(--accent)', postponed: 'var(--mid)', cancelledVoluntarily: 'var(--mid)', skippedForRecovery: 'var(--mid)', missedNoReason: 'var(--low)', planned: 'var(--faint)', deleted: 'var(--faint)' };

// ===================== Rendu =====================
function render() {
  const tb = document.getElementById('tabbar');
  if (!tb.children.length) {
    tb.innerHTML = TABS.map(([k, l]) => `<button data-tab="${k}">${ic(k, 23, 1.6)}${l}</button>`).join('');
    tb.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { if (ui.tab === b.dataset.tab) { document.getElementById('view').scrollTo({ top: 0 }); return; } ui.tab = b.dataset.tab; ui.stack = []; render(); document.getElementById('view').scrollTop = 0; }));
  }
  tb.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  const v = document.getElementById('view'), y = v.scrollTop;
  v.innerHTML = VIEWS[ui.tab]();
  v.scrollTop = y;
  renderModal(); renderWorkout();
  const sb = document.getElementById('simbar');
  sb.innerHTML = S.simDate ? `Date simulée : <b>${D.long(S.simDate)}</b> — <a data-a="simReset">revenir à aujourd'hui</a>` : '';
  sb.style.display = S.simDate ? 'block' : 'none';
}
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(ui.toastT); ui.toastT = setTimeout(() => t.classList.remove('on'), 3400); }
function push(type, data = {}) { ui.stack.push(Object.assign({ type }, data)); render(); }
function pop() { ui.stack.pop(); render(); }
function renderModal() {
  const m = document.getElementById('sheet'), top = ui.stack[ui.stack.length - 1];
  if (!top) { m.className = ''; m.innerHTML = ''; return; }
  const r = MODALS[top.type](top);
  m.className = 'on';
  const y = m.querySelector('.sheetBody')?.scrollTop || 0;
  m.innerHTML = `<div class="sheetBox"><div class="sheetHead"><button class="link" data-a="pop">${ui.stack.length > 1 ? ic('back', 18) + ' Retour' : 'Fermer'}</button><b>${esc(r.title)}</b><span>${r.action || ''}</span></div><div class="sheetBody">${r.body}</div></div>`;
  if (top.keepScroll) m.querySelector('.sheetBody').scrollTop = y;
}
const modalRoot = () => document.getElementById('sheet');

// ===================== Briques =====================
const sec = (t, trail = '') => `<div class="band"><h3>${esc(t)}</h3>${trail ? `<span class="meta">${esc(trail)}</span>` : ''}</div>`;
const badge = (t, c = 'var(--accent)') => `<span class="pill" style="--c:${c}">${esc(t)}</span>`;
const hint = t => `<div class="empty">${t}</div>`;
const tile = (title, value, unit = '', detail = '', color = '', prov = '') =>
  `<div class="tile"><div class="tt">${esc(title)}</div><div class="tv" style="${color ? 'color:' + color : ''}">${value}${unit ? `<small>${esc(unit)}</small>` : ''}</div>${detail ? `<div class="td">${esc(detail)}</div>` : ''}${prov ? `<div class="tp">${esc(prov)}</div>` : ''}</div>`;
const chev = `<span class="chev">${ic('chev', 18)}</span>`;
const row = (icon, label, action, extra = '', attrs = '') => `<div class="li" data-a="${action}" ${attrs}>${icon ? `<span class="ic">${ic(icon)}</span>` : ''}<span class="grow">${label}</span>${extra}${chev}</div>`;

// Loi normale centrée réduite : part des journées habituelles situées en dessous de z
function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
const bandOf = v => v >= 67 ? 'good' : v >= 34 ? 'mid' : 'low';
const BAND_WORD = { good: 'Prêt', mid: 'Moyen', low: 'En dessous' };
const bandColor = b => `var(--${b})`;

function arc(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

// Jauge de récupération : part des journées habituelles sous laquelle se situe aujourd'hui
function gauge(d) {
  const A0 = 150, SWEEP = 240, R = 118, CX = 150, CY = 150;
  const val = d.comp == null ? null : Math.round(phi(d.comp) * 100);
  const b = val == null ? 'faint' : bandOf(val);
  const len = Math.PI * R * SWEEP / 180;
  return `<div class="gauge">
    <svg viewBox="0 0 300 212" role="img" aria-label="Récupération ${val ?? 'non calculée'} sur 100">
      <path d="${arc(CX, CY, R, A0, A0 + SWEEP)}" stroke="var(--panel2)" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="${arc(CX, CY, R, A0 + SWEEP / 2 - 0.5, A0 + SWEEP / 2 + 0.5)}" stroke="var(--faint)" stroke-width="22" fill="none"/>
      ${val == null ? '' : `<path d="${arc(CX, CY, R, A0, A0 + SWEEP * Math.max(0.004, val / 100))}" stroke="${bandColor(b)}" stroke-width="14" fill="none" stroke-linecap="round"
        style="stroke-dasharray:${len.toFixed(0)};animation:sweep .9s cubic-bezier(.2,.8,.3,1) both"/>`}
      <text x="150" y="112" text-anchor="middle" fill="var(--dim)" style="font-size:14px">Récupération</text>
      <text x="150" y="170" text-anchor="middle" fill="${val == null ? 'var(--faint)' : bandColor(b)}"
        style="font-size:62px;font-stretch:112%;font-weight:600;letter-spacing:-.03em">${val ?? '–'}</text>
      <text x="150" y="198" text-anchor="middle" fill="var(--text)" style="font-size:17px;font-weight:620">${val == null ? 'à construire' : BAND_WORD[b]}</text>
      <style>@keyframes sweep{from{stroke-dashoffset:${len.toFixed(0)}}to{stroke-dashoffset:0}}</style>
    </svg>
    <div class="legs">${recoveryLegs(d).map(l => `<span class="leg"><i class="${l.st ? '' : 'off'}" style="--c:${l.st ? bandColor(l.st) : ''}"></i>${esc(l.name)}</span>`).join('')}</div>
  </div>`;
}
function recoveryLegs(d) {
  const st = (z, good) => z == null ? null : (good ? z : -z) >= 0.5 ? 'good' : (good ? z : -z) <= -0.5 ? 'low' : 'mid';
  const w = S.wellness[d.day] || {};
  const feel = [w.fatigue, w.soreness, w.stress].filter(x => x != null);
  const sleepRatio = d.lastNight ? d.lastNight.sleepMin / 60 / (S.profile.sleepNeed || 8) : null;
  return [
    { name: 'Sommeil', st: sleepRatio == null ? null : sleepRatio >= .95 ? 'good' : sleepRatio >= .82 ? 'mid' : 'low' },
    { name: 'VFC', st: st(d.hT?.z, true) },
    { name: 'FC repos', st: st(d.rT?.z, false) },
    { name: 'Ressenti', st: !feel.length ? null : St.mean(feel) <= 3 ? 'good' : St.mean(feel) <= 4.5 ? 'mid' : 'low' }
  ];
}

// Mini-courbe
function spark(pts, color = 'var(--accent)') {
  if (pts.length < 2) return '';
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const X = x => (x - x0) / ((x1 - x0) || 1) * 86 + 2, Y = y => 22 - (y - y0) / ((y1 - y0) || 1) * 18;
  const line = pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 90 26"><polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/><circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="2.4" fill="${color}"/></svg>`;
}

// Graphique : bandes de relief, crête fine
function chart({ series = [], bars = null, band = null, rule = null, h = 170, yMin = null, yMax = null, ruleLabel = '', xFmt = null }) {
  const W = 400, H = h, pl = 30, pr = 8, pt = 10, pb = 18;
  const all = [...series.flatMap(s => s.pts), ...(bars ? bars.pts : []), ...(band ? band.flatMap(b => [[b[0], b[1]], [b[0], b[2]]]) : [])];
  if (!all.length) return '';
  const xs = all.map(p => p[0]); let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 1; x1 += 1; }
  const ys = all.map(p => p[1]).concat(rule != null ? [rule] : []);
  let y0 = yMin ?? Math.min(...ys), y1 = yMax ?? Math.max(...ys);
  if (bars && yMin == null) y0 = Math.min(0, y0);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  if (yMin == null && !bars) y0 -= (y1 - y0) * .08;
  if (yMax == null) y1 += (y1 - y0) * .08;
  const X = x => pl + (x - x0) / (x1 - x0) * (W - pl - pr), Y = y => pt + (1 - (y - y0) / (y1 - y0)) * (H - pt - pb);
  const uid2 = 'g' + Math.random().toString(36).slice(2, 7);
  let defs = '', g = '';
  const span = y1 - y0, dec = span >= 50 ? 0 : span >= 5 ? 1 : span >= 0.5 ? 2 : 3;
  for (let k = 0; k <= 2; k++) {
    const v = y0 + span * k / 2;
    g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="grid" stroke-width="1"/>
      <text x="${pl - 6}" y="${(Y(v) + 3.5).toFixed(1)}" class="ax" text-anchor="end">${fx(v, dec)}</text>`;
  }
  const fmtX = xFmt || (x => D.short(D.iso(x)));
  g += `<text x="${pl}" y="${H - 4}" class="ax">${esc(fmtX(x0))}</text><text x="${W - pr}" y="${H - 4}" class="ax" text-anchor="end">${esc(fmtX(x1))}</text>`;
  if (band) g += `<path d="M${band.map(b => `${X(b[0]).toFixed(1)},${Y(b[2]).toFixed(1)}`).join('L')}L${[...band].reverse().map(b => `${X(b[0]).toFixed(1)},${Y(b[1]).toFixed(1)}`).join('L')}Z" fill="var(--accent)" opacity=".12"/>`;
  if (bars) {
    const bw = Math.max(1.6, (W - pl - pr) / Math.max(1, x1 - x0 + 1) * .66);
    g += bars.pts.map(p => `<rect x="${(X(p[0]) - bw / 2).toFixed(1)}" y="${Y(Math.max(0, p[1])).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(Y(0) - Y(p[1]))).toFixed(1)}" fill="${p[2] || bars.color}" rx="1.5"/>`).join('');
  }
  if (rule != null) {
    g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(rule).toFixed(1)}" y2="${Y(rule).toFixed(1)}" stroke="var(--mid)" stroke-dasharray="3 5" stroke-width="1"/>`;
    if (ruleLabel) g += `<text x="${W - pr}" y="${(Y(rule) - 5).toFixed(1)}" class="ax" text-anchor="end" fill="var(--mid)">${esc(ruleLabel)}</text>`;
  }
  series.forEach((s, i) => {
    const d = s.pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('L');
    if (s.fill && s.pts.length > 1) {
      defs += `<linearGradient id="${uid2}${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".34"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`;
      g += `<path d="M${d}L${X(s.pts[s.pts.length - 1][0]).toFixed(1)},${Y(y0).toFixed(1)}L${X(s.pts[0][0]).toFixed(1)},${Y(y0).toFixed(1)}Z" fill="url(#${uid2}${i})"/>`;
    }
    if (s.line !== false && s.pts.length > 1) g += `<path d="M${d}" fill="none" stroke="${s.color}" stroke-width="${s.w || 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.dots) g += s.pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="${s.r || 2.4}" fill="${s.color}" opacity="${s.dotOp || 1}"/>`).join('');
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart"><defs>${defs}</defs>${g}</svg>`;
}
const legend = items => `<div class="legend">${items.map(([c, l]) => `<span><i style="--c:${c}"></i>${esc(l)}</span>`).join('')}</div>`;

// Carte de séance
function sessionCard(s, status, act, compact = false) {
  const t = s.t, bits = [];
  if (t.dur) bits.push(rng(t.dur, 'min'));
  if (t.kind === 'strength') bits.push(t.blocks.reduce((n, b) => n + b.ex.length, 0) + ' exercices');
  else { const iv = t.blocks.flatMap(b => b.iv)[0]; if (iv) bits.push(ivText(iv)); else if (t.obj) bits.push(t.obj); }
  const done = ['completed', 'partial', 'modified'].includes(status);
  return `<div class="sess" data-a="openSession" data-id="${esc(s.id)}" tabindex="0" style="--c:${KCOL[t.kind]}">
    <i class="sessRail"></i>
    <div class="sessBody">
      <div class="sessWhen">${LABELS.slot[s.slot]}${s.light ? ' · allégée' : ''}</div>
      <div class="sessTitle"><span class="ic">${ic(t.kind, 19)}</span><span class="grow">${esc(t.title.replace(' · allégée', ''))}</span>${done ? `<span style="color:var(--good);flex:none">${ic('check', 17, 2.2)}</span>` : ''}</div>
      ${compact ? '' : `<div class="sessWhat">${esc(bits.join(' — '))}</div>`}
      ${s.cond && !compact ? `<div class="sessCond">${esc(s.cond)}</div>` : ''}
      <div class="wrap" style="margin-top:7px">
        ${!done && status !== 'planned' ? badge(LABELS.status[status], SCOL[status]) : ''}
        ${s.opt ? badge('Facultative', 'var(--faint)') : ''}${s.deload ? badge('Allègement', 'var(--accent)') : ''}${s.eventId ? badge('Compétition', 'var(--mid)') : ''}
        ${act ? `<span class="meta">${fmtMin((act.timer || act.elapsed) / 60)}${act.dist ? ' · ' + fx(act.dist / 1000, 1) + ' km' : ''}${act.up ? ' · D+ ' + Math.round(act.up) + ' m' : ''}</span>` : ''}
      </div>
    </div></div>`;
}
function obsList(list) {
  if (!list.length) return hint('Rien à signaler avec les données disponibles.');
  return list.map(o => `<div class="card"><div class="row top">
    <span style="color:${o.lvl === 'attention' ? 'var(--mid)' : 'var(--dim)'};flex:none;display:flex">${ic(o.lvl === 'attention' ? 'alert' : 'info', 19)}</span>
    <div class="grow"><div>${esc(o.msg)}</div>
      <div class="wrap" style="margin-top:6px">${badge(o.cat, 'var(--faint)')}<span class="meta">confiance ${LABELS.conf[o.conf].toLowerCase()}</span></div>
      ${Object.keys(o.ind).length ? `<details><summary>Ce qui a été regardé</summary>${Object.entries(o.ind).map(([k, v]) => `<div class="kv tiny"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</details>` : ''}
    </div></div></div>`).join('');
}
function actRow(a) {
  const st = { validate: 'À valider', ignored: 'Non associée' }[a.linkState];
  return `<div class="li" data-a="activity" data-id="${esc(a.id)}"><span class="ic">${ic(SPORT_ICON[a.sport] || 'run')}</span>
    <div class="grow"><div>${LABELS.sport[a.sport]}<span class="meta"> — ${new Date(a.start).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
    <div class="meta">${[fmtMin((a.timer || a.elapsed) / 60), a.dist ? fx(a.dist / 1000, 2) + ' km' : '', a.up ? 'D+ ' + Math.round(a.up) + ' m' : '', a.trimp != null ? 'TRIMP ' + Math.round(a.trimp) : ''].filter(Boolean).join(' · ')}</div></div>
    ${st ? badge(st, 'var(--mid)') : ''}${chev}</div>`;
}
const SPORT_ICON = { running: 'run', trailRunning: 'trailRun', trackRunning: 'track', treadmillRunning: 'treadmill', walking: 'walk', hiking: 'crossTraining', cycling: 'bike', indoorCycling: 'bike', strengthTraining: 'strength', mobility: 'mobility' };

// ===================== Aujourd'hui =====================
function viewToday() {
  const day = today(), d = dash(day), ph = Plan.phase(day), sessions = Plan.sessions(day);
  const lm = linkedMap(), lk = new Set(Object.keys(lm));
  const checked = !!S.wellness[day];
  const t = d.trimpStates[d.trimpStates.length - 1];
  const empty = !S.activities.length && !Object.keys(S.metrics).length;
  const next = d.upcoming[0], kDays = next ? Math.max(0, D.diff(day, next.start)) : null;
  return `
  <div class="screenTop">
    <div><div class="meta">${D.long(day)}</div><h1>${esc(greet())}</h1></div>
    <div class="sync" data-a="syncNow"><span class="dot" data-st="${typeof Cloud !== 'undefined' ? Cloud.state : 'idle'}"></span></div>
  </div>
  ${empty ? `<div class="card demo"><b>Rien à afficher pour l'instant.</b><div class="lede">Connecte Garmin dans Réglages, ou remplis l'app avec 90 jours de données fictives pour voir à quoi elle ressemble.</div>
    <button class="btn pri" data-a="demo">Générer des données de démo</button></div>` : ''}

  ${verdictCard(d)}
  ${gauge(d)}
  <div class="note tight">${esc(gaugeNote(d))}</div>

  <div class="band"><h3>Ce matin</h3><a class="meta" data-a="forme">Tout voir</a></div>
  <div class="metrics">
    ${metricRow(d, 'sleep')}
    ${metricRow(d, 'hrv')}
    ${metricRow(d, 'rhr')}
  </div>
  <button class="btn ${checked ? 'ghost' : 'pri'} full" data-a="checkin">${checked ? 'Modifier mon check-in' : 'Faire mon check-in'}</button>

  <div class="band"><h3>Séances du jour</h3>${ph ? `<span class="meta">${esc(ph.name)}</span>` : ''}</div>
  ${sessions.length ? sessions.map(s => {
    const st = effectiveStatus(s, lk, day), done = ['completed', 'partial', 'modified'].includes(st);
    const acts = [];
    if ((s.t.kind === 'strength' || s.t.kind === 'mobility') && !done) acts.push(`<button class="btn pri sm" data-a="startWorkout" data-tpl="${s.t.id}" data-key="${esc(s.id)}">${ic('play', 15)} Démarrer</button>`);
    if (s.t.kind === 'rest' && !done) acts.push(`<button class="btn sm" data-a="restDone" data-key="${esc(s.id)}">Repos pris</button>`);
    if (!done && s.t.kind !== 'rest' && !s.eventId) acts.push(`<button class="btn ghost sm" data-a="adapt" data-key="${esc(s.id)}">Adapter</button>`);
    return sessionCard(s, st, lm[s.id]) + (acts.length ? `<div class="sessActs">${acts.join('')}</div>` : '');
  }).join('') : hint('Aucune séance prévue aujourd\'hui.')}

  ${d.obs.length ? `<div class="band"><h3>À savoir</h3></div>${obsList(d.obs)}` : ''}

  <div class="band"><h3>Charge</h3><a class="meta" data-a="forme">Détail</a></div>
  ${chargeCard(d, t)}

  ${next ? `<div class="band"><h3>Prochaine échéance</h3></div>
    <div class="card" data-a="editEvent" data-id="${next.id}" style="cursor:pointer">
      <div class="row top"><div class="grow"><h2>${esc(next.name)}</h2><div class="lede">${D.long(next.start)}${next.end > next.start ? ` → ${D.short(next.end)}` : ''}</div>
        <div class="wrap" style="margin-top:8px">${badge(LABELS.evStatus[next.status], PROVISIONAL.has(next.status) ? 'var(--mid)' : 'var(--good)')}${next.priority ? badge(LABELS.priority[next.priority], 'var(--accent)') : ''}${next.distanceKm ? badge(fx(next.distanceKm, next.distanceKm < 30 ? 1 : 0) + ' km', 'var(--faint)') : ''}</div></div>
        <div style="text-align:right"><div class="num" style="font-size:30px">${kDays === 0 ? 'Auj.' : kDays}</div>${kDays ? '<div class="meta">jours</div>' : ''}</div></div></div>` : ''}

  ${nutritionCard(d)}`;
}
function greet() {
  const h = new Date().getHours();
  return h < 5 ? 'Bonne nuit' : h < 11 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
}
function gaugeNote(d) {
  if (d.comp == null) return 'Encore trop peu de mesures : il faut environ deux semaines de check-ins ou de nuits enregistrées pour situer une journée par rapport à tes habitudes.';
  const v = Math.round(phi(d.comp) * 100), n = d.compN;
  return `Cette journée est meilleure que ${v} % de tes journées habituelles, d'après ${n} signa${n > 1 ? 'ux' : 'l'} comparé${n > 1 ? 's' : ''} à ta propre référence. 50 est une journée ordinaire. Ce n'est pas une mesure physiologique.`;
}
function metricRow(d, kind) {
  const day = d.day, m = S.metrics[day] || {};
  if (kind === 'sleep') {
    const n = d.lastNight, need = S.profile.sleepNeed || 8;
    const pts = D.range(D.add(day, -13), day).map(x => S.metrics[x]?.sleepMin ? [D.num(x), S.metrics[x].sleepMin] : null).filter(Boolean);
    const ratio = n ? n.sleepMin / 60 / need : null;
    const sc = sleepScore(day);
    return `<div class="metric" data-a="sleepDetail">
      <div><div class="metricName">Sommeil</div><div class="state">${sc ? `<b style="color:${SLEEP_COL(sc.score)}">${sc.score}/100</b> — ${SLEEP_WORD(sc.score).toLowerCase()}` : n ? (ratio >= .95 ? 'Besoin couvert' : `${fx((need - n.sleepMin / 60), 1)} h sous ton besoin`) : 'Nuit non renseignée'}</div></div>
      <div class="row" style="gap:12px">${spark(pts, 'var(--deep)')}<div class="metricVal">${n ? `${Math.floor(n.sleepMin / 60)}<small>h</small>${p2(Math.round(n.sleepMin % 60))}` : '–'}</div></div></div>`;
  }
  if (kind === 'hrv') {
    const h = d.hT, pts = d.hrv.filter(x => x.date >= D.add(day, -13)).map(x => [D.num(x.date), x.value]);
    const col = h?.trendStatus === 'above' ? 'var(--good)' : h?.trendStatus === 'below' ? 'var(--mid)' : 'var(--accent)';
    return `<div class="metric" data-a="hrvDetail">
      <div><div class="metricName">Variabilité cardiaque</div><div class="state">${h ? (h.z == null ? 'Référence en construction' : BASE_LABEL[h.trendStatus]) : 'Pas de mesure ce matin'}${m.hrvProv === 'garmin' ? ' · Garmin' : ''}</div></div>
      <div class="row" style="gap:12px">${spark(pts, col)}<div class="metricVal">${h ? Math.round(h.value) : '–'}<small>ms</small></div></div></div>`;
  }
  const r = d.rT, pts = d.rhr.filter(x => x.date >= D.add(day, -13)).map(x => [D.num(x.date), x.value]);
  const col = r?.status === 'below' ? 'var(--good)' : r?.status === 'above' ? 'var(--mid)' : 'var(--accent)';
  return `<div class="metric" data-a="rhrDetail">
    <div><div class="metricName">Fréquence au repos</div><div class="state">${r ? (r.z == null ? 'Référence en construction' : BASE_LABEL[r.status]) : 'Pas de mesure'}${m.rhrProv === 'garmin' ? ' · Garmin' : ''}</div></div>
    <div class="row" style="gap:12px">${spark(pts, col)}<div class="metricVal">${r ? Math.round(r.value) : '–'}<small>bpm</small></div></div></div>`;
}
function chargeCard(d, t) {
  if (!t || (!t.ctl && !t.atl)) return hint('La charge apparaîtra dès que des activités avec fréquence cardiaque seront importées.');
  const tsb = t.tsb, lo = -35, hi = 30, pos = Math.max(0, Math.min(1, (tsb - lo) / (hi - lo)));
  const word = tsb < -20 ? 'Charge lourde' : tsb < -8 ? 'En construction' : tsb < 8 ? 'Équilibré' : 'Frais';
  return `<div class="card">
    <div class="row"><div><div class="metricName">${word}</div><div class="meta">écart entre fatigue récente et fond (TSB ${fx(tsb, 1)})</div></div>
      <div class="num" style="font-size:26px;color:${tsb < -20 ? 'var(--mid)' : 'var(--text)'}">${tsb > 0 ? '+' : ''}${Math.round(tsb)}</div></div>
    <div class="scaleBar">
      <div class="zone" style="left:0;width:33%;background:color-mix(in srgb,var(--mid) 45%,transparent)"></div>
      <div class="zone" style="left:33%;width:34%;background:color-mix(in srgb,var(--good) 45%,transparent)"></div>
      <div class="zone" style="left:67%;width:33%;background:color-mix(in srgb,var(--accent) 40%,transparent)"></div>
      <div class="mark" style="left:calc(${(pos * 100).toFixed(1)}% - 1.5px)"></div></div>
    <div class="scaleTicks"><span>charge lourde</span><span>équilibre</span><span>frais</span></div>
    <div class="kv" style="margin-top:12px"><span>Fond (CTL, 42 j)</span><b>${Math.round(t.ctl)}</b></div>
    <div class="kv"><span>Fatigue récente (ATL, 7 j)</span><b>${Math.round(t.atl)}</b></div>
    <div class="kv"><span>Course et trail, 7 jours</span><b>${fx(d.m7.km, 1)} km · D+ ${Math.round(d.m7.up)} m</b></div>
    ${t.initW > 0.37 ? '<div class="note tight">Historique encore court : ces valeurs se stabiliseront avec les semaines.</div>' : ''}
  </div>`;
}
function nutritionCard(d) {
  if (!d.lastW) return '';
  const c = CARB[d.cat].map(x => x * d.lastW);
  return `<div class="band"><h3>Repères du jour</h3><span class="meta">journée ${CARB_LABEL[d.cat]}</span></div>
  <div class="card">
    <div class="kv"><span>Glucides</span><b>${Math.round(c[0])}–${Math.round(c[1])} g</b></div>
    <div class="kv"><span>Protéines</span><b>${Math.round(1.8 * d.lastW)}–${Math.round(2.2 * d.lastW)} g</b></div>
    <div class="kv"><span>Lipides, au moins</span><b>${Math.round(0.8 * d.lastW)} g</b></div>
    ${d.tdee ? `<div class="kv"><span>Dépense observée sur 21 jours</span><b>${Math.round(d.tdee.tdee)} kcal</b></div>` : d.bmr ? `<div class="kv"><span>Métabolisme de repos estimé</span><b>${Math.round(d.bmr)} kcal</b></div>` : ''}
    <div class="note tight">Fourchettes d'après le volume d'endurance prévu aujourd'hui (Burke et al., 2011), à ajuster selon ton appétit et ton poids.</div>
  </div>`;
}

// ===================== Programme =====================
function viewPlan() {
  const start = D.add(D.monday(today()), 7 * ui.week), days = D.range(start, D.add(start, 6)), mid = D.add(start, 3);
  const ph = Plan.phase(mid) || Plan.phase(start), lm = linkedMap(), lk = new Set(Object.keys(lm)), day = today();
  let pMin = 0, pN = 0;
  for (const dd of days) for (const s of Plan.sessions(dd)) if (isEndurance(s.t.kind)) { pN++; if (s.t.dur) pMin += (s.t.dur[0] + s.t.dur[1]) / 2; }
  const acts = S.activities.filter(a => { const dd = D.ofTime(a.start); return dd >= start && dd <= days[6]; });
  const foot = acts.filter(a => ['running', 'trailRunning', 'trackRunning', 'treadmillRunning', 'walking', 'hiking'].includes(a.sport));
  const strengthDone = S.strength.filter(s => { const dd = D.ofTime(s.start); return dd >= start && dd <= days[6]; }).length;
  return `<div class="screenTop"><div><div class="meta">${ui.week === 0 ? 'Cette semaine' : D.short(start) + ' — ' + D.short(days[6])}</div><h1>Programme</h1></div>
    <div class="row" style="gap:6px"><button class="iconBtn" data-a="week" data-d="-1" aria-label="Semaine précédente">${ic('back', 18)}</button>
      <button class="iconBtn" data-a="week" data-d="1" aria-label="Semaine suivante">${ic('chev', 18)}</button></div></div>
  <div class="wrap">${ph ? badge(ph.name) : badge('Hors saison', 'var(--faint)')}${badge(Plan.variant(mid) === 'b' ? 'Semaine B' : 'Semaine A', 'var(--deep)')}${Plan.deload(mid) ? badge('Allègement suggéré', 'var(--mid)') : ''}${ui.week !== 0 ? `<a class="meta" data-a="week" data-d="0">Revenir à cette semaine</a>` : ''}</div>
  ${ph ? `<div class="note tight">${esc(ph.obj)}</div>` : ''}

  <div class="pair" style="margin-top:16px">
    ${tile('Endurance prévue', fmtMin(pMin), '', `${pN} séance${pN > 1 ? 's' : ''}`)}
    ${tile('Réalisé', fx(foot.reduce((s, a) => s + (a.dist || 0), 0) / 1000, 1), 'km', `D+ ${Math.round(foot.reduce((s, a) => s + (a.up || 0), 0))} m · ${strengthDone} muscu`)}
  </div>

  ${days.map(dd => {
    const ss = Plan.sessions(dd), isToday = dd === day;
    return `<div class="band" style="margin-bottom:6px"><h3 style="${isToday ? 'color:var(--accent)' : ''}">${D.wdLabel(dd)} ${Number(dd.slice(8))}</h3>${isToday ? '<span class="meta">aujourd\'hui</span>' : ''}</div>
      ${ss.length ? ss.map(s => sessionCard(s, effectiveStatus(s, lk, day), lm[s.id], true)).join('') : '<div class="meta" style="padding:2px 2px 6px">Rien de prévu</div>'}`;
  }).join('')}

  <div class="rule"></div>
  <div class="list">
    ${row('calendar', 'Phases de la saison', 'phases')}
    ${ph ? row('tune', 'Modifier la semaine type', 'weekEdit', S.weekEdits?.[ph.week] ? badge('modifiée', 'var(--accent)') : '', `data-w="${ph.week}"`) : ''}
    ${row('season', 'Saison et compétitions', 'season')}
    ${row('clock', 'Se placer à une autre date', 'jump')}
  </div>`;
}

// ===================== Forme =====================
const KEY_LIFTS = ['pullup_pronated', 'bench_press', 'row_barbell_db', 'standing_military_press', 'bulgarian_split_squat', 'single_leg_rdl'];
function e1rmSeries(exId) {
  const out = [];
  for (const s of [...S.strength].sort((a, b) => a.start - b.start)) {
    const best = s.sets.filter(x => x.ex === exId && !x.warm && x.load > 0).map(x => Str.estimate(x.load, x.reps, x.rir, S.profile.formula)).filter(Boolean).sort((a, b) => b.value - a.value)[0];
    if (best) out.push([D.num(D.ofTime(s.start)), best.value]);
  }
  return out;
}
function viewForme() {
  const day = today(), d = dash(day), lib = LIB();
  const t = d.trimpStates.filter(x => x.date >= D.add(day, -90));
  const vol = d.vol, ms = Object.keys(vol).sort((a, b) => vol[b].direct - vol[a].direct).slice(0, 6);
  const nights = D.range(D.add(day, -13), day).map(x => S.metrics[x]).filter(m => m?.sleepMin);
  const need = S.profile.sleepNeed || 8;
  return `<div class="screenTop"><div><div class="meta">90 derniers jours</div><h1>Forme</h1></div></div>
  ${garminStrip()}
  ${dailyCard(day)}

  <div class="band"><h3>Récupération</h3><a class="meta" data-a="trends">Courbes</a></div>
  <div class="card" data-a="sleepDetail" style="cursor:pointer">
    <div class="row"><div><div class="metricName">Sommeil</div><div class="meta">${nights.length} nuit${nights.length > 1 ? 's' : ''} mesurée${nights.length > 1 ? 's' : ''} sur 14 · besoin ${fx(need, 1)} h</div></div>
      <div style="text-align:right">${(() => { const sc = sleepScore(day); return sc ? `<div class="num" style="font-size:24px;color:${SLEEP_COL(sc.score)}">${sc.score}<small style="font-size:13px;color:var(--dim)"> /100</small></div>` : `<div class="num" style="font-size:24px">${nights.length ? fx(St.mean(nights.map(n => n.sleepMin)) / 60, 1) : '–'}<small style="font-size:13px;color:var(--dim)"> h</small></div>`; })()}</div></div>
    ${sleepBars(day, need)}
  </div>
  <div class="card">
    ${d.hrv.length ? `<div class="row"><div class="metricName">Variabilité cardiaque</div><span class="meta">60 jours</span></div>
      ${hrvChart(d.hrv.filter(x => x.date >= D.add(day, -59)), 140)}
      ${legend([['var(--accent)', 'tendance sur 7 jours'], ['var(--faint)', 'mesure du jour']])}
      <div class="note tight">La bande claire est ta zone habituelle. Une seule journée basse ne veut rien dire ; c'est la tendance qui compte.</div>`
      : hint('Aucune mesure de variabilité pour l\'instant.')}
  </div>

  <div class="band"><h3>Charge d'entraînement</h3></div>
  <div class="card">
    ${t.some(x => x.load > 0) ? chart({ h: 170, bars: { pts: t.map(x => [D.num(x.date), x.load]), color: 'var(--line)' },
      series: [{ pts: t.map(x => [D.num(x.date), x.ctl]), color: 'var(--accent)', fill: true }, { pts: t.map(x => [D.num(x.date), x.atl]), color: 'var(--mid)', w: 1.6 }] })
      + legend([['var(--accent)', 'fond (42 j)'], ['var(--mid)', 'fatigue récente (7 j)'], ['var(--line)', 'charge du jour']])
      : hint('Pas encore de charge calculée.')}
  </div>
  ${chargeCard(d, d.trimpStates[d.trimpStates.length - 1])}
  <div class="note tight">Charge cardiaque (TRIMP), charge perçue (sRPE) et charge mécanique sont suivies séparément, jamais additionnées.</div>

  <div class="band"><h3>Records</h3><span class="meta">toutes sorties</span></div>
  ${prStrip()}
  ${predictionCard()}

  <div class="band"><h3>Course</h3><a class="meta" data-a="paces">Allures</a></div>
  <div class="pair">
    ${tile('7 jours', fx(d.m7.km, 1), 'km', `D+ ${Math.round(d.m7.up)} m`)}
    ${tile('28 jours', fx(d.m28.km, 0), 'km', `D+ ${Math.round(d.m28.up)} m`)}
  </div>
  ${vo2Card()}
  ${csCard()}
  ${zonesCard(d)}
  ${efCard()}
  ${raceCard(d)}

  <div class="band"><h3>Musculation</h3><a class="meta" data-a="muscu">Tout voir</a></div>
  <div class="card">
    <div class="row"><div class="metricName">Séries des 7 derniers jours</div></div>
    ${ms.length ? ms.slice(0, 5).map(m => {
      const w = Math.min(100, vol[m].direct / Math.max(...ms.map(x => vol[x].direct)) * 100);
      return `<div style="margin:11px 0 0"><div class="row"><span class="small">${MUSCLES[m]}</span><span class="meta">${vol[m].direct} séries</span></div>
        <div class="meter"><i style="width:${w}%;--c:var(--deep)"></i></div></div>`;
    }).join('') : hint('Aucune série enregistrée cette semaine.')}
  </div>`;
}
function sleepBars(day, need) {
  const days = D.range(D.add(day, -13), day);
  const max = Math.max(need + 1, ...days.map(x => (S.metrics[x]?.sleepMin || 0) / 60));
  return `<div style="position:relative">
    <div class="bars">${days.map(x => {
      const m = S.metrics[x], h = m?.sleepMin ? m.sleepMin / 60 : 0;
      const col = !h ? 'var(--line2)' : h >= need * .9 ? 'var(--accent)' : 'var(--mid)';
      return `<i style="height:${Math.max(3, h / max * 100)}%;--c:${col}" title="${D.short(x)} : ${h ? fx(h, 1) + ' h' : 'non mesuré'}"></i>`;
    }).join('')}</div>
    <div style="position:absolute;left:0;right:0;bottom:${(need / max * 64).toFixed(1)}px;border-top:1px dashed var(--faint);opacity:.75"></div>
  </div>
  <div class="barLabels"><span>${D.short(days[0])}</span><span>besoin ${fx(need, 1)} h</span><span>${D.short(days[13])}</span></div>`;
}
// Variabilité cardiaque tracée en millisecondes (le calcul reste logarithmique)
function hrvChart(rows, h) {
  if (!rows.length) return '';
  const ex = v => Math.exp(v);
  return chart({ h,
    band: rows.filter(x => x.mean != null).map(x => [D.num(x.date), ex(x.mean - .5 * x.sd), ex(x.mean + .5 * x.sd)]),
    series: [{ pts: rows.map(x => [D.num(x.date), x.value]), color: 'var(--faint)', line: false, dots: true, r: 2 },
             { pts: rows.map(x => [D.num(x.date), ex(x.trend)]), color: 'var(--accent)' }] });
}
function garminStrip() {
  if (typeof Cloud === 'undefined' || Cloud.mode !== 'cloud') return '';
  const g = S.garmin || {}, last = GM.runs?.[0], active = GM.runs?.find(r => r.status === 'requested' || r.status === 'running');
  const when = g.lastMerge ? relTime(g.lastMerge.at) : last?.finished_at ? relTime(Date.parse(last.finished_at)) : null;
  const nAct = S.activities.filter(a => a.source === 'garmin').length;
  const nNights = Object.values(S.metrics).filter(m => m.sleepProv === 'garmin').length;
  return `<div class="card" data-a="garminSheet" style="cursor:pointer">
    <div class="row"><div class="grow"><div class="metricName">${active ? 'Garmin — synchronisation en cours' : when ? 'Garmin — à jour' : 'Garmin — jamais synchronisé'}</div>
      <div class="meta">${active ? 'les données arrivent dans quelques minutes' : when ? `dernière mise à jour ${when} · ${nAct} activités, ${nNights} nuits` : 'connecte ta montre pour remplir l\'app automatiquement'}</div></div>
      <span style="color:var(--${active ? 'accent' : when ? 'good' : 'mid'});flex:none;display:flex">${ic(active ? 'sync' : when ? 'check' : 'alert', 20)}</span></div></div>`;
}
function relTime(ms) {
  const m = (Date.now() - ms) / 60000;
  if (m < 2) return 'à l\'instant';
  if (m < 60) return `il y a ${Math.round(m)} min`;
  if (m < 36 * 60) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} jours`;
}

// ===================== Saison =====================
function seasonBody() {
  const day = today(), evs = [...S.events].sort((a, b) => a.start < b.start ? -1 : 1), seqs = competitionSequences(S.events);
  const SQC = { compatible: 'var(--good)', vigilance: 'var(--mid)', conflict: 'var(--low)', undetermined: 'var(--faint)' };
  const past = evs.filter(e => e.end < day), future = evs.filter(e => e.end >= day);
  const card = e => {
    const k = D.diff(day, e.start);
    return `<div class="sess" data-a="editEvent" data-id="${e.id}" tabindex="0" style="--c:${e.priority === 'a' ? 'var(--mid)' : 'var(--faint)'}">
      <i class="sessRail"></i><div class="sessBody">
      <div class="sessWhen">${D.long(e.start)}${e.end > e.start ? ` → ${D.short(e.end)}` : ''}</div>
      <div class="sessTitle"><span class="grow">${esc(e.name)}</span><span class="num" style="font-size:15px;color:var(--${k >= 0 && k <= 21 ? 'mid' : 'faint'})">${k > 0 ? 'J−' + k : k === 0 ? 'Auj.' : ''}</span></div>
      <div class="wrap">${e.priority ? badge(LABELS.priority[e.priority], e.priority === 'a' ? 'var(--mid)' : 'var(--faint)') : badge('Priorité à définir', 'var(--faint)')}
        ${badge(LABELS.evStatus[e.status], PROVISIONAL.has(e.status) ? 'var(--mid)' : 'var(--good)')}
        ${e.distanceKm ? badge(fx(e.distanceKm, e.distanceKm < 30 ? 1 : 0) + ' km' + (e.upM ? ` · ${Math.round(e.upM)} m D+` : ''), 'var(--faint)') : ''}</div>
      ${e.result ? `<div class="small goodTx">Terminée en ${fmtDur(e.result)}</div>` : e.target ? `<div class="small acc">Objectif ${fmtDur(e.target)}</div>` : ''}
      </div></div>`;
  };
  return `${SEASON_GOALS.length ? `<div class="card">${SEASON_GOALS.map(g => `<div class="row top" style="padding:3px 0"><span style="color:var(--accent);flex:none;display:flex">${ic('flag', 17)}</span><span class="grow small">${esc(g)}</span></div>`).join('')}</div>` : ''}
  <div class="band"><h3>À venir</h3></div>
  ${future.length ? future.map(card).join('') : hint('Aucune compétition à venir.')}
  <div class="band"><h3>Enchaînements</h3></div>
  ${seqs.length ? seqs.map(s => `<div class="card"><div class="row top"><b class="grow">${esc(s.a.name)} → ${esc(s.b.name)}</b>${badge(SEQ_LABEL[s.st], SQC[s.st])}</div>
    ${s.msg.map(m => `<div class="meta" style="margin-top:4px">${esc(m)}</div>`).join('')}</div>`).join('')
    : hint('Aucune compétition suffisamment rapprochée pour poser question.')}
  <div class="note tight">Évalué à partir des durées d'affûtage et de récupération que tu renseignes pour chaque course. Aucun risque de blessure n'est chiffré ici.</div>
  ${past.length ? `<div class="band"><h3>Déjà couru</h3></div>${past.map(card).join('')}` : ''}
  <div class="list">${row('calendar', 'Phases de la saison', 'phases')}${row('plus', 'Ajouter une compétition', 'newEvent')}</div>`;
}

// ===================== Réglages =====================
function viewSettings() {
  const pend = S.activities.filter(a => a.linkState === 'validate');
  const hasDemo = S.activities.some(a => a.source === 'demo') || S.strength.some(x => x.demo);
  let size = 0; try { size = (localStorage.getItem(STORE_KEY) || '').length; } catch (e) { }
  return `<div class="screenTop"><div><h1>Réglages</h1></div></div>
  ${accountCard()}
  ${garminCard()}
  <div class="band"><h3>Toi</h3></div>
  <div class="list">
    ${row('season', 'Saison et compétitions', 'season')}
    ${row('user', 'Profil et fréquences cardiaques', 'profile')}
    ${row('gauge', 'Allures, VDOT et vitesse critique', 'paces')}
    ${row('heart', 'Mesures jour par jour', 'measures')}
  </div>
  <div class="band"><h3>Activités</h3>${pend.length ? `<span class="meta">${pend.length} à valider</span>` : ''}</div>
  <div class="list">
    ${row('run', `Toutes les activités`, 'activities', `<span class="meta">${S.activities.length}</span>`)}
    <label class="li">${`<span class="ic">${ic('download')}</span>`}<span class="grow">Importer des fichiers FIT ou un .zip Garmin</span>${chev}<input type="file" id="fitInput" accept=".fit,.zip,.FIT,.ZIP" multiple hidden></label>
  </div>
  <div class="note tight">Sur Garmin Connect, ouvre une activité, puis « Exporter l'original » : le .zip obtenu s'importe directement ici.</div>
  <div class="band"><h3>Données</h3></div>
  <div class="list">
    ${row('download', 'Exporter une sauvegarde', 'exportJSON')}
    <label class="li"><span class="ic">${ic('sync')}</span><span class="grow">Restaurer une sauvegarde</span>${chev}<input type="file" id="jsonInput" accept=".json" hidden></label>
    ${row('tune', 'Remplir avec des données de démo', 'demo')}
    ${hasDemo ? `<div class="li" data-a="clearDemo"><span class="ic danger">${ic('alert')}</span><span class="grow danger">Effacer les données de démo</span>${chev}</div>` : ''}
    <div class="li" data-a="reset"><span class="ic danger">${ic('alert')}</span><span class="grow danger">Tout effacer</span>${chev}</div>
  </div>
  <div class="note tight">${typeof Cloud !== 'undefined' && Cloud.mode === 'cloud' ? 'Tes données sont dans ton compte, avec une copie sur cet appareil pour fonctionner hors ligne.' : `Mode local : tout reste dans ce navigateur (${fx(size / 1024, 0)} Ko).`}</div>
  <div class="band"><h3>À propos</h3></div>
  <div class="list">
    ${row('book', 'Références scientifiques', 'refs')}
    ${row('clock', 'Se placer à une autre date', 'jump')}
    <div class="li plain"><span class="grow faint">Moteur</span><span class="meta">cockpit-core-1.0.0</span></div>
  </div>`;
}

const VIEWS = { today: viewToday, plan: viewPlan, muscu: viewMuscu, forme: viewForme, settings: viewSettings };

Object.assign(A, {
  forme() { ui.tab = 'forme'; ui.stack = []; render(); },
  muscu() { ui.tab = 'muscu'; ui.stack = []; render(); },
  sleepDetail: () => push('sleep'),
  hrvDetail: () => push('trends', { focus: 'hrv' }),
  rhrDetail: () => push('trends', { focus: 'rhr' }),
  activities: () => push('activities'),
  strengthHistory: () => push('strengthHistory'),
  freeWorkout: () => push('freeWorkout'),
  garminSheet() { ui.tab = 'settings'; ui.stack = []; render(); setTimeout(() => document.querySelector('[data-a=gmSync]')?.scrollIntoView({ block: 'center' }), 60); }
});

Object.assign(MODALS, {
  strengthHistory() {
    const list = [...S.strength].sort((a, b) => b.start - a.start).slice(0, 60);
    return { title: 'Séances de musculation', body: list.length ? `<div class="list">${list.map(s => `<div class="li" data-a="strengthDetail" data-id="${s.id}">
      <span class="ic">${ic('strength')}</span><div class="grow"><div>${esc(s.title)}</div>
      <div class="meta">${new Date(s.start).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} · ${s.sets.filter(x => !x.warm).length} séries${s.rpe != null ? ' · RPE ' + s.rpe : ''}</div></div>${chev}</div>`).join('')}</div>`
      : hint('Aucune séance enregistrée.') };
  },
  freeWorkout() {
    return { title: 'Séance libre', body: `<div class="note">Lance n'importe quelle séance du programme, même si elle n'est pas prévue aujourd'hui.</div>
      <div class="list">${SESSION_TEMPLATES.filter(t => t.kind === 'strength' || t.kind === 'mobility').map(t => `<div class="li" data-a="startWorkout" data-tpl="${t.id}">
        <span class="ic">${ic(t.kind)}</span><div class="grow"><div>${esc(t.title)}</div><div class="meta">${t.dur ? rng(t.dur, 'min') + ' · ' : ''}${t.blocks.reduce((n, b) => n + b.ex.length, 0)} exercices</div></div>
        <span style="color:var(--accent);flex:none;display:flex">${ic('play', 16)}</span></div>`).join('')}</div>` };
  }
});
