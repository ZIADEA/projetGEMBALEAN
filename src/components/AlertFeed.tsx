'use client'

import { useEffect, useState } from 'react'
import { Inbox } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AlertItem from './AlertItem'
import type { Alerte } from '@/types'

interface AlertFeedProps {
  initialAlerts: Alerte[]
}

export default function AlertFeed({ initialAlerts }: AlertFeedProps) {
  const [alerts, setAlerts] = useState<Alerte[]>(initialAlerts)

  // Sync quand le parent rafraîchit ses données
  useEffect(() => {
    setAlerts(initialAlerts)
  }, [initialAlerts])

  useEffect(() => {
    const channel = supabase
      .channel('alertes-realtime-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alertes' },
        (payload) => {
          setAlerts((prev) => [payload.new as Alerte, ...prev].slice(0, 5))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
        <Inbox className="w-8 h-8 opacity-40" />
        <p className="text-sm">Aucune alerte recente</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alerte) => (
        <AlertItem key={alerte.id} alerte={alerte} compact />
      ))}
    </div>
  )
}
