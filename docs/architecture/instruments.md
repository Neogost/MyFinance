# Instruments financiers, cours et taux de change — Architecture

Référentiel partagé des instruments financiers (actions, ETF, crypto), mise à jour des cours (manuelle et automatique) et gestion des taux de change.

---

## Vue d'ensemble

```
Instrument (référentiel global)
  ├── lastPrice / lastPriceUpdatedAt  ← mis à jour par le scheduler ou manuellement (admin)
  ├── stablePrice                      ← prix fixe : fonds euros, stablecoins
  ├── boursoramaSymbol                 ← BOURSE : saisi manuellement par l'admin
  ├── coinGeckoId                      ← CRYPTO : résolu automatiquement depuis le ticker
  ├── InstrumentAllocation (0..*)      ← répartition géographique en %
  └── InstrumentSectorAllocation (0..*)← répartition sectorielle en %

ExchangeRate (référentiel global)
  └── rate = nombre d'unités de la devise pour 1 EUR
      amountEur = amountNatif / rate
```

> L'instrument est un **référentiel global** non lié à un utilisateur. Plusieurs utilisateurs peuvent posséder des positions sur le même instrument — les cours sont mis à jour une seule fois pour tous.

---

## 1. Catégories d'instruments

| Valeur | Description | Identifiant unique | Source de prix |
|--------|-------------|-------------------|----------------|
| `BOURSE` | Actions, ETF, fonds | ISIN (obligatoire, unique) | Boursorama (`boursoramaSymbol`) |
| `CRYPTO` | Cryptomonnaies | Ticker (obligatoire, unique) | CoinGecko (`coinGeckoId`) |

> Les autres valeurs de `AssetCategory` (IMMO_PAPIER, IMMO_PHYSIQUE, LIVRET, LIQUIDITE) s'appliquent aux positions mais ne nécessitent pas d'instrument.

---

## 2. Modèle de données

### 2.1 Entité `Instrument` — table `instruments`

| Champ | Type Java | Description |
|-------|-----------|-------------|
| `id` | `Long` | Identifiant auto-incrémenté |
| `category` | `AssetCategory` | BOURSE ou CRYPTO |
| `isin` | `String` | Code ISIN (nullable, unique) — obligatoire pour BOURSE |
| `ticker` | `String` | Symbole / trigramme (nullable, unique) — obligatoire pour CRYPTO |
| `name` | `String` | Nom affiché (non null) |
| `currency` | `String` | Devise native ISO (ex : `EUR`, `USD`) |
| `lastPrice` | `BigDecimal` | Dernier cours connu (nullable) |
| `lastPriceUpdatedAt` | `LocalDateTime` | Date de mise à jour du cours (nullable) |
| `stablePrice` | `boolean` | Prix fixe — désactive l'obsolescence et la mise à jour auto (défaut : false) |
| `marketSymbol` | `String` | Champ hérité (Twelve Data) — non utilisé par les services actuels (nullable) |
| `coinGeckoId` | `String` | Identifiant CoinGecko — résolu automatiquement depuis le ticker (CRYPTO, nullable) |
| `boursoramaSymbol` | `String` | Symbole Boursorama — saisi manuellement par l'admin (BOURSE, nullable) |
| `cryptoType` | `CryptoType` | Classification crypto — `STABLECOIN` \| `STORE_OF_VALUE` \| `SMART_CONTRACT` \| `LAYER_2` \| `DEFI` \| `OTHER` (CRYPTO, nullable) |
| `cryptoNetwork` | `CryptoNetwork` | Réseau / blockchain — `BITCOIN` \| `ETHEREUM` \| `SOLANA` \| `POLYGON` \| `AVALANCHE` \| `BNB_CHAIN` \| `ARBITRUM` \| `OPTIMISM` \| `BASE` \| `OTHER` (CRYPTO, nullable) |

**Règles :**
- `isin` est unique parmi tous les instruments BOURSE.
- `ticker` est unique parmi tous les instruments CRYPTO.
- `stablePrice = true` exclut l'instrument de toute mise à jour de cours et masque l'indicateur d'obsolescence.
- `cryptoType` et `cryptoNetwork` sont saisis manuellement par l'admin via la page **Administration → Instruments financiers**. Ils alimentent les dimensions `CRYPTO_TYPE` et `CRYPTO_NETWORK` des objectifs de diversification (cf. `patrimoine-strategy.md` V3).

