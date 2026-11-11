'use strict';
// ===================== Schémas de mouvement =====================
// Un pantin articulé en SVG, animé en CSS. Vue de côté sauf mention contraire.
// Chaque schéma montre l'amplitude visée, pas la perfection technique : il complète les consignes, il ne les remplace pas.

const MV_DUR = 2.6;
const kf = (n, a, b) => `@keyframes ${n}{from{transform:${a}}to{transform:${b}}}`;
const an = (n, d = MV_DUR, delay = 0) => `animation:${n} ${d}s cubic-bezier(.42,0,.58,1) ${delay}s infinite alternate`;
const bone = (len, w = 3.4) => `<line x1="0" y1="0" x2="0" y2="${len}" stroke="var(--mv-body)" stroke-width="${w}" stroke-linecap="round"/>`;
const head = (x, y, r = 6.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="var(--mv-body)" stroke-width="3"/>`;
const ground = `<line x1="8" y1="93" x2="92" y2="93" stroke="var(--mv-line)" stroke-width="2.5" stroke-linecap="round"/>`;
const plate = (cx, cy) => `<g stroke="var(--mv-load)" stroke-width="3.2" stroke-linecap="round"><line x1="${cx - 7}" y1="${cy}" x2="${cx + 7}" y2="${cy}"/><line x1="${cx}" y1="${cy - 4}" x2="${cx}" y2="${cy + 4}"/></g>`;

// Bras : épaule (angle a0→a1) puis coude (b0→b1). Les transformations sont écrites en entier,
// car une transformation CSS remplace l'attribut transform du groupe.
function arm(id, sx, sy, a, b, { upper = 15, fore = 14, hand = '', dim = false } = {}) {
  const css = kf(`${id}s`, `translate(${sx}px,${sy}px) rotate(${a[0]}deg)`, `translate(${sx}px,${sy}px) rotate(${a[1]}deg)`)
    + kf(`${id}e`, `translate(0px,${upper}px) rotate(${b[0]}deg)`, `translate(0px,${upper}px) rotate(${b[1]}deg)`);
  const svg = `<g style="${an(id + 's')}" ${dim ? 'opacity=".32"' : ''}>${bone(upper)}<g style="${an(id + 'e')}">${bone(fore, 3)}<g transform="translate(0,${fore})">${hand}</g></g></g>`;
  return { css, svg };
}
function leg(id, hx, hy, a, b, { thigh = 17, shin = 17, foot = true, dim = false } = {}) {
  const css = kf(`${id}h`, `translate(${hx}px,${hy}px) rotate(${a[0]}deg)`, `translate(${hx}px,${hy}px) rotate(${a[1]}deg)`)
    + kf(`${id}k`, `translate(0px,${thigh}px) rotate(${b[0]}deg)`, `translate(0px,${thigh}px) rotate(${b[1]}deg)`);
  const svg = `<g style="${an(id + 'h')}" ${dim ? 'opacity=".32"' : ''}>${bone(thigh)}<g style="${an(id + 'k')}">${bone(shin, 3.2)}${foot ? `<g transform="translate(0,${shin})"><line x1="0" y1="0" x2="7" y2="0" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/></g>` : ''}</g></g>`;
  return { css, svg };
}
const frame = (css, svg) => `<svg class="mv" viewBox="0 0 100 100" aria-hidden="true"><style>${css}</style>${svg}</svg>`;

const MOVES = {};
const mv = (id, title, build) => { MOVES[id] = { id, title, build }; };

// --- Tractions et tirage vertical : le buste monte vers la barre
mv('vertical_pull', 'Tirage vertical', () => {
  const a = arm('vp', 50, 34, [-6, -6], [0, 0], { upper: 15, fore: 14 });
  const l = leg('vpl', 50, 58, [6, 10], [22, 34], { foot: true });
  const css = a.css + l.css + kf('vpbody', 'translateY(8px)', 'translateY(-7px)') + kf('vparm', 'translate(50px,34px) rotate(-172deg)', 'translate(50px,34px) rotate(-150deg)');
  const svg = `<line x1="18" y1="12" x2="82" y2="12" stroke="var(--mv-load)" stroke-width="3.4" stroke-linecap="round"/>
    <g style="${an('vpbody')}">${head(50, 26)}<line x1="50" y1="33" x2="50" y2="58" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
      <g style="${an('vparm')}">${bone(15)}<g transform="translate(0,15)">${bone(14, 3)}</g></g>
      ${l.svg}</g>`;
  return frame(css, svg);
});

// --- Rowing : buste penché, le coude part vers l'arrière
mv('horizontal_pull', 'Tirage horizontal', () => {
  const css = kf('hpArm', 'translate(56px,40px) rotate(4deg)', 'translate(56px,40px) rotate(38deg)')
    + kf('hpEl', 'translate(0px,15px) rotate(0deg)', 'translate(0px,15px) rotate(-128deg)');
  const svg = `${ground}${head(32, 30)}
    <line x1="38" y1="33" x2="60" y2="44" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
    <line x1="60" y1="44" x2="62" y2="70" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="62" y1="70" x2="58" y2="92" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/>
    <g style="${an('hpArm')}">${bone(15)}<g style="${an('hpEl')}">${bone(14, 3)}<g transform="translate(0,14)">${plate(0, 0)}</g></g></g>`;
  return frame(css, svg);
});

// --- Développé couché ou incliné : les bras poussent à la verticale
mv('horizontal_push', 'Poussée horizontale', () => {
  const css = kf('hxEl', 'translate(0px,15px) rotate(46deg)', 'translate(0px,15px) rotate(3deg)');
  const svg = `${ground}
    <line x1="18" y1="64" x2="74" y2="64" stroke="var(--mv-line)" stroke-width="5" stroke-linecap="round"/>
    ${head(26, 55)}<line x1="33" y1="57" x2="64" y2="59" stroke="var(--mv-body)" stroke-width="3.8" stroke-linecap="round"/>
    <line x1="64" y1="59" x2="76" y2="76" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="76" y1="76" x2="70" y2="92" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/>
    <g transform="translate(42,57) rotate(177)">${bone(15)}<g style="${an('hxEl')}">${bone(14, 3)}<g transform="translate(0,14)">${plate(0, 0)}</g></g></g>`;
  return frame(css, svg);
});

// --- Développé militaire : de l'épaule au-dessus de la tête
mv('vertical_push', 'Poussée verticale', () => {
  const css = kf('vpuArm', 'translate(56px,34px) rotate(152deg)', 'translate(56px,34px) rotate(179deg)')
    + kf('vpuEl', 'translate(0px,15px) rotate(78deg)', 'translate(0px,15px) rotate(2deg)');
  const svg = `${ground}${head(50, 26)}<line x1="50" y1="33" x2="50" y2="58" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
    <line x1="50" y1="58" x2="44" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="50" y1="58" x2="56" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <g style="${an('vpuArm')}">${bone(15)}<g style="${an('vpuEl')}">${bone(14, 3)}<g transform="translate(0,14)">${plate(0, 0)}</g></g></g>`;
  return frame(css, svg);
});

// --- Élévations latérales (vue de face) : les deux bras montent à l'horizontale
mv('lateral_raise', 'Élévation latérale', () => {
  const css = kf('lrL', 'translate(42px,36px) rotate(10deg)', 'translate(42px,36px) rotate(92deg)')
    + kf('lrR', 'translate(58px,36px) rotate(-10deg)', 'translate(58px,36px) rotate(-92deg)');
  const svg = `${ground}${head(50, 24)}<line x1="50" y1="31" x2="50" y2="60" stroke="var(--mv-body)" stroke-width="3.8" stroke-linecap="round"/>
    <line x1="50" y1="60" x2="43" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="50" y1="60" x2="57" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <g style="${an('lrL')}">${bone(26, 3.2)}<g transform="translate(0,26)">${plate(0, 0)}</g></g>
    <g style="${an('lrR')}">${bone(26, 3.2)}<g transform="translate(0,26)">${plate(0, 0)}</g></g>`;
  return frame(css, svg);
});

// --- Oiseau : buste penché, bras qui s'ouvrent (vue de face, buste raccourci)
mv('rear_delt', 'Oiseau', () => {
  const css = kf('rdL', 'translate(42px,42px) rotate(6deg)', 'translate(42px,42px) rotate(86deg)')
    + kf('rdR', 'translate(58px,42px) rotate(-6deg)', 'translate(58px,42px) rotate(-86deg)');
  const svg = `${ground}${head(50, 30)}<line x1="50" y1="37" x2="50" y2="56" stroke="var(--mv-body)" stroke-width="3.8" stroke-linecap="round"/>
    <line x1="50" y1="56" x2="43" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="50" y1="56" x2="57" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <g style="${an('rdL')}">${bone(24, 3.2)}<g transform="translate(0,24)">${plate(0, 0)}</g></g>
    <g style="${an('rdR')}">${bone(24, 3.2)}<g transform="translate(0,24)">${plate(0, 0)}</g></g>`;
  return frame(css, svg);
});

// --- Curl : seul le coude bouge
mv('curl', 'Flexion de coude', () => {
  const l = leg('cul', 50, 58, [4, 4], [4, 4]);
  const css = l.css + kf('cuEl', 'translate(0px,15px) rotate(0deg)', 'translate(0px,15px) rotate(-142deg)');
  const svg = `${ground}${head(50, 26)}<line x1="50" y1="33" x2="50" y2="58" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>${l.svg}
    <g transform="translate(50,34)">${bone(15)}<g style="${an('cuEl')}">${bone(14, 3)}<g transform="translate(0,14)">${plate(0, 0)}</g></g></g>`;
  return frame(css, svg);
});

// --- Extension triceps au-dessus de la tête
mv('triceps_ext', 'Extension de coude', () => {
  const css = kf('teEl', 'translate(0px,15px) rotate(146deg)', 'translate(0px,15px) rotate(6deg)');
  const svg = `${ground}${head(50, 26)}<line x1="50" y1="33" x2="50" y2="58" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
    <line x1="50" y1="58" x2="44" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="50" y1="58" x2="56" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <g transform="translate(57,34) rotate(174)">${bone(15)}<g style="${an('teEl')}">${bone(14, 3)}<g transform="translate(0,14)">${plate(0, 0)}</g></g></g>`;
  return frame(css, svg);
});

// --- Fente bulgare : pied arrière surélevé, le genou avant plie
mv('split_squat', 'Fente bulgare', () => {
  const css = kf('ssBody', 'translateY(0px)', 'translateY(6px)')
    + kf('ssFront', 'translate(58px,52px) rotate(-12deg)', 'translate(58px,52px) rotate(-34deg)')
    + kf('ssKnee', 'translate(0px,17px) rotate(14deg)', 'translate(0px,17px) rotate(44deg)')
    + kf('ssRear', 'translateY(0px)', 'translateY(5px)');
  const svg = `${ground}<path d="M10 92 V74 H32" fill="none" stroke="var(--mv-line)" stroke-width="3.2" stroke-linejoin="round"/>
    <g style="${an('ssRear')}" opacity=".42"><path d="M58 52 L44 72 L28 72" fill="none" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g style="${an('ssBody')}">${head(58, 20)}<line x1="58" y1="27" x2="58" y2="52" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
      <g style="${an('ssFront')}">${bone(17)}<g style="${an('ssKnee')}">${bone(17, 3.2)}<g transform="translate(0,17)"><line x1="0" y1="0" x2="8" y2="0" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/></g></g></g>
    </g>`;
  return frame(css, svg);
});

// --- Soulevé de terre roumain unilatéral : la hanche recule, la jambe libre part en arrière
mv('hip_hinge', 'Charnière de hanche', () => {
  const css = kf('hhTorso', 'translate(52px,56px) rotate(4deg)', 'translate(52px,56px) rotate(76deg)')
    + kf('hhFree', 'translate(52px,56px) rotate(184deg)', 'translate(52px,56px) rotate(250deg)')
    + kf('hhLoad', 'translate(0px,20px)', 'translate(0px,34px)');
  const svg = `${ground}
    <line x1="52" y1="56" x2="48" y2="92" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
    <line x1="48" y1="92" x2="58" y2="92" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/>
    <g style="${an('hhFree')}" opacity=".42">${bone(30, 3.2)}</g>
    <g style="${an('hhTorso')}"><g transform="rotate(180)">${bone(26, 3.8)}<circle cx="0" cy="33" r="6.4" fill="none" stroke="var(--mv-body)" stroke-width="3"/></g>
      <g style="${an('hhLoad')}"><line x1="0" y1="-20" x2="0" y2="0" stroke="var(--mv-body)" stroke-width="2.6" stroke-linecap="round"/>${plate(0, 0)}</g></g>`;
  return frame(css, svg);
});

// --- Step-up : montée sur une marche
mv('step_up', 'Montée sur marche', () => {
  const css = kf('suBody', 'translate(4px,10px)', 'translate(0px,0px)')
    + kf('suLead', 'translate(46px,52px) rotate(-107deg)', 'translate(46px,52px) rotate(-71deg)')
    + kf('suLeadK', 'translate(0px,17px) rotate(108deg)', 'translate(0px,17px) rotate(58deg)')
    + kf('suTrail', 'translate(46px,52px) rotate(30deg)', 'translate(46px,52px) rotate(10deg)')
    + kf('suTrailK', 'translate(0px,17px) rotate(10deg)', 'translate(0px,17px) rotate(34deg)');
  const svg = `${ground}<path d="M60 93 V74 H94" fill="none" stroke="var(--mv-line)" stroke-width="3.2" stroke-linejoin="round"/>
    <g style="${an('suBody')}">${head(46, 20)}<line x1="46" y1="27" x2="46" y2="52" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
      <g style="${an('suTrail')}" opacity=".42">${bone(17)}<g style="${an('suTrailK')}">${bone(17, 3.2)}</g></g>
      <g style="${an('suLead')}">${bone(17)}<g style="${an('suLeadK')}">${bone(17, 3.2)}<g transform="translate(0,17)"><line x1="0" y1="0" x2="8" y2="0" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/></g></g></g></g>`;
  return frame(css, svg);
});

// --- Mollets : montée sur la pointe
mv('calf_raise', 'Extension de cheville', () => {
  const css = kf('crBody', 'translateY(7px)', 'translateY(-9px)');
  const svg = `<line x1="16" y1="78" x2="58" y2="78" stroke="var(--mv-line)" stroke-width="4.5" stroke-linecap="round"/>
    <g style="${an('crBody')}">${head(46, 20)}<line x1="46" y1="27" x2="46" y2="48" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
      <line x1="46" y1="48" x2="48" y2="72" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="48" y1="72" x2="62" y2="76" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/></g>
    <path d="M74 56 v22 M70 60 l4 -5 l4 5 M70 74 l4 5 l4 -5" fill="none" stroke="var(--mv-load)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return frame(css, svg);
});

