from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import transactions, ai

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Talousanalyysi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(ai.router)

@app.get("/")
def root():
    return {"status": "ok"}