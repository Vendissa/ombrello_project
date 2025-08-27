import io
import qrcode
from PIL import Image, ImageDraw, ImageFont

def generate_qr_png(
    data: str,
    *,
    box_size: int = 10,
    border: int = 2,
    label_text: str | None = None,
) -> bytes:
    """Return PNG bytes for a QR code; optionally add a centered text label below."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    if label_text:
        w, h = img.size
        try:
            font = ImageFont.truetype("arial.ttf", 14)
        except Exception:
            font = ImageFont.load_default()

        # measure text
        tmp_draw = ImageDraw.Draw(img)
        bbox = tmp_draw.textbbox((0, 0), label_text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pad = 6

        # new canvas with label area
        canvas = Image.new("RGB", (w, h + th + pad * 2), "white")
        canvas.paste(img, (0, 0))

        draw = ImageDraw.Draw(canvas)
        draw.text(((w - tw) // 2, h + pad), label_text, fill="black", font=font)
        img = canvas

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