// --- Gainage : la position ne bouge pas, le bassin oscille à peine
mv('plank', 'Gainage ventral', () => {
  const css = kf('plBody', 'translateY(0px)', 'translateY(2px)');
  const svg = `${ground}<g style="${an('plBody', 3.4)}">${head(22, 50)}
    <line x1="28" y1="53" x2="78" y2="66" stroke="var(--mv-body)" stroke-width="3.8" stroke-linecap="round"/>
    <line x1="22" y1="56" x2="24" y2="92" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/>
    <line x1="24" y1="92" x2="36" y2="92" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/>
    <line x1="78" y1="66" x2="88" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/></g>
    <path d="M30 44 H74" stroke="var(--mv-load)" stroke-width="2" stroke-dasharray="3 4"/>`;
  return frame(css, svg);
});
mv('side_plank', 'Gainage latéral', () => {
  const css = kf('spBody', 'rotate(0deg)', 'rotate(-3deg)');
  const svg = `${ground}<g style="${an('spBody', 3.4)};transform-origin:84px 90px;transform-box:view-box">
    ${head(20, 44)}<line x1="26" y1="48" x2="84" y2="88" stroke="var(--mv-body)" stroke-width="3.8" stroke-linecap="round"/>
    <line x1="24" y1="50" x2="22" y2="90" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/>
    <line x1="84" y1="88" x2="92" y2="92" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/></g>`;
  return frame(css, svg);
});

