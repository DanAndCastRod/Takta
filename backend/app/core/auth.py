"""
Authentication dependencies for FastAPI.
Provides `get_current_user` and `require_role` for endpoint protection.
"""
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from .security import decode_access_token

# --- Bearer Token Scheme ---
# auto_error=False allows endpoints to optionally accept auth
security_scheme = HTTPBearer(auto_error=False)


# --- User Model (from JWT payload) ---
class CurrentUser(BaseModel):
    """Represents the authenticated user extracted from JWT."""
    username: str
    role: str = "viewer"
    display_name: Optional[str] = None
    area_id: Optional[str] = None  # Default area for auto-context
    tenant_id: str = "default"
    feature_profile: str = "full"


# --- Dependencies ---

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> CurrentUser:
    """
    FastAPI dependency that extracts and validates the JWT token.
    
    Usage:
        @router.get("/protected")
        def protected_endpoint(user: CurrentUser = Depends(get_current_user)):
            return {"hello": user.username}
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing 'sub' claim.",
        )
    
    return CurrentUser(
        username=username,
        role=payload.get("role", "viewer"),
        display_name=payload.get("name"),
        area_id=payload.get("area_id"),
        tenant_id=payload.get("tenant_id") or "default",
        feature_profile=payload.get("feature_profile") or "full",
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Optional[CurrentUser]:
    """
    Like get_current_user but returns None instead of 401 if no token.
    Useful for endpoints that work with or without auth.
    """
    if credentials is None:
        return None
    
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None
    
    username = payload.get("sub")
    if not username:
        return None
    
    return CurrentUser(
        username=username,
        role=payload.get("role", "viewer"),
        display_name=payload.get("name"),
        area_id=payload.get("area_id"),
        tenant_id=payload.get("tenant_id") or "default",
        feature_profile=payload.get("feature_profile") or "full",
    )


def get_tenant_code(user: CurrentUser) -> str:
    raw = (user.tenant_id or "default").strip()
    return raw or "default"


def require_role(allowed_roles: List[str]):
    """
    Factory that creates a dependency requiring specific roles.
    
    Usage:
        @router.delete("/assets/{id}", dependencies=[Depends(require_role(["admin", "engineer"]))])
        def delete_asset(...):
            ...
    """
    async def role_checker(user: CurrentUser = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' not authorized. Required: {allowed_roles}",
            )
        return user
    return role_checker
