'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { AnneeEtudiant, Utilisation } from '@/types'

const ANNEE_OPTIONS: AnneeEtudiant[] = ['3eme annee', '4eme annee', '5eme annee']

function groupByDay(utilisations: Utilisation[]): { date: string; items: Utilisation[] }[] {
  const groups: Record<string, Utilisation[]> = {}
  for (const u of utilisations) {
    const day = new Date(u.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    if (!groups[day]) groups[day] = []
    groups[day].push(u)
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }))
}

export default function UsageTracker({ pcNumero }: { pcNumero: number }) {
  const [utilisations, setUtilisations] = useState<Utilisation[]>([])
  const [nom, setNom]     = useState('')
  const [annee, setAnnee] = useState<AnneeEtudiant | ''>('')
  const [loading, setLoading]       = useState(false)
  const [showHistory, setShowHistory] = useState(true)

  const fetchUtilisations = useCallback(async () => {
    const twoMonthsAgo = new Date()
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

    const { data } = await supabase
      .from('utilisations')
      .select('*')
      .eq('pc_numero', pcNumero)
      .gte('created_at', twoMonthsAgo.toISOString())
      .order('created_at', { ascending: false })

    if (data) setUtilisations(data)
  }, [pcNumero])

  useEffect(() => { fetchUtilisations() }, [fetchUtilisations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim() || !annee) {
      toast.error('Veuillez remplir votre nom et votre annee.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('utilisations').insert({
        pc_numero:    pcNumero,
        nom_etudiant: nom.trim(),
        annee,
      })
      if (error) throw error
      toast.success('Presence enregistree !')
      setNom('')
      setAnnee('')
      fetchUtilisations()
    } catch {
      toast.error("Erreur lors de l'enregistrement.")
    } finally {
      setLoading(false)
    }
  }

  const grouped = groupByDay(utilisations)
  const fmt     = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const todayStr     = fmt(new Date())
  const yesterdayStr = fmt(new Date(Date.now() - 86_400_000))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-800 text-sm">Utilisateurs du poste</h3>
        {utilisations.length > 0 && (
          <span className="ml-auto text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
            {utilisations.length} sur 2 mois
          </span>
        )}
      </div>

      {/* Formulaire de presence */}
      <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">J&apos;utilise ce PC maintenant</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Votre nom"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition bg-white"
          />
          <select
            value={annee}
            onChange={(e) => setAnnee(e.target.value as AnneeEtudiant)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent bg-white transition"
          >
            <option value="">Annee</option>
            {ANNEE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5" />
            {loading ? 'Envoi...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Historique */}
      {utilisations.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-2">
          Aucune utilisation enregistree sur les 2 derniers mois.
        </p>
      ) : (
        <>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-3 transition-colors"
          >
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Historique des 2 derniers mois
          </button>

          {showHistory && (
            <div className="space-y-4">
              {grouped.map(({ date, items }) => (
                <div key={date}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {date === todayStr
                      ? "Aujourd'hui"
                      : date === yesterdayStr
                      ? 'Hier'
                      : date}
                    <span className="ml-2 font-normal normal-case text-slate-300">
                      {items.length} {items.length > 1 ? 'utilisateurs' : 'utilisateur'}
                    </span>
                  </p>
                  <div className="space-y-1">
                    {items.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <Clock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                        <span className="text-xs font-mono font-semibold text-slate-500 flex-shrink-0 w-10">
                          {new Date(u.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{u.nom_etudiant}</span>
                        <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{u.annee}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
