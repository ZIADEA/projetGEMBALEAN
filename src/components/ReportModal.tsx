'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Wrench, Code2, Lock, HelpCircle, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { applyAlertToEtat } from '@/lib/pc-status'
import { SOFTWARE_LIST } from '@/lib/software-list'
import SoftwareSelect from '@/components/SoftwareSelect'
import type { TypeAlerte, AnneeEtudiant } from '@/types'

type ExtraType = 'password' | 'software' | 'software_remove' | 'software_missing' | undefined

const TYPE_OPTIONS: { value: TypeAlerte; label: string; extra?: ExtraType }[] = [
  { value: 'mot_de_passe',         label: "J'ai mis un mot de passe sur ce PC",    extra: 'password' },
  { value: 'demande_mot_de_passe', label: "Je ne connais pas le mot de passe de ce PC" },
  { value: 'panne',                label: 'PC en panne / ne demarre pas' },
  { value: 'materiel_uc',          label: 'Unite centrale manquante ou abimee' },
  { value: 'materiel_moniteur',    label: 'Moniteur manquant ou abime' },
  { value: 'materiel_clavier',     label: 'Clavier manquant ou abime' },
  { value: 'materiel_souris',      label: 'Souris manquante ou abimee' },
  { value: 'logiciel_manquant',    label: 'Logiciel manquant',                      extra: 'software_missing' },
  { value: 'logiciel_installe',    label: 'Nouveau logiciel installe',               extra: 'software' },
  { value: 'logiciel_desinstalle', label: 'Logiciel desinstalle',                    extra: 'software_remove' },
  { value: 'reinitialisation',     label: "J'ai reinitialise ce PC" },
  { value: 'autre',                label: 'Autre probleme' },
]

const ANNEE_OPTIONS: AnneeEtudiant[] = ['3eme annee', '4eme annee', '5eme annee']

const EMPTY = {
  nom:         '',
  annee:       '' as AnneeEtudiant | '',
  pcNumero:    '' as number | '',
  typeAlerte:  '' as TypeAlerte | '',
  description: '',
  motDePasse:  '',
  nomLogiciel: '',
}

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  defaultPcNumero?: number
  onSuccess?: () => void
}

