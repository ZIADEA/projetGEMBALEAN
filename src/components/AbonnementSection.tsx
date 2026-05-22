'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, X, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface Responsable {
  id: string
  nom: string
  email: string
}

export default function AbonnementSection() {
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [nom, setNom]     = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchResponsables = useCallback(async () => {
    const { data } = await supabase
      .from('responsables')
      .select('id, nom, email')
      .order('created_at')
    if (data) setResponsables(data)
  }, [])

  useEffect(() => { fetchResponsables() }, [fetchResponsables])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim() || !email.trim()) return
    setLoading(true)
    const { error } = await supabase
      .from('responsables')
      .insert({ nom: nom.trim(), email: email.trim().toLowerCase() })
    if (error) {
      if (error.code === '23505') {
        toast.error('Cet email est deja inscrit.')
      } else {
        toast.error(`Erreur: ${error.message}`)
      }
    } else {
      toast.success(`${nom.trim()} inscrit aux notifications.`)
      setNom('')
      setEmail('')
      fetchResponsables()
    }
    setLoading(false)
  }

  const handleRemove = async (id: string, name: string) => {
    const { error } = await supabase.from('responsables').delete().eq('id', id)
    if (!error) {
      toast.success(`${name} retire des notifications.`)
      fetchResponsables()
    }
  }

  return (
    <section className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-indigo-100 rounded-lg">
          <Bell className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">Notifications par email</h2>
          <p className="text-xs text-slate-400">Recevez un email a chaque nouvelle alerte materielle ou logicielle</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={nom}
          onChange={e => setNom(e.target.value)}
          placeholder="Votre nom"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Votre email"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
        <button
          type="submit"
          disabled={loading || !nom.trim() || !email.trim()}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          S&apos;abonner
        </button>
      </form>

      {responsables.length === 0 ? (
        <div className="flex items-center gap-2 text-slate-400 py-2">
          <Mail className="w-4 h-4 opacity-40" />
          <span className="text-xs">Aucun responsable inscrit pour le moment.</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {responsables.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 truncate">{r.nom}</span>
              </div>
              <button
                onClick={() => handleRemove(r.id, r.nom)}
                className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                title="Retirer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