// --- Anti-rotation : les bras poussent devant, le buste ne tourne pas
mv('anti_rotation', 'Anti-rotation', () => {
  const css = kf('arArm', 'translate(50px,36px) rotate(96deg)', 'translate(50px,36px) rotate(96deg)')
    + kf('arEl', 'translate(0px,14px) rotate(-70deg)', 'translate(0px,14px) rotate(-4deg)');
  const svg = `${ground}${head(50, 24)}<line x1="50" y1="31" x2="50" y2="58" stroke="var(--mv-body)" stroke-width="3.8" stroke-linecap="round"/>
    <line x1="50" y1="58" x2="42" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="50" y1="58" x2="58" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="10" y1="20" x2="10" y2="80" stroke="var(--mv-line)" stroke-width="2.5" stroke-linecap="round"/>
    <g style="${an('arArm')}">${bone(14)}<g style="${an('arEl')}">${bone(14, 3)}</g></g>`;
  return frame(css, svg);
});

// --- Relevé de jambes suspendu
mv('leg_raise', 'Relevé de jambes', () => {
  const css = kf('lgLeg', 'translate(50px,58px) rotate(4deg)', 'translate(50px,58px) rotate(84deg)');
  const svg = `<line x1="18" y1="12" x2="82" y2="12" stroke="var(--mv-load)" stroke-width="3.4" stroke-linecap="round"/>
    <line x1="50" y1="12" x2="50" y2="34" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/>
    ${head(50, 30)}<line x1="50" y1="36" x2="50" y2="58" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
    <g style="${an('lgLeg')}">${bone(18)}<g transform="translate(0,18)">${bone(16, 3.2)}</g></g>`;
  return frame(css, svg);
});