---

### 2.2 Entité `InstrumentAllocation` — table `instrument_allocations`

Allocation géographique d'un instrument (ex : 60 % États-Unis, 15 % Europe).

| Champ | Type Java | Description |
|-------|-----------|-------------|
| `id` | `Long` | Identifiant |
| `instrument` | `Instrument` | FK — instrument parent |
| `country` | `String` | Nom du pays |
| `percentage` | `BigDecimal` | Pourcentage (precision 5, scale 2) |
| `fetchedAt` | `LocalDateTime` | Date de récupération |

**Règle :** chaque mise à jour supprime toutes les lignes existantes avant insertion (replace complet).

---

### 2.3 Entité `InstrumentSectorAllocation` — table `instrument_sector_allocations`

Allocation sectorielle d'un instrument (ex : 30 % Technologie, 20 % Finance).

| Champ | Type Java | Description |
|-------|-----------|-------------|
| `id` | `Long` | Identifiant |
| `instrument` | `Instrument` | FK — instrument parent |
| `sector` | `String` | Nom du secteur |
| `percentage` | `BigDecimal` | Pourcentage (precision 5, scale 2) |
| `fetchedAt` | `LocalDateTime` | Date de récupération |

---

### 2.4 Entité `ExchangeRate` — table `exchange_rates`

Taux de change **courant** d'une devise étrangère par rapport à l'EUR. Mis à jour quotidiennement par le scheduler via ECB/Frankfurter.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant |
| `currency` | `String` | Code ISO 4217 (`USD`, `GBP`, `CHF`…) — unique |
| `rate` | `BigDecimal` | Nombre d'unités de la devise pour 1 EUR |
| `lastUpdatedAt` | `LocalDateTime` | Date de mise à jour (nullable) |

**Convention :** `rate = 1.08` pour USD signifie `1 EUR = 1.08 USD`. La conversion est `amountEur = amountNatif / rate`.

La devise EUR n'est pas stockée — une position en EUR ne requiert aucune conversion.

---

### 2.5 Entité `InstrumentPriceHistory` — table `instrument_price_history`

Historique quotidien des cours par instrument. Pré-requis pour le calcul de performance patrimoniale (TWR/MWR). Voir `docs/architecture/patrimoine-performance.md`.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant |
| `instrument` | `Instrument` | FK — instrument concerné (cascade DELETE) |
| `priceDate` | `LocalDate` | Date du cours |
| `price` | `BigDecimal` | Cours de clôture en devise native de l'instrument |
| `source` | `String` | `BOURSORAMA` / `COINGECKO` / `MANUAL_CSV` / `MANUAL` |

Contrainte unique : `(instrument_id, price_date)`.

**Alimentation** : le scheduler quotidien (`MarketDataService.runFullUpdate()`, cron `0 0 2 * * *` Europe/Paris) insère une ligne par instrument actif après chaque mise à jour de cours. Idempotent (upsert). Pour les données antérieures au déploiement, voir le script de backfill `backend/migrations/016_backfill_usd_eur_exchange_rate_history.py` et la procédure d'import CSV dans `docs/architecture/patrimoine-performance.md` section 2.3.

---

### 2.6 Entité `ExchangeRateHistory` — table `exchange_rate_history`

Historique quotidien des taux de change. Complément de `ExchangeRate` pour les calculs historiques. Même convention de taux.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant |
| `currency` | `String` | Code ISO 4217 |
| `rateDate` | `LocalDate` | Date du taux |
| `rate` | `BigDecimal` | Nombre d'unités de la devise pour 1 EUR |
| `source` | `String` | `ECB` / `FRANKFURTER` / `MANUAL` |

Contrainte unique : `(currency, rate_date)`. EUR n'est jamais stocké (taux = 1.0 implicite).

---

## 3. DTOs

