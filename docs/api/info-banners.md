# API — Bannières d'information

Base URL : `http://localhost:8080`

Swagger UI interactif : `http://localhost:8080/swagger-ui.html`

Tous les endpoints nécessitent d'être **authentifié** (cookie `JSESSIONID`).
Les endpoints `/api/admin/info-banners/**` requièrent en plus le rôle **ADMIN**.

> Architecture complète et règles métier : [`docs/architecture/info-banners.md`](../architecture/info-banners.md)

---

## GET /api/info-banners/active

Retourne les bannières actuellement actives pour l'utilisateur courant,
triées par priorité décroissante (`ALERT > WARNING > MAINTENANCE > INFO > SUCCESS`,
puis `createdAt` desc à priorité égale).

Le filtrage par audience est appliqué côté serveur :
- USER → bannières `ALL` + `USERS_ONLY`
- ADMIN → bannières `ALL` + `ADMIN_ONLY`

**Accès** : authentifié

```http
GET /api/info-banners/active
```

### Réponse — 200 OK

```json
[
  {
    "id": 12,
    "title": "Maintenance planifiée",
    "message": "Le service sera indisponible **dimanche 17 mai de 22h à 23h** pour mise à jour. [En savoir plus](https://example.com/maintenance)",
    "type": "MAINTENANCE"
  },
  {
    "id": 8,
    "title": null,
    "message": "Nouvelle fonctionnalité : le simulateur de retraite est disponible dans le menu Outils.",
    "type": "SUCCESS"
  }
]
```

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Long | Identifiant de la bannière (utilisé pour la fermeture sessionStorage) |
| `title` | String (nullable) | Titre court à afficher en gras |
| `message` | String | Corps du message en Markdown (à rendre via une lib sûre, sans HTML brut) |
| `type` | InfoBannerType | Détermine couleur et icône — voir énum plus bas |

### Réponses

**200 OK** — Liste retournée (peut être vide)
**401 Unauthorized** — Non authentifié

---

## GET /api/admin/info-banners

Liste toutes les bannières (actives, programmées, expirées) avec leur statut
calculé. Triées par `startAt` décroissant.

**Accès** : ADMIN

```http
GET /api/admin/info-banners
```

### Réponse — 200 OK

```json
[
  {
    "id": 12,
    "title": "Maintenance planifiée",
    "message": "Le service sera indisponible **dimanche 17 mai de 22h à 23h** pour mise à jour.",
    "type": "MAINTENANCE",
    "audience": "ALL",
    "startAt": "2026-05-17T20:00:00",
    "endAt": "2026-05-17T23:00:00",
    "status": "SCHEDULED",
    "createdAt": "2026-05-14T09:30:12",
    "updatedAt": "2026-05-14T09:30:12",
    "createdByLogin": "kevin"
  },
  {
    "id": 8,
    "title": null,
    "message": "Nouvelle fonctionnalité : le simulateur de retraite est disponible.",
    "type": "SUCCESS",
    "audience": "ALL",
    "startAt": "2026-05-10T00:00:00",
    "endAt": null,
    "status": "ACTIVE",
    "createdAt": "2026-05-10T08:15:00",
    "updatedAt": "2026-05-10T08:15:00",
    "createdByLogin": "kevin"
  }
]
```

| Champ | Type | Description |
|-------|------|-------------|
| `status` | InfoBannerStatus | `SCHEDULED` / `ACTIVE` / `EXPIRED` — calculé à la volée |
| `createdByLogin` | String (nullable) | Login de l'admin créateur (null si compte supprimé) |

### Réponses

**200 OK** — Liste retournée
**401 Unauthorized** — Non authentifié
**403 Forbidden** — Rôle insuffisant

---

## GET /api/admin/info-banners/{id}

Détail d'une bannière (mêmes champs que la liste admin).

**Accès** : ADMIN

```http
GET /api/admin/info-banners/12
```

### Réponses

**200 OK** — Bannière trouvée (voir format ci-dessus)
**404 Not Found** — Bannière inexistante

---

## POST /api/admin/info-banners

Crée une nouvelle bannière. L'auteur (`createdBy`) est l'admin authentifié.

**Accès** : ADMIN

```http
POST /api/admin/info-banners
Content-Type: application/json
```

### Corps de la requête

