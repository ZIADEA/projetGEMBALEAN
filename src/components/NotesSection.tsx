'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Send, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { AnneeEtudiant } from '@/types'

interface Note {
  id: string
  pc_numero: number
  nom_etudiant: string
  annee: string
  message: string
  created_at: string
}

const ANNEES: AnneeEtudiant[] = ['3eme annee', '4eme annee', '5eme annee']

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function NotesSection({ pcNumero }: { pcNumero: number }) {
  const [notes, setNotes]         = useState<Note[]>([])
  const [nom, setNom]             = useState('')
  const [annee, setAnnee]         = useState<AnneeEtudiant | ''>('')
  const [message, setMessage]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('pc_numero', pcNumero)
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
  }, [pcNumero])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim() || !annee || !message.trim()) {
      toast.error('Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('notes').insert({
      pc_numero:    pcNumero,
      nom_etudiant: nom.trim(),
      annee,
      message:      message.trim(),
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Message publie !')
      setNom('')
      setAnnee('')
      setMessage('')
      fetchNotes()
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) {
      toast.success('Message supprime.')
      setConfirmId(null)
      fetchNotes()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-sky-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-sky-100 rounded-lg">
          <MessageSquare className="w-4 h-4 text-sky-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Messages pour ce PC</h3>
          <p className="text-xs text-slate-400">Laissez une note pour les prochains utilisateurs</p>
        </div>
        {notes.length > 0 && (
          <span className="ml-auto text-xs bg-sky-100 text-sky-700 font-semibold px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        )}
      </div>

      {/* Formulaire */}
      <form onSubmit={handleAdd} className="space-y-3 mb-5">
        <div className="flex gap-2">
          <input
            type="text"
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder="Votre nom"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
          />
          <select
            value={annee}
            onChange={e => setAnnee(e.target.value as AnneeEtudiant)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white transition"
          >
            <option value="">Votre annee</option>
            {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Ex: Ce PC a tendance a chauffer, pensez a bien ventiler..."
            rows={2}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none transition"
          />
          <button
            type="submit"
            disabled={loading || !nom.trim() || !annee || !message.trim()}
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
            Publier
          </button>
        </div>
      </form>

      {/* Liste des messages */}
      {notes.length === 0 ? (
        <div className="flex items-center gap-2 text-slate-400 py-3">
          <MessageSquare className="w-4 h-4 opacity-30" />
          <p className="text-xs">Aucun message pour ce PC.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="bg-sky-50 border border-sky-100 rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-700 leading-relaxed flex-1">{note.message}</p>

                {confirmId === note.id ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(note.id)}
                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                    title="Supprimer ce message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {note.nom_etudiant} · {note.annee} · {formatDate(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
