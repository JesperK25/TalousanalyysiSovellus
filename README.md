# Talousanalyysi

Henkilökohtaisen talouden analyysisovellus. Käyttäjä lataa pankin tiliotteen CSV-tiedostona,
sovellus luokittelee tapahtumat automaattisesti koneoppimismallilla, näyttää tulot ja kulut
kaavioina ja antaa Claude-tekoälyn avulla henkilökohtaisia säästövinkkejä.

Rakennettu portfolioprojektiksi, jossa yhdistyvät full stack -kehitys, klassinen koneoppiminen
ja LLM-integraatio tuotannossa.

## Ominaisuudet

- **CSV-tiliotteen lataus:** tukee Revolutin ja Säästöpankin vientimuotoja sekä yleistä
  `date, description, amount` -muotoa. Erotinmerkki tunnistetaan automaattisesti, merkistö
  luetaan UTF-8:na tai Latin-1:nä, ja jo ladatut tapahtumat ohitetaan duplikaatteina.
- **Automaattinen luokittelu:** scikit-learn-malli (TF-IDF + logistinen regressio) lajittelee
  tapahtumat kategorioihin (Ruoka, Liikenne, Viihde, Asuminen, Terveys, Tulot, Muut).
- **Kaaviot:** tulot ja kulut kuukausittain sekä kulujen jakauma kategorioittain (Recharts).
- **AI-säästövinkit:** Claude analysoi kulutuksen ja antaa kolmesta viiteen konkreettista vinkkiä suomeksi.
- **Käyttäjätilit:** rekisteröinti ja kirjautuminen (bcrypt + JWT). Jokainen kysely rajataan
  kirjautuneen käyttäjän omiin tapahtumiin.
- **Demotila:** sovellusta voi kokeilla ilman tunnusta valmiilla esimerkkidatalla.

## Arkkitehtuuri

```
frontend/  Next.js 16 (App Router, TypeScript, Tailwind v4), Recharts, axios
backend/   FastAPI + SQLAlchemy + PostgreSQL (psycopg 3)
           scikit-learn-luokittelija, Anthropic Python SDK
```

### Miten LLM-integraatio toimii

`backend/app/routers/ai.py` ei lähetä tekoälylle käyttäjän tilitapahtumia sellaisenaan. Se
kokoaa viimeisimmistä 50 tapahtumasta tiiviin yhteenvedon (tulot ja kulut yhteensä, viisi
suurinta kulua, kulut kategorioittain) ja lähettää vain sen Claudelle (Haiku 4.5). Näin malli
saa tarvitsemansa kontekstin, mutta ulkoiseen palveluun menee mahdollisimman vähän
henkilökohtaista taloustietoa, ja kehote pysyy lyhyenä ja edullisena.

Demotilassa analyysi generoidaan kerran ja tarjoillaan välimuistista kaikille kävijöille,
jotta julkinen demo ei kuluta API-kutsuja jokaisella sivulatauksella.

### API

| Reitti | Kuvaus |
|---|---|
| `POST /auth/register`, `POST /auth/login` | Tunnuksen luonti ja kirjautuminen, palauttaa JWT:n |
| `GET /auth/me` | Kirjautuneen käyttäjän tiedot |
| `POST /transactions/upload` | CSV-tiliotteen lataus ja luokittelu |
| `GET /transactions/` | Käyttäjän omat tapahtumat |
| `DELETE /transactions/clear` | Poistaa käyttäjän kaikki tapahtumat |
| `GET /ai/analyysi` | Clauden säästövinkit käyttäjän datasta |
| `GET /demo/transactions`, `GET /demo/ai` | Demotilan esimerkkidata ja analyysi |

Rajapinnan dokumentaatio (Swagger) on paikallisesti osoitteessa http://localhost:8000/docs.

## Paikallinen kehitysympäristö

```bash
# 1. Käynnistä Postgres
docker compose up -d

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate       # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # täytä SECRET_KEY ja ANTHROPIC_API_KEY
uvicorn app.main:app --reload

# 3. Frontend (uudessa terminaalissa)
cd frontend
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
npm install
npm run dev
```

Sovellus on osoitteessa http://localhost:3000. Ilman `NEXT_PUBLIC_API_URL`-muuttujaa frontend
käyttää tuotannon backendiä, joten `.env.local` kannattaa luoda ennen kehitystä.

Lataustoimintoa voi kokeilla juuren `test.csv`-esimerkkitiedostolla.

## Julkaisu

- **Backend + Postgres:** Railway (`backend/Procfile` ja `backend/nixpacks.toml`). Aseta
  Railwayn ympäristömuuttujiksi `DATABASE_URL`, `SECRET_KEY` ja `ANTHROPIC_API_KEY`.
- **Frontend:** Vercel, `NEXT_PUBLIC_API_URL` osoittamaan Railway-backendiin.

Jos `SECRET_KEY` puuttuu, backend ei käytä mitään kiinteää oletusavainta vaan luo käynnistyessään
satunnaisen avaimen ja kirjaa lokiin varoituksen. Silloin kirjautumiset vanhenevat jokaisessa
uudelleenkäynnistyksessä, joten tuotannossa avain kannattaa asettaa.

## Tunnetut yksinkertaistukset

Tietoisia rajauksia portfolioprojektissa, ei unohduksia:

- **CORS on avoin (`*`).** Token kulkee `Authorization`-otsakkeessa eikä evästeessä, mikä
  pienentää riskiä, mutta tuotannossa sallitut originit kannattaa rajata frontendin osoitteeseen.
  (Henkilötietoja käsittelevässä Hoivakalenteri-projektissani CORS on rajattu alusta asti.)
- **JWT localStoragessa, voimassa 30 päivää.** Yksinkertainen toteuttaa, mutta httpOnly-eväste
  ja lyhyempi voimassaolo olisivat turvallisempi valinta.
- **Ei migraatiotyökalua (Alembic).** Taulut luodaan käynnistyksessä, ja `main.py` sisältää yhden
  kevyen migraation, joka lisättiin, kun sovellukseen tuli käyttäjätilit.
- **Rahasummat `Float`-tyyppinä.** Riittää analyysiin, mutta kirjanpitotarkkuuteen tarvittaisiin
  `Decimal`/`Numeric`.
- **Luokittelijan opetusdata on pieni** (65 käsin kirjoitettua esimerkkiä), joten
  tuntemattomat kauppiaat voivat päätyä väärään kategoriaan.
- **AI-kutsulla ei ole virheenkäsittelyä eikä välimuistia kirjautuneille käyttäjille.** Jos
  Anthropicin API ei vastaa, reitti palauttaa virheen, ja jokainen analyysipyyntö on uusi kutsu.
- **Tapahtumien kuvaukset menevät yhteenvetoon sellaisinaan.** Kuvaukset tulevat käyttäjän omasta
  tiedostosta ja vaikuttavat vain hänen omaan analyysiinsä, mutta laajemmassa käytössä kehotteen
  syöte kannattaisi siistiä.
