# Mise à jour automatique des cours et snapshot mensuel

Mise à jour automatique des cours des instruments financiers (actions, ETF, cryptomonnaies) et des taux de change une fois par mois, suivie d'un snapshot patrimonial automatique pour tous les utilisateurs.

---

## Vue d'ensemble

Chaque premier du mois à 2h00, un scheduler Spring déclenche une chaîne en quatre étapes :

```
1. Résolution des IDs CoinGecko manquants (CRYPTO uniquement)
2. Mise à jour des cours instruments (BOURSE via Boursorama, CRYPTO via CoinGecko)
3. Mise à jour des taux de change (ECB / Frankfurter)
4. Snapshot patrimonial pour tous les utilisateurs
```

Cette séquence garantit que le snapshot mensuel reflète des cours à jour. Si une étape échoue partiellement (un instrument non résolu, un taux manquant), les suivantes s'exécutent quand même — chaque erreur est collectée sans interrompre la chaîne.

> **Choix de conception :** Le scheduler est **désactivé en profil `dev`** (`scheduler.enabled=false`). Il ne s'exécute qu'en profil `prod`, hébergé sur le NAS.

La mise à jour peut également être **déclenchée manuellement** via `POST /api/admin/market-data/run` (ADMIN).

---

## 1. Sources de données

### 1.1 BOURSE et ETF — Boursorama (scraping HTML)

Boursorama est retenu pour sa couverture des instruments français (ETF, OPCVM, actions). Les prix sont présents dans le HTML rendu côté serveur — pas de JavaScript nécessaire, ce qui rend le scraping via Jsoup fiable.

**URL :**
```
https://www.boursorama.com/cours/{boursoramaSymbol}/
```

La requête suit automatiquement la redirection 301 vers la section appropriée (trackers, fonds, actions…). Le prix est extrait du sélecteur :
```
span.c-instrument--last[data-ist-last]
```

Le format du prix est en français (`30,8419`, `59 140,23`). Le parsing remplace les espaces insécables, espaces ordinaires et virgules avant conversion en `BigDecimal`.

**Dépendance Maven :**
```xml
<dependency>
  <groupId>org.jsoup</groupId>
  <artifactId>jsoup</artifactId>
  <version>1.18.3</version>
</dependency>
```

**Symbole Boursorama (`boursoramaSymbol`) :** saisi **manuellement** par l'administrateur via la page "Gestion des instruments". Il n'existe pas de correspondance automatique ISIN→symbole Boursorama. Les instruments BOURSE sans `boursoramaSymbol` renseigné sont ignorés lors de la mise à jour.

### 1.2 CRYPTO — CoinGecko

CoinGecko est retenu pour sa couverture crypto exhaustive et son API gratuite (50 req/min).

**Endpoint prix groupé :**
```
GET https://api.coingecko.com/api/v3/simple/price
    ?ids=bitcoin,ethereum,solana&vs_currencies=eur,usd
```

Un seul appel pour tous les instruments CRYPTO, ce qui préserve le quota.

**Résolution ticker → `coinGeckoId` :** effectuée automatiquement au premier passage du scheduler pour les instruments CRYPTO dont `coinGeckoId` est null :
```
GET https://api.coingecko.com/api/v3/search?query={ticker}
```
Le premier résultat de type `coin` fournit l'identifiant (ex : `"bitcoin"`), stocké dans `Instrument.coinGeckoId`.

### 1.3 Taux de change — ECB / Frankfurter

La Banque Centrale Européenne publie les taux de change officiels EUR/devise. API gratuite, officielle et sans clé.

**Endpoint :**
```
GET https://api.frankfurter.app/latest?from=EUR
```

Retourne tous les taux EUR/devise en un seul appel.

---

## 2. Champs de mapping sur l'entité `Instrument`

| Champ | Type Java | Colonne SQLite | Description |
|-------|-----------|----------------|-------------|
| `boursoramaSymbol` | `String` | `boursorama_symbol` | Symbole Boursorama (ex : `"1rTESE"`) — BOURSE uniquement, saisi manuellement |
| `coinGeckoId` | `String` | `coin_gecko_id` | Identifiant CoinGecko (ex : `"bitcoin"`) — CRYPTO uniquement, résolu automatiquement |

**Migration SQLite (déjà appliquée en dev) :**
```sql
ALTER TABLE instruments ADD COLUMN boursorama_symbol TEXT;
ALTER TABLE instruments ADD COLUMN coin_gecko_id TEXT;
```

---

## 3. Architecture backend

```
com.myfinance
├── config/
│   └── SchedulerConfig.java           @Configuration @EnableScheduling
├── scheduler/
│   └── MarketDataScheduler.java       @Scheduled cron mensuel (@ConditionalOnProperty)
├── service/
│   ├── MarketDataService.java         Orchestrateur : résolution + prix + taux + snapshot
│   ├── BoursoramaClient.java          Scraping HTML Jsoup (BOURSE)
│   ├── CoinGeckoClient.java           REST CoinGecko (CRYPTO)
│   └── EcbRateClient.java             REST ECB/Frankfurter (taux de change)
└── dto/
    └── MarketDataReportDto.java       Rapport d'exécution (record)
```

