# Gestion admin des relevés de patrimoine

## Vue d'ensemble

Cette fonctionnalité permet à l'administrateur de **créer, consulter, modifier et supprimer manuellement** les relevés de patrimoine (`PortfolioSnapshot`) de n'importe quel utilisateur.

Elle répond à deux besoins principaux :
- **Correction d'erreurs** : modifier un snapshot existant dont les montants sont incorrects.
- **Import d'historique** : reconstituer manuellement un historique issu d'une autre application ou d'un fichier.

---

## Cas d'utilisation

| Cas | Description |
|-----|-------------|
| Créer un snapshot manuel | L'admin choisit un utilisateur et une date, puis saisit les montants pour chaque position active |
| Modifier un snapshot | L'admin corrige les valeurs d'un snapshot existant (investissement, valorisation, unités) |
| Supprimer un snapshot | L'admin supprime un snapshot erroné ou doublon |
| Consulter les snapshots | L'admin visualise l'historique complet des snapshots d'un utilisateur |

---

## Architecture backend

### Nouveaux endpoints

Tous protégés par `@PreAuthorize("hasRole('ADMIN')")`.

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET`    | `/api/admin/snapshots?userId={id}` | Liste tous les snapshots d'un utilisateur |
| `GET`    | `/api/admin/snapshots/{id}`        | Détail d'un snapshot (avec toutes les PositionSnapshots) |
| `POST`   | `/api/admin/snapshots`             | Crée un snapshot manuel pour un utilisateur |
| `PUT`    | `/api/admin/snapshots/{id}`        | Met à jour un snapshot existant |
| `DELETE` | `/api/admin/snapshots/{id}`        | Supprime un snapshot |

> **Choix de conception :** un controller dédié `AdminSnapshotController` plutôt qu'enrichir `PortfolioSnapshotController`, pour garder une séparation claire entre les opérations utilisateur (auto-snapshot, recalcul) et les opérations d'administration (CRUD libre).

### Nouveaux DTOs

**`ManualPositionSnapshotRequest`** (record)
```
positionId         Long         — identifiant de la position (obligatoire)
investedAmountEur  BigDecimal   — montant investi en EUR (obligatoire)
currentValueEur    BigDecimal   — valeur actuelle en EUR (obligatoire)
units              BigDecimal   — nombre d'unités (optionnel — BOURSE/CRYPTO uniquement)
unitPriceEur       BigDecimal   — prix unitaire en EUR (optionnel — BOURSE/CRYPTO uniquement)
```

**`ManualSnapshotRequest`** (record)
```
userId             Long                              — utilisateur cible (obligatoire)
snapshotDate       LocalDate                         — date du relevé (obligatoire)
positions          List<ManualPositionSnapshotRequest>
```

**`AdminSnapshotPositionDto`** (record, utilisé dans la réponse GET detail)
```
id                 Long         — id de la PositionSnapshot
positionId         Long
positionLabel      String
positionCategory   String       — nom de l'enum AssetCategory
investedAmountEur  BigDecimal
currentValueEur    BigDecimal
capitalGainEur     BigDecimal   — calculé automatiquement (currentValue - invested)
units              BigDecimal   — null si non applicable
unitPriceEur       BigDecimal   — null si non applicable
```

**`AdminSnapshotDetailDto`** (record)
```
id                   Long
snapshotDate         LocalDate
totalInvestedEur     BigDecimal
totalCurrentValueEur BigDecimal
totalCapitalGainEur  BigDecimal
positions            List<AdminSnapshotPositionDto>
```

> Les totaux (`totalInvestedEur`, `totalCurrentValueEur`, `totalCapitalGainEur`) sont **calculés automatiquement** côté service comme la somme des positions — l'admin ne les saisit pas.

### Nouveau service : `AdminSnapshotService`

Méthodes :

| Méthode | Description |
|---------|-------------|
| `findAllByUser(Long userId)` | Retourne la liste sommaire des snapshots d'un utilisateur, triée par date desc |
| `findById(Long id)` | Retourne le détail d'un snapshot (avec positions) — vérifie que le snapshot existe |
| `createManual(ManualSnapshotRequest)` | Crée un snapshot manuellement |
| `update(Long id, ManualSnapshotRequest)` | Met à jour un snapshot (remplace toutes les PositionSnapshots via orphanRemoval) |
| `delete(Long id)` | Supprime un snapshot |

**Règles métier pour `createManual` :**
1. Vérifier que l'utilisateur existe (`UserRepository.findById`).
2. Vérifier qu'il n'existe pas déjà un snapshot sur le même mois (`findByUserAndSnapshotDateBetween` — même contrainte que l'auto-generation).
3. Pour chaque `positionId` de la requête, vérifier que la position appartient bien à l'utilisateur cible.
4. Calculer `capitalGainEur = currentValueEur - investedAmountEur` pour chaque position.
5. Calculer les totaux du portfolio en sommant les positions.
6. Persister avec `@Transactional`.

**Règles métier pour `update` :**
1. Vérifier que le snapshot existe.
2. Effacer et remplacer toutes les `PositionSnapshot` existantes (cascade `ALL` + `orphanRemoval = true` géré par JPA).
3. Recalculer les totaux du portfolio.
4. Persister avec `@Transactional`.

### Endpoint utilitaire : positions d'un utilisateur

Pour alimenter le formulaire frontend, l'admin a besoin de récupérer les positions **actives** d'un utilisateur cible.

L'endpoint existant `GET /api/positions` ne retourne que les positions de l'utilisateur connecté. Il faudra ajouter :

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/admin/users/{userId}/positions` | Liste les positions ACTIVE d'un utilisateur (ADMIN) |

