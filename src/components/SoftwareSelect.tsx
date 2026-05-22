'use client'

import { useState } from 'react'
import { Search, X, Plus, Check } from 'lucide-react'

interface Props {
  value: string
  onChange: (name: string) => void
  options: readonly string[]
  placeholder?: string
  colorScheme?: 'blue' | 'red' | 'amber' | 'slate'
}

const RING: Record<string, string> = {
  blue:  'focus:ring-blue-500',
  red:   'focus:ring-red-500',
  amber: 'focus:ring-amber-500',
  slate: 'focus:ring-slate-800',
}

export default function SoftwareSelect({ value, onChange, options, placeholder, colorScheme = 'slate' }: Props) {
  const [search, setSearch]     = useState('')
  const [otherMode, setOtherMode] = useState(() => value !== '' && !(options as readonly string[]).includes(value))
  const [customText, setCustomText] = useState(() => otherMode ? value : '')

  const sorted = [...options].sort((a, b) => a.localeCompare(b))
  const filtered = search.trim()
    ? sorted.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : sorted

  const ring = RING[colorScheme]

  const handleSelectItem = (name: string) => {
    setOtherMode(false)
    setSearch('')
    onChange(name)
  }

  const handleSelectOther = () => {
    setOtherMode(true)
    setSearch('')
    onChange(customText)
  }

  const handleCustomChange = (text: string) => {
    setCustomText(text)
    onChange(text)
  }

  const isFromList = value && !otherMode

  return (
    <div className="space-y-2">

      {/* Chip de selection active */}
      {isFromList && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium">
          <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
          <span className="flex-1 truncate">{value}</span>
          <button type="button" onClick={() => onChange('')} className="flex-shrink-0 text-slate-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={placeholder ?? 'Rechercher un logiciel...'}
          className={`w-full pl-8 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ring} focus:border-transparent transition bg-white`}
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Compteur */}
      {search.trim() && (
        <p className="text-xs text-slate-400 pl-1">
          {filtered.length} resultat{filtered.length !== 1 ? 's' : ''} pour &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Liste */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="max-h-44 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 italic">Aucun logiciel trouve</p>
          ) : (
            filtered.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelectItem(s)}
                className={`w-full text-left px-3 py-2 text-xs border-b border-slate-100 last:border-0 transition-colors flex items-center gap-2 ${
                  value === s && !otherMode
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {value === s && !otherMode && <Check className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                <span>{s}</span>
              </button>
            ))
          )}
        </div>

        {/* Option Autre — toujours visible en bas */}
        <button
          type="button"
          onClick={handleSelectOther}
          className={`w-full text-left px-3 py-2 text-xs border-t border-slate-200 flex items-center gap-2 transition-colors font-medium ${
            otherMode
              ? 'bg-slate-800 text-white'
              : 'hover:bg-slate-50 text-slate-500'
          }`}
        >
          <Plus className="w-3 h-3 flex-shrink-0" />
          Autre (nom personnalise)
        </button>
      </div>

      {/* Saisie libre si Autre */}
      {otherMode && (
        <input
          type="text"
          value={customText}
          onChange={e => handleCustomChange(e.target.value)}
          placeholder="Nom exact du logiciel..."
          autoFocus
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ring} focus:border-transparent transition bg-white`}
        />
      )}
    </div>
  )
}
