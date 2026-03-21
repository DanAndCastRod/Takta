"""
Security utilities for Takta API.
Handles JWT token creation/validation and password hashing.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import base64
import hashlib
import hmac
import json
import os

from dotenv import load_dotenv
try:
    from passlib.context import CryptContext
except Exception:  # pragma: no cover - optional dependency
    CryptContext = None  # type: ignore[assignment]

load_dotenv()

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "takta-dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8 hours default

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") if CryptContext else None


def _fallback_password_hash(password: str) -> str:
    """
    Passlib-free hash format:
    pbkdf2_sha256$<iterations>$<salt_b64>$<digest_b64>
    """
    iterations = 390000
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return (
        "pbkdf2_sha256$"
        f"{iterations}$"
        f"{base64.urlsafe_b64encode(salt).decode('utf-8')}$"
        f"{base64.urlsafe_b64encode(digest).decode('utf-8')}"
    )


def _fallback_verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        scheme, iterations, salt_b64, digest_b64 = hashed_password.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_b64.encode("utf-8"))
        expected = base64.urlsafe_b64decode(digest_b64.encode("utf-8"))
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            int(iterations),
        )
        return hmac.compare_digest(derived, expected)
    except Exception:
        return False


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    if pwd_context:
        return pwd_context.verify(plain_password, hashed_password)
    return _fallback_verify_password(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    if pwd_context:
        return pwd_context.hash(password)
    return _fallback_password_hash(password)


# --- JWT backend resolution ---
_JWT_BACKEND = "builtin"

try:
    # Preferred backend
    from jose import JWTError as _JWTDecodeError  # type: ignore
    from jose import jwt as _jose_jwt  # type: ignore
    _JWT_BACKEND = "python-jose"
except Exception:
    class _JWTDecodeError(Exception):
        pass


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


def _builtin_encode(payload: dict, secret: str, algorithm: str) -> str:
    if algorithm != "HS256":
        raise ValueError("Only HS256 is supported by builtin JWT backend.")

    header = {"alg": "HS256", "typ": "JWT"}
    header_segment = _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))

    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_segment = _b64url_encode(signature)
    return f"{header_segment}.{payload_segment}.{signature_segment}"


def _builtin_decode(token: str, secret: str, algorithms: list[str]) -> dict:
    if "HS256" not in algorithms:
        raise _JWTDecodeError("Unsupported algorithm")

    parts = token.split(".")
    if len(parts) != 3:
        raise _JWTDecodeError("Invalid token format")

    header_segment, payload_segment, signature_segment = parts

    try:
        header = json.loads(_b64url_decode(header_segment).decode("utf-8"))
        payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
    except Exception as exc:
        raise _JWTDecodeError("Invalid token payload") from exc

    if header.get("alg") != "HS256":
        raise _JWTDecodeError("Unsupported token algorithm")

    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    expected_signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    provided_signature = _b64url_decode(signature_segment)

    if not hmac.compare_digest(expected_signature, provided_signature):
        raise _JWTDecodeError("Invalid signature")

    exp = payload.get("exp")
    if exp is not None:
        try:
            exp_int = int(exp)
        except Exception as exc:
            raise _JWTDecodeError("Invalid exp claim") from exc
        now_int = int(datetime.now(timezone.utc).timestamp())
        if now_int >= exp_int:
            raise _JWTDecodeError("Token expired")

    return payload


def _encode_jwt(payload: dict) -> str:
    if _JWT_BACKEND == "python-jose":
        return _jose_jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return _builtin_encode(payload, SECRET_KEY, ALGORITHM)


def _decode_jwt(token: str) -> dict:
    if _JWT_BACKEND == "python-jose":
        return _jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return _builtin_decode(token, SECRET_KEY, [ALGORITHM])


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Payload dict. Should contain 'sub' (username) and 'role'.
        expires_delta: Optional custom expiration time.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": int(expire.timestamp())})
    return _encode_jwt(to_encode)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.

    Returns:
        Decoded payload dict, or None if invalid.
    """
    try:
        payload = _decode_jwt(token)
        return payload
    except _JWTDecodeError:
        return None
    except Exception:
        return None
