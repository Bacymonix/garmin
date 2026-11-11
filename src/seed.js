'use strict';
// ===== Données de référence : muscles, exercices, saison 2026–2027 (portage de CockpitCore) =====

const MUSCLES = {
  lats: 'Grand dorsal', upperBack: 'Haut du dos', chest: 'Pectoraux', frontDelts: 'Deltoïde antérieur',
  sideDelts: 'Deltoïde latéral', rearDelts: 'Deltoïde postérieur', biceps: 'Biceps', triceps: 'Triceps',
  forearms: 'Avant-bras', abdominals: 'Abdominaux', obliques: 'Obliques', lowerBack: 'Lombaires',
  glutes: 'Fessiers', quadriceps: 'Quadriceps', hamstrings: 'Ischio-jambiers', adductors: 'Adducteurs',
  hipFlexors: 'Fléchisseurs de hanche', calves: 'Mollets', footAndAnkle: 'Pied et cheville'
};
const LOWER = new Set(['glutes', 'quadriceps', 'hamstrings', 'adductors', 'hipFlexors', 'calves', 'footAndAnkle']);
const CATS = { strength: 'Force / hypertrophie', core: 'Gainage', plyometric: 'Pliométrie', isometric: 'Isométrie',
  mobility: 'Mobilité', proprioception: 'Proprioception', foot: 'Pieds' };

const NSCA = "Consignes techniques générales — Haff & Triplett (dir.), Essentials of Strength Training and Conditioning, NSCA, 4e éd., 2016";
const PRACT = "Consignes pratiques usuelles ; aucune source biomécanique spécifique intégrée";

function ex(id, name, sum, cat, p, s, o = {}) {
  return Object.assign({ id, name, sum, cat, p, s, joints: [], eq: [], diff: 2, tech: 2, rom: 'Complète, contrôlée',
    tempo: null, cues: [], err: [], vars: [], rep: [], src: NSCA, bw: false, uni: false, timed: false, custom: false }, o);
}

