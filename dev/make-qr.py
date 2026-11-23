import segno, os, io
from PIL import Image, ImageDraw, ImageFont

URL = 'https://confetticlub.vercel.app/gift'
OUT = r'C:\Users\stefa\Projects\confetti-club\print\qr'
NAME = 'confetti-club_launch-party_gift'
INK = '#14183c'
os.makedirs(OUT, exist_ok=True)

qr = segno.make(URL, error='h', micro=False)
print('version', qr.version, 'error', qr.error, 'modules', qr.symbol_size(border=0))
qr.save(os.path.join(OUT, NAME + '_qr.svg'), scale=10, border=4, dark=INK, light='#ffffff')
qr.save(os.path.join(OUT, NAME + '_qr.png'), scale=60, border=4, dark=INK, light='#ffffff')  # ~3000 px

# Labelled tile, 10 x 12.5 cm at 300 dpi, for the foam board
W, H = 1181, 1476
img = Image.new('RGB', (W, H), 'white')
buf = io.BytesIO(); qr.save(buf, kind='png', scale=30, border=0, dark=INK, light='#ffffff'); buf.seek(0)
q = Image.open(buf).convert('RGB').resize((814, 814), Image.NEAREST)
img.paste(q, ((W - 814) // 2, 258))
d = ImageDraw.Draw(img)
bold = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 82)
reg = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 48)
small = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 50)
def centre(y, text, font, fill=INK):
    w = d.textlength(text, font=font); d.text(((W - w) / 2, y), text, font=font, fill=fill)
centre(70, 'Scan for your free gift', bold)
centre(1170, 'A free jelly squishy for the birthday child', reg, '#4a4d68')
centre(1235, 'at your first Confetti Club party', reg, '#4a4d68')
centre(1335, 'confetticlub.vercel.app/gift', small, '#2234b8')
img.save(os.path.join(OUT, NAME + '_print-tile.png'), dpi=(300, 300))
img.save(os.path.join(OUT, NAME + '_print-tile.pdf'), resolution=300)

# check it decodes back to the URL if a decoder is available
try:
    import cv2, numpy as np
    for f in (NAME + '_qr.png', NAME + '_print-tile.png'):
        a = cv2.imread(os.path.join(OUT, f)); val, *_ = cv2.QRCodeDetector().detectAndDecode(a); print(f, '->', val)
except ImportError:
    print('no decoder installed; skipped decode check')
print(sorted(os.listdir(OUT)))
