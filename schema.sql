-- ============================================================
-- PC Manager - Salle IA
-- Schema v2 — 44 PCs + 2 Salle Connexe = 46 total
-- ============================================================
-- Si vous avez deja execute la v1, lancez uniquement les sections
-- marquees "MIGRATION". Sinon, lancez tout de haut en bas.
-- ============================================================

-- MIGRATION (si table pcs existe deja)
ALTER TABLE pcs ADD COLUMN IF NOT EXISTS description text;

-- MIGRATION (si table alertes existe deja) : recree le check
-- Supabase ne supporte pas ALTER CONSTRAINT facilement.
-- Optionnel: DROP TABLE alertes CASCADE; puis recreer.

-- ── Tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pcs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero      integer     UNIQUE NOT NULL,
  salle       text        NOT NULL DEFAULT 'Salle IA',
  description text,
  ram_gb      integer     NOT NULL DEFAULT 8,
  etat        text        NOT NULL DEFAULT 'ok'
                CHECK (etat IN ('ok', 'probleme', 'hors_service')),
  logiciels   text[]      NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alertes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pc_numero    integer     NOT NULL,
  type_alerte  text        NOT NULL
                 CHECK (type_alerte IN (
                   'mot_de_passe',
                   'demande_mot_de_passe',
                   'panne',
                   'materiel_uc',
                   'materiel_moniteur',
                   'materiel_clavier',
                   'materiel_souris',
                   'logiciel_manquant',
                   'logiciel_installe',
                   'autre'
                 )),
  description  text        NOT NULL,
  nom_etudiant text        NOT NULL,
  annee        text        NOT NULL
                 CHECK (annee IN ('3eme annee', '4eme annee', '5eme annee')),
  statut       text        NOT NULL DEFAULT 'en_attente'
                 CHECK (statut IN ('en_attente', 'resolu')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE alertes;

-- ── Seed : 44 PCs Salle IA ─────────────────────

INSERT INTO pcs (numero, salle, description, ram_gb, etat, logiciels) VALUES
(1,  'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Notepad++']),
(2,  'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Notepad++', 'Python 3']),
(3,  'Salle IA', NULL, 8,  'probleme',     ARRAY['Microsoft Word', 'Microsoft Excel', 'Google Chrome']),
(4,  'Salle IA', NULL, 4,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Notepad++']),
(5,  'Salle IA', NULL, 8,  'ok',           ARRAY['Visual Studio Code', 'Google Chrome', 'Notepad++', 'Node.js']),
(6,  'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'MySQL Workbench']),
(7,  'Salle IA', NULL, 8,  'hors_service', ARRAY['Microsoft Word']),
(8,  'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome']),
(9,  'Salle IA', NULL, 4,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Google Chrome', 'Notepad++']),
(10, 'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Notepad++', 'VMware Workstation']),
(11, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Google Chrome', 'Notepad++']),
(12, 'Salle IA', NULL, 8,  'probleme',     ARRAY['Microsoft Word', 'Google Chrome']),
(13, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome']),
(14, 'Salle IA', NULL, 4,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Notepad++']),
(15, 'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Git']),
(16, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Google Chrome']),
(17, 'Salle IA', NULL, 8,  'ok',           ARRAY['Visual Studio Code', 'Google Chrome', 'Notepad++', 'Python 3']),
(18, 'Salle IA', NULL, 4,  'hors_service', ARRAY['Microsoft Word']),
(19, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Notepad++']),
(20, 'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Adobe Reader']),
(21, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Google Chrome']),
(22, 'Salle IA', NULL, 8,  'ok',           ARRAY['Visual Studio Code', 'Google Chrome', 'Notepad++']),
(23, 'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Python 3', 'Git']),
(24, 'Salle IA', NULL, 4,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Notepad++']),
(25, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome']),
(26, 'Salle IA', NULL, 8,  'probleme',     ARRAY['Microsoft Word', 'Google Chrome', 'Notepad++']),
(27, 'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'MySQL Workbench', 'Node.js']),
(28, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Google Chrome']),
(29, 'Salle IA', NULL, 8,  'ok',           ARRAY['Visual Studio Code', 'Google Chrome', 'Python 3', 'Git']),
(30, 'Salle IA', NULL, 4,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Notepad++']),
(31, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome']),
(32, 'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Adobe Reader', 'VMware Workstation']),
(33, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Google Chrome', 'Notepad++']),
(34, 'Salle IA', NULL, 4,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Notepad++']),
(35, 'Salle IA', NULL, 8,  'hors_service', ARRAY['Microsoft Word', 'Google Chrome']),
(36, 'Salle IA', NULL, 8,  'ok',           ARRAY['Visual Studio Code', 'Google Chrome', 'Notepad++', 'Node.js', 'Git']),
(37, 'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Python 3']),
(38, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Google Chrome']),
(39, 'Salle IA', NULL, 4,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Notepad++']),
(40, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome']),
(41, 'Salle IA', NULL, 8,  'ok',           ARRAY['Visual Studio Code', 'Google Chrome', 'Python 3', 'Node.js']),
(42, 'Salle IA', NULL, 16, 'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome', 'Notepad++', 'MySQL Workbench']),
(43, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Google Chrome', 'Notepad++']),
(44, 'Salle IA', NULL, 8,  'ok',           ARRAY['Microsoft Word', 'Microsoft Excel', 'Visual Studio Code', 'Google Chrome']),

-- ── Salle Connexe : 2 PCs numerotes 45 et 46 ─────────────
(45, 'Salle Connexe',
  'Ce PC est reserve aux entrainements longue duree. Il peut tourner toute une semaine ou un mois sans interruption. Il est INTERDIT de l''eteindre. Contactez un responsable avant toute intervention.',
  32, 'ok',
  ARRAY['Visual Studio Code', 'Python 3', 'Node.js', 'Git', 'Docker', 'Google Chrome']),
(46, 'Salle Connexe',
  'Ce PC est reserve aux entrainements longue duree. Il peut tourner toute une semaine ou un mois sans interruption. Il est INTERDIT de l''eteindre. Contactez un responsable avant toute intervention.',
  32, 'ok',
  ARRAY['Visual Studio Code', 'Python 3', 'Node.js', 'Git', 'Docker', 'Google Chrome'])
ON CONFLICT (numero) DO NOTHING;