const EXERCISES = [
  ex('pullup_pronated', 'Tractions pronation', 'Tirage vertical au poids du corps, prise pronation un peu plus large que les épaules.', 'strength', ['lats', 'upperBack'], ['biceps', 'rearDelts', 'forearms'],
    { joints: ['Épaule', 'Coude', 'Omoplate'], eq: ['Barre de traction', 'Ceinture de lest'], diff: 3, rom: 'Bras tendus en bas, menton au-dessus de la barre',
      cues: ["Démarrer en abaissant les omoplates", 'Tirer les coudes vers les hanches', 'Côtes basses, pas de cambrure', "Redescendre en contrôle jusqu'aux bras tendus"],
      err: ['Amplitude partielle en bas', 'Élan des jambes', 'Épaules qui remontent vers les oreilles'], vars: ['Lestées', 'Négatives', 'Assistées par élastique'], rep: ['lat_pulldown', 'pullup_neutral'], bw: true }),
  ex('pullup_neutral', 'Tractions prise neutre', 'Paumes face à face, souvent mieux tolérées par les épaules.', 'strength', ['lats', 'upperBack'], ['biceps', 'forearms'],
    { joints: ['Épaule', 'Coude'], eq: ['Barre à poignées parallèles'], diff: 3, cues: ['Omoplates abaissées avant de tirer', 'Poitrine vers les poignées', 'Descente contrôlée'], err: ['Demi-répétitions', 'Balancement'], vars: ['Lestées'], rep: ['lat_pulldown', 'pullup_pronated'], bw: true }),
  ex('lat_pulldown', 'Tirage vertical', 'Tirage à la poulie haute, alternative chargeable aux tractions.', 'strength', ['lats'], ['upperBack', 'biceps', 'rearDelts'],
    { joints: ['Épaule', 'Coude'], eq: ['Poulie haute'], diff: 1, tech: 1, cues: ['Buste légèrement incliné en arrière', 'Barre vers le haut de la poitrine', 'Remontée lente'], err: ['Tirer derrière la nuque', 'Se balancer'], vars: ['Prise neutre', 'Prise serrée'], rep: ['pullup_pronated'] }),
  ex('row_barbell_db', 'Rowing barre ou haltère', 'Tirage horizontal buste penché ou en appui.', 'strength', ['upperBack', 'lats'], ['rearDelts', 'biceps', 'lowerBack'],
    { joints: ['Épaule', 'Coude', 'Hanche'], eq: ['Barre ou haltère', 'Banc'], cues: ['Dos neutre, hanches en arrière', 'Coude vers la hanche', 'Pause brève en haut'], err: ['Arrondir le bas du dos', 'Redresser le buste pour tricher'], vars: ['Pendlay', 'Haltère unilatéral'], rep: ['seated_row'] }),
  ex('seated_row', 'Rowing assis', 'Tirage horizontal à la poulie basse ou à la machine.', 'strength', ['upperBack', 'lats'], ['rearDelts', 'biceps'],
    { eq: ['Poulie basse ou machine'], diff: 1, tech: 1, cues: ['Buste stable', 'Poignée vers le nombril', 'Laisser les omoplates s\'écarter au retour'], err: ["Élan du tronc"], rep: ['row_barbell_db'] }),
  ex('lateral_raise', 'Élévations latérales', 'Isolation du deltoïde latéral, clé de la largeur d\'épaules.', 'strength', ['sideDelts'], ['upperBack'],
    { eq: ['Haltères ou poulie'], diff: 1, tech: 1, rom: "Jusqu'à l'horizontale environ", cues: ['Coudes légèrement fléchis et fixes', 'Monter en écartant, pas en avant', 'Descente lente'], err: ['Hausser les épaules', 'Élan du buste', 'Charge trop lourde'], vars: ['Poulie unilatérale', 'Assis'] }),
  ex('face_pull', 'Face pull', 'Tirage vers le visage avec rotation externe des épaules.', 'strength', ['rearDelts', 'upperBack'], ['sideDelts'],
    { eq: ['Poulie', 'Corde'], diff: 1, cues: ['Corde vers le front', 'Écarter les mains en fin de mouvement', 'Coudes hauts'], err: ['Tirer vers la poitrine', 'Cambrer'], rep: ['rear_delt_fly'] }),
  ex('rear_delt_fly', 'Oiseau', 'Écarté buste penché pour le deltoïde postérieur.', 'strength', ['rearDelts'], ['upperBack'],
    { eq: ['Haltères'], diff: 1, tech: 1, cues: ['Buste penché et stable', 'Ouvrir les bras en arc'], err: ['Utiliser les trapèzes'], rep: ['face_pull'] }),
  ex('seated_shoulder_press', 'Développé épaules assis', 'Poussée verticale assise.', 'strength', ['frontDelts'], ['sideDelts', 'triceps', 'upperBack'],
    { eq: ['Haltères ou barre', 'Banc à dossier'], cues: ['Dos contre le dossier', 'Avant-bras verticaux', 'Verrouiller sans hausser les épaules'], err: ['Cambrure excessive', 'Amplitude réduite'] }),
  ex('bench_press', 'Développé couché', 'Poussée horizontale à la barre.', 'strength', ['chest'], ['frontDelts', 'triceps'],
    { eq: ['Barre', 'Banc', 'Pareurs'], tech: 3, cues: ['Omoplates serrées et basses', 'Pieds ancrés au sol', 'Barre vers le bas des pectoraux'], err: ['Rebond sur la poitrine', 'Fesses qui décollent'], vars: ['Haltères', 'Prise serrée'], rep: ['chest_press', 'weighted_pushup'] }),
  ex('incline_db_press', 'Développé incliné haltères', 'Accent sur le haut des pectoraux.', 'strength', ['chest'], ['frontDelts', 'triceps'],
    { eq: ['Haltères', 'Banc inclinable'], cues: ['Banc à 20–35°', 'Haltères au niveau de la poitrine'], err: ['Banc trop incliné'], rep: ['bench_press'] }),
  ex('chest_press', 'Chest press', 'Poussée horizontale guidée.', 'strength', ['chest'], ['frontDelts', 'triceps'],
    { eq: ['Machine'], diff: 1, tech: 1, cues: ['Poignées à hauteur de poitrine', 'Retour contrôlé'], err: ['Épaules qui avancent'], rep: ['bench_press', 'weighted_pushup'] }),
  ex('weighted_pushup', 'Pompes lestées', 'Pompes avec gilet ou disque.', 'strength', ['chest'], ['frontDelts', 'triceps', 'abdominals'],
    { eq: ['Gilet lesté'], tech: 1, cues: ['Corps gainé', 'Poitrine proche du sol', 'Coudes à 45°'], err: ['Bassin qui s\'affaisse'], rep: ['chest_press'], bw: true }),
  ex('dips', 'Dips', 'Poussée aux barres parallèles.', 'strength', ['chest', 'triceps'], ['frontDelts'],
    { eq: ['Barres parallèles'], diff: 3, cues: ['Buste légèrement penché', 'Amplitude confortable pour l\'épaule'], err: ['Descente trop profonde sous douleur'], rep: ['chest_press'], bw: true }),
  ex('biceps_curl', 'Curl biceps', 'Flexion du coude en supination.', 'strength', ['biceps'], ['forearms'],
    { eq: ['Haltères, barre ou poulie'], diff: 1, tech: 1, cues: ['Coudes fixes', 'Supination complète en haut', 'Descente lente'], err: ['Élan du buste'], rep: ['hammer_curl'] }),
  ex('hammer_curl', 'Curl marteau', 'Flexion du coude en prise neutre.', 'strength', ['biceps', 'forearms'], [],
    { eq: ['Haltères'], diff: 1, tech: 1, cues: ['Pouces vers le haut', 'Coudes immobiles'], err: ['Balancement'], rep: ['biceps_curl'] }),
  ex('triceps_pushdown', 'Extension triceps poulie', 'Extension du coude à la poulie haute.', 'strength', ['triceps'], [],
    { eq: ['Poulie', 'Corde ou barre'], diff: 1, tech: 1, cues: ['Coudes collés au buste', 'Extension complète'], err: ['Coudes qui s\'écartent'], rep: ['dips'] }),
  ex('hanging_leg_raise', 'Relevés de jambes suspendu', 'Flexion de hanche et enroulement du bassin.', 'core', ['abdominals', 'hipFlexors'], ['obliques', 'forearms'],
    { eq: ['Barre de traction'], cues: ['Enrouler le bassin en fin de montée', 'Pas de balancier'], err: ['Se balancer'], rep: ['ab_wheel', 'plank'], bw: true }),
  ex('pallof_press', 'Pallof press', 'Anti-rotation à la poulie ou à l\'élastique.', 'core', ['obliques', 'abdominals'], [],
    { eq: ['Poulie ou élastique'], diff: 1, tech: 1, cues: ['Bassin et épaules face à l\'avant', 'Bras tendus 1–2 s'], err: ['Laisser le buste tourner'], src: PRACT, uni: true }),
  ex('plank', 'Planche', 'Gainage ventral isométrique.', 'core', ['abdominals'], ['obliques', 'glutes'],
    { diff: 1, tech: 1, cues: ['Rétroversion légère', 'Fessiers contractés', 'Respirer'], err: ['Bassin trop haut ou affaissé'], rep: ['ab_wheel'], src: PRACT, timed: true }),
  ex('ab_wheel', 'Ab wheel', 'Anti-extension dynamique.', 'core', ['abdominals'], ['lats', 'obliques'],
    { eq: ['Roulette'], diff: 3, cues: ['Bassin en rétroversion', 'Aller seulement aussi loin que le dos reste neutre'], err: ['Cambrure'], rep: ['plank'], src: PRACT }),
  ex('side_plank_abduction', 'Gainage latéral avec abduction', 'Planche latérale dynamique.', 'core', ['obliques', 'glutes'], ['abdominals'],
    { tech: 1, cues: ['Corps aligné', 'Hanche haute'], err: ['Bassin qui recule'], src: PRACT, uni: true, timed: true }),
  ex('bulgarian_split_squat', 'Squat bulgare', 'Fente arrière pied surélevé, descente contrôlée, remontée dynamique.', 'strength', ['quadriceps', 'glutes'], ['adductors', 'hamstrings'],
    { eq: ['Haltères', 'Banc'], diff: 3, tempo: '3-0-X-0', cues: ['Talon avant au sol', 'Descente en 3 s', 'Remonter vite'], err: ['Genou avant qui rentre', 'Appui sur le pied arrière'], rep: ['eccentric_step_down'], uni: true }),
  ex('eccentric_step_down', 'Step-down excentrique', 'Descente lente d\'une marche sur une jambe.', 'strength', ['quadriceps'], ['glutes', 'footAndAnkle'],
    { eq: ['Marche ou box'], tempo: '4-0-1-0', cues: ['Descente en 4 s', 'Genou aligné sur le 2e orteil'], err: ['Chute du bassin', 'Genou en dedans'], src: PRACT, uni: true }),
  ex('hip_thrust', 'Hip thrust', 'Extension de hanche dos sur banc.', 'strength', ['glutes'], ['hamstrings'],
    { eq: ['Barre', 'Banc'], tempo: 'Verrouillage 1 s', cues: ['Menton rentré', 'Tibias verticaux en haut'], err: ['Hyperextension lombaire'], rep: ['single_leg_glute_bridge'] }),
  ex('single_leg_glute_bridge', 'Pont fessier unilatéral', 'Extension de hanche au sol sur une jambe.', 'strength', ['glutes'], ['hamstrings'],
    { diff: 1, tech: 1, tempo: 'Verrouillage 1 s', cues: ['Bassin horizontal', 'Pousser dans le talon'], err: ['Bassin qui bascule'], rep: ['hip_thrust'], src: PRACT, uni: true }),
  ex('single_leg_rdl', 'Soulevé de terre roumain unilatéral', 'Charnière de hanche sur une jambe.', 'strength', ['hamstrings', 'glutes'], ['lowerBack', 'footAndAnkle'],
    { eq: ['Haltère ou kettlebell'], tech: 3, cues: ['Hanche en arrière, dos neutre', 'Bassin parallèle au sol'], err: ['Ouvrir la hanche', 'Arrondir le dos'], rep: ['hip_thrust'], uni: true }),
  ex('box_jump', 'Box jumps', 'Sauts sur box. Charge mécanique non négligeable.', 'plyometric', ['quadriceps', 'glutes', 'calves'], [],
    { eq: ['Box stable'], cues: ['Bras actifs', 'Réception silencieuse', 'Redescendre en marchant'], err: ['Box trop haute', 'Enchaîner fatigué'], rep: ['jump_lunge'] }),
  ex('jump_lunge', 'Fentes sautées', 'Changements de jambe en l\'air.', 'plyometric', ['quadriceps', 'glutes'], ['calves', 'hamstrings'],
    { diff: 3, cues: ['Réceptions amorties', 'Qualité avant vitesse'], err: ['Genou qui rentre'], rep: ['box_jump'], src: PRACT }),
  ex('seated_calf_raise', 'Extensions mollets assis', 'Flexion plantaire genoux fléchis (soléaire).', 'strength', ['calves'], ['footAndAnkle'],
    { eq: ['Machine mollets assis'], diff: 1, tech: 1, cues: ['Amplitude complète', 'Pause en haut'], err: ['Rebond en bas'] }),
  ex('spanish_squat', 'Spanish squat', 'Squat isométrique retenu par une sangle.', 'isometric', ['quadriceps'], ['glutes'],
    { eq: ['Sangle'], diff: 1, tech: 1, cues: ['Tibias verticaux', 'Respirer'], err: ['Descendre trop bas'], rep: ['wall_sit'], src: PRACT, timed: true }),
  ex('wall_sit', 'Chaise isométrique', 'Maintien dos au mur.', 'isometric', ['quadriceps'], [], { diff: 1, tech: 1, cues: ['Genoux au-dessus des chevilles'], err: ['Mains sur les cuisses'], rep: ['spanish_squat'], src: PRACT, timed: true }),
  ex('single_leg_balance', 'Proprioception unipodale', 'Équilibre sur un pied ; yeux fermés si sécurité.', 'proprioception', ['footAndAnkle'], ['calves', 'glutes'],
    { diff: 1, tech: 1, cues: ['Pied tripode', 'Genou souple', 'Yeux fermés près d\'un appui'], err: ['Verrouiller le genou'], src: PRACT, uni: true, timed: true }),
  ex('toe_walk', 'Marche sur pointes', 'Marche sur l\'avant-pied.', 'foot', ['calves', 'footAndAnkle'], [], { diff: 1, tech: 1, cues: ['Talons hauts'], src: PRACT, timed: true }),
  ex('heel_walk', 'Marche sur talons', 'Marche orteils relevés.', 'foot', ['footAndAnkle'], [], { diff: 1, tech: 1, cues: ['Orteils relevés'], src: PRACT, timed: true }),
  ex('lateral_foot_walk', 'Marche sur bords externes', 'Appui sur le bord externe du pied.', 'foot', ['footAndAnkle'], [], { diff: 1, tech: 1, cues: ['Pas lents'], src: PRACT, timed: true }),
  ex('toe_drills', 'Travail des orteils', 'Écarter, lever, presser les orteils.', 'foot', ['footAndAnkle'], [], { diff: 1, tech: 1, cues: ['Mouvements lents et isolés'], src: PRACT, timed: true }),
  ex('ankle_dorsiflexion', 'Flexion dorsale de cheville', 'Genou vers le mur, talon au sol.', 'mobility', ['footAndAnkle', 'calves'], [], { diff: 1, tech: 1, cues: ['Talon collé au sol'], src: PRACT, uni: true, timed: true }),
  ex('active_psoas_stretch', 'Étirement actif du psoas', 'Fente basse, rétroversion, fessier arrière contracté.', 'mobility', ['hipFlexors'], ['glutes'], { diff: 1, tech: 1, cues: ['Rétroversion du bassin'], src: PRACT, uni: true, timed: true }),
  ex('hip_mobility', 'Mobilité des hanches', 'Cercles et rotations contrôlés.', 'mobility', ['glutes', 'hipFlexors', 'adductors'], [], { diff: 1, tech: 1, cues: ['Amplitude progressive'], src: PRACT, timed: true }),
  ex('hip_90_90', 'Mobilité 90/90', 'Rotations assis jambes à 90°.', 'mobility', ['glutes', 'hipFlexors'], [], { diff: 1, cues: ['Buste droit'], src: PRACT, timed: true }),
  ex('posterior_chain_mobility', 'Mobilité chaîne postérieure', 'Charnières et étirements actifs.', 'mobility', ['hamstrings', 'lowerBack'], [], { diff: 1, tech: 1, cues: ['Dos long'], src: PRACT, timed: true }),
  ex('thoracic_mobility', 'Mobilité thoracique', 'Rotations et extensions du haut du dos.', 'mobility', ['upperBack'], [], { diff: 1, tech: 1, cues: ['Bassin fixe'], src: PRACT, timed: true })
  ,
  ex('standing_military_press', 'Développé militaire', 'Poussée verticale debout à la barre ou aux haltères.', 'strength', ['frontDelts', 'sideDelts'], ['triceps', 'upperBack', 'abdominals'],
    { joints: ['Épaule', 'Coude'], eq: ['Barre ou haltères'], diff: 3, cues: ['Fessiers et abdos serrés', 'Barre qui monte au ras du visage', 'Tête qui passe sous la barre en haut'], err: ['Cambrure lombaire', 'Pousser devant soi'], rep: ['seated_shoulder_press'] }),
  ex('cable_fly', 'Écartés poulie', 'Adduction horizontale à la poulie, tension continue sur les pectoraux.', 'strength', ['chest'], ['frontDelts'],
    { eq: ['Poulies vis-à-vis'], diff: 1, tech: 1, cues: ['Coudes légèrement fléchis et fixes', 'Mains qui se rejoignent devant le sternum', 'Retour lent'], err: ['Transformer en développé', 'Amplitude excessive vers l\'arrière'], vars: ['Poulie basse vers haute pour le haut des pectoraux'], rep: ['incline_db_press'] }),
  ex('overhead_triceps_extension', 'Extension triceps', 'Extension des coudes bras au-dessus de la tête (poulie ou haltère).', 'strength', ['triceps'], [],
    { eq: ['Poulie ou haltère'], diff: 1, tech: 1, cues: ['Coudes serrés et fixes', 'Étirement complet en bas', 'Verrouiller sans à-coup'], err: ['Coudes qui s\'écartent', 'Dos cambré'], vars: ['Barre au front', 'Poulie haute à la corde'], rep: ['triceps_pushdown'] }),
  ex('incline_db_curl', 'Curl incliné', 'Curl haltères sur banc incliné, biceps en position étirée.', 'strength', ['biceps'], ['forearms'],
    { eq: ['Haltères', 'Banc incliné 45–60°'], diff: 1, tech: 1, cues: ['Épaules collées au dossier', 'Bras qui pendent verticalement', 'Descente lente'], err: ['Avancer les coudes', 'Élan'], rep: ['biceps_curl'] }),
  ex('step_up', 'Step-up sur banc', 'Montée unilatérale sur banc, poussée par la jambe d\'appui.', 'strength', ['quadriceps', 'glutes'], ['hamstrings', 'calves'],
    { eq: ['Banc ou box (genou ≈ 90°)', 'Haltères'], diff: 2, cues: ['Pied entier sur le banc', 'Pousser avec la jambe haute, pas d\'impulsion de la jambe basse', 'Redescendre en contrôle'], err: ['Rebond sur le pied arrière', 'Genou qui rentre'], vars: ['Descente lente (excentrique)'], rep: ['bulgarian_split_squat', 'eccentric_step_down'], uni: true }),
  ex('single_leg_calf_raise', 'Mollets debout unilatéral', 'Montée sur pointe d\'un pied, genou tendu (gastrocnémiens).', 'strength', ['calves'], ['footAndAnkle'],
    { eq: ['Marche', 'Haltère'], diff: 1, tech: 1, tempo: '1-1-3-0', cues: ['Amplitude complète, talon sous la marche', 'Pause 1 s en haut', 'Descente en 3 s'], err: ['Rebond', 'Plier le genou'], vars: ['Lesté'], rep: ['seated_calf_raise'], uni: true }),
  ex('side_plank', 'Gainage latéral', 'Planche latérale sur l\'avant-bras.', 'core', ['obliques'], ['glutes', 'abdominals'],
    { diff: 1, tech: 1, cues: ['Épaule au-dessus du coude', 'Corps aligné', 'Hanche haute'], err: ['Bassin qui tombe ou recule'], rep: ['side_plank_abduction'], src: PRACT, uni: true, timed: true }),
  ex('tibialis_raise', 'Tibialis raises', 'Relevé de la pointe des pieds dos au mur (jambier antérieur).', 'foot', ['footAndAnkle'], [],
    { eq: ['Mur', 'Éventuellement poids sur le pied'], diff: 1, tech: 1, cues: ['Fesses au mur, pieds à 30–50 cm', 'Relever les orteils au maximum', 'Descente lente'], err: ['Plier les genoux', 'Amplitude partielle'], src: PRACT }),
  ex('short_foot', 'Travail de voûte plantaire', 'Pied court, rassembler la voûte sans crisper les orteils ; serviette, bille.', 'foot', ['footAndAnkle'], [],
    { diff: 1, tech: 1, cues: ['Rapprocher l\'avant-pied du talon', 'Orteils détendus', 'Assis, puis debout, puis unipodal'], err: ['Griffer avec les orteils'], src: PRACT, timed: true }),
  ex('countermovement_jump', 'Sauts verticaux', 'Saut vertical avec contre-mouvement, réception amortie.', 'plyometric', ['quadriceps', 'glutes', 'calves'], ['hamstrings'],
    { diff: 2, cues: ['Bras actifs', 'Extension complète hanches-genoux-chevilles', 'Réception silencieuse, genoux dans l\'axe', 'Récupération complète entre les sauts'], err: ['Enchaîner fatigué', 'Genoux qui rentrent à la réception'], rep: ['box_jump'] }),
  ex('broad_bounds', 'Bonds horizontaux contrôlés', 'Bonds vers l\'avant, réception stabilisée sur deux pieds.', 'plyometric', ['glutes', 'quadriceps', 'calves'], ['hamstrings'],
    { diff: 2, cues: ['Tenir la réception 2 s', 'Qualité avant distance', 'Surface non glissante'], err: ['Réception raide', 'Chercher la distance maximale'], vars: ['Bonds alternés quand la technique est acquise'], rep: ['countermovement_jump'], src: PRACT })
];