// --- Saut : flexion puis extension complète
mv('jump', 'Saut', () => {
  const css = kf('jpBody', 'translateY(14px)', 'translateY(-14px)')
    + kf('jpHip', 'translate(50px,58px) rotate(-16deg)', 'translate(50px,58px) rotate(0deg)')
    + kf('jpKnee', 'translate(0px,17px) rotate(34deg)', 'translate(0px,17px) rotate(0deg)')
    + kf('jpArm', 'translate(50px,34px) rotate(34deg)', 'translate(50px,34px) rotate(-150deg)');
  const svg = `${ground}<g style="${an('jpBody', 1.5)}">${head(50, 26)}<line x1="50" y1="33" x2="50" y2="58" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
    <g style="${an('jpArm', 1.5)}">${bone(15)}<g transform="translate(0,15)">${bone(14, 3)}</g></g>
    <g style="${an('jpHip', 1.5)}">${bone(17)}<g style="${an('jpKnee', 1.5)}">${bone(17, 3.2)}</g></g></g>`;
  return frame(css, svg);
});

// --- Jambier antérieur : dos au mur, orteils relevés
mv('tibialis', 'Relevé de pointe', () => {
  const css = kf('tbFoot', 'rotate(0deg)', 'rotate(-40deg)');
  const svg = `${ground}<line x1="24" y1="10" x2="24" y2="92" stroke="var(--mv-line)" stroke-width="2.5" stroke-linecap="round"/>
    ${head(32, 26)}<line x1="30" y1="33" x2="28" y2="58" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
    <line x1="28" y1="58" x2="56" y2="88" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <g style="${an('tbFoot')};transform-origin:56px 88px;transform-box:view-box"><line x1="56" y1="88" x2="70" y2="90" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/></g>`;
  return frame(css, svg);
});

