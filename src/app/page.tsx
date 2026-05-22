'use client'

import { useState, useEffect, useCallback } from 'react'
import { Monitor, Plus, RefreshCw, Radio, AlertTriangle, Wrench, Code2, Lock, Lightbulb, FolderOpen, BookMarked } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PCCard from '@/components/PCCard'
import AlertFeed from '@/components/AlertFeed'
import ReportModal from '@/components/ReportModal'
import type { PC, Alerte } from '@/types'

export default function DashboardPage() {
  const [pcs, setPcs]         = useState<PC[]>([])
  const [alerts, setAlerts]   = useState<Alerte[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [selectedPc, setSelectedPc] = useState<number | undefined>()

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
          <button
            onClick={() => openReport()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Signaler
          </button>
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 text-sm">Alertes en temps reel</h2>
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-green-500 animate-pulse" />
              <span className="text-xs text-green-600 font-medium">En direct</span>
            </div>
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
                Attention — PC d&apos;entrainement longue duree
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Ces PC peuvent tourner toute une semaine ou un mois sans interruption lors des sessions
                d&apos;entrainement. Il est <strong>strictement interdit de les eteindre</strong>.
                Contactez un responsable avant toute intervention.
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

function PCGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 h-52 animate-pulse" />
      ))}
    </div>
  )
}