// ----- Séances types -----
const R = (a, b = a) => [a, b];
const X = (id, sets, o = {}) => Object.assign({ id, sets }, o);
const B = (title, kind, o = {}) => Object.assign({ title, kind, dur: null, iv: [], ex: [], notes: [] }, o);
const I = (reps, o) => Object.assign({ reps }, o);
const T = (id, title, kind, intensity, o = {}) => Object.assign({ id, title, kind, intensity, dur: null, dist: null, up: null, obj: '', blocks: [], notes: [], leg: [], toLog: false }, o);

const upperA = [
  B('Dos', 'strength', { ex: [X('pullup_pronated', 4, { reps: R(6, 10), rest: 120, note: 'Lestées lorsque le niveau le permet' }), X('row_barbell_db', 3, { reps: R(8, 12), rest: 90 })] }),
  B('Épaules', 'strength', { ex: [X('lateral_raise', 4, { reps: R(12, 20), ss: 'Épaules' }), X('face_pull', 3, { reps: R(15, 20), ss: 'Épaules', note: 'Ou oiseau' })], notes: ['Supersets lorsque les séries sont compatibles'] }),
  B('Bras', 'strength', { ex: [X('biceps_curl', 3, { reps: R(8, 12) }), X('hammer_curl', 2, { reps: R(10, 15) })] }),
  B('Core', 'strength', { ex: [X('hanging_leg_raise', 3, { reps: R(10, 15) }), X('pallof_press', 3, { reps: R(12), side: true })] })
];
const upperB = [
  B('Pectoraux', 'strength', { ex: [X('bench_press', 4, { reps: R(6, 10) }), X('incline_db_press', 3, { reps: R(8, 12) })] }),
  B('Épaules', 'strength', { ex: [X('seated_shoulder_press', 3, { reps: R(8, 12) }), X('lateral_raise', 3, { reps: R(12, 20) })] }),
  B('Triceps', 'strength', { ex: [X('triceps_pushdown', 3, { reps: R(10, 15) })] }),
  B('Mollets et proprioception', 'strength', { ex: [X('seated_calf_raise', 4, { reps: R(12, 15), note: 'Genoux fléchis, charge élevée adaptée' }), X('single_leg_balance', 2, { durS: R(45), side: true, note: 'Yeux fermés si la sécurité le permet' })] })
];
const upperC = [
  B('Superset haut 1', 'strength', { ex: [X('lat_pulldown', 3, { reps: R(8, 12), ss: 'Haut 1', note: 'Ou tractions neutres' }), X('chest_press', 3, { reps: R(8, 12), ss: 'Haut 1', note: 'Ou pompes lestées / dips' })] }),
  B('Superset haut 2', 'strength', { ex: [X('seated_row', 3, { reps: R(10, 12), ss: 'Haut 2' }), X('lateral_raise', 3, { reps: R(15, 20), ss: 'Haut 2' })] }),
  B('Superset bras', 'strength', { ex: [X('biceps_curl', 3, { reps: R(10, 15), ss: 'Bras' }), X('triceps_pushdown', 3, { reps: R(10, 15), ss: 'Bras' })] })
];
const legsC = B('Jambes et core', 'strength', { ex: [X('single_leg_rdl', 3, { reps: R(8, 10), side: true }), X('box_jump', 3, { reps: R(6), note: 'Ou fentes sautées ; explosif' }), X('plank', 3, { durS: R(45, 60), note: 'Ou ab wheel' })] });
const legsCNoPlyo = B('Jambes et core (sans pliométrie)', 'strength', { ex: [X('single_leg_rdl', 3, { reps: R(8, 10), side: true }), X('plank', 3, { durS: R(45, 60) })] });
const hipAnkle = B('Mobilité', 'mobility', { ex: [X('ankle_dorsiflexion', 1, { side: true }), X('active_psoas_stretch', 1, { side: true }), X('hip_mobility', 1)] });

