# Gestion des taux de change

## 1. Objectif

Permettre à un administrateur de **saisir et maintenir manuellement les taux de change** des devises étrangères utilisées dans le portefeuille (USD, GBP, CHF, etc.), afin que les positions BOURSE et CRYPTO libellées dans une devise autre que l'EUR soient correctement valorisées en EUR.

> Il s'agit d'une action administrative — seul le rôle `ADMIN` peut consulter et modifier les taux.

---

## 2. Problème résolu

Avant cette fonctionnalité, les positions BOURSE et CRYPTO dont l'instrument était coté en USD (par exemple) étaient valorisées en EUR **sans conversion** : la valeur affichée (`units × lastPrice`) était exprimée en devise native, ce qui rendait les totaux patrimoniaux incorrects lorsqu'une position non-EUR était présente.

Le code marquait explicitement cette limitation par le commentaire :

```
// Si devise != EUR, on aurait besoin du taux de change à la volée (non disponible ici)
// On utilise le montant brut en devise native (à améliorer avec le service de taux)
```

Ce commentaire est supprimé avec l'implémentation de la présente fonctionnalité.

---

## 3. Convention des taux

Le taux de change `rate` exprime le **nombre d'unités de la devise étrangère pour 1 EUR**.

| Exemple | Signification |
|---------|---------------|
| `currency = "USD"`, `rate = 1.08` | 1 EUR = 1,08 USD |
| `currency = "GBP"`, `rate = 0.86` | 1 EUR = 0,86 GBP |
| `currency = "CHF"`, `rate = 0.96` | 1 EUR = 0,96 CHF |

La formule de conversion est :

```
amountEur = amountNatif / rate
```

---

## 4. Modèle de données

### Nouvelle entité : `ExchangeRate`

Table : `exchange_rates`

| Champ | Type | Contrainte | Description |
|-------|------|------------|-------------|
| `id` | `Long` | Clé primaire auto | Identifiant |
| `currency` | `String` | `NOT NULL`, `UNIQUE` | Code ISO 4217 (ex : `USD`, `GBP`, `CHF`) |
| `rate` | `BigDecimal` | `NOT NULL` | Nombre d'unités de la devise pour 1 EUR |
| `lastUpdatedAt` | `LocalDateTime` | nullable | Date de la dernière mise à jour |

**Unicité :** chaque devise ne possède qu'une seule entrée. La mise à jour est un upsert : création si la devise n'existe pas encore, mise à jour sinon.

---

## 5. Nouveaux DTOs

### `ExchangeRateDto`

Retourné en lecture.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `Long` | Identifiant |
| `currency` | `String` | Code devise |
| `rate` | `BigDecimal` | Taux courant |
| `lastUpdatedAt` | `LocalDateTime` | Date de mise à jour — `null` si jamais mis à jour |

### `UpdateExchangeRateRequest`

Transmis en écriture. Effectue un upsert par devise.

| Champ | Type | Contrainte |
|-------|------|------------|
| `currency` | `String` | Obligatoire, non vide |
| `rate` | `BigDecimal` | Obligatoire, strictement positif |

---

## 6. Règles métier

- `rate` doit être **strictement positif** (`> 0`) — une valeur nulle ou négative est rejetée `400 BAD_REQUEST`
- `lastUpdatedAt` est **toujours fixé côté serveur** à la date/heure de la requête — le frontend ne transmet pas de date
- La mise à jour est un **upsert par code devise** : si la devise n'existe pas, elle est créée ; si elle existe déjà, son taux est mis à jour
- Une devise absente de la liste soumise n'est **pas modifiée**
- La devise `EUR` n'est pas stockée — une position en EUR ne requiert aucune conversion

---

## 7. Nouveaux endpoints

### `GET /api/exchange-rates`

Retourne tous les taux configurés, triés par code devise (ordre alphabétique).

**Rôle requis :** `ADMIN`

**Réponse :** `200 OK` — liste de `ExchangeRateDto`

