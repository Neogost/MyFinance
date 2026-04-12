# API — Tableau de bord

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Tous les endpoints nécessitent d'être **authentifié** (cookie `JSESSIONID`).
Chaque utilisateur ne peut accéder qu'à **ses propres données**.

---

## Évolution salariale — `/api/dashboard/salary-evolution`

### GET /api/dashboard/salary-evolution

Retourne la liste de tous les bulletins de paie (`MonthlyPaySlip`) de l'utilisateur connecté, tous contrats confondus, triés par période croissante.

Chaque point de données correspond à un bulletin mensuel réel saisi. Les mois sans bulletin sont absents de la réponse (pas d'interpolation).

**Accès** : authentifié (ses propres données uniquement)

```http
GET /api/dashboard/salary-evolution
```

#### Réponse

**200 OK**

```json
[
  {
    "period": "2022-01-01",
    "companyName": "Conserto",
    "grossSalary": 3750.0,
    "taxableNetSalary": 3082.5,
    "netSalary": 2857.5,
    "incomeTaxWithholding": 225.0
  },
  {
    "period": "2022-02-01",
    "companyName": "Conserto",
    "grossSalary": 3750.0,
    "taxableNetSalary": 3082.5,
    "netSalary": 2857.5,
    "incomeTaxWithholding": 225.0
  },
  {
    "period": "2025-02-01",
    "companyName": "Milhertech",
    "grossSalary": 3916.67,
    "taxableNetSalary": 3220.0,
    "netSalary": 2980.0,
    "incomeTaxWithholding": 240.0
  }
]
```

#### Champs de la réponse

| Champ | Type | Description |
|---|---|---|
| `period` | `LocalDate` | Premier jour du mois concerné (ex : `2024-03-01` pour mars 2024) |
| `companyName` | `String` | Nom de l'entreprise du contrat associé — nullable |
| `grossSalary` | `Float` | Salaire brut du mois |
| `taxableNetSalary` | `Float` | Revenu net fiscal (après cotisations sociales, avant impôt) |
| `netSalary` | `Float` | Montant net effectivement versé |
| `incomeTaxWithholding` | `Float` | Prélèvement à la source du mois |

#### Cas particuliers

| Situation | Comportement |
|---|---|
| Aucun bulletin saisi | Retourne `[]` (liste vide) |
| Plusieurs contrats | Tous les bulletins sont agrégés et triés par `period` |
| Mois sans bulletin | Absent de la réponse |

#### Erreurs

| Code | Situation |
|---|---|
| `401 Unauthorized` | Utilisateur non authentifié |
