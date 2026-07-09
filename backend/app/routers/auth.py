import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class Credentials(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str


@router.post("/register", response_model=AuthResponse)
def register(body: Credentials, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Anna kelvollinen sähköpostiosoite")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Salasanan tulee olla vähintään 8 merkkiä")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Sähköpostilla on jo tunnus")

    user = User(email=email, hashed_password=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(token=create_access_token(user.id), email=user.email)


@router.post("/login", response_model=AuthResponse)
def login(body: Credentials, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Väärä sähköposti tai salasana")
    return AuthResponse(token=create_access_token(user.id), email=user.email)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"email": user.email}