// --- Voûte plantaire : le pied se raccourcit sans que les orteils griffent
mv('short_foot', 'Pied court', () => {
  const css = kf('sfArch', 'scaleX(1)', 'scaleX(.86)');
  const svg = `<line x1="10" y1="76" x2="90" y2="76" stroke="var(--mv-line)" stroke-width="2.5" stroke-linecap="round"/>
    <g style="${an('sfArch', 3)};transform-origin:70px 76px;transform-box:view-box">
      <path d="M22 74 C34 52 54 52 70 74" fill="none" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/>
      <line x1="70" y1="74" x2="84" y2="74" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/></g>
    <line x1="22" y1="30" x2="22" y2="70" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>`;
  return frame(css, svg);
});

// --- Équilibre sur une jambe
mv('balance', 'Équilibre unipodal', () => {
  const css = kf('blBody', 'rotate(-2.5deg)', 'rotate(2.5deg)')
    + kf('blFree', 'translate(50px,58px) rotate(150deg)', 'translate(50px,58px) rotate(166deg)');
  const svg = `${ground}<g style="${an('blBody', 3.2)};transform-origin:50px 92px;transform-box:view-box">
    ${head(50, 24)}<line x1="50" y1="31" x2="50" y2="58" stroke="var(--mv-body)" stroke-width="3.8" stroke-linecap="round"/>
    <line x1="50" y1="58" x2="50" y2="92" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="50" y1="92" x2="60" y2="92" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/>
    <g style="${an('blFree', 3.2)}" opacity=".5">${bone(16)}<g transform="translate(0,16)">${bone(15, 3)}</g></g>
    <line x1="50" y1="36" x2="32" y2="30" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round" opacity=".5"/>
    <line x1="50" y1="36" x2="68" y2="30" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round" opacity=".5"/></g>`;
  return frame(css, svg);
});