```json
[
  {
    "id": 2,
    "currency": "GBP",
    "rate": 0.86,
    "lastUpdatedAt": "2026-04-15T10:00:00"
  },
  {
    "id": 1,
    "currency": "USD",
    "rate": 1.08,
    "lastUpdatedAt": "2026-04-15T10:00:00"
  }
]
```

---

### `PUT /api/exchange-rates`

Met à jour (ou crée) plusieurs taux en une seule requête (upsert par devise).

**Rôle requis :** `ADMIN`

**Corps de la requête :** liste de `UpdateExchangeRateRequest`

```json
[
  { "currency": "USD", "rate": 1.10 },
  { "currency": "GBP", "rate": 0.88 },
  { "currency": "CHF", "rate": 0.96 }
]
```

**Réponse :** `200 OK` — liste des `ExchangeRateDto` créés ou mis à jour

**Erreurs possibles :**

| Code | Cas |
|------|-----|
| `400 BAD_REQUEST` | `rate` nul ou ≤ 0 pour au moins une devise |
| `400 BAD_REQUEST` | `currency` vide ou nul |

---

## 8. Algorithme de mise à jour

```
Pour chaque UpdateExchangeRateRequest :
  1. Chercher ExchangeRate par currency
  2. Si trouvé  → mettre à jour rate + lastUpdatedAt = now()
  3. Si absent  → créer ExchangeRate(currency, rate, lastUpdatedAt = now())
  4. Persister
5. Retourner la liste des ExchangeRateDto créés/mis à jour
```

---

## 9. Impact sur le calcul de valorisation (PositionDto)

La méthode `computeBourseCrypto()` de `PositionDto` reçoit désormais une `Map<String, BigDecimal> exchangeRates` (chargée depuis `ExchangeRateRepository`).

### Formule de valorisation

```
currentValueEur = units × instrument.lastPrice                  (si devise = EUR)
currentValueEur = (units × instrument.lastPrice) / rate         (si devise ≠ EUR et taux configuré)
currentValueEur = units × instrument.lastPrice (devise native)  (si taux non configuré — dégradé)
```

Le comportement dégradé (taux absent) conserve la valeur en devise native pour éviter une valorisation à zéro. L'administrateur est invité à configurer les taux manquants via l'interface.

### Propagation dans les services

| Service | Méthode | Comportement |
|---------|---------|-------------|
| `PositionService` | `findAllByUser()`, `findById()`, `create()`, `update()`, `close()`, etc. | Charge `loadExchangeRates()` une fois par requête, passe la map à `PositionDto` |
| `PortfolioSnapshotService` | `buildAndSaveSnapshot()`, `recalculate()` | Charge `loadExchangeRates()` une fois par snapshot, passe la map à `PositionDto.computeForSnapshot()` et à `computeUnitPriceEur()` |

La map est chargée **une seule fois par opération** (pas par position) pour éviter les appels répétés à la base de données.

---

## 10. Interface utilisateur

### Bouton d'accès

Un bouton **"Taux de change"** (couleur teal) est ajouté dans l'en-tête de la `PatrimoinePage`, à gauche du bouton "Mettre à jour les cours".

Il n'est **affiché que si l'utilisateur connecté a le rôle `ADMIN`**.

### Modal — `ExchangeRateUpdateModal`

| Zone | Description |
|------|-------------|
| En-tête | Titre "Taux de change", sous-titre expliquant la convention (1 EUR = X devise) |
| Tableau | Une ligne par taux déjà configuré en base |
| Colonne Devise | Code ISO de la devise (ex : `USD`) |
| Colonne Taux actuel | Taux courant formaté à 4–6 décimales |
| Colonne Mis à jour | Date de la dernière mise à jour — en orange si > 7 jours |
| Colonne Nouveau taux | `<input type="number" min="0" step="any">` — vide par défaut |
| Section "Ajouter / modifier" | Formulaire en bas : champ code devise + champ taux + bouton "Ajouter" |
| Pied | Bouton "Annuler" + bouton "Enregistrer" (désactivé si aucun champ renseigné) |

