# Performance patrimoniale (TWR / MWR)

## Vue d'ensemble

La performance patrimoniale mesure le **rendement annualisé** du patrimoine financier de l'utilisateur, en neutralisant ou en intégrant — selon la métrique — l'effet du timing et du volume de ses versements.

Le module répond à des questions que les indicateurs de **valeur** (combien j'ai, plus-value cumulée, plus-value YTD) ne posent pas :

- *Mes actifs performent-ils réellement, ou est-ce que je fais juste de l'épargne ?*
- *Si je laisse mon argent où il est, à quel rythme va-t-il croître ?*
- *Mes choix de timing de versement (DCA vs lump sum) ont-ils été pertinents ?*
- *Le rendement obtenu compense-t-il le risque pris ?*
- *Mon allocation bat-elle un indice de référence (CW8, S&P 500) ?*

Quatre indicateurs sont calculés pour chaque période :

| Indicateur | Mesure | Utilité |
|------------|--------|---------|
| **TWR** (Time-Weighted Return) | Performance pure des actifs, indépendante du timing et du volume des versements | Comparaison à un benchmark (CW8, S&P 500…) |
| **MWR** (Money-Weighted Return) | Performance réellement vécue par l'utilisateur, qui intègre le timing des versements | « Combien j'ai gagné par an, en moyenne, avec mes choix » |
| **Volatilité annualisée** | Écart-type des rendements mensuels × √12 | Amplitude des variations — proxy du risque |
| **Ratio de Sharpe** | (TWR − taux sans risque) / volatilité | Rendement obtenu par unité de risque pris |

L'écart entre TWR et MWR est lui-même un signal : un MWR très inférieur au TWR signifie que les gros versements sont arrivés au mauvais moment ; un MWR supérieur signifie au contraire que le timing a été favorable.

---

## Périmètre fonctionnel

### Catégories couvertes

| Catégorie | Couverture | Source de valorisation à une date |
|-----------|-----------|-----------------------------------|
| `BOURSE` | TWR + MWR | `quantité × instrument_price_history(date) × taux_change(date)` |
| `CRYPTO` | TWR + MWR | Idem BOURSE |
| `LIVRET` | TWR + MWR | Capitalisation quotidienne `(1 + annualRate)^(1/365) − 1` |
| `IMMO_PAPIER` | Provisoirement exclu | Calcul en cours de stabilisation |
| `LIQUIDITE` | Exclu | Pas de rendement attendu |
| `IMMO_PHYSIQUE` | Exclu | Valeur estimée subjective |

**Instruments à prix figé** (`stablePrice = true`, ex. Fonds en Euros, USDC) : valorisés comme la somme nette des cashflows en EUR — pas d'historique de prix requis, aucun warning généré.

### Accès

Endpoint et UI accessibles à **tous les utilisateurs authentifiés**. Chaque utilisateur consulte uniquement la performance de son propre patrimoine (filtrage par `userId` côté service).

### Période de calcul

L'utilisateur sélectionne la période via 6 presets :

| Preset | `from` | `to` |
|--------|--------|------|
| **Global** | premier ordre éligible | aujourd'hui |
| **YTD** | 1er janvier de l'année courante | aujourd'hui |
| **1 an** | aujourd'hui − 1 an | aujourd'hui |
| **3 ans** | aujourd'hui − 3 ans | aujourd'hui |
| **5 ans** | aujourd'hui − 5 ans | aujourd'hui |
| **Personnalisée** | sélection libre via `DateRangeInput` | sélection libre |

En mode **Global**, le mois du premier versement est exclu du chaînage TWR (V_début = 0, formule instable). En mode **période restreinte**, un snapshot d'ouverture synthétique est calculé à `lastDayOf(monthBefore(from))` pour démarrer le chaînage proprement.

---

## Modèle de données

### Tables d'historique

#### `instrument_price_history`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGINT (PK) | |
| `instrument_id` | BIGINT (FK) | Référence `instruments.id`, cascade DELETE |
| `price_date` | DATE | Date du cours |
| `price` | DECIMAL(18,6) | Cours de clôture en devise native |
| `source` | VARCHAR | `BOURSORAMA` / `COINGECKO` / `MANUAL_CSV` / `MANUAL` |

Index unique : `(instrument_id, price_date)`.

#### `exchange_rate_history`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGINT (PK) | |
| `currency` | VARCHAR(3) | Code ISO (USD, GBP, …) |
| `rate_date` | DATE | Date du taux |
| `rate` | DECIMAL(18,8) | Convention : `amount_eur = amount_natif / rate` |
| `source` | VARCHAR | `ECB` / `FRANKFURTER` / `MANUAL` |

Index unique : `(currency, rate_date)`.

### Stratégie d'alimentation

#### Forward (continu) — automatique

Le scheduler `MarketDataService` insère quotidiennement (jours ouvrés, soir) :
- une ligne `instrument_price_history` pour chaque instrument actif
- une ligne `exchange_rate_history` pour chaque devise utilisée

| Catégorie | Source forward |
|-----------|---------------|
| BOURSE | Boursorama (Jsoup) |
| CRYPTO | CoinGecko API |
| Devises | Frankfurter / ECB |

Mécanisme idempotent (UNIQUE constraint sur `(instrument_id, price_date)` et `(currency, rate_date)`).

#### Backfill (historique antérieur) — semi-manuel

| Catégorie | Stratégie |
|-----------|-----------|
| **CRYPTO** | Automatique — endpoint CoinGecko `market_chart?days=max`. Déclenchement admin par instrument. Filtré à partir de la date du premier ordre de l'instrument. |
| **Devises** | Automatique — endpoint Frankfurter depuis 1999. Déclenchement admin par devise. |
| **BOURSE** | **Import CSV manuel par l'admin** (cf. format ci-dessous). Source enregistrée : `MANUAL_CSV`. |
| **LIVRET** | Aucun backfill nécessaire — recalculé depuis les cashflows. |
| **IMMO_PAPIER** | Aucun backfill nécessaire — `PositionSnapshot` mensuels saisis manuellement. |

Endpoints admin documentés dans `docs/api/patrimoine-performance-backfill.md`.

> **Conséquence sur la précision** : pour les positions BOURSE sans CSV importé, le calcul démarre à la date du premier prix collecté forward (donc à partir du déploiement). Un warning explicite est exposé pour chaque instrument concerné.

#### Format CSV d'import BOURSE

```
# Instrument: Amundi MSCI World UCITS ETF (CW8)
# Currency: EUR
# Source: Boursorama
date;price
29/04/2026;267,35
28/04/2026;267,79
2024-01-04;430,87
```

| Aspect | Règle |
|--------|-------|
| Encoding | UTF-8 (BOM toléré) |
| Séparateur de champs | `;` |
| Séparateur décimal | `,` ou `.` (détecté automatiquement) |
| Format de date | ISO `YYYY-MM-DD` ou français `DD/MM/YYYY` (mixte autorisé) |
| Header obligatoire | `date;price` (insensible à la casse) |
| Lignes commentaire | Préfixées par `#` — ignorées |
| Doublons sur `(instrument_id, price_date)` | Écrasement silencieux |
| Lignes invalides | Skip + entrée dans `errors[]` du `BackfillReport` |
| Taille max | 10 Mo / 50 000 lignes |

### Classification des `OrderType`

```java
public enum OrderType {
    BUY,         // CASHFLOW_IN  (versement externe)
    SELL,        // CASHFLOW_OUT (retrait externe)
    DEPOSIT,     // CASHFLOW_IN
    WITHDRAWAL,  // CASHFLOW_OUT
    INTEREST,    // INTERNAL_GAIN (réinvesti virtuellement)
    DIVIDEND,    // INTERNAL_GAIN (réinvesti virtuellement)
    AIRDROP,     // INTERNAL_GAIN
    ABONDEMENT   // CASHFLOW_IN
}
```

> `INTEREST`, `DIVIDEND`, `AIRDROP` ne rompent pas une sous-période TWR. Ils sont comptés comme une augmentation de la valeur de la position à leur date d'occurrence (réinvestissement virtuel) et alimentent `totalDividendsEur`.

---

## Calculs

### Valorisation d'une position à une date `d`

```
SI position.category == BOURSE | CRYPTO :
    SI position.instrument.stablePrice :
        valeur_eur = Σ cashflows en EUR jusqu'à d (BUY/DEPOSIT − SELL/WITHDRAWAL)
    SINON :
        quantite_a_d  = Σ ordres (BUY + AIRDROP + ABONDEMENT) − Σ SELL avec orderDate ≤ d
        prix_natif_d  = instrument_price_history(instrument_id, d)
                        fallback : dernière valeur connue STRICTEMENT antérieure à d
                        si aucune valeur connue → position EXCLUE + warning
        taux_change_d = exchange_rate_history(currency, d)
                        fallback : dernière valeur connue STRICTEMENT antérieure à d
                        (1.0 si currency == EUR)
        valeur_eur    = quantite_a_d × prix_natif_d / taux_change_d

SI position.category == LIVRET :
    Capitalisation quotidienne au taux paramétré annualRate :
      taux_journalier = (1 + annualRate)^(1/365) − 1
    Reconstruction jour par jour, en appliquant les cashflows DEPOSIT/WITHDRAWAL/INTEREST/DIVIDEND
    et en capitalisant le solde quotidien.
```

> **Position fermée** : si `closedDate` est renseignée et `d > closedDate`, la position est valorisée à `0`. Sinon valorisée normalement (ses ordres jusqu'à `closedDate` sont pris en compte).

### TWR — Modified Dietz par sous-période mensuelle

Le TWR global est obtenu en chaînant le rendement Modified Dietz calculé sur chaque mois calendaire de la période.

**Conventions :**

- **Premier mois du chaînage (mode Global)** = le mois calendaire qui **suit** le premier versement. Le mois du premier versement n'est pas inclus (V_début = 0, formule instable). Warning explicite émis.
- **Premier mois du chaînage (période restreinte)** = le mois de `requestedFrom`, avec un snapshot d'ouverture synthétique à `firstChainingMonth.minusDays(1)`.
- **Cashflows du même jour** : nettés algébriquement par date avant calcul (BUY +500 et SELL −300 le même jour → un seul flux net de +200).
- **Convention temporelle Modified Dietz** (CFA Institute) : poids d'un flux le jour `j` d'un mois de `D` jours = `(D − j) / D`.

**Pour un mois `m` :**

```
V_début = valuePortfolioAt(positions, dernier_jour_mois_précédent)
V_fin   = valuePortfolioAt(positions, dernier_jour_mois_m)
F_i     = cashflows externes du mois (BUY/SELL/DEPOSIT/WITHDRAWAL/ABONDEMENT)
          NETTÉS par date, en EUR au taux du jour du cashflow
          signe : +montant si entrée externe, −montant si sortie externe
F_net   = Σ F_i

w_i = (D − jour_i) / D     poids temporel de chaque flux

R_m = (V_fin − V_début − F_net) / (V_début + Σ w_i × F_i)
```

**Chaînage et annualisation :**

```
TWR_total      = Π(1 + R_m) − 1   pour chaque mois m de la période
TWR_annualisé  = (1 + TWR_total)^(365 / jours_total) − 1
```

**Cas particuliers :**

| Cas | Comportement |
|-----|-------------|
| Mois sans aucune position éligible et sans cashflow | Exclu de la chaîne (facteur 1) |
| Mois en cours (pas terminé) | Inclus avec `partial: true`, `D = jour_courant` ; `R_m` évolue déterministiquement entre deux appels du même mois |
| `V_début + Σ w_i × F_i ≤ 0` (retrait total) | Sous-période exclue, warning émis |
| Portefeuille à valeur nulle pendant ≥ 1 mois puis nouveau versement | Mois neutres exclus, reprise au mois suivant le nouveau versement |
| Position fermée en milieu de mois | Valorisée normalement jusqu'à `closedDate`, à 0 ensuite |

### MWR — XIRR Newton-Raphson

```
Pour toute la période :
  cashflows = liste de (date, montant signé en EUR)
    BUY/DEPOSIT/ABONDEMENT  → −montant  (sortie de poche utilisateur)
    SELL/WITHDRAWAL         → +montant  (entrée de poche utilisateur)
    Cashflows même jour     → nettés algébriquement
  + (effectiveTo, +valuePortfolioAt(positions, effectiveTo))   ← liquidation virtuelle

XIRR = taux r tel que Σ cashflow_i / (1+r)^((date_i − date_0)/365) = 0
```

Implémentation : Newton-Raphson, valeur initiale `r = 0.10`, tolérance `1e-7`, max 100 itérations. Fallback bissection sur `[−0.99, 10.0]` si divergence. Si la bissection ne trouve pas de changement de signe → `mwrAnnualized = null` + warning.

> Les `INTEREST` / `DIVIDEND` / `AIRDROP` ne sont **pas** dans la liste des cashflows MWR (gains internes, déjà capturés dans la valeur actuelle).

En mode **période restreinte**, le snapshot d'ouverture entre comme cashflow synthétique négatif : `(openingDate, −openingValue)`. Seuls les ordres ≥ `firstChainingMonth` sont ensuite pris en compte.

### Volatilité annualisée

```
σ_monthly = écart-type (Bessel n−1) des R_m inclus dans le chaînage
σ_annual  = σ_monthly × √12
```

Retourne `null` si moins de 2 mois inclus.

### Ratio de Sharpe

```
Sharpe = (TWR_annualisé − RISK_FREE_RATE) / σ_annual
```

`RISK_FREE_RATE = 0.03` (taux Livret A, défini comme constante dans `PerformanceService`). Retourne `null` si volatilité ≤ 0 ou TWR null.

### Précision arithmétique

`BigDecimal` aux frontières (entité JPA, DTO API, persistance), `double` à l'intérieur des solveurs `ModifiedDietzCalculator` et `XirrSolver`.

`java.math.BigDecimal` ne propose pas d'exponentiation native à exposant fractionnaire (besoin pour `(1+r)^(jours/365)`). Travailler en `double` à l'intérieur du solveur évite une dépendance externe (Apache Commons Math) et reste largement précis : la perte de précision est de l'ordre de `1e-15`, invisible une fois le résultat arrondi à 4 décimales pour l'affichage.

Conversions :
- `BigDecimal → double` à l'entrée du solveur via `BigDecimal.doubleValue()`
- `double → BigDecimal` à la sortie via `BigDecimal.valueOf(d).setScale(2, HALF_UP)`

Pour les divisions BigDecimal hors solveur (notamment `amountEur = amount.divide(rate, …)`) : **scale explicite obligatoire** (`divide(rate, 4, HALF_UP)`) pour éviter `ArithmeticException` quand le résultat n'a pas de représentation décimale finie.

### Fuseau horaire

Tous les appels à `LocalDate.now()` dans le code de performance utilisent **`LocalDate.now(ZoneId.of("Europe/Paris"))`**. Plus robuste que de paramétrer le `TZ` du conteneur Docker (qui peut tourner en UTC) et explicite dans le code.

---

## Indicateurs et sections

### KPIs principaux

Quatre cartes affichées en haut de page (grille `grid-cols-2 lg:grid-cols-4`) :

| Carte | Couleur | Format |
|-------|---------|--------|
| TWR annualisé | Indigo | `+9,20 %/an` |
| MWR annualisé | Teal | `+7,80 %/an` |
| Volatilité | Gray | `12,5 %/an` |
| Ratio de Sharpe | Gray (texte coloré) | `0,72` — rouge (<0) / amber (<0,5) / neutre (<1) / emerald (≥1) |

### Sélecteur de période

Composant `PeriodSelector` : 6 boutons (Global / YTD / 1 an / 3 ans / 5 ans / Personnalisée). Le mode **Personnalisée** affiche un `DateRangeInput` avec `maxDate={today}` (jours futurs grisés).

Chaque changement de période recharge l'API.

### Synthèse

Carte récapitulative avec : période effective, total versé, valeur actuelle, plus-value absolue, dividendes encaissés.

Inclut une **décomposition du gain** (barre empilée) :
- Plus-value de marché (indigo) = `absoluteGainEur − totalDividendsEur`
- Revenus perçus (teal) = `totalDividendsEur`

### Performance par catégorie

Section `Par catégorie` : une carte par catégorie présente (BOURSE / CRYPTO / LIVRET) avec TWR, MWR, valeur actuelle, plus-value. Couleurs et icônes différenciées (cohérent avec `CATEGORY_META` du module patrimoine).

### Performance par position

Section `Par position`, alignée sur le style de `PatrimoineGroupedView` :
- Groupement par **partenaire** (broker, banque, plateforme), tri par valeur décroissante
- Sous-groupement par catégorie au sein de chaque partenaire
- Colonnes : Position, TWR, MWR, valeur, plus-value
- Sous-total par partenaire (valeur + plus-value)
- Positions sans partenaire → groupe "Sans partenaire" affiché en dernier

### Graphique TWR cumulé (base 100)

Composant `TwrCumulativeChart` (Recharts `AreaChart`) :
- Courbe portefeuille : aire indigo avec gradient
- Point d'ouverture à 100 au mois précédant `from`
- Pour chaque mois inclus : `value *= (1 + monthlyReturn)`
- Mois exclus : segment plat
- ReferenceLine pointillée à y=100 (niveau neutre)
- Ticks X adaptatifs : annuels (> 36 mois), bi-mensuels (> 18), tous les 2 mois sinon
- Tooltip custom : indice + gain cumulé % colorisé

### Comparaison benchmark

Sélecteur intégré au graphique avec deux modes :

**Mode Indice** : combobox avec recherche temps réel sur `GET /api/instruments?query=` (≥ 2 caractères). L'instrument sélectionné est récupéré via `GET /api/patrimoine/performance/benchmark?instrumentId=...&from=&to=`. Le backend calcule un TWR pur (price return, sans cashflows) — formule standard CFA pour la comparaison.

**Mode Taux fixe** : input numérique (ex : 7 %/an). La courbe est calculée localement : `value_m = value_{m-1} × (1 + rate/100)^(1/12)`. Aucun appel API. Utile pour matérialiser un objectif (ex : moyenne historique du MSCI World).

Affichage : seconde courbe amber pointillée (`strokeDasharray="5 3"`) superposée sur le graphique. Badge KPI inline avec le TWR annualisé du benchmark.

### Détail mensuel (validation)

Section dépliable `Voir le détail du calcul` qui affiche `monthlyBreakdown` ligne par ligne :

```
Mois      V_début      V_fin       Flux net   Σ w·F      R_m      Inclus
2023-02     1 000 €    1 015 €      0 €         0 €      +1,55 %   ✓
2023-03     1 015 €    2 030 €    +1 000 €    +516 €     +0,91 %   ✓
2023-04        —          —          —           —         —       ✗  Aucune position éligible
…
```

Tooltip sur chaque colonne pour expliquer la formule. Permet une validation visuelle directe contre un calcul Excel.

### Section pédagogique

Section `📚 TWR et MWR expliqués simplement` dépliable en bas de page. Contient :
- Un fonds imaginaire sur 3 ans (+20 % / −10 % / +15 %) → TWR = +7,5 %/an
- Deux investisseurs (Alice avant la baisse, Bob après) montrant l'impact du timing
- Encart "Ce qu'il faut retenir" + règle de lecture MWR ≷ TWR

---

## API REST

| Méthode | URL | Rôle | Description |
|---------|-----|------|-------------|
| `GET` | `/api/patrimoine/performance` | Authentifié | Performance globale (TWR + MWR + volatilité + Sharpe) |
| `GET` | `/api/patrimoine/performance/benchmark` | Authentifié | TWR pur d'un instrument benchmark |

### `GET /api/patrimoine/performance`

**Query params** (tous optionnels) :

| Param | Type | Description |
|-------|------|-------------|
| `from` | `LocalDate` (ISO) | Date de début. Sans paramètre = depuis le premier ordre (mode Global). |
| `to` | `LocalDate` (ISO) | Date de fin. Sans paramètre = aujourd'hui. |

**Réponse — `PerformanceDto`** :

```json
{
  "computedAt": "2026-05-04T10:32:18Z",
  "from": "2021-02-01",
  "to": "2026-05-04",
  "durationYears": 5.25,
  "twrAnnualized": 0.092,
  "mwrAnnualized": 0.078,
  "volatilityAnnualized": 0.135,
  "sharpeRatio": 0.46,
  "totalInvestedEur": 45200.00,
  "currentValueEur": 58900.00,
  "absoluteGainEur": 13700.00,
  "totalDividendsEur": 1240.00,
  "warnings": [
    "Mois de 2021-01 exclu du chaînage TWR : c'est le mois du premier versement (V_début = 0, formule instable)."
  ],
  "monthlyBreakdown": [
    { "month": "2021-02", "valueStart": 1000.00, "valueEnd": 1015.50,
      "cashflowsNetEur": 0, "weightedCashflowsEur": 0,
      "monthlyReturn": 0.0155, "included": true, "partial": false }
  ],
  "byCategory": [
    { "category": "BOURSE", "twrAnnualized": 0.085, "mwrAnnualized": 0.072,
      "volatilityAnnualized": 0.142, "sharpeRatio": 0.39,
      "currentValueEur": 40000.00, "totalInvestedEur": 32000.00,
      "absoluteGainEur": 8000.00, "totalDividendsEur": 500.00 }
  ],
  "byPosition": [
    { "positionId": 1, "label": "CW8", "category": "BOURSE",
      "partner": "Boursorama", "currency": "EUR",
      "twrAnnualized": 0.092, "mwrAnnualized": 0.084,
      "currentValueEur": 25000.00, "totalInvestedEur": 20000.00,
      "absoluteGainEur": 5000.00, "totalDividendsEur": 0 }
  ]
}
```

### `GET /api/patrimoine/performance/benchmark`

**Query params** :

| Param | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `instrumentId` | `Long` | oui | ID de l'instrument référence |
| `from` | `LocalDate` | non | Date de début |
| `to` | `LocalDate` | non | Date de fin |

**Réponse — `BenchmarkDto`** :

```json
{
  "instrumentId": 42,
  "label": "Amundi MSCI World (CW8)",
  "currency": "EUR",
  "from": "2021-02-01",
  "to": "2026-05-04",
  "twrAnnualized": 0.112,
  "series": [
    { "month": "2021-01", "value": 100.0 },
    { "month": "2021-02", "value": 102.5 }
  ]
}
```

Calcul : pour chaque mois de la période, `R_m = price_end / price_start − 1`, chaîné et annualisé. Pas de cashflows (TWR pur — convention CFA). Segments plats si prix absent pour un mois.

### DTOs liés

| DTO | Description |
|-----|-------------|
| `PerformanceDto` | Réponse principale |
| `BenchmarkDto` | Réponse benchmark instrument |
| `MonthlyBreakdownDto` | Détail mois par mois — factory `included(...)` ou `excluded(month, reason)` |
| `CategoryPerformanceDto` | Performance par catégorie |
| `PositionPerformanceDto` | Performance par position |

Documentation complète des DTOs : `docs/api/patrimoine-performance.md`.

---

## Architecture backend

```
com.myfinance
├── service/
│   ├── PerformanceService.java
│   │   ├── computeGlobal(User, LocalDate from, LocalDate to) → PerformanceDto
│   │   └── (privé) computeSlice(positions, ...) → SliceResult
│   ├── BenchmarkService.java
│   │   └── compute(Instrument, LocalDate from, LocalDate to) → BenchmarkDto
│   ├── ValuationService.java
│   │   ├── valuePositionAt(Position, LocalDate, batch maps) → BigDecimal
│   │   └── valuePortfolioAt(List<Position>, LocalDate, batch maps) → BigDecimal
│   ├── InstrumentPriceHistoryService.java
│   └── ExchangeRateHistoryService.java
├── service/math/
│   ├── ModifiedDietzCalculator.java   (stateless)
│   └── XirrSolver.java                (stateless)
├── controller/
│   └── PerformanceController.java     (GET / + GET /benchmark)
├── domain/
│   ├── InstrumentPriceHistory.java
│   └── ExchangeRateHistory.java
└── dto/
    ├── PerformanceDto.java
    ├── BenchmarkDto.java
    ├── MonthlyBreakdownDto.java
    ├── CategoryPerformanceDto.java
    └── PositionPerformanceDto.java
```

`ModifiedDietzCalculator` et `XirrSolver` sont stateless, publics, et **ne dépendent que de structures Java pures**. Cela permet de les tester avec des cas reproductibles indépendamment de la base.

### Stratégie de chargement batch (anti N+1)

Un calcul de performance sur 5 ans = 60 mois × N positions × 2 valorisations potentielles. Sans précaution, on génère des centaines de queries `SELECT … FROM instrument_price_history WHERE instrument_id = ? AND price_date <= ?`.

Au début de `computeGlobal()`, le `PerformanceService` :

1. Détermine la plage `[batchFrom, effectiveTo]` et la liste des instruments / devises concernés
2. **Une seule query** pour les prix : `findByInstrumentInAndPriceDateBetween(...)` → matérialisée dans une `Map<Long, NavigableMap<LocalDate, BigDecimal>>` locale
3. **Une seule query** pour les taux : `findByCurrencyInAndRateDateBetween(...)` → idem
4. `ValuationService.valuePositionAt()` lit ces maps en mémoire (`floorEntry(date)` pour la valeur ≤ date) — aucun aller-retour DB pendant le chaînage TWR
5. Les maps sont **locales à l'appel** et libérées en sortie

Les **calculs par catégorie et par position** réutilisent les mêmes batch maps déjà chargés : aucun coût DB supplémentaire. La logique TWR + XIRR est extraite dans `computeSlice(positions, orders, ...)` qui est appelée pour le global, puis pour chaque catégorie, puis pour chaque position.

Ordre de grandeur : pour un user avec 15 instruments × 5 ans × 1825 jours × 8 octets ≈ **220 Ko en mémoire** par calcul. Acceptable.

> Pas de cache applicatif (Redis, Caffeine). Le calcul est rare (< 1 fois par session) et le coût mémoire au repos serait disproportionné.

---

## Architecture frontend

```
frontend/src/
├── api/
│   └── performance.js
│       ├── getGlobalPerformance(from, to)
│       └── getBenchmarkPerformance(instrumentId, from, to)
└── components/
    └── performance/
        └── PerformancePage.jsx     (page complète, tous composants en interne)
```

### Composants internes de `PerformancePage`

| Composant | Rôle |
|-----------|------|
| `PeriodSelector` | 6 boutons + DateRangeInput pour le mode Personnalisée |
| `KpiCard` | Carte KPI générique (TWR, MWR, Volatilité, Sharpe) |
| `ReturnDecomposition` | Barre empilée capital vs revenus dans la Synthèse |
| `CategoryCard` | Une carte par catégorie dans la section "Par catégorie" |
| `PerfPositionRow`, `ByPositionSection` | Tableau par position groupé par partenaire |
| `TwrCumulativeChart` | Graphique base 100 + benchmark overlay |
| `BenchmarkSelector`, `InstrumentPicker` | Sélecteur Indice / Taux fixe |
| `MonthlyBreakdownTable` | Tableau dépliable de validation |
| `PedagogySection` | Section pédagogique en bas de page |
| `InfoTooltip` | Tooltip pédagogique au hover (indigo, normalisé) |

### Navigation

Menu `Patrimoine ▾` (dropdown) :
- **Positions** → `patrimoine`
- **Performance** → `performance`

Mobile : section `Patrimoine` du menu burger avec les deux entrées.

---

## Règles métier

1. **Ownership** : un utilisateur ne consulte que sa propre performance — `userId` filtré côté service.
2. **Catégories exclues** : `IMMO_PHYSIQUE`, `LIQUIDITE` et `IMMO_PAPIER` (provisoirement) filtrées en amont — n'entrent ni dans `currentValueEur`, ni dans les cashflows, ni dans les dividendes.
3. **Cashflows internes vs externes** : `INTEREST/DIVIDEND/AIRDROP` ne sont pas des cashflows pour le TWR ni pour le MWR. Ils contribuent à `totalDividendsEur` et sont capturés implicitement dans la valeur actuelle.
4. **Conversion devise** : `PositionOrder.amountEur` est dénormalisé à la création/modification via `exchange_rate_history(currency, orderDate)`. Si le taux historique manque pour la date exacte → dernière valeur connue strictement antérieure. Aucune extrapolation dans le passé.
5. **Position fermée** : valorisée normalement jusqu'à `closedDate`, valorisée à 0 ensuite. Ses ordres restent comptés sur leur période d'activité.
6. **Cashflows du même jour** : nettés algébriquement avant d'entrer dans Modified Dietz et XIRR.
7. **Date de début effective (Global)** : `min(orderDate)` parmi les ordres des positions éligibles.
8. **Premier mois du chaînage TWR (Global)** : le mois calendaire qui suit le premier versement. Le mois du premier versement n'est jamais inclus.
9. **Période restreinte** : un snapshot d'ouverture synthétique est calculé à `firstChainingMonth.minusDays(1)` ; ce snapshot entre comme cashflow XIRR négatif. Pas de skip du premier mois.
10. **Cap warnings** : 20 maximum dans la réponse. Au-delà : ligne « … et N autres avertissements » ajoutée.
11. **Cas limites** :
    - Aucun ordre éligible → `twr/mwr/volatility/sharpe = null`, warning « Aucune position éligible »
    - XIRR non convergent → `mwrAnnualized = null` + warning, le TWR reste calculé
    - Volatilité < 2 mois inclus → `volatilityAnnualized = null`, donc `sharpeRatio = null`
    - Mois sans aucune position active ni cashflow → exclu de la chaîne TWR (facteur 1)
    - Retrait total puis reprise après ≥ 1 mois → mois "à vide" exclus, chaînage repris au mois suivant

---

## Limites assumées

1. **Backfill BOURSE manuel.** Aucune source automatique fiable pour l'historique des cours BOURSE européens (Yahoo, Boursorama testés et écartés). Pour chaque instrument BOURSE sans CSV importé, le calcul démarre à la date du premier prix collecté forward. Warning explicite émis pour chaque instrument concerné.
2. **`IMMO_PAPIER` provisoirement exclu.** Calcul en cours de stabilisation — les positions IMMO_PAPIER sont filtrées en amont (cf. règle métier #2).
3. **`PositionSnapshot` ne fige pas la catégorie.** Une recatégorisation rétroactive d'une position fausserait l'historique. Sans incidence en pratique (les positions ne changent pas de catégorie).
4. **Frais non tracés.** Performance affichée *brute* de frais (courtage, gestion, TER d'ETF).
5. **Capitalisation LIVRET quotidienne simple.** Approximation par rapport à la règle bancaire réelle (capitalisation par quinzaine) — écart de quelques euros sur l'année.
6. **XIRR sensible aux cashflows extrêmes.** Si le solveur diverge même avec le fallback bissection → `mwrAnnualized = null` + warning « MWR non calculable ».

---

## Observabilité

### Logging

Logger SLF4J injecté via Lombok (`@Slf4j`), messages en français.

| Niveau | Quand | Contenu |
|--------|-------|---------|
| `INFO` | Entrée et sortie de `computeGlobal()` | `[user:{id}] Calcul performance démarré` puis `[user:{id}] Calcul performance terminé en {ms} ms — TWR={twr}, MWR={mwr}, période=[{from} → {to}], {nbWarnings} warning(s), {nbCat} catégorie(s), {nbPos} position(s)` |
| `WARN` | Pour chaque entrée ajoutée à `warnings[]` du DTO | Le message exact qui apparaîtra côté UI, préfixé par `[user:{id}]` |
| `WARN` | Calcul benchmark sans prix disponibles | `[benchmark] Aucun prix disponible pour instrument #{id}` |
| `DEBUG` | Pour chaque mois `m` du chaînage TWR | `[user:{id}] Mois {YYYY-MM} : V_début={x}, V_fin={y}, F_net={z}, R_m={r}` |
| `DEBUG` | Itérations Newton-Raphson de `XirrSolver` | `Iteration {n} : r={r}, f(r)={f}, f'(r)={fp}` |
| `ERROR` | Exception inattendue | Stack trace complète + contexte `[user:{id}, period={from}→{to}]` |

Pas de PII dans les logs au-delà de l'`userId` numérique.

### Analytics

| Type | Event name | Quand |
|------|-----------|-------|
| `PAGE_VIEW` | `tools.performance.view` | Ouverture de `PerformancePage` |
| `FEATURE_USE` | `tools.performance.compute` | Réception du `PerformanceDto`. Metadata : `{ period, twrAvailable, mwrAvailable, warningsCount }` |

---

## Liens

- API : `docs/api/patrimoine-performance.md`
- Backfill : `docs/api/patrimoine-performance-backfill.md`
- Patrimoine : `docs/architecture/patrimoine.md`
- Instruments : `docs/architecture/instruments.md`