// --- Mobilité hanche et cheville : fente genou qui avance au-dessus du pied
mv('mobility', 'Mobilité', () => {
  const css = kf('moBody', 'translateX(0px)', 'translateX(9px)')
    + kf('moFront', 'translate(44px,58px) rotate(-30deg)', 'translate(44px,58px) rotate(-46deg)')
    + kf('moKnee', 'translate(0px,17px) rotate(58deg)', 'translate(0px,17px) rotate(82deg)');
  const svg = `${ground}<g style="${an('moBody', 3)}">${head(44, 26)}<line x1="44" y1="33" x2="44" y2="58" stroke="var(--mv-body)" stroke-width="3.6" stroke-linecap="round"/></g>
    <line x1="44" y1="58" x2="26" y2="90" stroke="var(--mv-body)" stroke-width="3.2" stroke-linecap="round" opacity=".45"/>
    <g style="${an('moFront', 3)}">${bone(17)}<g style="${an('moKnee', 3)}">${bone(17, 3.2)}<g transform="translate(0,17)"><line x1="0" y1="0" x2="8" y2="0" stroke="var(--mv-body)" stroke-width="3" stroke-linecap="round"/></g></g></g>`;
  return frame(css, svg);
});

// --- Correspondance exercice → schéma
const MOVE_OF = {
  pullup_pronated: 'vertical_pull', lat_pulldown: 'vertical_pull',
  row_barbell_db: 'horizontal_pull', seated_row: 'horizontal_pull', face_pull: 'horizontal_pull',
  bench_press: 'horizontal_push', incline_db_press: 'horizontal_push', chest_press: 'horizontal_push', cable_fly: 'horizontal_push',
  seated_shoulder_press: 'vertical_push', standing_military_press: 'vertical_push',
  lateral_raise: 'lateral_raise', rear_delt_fly: 'rear_delt',
  biceps_curl: 'curl', hammer_curl: 'curl', incline_db_curl: 'curl',
  triceps_pushdown: 'triceps_ext', overhead_triceps_extension: 'triceps_ext',
  bulgarian_split_squat: 'split_squat', eccentric_step_down: 'split_squat',
  single_leg_rdl: 'hip_hinge', single_leg_glute_bridge: 'hip_hinge',
  step_up: 'step_up', box_jump: 'jump', countermovement_jump: 'jump', broad_bounds: 'jump',
  seated_calf_raise: 'calf_raise', single_leg_calf_raise: 'calf_raise',
  plank: 'plank', side_plank: 'side_plank', side_plank_abduction: 'side_plank',
  pallof_press: 'anti_rotation', hanging_leg_raise: 'leg_raise',
  tibialis_raise: 'tibialis', short_foot: 'short_foot', toe_drills: 'short_foot',
  single_leg_balance: 'balance', ankle_dorsiflexion: 'mobility', hip_mobility: 'mobility'
};
const MV_CACHE = {};
function moveFor(exId, cat) {
  const id = MOVE_OF[exId] || ({ core: 'plank', foot: 'short_foot', plyometric: 'jump', mobility: 'mobility' })[cat];
  if (!id || !MOVES[id]) return null;
  if (!MV_CACHE[id]) MV_CACHE[id] = MOVES[id].build();
  return { id, title: MOVES[id].title, svg: MV_CACHE[id] };
}
