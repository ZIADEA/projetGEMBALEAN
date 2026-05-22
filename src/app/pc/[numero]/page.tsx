'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Monitor, Cpu, Plus, PackageOpen,
  AlertCircle, CheckCircle2, Lock,
  Server, Keyboard, MousePointer2, AlertTriangle, QrCode, RotateCcw,
  AppWindow, X, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { recalculateEtat } from '@/lib/pc-status'
import AlertItem from '@/components/AlertItem'
import ReportModal from '@/components/ReportModal'
import UsageTracker from '@/components/UsageTracker'
import SpecsCard from '@/components/SpecsCard'
import type { PC, Alerte } from '@/types'

/* ── composants du poste ── */
const COMPOSANTS = [
  { key: 'materiel_uc',       label: "Unite centrale", Icon: Server },
  { key: 'materiel_moniteur', label: "Moniteur",       Icon: Monitor },
  { key: 'materiel_clavier',  label: "Clavier",        Icon: Keyboard },
  { key: 'materiel_souris',   label: "Souris",         Icon: MousePointer2 },
] as const

const ETAT_CONFIG = {
  ok:           { label: 'Fonctionnel', badge: 'bg-green-50 text-green-800 border-green-200', dot: 'bg-green-500', border: 'border-green-200' },
  probleme:     { label: 'Probleme',   badge: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-500', border: 'border-orange-300' },
  hors_service: { label: 'Hors service', badge: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-500', border: 'border-red-300' },
} as const

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PCDetailPage() {
  const params  = useParams()
  const numero  = Number(params.numero)

  const [pc, setPc]             = useState<PC | null>(null)
  const [alerts, setAlerts]     = useState<Alerte[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [modalOpen, setModalOpen]   = useState(false)
  const [modalType, setModalType]   = useState<string | undefined>()
  const [resolveModal, setResolveModal] = useState<string | null>(null) // alertId en cours
  const [resolverNom, setResolverNom]   = useState('')
  const [resolveLoading, setResolveLoading] = useState(false)

  const fetchData = useCallback(async () => {
    const [pcRes, alertsRes] = await Promise.all([
      supabase.from('pcs').select('*').eq('numero', numero).single(),
      supabase.from('alertes').select('*').eq('pc_numero', numero).order('created_at', { ascending: false }),
    ])
    if (pcRes.error || !pcRes.data) { setNotFound(true) } else { setPc(pcRes.data) }
    if (alertsRes.data) setAlerts(alertsRes.data)
    setLoading(false)
  }, [numero])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel(`pc-${numero}-detail`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'alertes', filter: `pc_numero=eq.${numero}` },
        () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, numero])

  const openResolve = (alertId: string) => {
    setResolveModal(alertId)
    setResolverNom('')
  }

  const handleResolve = async () => {
    if (!resolveModal) return
    if (!resolverNom.trim()) { toast.error('Veuillez indiquer votre nom.'); return }
    setResolveLoading(true)
    const { error } = await supabase
      .from('alertes')
      .update({ statut: 'resolu', resolu_par: resolverNom.trim() })
      .eq('id', resolveModal)
    if (error) {
      toast.error('Erreur lors de la mise a jour.')
    } else {
      await recalculateEtat(numero)
      toast.success('Alerte marquee comme resolue.')
      setResolveModal(null)
      setResolverNom('')
      fetchData()
    }
    setResolveLoading(false)
  }

  /* ── derived state ── */
  const pending  = alerts.filter((a) => a.statut === 'en_attente')
  const resolved = alerts.filter((a) => a.statut === 'resolu')

  // Last known password (most recent mot_de_passe alert)
  const lastPassword = alerts.find((a) => a.type_alerte === 'mot_de_passe')

  // Composant status: is there a pending alert for each?
  const composantHasIssue = (key: string) =>
    pending.some((a) => a.type_alerte === key)

  const reinitialisations = alerts.filter((a) => a.type_alerte === 'reinitialisation')

  const [showLogiciels, setShowLogiciels]   = useState(false)
  const [logicielSearch, setLogicielSearch] = useState('')

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Chargement...</p>
    </div>
  )

  if (notFound || !pc) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <PackageOpen className="w-12 h-12 text-slate-300" />
      <p className="text-slate-500 font-medium">PC {numero} introuvable</p>
      <Link href="/" className="text-sm text-slate-700 underline underline-offset-2">Retour au tableau de bord</Link>
    </div>
  )

  const cfg       = ETAT_CONFIG[pc.etat] ?? ETAT_CONFIG.ok
  const isConnexe = pc.salle === 'Salle Connexe'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-slate-400" />
              <h1 className="font-bold text-slate-900">PC {numero}</h1>
              {isConnexe && (
                <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-semibold">
                  Salle Connexe
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setModalType(undefined); setModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Signaler
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Salle Connexe warning ── */}
        {isConnexe && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">PC d&apos;entrainement — Ne pas eteindre</p>
              <p className="text-xs text-amber-700 mt-1">{pc.description}</p>
            </div>
          </div>
        )}

        {/* ── PC Info ── */}
        <div className={`bg-white rounded-xl border-2 ${cfg.border} shadow-sm p-5`}>
          <div className="flex items-start gap-4 flex-wrap justify-between">
            {/* Image + infos */}
            <div className="flex items-center gap-4">
              <div className="bg-slate-50 rounded-xl p-3 flex-shrink-0">
                <Image src="/PC.png" alt={`PC ${pc.numero}`} width={80} height={64} className="object-contain" unoptimized />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">PC {pc.numero}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{pc.salle}</p>
                <div className="flex items-center gap-1.5 mt-2 text-slate-500 text-sm">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  <span>{pc.ram_gb} GB RAM</span>
                </div>
                {/* Dernier mot de passe */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  {lastPassword ? (
                    <span className="font-mono text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg tracking-widest">
                      {lastPassword.description}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Aucun mot de passe</span>
                  )}
                </div>
              </div>
            </div>
            {/* Status */}
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${cfg.badge}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

          {/* Bouton logiciels */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowLogiciels(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <AppWindow className="w-4 h-4 text-slate-500" />
              Voir les logiciels installes
              <span className="ml-1 bg-slate-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pc.logiciels.length}
              </span>
            </button>
          </div>
        </div>

        {/* ── Utilisateurs / Presence ── */}
        <UsageTracker pcNumero={pc.numero} />

        {/* ── QR Code ── */}
        <QRCodeSection numero={pc.numero} />

        {/* ── Composants ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Composants du poste</h3>
          <div className="grid grid-cols-2 gap-2">
            {COMPOSANTS.map(({ key, label, Icon }) => {
              const hasIssue = composantHasIssue(key)
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${
                    hasIssue
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${hasIssue ? 'text-red-500' : 'text-green-600'}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${hasIssue ? 'text-red-800' : 'text-green-800'}`}>{label}</p>
                    <p className={`text-xs ${hasIssue ? 'text-red-600' : 'text-green-600'}`}>
                      {hasIssue ? 'Probleme signale' : 'Present'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Specifications materielles ── */}
        <SpecsCard pcNumero={pc.numero} initialSpecs={pc.specs} onSaved={fetchData} />

        {/* ── Reinitialisations ── */}
        <div className="bg-white rounded-xl border border-purple-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Reinitialisations</h3>
            </div>
            {reinitialisations.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                {reinitialisations.length} fois
              </span>
            )}
          </div>
          {reinitialisations.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune reinitialisation enregistree.</p>
          ) : (
            <div className="space-y-2">
              {reinitialisations.map((r) => (
                <div key={r.id} className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2.5">
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 break-words">{r.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {r.nom_etudiant} · {r.annee} · {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Mot de passe ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Dernier mot de passe connu</h3>
          </div>
          {lastPassword ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-600 font-medium mb-1">Mot de passe signale</p>
              <p className="text-lg font-mono font-bold text-amber-900 tracking-widest">
                {lastPassword.description}
              </p>
              <p className="text-xs text-amber-600 mt-1.5">
                Signale par {lastPassword.nom_etudiant} · {lastPassword.annee} · {formatDate(lastPassword.created_at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Aucun mot de passe signale pour ce PC.</p>
          )}
          <p className="text-xs text-slate-400 mt-3">
            Pour signaler un probleme d&apos;acces, utilisez le bouton <strong className="text-slate-600">Signaler</strong> en haut de la page.
          </p>
        </div>

        {/* ── Popup logiciels ── */}
        {showLogiciels && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowLogiciels(false); setLogicielSearch('') }} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <AppWindow className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800">Logiciels installes — PC {pc.numero}</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                    {pc.logiciels.length}
                  </span>
                </div>
                <button onClick={() => { setShowLogiciels(false); setLogicielSearch('') }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              {pc.logiciels.length > 0 && (
                <div className="px-6 pt-4 pb-2 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={logicielSearch}
                      onChange={e => setLogicielSearch(e.target.value)}
                      placeholder="Rechercher un logiciel..."
                      className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition bg-slate-50"
                    />
                    {logicielSearch && (
                      <button onClick={() => setLogicielSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {logicielSearch && (
                    <p className="text-xs text-slate-400 mt-1.5 pl-1">
                      {pc.logiciels.filter(s => s.toLowerCase().includes(logicielSearch.toLowerCase())).length} resultat(s)
                    </p>
                  )}
                </div>
              )}

              {/* Liste scrollable */}
              <div className="px-6 py-3 overflow-y-auto flex-1">
                {pc.logiciels.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Aucun logiciel enregistre.</p>
                ) : (() => {
                  const filtered = logicielSearch.trim()
                    ? pc.logiciels.filter(s => s.toLowerCase().includes(logicielSearch.toLowerCase()))
                    : [...pc.logiciels].sort((a, b) => a.localeCompare(b))
                  return filtered.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6 italic">
                      Aucun logiciel ne correspond a &ldquo;{logicielSearch}&rdquo;
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {filtered.map((s, i) => (
                        <li key={s} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-xs font-bold text-slate-300 w-5 text-right flex-shrink-0">{i + 1}</span>
                          <span className="text-sm font-medium text-slate-700">{s}</span>
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </div>

              <div className="px-6 py-3 border-t border-slate-100 flex-shrink-0">
                <p className="text-xs text-slate-400 text-center">
                  Mis a jour automatiquement via les signalements des etudiants.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Alertes ── */}
        {alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center gap-3 text-slate-400">
            <Monitor className="w-10 h-10 opacity-30" />
            <p className="text-sm">Aucune alerte pour ce PC</p>
          </div>
        ) : (
          <div className="space-y-5">
            {pending.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Alertes en attente <span className="text-orange-600">({pending.length})</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {pending.map((a) => <AlertItem key={a.id} alerte={a} onResolve={openResolve} />)}
                </div>
              </section>
            )}
            {resolved.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <h3 className="font-semibold text-slate-600 text-sm">
                    Alertes resolues <span className="text-slate-400">({resolved.length})</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {resolved.map((a) => <AlertItem key={a.id} alerte={a} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* ── Modal résolution ── */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResolveModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h3 className="font-bold text-slate-800 text-sm">Marquer comme resolu</h3>
              </div>
              <button onClick={() => setResolveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Indiquez votre nom pour confirmer la resolution de ce probleme.</p>
            <input
              type="text"
              value={resolverNom}
              onChange={e => setResolverNom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResolve()}
              placeholder="Votre nom"
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setResolveModal(null)} className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                Annuler
              </button>
              <button
                onClick={handleResolve}
                disabled={resolveLoading || !resolverNom.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {resolveLoading ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalType(undefined) }}
        defaultPcNumero={numero}
        onSuccess={fetchData}
      />
    </div>
  )
}

/* ── QR Code section ── */
function QRCodeSection({ numero }: { numero: number }) {
  const [exists, setExists] = useState(false)
  const path = `/QRCODE/PC${numero}.png`

  useEffect(() => {
    // Vérifie si le fichier QR existe déjà (après génération)
    fetch(path, { method: 'HEAD' })
      .then((r) => setExists(r.ok))
      .catch(() => setExists(false))
  }, [path])

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <QrCode className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-800 text-sm">QR Code — Acces rapide</h3>
      </div>

      {exists ? (
        <div className="flex items-center gap-5">
          <Image
            src={path}
            alt={`QR Code PC ${numero}`}
            width={120}
            height={120}
            className="rounded-lg border border-slate-100"
            unoptimized
          />
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">PC {numero}</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scannez ce QR code avec un telephone pour acceder directement a la page de ce PC.
            </p>
            <a
              href={path}
              download={`QR-PC${numero}.png`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Telecharger le QR code
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg px-4 py-3">
          <QrCode className="w-8 h-8 text-slate-300 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-500">QR code non encore genere</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Lance le script <code className="bg-slate-200 px-1 rounded">generate_qrcodes.py</code> apres le deploiement sur Vercel.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
