# API — Passifs (Grandes possessions)

Préfixe : `/api/possessions`
Authentification : session cookie `JSESSIONID` obligatoire.
Toutes les opérations sont restreintes aux possessions de l'utilisateur connecté.

---

## GET /api/possessions

Liste toutes les possessions de l'utilisateur connecté, triées par catégorie puis par libellé.

**Réponse 200**

```json
[
  {
    "id": 1,
    "category": "VEHICULE",
    "label": "Renault Clio 5 - 2022",
    "purchasePrice": 18500.00,
    "purchaseDate": "2022-03-15",
    "estimatedCurrentValue": null,
    "computedCurrentValue": 13361.25,
    "effectiveCurrentValue": 13361.25,
    "isManualOverride": false,
    "cumulatedDepreciation": 5138.75,
    "depreciationRate": 27.78,
    "yearsOwned": 4.09,
    "notes": null,
    "createdAt": "2026-04-17T10:00:00"
  }
]
```

---

## GET /api/possessions/{id}

Détail d'une possession.

**Réponses**
- `200` — possession trouvée (même structure que la liste)
- `403` — n'appartient pas à l'utilisateur connecté
- `404` — introuvable

---

## GET /api/possessions/summary

Synthèse globale des possessions : totaux et répartition par catégorie.

**Réponse 200**

```json
{
  "totalPurchasePrice": 32500.00,
  "totalEffectiveValue": 19800.00,
  "totalDepreciation": 12700.00,
  "globalDepreciationRate": 39.08,
  "byCategory": [
    {
      "category": "INFORMATIQUE",
      "count": 2,
      "totalPurchasePrice": 4000.00,
      "totalEffectiveValue": 1450.00,
      "totalDepreciation": 2550.00
    },
    {
      "category": "VEHICULE",
      "count": 1,
      "totalPurchasePrice": 18500.00,
      "totalEffectiveValue": 12350.00,
      "totalDepreciation": 6150.00
    }
  ]
}
```

---

## POST /api/possessions

Créer une nouvelle possession.

**Corps**

```json
{
  "category": "VEHICULE",
  "label": "Renault Clio 5 - 2022",
  "purchasePrice": 18500.00,
  "purchaseDate": "2022-03-15",
  "estimatedCurrentValue": null,
  "notes": "Achetée neuve"
}
```

| Champ | Requis | Contraintes |
|-------|--------|-------------|
| `category` | Oui | Valeur de `PossessionCategoryEnum` |
| `label` | Oui | Non vide |
| `purchasePrice` | Oui | > 0 |
| `purchaseDate` | Oui | ≤ aujourd'hui |
| `estimatedCurrentValue` | Non | > 0 si renseigné — `null` = calcul automatique |
| `notes` | Non | — |

**Réponses**
- `201` — possession créée
- `400` — validation échouée

---

## PUT /api/possessions/{id}

Modifier une possession existante. Même corps que la création.

**Réponses**
- `200` — possession modifiée
- `400` — validation échouée
- `403` — n'appartient pas à l'utilisateur connecté
- `404` — introuvable

---

## DELETE /api/possessions/{id}

Supprimer une possession.

**Réponses**
- `204` — supprimée
- `403` — n'appartient pas à l'utilisateur connecté
- `404` — introuvable

---

## Catégories disponibles (`PossessionCategoryEnum`)

| Valeur | Libellé | Taux décote/an | Résiduel min. |
|--------|---------|----------------|---------------|
| `VEHICULE` | Véhicule | 15 % | 10 % |
| `INFORMATIQUE` | Informatique & High-tech | 30 % | 5 % |
| `ELECTROMENAGER` | Électroménager & Maison | 12 % | 8 % |
| `MOBILIER` | Mobilier & Décoration | 8 % | 10 % |
| `COLLECTION` | Collection | 0 % | 100 % |
| `LOISIRS` | Loisirs & Sport | 15 % | 10 % |
| `AUTRE` | Autre | 10 % | 10 % |

---

## Champs calculés dans `PossessionDto`

| Champ | Description |
|-------|-------------|
| `computedCurrentValue` | Valeur projetée par le modèle de décote exponentielle |
| `effectiveCurrentValue` | Valeur utilisée dans les totaux : override manuel si renseigné, sinon calculée |
| `isManualOverride` | `true` si `estimatedCurrentValue` est renseigné |
| `cumulatedDepreciation` | `purchasePrice − effectiveCurrentValue` |
| `depreciationRate` | Décote en % depuis l'achat |
| `yearsOwned` | Ancienneté en années décimales |