Ce endpoint retourne une liste de `PositionRefDto` enrichis (id, label, category, partner) pour permettre à l'admin d'identifier chaque ligne.

---

## Architecture frontend

### Nouvelle page : `AdminSnapshotPage`

Accessible via le menu de navigation sous l'entrée **"Relevés admin"** (visible uniquement pour `user.role === 'ADMIN'`).

**Structure de la page :**

```
AdminSnapshotPage
├── Sélecteur d'utilisateur (dropdown)          ← charge la liste /api/users
├── Bouton "Ajouter manuellement un Relevé"     ← ouvre ManualSnapshotModal en mode création
└── SnapshotAdminTable                          ← tableau des snapshots de l'utilisateur sélectionné
    ├── Colonnes : Date | Investi | Valeur | Plus-value | Actions
    └── Par ligne : bouton Modifier (→ ManualSnapshotModal mode édition) + bouton Supprimer
```

### Nouveau composant : `ManualSnapshotModal`

Modal en deux sections :

**Section 1 — En-tête**
- Sélecteur d'utilisateur (pré-rempli si venant de la page admin, grisé si mode édition)
- Champ date (type `date`)

**Section 2 — Tableau de saisie des positions**

| Colonne | Description |
|---------|-------------|
| Position | Label + catégorie (lecture seule) |
| Investi (EUR) | Input numérique — `investedAmountEur` |
| Valeur actuelle (EUR) | Input numérique — `currentValueEur` |
| Plus-value (EUR) | Calculé automatiquement = valeur − investi (lecture seule, coloré vert/rouge) |
| Unités | Input numérique optionnel — visible si catégorie BOURSE ou CRYPTO |
| Prix unitaire (EUR) | Input numérique optionnel — visible si catégorie BOURSE ou CRYPTO |

**Pied de modal — Totaux récapitulatifs** (calculés en temps réel)
- Total investi : somme des `investedAmountEur`
- Valeur totale : somme des `currentValueEur`
- Plus-value totale : différence

**Chargement des positions :**
- À l'ouverture en mode création, après sélection de l'utilisateur : `GET /api/admin/users/{userId}/positions`
- En mode édition : les valeurs du snapshot existant sont pré-remplies (`GET /api/admin/snapshots/{id}`)

### Nouveau fichier API : ajout dans `patrimoine.js`

```javascript
// Admin snapshots
export const getAdminSnapshots = (userId) =>
  api.get('/api/admin/snapshots', { params: { userId } })

export const getAdminSnapshot = (id) =>
  api.get(`/api/admin/snapshots/${id}`)

export const createAdminSnapshot = (data) =>
  api.post('/api/admin/snapshots', data)

export const updateAdminSnapshot = (id, data) =>
  api.put(`/api/admin/snapshots/${id}`, data)

export const deleteAdminSnapshot = (id) =>
  api.delete(`/api/admin/snapshots/${id}`)

// Positions d'un utilisateur (admin)
export const getAdminUserPositions = (userId) =>
  api.get(`/api/admin/users/${userId}/positions`)
```

### Intégration navigation

Dans `Navigation.jsx`, ajouter une entrée conditionnelle (même pattern que "Utilisateurs") :

