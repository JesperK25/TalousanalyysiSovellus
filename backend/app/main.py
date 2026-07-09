from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .database import Base, engine
from .routers import transactions, ai, auth, demo

Base.metadata.create_all(bind=engine)

# Kevyt migraatio: lisää user_id olemassa olevaan transactions-tauluun jos puuttuu.
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER"))
        # Vanhat jaetun tietokannan rivit (ilman käyttäjää) eivät kuulu kenellekään.
        conn.execute(text("DELETE FROM transactions WHERE user_id IS NULL"))
except Exception as e:
    print(f"Migraatio ohitettu: {e}")

app = FastAPI(title="Talousanalyysi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(ai.router)
app.include_router(demo.router)

@app.get("/")
def root():
    return {"status": "ok"}
