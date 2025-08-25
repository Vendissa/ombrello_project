# utils/qr.py
import io
import segno

def build_qr_svg_from_payload(payload: str, mm: float = 21.0, margin_mm: float = 2.0, ecc: str = "Q") -> bytes:
    """
    Returns SVG bytes for the given payload with physical sizing for print.
    """
    qrcode = segno.make(payload, error=ecc)
    buf = io.BytesIO()
    # scale via "mm" argument for physical size; preserve quiet zone via "border"
    qrcode.save(buf, kind="svg", xmmsize=mm, border=margin_mm)  # segno treats border in mm when using xmmsize
    return buf.getvalue()

def build_qr_png_from_payload(payload: str, mm: float = 21.0, margin_mm: float = 2.0, dpi: int = 600, ecc: str = "Q") -> bytes:
    """
    Returns PNG bytes sized for print. mm + dpi gives pixel dimensions.
    """
    qrcode = segno.make(payload, error=ecc)
    buf = io.BytesIO()
    qrcode.save(buf, kind="png", scale=None, border=0, dpi=dpi, xmmsize=mm, quiet_zone=margin_mm)
    return buf.getvalue()
