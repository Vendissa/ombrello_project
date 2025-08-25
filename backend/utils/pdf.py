# utils/pdf.py
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
import io
import qrcode

def build_qr_sheet_pdf(umbrellas: list) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    page_w, page_h = A4
    cols, rows = 5, 10  # 50 stickers per page
    cell_w, cell_h = page_w / cols, page_h / rows
    size_mm = 21 * mm

    x, y = 0, page_h - cell_h
    for idx, umb in enumerate(umbrellas, 1):
        # make QR (PNG in memory)
        qr = qrcode.make(umb["qr_payload"])
        qr_buf = io.BytesIO()
        qr.save(qr_buf, format="PNG")
        qr_buf.seek(0)

        # draw QR
        c.drawImage(ImageReader(qr_buf), x + (cell_w - size_mm)/2, y + (cell_h - size_mm)/2,
                    width=size_mm, height=size_mm)

        # draw text
        c.setFont("Helvetica", 6)
        c.drawCentredString(x + cell_w/2, y + 2*mm, umb["umbrella_code"])

        # move grid
        if idx % cols == 0:
            x = 0
            y -= cell_h
            if y < 0:
                c.showPage()
                y = page_h - cell_h
        else:
            x += cell_w

    c.save()
    buf.seek(0)
    return buf.getvalue()