```jsx
{user.role === 'ADMIN' && (
  <button onClick={() => setCurrentPage('admin-snapshots')}>
    Relevés admin
  </button>
)}
```

Dans `App.jsx`, ajouter le cas de routage :
```jsx
'admin-snapshots' → <AdminSnapshotPage>
```

---

## Flux de données

### Création d'un snapshot manuel

```
Admin ouvre AdminSnapshotPage
  → sélectionne un utilisateur (GET /api/users)
  → clique "Ajouter manuellement un Relevé"
    → ManualSnapshotModal s'ouvre
    → GET /api/admin/users/{userId}/positions
    → admin saisit la date et les montants par position
    → POST /api/admin/snapshots
      → AdminSnapshotService.createManual()
        → vérifie unicité du mois
        → vérifie appartenance des positions
        → calcule les totaux
        → persiste PortfolioSnapshot + PositionSnapshot[]
    → modal se ferme, tableau rafraîchi
```

### Modification d'un snapshot existant

```
Admin clique "Modifier" sur une ligne du tableau
  → GET /api/admin/snapshots/{id}
    → ManualSnapshotModal s'ouvre en mode édition (date + positions pré-remplies)
  → admin ajuste les valeurs
  → PUT /api/admin/snapshots/{id}
    → AdminSnapshotService.update()
      → supprime les PositionSnapshot existantes (orphanRemoval)
      → recrée avec les nouvelles valeurs
      → recalcule les totaux
    → modal se ferme, tableau rafraîchi
```

### Suppression d'un snapshot

```
Admin clique "Supprimer" sur une ligne
  → confirmation modale (même pattern que UserList)
  → DELETE /api/admin/snapshots/{id}
    → AdminSnapshotService.delete()
      → cascade supprime les PositionSnapshot (orphanRemoval)
  → tableau rafraîchi
```

---

## Fichiers à créer / modifier

### Backend

| Fichier | Action |
|---------|--------|
| `dto/ManualPositionSnapshotRequest.java` | Créer |
| `dto/ManualSnapshotRequest.java` | Créer |
| `dto/AdminSnapshotPositionDto.java` | Créer |
| `dto/AdminSnapshotDetailDto.java` | Créer |
| `service/AdminSnapshotService.java` | Créer |
| `controller/AdminSnapshotController.java` | Créer |
| `repository/PortfolioSnapshotRepository.java` | Ajouter `findByUser` + `findById` si pas suffisant |
| `test/.../AdminSnapshotServiceTest.java` | Créer |
| `test/.../AdminSnapshotControllerTest.java` | Créer |

### Frontend

| Fichier | Action |
|---------|--------|
| `src/components/patrimoine/AdminSnapshotPage.jsx` | Créer |
| `src/components/patrimoine/ManualSnapshotModal.jsx` | Créer |
| `src/api/patrimoine.js` | Modifier — ajouter les 5 nouvelles fonctions admin |
| `src/components/Navigation.jsx` | Modifier — ajouter entrée "Relevés admin" |
| `src/App.jsx` | Modifier — ajouter route `admin-snapshots` |

### Documentation

| Fichier | Action |
|---------|--------|
| `docs/api/admin-snapshots.md` | Créer |
| `docs/architecture/admin-snapshot-management.md` | Ce fichier |
| `CLAUDE.md` — section Endpoints | Mettre à jour avec les nouveaux endpoints |

---

## Décisions d'architecture notables

**Totaux calculés automatiquement** — L'admin ne saisit que les montants par position. Les totaux du portfolio (`totalInvestedEur`, `totalCurrentValueEur`, `totalCapitalGainEur`) sont recalculés côté service à chaque création/modification. Cela évite les incohérences et respecte le contrat de données existant.

**Controller dédié `AdminSnapshotController`** — Plutôt qu'ajouter des endpoints admin dans `PortfolioSnapshotController`, un controller séparé clarifie la séparation des responsabilités et facilite les tests.

**Vérification d'appartenance des positions** — Avant toute persistance, le service vérifie que chaque `positionId` soumis appartient bien à l'utilisateur cible. Cela évite qu'un admin associe accidentellement une position d'un autre utilisateur à un snapshot.

**Pas de contrainte de snapshot mensuel unique en mode admin** — La contrainte "un seul snapshot par mois" existe pour la génération automatique (éviter les doublons de scheduler). En mode édition admin, cette contrainte ne s'applique qu'à la création (pas à la modification) et peut éventuellement être assouplie si le besoin d'un historique journalier émerge.
