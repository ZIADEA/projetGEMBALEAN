# PC Manager — Salle IA · ENSAM

Application web de gestion et de suivi des postes informatiques de la Salle IA de  (ENSAM-UMI).
<img width="853" height="480" alt="gembapc pptx  -  Dernier enregistrement par l’utilisateur" src="https://github.com/user-attachments/assets/9d16d4a8-bd22-4544-8f82-6c51fba8ba2d" />


---

## Apercu

PC Manager permet aux étudiants de **signaler des problèmes** sur les postes (pannes, logiciels manquants, problèmes d'accès...) et aux responsables pédagogiques d'être **notifiés par email** en temps réel afin d'intervenir rapidement.

---

## Fonctionnalites principales

### Tableau de bord
- Vue d'ensemble de tous les PC (Salle IA + Salle Connexe)
- Statistiques en temps réel : fonctionnels, en problème, hors service, alertes ouvertes
- Classification automatique des alertes : Matériel / Logiciel / Accès
- Flux d'alertes en temps réel (Supabase Realtime)

### Gestion des PC
- Page dédiée pour chaque PC avec toutes ses informations
- Statut dynamique : Fonctionnel / Problème / Hors service
- Affichage du dernier mot de passe connu
- Historique complet des alertes (en attente + résolues)
- Suivi des logiciels installés (liste de 114 logiciels)
- Spécifications matérielles détaillées (CPU, RAM, Stockage, GPU)
- QR Code d'accès rapide par PC
- Suivi des présences / utilisations par PC
- Messagerie entre étudiants (notes sur le PC)
- Historique des réinitialisations

### Signalement
- Formulaire complet avec catégories visuelles :
  - **Matériel** : Panne, UC, Moniteur, Clavier, Souris
  - **Logiciel** : Manquant, Installé, Désinstallé
  - **Accès** : Mot de passe posé / supprimé / inconnu
  - **Réinitialisation** : PC remis à zéro
  - **Autre** : Problème divers
- Signalements informatifs auto-résolus (logiciel installé, réinitialisation...)
- Problèmes réels en attente de résolution manuelle

### Résolution d'alertes
- Bouton "Marquer comme résolu" avec saisie du nom et de l'année du responsable
- Recalcul automatique du statut du PC après résolution
- Affichage "Résolu par [Nom] · [Année]" sur chaque alerte résolue

### Notifications email
- Inscription des responsables pédagogiques (nom + email)
- Envoi automatique d'un email à chaque nouvelle alerte matérielle ou logicielle
- Email personnalisé avec le détail complet de l'alerte

### Export
- Génération d'un rapport HTML complet protégé par mot de passe
- Contient : état de tous les PC, historique des alertes, historique des présences

---

## Stack technique

| Technologie | Usage |
|---|---|
| [Next.js 14](https://nextjs.org/) | Framework React — App Router |
| [Supabase](https://supabase.com/) | Base de données PostgreSQL + Realtime + Auth |
| [Tailwind CSS](https://tailwindcss.com/) | Styles utilitaires |
| [Lucide React](https://lucide.dev/) | Icônes |
| [React Hot Toast](https://react-hot-toast.com/) | Notifications UI |
| [Nodemailer](https://nodemailer.com/) | Envoi d'emails via Gmail |
| TypeScript | Typage statique |

---

## Installation

### Prérequis
- Node.js 18+
- Un projet Supabase (gratuit sur [supabase.com](https://supabase.com))
- Un compte Gmail avec un [App Password](https://myaccount.google.com/apppasswords)

### 1. Cloner le projet

```bash
git clone https://github.com/ton-compte/pc-manager.git
cd pc-manager
npm install
```

### 2. Variables d'environnement

Crée un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxx

NEXT_PUBLIC_EXPORT_PASSWORD=MON_MOT_DE_PASSE

# Email notifications (Gmail App Password)
GMAIL_USER=mon-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### 3. Base de données Supabase

Exécute ces requêtes SQL dans l'éditeur SQL de Supabase :

```sql
-- Table des PC
CREATE TABLE pcs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero integer NOT NULL UNIQUE,
  salle text NOT NULL,
  description text,
  ram_gb integer NOT NULL DEFAULT 16,
  etat text NOT NULL DEFAULT 'ok',
  logiciels text[] NOT NULL DEFAULT '{}',
  specs jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table des alertes
CREATE TABLE alertes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pc_numero integer NOT NULL,
  type_alerte text NOT NULL,
  description text NOT NULL,
  nom_etudiant text NOT NULL,
  annee text NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente',
  resolu_par text,
  created_at timestamptz DEFAULT now()
);

-- Table des utilisations (présences)
CREATE TABLE utilisations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pc_numero integer NOT NULL,
  nom_etudiant text NOT NULL,
  annee text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des responsables (notifications email)
CREATE TABLE responsables (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Table des notes (messages étudiants)
CREATE TABLE notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pc_numero integer NOT NULL,
  nom_etudiant text NOT NULL,
  annee text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Désactiver RLS sur toutes les tables
ALTER TABLE pcs          DISABLE ROW LEVEL SECURITY;
ALTER TABLE alertes      DISABLE ROW LEVEL SECURITY;
ALTER TABLE utilisations DISABLE ROW LEVEL SECURITY;
ALTER TABLE responsables DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes        DISABLE ROW LEVEL SECURITY;

-- Droits d'accès
GRANT ALL ON TABLE responsables TO anon, authenticated;
GRANT ALL ON TABLE notes        TO anon, authenticated;

-- Supprimer la contrainte CHECK sur type_alerte si elle existe
ALTER TABLE alertes DROP CONSTRAINT IF EXISTS alertes_type_alerte_check;
```

### 4. Peupler les PC

```sql
-- Insérer les 44 PC de la Salle IA
INSERT INTO pcs (numero, salle, ram_gb, etat, logiciels)
SELECT
  generate_series(1, 44),
  'Salle IA',
  16,
  'ok',
  '{}'::text[];

-- PC de la Salle Connexe
INSERT INTO pcs (numero, salle, ram_gb, etat, logiciels, description)
VALUES
  (45, 'Salle Connexe', 16, 'ok', '{}', 'PC d''entrainement — Ne pas éteindre'),
  (46, 'Salle Connexe', 16, 'ok', '{}', 'PC d''entrainement — Ne pas éteindre');

-- Appliquer les spécifications matérielles standard
UPDATE pcs SET
  ram_gb = 16,
  specs = '{
    "cpu": { "modele": "Intel Core i7-9700", "frequence": "3.00 GHz", "cores": 8, "logicalProcessors": 8, "cacheL1": "512 KB", "cacheL2": "2.0 MB", "cacheL3": "12.0 MB", "virtualisation": true },
    "ram": { "capacite": "16 GB", "vitesse": "2666 MT/s", "type": "DIMM", "slots": 4, "slotsUtilises": 1 },
    "stockage": [
      {"disque": "Disk 0 (C:)", "type": "SSD SATA", "capacite": "239 GB", "role": "Systeme"},
      {"disque": "Disk 1 (D:)", "type": "HDD SATA", "capacite": "932 GB", "role": "Donnees"}
    ],
    "gpu": [
      {"id": "0", "modele": "Intel UHD Graphics", "vram": null, "type": "Integree"},
      {"id": "1", "modele": "AMD Radeon 520", "vram": "2.0 GB", "type": "Discrete"}
    ]
  }'::jsonb;
```

### 5. Lancer le serveur de développement

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

---

## Configuration Gmail App Password

Pour activer les notifications email :

1. Activez la **vérification en deux étapes** sur votre compte Google
2. Allez dans **Compte Google → Sécurité → Mots de passe des applications**
3. Créez un mot de passe pour "PC Manager"
4. Copiez le code 16 caractères dans `.env.local` :
   ```
   GMAIL_USER=votre-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

---

## Déploiement sur Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

Ajoutez les variables d'environnement dans **Vercel → Settings → Environment Variables**.

> **Important :** Le fichier `.env.local` est ignoré par Git (`.gitignore`). Ne committez jamais vos clés API.

---

## Structure du projet

```
src/
├── app/
│   ├── page.tsx              # Tableau de bord principal
│   ├── pc/[numero]/page.tsx  # Page détail d'un PC
│   └── api/notify/route.ts   # API route — envoi d'emails
├── components/
│   ├── AlertFeed.tsx         # Flux d'alertes temps réel
│   ├── AlertItem.tsx         # Carte d'alerte individuelle
│   ├── AbonnementSection.tsx # Gestion des abonnements email
│   ├── NotesSection.tsx      # Messages étudiants par PC
│   ├── PCCard.tsx            # Carte PC (tableau de bord)
│   ├── ReportModal.tsx       # Formulaire de signalement
│   ├── SpecsCard.tsx         # Spécifications matérielles
│   ├── SoftwareSelect.tsx    # Sélecteur de logiciels
│   └── UsageTracker.tsx      # Suivi des présences
├── lib/
│   ├── supabase.ts           # Client Supabase
│   ├── pc-status.ts          # Logique de statut PC
│   └── software-list.ts      # Liste des 114 logiciels
└── types/
    └── index.ts              # Types TypeScript
```

---

## Types d'alertes

| Type | Catégorie | Comportement |
|---|---|---|
| `panne` | Matériel | En attente — PC passe Hors service |
| `materiel_uc/moniteur/clavier/souris` | Matériel | En attente — PC passe Problème |
| `logiciel_manquant` | Logiciel | En attente |
| `demande_mot_de_passe` | Accès | En attente |
| `autre` | Divers | En attente |
| `logiciel_installe` | Info | Auto-résolu |
| `logiciel_desinstalle` | Info | Auto-résolu |
| `reinitialisation` | Info | Auto-résolu — PC passe OK |
| `mot_de_passe` | Info | Auto-résolu |
| `mot_de_passe_supprime` | Info | Auto-résolu |

---

## Licence

Projet développé pour l'usage interne de la **Salle IA — ENSAM Meknes**.

[ensam-umi.ac.ma](https://www.ensam-umi.ac.ma/)
