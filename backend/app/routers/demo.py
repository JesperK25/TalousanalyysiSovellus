from types import SimpleNamespace

from fastapi import APIRouter

from .ai import generate_analysis

router = APIRouter(prefix="/demo", tags=["demo"])

# Kiinteä esimerkkidata — opiskelijan kaksi kuukautta. Sama kaikille demo-kävijöille.
_RAW = [
    ("2024-02-25", "EasyFit", -29.90, "Terveys"),
    ("2024-02-23", "Lidl", -33.80, "Ruoka"),
    ("2024-02-21", "Steam", -29.99, "Viihde"),
    ("2024-02-19", "Alepa", -22.10, "Ruoka"),
    ("2024-02-17", "Vuokra", -650.00, "Asuminen"),
    ("2024-02-15", "Spotify", -9.99, "Viihde"),
    ("2024-02-13", "K-Supermarket", -51.20, "Ruoka"),
    ("2024-02-11", "Netflix", -17.99, "Viihde"),
    ("2024-02-09", "HSL kuukausiliput", -59.00, "Liikenne"),
    ("2024-02-07", "Prisma", -88.30, "Ruoka"),
    ("2024-02-05", "Palkka", 2500.00, "Tulot"),
    ("2024-01-28", "Elisa", -19.99, "Asuminen"),
    ("2024-01-25", "McDonald's", -14.90, "Ruoka"),
    ("2024-01-24", "ABC polttoaine", -65.00, "Liikenne"),
    ("2024-01-22", "Lidl", -28.40, "Ruoka"),
    ("2024-01-20", "S-Market", -55.20, "Ruoka"),
    ("2024-01-18", "Vuokra", -650.00, "Asuminen"),
    ("2024-01-15", "Apteekki", -24.50, "Terveys"),
    ("2024-01-12", "Viaplay", -14.99, "Viihde"),
    ("2024-01-10", "VR", -39.00, "Liikenne"),
    ("2024-01-05", "Palkka", 2500.00, "Tulot"),
    ("2024-01-03", "K-Citymarket", -72.60, "Ruoka"),
]

DEMO_TRANSACTIONS = [
    {"id": i + 1, "date": d, "description": desc, "amount": amt, "category": cat}
    for i, (d, desc, amt, cat) in enumerate(_RAW)
]

_analysis_cache: str | None = None


@router.get("/transactions")
def demo_transactions():
    return DEMO_TRANSACTIONS


@router.get("/ai")
def demo_ai():
    # Generoidaan aito analyysi vain kerran ja tarjoillaan välimuistista kaikille.
    global _analysis_cache
    if _analysis_cache is None:
        objs = [SimpleNamespace(**t) for t in DEMO_TRANSACTIONS]
        _analysis_cache = generate_analysis(objs)
    return {"analyysi": _analysis_cache}
