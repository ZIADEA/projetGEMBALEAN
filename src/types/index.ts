export type EtatPC = 'ok' | 'probleme' | 'hors_service'

export type TypeAlerte =
  | 'mot_de_passe'
  | 'demande_mot_de_passe'
  | 'panne'
  | 'materiel_uc'
  | 'materiel_moniteur'
  | 'materiel_clavier'
  | 'materiel_souris'
  | 'logiciel_manquant'
  | 'logiciel_installe'
  | 'logiciel_desinstalle'
  | 'reinitialisation'
  | 'autre'

export type StatutAlerte = 'en_attente' | 'resolu'

export type AnneeEtudiant = '3eme annee' | '4eme annee' | '5eme annee'

export interface PCStorageDisk {
  disque: string
  type: string
  capacite: string
  role: string
}

export interface PCGPU {
  id: string
  modele: string
  vram: string | null
  type: string
}

export interface PCSpecs {
  cpu: {
    modele: string
    frequence: string
    cores: number
    logicalProcessors: number
    cacheL1: string
    cacheL2: string
    cacheL3: string
    virtualisation: boolean
  }
  ram: {
    capacite: string
    vitesse: string
    type: string
    slots: number
    slotsUtilises: number
  }
  stockage: PCStorageDisk[]
  gpu: PCGPU[]
}

export interface PC {
  id: string
  numero: number
  salle: string
  description: string | null
  ram_gb: number
  etat: EtatPC
  logiciels: string[]
  specs: PCSpecs | null
  created_at: string
}

export interface Alerte {
  id: string
  pc_numero: number
  type_alerte: TypeAlerte
  description: string
  nom_etudiant: string
  annee: AnneeEtudiant
  statut: StatutAlerte
  created_at: string
}

export interface Utilisation {
  id: string
  pc_numero: number
  nom_etudiant: string
  annee: AnneeEtudiant
  created_at: string
}
