# API — Demandes d'inscription

## Endpoints

### `POST /api/auth/register` — Soumettre une demande (public)

**Body (JSON) :**
```json
{
  "login":     "jean.dupont",
  "firstName": "Jean",
  "lastName":  "Dupont",
  "password":  "MonMdp1"
}
```

Règles de validation :
- `login` : non vide, max 100 caractères
- `firstName` / `lastName` : non vides, max 100 caractères
- `password` : 8–128 caractères, ≥ 1 majuscule, ≥ 1 minuscule, ≥ 1 chiffre

**Réponses :**

| Code | Description |
|------|-------------|
| `202 Accepted` | Demande prise en compte — corps : `{ "message": "..." }` |
| `400 Bad Request` | Validation du corps échouée |

**Réponse 202 (corps) :**
```json
{
  "message": "Si le login est disponible, votre demande sera transmise à un administrateur."
}
```

> ⚠ **Anti-énumération de comptes** : la réponse est volontairement identique que le login soit libre, déjà pris par un compte actif, ou déjà soumis en PENDING. Le hash BCrypt du mot de passe est calculé même en cas de no-op pour neutraliser l'attaque par timing. Les conflits sont consignés dans les logs serveur uniquement (`log.warn` côté `UserRegistrationService`) — l'admin peut ainsi investiguer un comportement suspect sans exposer l'information au client.

---

### `GET /api/admin/registrations` — Lister les demandes (ADMIN)

**Paramètre optionnel :** `?status=PENDING|APPROVED|REJECTED`

Sans paramètre, retourne toutes les demandes toutes statuts confondus.

**Réponse 200 :**
```json
[
  {
    "id":         1,
    "login":      "jean.dupont",
    "firstName":  "Jean",
    "lastName":   "Dupont",
    "status":     "PENDING",
    "createdAt":  "2026-04-24T10:00:00",
    "reviewedAt": null,
    "reviewedBy": null
  }
]
```

| Code | Description |
|------|-------------|
| `200 OK` | Liste des demandes (tableau vide si aucune) |
| `401` | Non authentifié |
| `403` | Rôle insuffisant |

---

### `POST /api/admin/registrations/{id}/approve` — Approuver (ADMIN)

Crée le compte utilisateur et marque la demande `APPROVED`.

**Réponse 200 :** `RegistrationRequestDto` avec `status: "APPROVED"`, `reviewedAt` et `reviewedBy` renseignés.

| Code | Description |
|------|-------------|
| `200 OK` | Compte créé, demande approuvée |
| `404 Not Found` | Demande introuvable |
| `409 Conflict` | Demande déjà traitée (non PENDING) |

---

### `POST /api/admin/registrations/{id}/reject` — Rejeter (ADMIN)

Marque la demande `REJECTED` sans créer de compte.

**Réponse 200 :** `RegistrationRequestDto` avec `status: "REJECTED"`, `reviewedAt` et `reviewedBy` renseignés.

| Code | Description |
|------|-------------|
| `200 OK` | Demande rejetée |
| `404 Not Found` | Demande introuvable |
| `409 Conflict` | Demande déjà traitée (non PENDING) |

---

## DTO de référence : `RegistrationRequestDto`

```json
{
  "id":         1,
  "login":      "jean.dupont",
  "firstName":  "Jean",
  "lastName":   "Dupont",
  "status":     "PENDING",
  "createdAt":  "2026-04-24T10:00:00",
  "reviewedAt": null,
  "reviewedBy": null
}
```

> Le `hashedPassword` n'est **jamais** exposé dans les réponses API.