const SESSION_TEMPLATES = [
  T('str_A', 'Musculation A — dos, épaules, biceps, core', 'strength', 'moderate', { dur: R(50, 60), obj: 'Dos, largeur d\'épaules, biceps, gainage', blocks: upperA }),
  T('str_B', 'Musculation B — pectoraux, épaules, triceps, mollets', 'strength', 'moderate', { dur: R(50, 60), obj: 'Haut du corps, mollets, proprioception', blocks: upperB, leg: ['heavyStrength'] }),
  T('str_C', 'Musculation C — carrure, jambes 2, core', 'strength', 'moderate', { dur: R(50, 60), obj: 'Hypertrophie, chaîne postérieure, réactivité', blocks: [...upperC, legsC], notes: ['Pliométrie la veille de la sortie longue : à surveiller'], leg: ['plyometric', 'heavyStrength'] }),
  T('str_C_noplyo', 'Musculation C — sans pliométrie', 'strength', 'moderate', { dur: R(45, 55), obj: 'Haut du corps et chaîne postérieure sans pliométrie', blocks: [...upperC, legsCNoPlyo], leg: ['heavyStrength'] }),
  T('str_C_upper', 'Musculation C — haut du corps', 'strength', 'moderate', { dur: R(40, 50), obj: 'Haut du corps uniquement', blocks: [...upperC, B('Core', 'strength', { ex: [X('plank', 3, { durS: R(45, 60) })] })] }),
  T('str_upper_maintenance', 'Haut du corps — entretien', 'strength', 'easy', { dur: R(30, 40), obj: 'Maintenir sans fatiguer', blocks: [B('Entretien', 'strength', { ex: [X('pullup_pronated', 2, { reps: R(6, 10) }), X('bench_press', 2, { reps: R(6, 10) }), X('row_barbell_db', 2, { reps: R(8, 12) }), X('lateral_raise', 2, { reps: R(12, 20) })] })], notes: ['Choix de programmation proposé, modifiable'] }),
  T('am_tuesday', 'Tapis incliné, jambes 1 et mobilité', 'strength', 'moderate', { dur: R(55, 65), obj: 'Force excentrique et préparation au dénivelé',
    blocks: [B('Tapis incliné', 'main', { dur: R(25), iv: [I(R(1), { durS: R(1500), int: 'Marche rapide ou trot très léger, 6–6,5 km/h', grade: R(15) })], notes: ['≈ 350–400 m D+ si le tapis le permet', 'D+ estimé ≠ D+ fourni par l\'appareil'] }),
      B('Force et excentrique', 'strength', { ex: [X('bulgarian_split_squat', 3, { reps: R(6, 8), side: true, tempo: 'Descente 3 s, remontée dynamique' }), X('eccentric_step_down', 3, { reps: R(8, 10), side: true, tempo: 'Descente 4 s' }), X('single_leg_glute_bridge', 3, { reps: R(10), side: true, tempo: 'Verrouillage 1 s', note: 'Ou hip thrust' })] }), hipAnkle],
    leg: ['eccentric', 'heavyStrength'] }),
  T('am_thursday', 'Mobilité, pieds, isométrie et gainage', 'mobility', 'easy', { dur: R(50), obj: 'Préparation tendineuse et mobilité',
    blocks: [B('Mobilité', 'mobility', { dur: R(30), ex: [X('posterior_chain_mobility', 1), X('hip_mobility', 1, { note: 'Ouverture de hanches' }), X('hip_90_90', 1), X('thoracic_mobility', 1), X('ankle_dorsiflexion', 1, { side: true })] }),
      B('Pieds, isométrie, préactivation', 'strength', { dur: R(20), ex: [X('toe_walk', 1), X('heel_walk', 1), X('lateral_foot_walk', 1), X('toe_drills', 1), X('spanish_squat', 3, { durS: R(35, 40), note: 'Ou chaise isométrique' }), X('side_plank_abduction', 3, { durS: R(30), side: true })] })],
    notes: ['Les exercices isométriques ne sont pas présentés comme un traitement d\'une douleur tendineuse'] }),
  T('mob_hips_ankles', 'Mobilité hanches et chevilles', 'mobility', 'recovery', { obj: 'Mobilité de cheville, psoas, hanches', blocks: [hipAnkle] }),
  T('run_hill_threshold_A', 'Seuil en côte — montée sèche (sem. A)', 'run', 'threshold', { obj: 'Puissance en montée',
    blocks: [B('Échauffement', 'warmup', { dur: R(20) }), B('Montées au seuil', 'main', { iv: [I(R(3, 4), { durS: R(360, 480), int: 'Seuil, montée régulière', grade: R(8, 12), rec: 'En redescendant souplement' })] }), B('Retour au calme', 'cooldown', { dur: R(10) })] }),
  T('run_hill_threshold_B', 'Seuil en côte — montée et descente (sem. B)', 'run', 'threshold', { dur: R(63), obj: 'Spécifique montée / descente',
    blocks: [B('Échauffement', 'warmup', { dur: R(20) }), B('Montée / descente', 'main', { iv: [I(R(3), { durS: R(300), int: 'Montée au seuil' }), I(R(3), { durS: R(180), int: 'Descente engagée mais maîtrisée', rec: '3 min en bas' })] }), B('Retour au calme', 'cooldown', { dur: R(10) })],
    notes: ['La descente engagée n\'est jamais une consigne de vitesse maximale'], leg: ['downhill'] }),
  T('run_ef_hilly_sprints', 'EF vallonnée et sprints en côte', 'run', 'easy', { dur: R(35, 50), obj: 'Endurance fondamentale et explosivité',
    blocks: [B('Footing vallonné', 'main', { dur: R(35, 50), notes: ['Terrain souple si possible', 'Marcher dans les côtes si nécessaire'] }), B('Sprints en côte', 'main', { iv: [I(R(6, 8), { durS: R(10), int: 'Sprint', grade: R(10, 15), rec: '1 min 30 en marchant ou plus' })], notes: ['Seulement si fraîcheur et technique le permettent'] })], leg: ['sprints'] }),
  T('bike_z1', 'Home-trainer zone 1', 'bike', 'recovery', { dur: R(30, 40), obj: 'Récupération active facultative', blocks: [B('Pédalage', 'main', { dur: R(30, 40), notes: ['< 55–60 % FTP ou < 70 % FCmax', '85–95 rpm'] })], notes: ['Si la fatigue est élevée, le repos complet est préférable'] }),
  T('track_club', 'Séance piste du club', 'track', 'mixed', { obj: 'VMA, rythme ou lactique selon le club', notes: ['Contenu à saisir après la séance : rien n\'est inventé'], toLog: true }),
  T('trail_long_endurance', 'Sortie longue trail — endurance', 'trailRun', 'easy', { dur: R(90, 150), obj: 'Endurance, D+, D−, résistance musculaire', blocks: [B('Sortie', 'main', { notes: ['Dénivelé progressif', 'Alternance course / marche rapide', 'Mains sur les cuisses au-delà de ~15 %', 'Pose de pied en descente'] })], leg: ['longRun', 'downhill'] }),
  T('trail_long_specific', 'Sortie longue trail — spécifique', 'trailRun', 'mixed', { dur: R(90, 150), obj: 'Endurance avec blocs tempo en montée', blocks: [B('Sortie', 'main', { iv: [I(R(2), { durS: R(900, 1200), int: 'Tempo dans les longues montées' })], notes: ['Technique de descente'] })], leg: ['longRun', 'downhill'] }),
  T('cross_recovery', 'Récupération croisée', 'crossTraining', 'recovery', { obj: 'Vélo souple, randonnée, ski, mobilité ou repos', notes: ['Enregistre le type de récupération effectué'] }),
  T('rest', 'Repos complet', 'rest', 'rest', { obj: 'Le repos fait partie de la programmation' }),
  T('run_easy_reprise', 'Footing facile de reprise', 'run', 'easy', { obj: 'Reprise progressive', notes: ['Durée augmentée progressivement'] }),
  T('run_threshold_optional', 'Seuil (si récupération)', 'run', 'threshold', { obj: 'Réintroduire le seuil si la récupération le permet', notes: ['Format non précisé : à saisir'], toLog: true }),
  T('long_reprise', 'Sortie longue de reprise', 'run', 'easy', { dur: R(60, 75), obj: 'Sortie longue initiale' }),
  T('run_easy45', 'Footing facile 45 min', 'run', 'easy', { dur: R(45), obj: 'Endurance fondamentale' }),
  T('run_400s', 'Fractionné 8 × 400 m', 'track', 'vo2', { obj: 'Vitesse en phase de base', blocks: [B('Répétitions', 'main', { iv: [I(R(8), { distM: 400, int: 'Repère 1:25–1:32', rec: '1 min 15 à 1 min 30' })] })] }),
  T('run_threshold_base', 'Seuil 3 × 10 min (sem. B)', 'run', 'threshold', { obj: 'Seuil en remplacement du fractionné', blocks: [B('Seuil', 'main', { iv: [I(R(3), { durS: R(600), int: 'Seuil' })] })] }),
  T('run_easy_strides', 'Footing et accélérations', 'run', 'easy', { dur: R(45, 55), obj: 'Endurance et relâchement', blocks: [B('Footing', 'main', { dur: R(45, 55) }), B('Accélérations', 'main', { iv: [I(R(6), { durS: R(15, 20), int: 'Accélération progressive' })] })] }),
  T('long_base', 'Sortie longue 1 h 15 – 1 h 45', 'run', 'easy', { dur: R(75, 105), obj: 'Base aérobie', leg: ['longRun'] }),
  T('run_threshold_3x10', 'Seuil 3 × 10 min (sem. A)', 'run', 'threshold', { obj: 'Qualité marathon', blocks: [B('Seuil', 'main', { iv: [I(R(3), { durS: R(600), int: 'Seuil' })] })] }),
  T('run_5x1km', '5 × 1 km (sem. B)', 'run', 'threshold', { obj: 'Qualité marathon', blocks: [B('Répétitions', 'main', { iv: [I(R(5), { distM: 1000, int: 'Selon le format choisi' })] })] }),
  T('run_easy50', 'Footing 50 min', 'run', 'easy', { dur: R(50), obj: 'Endurance' }),
  T('long_marathon', 'Sortie longue marathon', 'run', 'mixed', { dur: R(105, 150), obj: 'Endurance spécifique marathon', blocks: [B('Sortie longue', 'main', { notes: ['Blocs allure marathon (4:58 /km indicatif) intégrés progressivement'] })], leg: ['longRun'] }),
  T('run_easy_taper', 'Footing facile d\'affûtage', 'run', 'easy', { obj: 'Entretien sans fatigue', notes: ['Volume réduit'] }),
  T('walk_recovery', 'Marche et mobilité', 'walk', 'recovery', { obj: 'Récupération active' }),
  T('run_easy_return', 'Footing facile de reprise', 'run', 'easy', { obj: 'Reprise après compétition', notes: ['Seulement si les critères de récupération sont satisfaits'] }),
  T('run_hills_8x', 'Côtes 8 × 60–90 s', 'run', 'vo2', { obj: 'Puissance en montée', blocks: [B('Côtes', 'main', { iv: [I(R(8), { durS: R(60, 90), int: 'Côte' })] })] }),
  T('run_easy45_60', 'Footing 45–60 min', 'run', 'easy', { dur: R(45, 60), obj: 'Endurance' }),
  T('run_easy_hilly', 'EF vallonnée', 'run', 'easy', { dur: R(35, 50), obj: 'Endurance sans sprints' }),
  T('trail_long_controlled', 'Sortie trail longue sans épuisement', 'trailRun', 'easy', { obj: 'Maintien aérobie', leg: ['longRun', 'downhill'] }),
  T('trail_occ_weekend', 'Week-end spécifique OCC', 'trailRun', 'mixed', { obj: 'Dernier gros week-end spécifique', notes: ['Seulement si la récupération de l\'UT4M le permet'], leg: ['longRun', 'downhill'] })
];

