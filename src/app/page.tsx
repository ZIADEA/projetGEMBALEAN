'use client'

import { useState, useEffect, useCallback } from 'react'
import { Monitor, Plus, RefreshCw, AlertTriangle, Wrench, Code2, Lock, Lightbulb, FolderOpen, BookMarked, Download, X, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import PCCard from '@/components/PCCard'
import AlertFeed from '@/components/AlertFeed'
import ReportModal from '@/components/ReportModal'
import type { PC, Alerte, Utilisation } from '@/types'

export default function DashboardPage() {
  const [pcs, setPcs]         = useState<PC[]>([])
  const [alerts, setAlerts]   = useState<Alerte[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [selectedPc, setSelectedPc] = useState<number | undefined>()
  const [exportOpen, setExportOpen]       = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exportError, setExportError]     = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [showPassword, setShowPassword]   = useState(false)

  const fetchData = useCallback(async () => {
    const [pcsRes, alertsRes] = await Promise.all([
      supabase.from('pcs').select('*').order('numero'),
      supabase.from('alertes').select('*').order('created_at', { ascending: false }),
    ])
    if (pcsRes.data)    setPcs(pcsRes.data)
    if (alertsRes.data) setAlerts(alertsRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openReport = (pcNumero?: number) => { setSelectedPc(pcNumero); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setSelectedPc(undefined) }

  const handleExport = async () => {
    if (exportPassword !== process.env.NEXT_PUBLIC_EXPORT_PASSWORD) { setExportError(true); return }
    setExportLoading(true)
    try {
      const [pcsRes, alertesRes, utilisationsRes] = await Promise.all([
        supabase.from('pcs').select('*').order('numero'),
        supabase.from('alertes').select('*').order('created_at', { ascending: false }),
        supabase.from('utilisations').select('*').order('created_at', { ascending: false }),
      ])
      const allPcs          = (pcsRes.data          ?? []) as PC[]
      const allAlertes      = (alertesRes.data       ?? []) as Alerte[]
      const allUtilisations = (utilisationsRes.data  ?? []) as Utilisation[]

      const html = generateReport(allPcs, allAlertes, allUtilisations)
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `rapport-pc-manager-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportOpen(false)
      setExportPassword('')
      setExportError(false)
      toast.success('Rapport telecharge !')
    } catch {
      toast.error('Erreur lors de la generation du rapport.')
    } finally {
      setExportLoading(false)
    }
  }

  const pendingCountForPc = (numero: number) =>
    alerts.filter((a) => a.pc_numero === numero && a.statut === 'en_attente').length

  const sallePcs    = pcs.filter((p) => p.salle === 'Salle IA')
  const connexePcs  = pcs.filter((p) => p.salle === 'Salle Connexe')
  const recentAlerts = alerts.slice(0, 5)

  const pending = alerts.filter((a) => a.statut === 'en_attente')

  const stats = {
    total:       pcs.length,
    ok:          pcs.filter((p) => p.etat === 'ok').length,
    probleme:    pcs.filter((p) => p.etat === 'probleme').length,
    horsService: pcs.filter((p) => p.etat === 'hors_service').length,
    alertes:     pending.length,
  }

  const HW_TYPES = ['panne', 'materiel_uc', 'materiel_moniteur', 'materiel_clavier', 'materiel_souris'] as const
  const SW_TYPES = ['logiciel_manquant', 'logiciel_installe', 'autre'] as const
  const HW_LABELS: Record<string, string> = {
    panne:              'Panne / ne demarre pas',
    materiel_uc:        'Unite centrale',
    materiel_moniteur:  'Moniteur',
    materiel_clavier:   'Clavier',
    materiel_souris:    'Souris',
  }
  const SW_LABELS: Record<string, string> = {
    logiciel_manquant: 'Logiciel manquant',
    logiciel_installe: 'Logiciel installe',
    autre:             'Autre probleme',
  }

  const hwAlerts  = pending.filter((a) => (HW_TYPES as readonly string[]).includes(a.type_alerte))
  const swAlerts  = pending.filter((a) => (SW_TYPES as readonly string[]).includes(a.type_alerte))
  const mdpAlerts = pending.filter((a) => a.type_alerte === 'demande_mot_de_passe')

  const countBy = (arr: Alerte[], labels: Record<string, string>) =>
    Object.entries(labels)
      .map(([type, label]) => ({ label, count: arr.filter((a) => a.type_alerte === type).length }))
      .filter((r) => r.count > 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">PC Manager</h1>
              <p className="text-xs text-slate-400">Salle IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setExportOpen(true); setExportError(false); setExportPassword('') }}
              className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
            <button
              onClick={() => openReport()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Signaler
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total PCs"       value={stats.total}       color="slate"  />
          <StatCard label="Fonctionnels"    value={stats.ok}          color="green"  />
          <StatCard label="Problemes"       value={stats.probleme}    color="orange" />
          <StatCard label="Hors service"    value={stats.horsService} color="red"    />
          <StatCard label="Alertes ouvertes" value={stats.alertes}    color="blue"   />
        </div>

        {/* ── Conseils & Bonnes pratiques ── */}
        <ConseilsSection />

        {/* ── Classification Hardware / Software ── */}
        {pending.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Hardware */}
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-100 rounded-lg">
                    <Wrench className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm font-bold text-red-700">Materiel (Hardware)</span>
                </div>
                <span className="text-xl font-black text-red-600">{hwAlerts.length}</span>
              </div>
              {countBy(hwAlerts, HW_LABELS).length > 0 ? (
                <ul className="space-y-1">
                  {countBy(hwAlerts, HW_LABELS).map(({ label, count }) => (
                    <li key={label} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">Aucun probleme materiel</p>
              )}
            </div>

            {/* Software */}
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Code2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-bold text-blue-700">Logiciel (Software)</span>
                </div>
                <span className="text-xl font-black text-blue-600">{swAlerts.length}</span>
              </div>
              {countBy(swAlerts, SW_LABELS).length > 0 ? (
                <ul className="space-y-1">
                  {countBy(swAlerts, SW_LABELS).map(({ label, count }) => (
                    <li key={label} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">Aucun probleme logiciel</p>
              )}
            </div>

            {/* Acces */}
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 rounded-lg">
                    <Lock className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-sm font-bold text-amber-700">Acces / Mot de passe</span>
                </div>
                <span className="text-xl font-black text-amber-600">{mdpAlerts.length}</span>
              </div>
              {mdpAlerts.length > 0 ? (
                <ul className="space-y-1">
                  {mdpAlerts.slice(0, 4).map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">PC {a.pc_numero}</span>
                      <span className="text-slate-400">{a.nom_etudiant}</span>
                    </li>
                  ))}
                  {mdpAlerts.length > 4 && (
                    <li className="text-xs text-slate-400">+{mdpAlerts.length - 4} autres</li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">Aucune demande de mot de passe</p>
              )}
            </div>
          </section>
        )}

        {/* ── Live Alert Feed ── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="mb-3">
            <h2 className="font-semibold text-slate-800 text-sm">Alertes en temps reel</h2>
          </div>
          <AlertFeed initialAlerts={recentAlerts} />
        </section>

        {/* ── Salle IA ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">Salle IA</h2>
              <p className="text-xs text-slate-400 mt-0.5">{sallePcs.length} postes</p>
            </div>
            <button
              onClick={fetchData}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <PCGridSkeleton count={12} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sallePcs.map((pc) => (
                <PCCard
                  key={pc.id}
                  pc={pc}
                  alertCount={pendingCountForPc(pc.numero)}
                  onReport={openReport}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Salle Connexe ── */}
        <section>
          <div className="mb-4">
            <h2 className="font-semibold text-slate-800">Salle Connexe</h2>
            <p className="text-xs text-slate-400 mt-0.5">{connexePcs.length} poste{connexePcs.length > 1 ? 's' : ''}</p>
          </div>

          {/* Warning banner */}
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Attention — PC de la salle connexe l autre partie de la salle IA (derriere la baie vitree).
              </p>
             
            </div>
          </div>

          {loading ? (
            <PCGridSkeleton count={2} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {connexePcs.map((pc) => (
                <PCCard
                  key={pc.id}
                  pc={pc}
                  alertCount={pendingCountForPc(pc.numero)}
                  onReport={openReport}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Modal export ── */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setExportOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Download className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Exporter le rapport</h3>
                  <p className="text-xs text-slate-400">Acces protege par mot de passe</p>
                </div>
              </div>
              <button onClick={() => setExportOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Ce rapport contient l&apos;etat de tous les PC, l&apos;historique complet des alertes et des utilisations avec les noms des etudiants.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={exportPassword}
                  onChange={e => { setExportPassword(e.target.value); setExportError(false) }}
                  onKeyDown={e => e.key === 'Enter' && handleExport()}
                  placeholder="Saisir le mot de passe"
                  autoFocus
                  className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition ${
                    exportError
                      ? 'border-red-300 focus:ring-red-400 bg-red-50'
                      : 'border-slate-300 focus:ring-slate-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {exportError && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">Mot de passe incorrect.</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setExportOpen(false)}
                className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleExport}
                disabled={exportLoading || !exportPassword}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {exportLoading ? 'Generation...' : 'Telecharger'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={modalOpen}
        onClose={closeModal}
        defaultPcNumero={selectedPc}
        onSuccess={fetchData}
      />
    </div>
  )
}

/* ── helpers ── */

type Color = 'slate' | 'green' | 'orange' | 'red' | 'blue'
const COLOR_MAP: Record<Color, { card: string; label: string; value: string }> = {
  slate:  { card: 'bg-white border-slate-200',  label: 'text-slate-500',  value: 'text-slate-800'  },
  green:  { card: 'bg-white border-green-200',  label: 'text-green-600',  value: 'text-green-700'  },
  orange: { card: 'bg-white border-orange-200', label: 'text-orange-600', value: 'text-orange-700' },
  red:    { card: 'bg-white border-red-200',    label: 'text-red-600',    value: 'text-red-700'    },
  blue:   { card: 'bg-white border-blue-200',   label: 'text-blue-600',   value: 'text-blue-700'   },
}

function StatCard({ label, value, color }: { label: string; value: number; color: Color }) {
  const c = COLOR_MAP[color]
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${c.card}`}>
      <p className={`text-xs font-medium ${c.label}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${c.value}`}>{value}</p>
    </div>
  )
}

function ConseilsSection() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Conseil 1 — PC fixe */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-slate-100 rounded-lg">
            <BookMarked className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-800">Choisissez votre PC fixe</h3>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Conseil : Des la <strong className="text-slate-800">3eme annee</strong>, choisissez un PC et
          conservez-le tout au long de votre formation — 3eme, 4eme et 5eme annee.
          Evitez de changer de poste d&apos;une seance a l&apos;autre.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['3eme annee', '4eme annee', '5eme annee'].map((a) => (
            <span key={a} className="text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-full border border-slate-200">
              {a}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-3">
          Un PC fixe vous permet de retrouver vos fichiers, vos logiciels configures et votre
          environnement de travail a chaque seance.
        </p>
      </div>

      {/* Conseil 2 — Organisation fichiers */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-slate-100 rounded-lg">
            <FolderOpen className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-800">Organisez vos fichiers sur le D:</h3>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          Conseil : Si votre PC dispose du <strong className="text-slate-800">Disk 1 (D:) — 932 GB</strong>,
          creez un dossier a votre nom et adoptez la structure suivante :
        </p>

        {/* Arbre de dossiers */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-mono text-xs text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-800">Prenom_Nom/</p>
          <p className="ml-3 flex items-center gap-2">
            <span>├──</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Projets_VSCode/</span>
          </p>
          <p className="ml-6 text-slate-400">│   ├── Projet_Machine_Learning/</p>
          <p className="ml-6 text-slate-400">│   ├── Projet_Web/</p>
          <p className="ml-6 text-slate-400">│   └── ...</p>
          <p className="ml-3">├── 3eme_annee/</p>
          <p className="ml-6">│   ├── Nom_matiere/</p>
          <p className="ml-9">│   │   ├── Cours/</p>
          <p className="ml-9">│   │   ├── TD/</p>
          <p className="ml-9">│   │   ├── TP/</p>
          <p className="ml-9">│   │   └── Examens/</p>
          <p className="ml-6">│   └── ...</p>
          <p className="ml-3">├── 4eme_annee/</p>
          <p className="ml-3">└── 5eme_annee/</p>
        </div>

        <p className="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-3">
          Une bonne organisation est la cle de tout :) — retrouvez n&apos;importe quel fichier
          en quelques secondes, meme des annees plus tard.
        </p>
      </div>

    </section>
  )
}

function generateReport(pcs: PC[], alertes: Alerte[], utilisations: Utilisation[]): string {
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const ETAT: Record<string, string> = { ok: 'Fonctionnel', probleme: 'Probleme', hors_service: 'Hors service' }
  const TYPE: Record<string, string> = {
    mot_de_passe: 'Mot de passe signale', demande_mot_de_passe: 'Demande mot de passe',
    panne: 'Panne / ne demarre pas', materiel_uc: 'UC — probleme', materiel_moniteur: 'Moniteur — probleme',
    materiel_clavier: 'Clavier — probleme', materiel_souris: 'Souris — probleme',
    logiciel_manquant: 'Logiciel manquant', logiciel_installe: 'Logiciel installe',
    logiciel_desinstalle: 'Logiciel desinstalle', reinitialisation: 'Reinitialisation', autre: 'Autre',
  }

  const pcSections = pcs.map(pc => {
    const pcAlertes = alertes.filter(a => a.pc_numero === pc.numero)
    const pcUtils   = utilisations.filter(u => u.pc_numero === pc.numero)
    const pending   = pcAlertes.filter(a => a.statut === 'en_attente').length

    const alertRows = pcAlertes.map(a => `
      <tr>
        <td>${TYPE[a.type_alerte] ?? a.type_alerte}</td>
        <td>${a.description}</td>
        <td>${a.nom_etudiant}</td>
        <td>${a.annee}</td>
        <td class="${a.statut === 'en_attente' ? 'pend' : 'res'}">${a.statut === 'en_attente' ? 'En attente' : 'Resolu'}</td>
        <td>${fmtDate(a.created_at)}</td>
      </tr>`).join('')

    const utilRows = pcUtils.map(u => `
      <tr>
        <td>${u.nom_etudiant}</td>
        <td>${u.annee}</td>
        <td>${fmtDate(u.created_at)}</td>
      </tr>`).join('')

    return `
    <div class="pc etat-${pc.etat}">
      <div class="pc-head">
        <div>
          <span class="pc-num">PC ${pc.numero}</span>
          <span class="pc-salle">${pc.salle}</span>
        </div>
        <span class="badge ${pc.etat}">${ETAT[pc.etat]}</span>
      </div>
      <div class="pc-meta">
        RAM: ${pc.ram_gb} GB &bull;
        ${pcAlertes.length} alerte(s) dont <strong>${pending} en attente</strong> &bull;
        ${pcUtils.length} utilisation(s) enregistree(s)
      </div>

      ${pcAlertes.length > 0 ? `
      <div class="section-inner">
        <h4>Alertes (${pcAlertes.length})</h4>
        <table><thead><tr><th>Type</th><th>Description</th><th>Etudiant</th><th>Annee</th><th>Statut</th><th>Date</th></tr></thead>
        <tbody>${alertRows}</tbody></table>
      </div>` : `<p class="empty">Aucune alerte pour ce PC.</p>`}

      ${pcUtils.length > 0 ? `
      <div class="section-inner">
        <h4>Historique d'utilisation (${pcUtils.length})</h4>
        <table><thead><tr><th>Etudiant</th><th>Annee</th><th>Date &amp; Heure</th></tr></thead>
        <tbody>${utilRows}</tbody></table>
      </div>` : `<p class="empty">Aucune utilisation enregistree pour ce PC.</p>`}
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>Rapport PC Manager — ${now}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc;color:#1e293b;padding:0}
.container{max-width:1200px;margin:0 auto;padding:32px 24px}
.report-header{background:#0f172a;color:white;padding:24px 32px;border-radius:12px;margin-bottom:28px}
.report-header h1{font-size:20px;font-weight:800;letter-spacing:-0.02em}
.report-header p{font-size:12px;color:#94a3b8;margin-top:6px}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.summary-card{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
.summary-card .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
.summary-card .val{font-size:30px;font-weight:900;margin-top:4px;line-height:1}
.sc-ok .val{color:#16a34a} .sc-prob .val{color:#ea580c} .sc-hs .val{color:#dc2626} .sc-total .val{color:#1e293b}
.pc{background:white;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;overflow:hidden}
.etat-ok{border-left:4px solid #22c55e} .etat-probleme{border-left:4px solid #f97316} .etat-hors_service{border-left:4px solid #ef4444}
.pc-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #f1f5f9}
.pc-num{font-size:16px;font-weight:800;color:#0f172a;margin-right:10px}
.pc-salle{font-size:12px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:20px}
.pc-meta{font-size:12px;color:#64748b;padding:8px 18px;background:#f8fafc;border-bottom:1px solid #f1f5f9}
.pc-meta strong{color:#1e293b}
.badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px}
.ok{background:#dcfce7;color:#16a34a;border:1px solid #bbf7d0}
.probleme{background:#fff7ed;color:#ea580c;border:1px solid #fed7aa}
.hors_service{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.section-inner{padding:4px 0 12px}
h4{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;padding:12px 18px 6px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#f8fafc;padding:7px 12px;text-align:left;font-weight:600;color:#475569;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}
td{padding:7px 12px;border-bottom:1px solid #f8fafc;color:#334155}
tr:hover td{background:#f8fafc}
.pend{color:#ea580c;font-weight:700} .res{color:#16a34a;font-weight:700}
.empty{font-size:12px;color:#94a3b8;padding:10px 18px;font-style:italic}
@media print{body{background:white}.pc{break-inside:avoid;margin-bottom:14px}.summary{break-inside:avoid}}
</style></head>
<body><div class="container">
  <div class="report-header">
    <h1>Rapport PC Manager — Salle IA</h1>
    <p>Genere le ${now} &bull; ${pcs.length} PC(s) &bull; ${alertes.length} alerte(s) au total &bull; ${utilisations.length} utilisation(s) enregistree(s)</p>
  </div>
  <div class="summary">
    <div class="summary-card sc-total"><div class="lbl">Total PC</div><div class="val">${pcs.length}</div></div>
    <div class="summary-card sc-ok"><div class="lbl">Fonctionnels</div><div class="val">${pcs.filter(p=>p.etat==='ok').length}</div></div>
    <div class="summary-card sc-prob"><div class="lbl">Problemes</div><div class="val">${pcs.filter(p=>p.etat==='probleme').length}</div></div>
    <div class="summary-card sc-hs"><div class="lbl">Hors service</div><div class="val">${pcs.filter(p=>p.etat==='hors_service').length}</div></div>
  </div>
  ${pcSections}
</div></body></html>`
}

function PCGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 h-52 animate-pulse" />
      ))}
    </div>
  )
}