| DTO | Description |
|-----|-------------|
| `InstrumentDto` | Lecture : id, category, isin, ticker, name, currency, lastPrice, lastPriceUpdatedAt, stablePrice, countryAllocation, sectorAllocation |
| `InstrumentAllocationDto` | `{ country, percentage }` |
| `InstrumentSectorAllocationDto` | `{ sector, percentage }` |
| `CreateInstrumentRequest` | category, name, currency, isin?, ticker?, stablePrice?, boursoramaSymbol? |
| `UpdateInstrumentPriceRequest` | `{ instrumentId, lastPrice }` — lastPrice strictement positif |
| `UpdateStablePriceRequest` | `{ stablePrice: Boolean }` — `@NotNull` |
| `ExchangeRateDto` | `{ id, currency, rate, lastUpdatedAt }` |
| `UpdateExchangeRateRequest` | `{ currency, rate }` — rate strictement positif |
| `MarketDataReportDto` | Rapport du scheduler : instrumentsResolved, instrumentsUpdated, instrumentsFailed, ratesUpdated, snapshotsCreated, snapshotsSkipped, snapshotsFailed, errors, executedAt |

---

## 4. API REST

### Instruments

| Méthode | URL | Rôle | Description |
|---------|-----|------|-------------|
| `GET` | `/api/instruments` | Authentifié | Liste avec recherche libre (`q`) et filtre `category` |
| `GET` | `/api/instruments/{id}` | Authentifié | Détail d'un instrument |
| `POST` | `/api/instruments` | Authentifié | Créer un instrument |
| `PUT` | `/api/instruments/{id}` | Authentifié | Modifier un instrument |
| `DELETE` | `/api/instruments/{id}` | ADMIN | Supprimer un instrument et ses positions |
| `GET` | `/api/instruments/active` | ADMIN | Instruments liés à au moins une position ACTIVE |
| `PUT` | `/api/instruments/prices` | ADMIN | Mise à jour groupée des cours |
| `PATCH` | `/api/instruments/{id}/stable-price` | ADMIN | Activer / désactiver le prix fixe |
| `PUT` | `/api/instruments/{id}/allocations` | ADMIN | Remplacer l'allocation géographique |
| `PUT` | `/api/instruments/{id}/sector-allocations` | ADMIN | Remplacer l'allocation sectorielle |

### Allocations et données marché

| Méthode | URL | Rôle | Description |
|---------|-----|------|-------------|
| `POST` | `/api/admin/allocations/run` | ADMIN | Déclencher la mise à jour automatique des allocations géographiques |
| `POST` | `/api/admin/market-data/run` | ADMIN | Déclencher manuellement le scheduler complet (cours + taux + snapshot) |

### Taux de change

| Méthode | URL | Rôle | Description |
|---------|-----|------|-------------|
| `GET` | `/api/exchange-rates` | ADMIN | Liste tous les taux configurés (triés par devise) |
| `PUT` | `/api/exchange-rates` | ADMIN | Mise à jour groupée (upsert par devise) |

---

## 5. Architecture backend

```
com.myfinance
├── domain/
│   ├── Instrument.java
│   ├── InstrumentAllocation.java
│   ├── InstrumentSectorAllocation.java
│   └── ExchangeRate.java
├── repository/
│   ├── InstrumentRepository.java          findAllWithActivePositions()
│   ├── InstrumentAllocationRepository.java
│   ├── InstrumentSectorAllocationRepository.java
│   └── ExchangeRateRepository.java        findByCurrency(), findAllByOrderByCurrencyAsc()
├── service/
│   ├── InstrumentService.java             CRUD + updatePrices + updateAllocations
│   ├── AllocationUpdateService.java       Scraping Boursorama pour allocation géographique
│   ├── ExchangeRateService.java           findAll, getRatesAsMap, updateRates
│   ├── MarketDataService.java             Orchestrateur scheduler complet
│   ├── BoursoramaClient.java              Scraping HTML Jsoup (cours BOURSE)
│   ├── CoinGeckoClient.java               REST CoinGecko (cours CRYPTO)
│   └── EcbRateClient.java                 REST ECB/Frankfurter (taux de change)
├── controller/
│   ├── InstrumentController.java
│   ├── AllocationController.java
│   ├── ExchangeRateController.java
│   └── MarketDataController.java
├── scheduler/
│   ├── MarketDataScheduler.java           @Scheduled cron mensuel
│   └── AllocationScheduler.java           @Scheduled le 1er du mois à 3h00
└── dto/
    ├── InstrumentDto.java
    ├── InstrumentAllocationDto.java
    ├── InstrumentSectorAllocationDto.java
    ├── CreateInstrumentRequest.java
    ├── UpdateInstrumentPriceRequest.java
    ├── UpdateStablePriceRequest.java
    ├── ExchangeRateDto.java
    ├── UpdateExchangeRateRequest.java
    └── MarketDataReportDto.java
```

