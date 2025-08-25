# utils/shortcode.py
import secrets
import string

# Crockford Base32-ish without confusing chars (I, L, O, U)
ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

def generate_short_code(length: int = 7) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))
