"""
Auth Router — Login and user info endpoints.

For MVP, uses a simple in-memory user store.
Enterprise: Replace with Azure AD / LDAP integration.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional

from ...core.security import verify_password, get_password_hash, create_access_token
from ...core.auth import get_current_user, CurrentUser

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"]
)


# --- Request/Response Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: str = "viewer"
    display_name: Optional[str] = None


# --- In-Memory User Store (MVP) ---
# In production, replace with DB table or Azure AD
_users_db: dict = {
    "admin": {
        "username": "admin",
        "hashed_password": get_password_hash("admin123"),
        "role": "admin",
        "display_name": "Administrador",
    },
    "ingeniero": {
        "username": "ingeniero",
        "hashed_password": get_password_hash("takta2026"),
        "role": "engineer",
        "display_name": "Ingeniero de Procesos",
    },
    "supervisor": {
        "username": "supervisor",
        "hashed_password": get_password_hash("takta2026"),
        "role": "supervisor",
        "display_name": "Supervisor de Planta",
    },
}


# --- Endpoints ---

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    """
    Authenticate user and return JWT token.
    
    MVP: Validates against in-memory user store.
    Enterprise: Will integrate with Azure AD / LDAP.
    """
    user = _users_db.get(request.username)
    if not user or not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    token = create_access_token(data={
        "sub": user["username"],
        "role": user["role"],
        "name": user["display_name"],
    })
    
    return TokenResponse(
        access_token=token,
        user={
            "username": user["username"],
            "role": user["role"],
            "display_name": user["display_name"],
        }
    )


@router.get("/me")
def get_me(user: CurrentUser = Depends(get_current_user)):
    """
    Return the current authenticated user's info.
    Validates the JWT token and returns the decoded payload.
    """
    return {
        "username": user.username,
        "role": user.role,
        "display_name": user.display_name,
        "area_id": user.area_id,
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(request: UserCreateRequest, admin: CurrentUser = Depends(get_current_user)):
    """
    Register a new user (admin only).
    MVP: Adds to in-memory store (lost on restart).
    """
    if admin.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can register new users",
        )
    
    if request.username in _users_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User '{request.username}' already exists",
        )
    
    _users_db[request.username] = {
        "username": request.username,
        "hashed_password": get_password_hash(request.password),
        "role": request.role,
        "display_name": request.display_name or request.username,
    }
    
    return {"message": f"User '{request.username}' created", "role": request.role}
