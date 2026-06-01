from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import numpy as np

# Harjoitusdata — kuvaus -> kategoria
TRAINING_DATA = [
    # Ruoka
    ("K-Supermarket", "Ruoka"),
    ("Alepa", "Ruoka"),
    ("S-Market", "Ruoka"),
    ("Lidl", "Ruoka"),
    ("Prisma", "Ruoka"),
    ("Food", "Ruoka"),
    ("Restaurant", "Ruoka"),
    ("Ravintola", "Ruoka"),
    ("McDonald's", "Ruoka"),
    ("Hesburger", "Ruoka"),
    ("Pizza", "Ruoka"),
    ("Cafe", "Ruoka"),
    ("kahvila", "Ruoka"),
    ("grocery", "Ruoka"),

    # Liikenne
    ("HSL", "Liikenne"),
    ("VR", "Liikenne"),
    ("Onnibus", "Liikenne"),
    ("taxi", "Liikenne"),
    ("Uber", "Liikenne"),
    ("parking", "Liikenne"),
    ("pysäköinti", "Liikenne"),
    ("fuel", "Liikenne"),
    ("ABC", "Liikenne"),
    ("Shell", "Liikenne"),
    ("St1", "Liikenne"),

    # Viihde
    ("Netflix", "Viihde"),
    ("Spotify", "Viihde"),
    ("Steam", "Viihde"),
    ("HBO", "Viihde"),
    ("Disney", "Viihde"),
    ("cinema", "Viihde"),
    ("elokuva", "Viihde"),
    ("gaming", "Viihde"),
    ("Viaplay", "Viihde"),

    # Asuminen
    ("vuokra", "Asuminen"),
    ("rent", "Asuminen"),
    ("electricity", "Asuminen"),
    ("sähkö", "Asuminen"),
    ("water", "Asuminen"),
    ("vesi", "Asuminen"),
    ("internet", "Asuminen"),
    ("DNA", "Asuminen"),
    ("Telia", "Asuminen"),
    ("Elisa", "Asuminen"),

    # Terveys
    ("apteekki", "Terveys"),
    ("pharmacy", "Terveys"),
    ("doctor", "Terveys"),
    ("lääkäri", "Terveys"),
    ("gym", "Terveys"),
    ("kuntosali", "Terveys"),
    ("EasyFit", "Terveys"),

    # Tulot
    ("palkka", "Tulot"),
    ("Palkka", "Tulot"),
    ("PALKKA", "Tulot"),
    ("salary", "Tulot"),
    ("Salary", "Tulot"),
    ("palkkio", "Tulot"),
    ("Palkkio", "Tulot"),
    ("tulo", "Tulot"),
    ("palkkatulo", "Tulot"),
    ("työtulo", "Tulot"),

    # Muut
    ("ATM", "Muut"),
    ("käteinen", "Muut"),
    ("transfer", "Muut"),
    ("siirto", "Muut"),
]

# Kouluta malli
descriptions = [d for d, _ in TRAINING_DATA]
categories = [c for _, c in TRAINING_DATA]

model = Pipeline([
    ('tfidf', TfidfVectorizer(analyzer='word', lowercase=True)),
    ('clf', LogisticRegression(max_iter=1000))
])

model.fit(descriptions, categories)

def predict_category(description: str) -> str:
    try:
        return model.predict([description])[0]
    except Exception:
        return "Muut"