`MarketDataService` injecte :
- `BoursoramaClient`
- `CoinGeckoClient`
- `EcbRateClient`
- `InstrumentRepository`
- `ExchangeRateService`
- `PortfolioSnapshotService`

---

## 4. Séquence d'exécution

```
MarketDataScheduler.runMonthlyUpdate()   cron: "0 0 2 1 * *"
│
├── 1. MarketDataService.resolveSymbols()
│   └── Pour chaque CRYPTO avec coinGeckoId = null
│       └── CoinGeckoClient.searchId(ticker) → stocke coinGeckoId
│
├── 2. MarketDataService.updatePrices()
│   ├── Pour chaque BOURSE avec boursoramaSymbol ≠ null et stablePrice = false
│   │   └── BoursoramaClient.getPrice(boursoramaSymbol) → maj lastPrice
│   └── Pour chaque CRYPTO avec coinGeckoId ≠ null et stablePrice = false
│       └── CoinGeckoClient.getPrices(coinGeckoIds) — un seul appel groupé
│
├── 3. MarketDataService.updateExchangeRates()
│   └── EcbRateClient.getRates() → ExchangeRateService.updateRates()
│
└── 4. MarketDataService.createMonthlySnapshots()
    └── PortfolioSnapshotService.createForAllUsers(today)
```

---

## 5. Gestion des erreurs

| Cas | Comportement |
|-----|-------------|
| `boursoramaSymbol` absent sur un instrument BOURSE | Instrument ignoré silencieusement |
| Scraping Boursorama échoue (sélecteur absent, timeout) | Log `ERROR`, instrument compté en `failed`, traitement continue |
| `coinGeckoId` introuvable pour un ticker CRYPTO | Log `WARN`, ajouté à `errors`, traitement continue |
| CoinGecko : cours absent dans la réponse groupée | Log `ERROR`, instrument compté en `failed` |
| ECB : aucun taux retourné | Log `ERROR`, `ratesUpdated = 0`, ajouté à `errors`, suite continue |
| Snapshot utilisateur échoue | Log `ERROR`, ajouté à `errors`, passage à l'utilisateur suivant |

Aucune erreur partielle n'interrompt la chaîne globale. Un `MarketDataReportDto` résume le résultat en fin d'exécution (et dans la réponse de l'endpoint manuel).

---

## 6. Endpoint de déclenchement manuel

### `POST /api/admin/market-data/run`

Déclenche `runFullUpdate()` de façon synchrone et retourne le rapport.

**Rôle requis :** `ADMIN`

**Réponse 200 :**
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

---

## 7. Interface utilisateur

### Page "Gestion des instruments" (`AdminInstrumentPage`)

Accessible depuis le menu Administration → "Instruments financiers". Visible uniquement pour le rôle `ADMIN`.

- Tableau des instruments groupés par catégorie (BOURSE / CRYPTO)
- Colonnes : Nom, ISIN/Ticker, Boursorama/CoinGecko ID, Prix actuel, Mis à jour (orange si > 30 j), Prix fixe
- Bouton **"⟳ Mettre à jour les cours"** → appelle `POST /api/admin/market-data/run`, affiche le rapport inline (cours MàJ, échecs, taux, snapshots, avertissements)
- Bouton **"+ Ajouter"** + bouton **"Modifier"** par ligne → ouvre `AdminInstrumentForm` (modal de création/édition)

### Modal `AdminInstrumentForm`

Permet à l'admin de créer ou modifier un instrument :
- Champs communs : catégorie (création uniquement), ISIN/ticker, nom, devise
- BOURSE : champ `boursoramaSymbol` (symbole Boursorama à saisir manuellement), prix fixe
- CRYPTO : champ `coinGeckoId` (avec avertissement "saisi automatiquement"), prix fixe

---

## 8. Logs

Un seul message de démarrage + un message de bilan en fin d'exécution :

```
[MàJ] Démarrage de la mise à jour des données marché
[MàJ] Terminé — 1 CoinGecko résolus | 8 cours MàJ | 5 taux | 2 snapshots créés
```

En cas d'erreurs :
```
[MàJ] Terminé avec 2 erreur(s) — 7 cours MàJ | 1 échoués | 5 taux | 2 snapshots créés
```

Les erreurs individuelles (Boursorama indisponible, CoinGecko introuvable) sont loggées au niveau `ERROR`/`WARN` au moment où elles surviennent.

---

## 9. Configuration

```properties
# Activer/désactiver le scheduler (false en dev, true en prod)
scheduler.enabled=false
```

Le cron est codé en dur dans `MarketDataScheduler` : `"0 0 2 1 * *"` (1er du mois à 2h00).

---

## 10. Tests unitaires

| Classe de test | Contenu |
|----------------|---------|
| `MarketDataServiceTest` | Résolution CoinGecko (succès + échec), mise à jour Boursorama (succès + échec), appel CoinGecko groupé, `runFullUpdate` complet, ECB vide |
