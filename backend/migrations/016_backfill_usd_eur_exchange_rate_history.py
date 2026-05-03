"""
Migration one-shot : backfill historique USD/EUR dans exchange_rate_history.
Source : Frankfurter API (données BCE), gratuit, sans clé API.

⚠ IMPORTANT : les dates doivent être stockées en millisecondes epoch (minuit heure Paris)
pour être compatibles avec le format utilisé par Hibernate/SQLite-JDBC.
Ne pas insérer les dates comme chaînes texte ISO — SQLite ne pourrait pas les comparer.

À exécuter UNE FOIS par environnement (dev puis prod) avant de lancer
la migration amountEur : POST /api/admin/orders/migrate-amount-eur?dryRun=false

Usage :
    python3 backend/migrations/016_backfill_usd_eur_exchange_rate_history.py [chemin_db]

Chemin DB par défaut : backend/data/myfinance-dev.db
Pour la prod            : /path/to/myfinance.db (volume Docker)

Idempotent : peut être rejoué sans risque (upsert par currency + rate_date epoch ms).
Si des lignes en format texte existent (erreur d'un import précédent), elles sont nettoyées.
"""

import sys
import urllib.request
import json
import sqlite3
from datetime import datetime
from zoneinfo import ZoneInfo

DB_DEFAULT = "backend/data/myfinance-dev.db"
FROM_DATE  = "2019-01-01"   # Remonter avant le premier ordre possible
TO_DATE    = "2026-12-31"   # Frankfurter ne renvoie que les jours disponibles
PARIS      = ZoneInfo("Europe/Paris")


def to_epoch_ms(date_str: str) -> int:
    """Convertit 'YYYY-MM-DD' en ms epoch minuit heure Paris — format Hibernate/SQLite-JDBC."""
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=PARIS)
    return int(dt.timestamp() * 1000)


def backfill(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()

    # Nettoyage préventif des lignes en format texte (import mal formaté)
    deleted = cur.execute(
        "DELETE FROM exchange_rate_history WHERE typeof(rate_date) = 'text'"
    ).rowcount
    if deleted > 0:
        print(f"[Nettoyage] {deleted} ligne(s) au format texte supprimées")

    # Récupération de l'historique via Frankfurter (données BCE)
    url = f"https://api.frankfurter.app/{FROM_DATE}..{TO_DATE}?from=EUR&to=USD"
    print(f"[Frankfurter] Fetch {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "MyFinance/1.0"})
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())

    rates = data["rates"]
    print(f"[Frankfurter] {len(rates)} jours reçus ({data['start_date']} → {data['end_date']})")

    inserted = updated = 0
    for date_str, currencies in sorted(rates.items()):
        usd_rate = currencies.get("USD")
        if not usd_rate:
            continue
        epoch_ms = to_epoch_ms(date_str)
        existing = cur.execute(
            "SELECT id FROM exchange_rate_history WHERE currency='USD' AND rate_date=?",
            (epoch_ms,)
        ).fetchone()
        if existing:
            cur.execute(
                "UPDATE exchange_rate_history SET rate=?, source='FRANKFURTER' WHERE id=?",
                (usd_rate, existing[0])
            )
            updated += 1
        else:
            cur.execute(
                "INSERT INTO exchange_rate_history (currency, rate_date, rate, source) "
                "VALUES ('USD', ?, ?, 'FRANKFURTER')",
                (epoch_ms, usd_rate)
            )
            inserted += 1

    conn.commit()
    conn.close()
    print(f"[SQLite] Done — {inserted} insérés, {updated} mis à jour dans {db_path}")


if __name__ == "__main__":
    db = sys.argv[1] if len(sys.argv) > 1 else DB_DEFAULT
    backfill(db)
