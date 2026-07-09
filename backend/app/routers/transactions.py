from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Transaction, User
from ..auth import get_current_user
from ..ml import predict_category
import pandas as pd
import io

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Tiedoston täytyy olla CSV")

    content = await file.read()

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    df = pd.read_csv(io.StringIO(text), sep=None, engine="python")

    if "Valmistumispäivä" in df.columns and "Kuvaus" in df.columns and "Määrä" in df.columns:
        # Revolut-formaatti
        df = df.rename(columns={
            "Valmistumispäivä": "date",
            "Kuvaus": "description",
            "Määrä": "amount"
        })
        df["date"] = df["date"].str[:10]
    elif "Saaja/Maksaja" in df.columns and "Määrä" in df.columns and "Päivämäärä" in df.columns:
        # Säästöpankki-formaatti
        df = df.rename(columns={
            "Päivämäärä": "date",
            "Saaja/Maksaja": "description",
            "Määrä": "amount"
        })
        df["date"] = pd.to_datetime(df["date"], format="%d.%m.%Y", errors="coerce").dt.strftime("%Y-%m-%d")
        df["amount"] = df["amount"].astype(str).str.replace(",", ".").astype(float)
    else:
        required = {"date", "description", "amount"}
        if not required.issubset(df.columns):
            raise HTTPException(status_code=400, detail=f"CSV:stä puuttuu sarakkeet: {required - set(df.columns)}")

    existing = {
        (t.date, t.description, t.amount)
        for t in db.query(Transaction.date, Transaction.description, Transaction.amount)
        .filter(Transaction.user_id == user.id)
        .all()
    }

    added = 0
    skipped = 0
    for _, row in df.iterrows():
        try:
            date = pd.to_datetime(row["date"], errors="coerce")
            if pd.isna(date):
                continue
            description = str(row["description"])
            amount = float(row["amount"])
            key = (date.date(), description, amount)
            if key in existing:
                skipped += 1
                continue
            existing.add(key)
            category = predict_category(description)
            t = Transaction(
                user_id=user.id,
                date=date.date(),
                description=description,
                amount=amount,
                category=category,
            )
            db.add(t)
            added += 1
        except Exception as e:
            print(f"Rivi hylätty: {e}")
            continue

    if added == 0 and skipped == 0 and len(df) > 0:
        raise HTTPException(status_code=400, detail="Yhtään riviä ei voitu lukea. Tarkista CSV:n muoto.")

    db.commit()
    message = f"{added} transaktiota lisätty"
    if skipped:
        message += f", {skipped} ohitettu duplikaattina"
    return {"message": message}

@router.get("/")
def get_transactions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .order_by(Transaction.date.desc())
        .all()
    )

@router.delete("/clear")
def clear_transactions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Transaction).filter(Transaction.user_id == user.id).delete()
    db.commit()
    return {"message": "Kaikki transaktiot poistettu"}
