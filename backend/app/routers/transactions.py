from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Transaction
from ..ml import predict_category
import pandas as pd
import io

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
    elif "Saaja/Maksaja" in df.columns and "Määrä" in df.columns:
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

    added = 0
    for _, row in df.iterrows():
        try:
            date = pd.to_datetime(row["date"], errors="coerce")
            if pd.isna(date):
                continue
            category = predict_category(str(row["description"]))
            t = Transaction(
                date=date.date(),
                description=str(row["description"]),
                amount=float(row["amount"]),
                category=category,
            )
            db.add(t)
            added += 1
        except Exception as e:
            print(f"Rivi hylätty: {e}")
            continue

    db.commit()
    return {"message": f"{added} transaktiota lisätty"}

@router.get("/")
def get_transactions(db: Session = Depends(get_db)):
    return db.query(Transaction).order_by(Transaction.date.desc()).all()

@router.delete("/clear")
def clear_transactions(db: Session = Depends(get_db)):
    db.query(Transaction).delete()
    db.commit()
    return {"message": "Kaikki transaktiot poistettu"}