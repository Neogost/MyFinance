# API — Backfill historique pour la performance patrimoniale

Endpoints administrateurs pour alimenter rétroactivement les tables `instrument_price_history` et `exchange_rate_history`. Pré-requis pour que le calcul TWR/MWR puisse remonter avant la date de déploiement.

> **Accès** : tous les endpoints sont protégés par `@PreAuthorize("hasRole('ADMIN')")`.

> **Spec architecturale détaillée** : `docs/architecture/patrimoine-performance.md` sections 2.2 (stratégie d'alimentation), 2.3 (format CSV), 2.4 (contrat `BackfillReport`).

---

## 1. Backfill CRYPTO via CoinGecko

`POST /api/admin/instruments/{id}/backfill-prices`

Récupère automatiquement l'historique complet d'un instrument CRYPTO via l'endpoint CoinGecko `market_chart?days=max`. Réservé aux instruments de catégorie `CRYPTO` avec `coinGeckoId` renseigné.

### Réponses

| Code | Quand |
|------|-------|
| `200 OK` | Backfill exécuté (même si zéro ligne — le rapport décrit le résultat) |
| `400 Bad Request` | Instrument non-CRYPTO ou `coinGeckoId` absent |
| `404 Not Found` | Instrument introuvable |

### Exemple de réponse

```json
{
  "scope": "INSTRUMENT_PRICES",
  "targetId": "42",
  "targetLabel": "Bitcoin",
  "fromDate": "2013-04-28",
  "toDate": "2026-05-03",
  "linesInserted": 4754,
  "linesUpdated": 0,
  "linesSkipped": 0,
  "errors": [],
  "durationMs": 2340
}
```

---

## 2. Import CSV BOURSE

`POST /api/admin/instruments/{id}/import-prices` — `multipart/form-data`

Import manuel pour instruments BOURSE (pas de source automatique fiable). Le format CSV est documenté en détail dans `docs/architecture/patrimoine-performance.md` section 2.3.

### Paramètres

| Param | Type | Description |
|-------|------|-------------|
| `file` | `MultipartFile` | Fichier CSV `date;price`. Dates ISO ou FR, décimaux `,` ou `.`. Max 10 Mo, 50 000 lignes. |

### Réponses

| Code | Quand |
|------|-------|
| `200 OK` | Import effectué — le rapport contient le détail (incluant les éventuelles lignes invalides ignorées) |
| `400 Bad Request` | Instrument non-BOURSE, fichier absent/vide, ou fichier > 10 Mo |
| `404 Not Found` | Instrument introuvable |

### Format CSV attendu (résumé)

```
# Instrument: Amundi MSCI World UCITS ETF (CW8)
# Currency: EUR
date;price
29/04/2026;267,35
2024-01-02;432.15
```

- Header `date;price` obligatoire
- Lignes commençant par `#` ignorées
- Doublons sur `(instrument_id, price_date)` : écrasement silencieux
- Lignes invalides : skip + entrée détaillée dans `errors[]`

### Exemple de réponse

```json
{
  "scope": "INSTRUMENT_PRICES",
  "targetId": "17",
  "targetLabel": "Amundi MSCI World CW8",
  "fromDate": "2024-01-02",
  "toDate": "2026-04-30",
  "linesInserted": 612,
  "linesUpdated": 0,
  "linesSkipped": 2,
  "errors": [
    "Ligne 14 : date invalide : 'NULL'",
    "Ligne 89 : prix invalide : 'N/A'"
  ],
  "durationMs": 145
}
```

---

## 3. Backfill devises via Frankfurter

`POST /api/admin/exchange-rates/{currency}/backfill`

Récupère automatiquement l'historique des taux EUR/{currency} depuis Frankfurter (données BCE, gratuit, sans clé). Frankfurter ne couvre que les jours ouvrés (pas de week-end ni de jours fériés BCE).

### Path parameter

| Param | Description |
|-------|-------------|
| `currency` | Code ISO 4217 (USD, GBP, CHF, JPY, …). EUR refusé (taux implicite = 1). |

### Query parameters (optionnels)

| Param | Type | Défaut |
|-------|------|--------|
| `from` | `LocalDate` (ISO) | Date du premier ordre dans cette devise, ou `today - 5 ans` si aucun ordre |
| `to` | `LocalDate` (ISO) | Aujourd'hui |

> Si `from < 1999-01-04` (premier jour Frankfurter), la borne est ramenée à `1999-01-04`.

### Réponses

| Code | Quand |
|------|-------|
| `200 OK` | Backfill effectué |
| `400 Bad Request` | `currency = EUR` ou `from > to` |

### Exemple de réponse

```json
{
  "scope": "EXCHANGE_RATES",
  "targetId": "USD",
  "targetLabel": "USD",
  "fromDate": "2020-01-02",
  "toDate": "2026-04-30",
  "linesInserted": 1622,
  "linesUpdated": 0,
  "linesSkipped": 0,
  "errors": [],
  "durationMs": 480
}
```

---

## 4. Résumé d'historique pour l'UI admin

`GET /api/admin/instruments/price-history-summary`

Retourne le résumé d'historique de prix pour tous les instruments en une seule requête (anti N+1). Utilisé par `AdminInstrumentPage` pour afficher la colonne « Historique disponible ».

### Réponse

```json
{
  "1": { "dayCount": 4754, "fromDate": "2013-04-28", "toDate": "2026-05-03" },
  "17": { "dayCount": 612, "fromDate": "2024-01-02", "toDate": "2026-04-30" },
  "42": { "dayCount": 0, "fromDate": null, "toDate": null }
}
```

Les instruments sans historique ne sont pas dans la map (interpréter l'absence comme zéro jour).

---

## Workflow type

### Premier déploiement (one-shot)

1. Pour chaque devise non-EUR utilisée : `POST /api/admin/exchange-rates/{currency}/backfill`
2. Pour chaque instrument CRYPTO : `POST /api/admin/instruments/{id}/backfill-prices`
3. Pour chaque instrument BOURSE : préparer un CSV (export broker, copie depuis Boursorama, …) puis `POST /api/admin/instruments/{id}/import-prices`
4. Vérifier la couverture via `GET /api/admin/instruments/price-history-summary`

### En continu

Le scheduler `MarketDataService.runFullUpdate()` (cron `0 0 2 * * *` Europe/Paris) alimente les nouvelles dates au fil du temps. Aucune action manuelle requise sauf en cas de :
- Nouvel instrument ajouté → relancer un backfill pour avoir l'historique
- Nouvelle devise utilisée → relancer un backfill pour avoir l'historique des taux
