# API — Tableau de bord

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Tous les endpoints nécessitent d'être **authentifié** (cookie `JSESSIONID`).
Chaque utilisateur ne peut accéder qu'à **ses propres données**.

---

## Évolution salariale — `/api/dashboard/salary-evolution`

### GET /api/dashboard/salary-evolution

Retourne la liste de tous les bulletins de paie (`MonthlyPaySlip`) de l'utilisateur connecté, tous contrats confondus, triés par période croissante.

**Accès** : authentifié (ses propres données uniquement)

```http
GET /api/dashboard/salary-evolution
```

#### Réponse 200 OK

```json
[
  {
    "period": "2022-01-01",
    "companyName": "Conserto",
    "grossSalary": 3750.0,
    "taxableNetSalary": 3082.5,
    "netSalary": 2857.5,
    "incomeTaxWithholding": 225.0
  }
]
```

| Champ | Type | Description |
|---|---|---|
| `period` | `LocalDate` | Premier jour du mois concerné |
| `companyName` | `String` | Nom de l'entreprise — nullable |
| `grossSalary` | `Float` | Salaire brut du mois |
| `taxableNetSalary` | `Float` | Net fiscal (avant impôt) |
| `netSalary` | `Float` | Net effectivement versé |
| `incomeTaxWithholding` | `Float` | Prélèvement à la source |

---

## Layout du dashboard par défaut — `/api/dashboard/layout` (rétrocompat Palier 2)

Ces endpoints opèrent sur le **dashboard marqué `isDefault`** de l'utilisateur. Conservés pour la compatibilité ascendante — préférer `/api/dashboards/{id}/layout` en Palier 3.

| Méthode | URL | Description |
|---|---|---|
| `GET` | `/api/dashboard/layout` | Retourne le layout JSON du dashboard par défaut (null si jamais sauvegardé) |
| `PUT` | `/api/dashboard/layout` | Upsert du layout JSON du dashboard par défaut |

---

## Dashboards multiples — `/api/dashboards`

Gestion de plusieurs tableaux de bord nommés par utilisateur (max 5).

### GET /api/dashboards

Liste tous les dashboards de l'utilisateur, triés par `sortOrder`. Crée automatiquement un dashboard "Principal" si aucun n'existe (migration Palier 2 → 3).

**Réponse 200 OK** — `List<UserDashboardDto>`

```json
[
  { "id": 1, "name": "Principal", "sortOrder": 0, "isDefault": true, "updatedAt": "2026-05-17T00:52:53" },
  { "id": 2, "name": "Famille",   "sortOrder": 1, "isDefault": false, "updatedAt": "2026-05-17T01:03:50" }
]
```

### GET /api/dashboards/{id}

Retourne un dashboard avec son layout JSON inclus.

**Réponse 200 OK** — `UserDashboardWithLayoutDto`

```json
{
  "id": 1,
  "name": "Principal",
  "sortOrder": 0,
  "isDefault": true,
  "layoutJson": "{\"version\":1,\"layouts\":{...},\"hiddenWidgets\":[...],\"dividers\":{...}}",
  "version": 1,
  "updatedAt": "2026-05-17T00:52:53"
}
```

**Erreurs** : `404` dashboard inexistant · `403` dashboard appartenant à un autre utilisateur.

### POST /api/dashboards

Crée un nouveau dashboard. Le layout est initialement vide (le frontend applique le template choisi via `PUT /{id}/layout`).

**Corps** : `{ "name": "Famille" }` (max 50 caractères)

**Réponse 201 Created** — `UserDashboardWithLayoutDto`

**Erreurs** : `409` limite de 5 dashboards atteinte.

### PUT /api/dashboards/{id}

Renomme, réordonne ou définit un dashboard comme défaut. Si `isDefault: true`, retire ce flag de l'ancien dashboard par défaut.

**Corps** : `{ "name": "Famille", "sortOrder": 1, "isDefault": false }`

**Réponse 200 OK** — `UserDashboardDto`

### PUT /api/dashboards/{id}/layout

Sauvegarde le layout JSON d'un dashboard (upsert). Limite 32 kB.

**Corps** : `{ "layoutJson": "{...}", "version": 1 }`

**Réponse 200 OK** — `UserDashboardWithLayoutDto`

### PUT /api/dashboards/reorder

Réordonne tous les dashboards en une requête.

**Corps** : `{ "orderedIds": [2, 1] }` (liste de tous les IDs dans le nouvel ordre)

**Réponse 200 OK** — `List<UserDashboardDto>`

**Erreurs** : `400` si la liste ne correspond pas exactement aux dashboards de l'utilisateur.

### DELETE /api/dashboards/{id}

Supprime un dashboard et son layout. Interdit si c'est le seul dashboard restant. Si c'était le dashboard par défaut, le premier restant est promu automatiquement.

**Réponse 204 No Content**

**Erreurs** : `400` tentative de suppression du seul dashboard · `403` ownership.
