# Mise à jour manuelle des cours d'instruments

## 1. Objectif

Permettre à un administrateur de **mettre à jour manuellement le cours** (`lastPrice`) de tous les instruments financiers actifs dans l'application, depuis un panneau dédié sur la page Patrimoine.

Cette fonctionnalité est conçue comme **mécanisme de secours** : elle intervient lorsque la mise à jour automatique des cours (Yahoo Finance, CoinGecko) n'est pas disponible, pas encore implémentée, ou qu'un cours retourné par l'API est incorrect.

> Il s'agit d'une action administrative — seul le rôle `ADMIN` peut l'exécuter.

---

## 2. Définition d'un instrument actif

Un instrument est considéré **actif** s'il est référencé par au moins une `Position` dont le `status = ACTIVE`.

Cette définition garantit de n'afficher que les instruments réellement utiles au calcul de valorisation du patrimoine, et d'exclure les instruments orphelins ou liés uniquement à des positions fermées.

---

## 3. Modèle de données impacté

Aucune nouvelle entité. Les champs suivants de `Instrument` sont concernés :

| Champ | Type | Comportement |
|-------|------|-------------|
| `lastPrice` | `BigDecimal` | Mis à jour avec la valeur saisie par l'administrateur |
| `lastPriceUpdatedAt` | `LocalDateTime` | Mis à jour automatiquement à `now()` côté serveur — non transmis par le frontend |
| `stablePrice` | `boolean` | Géré par `PATCH /api/instruments/{id}/stable-price` — désactive l'indicateur d'obsolescence et le champ de saisie pour cet instrument |

---

## 4. Nouveaux DTOs

### `UpdateStablePriceRequest`

Record immuable transmis pour activer ou désactiver le prix fixe.

| Champ | Type | Contrainte |
|-------|------|------------|
| `stablePrice` | `Boolean` | Obligatoire (`@NotNull`) |

---

### `UpdateInstrumentPriceRequest`

Record immuable transmis dans le corps de la requête de mise à jour groupée.

| Champ | Type | Contrainte |
|-------|------|------------|
| `instrumentId` | `Long` | Obligatoire — identifiant de l'instrument à mettre à jour |
| `lastPrice` | `BigDecimal` | Obligatoire — strictement positif |

---

## 5. Règles métier

- `lastPrice` doit être **strictement positif** (`> 0`) — une valeur nulle ou négative est rejetée `400 BAD_REQUEST`
- `lastPriceUpdatedAt` est **toujours fixé côté serveur** à la date/heure de la requête — le frontend ne transmet pas de date
- Un instrument **absent** de la liste soumise n'est **pas modifié**
- Si un `instrumentId` n'existe pas en base, la requête est rejetée `404 NOT_FOUND`
- La mise à jour est **non transactionnelle par instrument** : chaque instrument est mis à jour indépendamment. Si un `instrumentId` est invalide parmi plusieurs, le traitement s'arrête en erreur pour l'ensemble

---

## 6. Nouveaux endpoints

### `GET /api/instruments/active`

Retourne la liste des instruments liés à au moins une position `ACTIVE`, triés par catégorie puis par nom.

**Rôle requis :** `ADMIN`

**Réponse :** `200 OK` — liste de `InstrumentDto`

```json
[
  {
    "id": 1,
    "category": "BOURSE",
    "isin": "FR0010315770",
    "ticker": null,
    "name": "Lyxor CAC 40 ETF",
    "currency": "EUR",
    "lastPrice": 32.15,
    "lastPriceUpdatedAt": "2025-04-10T08:00:00",
    "stablePrice": false
  },
  {
    "id": 3,
    "category": "CRYPTO",
    "isin": null,
    "ticker": "BTC",
    "name": "Bitcoin",
    "currency": "USD",
    "lastPrice": 29850.00,
    "lastPriceUpdatedAt": "2025-04-09T18:30:00",
    "stablePrice": false
  }
]
```

---

