'use client'

import { useState, useEffect } from 'react'
import {
  Cpu, HardDrive, Database, Layers,
  Pencil, Save, X, Plus, Trash2,
  ChevronDown, ChevronUp, CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { PCSpecs, PCStorageDisk, PCGPU } from '@/types'

const DEFAULT_SPECS: PCSpecs = {
  cpu: {
    modele: 'Intel Core i7-9700',
    frequence: '3.00 GHz',
    cores: 8,
    logicalProcessors: 8,
    cacheL1: '512 KB',
    cacheL2: '2.0 MB',
    cacheL3: '12.0 MB',
    virtualisation: true,
  },
  ram: {
    capacite: '16 GB',
    vitesse: '2666 MT/s',
    type: 'DIMM',
    slots: 4,
    slotsUtilises: 1,
  },
  stockage: [
    { disque: 'Disk 0 (C:)', type: 'SSD SATA', capacite: '239 GB', role: 'Systeme' },
    { disque: 'Disk 1 (D:)', type: 'HDD SATA', capacite: '932 GB', role: 'Donnees' },
  ],
  gpu: [
    { id: 'GPU 0', modele: 'Intel UHD Graphics', vram: null, type: 'Integree' },
    { id: 'GPU 1', modele: 'AMD Radeon 520',      vram: '2.0 GB', type: 'Discrete' },
  ],
}

function Field({ label, value, onChange, placeholder, type = 'text', className = '' }: {
  label: string; value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string; className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-transparent transition bg-white"
      />
    </div>
  )
}

interface Props {
  pcNumero: number
  initialSpecs: PCSpecs | null
  onSaved?: () => void
}

export default function SpecsCard({ pcNumero, initialSpecs, onSaved }: Props) {
  const [specs, setSpecs]     = useState<PCSpecs>(initialSpecs ?? DEFAULT_SPECS)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<PCSpecs>(specs)
  const [saving, setSaving]   = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!editing) setSpecs(initialSpecs ?? DEFAULT_SPECS)
  }, [initialSpecs, editing])

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(specs)))
    setEditing(true)
    setCollapsed(false)
  }

  const cancelEdit = () => setEditing(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const ramGb = parseInt(draft.ram.capacite, 10) || 16
      const { error } = await supabase.from('pcs').update({ specs: draft, ram_gb: ramGb }).eq('numero', pcNumero)
      if (error) throw error
      setSpecs(draft)
      setEditing(false)
      toast.success('Specifications mises a jour.')
      onSaved?.()
    } catch {
      toast.error('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  /* ── CPU helpers ── */
  const setCpu = (key: keyof PCSpecs['cpu'], value: string | number | boolean) =>
    setDraft(d => ({ ...d, cpu: { ...d.cpu, [key]: value } }))

  /* ── RAM helpers ── */
  const setRam = (key: keyof PCSpecs['ram'], value: string | number) =>
    setDraft(d => ({ ...d, ram: { ...d.ram, [key]: value } }))

  /* ── Storage helpers ── */
  const setDisk = (i: number, key: keyof PCStorageDisk, v: string) =>
    setDraft(d => ({ ...d, stockage: d.stockage.map((s, j) => j === i ? { ...s, [key]: v } : s) }))
  const addDisk = () =>
    setDraft(d => ({ ...d, stockage: [...d.stockage, { disque: '', type: '', capacite: '', role: '' }] }))
  const removeDisk = (i: number) =>
    setDraft(d => ({ ...d, stockage: d.stockage.filter((_, j) => j !== i) }))

  /* ── GPU helpers ── */
  const setGpu = (i: number, key: keyof PCGPU, v: string | null) =>
    setDraft(d => ({ ...d, gpu: d.gpu.map((g, j) => j === i ? { ...g, [key]: v } : g) }))
  const addGpu = () =>
    setDraft(d => ({ ...d, gpu: [...d.gpu, { id: `GPU ${d.gpu.length}`, modele: '', vram: null, type: '' }] }))
  const removeGpu = (i: number) =>
    setDraft(d => ({ ...d, gpu: d.gpu.filter((_, j) => j !== i) }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-600 transition-colors"
        >
          <Cpu className="w-4 h-4 text-slate-500" />
          Specifications materielles
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>

        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Modifier
            </button>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <X className="w-3 h-3" />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 py-4 space-y-5">
          {/* ════ CPU ════ */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">CPU</h4>
            </div>

            {!editing ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm font-bold text-slate-800">{specs.cpu.modele}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {specs.cpu.frequence} &bull; {specs.cpu.cores} cores &bull; {specs.cpu.logicalProcessors} threads
                </p>
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  <span>L1: <strong>{specs.cpu.cacheL1}</strong></span>
                  <span>L2: <strong>{specs.cpu.cacheL2}</strong></span>
                  <span>L3: <strong>{specs.cpu.cacheL3}</strong></span>
                </div>
                <div className="mt-2">
                  {specs.cpu.virtualisation ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Virtualisation activee
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Virtualisation desactivee</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-blue-200 rounded-xl p-4 space-y-3">
                <Field label="Modele" value={draft.cpu.modele} onChange={v => setCpu('modele', v)} placeholder="ex: Intel Core i7-9700" className="col-span-2" />
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Frequence" value={draft.cpu.frequence} onChange={v => setCpu('frequence', v)} placeholder="3.00 GHz" />
                  <Field label="Cores" value={draft.cpu.cores} onChange={v => setCpu('cores', Number(v))} type="number" />
                  <Field label="Threads" value={draft.cpu.logicalProcessors} onChange={v => setCpu('logicalProcessors', Number(v))} type="number" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Cache L1" value={draft.cpu.cacheL1} onChange={v => setCpu('cacheL1', v)} placeholder="512 KB" />
                  <Field label="Cache L2" value={draft.cpu.cacheL2} onChange={v => setCpu('cacheL2', v)} placeholder="2.0 MB" />
                  <Field label="Cache L3" value={draft.cpu.cacheL3} onChange={v => setCpu('cacheL3', v)} placeholder="12.0 MB" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={draft.cpu.virtualisation}
                    onChange={e => setCpu('virtualisation', e.target.checked)}
                    className="w-4 h-4 rounded accent-slate-800"
                  />
                  <span className="text-xs text-slate-600 font-medium">Virtualisation activee</span>
                </label>
              </div>
            )}
          </section>

          {/* ════ RAM ════ */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-3.5 h-3.5 text-purple-500" />
              <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider">RAM</h4>
            </div>

            {!editing ? (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <p className="text-2xl font-black text-slate-800">{specs.ram.capacite}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {specs.ram.vitesse} &bull; {specs.ram.type}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {specs.ram.slots} slots &mdash; {specs.ram.slotsUtilises} utilise{specs.ram.slotsUtilises > 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="border border-purple-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Capacite" value={draft.ram.capacite} onChange={v => setRam('capacite', v)} placeholder="16 GB" />
                  <Field label="Vitesse" value={draft.ram.vitesse} onChange={v => setRam('vitesse', v)} placeholder="2666 MT/s" />
                  <Field label="Type" value={draft.ram.type} onChange={v => setRam('type', v)} placeholder="DIMM" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Slots total" value={draft.ram.slots} onChange={v => setRam('slots', Number(v))} type="number" />
                  <Field label="Slots utilises" value={draft.ram.slotsUtilises} onChange={v => setRam('slotsUtilises', Number(v))} type="number" />
                </div>
              </div>
            )}
          </section>

          {/* ════ Stockage ════ */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Stockage</h4>
            </div>

            {!editing ? (
              <div className="space-y-2">
                {specs.stockage.map((d) => (
                  <div key={d.disque} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <HardDrive className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{d.capacite}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          d.type.toLowerCase().includes('ssd')
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>{d.type}</span>
                        <span className="text-xs text-slate-400">{d.role}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{d.disque}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-emerald-200 rounded-xl p-4 space-y-2">
                {draft.stockage.map((d, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end">
                    <Field label="Disque" value={d.disque} onChange={v => setDisk(i, 'disque', v)} placeholder="Disk 0 (C:)" />
                    <Field label="Type" value={d.type} onChange={v => setDisk(i, 'type', v)} placeholder="SSD SATA" />
                    <Field label="Capacite" value={d.capacite} onChange={v => setDisk(i, 'capacite', v)} placeholder="239 GB" />
                    <div className="flex items-end gap-1.5">
                      <Field label="Role" value={d.role} onChange={v => setDisk(i, 'role', v)} placeholder="Systeme" className="flex-1" />
                      <button
                        type="button"
                        onClick={() => removeDisk(i)}
                        className="mb-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDisk}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 mt-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un disque
                </button>
              </div>
            )}
          </section>

          {/* ════ GPU ════ */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-3.5 h-3.5 text-orange-500" />
              <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider">GPU</h4>
            </div>

            {!editing ? (
              <div className="space-y-2">
                {specs.gpu.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <Layers className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{g.modele}</span>
                        {g.vram && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 border border-orange-200">
                            {g.vram} VRAM
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{g.type}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{g.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-orange-200 rounded-xl p-4 space-y-2">
                {draft.gpu.map((g, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end">
                    <Field label="ID" value={g.id} onChange={v => setGpu(i, 'id', v)} placeholder="GPU 0" />
                    <Field label="Modele" value={g.modele} onChange={v => setGpu(i, 'modele', v)} placeholder="AMD Radeon 520" />
                    <Field label="VRAM (vide si integree)" value={g.vram ?? ''} onChange={v => setGpu(i, 'vram', v || null)} placeholder="2.0 GB" />
                    <div className="flex items-end gap-1.5">
                      <Field label="Type" value={g.type} onChange={v => setGpu(i, 'type', v)} placeholder="Discrete" className="flex-1" />
                      <button
                        type="button"
                        onClick={() => removeGpu(i)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addGpu}
                  className="flex items-center gap-1.5 text-xs font-medium text-orange-700 hover:text-orange-800 mt-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un GPU
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