### Comportement détaillé

1. À l'ouverture → appel `GET /api/exchange-rates` → affichage du tableau
2. L'administrateur peut **modifier** les taux existants via les champs de la colonne "Nouveau taux"
3. L'administrateur peut **ajouter une nouvelle devise** via le formulaire en bas — le code devise est saisi en majuscules automatiquement. Si la devise est déjà dans le tableau, son champ est pré-rempli
4. Clic sur **"Enregistrer"** → envoi `PUT /api/exchange-rates` avec toutes les lignes où un nouveau taux est renseigné (valeur non vide et > 0)
5. Après succès → fermeture de la modal + rechargement des positions (`fetchPositions()`) pour recalculer les valorisations

### Affichage du taux obsolète

Si `lastUpdatedAt` est antérieur à **7 jours**, la date est affichée en **orange** pour signaler visuellement que le taux n'est plus récent.

---

## 11. Droits d'accès

| Action | Rôle requis |
|--------|-------------|
| Consulter les taux (`GET /api/exchange-rates`) | `ADMIN` |
| Mettre à jour les taux (`PUT /api/exchange-rates`) | `ADMIN` |
| Afficher le bouton "Taux de change" | `ADMIN` (vérifié côté frontend sur `currentUser.role`) |

---

## 12. Fichiers créés / modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `domain/ExchangeRate.java` | Créer | Entité JPA `exchange_rates` |
| `repository/ExchangeRateRepository.java` | Créer | `findByCurrency()`, `findAllByOrderByCurrencyAsc()` |
| `dto/ExchangeRateDto.java` | Créer | DTO de lecture |
| `dto/UpdateExchangeRateRequest.java` | Créer | DTO d'écriture (upsert) |
| `service/ExchangeRateService.java` | Créer | `findAll()`, `getRatesAsMap()`, `updateRates()` |
| `controller/ExchangeRateController.java` | Créer | `GET` + `PUT /api/exchange-rates` |
| `dto/PositionDto.java` | Modifier | `computeBourseCrypto()` applique la conversion devise→EUR |
| `service/PositionService.java` | Modifier | Injecte `ExchangeRateRepository`, charge et propage la map des taux ; suppression de `computeAmountEur()` |
| `service/PortfolioSnapshotService.java` | Modifier | Idem + mise à jour de `computeUnitPriceEur()` |
| `dto/CreatePositionOrderRequest.java` | Modifier | Suppression des champs `currency` et `exchangeRate` |
| `dto/UpdatePositionOrderRequest.java` | Modifier | Suppression du champ `exchangeRate` |
| `dto/PositionOrderDto.java` | Modifier | Suppression du champ `exchangeRate` |
| `domain/PositionOrder.java` | Modifier | Suppression de la colonne `exchangeRate` |
| `migrations/001_drop_exchange_rate_from_position_orders.sql` | Créer | Migration SQLite pour supprimer la colonne `exchange_rate` |
| `test/.../ExchangeRateServiceTest.java` | Créer | 7 tests unitaires |
| `test/.../ExchangeRateControllerTest.java` | Créer | 5 tests controller |
| `test/.../PositionServiceTest.java` | Modifier | Ajout du mock `ExchangeRateRepository`, suppression du test devise étrangère |
| `test/.../PortfolioSnapshotServiceTest.java` | Modifier | Ajout du mock `ExchangeRateRepository` |
| `frontend/src/api/patrimoine.js` | Modifier | `getExchangeRates()`, `updateExchangeRates()` |
| `frontend/src/components/patrimoine/ExchangeRateUpdateModal.jsx` | Créer | Modal de gestion des taux |
| `frontend/src/components/patrimoine/PatrimoinePage.jsx` | Modifier | Bouton + intégration de la modal |