### `PUT /api/instruments/prices`

Met à jour le cours de plusieurs instruments en une seule requête.

**Rôle requis :** `ADMIN`

**Corps de la requête :** liste de `UpdateInstrumentPriceRequest`

```json
[
  { "instrumentId": 1, "lastPrice": 33.20 },
  { "instrumentId": 3, "lastPrice": 30100.00 }
]
```

**Réponse :** `200 OK` — liste des `InstrumentDto` effectivement mis à jour

**Erreurs possibles :**

| Code | Cas |
|------|-----|
| `400 BAD_REQUEST` | `lastPrice` nul ou ≤ 0 pour au moins un instrument |
| `404 NOT_FOUND` | Un `instrumentId` n'existe pas en base |

### `PATCH /api/instruments/{id}/stable-price`

Active ou désactive le prix fixe d'un instrument.

**Rôle requis :** `ADMIN`

**Corps de la requête :** `UpdateStablePriceRequest`

```json
{ "stablePrice": true }
```

**Réponse :** `200 OK` — `InstrumentDto` mis à jour

**Erreurs possibles :**

| Code | Cas |
|------|-----|
| `400 BAD_REQUEST` | `stablePrice` absent du corps |
| `404 NOT_FOUND` | Instrument introuvable |

---

## 7. Algorithme de mise à jour

```
1. Valider chaque entrée de la liste :
   a. instrumentId présent en base → sinon 404
   b. lastPrice > 0 → sinon 400
2. Pour chaque entrée valide :
   a. Charger l'Instrument
   b. instrument.lastPrice ← lastPrice fourni
   c. instrument.lastPriceUpdatedAt ← LocalDateTime.now()
   d. Persister
3. Retourner la liste des InstrumentDto mis à jour
```

---

## 8. Modifications repository

Ajout d'une requête dans `InstrumentRepository` pour récupérer les instruments actifs :

```java
@Query("""
    SELECT DISTINCT i FROM Instrument i
    JOIN Position p ON p.instrument = i
    WHERE p.status = 'ACTIVE'
    ORDER BY i.category ASC, i.name ASC
    """)
List<Instrument> findAllWithActivePositions();
```

---

## 9. Interface utilisateur

### Bouton d'accès

Un bouton **"Mettre à jour les cours"** est ajouté dans l'en-tête de la `PatrimoinePage`, à côté du bouton "+ Ajouter une position".

Il n'est **affiché que si l'utilisateur connecté a le rôle `ADMIN`**.

### Panneau modal — `InstrumentPriceUpdateModal`

| Zone | Description |
|------|-------------|
| En-tête | Titre "Mettre à jour les cours", sous-titre expliquant le périmètre (instruments actifs uniquement) |
| Tableau | Une ligne par instrument actif |
| Colonne Instrument | Nom + badge catégorie (`BOURSE` / `CRYPTO`) + ISIN ou ticker |
| Colonne Devise | Devise native de l'instrument (ex : `EUR`, `USD`) |
| Colonne Cours actuel | `lastPrice` existant, grisé non éditable + date de dernière mise à jour au format `dd/MM/yyyy HH:mm` |
| Colonne Nouveau cours | `<input type="number" min="0" step="any">` — vide par défaut, facultatif |
| Pied | Bouton "Annuler" + bouton "Enregistrer" (désactivé si aucun champ renseigné) |

### Comportement détaillé

1. À l'ouverture du modal → appel `GET /api/instruments/active` → affichage du tableau avec état de chargement
2. L'administrateur saisit les nouveaux cours dans les champs "Nouveau cours" — il peut ne renseigner qu'une partie des instruments
3. Clic sur **"Enregistrer"** → envoi `PUT /api/instruments/prices` avec uniquement les lignes où "Nouveau cours" est renseigné (valeur non vide)
4. Après succès → fermeture du modal + rechargement de toutes les positions (`fetchPositions()`) pour que les valorisations soient recalculées et affichées à jour

