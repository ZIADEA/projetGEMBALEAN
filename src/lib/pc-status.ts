import { supabase } from './supabase'
import type { TypeAlerte } from '@/types'

const STATUS_TRIGGERS: TypeAlerte[] = [
  'panne', 'materiel_uc', 'materiel_moniteur', 'materiel_clavier', 'materiel_souris', 'autre',
]

/**
 * Appelé après insertion d'une alerte.
 * - panne           → hors_service
 * - materiel / autre → probleme (seulement si le PC était ok)
 * - autres types    → aucun changement
 */
export async function applyAlertToEtat(pcNumero: number, type: TypeAlerte) {
  if (type === 'reinitialisation') {
    // Reinitialisation = PC repart de zero → etat ok
    await supabase.from('pcs').update({ etat: 'ok' }).eq('numero', pcNumero)
    return
  }
  if (type === 'panne') {
    await supabase.from('pcs').update({ etat: 'hors_service' }).eq('numero', pcNumero)
    return
  }
  if (['materiel_uc', 'materiel_moniteur', 'materiel_clavier', 'materiel_souris', 'autre'].includes(type)) {
    const { data: pc } = await supabase.from('pcs').select('etat').eq('numero', pcNumero).single()
    if (pc?.etat === 'ok') {
      await supabase.from('pcs').update({ etat: 'probleme' }).eq('numero', pcNumero)
    }
  }
}

/**
 * Appelé après résolution d'une alerte.
 * Recalcule l'état du PC à partir des alertes encore en attente.
 * - plus rien de critique → ok
 * - panne encore ouverte  → hors_service
 * - autre problème ouvert → probleme
 */
export async function recalculateEtat(pcNumero: number) {
  const { data: pending } = await supabase
    .from('alertes')
    .select('type_alerte')
    .eq('pc_numero', pcNumero)
    .eq('statut', 'en_attente')

  const types = (pending ?? []).map((a) => a.type_alerte as TypeAlerte)
  const critical = types.filter((t) => STATUS_TRIGGERS.includes(t))

  let newEtat: 'ok' | 'probleme' | 'hors_service' = 'ok'
  if (critical.includes('panne')) {
    newEtat = 'hors_service'
  } else if (critical.length > 0) {
    newEtat = 'probleme'
  }

  await supabase.from('pcs').update({ etat: newEtat }).eq('numero', pcNumero)
}
