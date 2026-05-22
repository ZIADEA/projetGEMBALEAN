import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const { pc_numero, type_label, description, nom_etudiant, annee } = await req.json()

    const GMAIL_USER = process.env.GMAIL_USER
    const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD

    if (!GMAIL_USER || !GMAIL_PASS) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'not_configured' })
    }

    const supaRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/responsables?select=nom,email`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      }
    )

    const responsables: { nom: string; email: string }[] = await supaRes.json()
    if (!responsables || responsables.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    })

    const sends = responsables.map((r) =>
      transporter.sendMail({
        from: `"PC Manager — Salle IA" <${GMAIL_USER}>`,
        to: r.email,
        subject: `[PC Manager] Nouvelle alerte — PC ${pc_numero}`,
        html: buildEmail({ pc_numero, type_label, description, nom_etudiant, annee, responsable_nom: r.nom }),
      })
    )

    await Promise.allSettled(sends)
    return NextResponse.json({ ok: true, sent: responsables.length })
  } catch (err) {
    console.error('[notify]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

function buildEmail(p: {
  pc_numero: number
  type_label: string
  description: string
  nom_etudiant: string
  annee: string
  responsable_nom: string
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">

  <div style="background:#0f172a;padding:20px 24px">
    <p style="margin:0;color:white;font-size:15px;font-weight:800;letter-spacing:-0.01em">PC Manager — Salle IA</p>
    <p style="margin:5px 0 0;color:#94a3b8;font-size:12px">Notification automatique</p>
  </div>

  <div style="padding:24px">
    <p style="margin:0 0 14px;color:#475569;font-size:14px">
      Bonjour <strong style="color:#1e293b">${p.responsable_nom}</strong>,
    </p>
    <p style="margin:0 0 20px;color:#1e293b;font-size:14px;line-height:1.6">
      Une nouvelle alerte a ete signalee sur <strong>PC ${p.pc_numero}</strong>.
      Votre intervention est requise dans les meilleurs delais.
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr>
          <td style="color:#64748b;padding:5px 12px 5px 0;white-space:nowrap;vertical-align:top">Type</td>
          <td style="color:#1e293b;font-weight:700;padding:5px 0">${p.type_label}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding:5px 12px 5px 0;white-space:nowrap;vertical-align:top">Description</td>
          <td style="color:#1e293b;padding:5px 0">${p.description || '—'}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding:5px 12px 5px 0;white-space:nowrap;vertical-align:top">Signale par</td>
          <td style="color:#1e293b;padding:5px 0">${p.nom_etudiant} &bull; ${p.annee}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6">
      Ce message est envoye automatiquement par PC Manager.<br>
      Pour vous desinscrire, retirez votre email depuis la page d&apos;accueil de l&apos;application.
    </p>
  </div>

</div>
</body>
</html>`
}
