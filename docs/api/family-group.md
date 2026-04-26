# API — Regroupement Familial

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Tous les endpoints nécessitent d'être **authentifié** (cookie `JSESSIONID`).  
Les endpoints `/api/admin/family-groups/**` sont réservés au rôle **ADMIN**.

---

## GET /api/family-groups/my

Retourne le groupe de l'utilisateur connecté avec la liste de ses membres. Retourne `null` si l'utilisateur n'appartient à aucun groupe.

**Accès** : authentifié

```http
GET /api/family-groups/my
```

### Réponse — 200 OK

```json
{
  "id": 1,
  "name": "Famille Desmay",
  "owner": {
    "id": 1,
    "firstName": "Kévin",
    "lastName": "Desmay",
    "login": "kevin"
  },
  "members": [
    {
      "id": 1,
      "firstName": "Kévin",
      "lastName": "Desmay",
      "login": "kevin"
    },
    {
      "id": 2,
      "firstName": "Sarah",
      "lastName": "Martin",
      "login": "sarah"
    }
  ],
  "createdAt": "2026-05-01T10:00:00"
}
```

Retourne `null` (corps vide `204 No Content`) si l'utilisateur n'a pas de groupe.

---

## GET /api/family-groups/my/members

Retourne les membres du groupe hors l'utilisateur connecté. Utilisé par le simulateur d'emprunt pour la recherche de co-emprunteur.

**Accès** : authentifié, membre d'un groupe

```http
GET /api/family-groups/my/members
```

### Réponses

**200 OK** — liste des membres (peut être vide si le groupe n'a qu'un membre)

```json
[
  {
    "id": 2,
    "firstName": "Sarah",
    "lastName": "Martin",
    "login": "sarah"
  }
]
```

**400 Bad Request** — l'utilisateur n'appartient à aucun groupe

---

## POST /api/family-groups

Crée un nouveau groupe. L'utilisateur connecté devient automatiquement `owner` et premier membre.

**Accès** : authentifié, ne doit pas déjà être membre d'un groupe

```http
POST /api/family-groups
Content-Type: application/json
```

### Corps de la requête

```json
{
  "name": "Famille Desmay"
}
```

| Champ | Type | Obligatoire | Contraintes |
|-------|------|-------------|-------------|
| `name` | `String` | ✓ | Non vide, max 100 caractères |

### Réponse — 201 Created

```json
{
  "id": 1,
  "name": "Famille Desmay",
  "owner": {
    "id": 1,
    "firstName": "Kévin",
    "lastName": "Desmay",
    "login": "kevin"
  },
  "members": [
    {
      "id": 1,
      "firstName": "Kévin",
      "lastName": "Desmay",
      "login": "kevin"
    }
  ],
  "createdAt": "2026-05-01T10:00:00"
}
```

### Réponses

**201 Created** — groupe créé  
**400 Bad Request** — l'utilisateur est déjà membre d'un groupe  
**422 Unprocessable Entity** — nom vide ou trop long

---

## PUT /api/family-groups/my

Renomme le groupe de l'utilisateur connecté.

**Accès** : authentifié, owner du groupe

```http
PUT /api/family-groups/my
Content-Type: application/json
```

### Corps de la requête

```json
{
  "name": "Foyer Desmay-Martin"
}
```

| Champ | Type | Obligatoire | Contraintes |
|-------|------|-------------|-------------|
| `name` | `String` | ✓ | Non vide, max 100 caractères |

### Réponses

**200 OK** — groupe renommé (retourne le `FamilyGroupDto` mis à jour)  
**400 Bad Request** — l'utilisateur n'a pas de groupe  
**403 Forbidden** — l'utilisateur n'est pas owner

---

## DELETE /api/family-groups/my

Dissout le groupe. Met `family_group_id = null` sur tous les membres et supprime les invitations `PENDING` associées.

**Accès** : authentifié, owner du groupe

```http
DELETE /api/family-groups/my
```

### Réponses

