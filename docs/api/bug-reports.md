# API — Signalement de bugs

Base URL : `http://localhost:8080`

Swagger UI interactif : `http://localhost:8080/swagger-ui.html`

Tous les endpoints nécessitent d'être **authentifié** (cookie `JSESSIONID`).
Les endpoints `/api/admin/bug-reports/**` requièrent en plus le rôle **ADMIN**.

> Architecture complète et règles métier : [`docs/architecture/bug-reports.md`](../architecture/bug-reports.md)

---

## GET /api/bug-reports

Retourne la liste paginée de tous les bugs, triés par score décroissant par défaut.

**Accès** : authentifié

```http
GET /api/bug-reports?status=OPEN&page=0&size=20&sort=score
```

### Paramètres de requête

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `status` | `BugStatus` | — | Filtre sur le statut (`OPEN`, `IN_PROGRESS`, `FIXED`, `CLOSED`, `REJECTED`, `DUPLICATE`) |
| `page` | Integer | — | Numéro de page (défaut : `0`) |
| `size` | Integer | — | Taille de page (défaut : `20`, max : `100`) |
| `sort` | String | — | Tri : `score` (défaut), `createdAt`, `commentCount` — toujours décroissant |

### Réponse — 200 OK

```json
{
  "content": [
    {
      "id": 7,
      "title": "Le graphique patrimoine ne s'affiche plus après déconnexion rapide",
      "status": "OPEN",
      "userImpact": "HIGH",
      "priority": null,
      "score": 4,
      "commentCount": 2,
      "createdAt": "2026-05-14T11:30:00",
      "reporterFirstName": "Alice"
    }
  ],
  "totalElements": 12,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

| Champ | Description |
|-------|-------------|
| `score` | Score calculé : Σ(UP) − Σ(DOWN) |
| `priority` | `null` si l'admin n'a pas encore défini de priorité |
| `reporterFirstName` | Prénom du reporter (pas le login) |

### Réponses

**200 OK** — Liste retournée (peut être vide)
**401 Unauthorized** — Non authentifié

---

## GET /api/bug-reports/{id}

Retourne le détail complet d'un bug avec son thread de commentaires, son score
et le vote courant de l'utilisateur connecté.

**Accès** : authentifié

```http
GET /api/bug-reports/7
```

### Réponse — 200 OK

```json
{
  "id": 7,
  "title": "Le graphique patrimoine ne s'affiche plus après déconnexion rapide",
  "description": "Après une déconnexion rapide suivie d'une reconnexion, le graphique d'évolution du patrimoine reste vide.",
  "expectedResult": "Le graphique doit se charger normalement et afficher les données historiques.",
  "reproductionSteps": "1. Se connecter\n2. Se déconnecter immédiatement\n3. Se reconnecter\n4. Ouvrir la page Patrimoine",
  "approximateDateTime": "2026-05-14T10:00:00",
  "userImpact": "HIGH",
  "priority": null,
  "status": "OPEN",
  "score": 4,
  "userVote": "UP",
  "commentCount": 2,
  "createdAt": "2026-05-14T11:30:00",
  "reporterFirstName": "Alice",
  "comments": [
    {
      "id": 3,
      "authorDisplay": "Kevin",
      "content": "Je confirme, j'ai le même problème.",
      "createdAt": "2026-05-14T12:05:00"
    },
    {
      "id": 4,
      "authorDisplay": "Marc",
      "content": "Ça m'est arrivé 2 fois cette semaine.",
      "createdAt": "2026-05-14T13:20:00"
    }
  ]
}
```

| Champ | Description |
|-------|-------------|
| `userVote` | Vote de l'utilisateur connecté sur ce bug : `"UP"`, `"DOWN"` ou `null` |
| `comments[].authorDisplay` | Prénom de l'auteur (côté utilisateur) |

### Réponses

**200 OK** — Bug trouvé
**401 Unauthorized** — Non authentifié
**404 Not Found** — Bug inexistant

---

## POST /api/bug-reports

Signale un nouveau bug. Le statut est automatiquement `OPEN`. Un vote `UP` est
automatiquement enregistré au nom du reporter (score initial = 1).

**Accès** : authentifié

```http
POST /api/bug-reports
Content-Type: application/json
```

### Corps de la requête

```json
{
  "title": "Le graphique patrimoine ne s'affiche plus après déconnexion rapide",
  "description": "Après une déconnexion rapide suivie d'une reconnexion, le graphique reste vide.",
  "expectedResult": "Le graphique doit afficher les données historiques normalement.",
  "reproductionSteps": "1. Se connecter\n2. Se déconnecter\n3. Se reconnecter\n4. Ouvrir Patrimoine",
  "approximateDateTime": "2026-05-14T10:00:00",
  "userImpact": "HIGH",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Champ | Type | Obligatoire | Contraintes |
|-------|------|-------------|-------------|
| `title` | String | ✓ | Non vide, max 200 caractères |
| `description` | String | ✓ | Non vide, max 5000 caractères |
| `expectedResult` | String | — | Max 2000 caractères |
| `reproductionSteps` | String | — | Max 3000 caractères |
| `approximateDateTime` | LocalDateTime | — | Format ISO `YYYY-MM-DDTHH:mm:ss` |
| `userImpact` | BugSeverity | ✓ | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` |
| `sessionId` | String | — | ID session analytics (depuis `sessionStorage["analytics-session-id"]`) |

> **Note :** les champs `priority`, `status` et `createdAt` sont ignorés s'ils sont
> présents dans la requête — ils sont définis par le système.

### Réponse — 201 Created

Retourne un `BugReportSummaryDto` (même format que la liste, score = 1).

### Réponses

**201 Created** — Bug créé
**400 Bad Request** — Validation échouée (titre vide, impact null, …)
**401 Unauthorized** — Non authentifié

---

## PUT /api/bug-reports/{id}/vote

Enregistre ou remplace le vote de l'utilisateur connecté sur un bug.
Interdit sur son propre bug.

**Accès** : authentifié

```http
PUT /api/bug-reports/7/vote
Content-Type: application/json
```

### Corps de la requête

```json
{ "voteType": "UP" }
```

| Champ | Type | Obligatoire | Contraintes |
|-------|------|-------------|-------------|
| `voteType` | VoteType | ✓ | `UP` ou `DOWN` |

### Réponses

**200 OK** — Vote enregistré (retourne le nouveau score)
**400 Bad Request** — `voteType` invalide
**403 Forbidden** — Tentative de vote sur son propre bug
**404 Not Found** — Bug inexistant

---

## DELETE /api/bug-reports/{id}/vote

Retire le vote de l'utilisateur connecté. Sans effet s'il n'avait pas voté.

**Accès** : authentifié

```http
DELETE /api/bug-reports/7/vote
```

### Réponses

**204 No Content** — Vote retiré (ou déjà absent)
**403 Forbidden** — Tentative sur son propre bug
**404 Not Found** — Bug inexistant

---

## POST /api/bug-reports/{id}/comments

Ajoute un commentaire sur un bug. Accessible aux utilisateurs ET aux admins.

**Accès** : authentifié

```http
POST /api/bug-reports/7/comments
Content-Type: application/json
```

### Corps de la requête

```json
{ "content": "Je confirme, j'ai le même problème sur Safari iOS." }
```

| Champ | Type | Obligatoire | Contraintes |
|-------|------|-------------|-------------|
| `content` | String | ✓ | Non vide, max 2000 caractères |

### Réponse — 201 Created

```json
{
  "id": 5,
  "authorDisplay": "Kevin",
  "content": "Je confirme, j'ai le même problème sur Safari iOS.",
  "createdAt": "2026-05-14T14:00:00"
}
```

### Réponses

**201 Created** — Commentaire ajouté
**400 Bad Request** — Contenu vide ou trop long
**404 Not Found** — Bug inexistant

---

## GET /api/admin/bug-reports

Liste complète des bugs avec informations admin (login reporter, priorité).
Filtrable par statut et/ou priorité.

**Accès** : ADMIN

```http
GET /api/admin/bug-reports?status=OPEN&priority=HIGH&page=0&size=20
```

### Paramètres de requête

Identiques à `GET /api/bug-reports` avec en plus :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `priority` | `BugSeverity` | Filtre sur la priorité (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) |

### Réponse — 200 OK

Même format que `GET /api/bug-reports` mais avec `reporterLogin` en plus de `reporterFirstName`.

```json
{
  "content": [
    {
      "id": 7,
      "title": "Le graphique patrimoine ne s'affiche plus...",
      "status": "OPEN",
      "userImpact": "HIGH",
      "priority": null,
      "score": 4,
      "commentCount": 2,
      "createdAt": "2026-05-14T11:30:00",
      "reporterFirstName": "Alice",
      "reporterLogin": "alice.dupont",
      "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

## GET /api/admin/bug-reports/{id}

Détail complet avec les commentaires affichant `login + rôle` de chaque auteur.

**Accès** : ADMIN

```http
GET /api/admin/bug-reports/7
```

### Réponse — 200 OK

Même format que `GET /api/bug-reports/{id}` avec :

```json
{
  "comments": [
    {
      "id": 3,
      "authorDisplay": "kevin.d [ADMIN]",
      "content": "Je confirme, j'ai le même problème.",
      "createdAt": "2026-05-14T12:05:00"
    }
  ],
  "reporterLogin": "alice.dupont",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

## PATCH /api/admin/bug-reports/{id}

Modifie le statut et/ou la priorité d'un bug. Les champs non fournis (null) ne
sont pas modifiés.

**Accès** : ADMIN

```http
PATCH /api/admin/bug-reports/7
Content-Type: application/json
```

### Corps de la requête

```json
{
  "status": "IN_PROGRESS",
  "priority": "HIGH"
}
```

| Champ | Type | Obligatoire | Contraintes |
|-------|------|-------------|-------------|
| `status` | BugStatus | — | Toute valeur valide de l'enum |
| `priority` | BugSeverity | — | Toute valeur valide de l'enum |

Au moins un des deux champs doit être présent.

### Réponses

**200 OK** — Bug mis à jour (retourne `BugReportAdminDetailDto`)
**400 Bad Request** — Aucun champ fourni
**404 Not Found** — Bug inexistant

---

## DELETE /api/admin/bug-reports/{id}

Supprime définitivement un bug et toutes ses données associées (votes et
commentaires en cascade).

**Accès** : ADMIN

```http
DELETE /api/admin/bug-reports/7
```

### Réponses

**204 No Content** — Bug supprimé
**404 Not Found** — Bug inexistant

---

## Types de données

### `BugStatus`

| Valeur | Description |
|--------|-------------|
| `OPEN` | Reçu, en attente de triage |
| `IN_PROGRESS` | Pris en charge |
| `FIXED` | Corrigé |
| `CLOSED` | Résolu et archivé |
| `REJECTED` | Non retenu |
| `DUPLICATE` | Doublon d'un bug existant |

### `BugSeverity`

| Valeur | Utilisé pour |
|--------|-------------|
| `LOW` | `userImpact` (utilisateur) et `priority` (admin) |
| `MEDIUM` | idem |
| `HIGH` | idem |
| `CRITICAL` | idem |

### `VoteType`

| Valeur | Effet sur le score |
|--------|--------------------|
| `UP` | +1 |
| `DOWN` | −1 |