```json
{
  "title": "Maintenance planifiée",
  "message": "Le service sera indisponible **dimanche 17 mai de 22h à 23h** pour mise à jour.",
  "type": "MAINTENANCE",
  "audience": "ALL",
  "startAt": "2026-05-17T20:00:00",
  "endAt": "2026-05-17T23:00:00"
}
```

| Champ | Type | Obligatoire | Contraintes |
|-------|------|-------------|-------------|
| `title` | String | — | Max 120 caractères |
| `message` | String | ✓ | Non vide, max 2000 caractères, Markdown |
| `type` | InfoBannerType | ✓ | `ALERT` / `WARNING` / `MAINTENANCE` / `INFO` / `SUCCESS` |
| `audience` | InfoBannerAudience | ✓ | `ALL` / `USERS_ONLY` / `ADMIN_ONLY` |
| `startAt` | LocalDateTime | ✓ | Format ISO `YYYY-MM-DDTHH:mm:ss` |
| `endAt` | LocalDateTime | — | Si renseigné : strictement postérieur à `startAt` |

### Réponse — 201 Created

```json
{
  "id": 13,
  "title": "Maintenance planifiée",
  "message": "Le service sera indisponible **dimanche 17 mai de 22h à 23h** pour mise à jour.",
  "type": "MAINTENANCE",
  "audience": "ALL",
  "startAt": "2026-05-17T20:00:00",
  "endAt": "2026-05-17T23:00:00",
  "status": "SCHEDULED",
  "createdAt": "2026-05-14T10:42:33",
  "updatedAt": "2026-05-14T10:42:33",
  "createdByLogin": "kevin"
}
```

### Réponses

**201 Created** — Bannière créée
**400 Bad Request** — Validation échouée (message vide, `endAt` ≤ `startAt`, …)
**401 Unauthorized** — Non authentifié
**403 Forbidden** — Rôle insuffisant

---

## PUT /api/admin/info-banners/{id}

Met à jour une bannière existante. Tous les champs sont **remplacés**
(pas de patch partiel).

**Accès** : ADMIN

```http
PUT /api/admin/info-banners/13
Content-Type: application/json
```

### Corps de la requête

Identique au POST.

### Réponses

**200 OK** — Bannière mise à jour (même format que GET détail)
**400 Bad Request** — Validation échouée
**404 Not Found** — Bannière inexistante

---

## DELETE /api/admin/info-banners/{id}

Supprime définitivement une bannière. Aucune notion de soft-delete.

**Accès** : ADMIN

```http
DELETE /api/admin/info-banners/13
```

### Réponses

**204 No Content** — Bannière supprimée
**404 Not Found** — Bannière inexistante

---

## Types de données

### `InfoBannerType`

| Valeur | Couleur | Usage |
|--------|---------|-------|
| `ALERT` | rouge | Incident, sécurité, action critique |
| `WARNING` | orange | Attention requise, dégradation possible |
| `MAINTENANCE` | gris | Fenêtre de maintenance planifiée |
| `INFO` | bleu | Information générale |
| `SUCCESS` | vert | Annonce positive, nouvelle fonctionnalité |

### `InfoBannerAudience`

| Valeur | Cible |
|--------|-------|
| `ALL` | Tous les utilisateurs authentifiés |
| `USERS_ONLY` | Comptes USER uniquement |
| `ADMIN_ONLY` | Comptes ADMIN uniquement |

### `InfoBannerStatus` (calculé, lecture seule)

| Valeur | Critère |
|--------|---------|
| `SCHEDULED` | `maintenant < startAt` |
| `ACTIVE` | `startAt ≤ maintenant ET (endAt EST NULL OU maintenant ≤ endAt)` |
| `EXPIRED` | `endAt EST NON NULL ET maintenant > endAt` |

---

## Notes d'implémentation

- **Fermeture par l'utilisateur** : aucune persistance backend. Le frontend
  stocke les `id` fermés dans `sessionStorage["dismissedBannerIds"]` (JSON
  array) et les filtre côté client. Les bannières fermées réapparaissent à
  la prochaine connexion si elles sont toujours actives.
- **Markdown** : le serveur stocke le message brut. Le rendu se fait
  exclusivement côté frontend via `react-markdown` (pas de HTML brut autorisé,
  pas d'images, pas de scripts).
- **Fuseau horaire** : les dates sont en `LocalDateTime` (heure locale serveur).
  Pas de gestion multi-fuseau — usage personnel mono-locale.