**204 No Content** — groupe dissous  
**400 Bad Request** — l'utilisateur n'a pas de groupe  
**403 Forbidden** — l'utilisateur n'est pas owner

---

## DELETE /api/family-groups/my/leave

Quitter le groupe dont on est membre (non-owner uniquement).

**Accès** : authentifié, membre d'un groupe, non owner

```http
DELETE /api/family-groups/my/leave
```

### Réponses

**204 No Content** — membre retiré du groupe  
**400 Bad Request** — l'utilisateur n'a pas de groupe  
**403 Forbidden** — l'utilisateur est owner (doit d'abord dissoudre le groupe)

---

## DELETE /api/family-groups/my/members/{userId}

Retire un membre du groupe (owner uniquement).

**Accès** : authentifié, owner du groupe

```http
DELETE /api/family-groups/my/members/{userId}
```

### Réponses

**204 No Content** — membre retiré  
**400 Bad Request** — l'utilisateur cible n'est pas membre du groupe  
**403 Forbidden** — l'utilisateur connecté n'est pas owner  
**404 Not Found** — userId introuvable

---

## POST /api/family-groups/my/invitations

Envoie une invitation à un utilisateur pour rejoindre le groupe.

**Accès** : authentifié, owner du groupe

```http
POST /api/family-groups/my/invitations
Content-Type: application/json
```

### Corps de la requête

```json
{
  "login": "sarah"
}
```

| Champ | Type | Obligatoire | Contraintes |
|-------|------|-------------|-------------|
| `login` | `String` | ✓ | Login d'un utilisateur existant |

### Réponse — 201 Created

```json
{
  "id": 5,
  "groupId": 1,
  "groupName": "Famille Desmay",
  "invitedUser": {
    "id": 2,
    "firstName": "Sarah",
    "lastName": "Martin",
    "login": "sarah"
  },
  "status": "PENDING",
  "createdAt": "2026-05-01T10:30:00",
  "respondedAt": null
}
```

### Réponses

**201 Created** — invitation envoyée  
**400 Bad Request** — invitation `PENDING` déjà existante pour cet utilisateur  
**403 Forbidden** — l'utilisateur connecté n'est pas owner  
**404 Not Found** — login introuvable

---

## GET /api/family-groups/invitations/pending

Liste les invitations `PENDING` reçues par l'utilisateur connecté.

**Accès** : authentifié

```http
GET /api/family-groups/invitations/pending
```

### Réponse — 200 OK

```json
[
  {
    "id": 5,
    "groupId": 1,
    "groupName": "Famille Desmay",
    "ownerFirstName": "Kévin",
    "ownerLastName": "Desmay",
    "status": "PENDING",
    "createdAt": "2026-05-01T10:30:00"
  }
]
```

---

## POST /api/family-groups/invitations/{id}/accept

Accepte une invitation. L'utilisateur rejoint le groupe (`family_group_id` mis à jour).

**Accès** : authentifié, destinataire de l'invitation

```http
POST /api/family-groups/invitations/{id}/accept
```

### Réponses

**200 OK** — invitation acceptée, retourne le `FamilyGroupDto` du groupe rejoint  
**400 Bad Request** — l'invitation n'est plus `PENDING`, ou l'utilisateur est déjà dans un autre groupe  
**403 Forbidden** — l'utilisateur n'est pas le destinataire de l'invitation  
**404 Not Found** — invitation introuvable

---

## POST /api/family-groups/invitations/{id}/refuse

Refuse une invitation. L'invitation passe en statut `REFUSED`, aucun changement sur le `familyGroup` de l'utilisateur.

**Accès** : authentifié, destinataire de l'invitation

```http
POST /api/family-groups/invitations/{id}/refuse
```

### Réponses

**204 No Content** — invitation refusée  
**400 Bad Request** — l'invitation n'est plus `PENDING`  
**403 Forbidden** — l'utilisateur n'est pas le destinataire de l'invitation  
**404 Not Found** — invitation introuvable

---