---

## 6. Mise à jour manuelle des cours (admin)

Mécanisme de secours permettant à un ADMIN de mettre à jour les cours depuis la page Patrimoine lorsque le scheduler automatique est indisponible ou incorrect.

### Règles

- `lastPrice` doit être **strictement positif** — rejeté `400` sinon
- `lastPriceUpdatedAt` est toujours fixé **côté serveur** à `now()` — le frontend ne transmet pas de date
- Un instrument **absent de la liste** soumise n'est **pas modifié**
- Un `instrumentId` introuvable lève `404` et interrompt la requête pour tous

### Interface — `InstrumentPriceUpdateModal`

Accessible depuis le bouton **"Mettre à jour les cours"** (ADMIN uniquement) dans l'en-tête de `PatrimoinePage`.

| Zone | Description |
|------|-------------|
| Tableau | Une ligne par instrument actif (`GET /api/instruments/active`) |
| Cours actuel | `lastPrice` grisé + date — **orange** si `lastPriceUpdatedAt > 30 jours` |
| Nouveau cours | `<input>` vide par défaut — facultatif (seules les lignes renseignées sont soumises) |
| Variation | Variation % vs cours actuel en temps réel — vert si ≥ 0, rouge si < 0 |
| Toggle 🔒 / 🔓 | Bascule `stablePrice` via `PATCH /stable-price` — mise à jour optimiste avec revert sur erreur |

Les instruments avec `stablePrice = true` : ligne grisée (`opacity-50`), saisie désactivée, pas d'indicateur d'obsolescence.

---

## 7. Mise à jour automatique des cours (scheduler)

Le 1er de chaque mois à **2h00**, `MarketDataScheduler` déclenche une chaîne en quatre étapes :

```
1. Résolution des IDs CoinGecko manquants (CRYPTO sans coinGeckoId)
2. Mise à jour des cours instruments
   ├── BOURSE : BoursoramaClient.getPrice(boursoramaSymbol) pour chaque instrument avec stablePrice=false
   └── CRYPTO : CoinGeckoClient.getPrices(coinGeckoIds) — un seul appel groupé
3. Mise à jour des taux de change via EcbRateClient (ECB/Frankfurter)
4. Snapshot patrimonial pour tous les utilisateurs (PortfolioSnapshotService)
```

Chaque étape s'exécute indépendamment — une erreur partielle ne bloque pas les suivantes.

**Désactivé en profil `dev`** (`scheduler.enabled=false`).

### Sources de données

| Source | Domaine | URL | Remarques |
|--------|---------|-----|-----------|
| **Boursorama** (scraping HTML Jsoup) | BOURSE | `https://www.boursorama.com/cours/{boursoramaSymbol}/` | Sélecteur : `span.c-instrument--last[data-ist-last]` ; format français (`30,8419`) |
| **CoinGecko** (API REST) | CRYPTO | `GET /simple/price?ids={...}&vs_currencies=eur,usd` | Gratuit, 50 req/min ; `coinGeckoId` résolu via `GET /search?query={ticker}` |
| **ECB / Frankfurter** | Taux de change | `GET https://api.frankfurter.app/latest?from=EUR` | Officiel, gratuit, sans clé |

### Rapport d'exécution (`MarketDataReportDto`)

```json
{
  "instrumentsResolved": 1,
  "instrumentsUpdated": 8,
  "instrumentsFailed": 0,
  "ratesUpdated": 5,
  "snapshotsCreated": 2,
  "snapshotsSkipped": 0,
  "snapshotsFailed": 0,
  "errors": [],
  "executedAt": "2026-04-01T02:00:00"
}
```

