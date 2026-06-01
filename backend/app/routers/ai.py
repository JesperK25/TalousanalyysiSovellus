from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Transaction
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/ai", tags=["ai"])

@router.get("/analyysi")
def get_analyysi(db: Session = Depends(get_db)):
    transactions = db.query(Transaction).order_by(Transaction.date.desc()).limit(50).all()

    if not transactions:
        return {"analyysi": "Ei transaktioita analysoitavaksi."}

    # Muodosta yhteenveto datasta
    kulut = [t for t in transactions if t.amount < 0]
    tulot = [t for t in transactions if t.amount > 0]
    
    yhteenveto = f"""
Transaktioita yhteensä: {len(transactions)}
Tuloja yhteensä: {sum(t.amount for t in tulot):.2f}€
Kuluja yhteensä: {abs(sum(t.amount for t in kulut)):.2f}€

Suurimmat kulut:
{chr(10).join([f"- {t.description}: {abs(t.amount):.2f}€ ({t.category})" for t in sorted(kulut, key=lambda x: x.amount)[:5]])}

Kategoriat:
{chr(10).join([f"- {k}: {abs(sum(t.amount for t in kulut if t.category == k)):.2f}€" for k in set(t.category for t in kulut if t.category)])}
"""

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": f"""Olet henkilökohtainen talousneuvoja. Analysoi alla oleva kulutusdata ja anna 3-5 konkreettista ja ystävällistä säästövinkkiä suomeksi. Ole lyhyt ja ytimekäs.

{yhteenveto}"""
            }
        ]
    )

    return {"analyysi": message.content[0].text}