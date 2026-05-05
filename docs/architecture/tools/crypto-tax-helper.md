# Outil — Assistant fiscalité crypto (déclaration 2086)

## 1. Objectif

Aider l'utilisateur à **calculer ses plus-values imposables annuelles** sur ses cessions de cryptomonnaies vers l'euro, en appliquant la **méthode officielle française** (article 150 VH bis du CGI), et générer un **récapitulatif exportable conforme au formulaire 2086** à recopier dans la déclaration de revenus.

Réponse à la question concrète : *« J'ai acheté 1 000 € de crypto en 2020, le portefeuille vaut 1 500 € en 2022 et je retire 1 000 € : combien dois-je déclarer en plus-value ? »*

> Outil accessible depuis **Outils → Fiscalité crypto**. Réutilise le module Patrimoine existant (positions CRYPTO, ordres, historique des prix CoinGecko, taux de change ECB).

---

## 2. Cadre fiscal français de référence

### 2.1 Régime visé en V1 — investisseur occasionnel

| Élément | Règle |
|---------|-------|
| Article CGI | **150 VH bis** (cessions à titre onéreux d'actifs numériques) |
| Profil ciblé | Particulier investissant ses propres capitaux à titre non habituel |
| Imposition par défaut | **PFU 30 %** = 12,8 % IR + 17,2 % prélèvements sociaux |
| Option | **Barème progressif IR** (depuis 2023) sur l'IR uniquement — PS toujours 17,2 % |
| Seuil d'exonération | Cessions annuelles totales ≤ **305 €** → impôt = 0 et pas d'obligation déclarative |
| Méthode de calcul | **Proportionnelle au portefeuille global** (pas FIFO) |

### 2.2 Hors périmètre V1

- **Trader habituel** (BNC) — fréquence/volume conséquent, organisation pro
- **Activité professionnelle** (BIC) — minage industriel, market-making
- **Staking, mining, lending, airdrops, NFT, DeFi (LP, yield farming)** — fiscalité spécifique différente
- **Plus-values latentes** — non imposables en France tant qu'il n'y a pas de cession en fiat

### 2.3 Événements imposables / non imposables

| Opération | Imposable ? | Impact sur la base de coût |
|-----------|-------------|----------------------------|
| Achat crypto avec EUR | Non | Augmente le PTA |
| Cession crypto → EUR | **Oui** | Diminue le PTA proportionnellement |
| Cession crypto → bien/service en EUR | **Oui** (assimilé fiat) | Idem |
| Échange crypto ↔ crypto (swap) | **Non** (intercalaire) | PTA inchangé, suivi des quantités |
| Transfert entre wallets propres | Non | Aucun |

### 2.4 Formule officielle

À chaque cession contre fiat :

```
Plus-value = PC − (PTA × PC / VGP)
```

| Symbole | Définition |
|---------|------------|
| `PC` | **Prix de cession** — montant fiat reçu (en €) |
| `PTA` | **Prix Total d'Acquisition** — somme cumulée des achats fiat (en €), réduit après chaque cession |
| `VGP` | **Valeur Globale du Portefeuille** — valeur en € de toutes les cryptos détenues **au moment précis de la cession** |

Mise à jour du PTA après cession :

```
PTA_après = PTA_avant − (PTA_avant × PC / VGP)
```

> Le PTA n'est jamais réinitialisé (sauf si le portefeuille est totalement vidé), il décroît proportionnellement.

---

## 3. Modèle de données — Impact

### 3.1 Réutilisation du module Patrimoine

L'outil **n'introduit pas de nouvelle entité racine** : les achats et cessions crypto restent des `PositionOrder` rattachés à des `Position` de catégorie `CRYPTO`.

Justification : éviter de dupliquer la saisie des achats déjà enregistrés dans le module Patrimoine. La couche fiscale est une **lecture enrichie** des ordres existants.

### 3.2 Extension de `PositionOrder`

Champs ajoutés (tous nullables — non renseignés sur les ordres non-crypto) :

| Champ | Type | Description |
|-------|------|-------------|
| `cryptoOperationType` | `CryptoOperationTypeEnum` | Voir 3.3. `null` sur ordres non-crypto. |
| `swapCounterpartOrderId` | `Long` (FK → `position_orders.id`) | Pour un `SWAP_OUT` : référence vers le `SWAP_IN` jumeau créé en miroir sur la position de destination. Permet de tracer la quantité reçue. |
| `portfolioValueAtDateEur` | `Float` | **Override manuel de la VGP** à la date de cession. `null` = calcul auto via cours historiques. |

### 3.3 Nouvel enum `CryptoOperationTypeEnum`

| Valeur | Sens | Imposable | Effet PTA | Effet quantité |
|--------|------|-----------|-----------|----------------|
| `BUY_FIAT` | Achat en EUR (ou autre fiat converti EUR) | Non | `PTA += amountEur` | `qty += amount` |
| `SELL_FIAT` | Cession contre EUR | **Oui** | `PTA −= PTA × PC / VGP` | `qty −= amount` |
| `SWAP_OUT` | Échange sortant (crypto vendue) | Non | Inchangé | `qty −= amount` |
| `SWAP_IN` | Échange entrant (crypto reçue) | Non | Inchangé | `qty += amount` |
| `TRANSFER_IN` | Réception depuis wallet externe propre | Non | Inchangé | `qty += amount` |
| `TRANSFER_OUT` | Envoi vers wallet externe propre | Non | Inchangé | `qty −= amount` |

> **Mapping avec `OrderType` existant :** `BUY_FIAT` → `OrderType.BUY`, `SELL_FIAT` → `OrderType.SELL`. Les autres types crypto utilisent `OrderType.BUY` ou `SELL` selon le sens de la quantité, mais c'est `cryptoOperationType` qui dicte le traitement fiscal. Pour les positions non-CRYPTO, `cryptoOperationType` reste `null` et `OrderType` continue de pilier seul.

### 3.4 Saisie rétroactive — règle V1

**Pour que le calcul soit correct, l'utilisateur doit saisir l'historique complet de ses opérations crypto depuis sa toute première acquisition.**

Sans cet historique, le PTA initial est sous-évalué et toutes les plus-values calculées sont surestimées. La V1 impose donc la rétroactivité, avec :

- Un **écran de bienvenue** la première fois que l'utilisateur ouvre l'outil, expliquant la contrainte
- Une **case à cocher** « J'ai saisi tout mon historique d'opérations crypto depuis le début » qui débloque l'export 2086
- Tant qu'elle n'est pas cochée : l'outil affiche les calculs en mode « brouillon » avec un bandeau d'avertissement

### 3.5 Migration

Migration `XXX_add_crypto_operation_to_position_orders.sql` :

```sql
ALTER TABLE position_orders ADD COLUMN crypto_operation_type TEXT;
ALTER TABLE position_orders ADD COLUMN swap_counterpart_order_id INTEGER REFERENCES position_orders(id);
ALTER TABLE position_orders ADD COLUMN portfolio_value_at_date_eur REAL;

CREATE INDEX idx_position_orders_crypto_op
  ON position_orders(crypto_operation_type)
  WHERE crypto_operation_type IS NOT NULL;
```

Backfill (one-shot, optionnel) : pour les positions CRYPTO existantes, `OrderType.BUY` → `cryptoOperationType = BUY_FIAT`, `OrderType.SELL` → `SELL_FIAT`. L'utilisateur devra réviser les opérations qui étaient en réalité des swaps.

---

## 4. Algorithme de calcul

### 4.1 Vue d'ensemble — itération chronologique sur les ordres

Pour calculer la situation fiscale d'une année N :

1. Charger **tous les `PositionOrder` crypto** de l'utilisateur, **triés par `orderDate` ASC**, depuis la première opération
2. Initialiser `PTA = 0`, `quantitésParInstrument = {}`
3. Pour chaque ordre, appliquer la règle 4.2 ci-dessous
4. Conserver les cessions `SELL_FIAT` qui tombent dans l'année N pour l'export 2086

### 4.2 Traitement par type d'opération

```
pour chaque ordre triés par date ASC :

    si cryptoOperationType == BUY_FIAT :
        PTA += ordre.amountEur
        quantitésParInstrument[ordre.instrumentId] += ordre.amount

    si cryptoOperationType == SELL_FIAT :
        PC  = ordre.amountEur
        VGP = calculerVGP(quantitésParInstrument, ordre.orderDate, ordre.portfolioValueAtDateEur)
        si VGP <= 0 :
            warning("VGP non calculable pour la cession du <date>")
            continue

        plusValueOrdre = PC − (PTA × PC / VGP)
        ordre.plusValueImposable = plusValueOrdre  // mémoïsé pour l'affichage

        PTA = PTA − (PTA × PC / VGP)
        quantitésParInstrument[ordre.instrumentId] −= ordre.amount

    si cryptoOperationType == SWAP_OUT :
        quantitésParInstrument[ordre.instrumentId] −= ordre.amount
        // PTA inchangé — opération intercalaire

    si cryptoOperationType == SWAP_IN :
        quantitésParInstrument[ordre.instrumentId] += ordre.amount
        // PTA inchangé

    si cryptoOperationType == TRANSFER_IN :
        quantitésParInstrument[ordre.instrumentId] += ordre.amount

    si cryptoOperationType == TRANSFER_OUT :
        quantitésParInstrument[ordre.instrumentId] −= ordre.amount
```

### 4.3 Calcul de la VGP à une date donnée

```
calculerVGP(quantités, date, override) :
    si override != null :
        retourner override        // saisie manuelle utilisateur

    vgp = 0
    pour chaque (instrumentId, qty) dans quantités :
        si qty <= 0 : continue
        prix = InstrumentPriceHistory.findByInstrumentAndDate(instrumentId, date)
        si prix == null :
            warning("Cours indisponible pour <ticker> le <date> — VGP partielle")
            continue
        si instrument.currency != "EUR" :
            taux = ExchangeRateHistory.find(instrument.currency, date)
            prixEur = prix / taux
        sinon :
            prixEur = prix
        vgp += qty × prixEur

    retourner vgp
```

> **Source des cours :** `instrument_price_history` (déjà en place via le scheduler CoinGecko + import CSV).
> **Fallback :** si un cours manque, l'utilisateur peut renseigner `portfolioValueAtDateEur` manuellement sur la cession concernée.

### 4.4 Synthèse annuelle

```
synthèseAnnée(N) :
    cessionsAnnée = ordres SELL_FIAT où year(orderDate) == N

    totalCessions   = Σ cessionsAnnée.amountEur            // PC cumulé
    plusValueAnnée  = Σ cessionsAnnée.plusValueImposable   // peut être négative (moins-value)
    moinsValueAnnée = Σ max(0, −plusValueOrdre)            // imputable sur les PV de la même année uniquement

    si totalCessions <= 305 € :
        retourner { exonéré: true, impôt: 0, déclarationRequise: false }

    plusValueNetteImposable = max(0, plusValueAnnée)

    si optionPFU :
        impôt = plusValueNetteImposable × 0.30
    sinon (option barème) :
        irPart = plusValueNetteImposable × TMI       // TMI ← /api/tax-simulator
        psPart = plusValueNetteImposable × 0.172
        impôt  = irPart + psPart

    retourner { plusValueNetteImposable, impôt, ... }
```

> **Moins-values :** imputables uniquement sur les plus-values de **la même année civile** (pas de report sur les années suivantes pour le régime occasionnel).

---

## 5. Endpoints API

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/crypto-tax/summary?year={YYYY}` | Authentifié | Synthèse annuelle (`CryptoTaxSummaryDto`) |
| `GET` | `/api/crypto-tax/cessions?year={YYYY}` | Authentifié | Détail ligne par ligne format 2086 (`List<CryptoCessionDto>`) |
| `GET` | `/api/crypto-tax/state` | Authentifié | État courant (PTA, valorisation portefeuille, dernière mise à jour) |
| `GET` | `/api/crypto-tax/form-2086.csv?year={YYYY}` | Authentifié | Export CSV à recopier dans le formulaire 2086 |
| `PUT` | `/api/crypto-tax/historical-data-confirmation` | Authentifié | Toggle de la case « historique complet saisi » (persistée sur `User`) |

> Les **opérations** (achat, cession, swap) sont saisies via les endpoints `PositionOrder` existants (`POST /api/positions/{id}/orders`), enrichis du champ `cryptoOperationType` dans le payload.

### 5.1 `CryptoTaxSummaryDto`

```java
public record CryptoTaxSummaryDto(
    Integer year,
    Float ptaAtYearStart,                   // PTA au 1er janvier
    Float ptaAtYearEnd,                     // PTA au 31 décembre
    Float totalCessionsEur,                 // Σ PC sur l'année
    Float totalPlusValueEur,                // Σ plus-values brutes
    Float totalMoinsValueEur,               // Σ moins-values brutes
    Float plusValueNetteImposable,          // après imputation
    Boolean exemptedBy305Threshold,
    Boolean declarationRequired,
    String taxOption,                       // "PFU" ou "BAREME"
    Float estimatedTaxEur,
    Integer cessionsCount,
    List<String> warnings                   // VGP partielles, cours manquants…
) {}
```

### 5.2 `CryptoCessionDto` (1 ligne par cession `SELL_FIAT`)

```java
public record CryptoCessionDto(
    Long orderId,
    LocalDate cessionDate,
    String instrumentLabel,
    Float amountSold,
    Float prixDeCessionEur,                 // PC
    Float ptaAvantCession,
    Float vgpEur,                           // VGP au moment de la cession
    Boolean vgpFromManualOverride,
    Float plusValueEur,                     // peut être négative
    Float ptaApresCession
) {}
```

---

## 6. Frontend

### 6.1 Page `CryptoTaxPage.jsx` (Outils → Fiscalité crypto)

Structure :

```
┌─────────────────────────────────────────────────────────┐
│  Année [▾ 2025]    Option : ( ) PFU 30 %  ( ) Barème   │
├─────────────────────────────────────────────────────────┤
│  ⚠ Saisie de l'historique non confirmée — calculs en   │
│     mode brouillon. [Confirmer l'historique complet]    │
├─────────────────────────────────────────────────────────┤
│  KPIs                                                   │
│  ┌─────────┬─────────┬─────────┬─────────┐             │
│  │ Total   │ Plus-V  │ Impôt   │ PTA     │             │
│  │cessions │ nette   │ estimé  │ restant │             │
│  └─────────┴─────────┴─────────┴─────────┘             │
├─────────────────────────────────────────────────────────┤
│  Indicateur seuil 305 €                                 │
│  ━━━━━━●━━━━━━━━━━  142 € / 305 € — pas d'obligation   │
├─────────────────────────────────────────────────────────┤
│  Tableau des cessions de l'année (= form 2086)          │
│  Date | Crypto | Qté | PC | PTA avant | VGP | PV       │
│  ...                                                    │
│  [Exporter CSV 2086]                                    │
├─────────────────────────────────────────────────────────┤
│  Avertissements (VGP manquantes, cours indisponibles…) │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Saisie d'opérations

Le bouton **« + Ajouter une opération crypto »** ouvre une variante du `PositionOrderForm` existant, avec un sélecteur supplémentaire `cryptoOperationType`. Pour les `SWAP`, le formulaire crée automatiquement les deux ordres miroirs (`SWAP_OUT` sur la position source, `SWAP_IN` sur la position de destination) avec `swapCounterpartOrderId` croisé.

#### 6.2.1 Tooltips pédagogiques sur le type d'opération

Le sélecteur `cryptoOperationType` affiche un `InfoTooltip` à côté de chaque option. Texte attendu :

| Valeur | Libellé UI | Tooltip |
|--------|------------|---------|
| `BUY_FIAT` | Achat avec euros | « Tu utilises de l'argent fiat (EUR, USD…) pour acheter cette crypto. Augmente ta base de coût (PTA). » |
| `SELL_FIAT` | Vente contre euros | « Tu vends cette crypto contre de l'argent fiat. **Opération imposable** — déclenche un calcul de plus-value. » |
| `SWAP_OUT` | Échange sortant (vers une autre crypto) | « Tu échanges cette crypto contre une autre (ex : ETH → BTC). **Non imposable** en France (opération intercalaire), mais à tracer pour le suivi des quantités. Crée automatiquement l'opération miroir sur la crypto reçue. » |
| `SWAP_IN` | Échange entrant (depuis une autre crypto) | « Crypto reçue suite à un swap depuis une autre crypto. Créé automatiquement par MyFinance — généralement pas saisi à la main. » |
| `TRANSFER_IN` | Réception (wallet propre) | « Crypto reçue depuis un autre de tes wallets/exchanges. Non imposable, ne change que la quantité. » |
| `TRANSFER_OUT` | Envoi (wallet propre) | « Crypto envoyée vers un autre de tes wallets/exchanges. Non imposable. À ne pas confondre avec un paiement à un tiers (= cession imposable). » |

#### 6.2.2 Champ `notes` — encourager la saisie

Le champ `notes` existant sur `PositionOrder` est mis en avant dans le formulaire crypto avec un libellé spécifique (« Commentaire — exchange, motif, justificatif… ») et un texte d'aide :

> 💡 *Recommandé : note l'exchange utilisé (Binance, Kraken…), le hash de transaction, ou le motif de l'opération. Ces informations seront précieuses en cas de contrôle fiscal jusqu'à 3 ans après la déclaration.*

Le commentaire est repris dans l'export CSV en colonne libre pour faciliter la traçabilité, mais ne remplace pas la 2086 officielle.

### 6.3 API layer

`frontend/src/api/cryptoTax.js` expose `getSummary(year)`, `getCessions(year)`, `getState()`, `confirmHistoricalData(value)`, `exportForm2086Csv(year)`.

---

## 7. Format du fichier CSV exportable (formulaire 2086)

Une ligne par cession, colonnes alignées sur les rubriques officielles de la 2086 :

```csv
N°,Date de cession,Valeur portefeuille (VGP),Prix de cession (PC),Prix total acquisition (PTA),Plus-value,Notes
1,2025-03-15,18432.50,5000.00,12000.00,1747.16,Vente Kraken txid 0xabc...
2,2025-08-22,21100.00,3000.00,10747.16,1471.21,Vente Binance pour acompte voiture
...
TOTAL,,,8000.00,,3218.37,
```

> La colonne **Notes** reprend le champ `notes` de chaque ordre — utile pour l'archivage personnel mais à **ne pas reporter** dans la 2086 officielle (les 6 colonnes officielles seulement).

L'utilisateur ouvre le CSV dans Excel/LibreOffice, contrôle les valeurs, et reporte ligne par ligne dans la 2086 sur impots.gouv.fr.

> La V1 ne génère **pas** un PDF officiel pré-rempli (le formulaire 2086 n'est pas téléchargeable en format remplissable structuré). Le CSV est suffisant pour la déclaration en ligne.

---

## 8. Exemples chiffrés

### Exemple 1 — Cas simple (un seul actif)

| Date | Opération | Détail |
|------|-----------|--------|
| 2020-06-01 | `BUY_FIAT` | Achat 1 BTC à 8 000 € → PTA = 8 000 € |
| 2022-04-15 | `SELL_FIAT` | Vente 0,5 BTC pour 12 000 €. VGP du jour = 24 000 € (1 BTC × 24 k€) |

```
PV = 12 000 − (8 000 × 12 000 / 24 000) = 12 000 − 4 000 = 8 000 €
PTA après = 8 000 − 4 000 = 4 000 €
Impôt PFU = 8 000 × 30 % = 2 400 €
```

### Exemple 2 — Cas du brief utilisateur

| Date | Opération | Détail |
|------|-----------|--------|
| 2020 | `BUY_FIAT` | 1 000 € investis → PTA = 1 000 € |
| 2022 | `SELL_FIAT` | Retrait 1 000 €. Portefeuille total = 1 500 € |

```
PV = 1 000 − (1 000 × 1 000 / 1 500) = 1 000 − 666,67 = 333,33 €
PTA après = 1 000 − 666,67 = 333,33 €
Total cessions année = 1 000 € > 305 € → déclaration requise
Impôt PFU = 333,33 × 30 % = 100 €
```

### Exemple 3 — Avec swap intermédiaire

| Date | Opération | Détail |
|------|-----------|--------|
| 2021-01-10 | `BUY_FIAT` | 5 000 € en ETH → PTA = 5 000 € |
| 2022-06-20 | `SWAP_OUT`/`SWAP_IN` | Échange ETH → BTC. Non imposable, PTA inchangé. |
| 2025-02-01 | `SELL_FIAT` | Vente du BTC pour 9 000 €. VGP = 9 000 € (BTC seul restant) |

```
PV = 9 000 − (5 000 × 9 000 / 9 000) = 9 000 − 5 000 = 4 000 €
```

Le swap est invisible côté impôts mais essentiel pour suivre la quantité de BTC issue de la conversion.

---

## 9. Règles de validation

| Règle | Effet |
|-------|-------|
| `cryptoOperationType` requis sur tout ordre d'une position CRYPTO | Erreur 400 sinon |
| `SWAP_OUT` doit avoir un `swapCounterpartOrderId` valide pointant vers un `SWAP_IN` | Erreur 400 sinon |
| `SELL_FIAT` doit avoir `amountEur > 0` | Erreur 400 sinon |
| Si VGP calculée = 0 et pas d'override | Avertissement bloquant — saisie manuelle requise |
| Quantité d'un instrument ne peut pas devenir négative | Erreur 400 (incohérence d'historique) |

---

## 10. Droits d'accès

| Action | Rôle requis |
|--------|-------------|
| Consulter sa fiscalité crypto | USER, ADMIN |
| Saisir / modifier ses opérations crypto | USER, ADMIN (via endpoints `PositionOrder`) |
| Consulter la fiscalité crypto d'un autre utilisateur | ADMIN uniquement (V2) |

---

## 11. Limites et hypothèses (V1)

- **Régime occasionnel uniquement** — pas de support BNC (trader habituel) ni BIC
- **Pas de staking, mining, lending, airdrops, NFT, DeFi**
- **Cours de clôture journaliers uniquement** pour le calcul de la VGP (pas d'intraday) — précision suffisante pour la déclaration mais pas pour un audit minute par minute
- **Cryptos non listées sur CoinGecko** : VGP à saisir manuellement par cession
- **Saisie rétroactive obligatoire** — l'utilisateur doit reconstituer son historique depuis le premier achat
- **Pas de génération PDF officielle 2086** — export CSV à recopier
- **Pas de gestion multi-foyer fiscal** — calcul par utilisateur (la fonctionnalité Foyer V1 n'agrège pas les positions crypto pour la fiscalité)
- **Moins-values non reportables** sur les années suivantes (limite légale du régime occasionnel)
- **Pas de calcul de la décote / plafonnement quotient familial** côté option barème — la PV est simplement remontée comme revenu additionnel à l'utilisateur, qui peut la saisir dans le simulateur d'impôts existant

---

## 12. Bibliographie

- **Article 150 VH bis du CGI** — régime des cessions d'actifs numériques par les particuliers
- **BOFiP** — BOI-RPPM-PVBMC-30-30 (commentaires administratifs)
- **Formulaire 2086** — Déclaration des plus ou moins-values sur actifs numériques (annexe à la 2042-C)
- **Loi de finances 2022 (art. 70)** — instauration de l'option pour le barème progressif (applicable depuis les revenus 2023)
