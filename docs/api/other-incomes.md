# API — Revenus complémentaires

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Tous les endpoints nécessitent d'être **authentifié** (cookie `JSESSIONID`).
Chaque utilisateur ne peut accéder qu'à **ses propres revenus**. Un **ADMIN** peut accéder aux données de tous les utilisateurs.

---

## GET /api/other-incomes

Retourne la liste des revenus complémentaires de l'utilisateur connecté, triés du plus récent au plus ancien.

**Accès** : authentifié (ses propres revenus)

```http
GET /api/other-incomes
```

### Réponses

**200 OK**

```json
[
  {
    "id": 1,
    "type": "LOCATIF",
    "label": "Loyer appartement Lyon",
    "amount": 750.0,
    "date": "2025-03-01",
    "isTaxable": true,
    "specificTaxRate": null
  },
  {
    "id": 2,
    "type": "DIVIDENDE",
    "label": "Dividendes SCPI",
    "amount": 210.50,
    "date": "2025-01-15",
    "isTaxable": true,
    "specificTaxRate": 30.0
  }
]
```

---

## POST /api/other-incomes

Ajoute un revenu complémentaire.

**Accès** : authentifié

```http
POST /api/other-incomes
Content-Type: application/json

{
  "type": "LOCATIF",
  "label": "Loyer appartement Lyon",
  "amount": 750.0,
  "date": "2025-03-01",
  "isTaxable": true,
  "specificTaxRate": null
}
```

### Champs

| Champ | Type | Obligatoire | Contraintes | Description |
|-------|------|-------------|-------------|-------------|
| `type` | `string` | oui | voir types | Catégorie du revenu |
| `label` | `string` | oui | non vide | Description libre |
| `amount` | `number` | oui | > 0 | Montant perçu (€) |
| `date` | `date` | oui | | Date de perception (ISO 8601) |
| `isTaxable` | `boolean` | oui | | Ce revenu est-il imposable ? Pré-rempli selon le type (voir tableau ci-dessous) |
| `specificTaxRate` | `number` | non | 0–100 | Taux d'imposition fixe en % (ex : `30.0` pour la flat tax). `null` = inclus dans le barème IRPP normal |

### Types disponibles (`OtherIncomeTypeEnum`)

| Valeur | Description | `isTaxable` suggéré | `specificTaxRate` suggéré |
|--------|-------------|---------------------|---------------------------|
| `LOCATIF` | Revenu locatif (loyers, charges récupérées…) | `true` | `null` (barème IRPP) |
| `DIVIDENDE` | Dividendes hors portefeuille suivi | `true` | `30.0` (flat tax PFU fréquente) |
| `AIDE_SOCIALE` | Allocations, aides (CAF, Pôle Emploi…) | `false` | — |
| `AUTRE` | Autre revenu non salarial (libellé libre) | `true` | `null` |

> Les valeurs suggérées sont pré-remplies à la saisie mais restent modifiables par l'utilisateur.

### Réponses

**201 Created**

```json
{
  "id": 3,
  "type": "LOCATIF",
  "label": "Loyer appartement Lyon",
  "amount": 750.0,
  "date": "2025-03-01",
  "isTaxable": true,
  "specificTaxRate": null
}
```

---

## PUT /api/other-incomes/{id}

Modifie un revenu complémentaire existant (remplacement complet).

**Accès** : propriétaire ou ADMIN

```http
PUT /api/other-incomes/3
Content-Type: application/json

{
  "type": "LOCATIF",
  "label": "Loyer appartement Lyon (révisé)",
  "amount": 780.0,
  "date": "2025-04-01",
  "isTaxable": true,
  "specificTaxRate": null
}
```

Champs identiques à POST — voir tableau ci-dessus.

### Réponses

**200 OK** — Retourne le revenu mis à jour.

**403 Forbidden** — Le revenu appartient à un autre utilisateur.

**404 Not Found**

```json
{ "message": "Revenu introuvable : 3" }
```

---

## DELETE /api/other-incomes/{id}

Supprime un revenu complémentaire.

**Accès** : propriétaire ou ADMIN

```http
DELETE /api/other-incomes/3
```

### Réponses

**204 No Content** — Suppression réussie.

**403 Forbidden** — Accès non autorisé.

**404 Not Found** — Revenu introuvable.

---

## Modèle `OtherIncomeDto`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `number` | Identifiant |
| `type` | `string` | Catégorie (`LOCATIF`, `DIVIDENDE`, `AIDE_SOCIALE`, `AUTRE`) |
| `label` | `string` | Description libre |
| `amount` | `number` | Montant perçu (€) |
| `date` | `date` | Date de perception |
| `isTaxable` | `boolean` | Ce revenu est-il soumis à l'impôt |
| `specificTaxRate` | `number` | Taux fixe en % si hors barème IRPP (nullable) |