export default function ReportModal({ isOpen, onClose, defaultPcNumero, onSuccess }: ReportModalProps) {
  const [form, setForm]       = useState({ ...EMPTY, pcNumero: defaultPcNumero ?? ('' as number | '') })
  const [loading, setLoading] = useState(false)
  const [pcLogiciels, setPcLogiciels] = useState<string[]>([])
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY, pcNumero: defaultPcNumero ?? '' })
      setPcLogiciels([])
      setTimeout(() => firstInputRef.current?.focus(), 80)
    }
  }, [isOpen, defaultPcNumero])

  // Charge les logiciels du PC sélectionné (utile pour logiciel_desinstalle)
  useEffect(() => {
    if (!form.pcNumero) { setPcLogiciels([]); return }
    supabase.from('pcs').select('logiciels').eq('numero', form.pcNumero).single()
      .then(({ data }) => { if (data) setPcLogiciels([...data.logiciels].sort((a, b) => a.localeCompare(b))) })
  }, [form.pcNumero])

  const set = (key: keyof typeof EMPTY, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Changer de type réinitialise le champ logiciel
  const setType = (v: TypeAlerte) =>
    setForm((f) => ({ ...f, typeAlerte: v, nomLogiciel: '' }))

  const selectedOption = TYPE_OPTIONS.find((o) => o.value === form.typeAlerte)
  const isSoftwareType = ['software', 'software_remove', 'software_missing'].includes(selectedOption?.extra ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { nom, annee, pcNumero, typeAlerte, description, motDePasse, nomLogiciel } = form

    if (!nom.trim() || !annee || !pcNumero || !typeAlerte) {
      toast.error('Veuillez remplir tous les champs obligatoires.')
      return
    }
    if (selectedOption?.extra === 'password' && !motDePasse.trim()) {
      toast.error('Veuillez indiquer le mot de passe.')
      return
    }
    if (isSoftwareType && !nomLogiciel.trim()) {
      toast.error('Veuillez selectionner ou saisir un logiciel.')
      return
    }
    if (!isSoftwareType && selectedOption?.extra !== 'password' && !description.trim()) {
      toast.error('Veuillez remplir la description.')
      return
    }

    // Pour logiciel_manquant, le nom du logiciel devient la description principale
    const finalDescription =
      selectedOption?.extra === 'password'
        ? motDePasse.trim()
        : selectedOption?.extra === 'software_missing'
        ? nomLogiciel.trim() + (description.trim() ? ` — ${description.trim()}` : '')
        : description.trim()

    setLoading(true)
    try {
      const { error } = await supabase.from('alertes').insert({
        pc_numero:    pcNumero,
        type_alerte:  typeAlerte,
        description:  finalDescription,
        nom_etudiant: nom.trim(),
        annee,
        statut: 'en_attente',
      })
      if (error) throw error

      await applyAlertToEtat(Number(pcNumero), typeAlerte)

      if (typeAlerte === 'logiciel_installe' && nomLogiciel.trim()) {
        const { data: pc } = await supabase
          .from('pcs').select('logiciels').eq('numero', pcNumero).single()
        if (pc) {
          const updated = Array.from(new Set([...(pc.logiciels ?? []), nomLogiciel.trim()]))
          await supabase.from('pcs').update({ logiciels: updated }).eq('numero', pcNumero)
        }
      }

      if (typeAlerte === 'logiciel_desinstalle' && nomLogiciel.trim()) {
        const { data: pc } = await supabase
          .from('pcs').select('logiciels').eq('numero', pcNumero).single()
        if (pc) {
          const updated = (pc.logiciels ?? []).filter((s: string) => s !== nomLogiciel.trim())
          await supabase.from('pcs').update({ logiciels: updated }).eq('numero', pcNumero)
        }
      }

      toast.success('Signalement envoye avec succes !')
      onSuccess?.()
      onClose()
    } catch {
      toast.error('Une erreur est survenue. Veuillez reessayer.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-slate-800">Signalement</h2>
            <p className="text-xs text-slate-400 mt-0.5">Salle IA</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Votre nom <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={form.nom}
              onChange={(e) => set('nom', e.target.value)}
              placeholder="Ex: Ahmed Benali"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition"
            />
          </div>

          {/* Annee */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Votre annee <span className="text-red-500">*</span>
            </label>
            <select
              value={form.annee}
              onChange={(e) => set('annee', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent bg-white transition"
            >
              <option value="">-- Selectionnez votre annee --</option>
              {ANNEE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* PC numero */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Numero du PC <span className="text-red-500">*</span>
            </label>
            <select
              value={form.pcNumero}
              onChange={(e) => set('pcNumero', Number(e.target.value) || '')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent bg-white transition"
            >
              <option value="">-- Selectionnez un PC --</option>
              {Array.from({ length: 44 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>PC {n} — Salle IA</option>
              ))}
              <option value={45}>PC 45 — Salle Connexe</option>
              <option value={46}>PC 46 — Salle Connexe</option>
            </select>
          </div>

          {/* Type — sélection visuelle classifiée */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Type de signalement <span className="text-red-500">*</span>
            </label>

            {/* ── Hardware ── */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Probleme Materiel (Hardware)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { v: 'panne',             l: 'PC en panne / ne demarre pas' },
                  { v: 'materiel_uc',       l: 'Unite centrale HS ou manquante' },
                  { v: 'materiel_moniteur', l: 'Moniteur HS ou manquant' },
                  { v: 'materiel_clavier',  l: 'Clavier HS ou manquant' },
                  { v: 'materiel_souris',   l: 'Souris HS ou manquante' },
                ] as { v: TypeAlerte; l: string }[]).map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setType(v)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.typeAlerte === v
                        ? 'bg-red-600 border-red-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50'
                    }`}>{l}</button>
                ))}
              </div>
            </div>

            {/* ── Software ── */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Code2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Logiciel (Software)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { v: 'logiciel_manquant',    l: 'Logiciel manquant' },
                  { v: 'logiciel_installe',    l: 'Nouveau logiciel installe' },
                  { v: 'logiciel_desinstalle', l: 'Logiciel desinstalle' },
                ] as { v: TypeAlerte; l: string }[]).map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setType(v)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.typeAlerte === v
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                    }`}>{l}</button>
                ))}
              </div>
            </div>

            {/* ── Accès ── */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Acces au PC</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { v: 'mot_de_passe',        l: "J'ai mis un mot de passe" },
                  { v: 'demande_mot_de_passe', l: "Je ne connais pas le mdp" },
                ] as { v: TypeAlerte; l: string }[]).map(({ v, l }) => (
                  <button key={v} type="button" onClick={() => setType(v)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.typeAlerte === v
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                    }`}>{l}</button>
                ))}
              </div>
            </div>

            {/* ── Reinitialisation ── */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Reinitialisation</span>
              </div>
              <button type="button" onClick={() => setType('reinitialisation')}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  form.typeAlerte === 'reinitialisation'
                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50'
                }`}>
                J&apos;ai reinitialise ce PC
              </button>
            </div>

            {/* ── Autre ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Autre</span>
              </div>
              <button type="button" onClick={() => setType('autre')}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  form.typeAlerte === 'autre'
                    ? 'bg-slate-700 border-slate-700 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                }`}>
                Autre probleme
              </button>
            </div>
          </div>

          {/* ── Extra: mot de passe ── */}
          {selectedOption?.extra === 'password' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <label className="block text-sm font-medium text-amber-800 mb-1.5">
                Le mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.motDePasse}
                onChange={(e) => set('motDePasse', e.target.value)}
                placeholder="Saisissez le mot de passe"
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition bg-white"
              />
              <p className="text-xs text-amber-700 mt-1.5">
                Ce mot de passe sera visible par tous sur la page de ce PC.
              </p>
            </div>
          )}

          {/* ── Extra: logiciel installe ── */}
          {selectedOption?.extra === 'software' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Logiciel installe <span className="text-red-500">*</span>
              </label>
              <SoftwareSelect
                value={form.nomLogiciel}
                onChange={(name) => set('nomLogiciel', name)}
                options={SOFTWARE_LIST}
                placeholder="Rechercher dans les 114 logiciels..."
                colorScheme="blue"
              />
            </div>
          )}

          {/* ── Extra: logiciel desinstalle ── */}
          {selectedOption?.extra === 'software_remove' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <label className="block text-sm font-medium text-red-800 mb-2">
                Logiciel desinstalle <span className="text-red-500">*</span>
              </label>
              <SoftwareSelect
                value={form.nomLogiciel}
                onChange={(name) => set('nomLogiciel', name)}
                options={pcLogiciels.length > 0 ? pcLogiciels : SOFTWARE_LIST}
                placeholder={pcLogiciels.length > 0 ? 'Rechercher dans les logiciels du PC...' : 'Rechercher un logiciel...'}
                colorScheme="red"
              />
              <p className="text-xs text-red-700 mt-2">
                Le logiciel sera retire automatiquement de la liste du PC.
              </p>
            </div>
          )}

          {/* ── Extra: logiciel manquant ── */}
          {selectedOption?.extra === 'software_missing' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <label className="block text-sm font-medium text-orange-800 mb-2">
                Quel logiciel est manquant ? <span className="text-red-500">*</span>
              </label>
              <SoftwareSelect
                value={form.nomLogiciel}
                onChange={(name) => set('nomLogiciel', name)}
                options={SOFTWARE_LIST}
                placeholder="Rechercher dans les 114 logiciels..."
                colorScheme="amber"
              />
            </div>
          )}

          {/* ── Description ── */}
          {form.typeAlerte && selectedOption?.extra !== 'password' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {form.typeAlerte === 'reinitialisation'
                  ? 'Raison de la reinitialisation'
                  : isSoftwareType
                  ? 'Details supplementaires'
                  : 'Description'}
                {isSoftwareType
                  ? <span className="text-xs text-slate-400 font-normal ml-1">(optionnel)</span>
                  : <span className="text-red-500"> *</span>}
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder={
                  form.typeAlerte === 'reinitialisation'       ? 'Ex: PC infecte par un virus, reinstallation de Windows...'
                  : form.typeAlerte === 'logiciel_installe'    ? 'Precisions sur l\'installation si necessaire...'
                  : form.typeAlerte === 'logiciel_desinstalle' ? 'Raison de la desinstallation si necessaire...'
                  : form.typeAlerte === 'logiciel_manquant'    ? 'Precisions sur le besoin si necessaire...'
                  : form.typeAlerte === 'demande_mot_de_passe' ? 'Precisions sur le probleme d\'acces...'
                  : 'Decrivez en detail...'
                }
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent resize-none transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Envoi en cours...' : 'Envoyer le signalement'}
          </button>
        </form>
      </div>
    </div>
  )
}