// ----- Semaine type 2026-2027 : 4 haut du corps + 2 renfo course/trail + 4–5 sorties -----
const RIR_NOTE = 'Garder 1 à 3 répétitions en réserve : pas de série à l\'échec';
const upA = [B('Dos', 'strength', { ex: [X('pullup_pronated', 4, { reps: R(6, 8), rest: 150, note: 'Lestées' }), X('row_barbell_db', 3, { reps: R(8, 10), rest: 120 }), X('lat_pulldown', 3, { reps: R(10, 12), rest: 90 })] }),
  B('Épaules', 'strength', { ex: [X('lateral_raise', 4, { reps: R(15), rest: 60, ss: 'Épaules' }), X('rear_delt_fly', 3, { reps: R(15), rest: 60, ss: 'Épaules' })] }),
  B('Biceps', 'strength', { ex: [X('biceps_curl', 3, { reps: R(12), rest: 75 })] })];
const upB = [B('Pectoraux', 'strength', { ex: [X('incline_db_press', 4, { reps: R(8, 10), rest: 150, note: 'Priorité au haut des pectoraux' }), X('bench_press', 3, { reps: R(8, 10), rest: 150 })] }),
  B('Épaules', 'strength', { ex: [X('standing_military_press', 3, { reps: R(8, 10), rest: 120 }), X('lateral_raise', 3, { reps: R(15), rest: 60 })] }),
  B('Triceps', 'strength', { ex: [X('overhead_triceps_extension', 3, { reps: R(12), rest: 75 })] })];
const upC = [B('Tirages et poussée', 'strength', { ex: [X('pullup_pronated', 3, { reps: R(8), rest: 120 }), X('seated_row', 3, { reps: R(10), rest: 90, note: 'Rowing poulie' }), X('incline_db_press', 3, { reps: R(10), rest: 120 })] }),
  B('Épaules', 'strength', { ex: [X('lateral_raise', 3, { reps: R(15), rest: 60, ss: 'Épaules' }), X('face_pull', 3, { reps: R(15), rest: 60, ss: 'Épaules' })] }),
  B('Bras', 'strength', { ex: [X('biceps_curl', 2, { reps: R(12), rest: 60, ss: 'Bras' }), X('triceps_pushdown', 2, { reps: R(12), rest: 60, ss: 'Bras' })] })];
const upD = [B('Épaules et bras', 'strength', { ex: [X('lateral_raise', 4, { reps: R(15), rest: 60 }), X('rear_delt_fly', 3, { reps: R(15), rest: 60 }), X('incline_db_curl', 3, { reps: R(12), rest: 60, ss: 'Bras' }), X('overhead_triceps_extension', 3, { reps: R(12), rest: 60, ss: 'Bras' })] })];
const r1 = (trail) => [B('Force unilatérale', 'strength', { ex: [X('bulgarian_split_squat', 3, { reps: R(8), side: true, rest: 90, tempo: 'Descente 3 s, remontée dynamique' }), X('single_leg_rdl', 3, { reps: R(8), side: true, rest: 90 }),
    trail ? X('eccentric_step_down', 3, { reps: R(8, 10), side: true, rest: 75, tempo: 'Descente 4 s', note: 'Variante trail : excentrique quadriceps pour les descentes (à la place du step-up)' }) : X('step_up', 3, { reps: R(10), side: true, rest: 75 })] }),
  B('Mollets et gainage', 'strength', { ex: [X('single_leg_calf_raise', 3, { reps: R(12), side: true, rest: 45, tempo: '1-1-3-0' }), X('side_plank', 3, { durS: R(40), side: true, rest: 30 })] })];
const r2 = (plyo) => [B('Pieds et chevilles', 'strength', { ex: [X('tibialis_raise', 3, { reps: R(20), rest: 45 }), X('seated_calf_raise', 3, { reps: R(15), rest: 45, note: 'Genoux fléchis : soléaire' }), X('short_foot', 3, { durS: R(30), rest: 20 })] }),
  ...(plyo ? [B('Explosivité (variante)', 'strength', { ex: [X('countermovement_jump', 3, { reps: R(5), rest: 90 }), X('broad_bounds', 3, { reps: R(5), rest: 90 })], notes: ['Qualité maximale, récupération complète : arrêter dès que les réceptions se dégradent'] })] : []),
  B('Stabilité', 'strength', { ex: [X('single_leg_balance', 3, { durS: R(40), side: true, rest: 20 })] }),
  B('Mobilité chevilles et hanches', 'mobility', { dur: R(10), ex: [X('ankle_dorsiflexion', 1, { side: true }), X('hip_mobility', 1)] })];
SESSION_TEMPLATES.push(
  T('up_A', 'Haut du corps A — dos, épaules, biceps', 'strength', 'moderate', { dur: R(55, 65), obj: 'Largeur du dos et des épaules, biceps', blocks: upA, notes: [RIR_NOTE] }),
  T('up_B', 'Haut du corps B — pectoraux, épaules, triceps', 'strength', 'moderate', { dur: R(55, 65), obj: 'Haut des pectoraux, épaules, triceps', blocks: upB, notes: [RIR_NOTE] }),
  T('up_C', 'Haut du corps C — complet', 'strength', 'moderate', { dur: R(50, 60), obj: 'Haut du corps complet, volume réparti', blocks: upC, notes: [RIR_NOTE] }),
  T('up_D', 'Haut du corps D — épaules et bras (facultative)', 'strength', 'easy', { dur: R(35, 45), obj: 'Volume complémentaire sans chercher à épuiser les muscles', blocks: upD, notes: ['Séance courte et facultative', RIR_NOTE] }),
  T('leg_1', 'Renfo course 1 — force et résistance', 'strength', 'moderate', { dur: R(45, 55), obj: 'Force unilatérale, stabilité du bassin, propulsion', blocks: r1(false), leg: ['heavyStrength'], notes: ['Pas la veille d\'une séance de qualité ou d\'une sortie longue'] }),
  T('leg_1_trail', 'Renfo course 1 — force et excentrique trail', 'strength', 'moderate', { dur: R(45, 55), obj: 'Force unilatérale et excentrique pour les descentes', blocks: r1(true), leg: ['heavyStrength', 'eccentric'], notes: ['L\'excentrique s\'ajoute progressivement, en tenant compte du D− des sorties longues'] }),
  T('leg_2', 'Renfo course 2 — pieds, chevilles, mollets, mobilité', 'strength', 'easy', { dur: R(35, 45), obj: 'Pieds, chevilles, mollets, stabilité, mobilité', blocks: r2(false) }),
  T('leg_2_plyo', 'Renfo course 2 — avec explosivité (variante)', 'strength', 'moderate', { dur: R(40, 50), obj: 'Ajoute sauts verticaux et bonds pour la réactivité', blocks: r2(true), leg: ['plyometric'] }),
  T('leg_2_noplyo', 'Renfo course 2 — pieds et chevilles', 'strength', 'easy', { dur: R(35, 45), obj: 'Pieds, chevilles, mollets, stabilité, mobilité', blocks: r2(false) }),
  T('run_recovery_30', 'Footing de récupération 30–45 min', 'run', 'recovery', { dur: R(30, 45), obj: 'Cinquième sortie, uniquement si tu récupères correctement', notes: ['Très facile ; à remplacer par du repos au moindre doute'] }),
  T('run_easy_ef', 'Endurance fondamentale 45–60 min', 'run', 'easy', { dur: R(45, 60), obj: 'Aisance respiratoire' }),
  T('run_ef_30_40', 'EF 30–40 min', 'run', 'easy', { dur: R(30, 40), obj: 'Endurance fondamentale courte' }),
  T('run_threshold_10k', 'Seuil — spécifique 10 km', 'run', 'threshold', { obj: '3 × 2 000 m ou 4 × 1 500 m au seuil', blocks: [B('Échauffement', 'warmup', { dur: R(15, 20), notes: ['Footing + quelques accélérations'] }),
      B('Seuil', 'main', { iv: [I(R(3), { distM: 2000, int: 'Seuil', rec: 'À définir (ex. 2 min trot)' })], notes: ['Ou 4 × 1 500 m au seuil (semaine B)'] }), B('Retour au calme', 'cooldown', { dur: R(10, 15) })] }),
  T('run_threshold_10k_b', 'Seuil — 4 × 1 500 m', 'run', 'threshold', { obj: '4 × 1 500 m au seuil', blocks: [B('Échauffement', 'warmup', { dur: R(15, 20) }), B('Seuil', 'main', { iv: [I(R(4), { distM: 1500, int: 'Seuil', rec: 'À définir (ex. 1 min 30 trot)' })] }), B('Retour au calme', 'cooldown', { dur: R(10, 15) })] }),
  T('track_800', 'Piste — spécialité 800 m', 'track', 'mixed', { obj: 'Travail spécifique 800 m', blocks: [B('Séance', 'main', { notes: ['Contenu de la séance à saisir après coup (répétitions, allures, récupérations) : rien n\'est inventé'] })], toLog: true }),
  T('treadmill_incline', 'Côtes sur tapis incliné', 'treadmill', 'moderate', { dist: R(4, 10), obj: 'Progression vers 10 km à 10 % de pente', blocks: [B('Montée', 'main', { notes: ['Pente 10 %', 'Allonger la distance progressivement d\'une semaine à l\'autre, vers 10 km', 'Note la distance et la pente dans le contenu réel'] })], toLog: true, leg: ['uphill'] }),
  T('long_ef_trail', 'Sortie longue route / trail 1 h 15 – 2 h', 'run', 'easy', { dur: R(75, 120), obj: 'Majoritairement en EF, dénivelé progressif', blocks: [B('Sortie', 'main', { notes: ['Route ou sentier', 'Dénivelé progressif', 'Travail de descente et de technique trail', 'Majoritairement en endurance fondamentale'] })], leg: ['longRun', 'downhill'] })
);