### Gestion des erreurs

| Cas | Comportement |
|-----|-------------|
| `boursoramaSymbol` absent | Instrument ignoré silencieusement |
| Scraping Boursorama échoue | Log `ERROR`, compté en `failed`, traitement continue |
| `coinGeckoId` introuvable | Log `WARN`, ajouté à `errors`, traitement continue |
| ECB : aucun taux | Log `ERROR`, `ratesUpdated = 0`, traitement continue |
| Snapshot utilisateur échoue | Log `ERROR`, ajouté à `errors`, passage à l'utilisateur suivant |

### Logs

```
[MàJ] Démarrage de la mise à jour des données marché
[MàJ] Terminé — 1 CoinGecko résolus | 8 cours MàJ | 5 taux | 2 snapshots créés
[MàJ] Terminé avec 2 erreur(s) — 7 cours MàJ | 1 échoués | 5 taux | 2 snapshots créés
```

### Configuration

```properties
scheduler.enabled=false   # false en dev, true en prod
```

---

## 8. Taux de change

### Convention

`rate` = nombre d'unités de la devise étrangère pour 1 EUR.

| Exemple | Signification |
|---------|---------------|
| `currency = "USD"`, `rate = 1.08` | 1 EUR = 1,08 USD |
| `currency = "GBP"`, `rate = 0.86` | 1 EUR = 0,86 GBP |

Formule de conversion : `amountEur = amountNatif / rate`

### Impact sur la valorisation (`PositionDto`)

```
currentValueEur = units × instrument.lastPrice                  (si devise = EUR)
currentValueEur = (units × instrument.lastPrice) / rate         (si devise ≠ EUR et taux configuré)
currentValueEur = units × instrument.lastPrice (devise native)  (si taux non configuré — dégradé)
```

La map des taux est chargée **une seule fois par requête** dans `PositionService` et `PortfolioSnapshotService` pour éviter les appels répétés.

### Mise à jour automatique

`EcbRateClient` → `ExchangeRateService.updateRates()` s'exécute à l'étape 3 du scheduler mensuel.

### Interface — `ExchangeRateUpdateModal`

Accessible depuis le bouton **"Taux de change"** (ADMIN uniquement) dans l'en-tête de `PatrimoinePage`.

- Tableau des taux existants : devise | taux actuel | date (orange si > 7 jours) | nouveau taux
- Formulaire d'ajout : code devise + taux → upsert
- Seules les lignes avec un nouveau taux renseigné sont soumises via `PUT /api/exchange-rates`

### Règles

- `rate` doit être **strictement positif** — rejeté `400` sinon
- La mise à jour est un **upsert par devise** : crée si absente, met à jour si existante
- Une devise absente de la liste soumise n'est **pas modifiée**

---

## 9. Règles métier

1. **Unicité ISIN** : deux instruments BOURSE ne peuvent pas avoir le même ISIN (contrôle en création et modification).
2. **Unicité ticker** : deux instruments CRYPTO ne peuvent pas avoir le même ticker.
3. **Prix fixe** : `stablePrice = true` exclut l'instrument de toute mise à jour de cours — scheduler ou manuelle.
4. **Replace complet des allocations** : `PUT /allocations` supprime toutes les lignes existantes avant insertion.
5. **Lignes vides ignorées** : les entrées dont `country` / `sector` est null ou vide ne sont pas persistées.
6. **Instruments actifs** : `GET /api/instruments/active` retourne uniquement les instruments référencés par au moins une position `ACTIVE`.

---

## 10. Tests unitaires

| Classe de test | Contenu |
|----------------|---------|
| `InstrumentServiceTest` | CRUD, validation ISIN/ticker, mise à jour des prix, allocations |
| `InstrumentControllerTest` | Endpoints, authentification, contrôle rôle ADMIN |
| `AllocationUpdateServiceTest` | Mise à jour automatique, comportement en cas d'échec Boursorama |
| `ExchangeRateServiceTest` | findAll, updateRates, upsert, validation rate |
| `ExchangeRateControllerTest` | GET/PUT, contrôle rôle ADMIN |
| `MarketDataServiceTest` | Résolution CoinGecko, Boursorama, ECB, runFullUpdate complet |
