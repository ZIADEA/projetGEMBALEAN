"""
Generateur de QR codes — PC Manager Salle Info
================================================
Genere 46 QR codes (PC 1 a 46), un par PC.
Chaque QR code pointe vers la page detail du PC sur le site.

UTILISATION :
    1. Installer les dependances :
           pip install qrcode[pil] Pillow

    2. Remplacer BASE_URL par l'URL de production apres deploiement Vercel :
           BASE_URL = "https://ton-app.vercel.app"

    3. Lancer le script :
           python generate_qrcodes.py

Les fichiers generes : PC1.png, PC2.png, ... PC46.png
dans le meme dossier public/QRCODE/
"""

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from PIL import Image, ImageDraw, ImageFont
import os

# ────────────────────────────────────────────────────────────
# CONFIGURATION — changer uniquement BASE_URL apres deploiement
# ────────────────────────────────────────────────────────────
BASE_URL   = "https://ton-app.vercel.app"   # <- remplacer apres deploiement Vercel
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))   # meme dossier que ce script
NB_PCS     = 46

# Couleurs
QR_COLOR_SALLE     = "#1e293b"   # slate-900  — Salle Informatique
QR_COLOR_CONNEXE   = "#b45309"   # amber-700  — Salle Connexe
BACK_COLOR         = "#ffffff"

# ────────────────────────────────────────────────────────────

def get_salle(numero: int) -> str:
    return "Salle Connexe" if numero >= 45 else "Salle Informatique"

def get_color(numero: int) -> str:
    return QR_COLOR_CONNEXE if numero >= 45 else QR_COLOR_SALLE

def generate_qr(numero: int):
    url         = f"{BASE_URL}/pc/{numero}"
    salle       = get_salle(numero)
    fill_color  = get_color(numero)

    # ── QR code ──
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    try:
        # Style arrondi si disponible
        qr_img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            fill_color=fill_color,
            back_color=BACK_COLOR,
        ).convert("RGB")
    except Exception:
        qr_img = qr.make_image(fill_color=fill_color, back_color=BACK_COLOR).convert("RGB")

    qr_size = qr_img.size[0]

    # ── Canvas avec label en bas ──
    label_height = 60
    canvas = Image.new("RGB", (qr_size, qr_size + label_height), "white")
    canvas.paste(qr_img, (0, 0))

    draw = ImageDraw.Draw(canvas)

    # Texte PC numero
    try:
        font_big   = ImageFont.truetype("arial.ttf", 22)
        font_small = ImageFont.truetype("arial.ttf", 13)
    except OSError:
        font_big   = ImageFont.load_default()
        font_small = ImageFont.load_default()

    text_pc    = f"PC {numero}"
    text_salle = salle

    # Centrer les textes
    w_pc,   _ = draw.textsize(text_pc,    font=font_big)   if hasattr(draw, 'textsize') else (qr_size // 2, 0)
    w_sl,   _ = draw.textsize(text_salle, font=font_small) if hasattr(draw, 'textsize') else (qr_size // 2, 0)

    draw.text(((qr_size - w_pc) // 2, qr_size + 6),  text_pc,    font=font_big,   fill=fill_color)
    draw.text(((qr_size - w_sl) // 2, qr_size + 34), text_salle, font=font_small, fill="#64748b")

    # ── Sauvegarde ──
    output_path = os.path.join(OUTPUT_DIR, f"PC{numero}.png")
    canvas.save(output_path)
    print(f"  [OK] PC{numero}.png  ->  {url}")

# ────────────────────────────────────────────────────────────

def main():
    if BASE_URL == "https://ton-app.vercel.app":
        print("=" * 60)
        print("ATTENTION : BASE_URL n'a pas ete modifie !")
        print("Ouvre ce fichier et remplace BASE_URL par")
        print("l'URL reelle de ton application Vercel.")
        print("=" * 60)
        rep = input("Continuer quand meme (pour test local) ? [o/N] : ").strip().lower()
        if rep != "o":
            print("Annule.")
            return

    print(f"\nGeneration de {NB_PCS} QR codes vers : {BASE_URL}\n")

    for i in range(1, NB_PCS + 1):
        generate_qr(i)

    print(f"\nTermine ! {NB_PCS} fichiers generes dans :")
    print(f"  {OUTPUT_DIR}")
    print("\nPlace les fichiers dans public/QRCODE/ de ton projet Next.js.")
    print("Ils seront accessibles via /QRCODE/PC1.png, /QRCODE/PC2.png, etc.")

if __name__ == "__main__":
    main()
