'use client'

import {
  Lock,
  KeyRound,
  Wrench,
  Server,
  Monitor,
  Keyboard,
  MousePointer2,
  Package,
  CheckCircle,
  HelpCircle,
  Clock,
  CheckCheck,
  RotateCcw,
} from 'lucide-react'
import type { Alerte, TypeAlerte } from '@/types'

type TypeConfig = {
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const TYPE_CONFIG: Record<TypeAlerte, TypeConfig> = {
  mot_de_passe:        { label: 'Mot de passe signale',       Icon: Lock },
  demande_mot_de_passe:{ label: 'Demande de mot de passe',    Icon: KeyRound },
  panne:               { label: 'Panne / Ne demarre pas',     Icon: Wrench },
  materiel_uc:         { label: 'Unite centrale — probleme',  Icon: Server },
  materiel_moniteur:   { label: 'Moniteur — probleme',        Icon: Monitor },
  materiel_clavier:    { label: 'Clavier — probleme',         Icon: Keyboard },
  materiel_souris:     { label: 'Souris — probleme',          Icon: MousePointer2 },
  logiciel_manquant:    { label: 'Logiciel manquant',         Icon: Package },
  logiciel_installe:    { label: 'Logiciel installe',         Icon: CheckCircle },
  logiciel_desinstalle: { label: 'Logiciel desinstalle',      Icon: Package },
  reinitialisation:     { label: 'Reinitialisation du PC',    Icon: RotateCcw },
  autre:               { label: 'Autre probleme',             Icon: HelpCircle },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface AlertItemProps {
  alerte: Alerte
  compact?: boolean
  onResolve?: (id: string) => void
}

export default function AlertItem({ alerte, compact = false, onResolve }: AlertItemProps) {
  const config = TYPE_CONFIG[alerte.type_alerte] ?? TYPE_CONFIG.autre
  const { Icon } = config
  const pending = alerte.statut === 'en_attente'

  if (compact) {
    return (
      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
        <div className="mt-0.5 p-1.5 bg-slate-100 rounded-md flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700">PC {alerte.pc_numero}</span>
            <span className="text-xs text-slate-500">{config.label}</span>
            {pending ? (
              <span className="ml-auto text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full">
                En attente
              </span>
            ) : (
              <span className="ml-auto text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                Resolu
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{alerte.description}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {alerte.nom_etudiant} · {alerte.annee} · {formatDate(alerte.created_at)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="p-2.5 bg-slate-100 rounded-lg flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <span className="font-semibold text-slate-800">{config.label}</span>
            <p className="text-sm text-slate-500 mt-0.5 break-words">{alerte.description}</p>
          </div>
          {pending ? (
            <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
              <Clock className="w-3 h-3" />
              En attente
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
              <CheckCheck className="w-3 h-3" />
              Resolu
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 flex-wrap">
          <span>{alerte.nom_etudiant}</span>
          <span>·</span>
          <span>{alerte.annee}</span>
          <span>·</span>
          <span>{formatDate(alerte.created_at)}</span>
        </div>
        {onResolve && pending && (
          <button
            onClick={() => onResolve(alerte.id)}
            className="mt-3 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
          >
            Marquer comme resolu
          </button>
        )}
      </div>
    </div>
  )
}