## GET /api/admin/family-groups

Liste tous les groupes de l'application avec leurs membres.

**Accès** : ADMIN

```http
GET /api/admin/family-groups
```

### Réponse — 200 OK

```json
[
  {
    "id": 1,
    "name": "Famille Desmay",
    "owner": {
      "id": 1,
      "firstName": "Kévin",
      "lastName": "Desmay",
      "login": "kevin"
    },
    "members": [
      {
        "id": 1,
        "firstName": "Kévin",
        "lastName": "Desmay",
        "login": "kevin"
      },
      {
        "id": 2,
        "firstName": "Sarah",
        "lastName": "Martin",
        "login": "sarah"
      }
    ],
    "pendingInvitationsCount": 0,
    "createdAt": "2026-05-01T10:00:00"
  }
]
```

---

## GET /api/admin/family-groups/{id}

Détail complet d'un groupe : membres + invitations en cours.

**Accès** : ADMIN

```http
GET /api/admin/family-groups/{id}
```

### Réponse — 200 OK

```json
{
  "id": 1,
  "name": "Famille Desmay",
  "owner": { "id": 1, "firstName": "Kévin", "lastName": "Desmay", "login": "kevin" },
  "members": [
    { "id": 1, "firstName": "Kévin", "lastName": "Desmay", "login": "kevin" },
    { "id": 2, "firstName": "Sarah", "lastName": "Martin", "login": "sarah" }
  ],
  "invitations": [
    {
      "id": 6,
      "invitedUser": { "id": 3, "firstName": "Marc", "lastName": "Dupont", "login": "marc" },
      "status": "PENDING",
      "createdAt": "2026-05-02T09:00:00",
      "respondedAt": null
    }
  ],
  "createdAt": "2026-05-01T10:00:00"
}
```

### Réponses

**200 OK** — détail du groupe  
**404 Not Found** — groupe introuvable

---

## DELETE /api/admin/family-groups/{id}

Supprime un groupe (modération admin). Met `family_group_id = null` sur tous les membres et supprime les invitations `PENDING` associées.

**Accès** : ADMIN

```http
DELETE /api/admin/family-groups/{id}
```

### Réponses

**204 No Content** — groupe supprimé  
**404 Not Found** — groupe introuvable

---

## DELETE /api/admin/family-groups/{id}/members/{userId}

Retire un membre d'un groupe (modération admin).

**Accès** : ADMIN

```http
DELETE /api/admin/family-groups/{id}/members/{userId}
```

### Réponses

**204 No Content** — membre retiré  
**400 Bad Request** — l'utilisateur cible n'est pas membre de ce groupe  
**404 Not Found** — groupe ou utilisateur introuvable

---

## GET /api/family-groups/my/members/{memberId}/positions

Retourne les positions d'un membre du groupe (toutes catégories, tous statuts). Utilisé par le frontend pour l'agrégation Mode Foyer dans les vues Tableau de bord et Patrimoine.

**Accès** : authentifié, membre du même groupe que `memberId`

```http
GET /api/family-groups/my/members/{memberId}/positions
```

### Paramètres de chemin

| Paramètre  | Type   | Description                      |
|------------|--------|----------------------------------|
| `memberId` | `Long` | Identifiant du membre cible      |

### Réponse — 200 OK

Tableau de `PositionDto` — même structure que `GET /api/positions`. Voir [`docs/api/patrimoine-positions.md`](patrimoine-positions.md) pour le détail des champs.

```json
[
  {
    "id": 12,
    "label": "ETF World",
    "category": "BOURSE",
    "status": "ACTIVE",
    "computed": {
      "currentValueEur": 5000.0,
      "capitalGainEur": 800.0
    }
  }
]
```

### Réponses

**200 OK** — liste des positions du membre  
**400 Bad Request** — l'utilisateur connecté n'appartient à aucun groupe  
**403 Forbidden** — `memberId` n'est pas dans le même groupe que l'appelant  
**404 Not Found** — utilisateur introuvable
