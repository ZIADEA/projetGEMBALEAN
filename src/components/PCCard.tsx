'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import type { PC } from '@/types'

type EtatConfig = {
  label: string
  dot: string
  bar: string
  textColor: string
}

const ETAT_CONFIG: Record<string, EtatConfig> = {
  ok:           { label: 'Fonctionnel',  dot: 'bg-green-500',  bar: 'bg-green-500',  textColor: 'text-green-700'  },
  probleme:     { label: 'Probleme',     dot: 'bg-orange-500', bar: 'bg-orange-500', textColor: 'text-orange-700' },
  hors_service: { label: 'Hors service', dot: 'bg-red-500',    bar: 'bg-red-500',    textColor: 'text-red-700'    },
}

const BG_COLORS: Record<string, string> = {
  ok:           'from-emerald-50 to-slate-50',
  probleme:     'from-orange-50 to-slate-50',
  hors_service: 'from-red-50 to-slate-50',
}

interface PCCardProps {
  pc: PC
  alertCount: number
  onReport: (pcNumero: number) => void
}

export default function PCCard({ pc, alertCount, onReport }: PCCardProps) {
  const cfg       = ETAT_CONFIG[pc.etat] ?? ETAT_CONFIG.ok
  const bgGrad    = BG_COLORS[pc.etat] ?? BG_COLORS.ok
  const isConnexe = pc.salle === 'Salle Connexe'

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col group border border-slate-100 hover:border-slate-200">

      {/* ── Product image area ── */}
      <div className={`relative bg-gradient-to-br ${bgGrad} flex items-center justify-center py-6 px-4`}>
        {/* Alert badge */}
        {alertCount > 0 && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            <AlertCircle className="w-3 h-3" />
            {alertCount}
          </span>
        )}

        {/* 24/7 badge for salle connexe */}
        {isConnexe && (
          <span className="absolute top-2 left-2 flex items-center gap-0.5 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            <AlertTriangle className="w-3 h-3" />
            24/7
          </span>
        )}

        {/* PC image */}
        <Image
          src="/PC.png"
          alt={`PC ${pc.numero}`}
          width={110}
          height={88}
          className="object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
      </div>

      {/* ── Status bar ── */}
      <div className={`h-1 w-full ${cfg.bar}`} />

      {/* ── Info area ── */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* PC number */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Poste</p>
            <h3 className="text-2xl font-black text-slate-900 leading-tight">#{pc.numero}</h3>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</span>
          </div>
        </div>

        {/* RAM */}
        <p className="text-xs text-slate-500 font-medium">{pc.ram_gb} GB RAM</p>

        {/* Software chips */}
        {pc.logiciels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pc.logiciels.slice(0, 2).map((s) => (
              <span
                key={s}
                title={s}
                className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full truncate max-w-[80px]"
              >
                {s}
              </span>
            ))}
            {pc.logiciels.length > 2 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-xs rounded-full">
                +{pc.logiciels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-auto pt-1">
          <Link
            href={`/pc/${pc.numero}`}
            className="flex-1 text-center py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Voir details
          </Link>
          <button
            onClick={() => onReport(pc.numero)}
            className="py-2 px-3 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
            title="Signaler un probleme"
          >
            Signaler
          </button>
        </div>
      </div>
    </div>
  )
}