// ----- Semaines types -----
const P = (slot, a, o = {}) => Object.assign({ slot, a, b: null, alt: [], opt: false, cond: null }, o);
const L = { light: true };
const OPT = (o = {}) => Object.assign({ opt: true }, o);
const REC_COND = 'Uniquement si tu récupères correctement (sommeil, sensations, VFC)';
const WEEK_TEMPLATES = {
  'w-reprise': { name: 'Reprise après le semi', days: {
    1: [P('morning', 'up_A', L), P('evening', 'run_threshold_10k', OPT({ alt: ['run_easy_reprise'], cond: 'Seuil seulement si la récupération est complète ; sinon footing facile' }))],
    2: [P('morning', 'up_B', L), P('evening', 'run_easy_reprise')],
    3: [P('morning', 'leg_1', Object.assign({ cond: 'Reprise du renfo jambes : volume réduit' }, L)), P('evening', 'rest')],
    4: [P('morning', 'up_C', L), P('evening', 'track_800', OPT({ alt: ['run_easy_reprise'], cond: 'Piste seulement si la récupération est complète' }))],
    5: [P('morning', 'leg_2', L), P('evening', 'run_ef_30_40')],
    6: [P('morning', 'up_D', OPT(L)), P('evening', 'treadmill_incline', OPT({ alt: ['rest'], cond: 'Reprise : distance courte' }))],
    7: [P('day', 'long_reprise')] } },
  'w-base': { name: 'Semaine type', days: {
    1: [P('morning', 'up_A'), P('evening', 'run_threshold_10k', { b: 'run_threshold_10k_b' })],
    2: [P('morning', 'up_B'), P('evening', 'run_easy_ef')],
    3: [P('morning', 'leg_1'), P('evening', 'rest')],
    4: [P('morning', 'up_C'), P('evening', 'track_800', { alt: ['track_club', 'run_400s'] })],
    5: [P('morning', 'leg_2', { alt: ['leg_2_plyo'] }), P('evening', 'run_ef_30_40')],
    6: [P('morning', 'up_D', OPT()), P('evening', 'treadmill_incline', { alt: ['run_recovery_30', 'rest'], cond: 'Veille de sortie longue : rester en aisance' })],
    7: [P('day', 'long_ef_trail')] } },
  'w-marathon': { name: 'Préparation marathon', days: {
    1: [P('morning', 'up_A'), P('evening', 'run_threshold_10k', { b: 'run_threshold_10k_b', alt: ['run_threshold_3x10', 'run_5x1km'] })],
    2: [P('morning', 'up_B'), P('evening', 'run_easy_ef')],
    3: [P('morning', 'leg_1', { cond: 'Réduire si la fatigue augmente' }), P('evening', 'rest')],
    4: [P('morning', 'up_C'), P('evening', 'track_800', { alt: ['run_easy50', 'track_club'] })],
    5: [P('morning', 'leg_2'), P('evening', 'run_ef_30_40')],
    6: [P('morning', 'up_D', OPT()), P('evening', 'treadmill_incline', OPT({ alt: ['run_recovery_30', 'rest'], cond: 'Facultatif avant une sortie longue marathon' }))],
    7: [P('day', 'long_marathon')] } },
  'w-taper-road': { name: 'Affûtage route', days: {
    1: [P('morning', 'up_A', L), P('evening', 'run_easy_taper')],
    2: [P('morning', 'up_B', OPT(L)), P('evening', 'run_easy_strides', { alt: ['run_easy_taper'], cond: 'Quelques accélérations pour garder du rythme' })],
    3: [P('morning', 'leg_2', OPT(L)), P('evening', 'rest')],
    4: [P('morning', 'up_C', OPT(L)), P('evening', 'run_easy_taper')],
    5: [P('evening', 'rest')],
    6: [P('day', 'run_easy_taper')],
    7: [P('day', 'run_recovery_30', OPT({ alt: ['rest'] }))] } },
  'w-recovery': { name: 'Récupération post-marathon', days: {
    1: [P('morning', 'mob_hips_ankles'), P('evening', 'walk_recovery')],
    2: [P('morning', 'up_A', OPT(L)), P('evening', 'run_easy_return', OPT({ alt: ['walk_recovery', 'rest'], cond: 'Si les critères de récupération sont satisfaits' }))],
    3: [P('evening', 'walk_recovery')],
    4: [P('morning', 'up_B', OPT(L)), P('evening', 'run_easy_return', OPT({ alt: ['walk_recovery', 'rest'], cond: 'Si les critères de récupération sont satisfaits' }))],
    5: [P('morning', 'leg_2', OPT(L)), P('evening', 'rest')],
    6: [P('morning', 'up_C', OPT(L))],
    7: [P('day', 'run_easy_return', OPT({ alt: ['cross_recovery', 'rest'], cond: 'Si les critères de récupération sont satisfaits' }))] } },
  'w-trail': { name: 'Préparation trail', days: {
    1: [P('morning', 'up_A'), P('evening', 'run_threshold_10k', { b: 'run_threshold_10k_b', alt: ['run_hill_threshold_A', 'run_hill_threshold_B'] })],
    2: [P('morning', 'up_B'), P('evening', 'run_easy_ef')],
    3: [P('morning', 'leg_1_trail', { alt: ['leg_1'] }), P('evening', 'rest')],
    4: [P('morning', 'up_C'), P('evening', 'track_800', { alt: ['run_hills_8x', 'track_club'] })],
    5: [P('morning', 'leg_2'), P('evening', 'run_ef_30_40')],
    6: [P('morning', 'up_D', OPT()), P('evening', 'treadmill_incline', { cond: 'Veille de sortie longue : rester en aisance' })],
    7: [P('day', 'trail_long_endurance', { b: 'trail_long_specific', alt: ['long_ef_trail'] })] } },
  'w-ut4m-prep': { name: 'Préparation UT4M', days: {
    1: [P('morning', 'up_A'), P('evening', 'run_easy_ef')],
    2: [P('morning', 'up_B', L), P('evening', 'run_easy_hilly')],
    3: [P('morning', 'leg_1_trail', L), P('evening', 'rest')],
    4: [P('morning', 'up_C', L), P('evening', 'run_easy45_60')],
    5: [P('morning', 'leg_2'), P('evening', 'run_ef_30_40', OPT())],
    6: [P('morning', 'up_D', OPT(L)), P('evening', 'treadmill_incline', OPT({ alt: ['rest'], cond: 'Distance réduite' }))],
    7: [P('day', 'trail_long_controlled')] } },
  'w-taper-trail': { name: 'Affûtage trail', days: {
    1: [P('morning', 'up_A', L), P('evening', 'run_easy_taper')],
    2: [P('morning', 'up_B', OPT(L)), P('evening', 'run_easy_strides', OPT({ alt: ['run_easy_taper'], cond: 'Petite sollicitation d\'intensité éventuelle' }))],
    3: [P('morning', 'leg_2', OPT(L)), P('evening', 'rest')],
    4: [P('morning', 'mob_hips_ankles'), P('evening', 'run_easy_taper')],
    5: [P('evening', 'rest')],
    6: [P('day', 'run_easy_taper')],
    7: [P('day', 'rest')] } },
  'w-recovery-trail': { name: 'Récupération post-UT4M', days: {
    1: [P('day', 'walk_recovery')],
    2: [P('morning', 'mob_hips_ankles'), P('evening', 'run_easy_return', OPT({ alt: ['walk_recovery', 'rest'], cond: 'Selon les données de récupération' }))],
    3: [P('morning', 'up_A', OPT(L)), P('evening', 'walk_recovery')],
    4: [P('morning', 'up_B', OPT(L)), P('evening', 'run_easy_return', OPT({ alt: ['walk_recovery', 'rest'], cond: 'Selon les données de récupération' }))],
    5: [P('morning', 'leg_2', OPT(L))],
    6: [P('morning', 'up_C', OPT(L))],
    7: [P('day', 'run_easy_return', OPT({ alt: ['cross_recovery', 'rest'], cond: 'Selon les données de récupération' }))] } },
  'w-occ-prep': { name: 'Préparation OCC', days: {
    1: [P('morning', 'up_A'), P('evening', 'run_easy_ef', OPT())],
    2: [P('morning', 'up_B'), P('evening', 'run_easy_hilly')],
    3: [P('morning', 'leg_1_trail', L), P('evening', 'rest')],
    4: [P('morning', 'up_C'), P('evening', 'run_easy45_60')],
    5: [P('morning', 'leg_2', OPT()), P('evening', 'run_ef_30_40', OPT())],
    6: [P('morning', 'up_D', OPT()), P('evening', 'treadmill_incline', OPT({ alt: ['rest'] }))],
    7: [P('day', 'trail_occ_weekend', { alt: ['trail_long_controlled', 'long_ef_trail'], cond: 'Si la récupération de l\'UT4M et la progression le permettent' })] } },
  'w-taper-occ': { name: 'Affûtage OCC', days: {
    1: [P('morning', 'up_A', L), P('evening', 'run_easy_taper')],
    2: [P('morning', 'up_B', OPT(L)), P('evening', 'run_easy_strides', OPT({ alt: ['run_easy_taper'] }))],
    3: [P('morning', 'leg_2', OPT(L)), P('evening', 'rest')],
    4: [P('morning', 'up_C', OPT(L)), P('evening', 'run_easy_taper')],
    5: [P('evening', 'rest')],
    6: [P('day', 'run_easy_taper')],
    7: [P('day', 'rest')] } },
  'w-transition': { name: 'Transition', days: { 1: [P('day', 'walk_recovery')], 2: [P('day', 'rest')], 3: [P('day', 'walk_recovery')], 4: [P('morning', 'mob_hips_ankles')], 5: [P('morning', 'up_A', OPT(L))], 6: [P('day', 'walk_recovery')], 7: [P('day', 'rest')] } }
};