### Affichage du cours obsolète

Si `lastPriceUpdatedAt` est antérieur à **30 jours**, la date est affichée en **orange** pour signaler visuellement que le cours n'a pas été mis à jour récemment. Les instruments avec `stablePrice = true` sont exclus de cet indicateur — leur ligne est grisée et la date de mise à jour n'est pas affichée.

Un compteur global d'instruments obsolètes est affiché dans l'en-tête du modal.

### Toggle prix fixe (🔒 / 🔓)

Chaque ligne du tableau comporte un bouton icône permettant de basculer l'état `stablePrice` d'un instrument :

| État | Icône | Comportement |
|------|-------|-------------|
| `stablePrice = false` | 🔓 | Cours actif — saisie activée, indicateur d'obsolescence visible |
| `stablePrice = true` | 🔒 | Prix fixe — ligne grisée (`opacity-50`), saisie désactivée, pas d'indicateur de date |

Le toggle utilise une **mise à jour optimiste** : l'état local est modifié immédiatement, puis revert en cas d'erreur API. L'appel effectué est `PATCH /api/instruments/{id}/stable-price`.

### Indicateur de variation en temps réel

Lors de la saisie d'un nouveau cours, la colonne **Variation** affiche immédiatement la variation en % par rapport au cours actuel :

```
variation = ((nouveauCours - coursActuel) / coursActuel) × 100
```

Affichée en vert si ≥ 0, en rouge si < 0.

---

## 10. Droits d'accès

| Action | Rôle requis |
|--------|-------------|
| Consulter les instruments actifs (`GET /active`) | `ADMIN` |
| Mettre à jour les cours (`PUT /prices`) | `ADMIN` |
| Activer / désactiver le prix fixe (`PATCH /stable-price`) | `ADMIN` |
| Afficher le bouton "Mettre à jour les cours" | `ADMIN` (vérifié côté frontend sur `currentUser.roles`) |

---

## 11. Fichiers à créer / modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `dto/UpdateInstrumentPriceRequest.java` | Créer | Record de requête pour une mise à jour de cours |
| `repository/InstrumentRepository.java` | Modifier | Ajouter `findAllWithActivePositions()` |
| `service/InstrumentService.java` | Modifier | Ajouter `findActiveInstruments()` et `updatePrices()` |
| `controller/InstrumentController.java` | Modifier | Ajouter `GET /active` et `PUT /prices` |
| `service/InstrumentServiceTest.java` | Modifier | Tests des deux nouvelles méthodes de service |
| `controller/InstrumentControllerTest.java` | Modifier | Tests des deux nouveaux endpoints |
| `frontend/src/api/patrimoine.js` | Modifier | Ajouter `getActiveInstruments()` et `updateInstrumentPrices()` |
| `dto/UpdateStablePriceRequest.java` | Créer | Record de requête pour activer/désactiver le prix fixe |
| `service/InstrumentService.java` | Modifier | Ajouter `updateStablePrice()` |
| `controller/InstrumentController.java` | Modifier | Ajouter `PATCH /{id}/stable-price` |
| `service/InstrumentServiceTest.java` | Modifier | Tests `updateStablePrice_*` |
| `controller/InstrumentControllerTest.java` | Modifier | Tests `updateStablePrice_asAdmin_*` et `updateStablePrice_asUser_*` |
| `config/SecurityConfig.java` | Modifier | Ajouter `PATCH` dans `setAllowedMethods` (CORS) |
| `frontend/src/components/patrimoine/InstrumentPriceUpdateModal.jsx` | Créer | Composant modal de saisie groupée des cours |
| `frontend/src/components/patrimoine/PatrimoinePage.jsx` | Modifier | Ajouter le bouton d'accès et l'intégration du modal |
| `frontend/src/api/patrimoine.js` | Modifier | Ajouter `updateInstrumentStablePrice()` |
| `docs/api/patrimoine.md` | Modifier | Documenter les nouveaux endpoints |