const WEEK_RULES = [
  'Ne pas transformer les 4 séances du haut du corps en 4 séances maximales : volume réparti, courbatures gérées',
  'Pas de séance de jambes lourde la veille d\'une séance de qualité ou d\'une sortie longue',
  'Garder au moins une journée sans contrainte sportive importante',
  'Augmenter progressivement le volume de musculation, surtout pour les deux séances de renfo',
  'Ajuster les séances de course selon la fatigue, le sommeil et les sensations',
  'Ne pas cumuler VMA, seuil, côtes et sortie longue exigeante toutes les semaines'
];


const PH = (id, name, kind, start, end, obj, week, o = {}) => Object.assign({ id, name, kind, start, end, obj, week, targets: [], cons: [], events: [], deload: null }, o);
const PHASES = [
  PH('p1-reprise', 'Reprise', 'Reprise', '2026-10-01', '2026-11-30', 'Finir de récupérer de la Backyard et du semi (1 h 28), puis installer la nouvelle semaine type', 'w-reprise', { targets: ['Même structure que la semaine type, en version allégée', 'Seuil du lundi et piste du jeudi seulement si la récupération est complète', 'Tapis incliné : distance courte', 'Sortie longue le dimanche 60–75 min'], cons: ['Ne pas démarrer directement la semaine complète', 'Augmenter le volume de musculation progressivement'], events: ['semi-2026-11-07'] }),
  PH('p2-base', 'Base aérobie', 'Base aérobie', '2026-12-01', '2027-01-31', 'Développer une base d\'endurance solide', 'w-base', { targets: ['Matin : musculation A, B, C (D facultative le samedi), renfo 1 mercredi, renfo 2 vendredi', 'Lundi seuil spécifique 10 km (3 × 2 000 m ou 4 × 1 500 m)', 'Mardi EF 45–60 min, jeudi piste 800 m, vendredi EF 30–40 min', 'Samedi côtes sur tapis incliné, vers 10 km à 10 %', 'Dimanche sortie longue route/trail 1 h 15 – 2 h'], cons: ['Pas de cumul systématique vitesse + seuil + sprints', 'Allègement toutes les 3–4 semaines si justifié'], deload: 4 }),
  PH('p3-marathon', 'Préparation marathon', 'Préparation marathon', '2027-02-01', '2027-04-04', 'Maintenir durablement l\'allure marathon', 'w-marathon', { targets: ['Haut du corps maintenu à 3–4 séances', 'Qualité mardi : 3 × 10 min seuil (A) ou 5 × 1 km (B)', 'Sortie longue dimanche 1 h 45 – 2 h 30 avec blocs allure marathon'], cons: ['Réduire les jambes si la fatigue augmente', 'Renfo 2 sans sauts avant une sortie longue clé'], deload: 4, events: ['semi-gresivaudan-2027', 'marathon-annecy-2027'] }),
  PH('p4-affutage-marathon', 'Affûtage marathon', 'Affûtage', '2027-04-05', '2027-04-17', 'Arriver frais au marathon d\'Annecy', 'w-taper-road', { targets: ['Footings faciles', 'Récupération'], cons: ['Pas de séance intense inutile'], events: ['marathon-annecy-2027'] }),
  PH('p5-post-marathon', 'Récupération post-marathon et Raid INP', 'Récupération', '2027-04-18', '2027-05-01', 'Récupérer ; Raid INP seulement si la récupération le permet', 'w-recovery', { cons: ['Réduction importante des jambes', 'Raid jamais à intensité maximale par défaut'], events: ['raid-inp-2027'] }),
  PH('p6-trail', 'Préparation trail', 'Préparation trail', '2027-05-02', '2027-06-30', 'Capacités spécifiques au trail', 'w-trail', { targets: ['Côtes mardi 8 × 60–90 s', 'Renfo 1 avec excentrique (descentes)', 'Sortie trail dimanche 1 h 30 – 2 h 30'], cons: ['Allègement avant le Grand Duc', 'Cascades = compétition de préparation', 'Excentrique dosé selon le D− des sorties longues'], deload: 4, events: ['cascades-alloix-2027', 'grand-duc-2027'] }),
  PH('p7-ut4m', 'Préparation UT4M', 'Préparation spécifique', '2027-07-01', '2027-07-07', 'Arriver préparé et récupéré à l\'UT4M', 'w-ut4m-prep', { cons: ['Pas d\'accumulation de grosses séances'], events: ['ut4m-80-2027'] }),
  PH('p8-ut4m-taper', 'Affûtage et UT4M', 'Affûtage', '2027-07-08', '2027-07-18', 'Volume réduit, nutrition, matériel, sommeil', 'w-taper-trail', { cons: ['Les 4 jours de l\'UT4M forment un ensemble d\'efforts successifs'], events: ['ut4m-80-2027'] }),
  PH('p9-post-ut4m', 'Récupération post-UT4M', 'Récupération', '2027-07-19', '2027-07-31', 'Marche, mobilité, reprise progressive', 'w-recovery-trail', { cons: ['Pas de fractionné immédiat'], events: ['ut4m-80-2027'] }),
  PH('p10-occ', 'Préparation OCC (conditionnelle)', 'Préparation spécifique', '2027-08-01', '2027-08-12', 'Préparer l\'OCC si la récupération de l\'UT4M le permet', 'w-occ-prep', { cons: ['Suspendue si les séquelles de l\'UT4M l\'imposent'], events: ['occ-2027'] }),
  PH('p11-occ-taper', 'Affûtage OCC', 'Affûtage', '2027-08-13', '2027-08-27', 'Fraîcheur avant l\'OCC', 'w-taper-occ', { cons: ['Pas de grosse séance de musculation', 'Pas de descente traumatisante'], events: ['occ-2027'] }),
  PH('p12-transition', 'Récupération de fin de saison', 'Transition', '2027-08-28', '2027-08-31', 'Récupérer après l\'OCC', 'w-transition', { events: ['occ-2027'] })
];

const EV = (id, name, start, o) => Object.assign({ id, name, start, end: start, discipline: 'road', distanceKm: null, upM: null, downM: null, format: '', target: null, priority: null, status: 'intended', effort: '', nutrition: '', taper: null, recovery: null, notes: '', debrief: '' }, o);
const SEED_EVENTS = [
  EV('semi-2026-11-07', 'Semi-marathon du 7 novembre', '2026-11-07', { distanceKm: 21.0975, priority: 'optional', status: 'completed', result: 5280, effort: 'Couru après la Backyard (12 boucles)', notes: 'Phase de reprise après la Backyard', debrief: '1 h 28 (secondes à préciser)' }),
  EV('semi-gresivaudan-2027', 'Semi-marathon du Grésivaudan', '2027-04-04', { distanceKm: 21.0975, priority: 'c', effort: 'Effort contrôlé : le marathon reste prioritaire' }),
  EV('marathon-annecy-2027', 'Marathon d\'Annecy', '2027-04-17', { distanceKm: 42.195, target: 12600, priority: 'a', effort: 'Allure indicative 4:58 /km, à recalibrer', taper: 12, recovery: 13, notes: 'Priorité A déduite des §4.3–4.4 (à valider)' }),
  EV('raid-inp-2027', 'Raid INP', '2027-05-01', { discipline: 'raid', priority: 'optional', status: 'conditional', effort: 'Pas d\'intensité maximale par défaut' }),
  EV('cascades-alloix-2027', 'Courses des Cascades de l\'Alloix', '2027-05-30', { discipline: 'trail', distanceKm: 20, format: '20 km', priority: 'c', effort: 'Compétition de préparation trail' }),
  EV('grand-duc-2027', 'Trail du Grand Duc', '2027-06-27', { discipline: 'trail', format: 'Moyen ou relais, à déterminer', status: 'toConfirm', notes: 'Allègement avant la course, durée à définir' }),
  EV('ut4m-80-2027', 'UT4M 80 Challenge', '2027-07-15', { end: '2027-07-18', discipline: 'trail', format: 'Challenge en plusieurs jours', priority: 'a', effort: 'Ensemble d\'efforts successifs', taper: 7, recovery: 13, notes: 'Objectif majeur de trail' }),
  EV('occ-2027', 'OCC', '2027-08-27', { discipline: 'trail', priority: 'optional', status: 'toConfirm', effort: 'Suspendue si les séquelles de l\'UT4M l\'imposent', taper: 14, notes: 'Date et participation à confirmer' })
];

const SEASON_GOALS = [
  'Développer nettement le haut du corps : épaules, dorsaux, haut des pectoraux, bras',
  'Renforcer chevilles, mollets et chaîne postérieure (force, excentrique, stabilité)',
  'Progresser sur route (semi, marathon) et en trail (montées, descentes, ultra, plusieurs jours)',
  'Coordonner course et musculation : la fatigue est gérée globalement'
];

const LABELS = {
  slot: { morning: 'Matin', day: 'Journée', evening: 'Soir' },
  kind: { strength: 'Musculation', mobility: 'Mobilité / renfo', run: 'Course', trailRun: 'Trail', track: 'Piste', treadmill: 'Tapis', bike: 'Vélo', crossTraining: 'Récupération croisée', walk: 'Marche', rest: 'Repos', race: 'Compétition' },
  intensity: { rest: 'Repos', recovery: 'Récupération', easy: 'Facile', moderate: 'Modérée', tempo: 'Tempo', threshold: 'Seuil', vo2: 'VMA', sprint: 'Sprint', race: 'Compétition', mixed: 'Mixte' },
  status: { planned: 'Prévue', completed: 'Réalisée', partial: 'Partiellement réalisée', modified: 'Modifiée', postponed: 'Reportée', cancelledVoluntarily: 'Annulée volontairement', skippedForRecovery: 'Supprimée pour récupération', missedNoReason: 'Manquée (sans motif)', deleted: 'Supprimée' },
  priority: { a: 'A — prioritaire', b: 'B — secondaire', c: 'C — préparation', test: 'Test', optional: 'Facultative' },
  priorityShort: { a: 'A', b: 'B', c: 'C', test: 'Test', optional: 'Fac.' },
  evStatus: { conditional: 'Conditionnelle', toConfirm: 'À confirmer', intended: 'Prévue (non inscrite)', registered: 'Inscrit', completed: 'Terminée', didNotStart: 'Non partant', didNotFinish: 'Abandon', cancelled: 'Annulée' },
  discipline: { road: 'Route', trail: 'Trail', track: 'Piste', raid: 'Raid multisport', other: 'Autre' },
  sport: { running: 'Course', trailRunning: 'Trail', trackRunning: 'Piste', treadmillRunning: 'Tapis', walking: 'Marche', hiking: 'Randonnée', cycling: 'Vélo', indoorCycling: 'Home-trainer', strengthTraining: 'Musculation', alpineSkiing: 'Ski alpin', crossCountrySkiing: 'Ski de fond', mobility: 'Mobilité', other: 'Autre' },
  decision: { maintain: 'Maintenir', lighten: 'Alléger', postpone: 'Reporter', replace: 'Remplacer', cancel: 'Annuler', skipForRecovery: 'Supprimer pour récupérer' },
  conf: { insufficient: 'Données insuffisantes', low: 'Faible', moderate: 'Modérée', high: 'Élevée' },
  prov: { measured: 'Mesurée', deviceEstimated: 'Estimée par l\'appareil', calculated: 'Calculée', manual: 'Saisie manuelle', unreliable: 'Peu fiable', demo: 'Démo' }
};
const PROVISIONAL = new Set(['conditional', 'toConfirm', 'intended']);

const REFERENCES = [
  ['Cooper KH', 1968, 'A means of assessing maximal oxygen intake', 'JAMA 203(3):201–204', 'PMID 5694044', true, 'VO2max estimée à partir de la distance couverte en 12 minutes'],
  ['Léger L, Mercier D', 1984, 'Gross energy cost of horizontal treadmill and track running', 'Sports Medicine 1(4):270–277', 'PMID 6390604', true, 'VO2max ≈ 3,5 × vitesse maximale aérobie'],
  ['Uth N, Sørensen H, Overgaard K, Pedersen PK', 2004, 'Estimation of VO2max from the ratio between HRmax and HRrest', 'Eur J Appl Physiol 91(1):111–115', 'PMID 14624296', true, 'VO2max ≈ 15,3 × FCmax / FCrepos, erreur type 2,7 ml/kg/min'],
  ['American College of Sports Medicine', 2021, 'ACSM\'s Guidelines for Exercise Testing and Prescription', '11e édition, Wolters Kluwer', '', false, 'Équation métabolique de la course à pied'],
  ['Minetti AE et al.', 2002, 'Energy cost of walking and running at extreme uphill and downhill slopes', 'J Appl Physiol 93(3):1039–1046', 'PMID 12183501', true, 'Coût énergétique selon la pente, allure corrigée'],
  ['Skiba PF et al.', 2012, 'Modeling the expenditure and reconstitution of work capacity above critical power', 'Med Sci Sports Exerc 44(8):1526–1532', 'PMID 22382171', true, 'Réserve anaérobie au fil de l\'effort'],
  ['Seiler S', 2010, 'What is best practice for training intensity and duration distribution?', 'Int J Sports Physiol Perform 5(3):276–291', 'PMID 20861519', true, 'Répartition de l\'intensité en trois domaines'],
  ['Morton RH, Fitz-Clarke JR, Banister EW', 1990, 'Modeling human performance in running', 'J Appl Physiol 69(3):1171–1177', 'PMID 2246166', true, 'Coefficients du TRIMP et constantes de temps'],
  ['Banister EW', 1991, 'Modeling elite athletic performance', 'Physiological Testing of the High-Performance Athlete, Human Kinetics', '', false, 'Modèle impulsion-réponse, TRIMP'],
  ['Foster C et al.', 2001, 'A new approach to monitoring exercise training', 'J Strength Cond Res 15(1):109–115', '', false, 'sRPE = RPE × durée'],
  ['Plews DJ et al.', 2013, 'Training adaptation and heart rate variability in elite endurance athletes', 'Sports Med 43(9):773–781', 'doi:10.1007/s40279-013-0071-8', false, 'ln(RMSSD), moyennes glissantes, référence individuelle'],
  ['Buchheit M', 2014, 'Monitoring training status with HR measures: do all roads lead to Rome?', 'Front Physiol 5:73', 'doi:10.3389/fphys.2014.00073', false, 'Interprétation individuelle des marqueurs cardiaques'],
  ['Williams S et al.', 2017, 'Better way to determine the acute:chronic workload ratio?', 'Br J Sports Med 51(3):209–210', 'PMID 27650255', true, 'ACWR par moyennes exponentielles'],
  ['Gabbett TJ', 2016, 'The training–injury prevention paradox', 'Br J Sports Med 50(5):273–280', 'doi:10.1136/bjsports-2015-095788', false, 'Repères ACWR 0,8–1,3 (contestés)'],
  ['Impellizzeri FM et al.', 2020, 'Acute:chronic workload ratio: conceptual issues and fundamental pitfalls', 'Int J Sports Physiol Perform 15(6):907–913', 'doi:10.1123/ijspp.2019-0864', false, 'Aucune valeur ACWR ne prédit une blessure'],
  ['Lolli L et al.', 2019, 'Mathematical coupling causes spurious correlation within ACWR calculations', 'Br J Sports Med 53(15):921–922', 'doi:10.1136/bjsports-2017-098110', false, 'Couplage mathématique aigu / chronique'],
  ['Jones AM, Vanhatalo A', 2017, 'The \'Critical Power\' concept', 'Sports Med 47(Suppl 1):65–78', 'PMID 28332113', true, 'Vitesse critique : efforts de 2 à 15 min'],
  ['Daniels J, Gilbert J', 1979, 'Oxygen Power: Performance Tables for Distance Runners', 'Auto-édition', '', false, 'Équations VDOT'],
  ['Minetti AE et al.', 2002, 'Energy cost of walking and running at extreme uphill and downhill slopes', 'J Appl Physiol 93(3):1039–1046', 'doi:10.1152/japplphysiol.01177.2001', false, 'Coût énergétique selon la pente'],
  ['Friel J', 2016, 'The Triathlete\'s Training Bible', 'VeloPress', '', false, 'EF et découplage Pa:Hr (méthodes de praticien)'],
  ['Brzycki M', 1993, 'Strength testing—predicting a one-rep max from reps-to-fatigue', 'JOPERD 64(1):88–90', '', false, '1RM = w·36/(37 − r)'],
  ['LeSuer DA et al.', 1997, 'The accuracy of prediction equations for estimating 1-RM', 'J Strength Cond Res 11(4):211–213', '', false, 'Précision ≤ 10 répétitions'],
  ['Zourdos MC et al.', 2016, 'Novel resistance training-specific RPE scale measuring repetitions in reserve', 'J Strength Cond Res 30(1):267–275', 'doi:10.1519/JSC.0000000000001049', false, 'RPE ≈ 10 − RIR'],
  ['Helms ER et al.', 2016, 'Application of the RIR-based RPE scale for resistance training', 'Strength Cond J 38(4):42–49', '', false, 'RIR moins précis loin de l\'échec'],
  ['Hristov H', 2005, 'INOL — Intensity × Number of Lifts', 'Méthode de praticien', '', false, 'INOL = reps / (100 − %1RM)'],
  ['Beardsley C', 2019, 'Effective / stimulating reps', 'Articles en ligne (hypothèse)', '', false, 'Proxy de répétitions proches de l\'échec'],
  ['Israetel M et al.', 2021, 'Scientific Principles of Hypertrophy Training', 'Renaissance Periodization', '', false, 'MEV / MAV / MRV individualisables'],
  ['Mifflin MD et al.', 1990, 'A new predictive equation for resting energy expenditure', 'Am J Clin Nutr 51(2):241–247', 'doi:10.1093/ajcn/51.2.241', false, 'Métabolisme de repos'],
  ['Cunningham JJ', 1980, 'A reanalysis of the factors influencing basal metabolic rate', 'Am J Clin Nutr 33(11):2372–2374', '', false, 'BMR = 500 + 22 × masse maigre'],
  ['Westerterp KR', 2004, 'Diet induced thermogenesis', 'Nutr Metab 1:5', 'doi:10.1186/1743-7075-1-5', false, 'TEF par macronutriment'],
  ['Hall KD', 2008, 'What is the required energy deficit per unit weight loss?', 'Int J Obes 32(3):573–576', '', false, '7 700 kcal/kg = approximation'],
  ['Burke LM et al.', 2011, 'Carbohydrates for training and competition', 'J Sports Sci 29(S1):S17–S27', 'PMID 21660838', true, 'Glucides 3–5 / 5–7 / 6–10 / 8–12 g/kg'],
  ['Jäger R et al.', 2017, 'ISSN position stand: protein and exercise', 'J Int Soc Sports Nutr 14:20', '', false, 'Protéines 1,4–2,0 g/kg/j'],
  ['Watson NF et al.', 2015, 'Recommended amount of sleep for a healthy adult', 'Sleep 38(6):843–844', '', false, 'Au moins 7 h par nuit'],
  ['Bosquet L et al.', 2007, 'Effects of tapering on performance: a meta-analysis', 'Med Sci Sports Exerc 39(8):1358–1365', 'PMID 17762369', true, 'Affûtage : volume réduit, intensité conservée'],
  ['Hooper SL, Mackinnon LT', 1995, 'Monitoring overtraining in athletes', 'Sports Med 20(5):321–327', '', false, 'Questionnaire subjectif 1–7']
];
