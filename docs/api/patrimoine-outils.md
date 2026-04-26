# API — Outils patrimoniaux

Documentation des endpoints REST pour le scoring patrimonial, les objectifs, le référentiel INSEE et les droits d'accès.

L'architecture est dans [`docs/architecture/patrimoine-scoring.md`](../architecture/patrimoine-scoring.md), [`docs/architecture/patrimoine-strategy.md`](../architecture/patrimoine-strategy.md) et [`docs/architecture/patrimoine.md`](../architecture/patrimoine.md).

---

## Référentiel INSEE

### GET `/api/patrimoine/referentiel`

Retourne le référentiel INSEE Enquête Patrimoine 2021-2022 : seuils de patrimoine brut par tranche d'âge et par décile D1–D9.

**Accès** : authentifié

**Réponse 200**

```json
{
  "source": "INSEE Enquête Patrimoine 2021-2022",
  "tranches": [
    {
      "label": "18-29 ans",
      "ageMin": 18,
      "ageMax": 29,
      "d1": 0,
      "d2": 200,
      "d3": 2000,
      "d4": 6000,
      "d5": 13000,
      "d6": 27000,
      "d7": 53000,
      "d8": 100000,
      "d9": 193000
    },
    {
      "label": "30-39 ans",
      "ageMin": 30,
      "ageMax": 39,
      "d1": 400,
      "d2": 3500,
      "d3": 11000,
      "d4": 27000,
      "d5": 56000,
      "d6": 107000,
      "d7": 192000,
      "d8": 314000,
      "d9": 517000
    }
  ]
}
```

**Utilisation frontend :** `PatrimoinePage` calcule l'âge de l'utilisateur depuis `birthDate` (fourni par `GET /api/auth/me`), trouve la tranche correspondante et détermine le décile. Affichage : `D{rang}/10 · {label tranche}` sous la valeur du patrimoine brut.

---

## Stratégie & Objectifs patrimoniaux

### GET `/api/patrimoine/targets`

Retourne les objectifs cibles par catégorie d'actif (`Map<String, Double>`).

**Accès** : authentifié

**Réponse 200**

```json
{
  "BOURSE": 150000.0,
  "LIVRET": 20000.0,
  "IMMO_PHYSIQUE": 400000.0
}
```

> Seules les catégories avec un objectif défini apparaissent. `{}` = aucun objectif configuré.

---

### PUT `/api/patrimoine/targets`

Enregistre les objectifs patrimoniaux (remplacement complet).

**Accès** : authentifié

**Corps de la requête**

```json
{
  "BOURSE":       150000.0,
  "CRYPTO":        10000.0,
  "LIVRET":        20000.0,
  "IMMO_PHYSIQUE": 400000.0,
  "IMMO_PAPIER":   30000.0,
  "LIQUIDITE":      5000.0
}
```

> Clés valides : `BOURSE`, `CRYPTO`, `IMMO_PAPIER`, `IMMO_PHYSIQUE`, `LIVRET`, `LIQUIDITE`. Les clés non reconnues sont ignorées.

**Réponse 200** — Map mise à jour.

---

## Scoring patrimonial

### GET `/api/patrimoine/score`

Calcule et retourne le score patrimonial de l'utilisateur connecté (calculé à la volée, non persisté) en 6 axes.

**Accès** : authentifié

**Réponse 200**

```json
{
  "totalScore": 72,
  "maxScore": 105,
  "profile": "EQUILIBRE",
  "weakestAxisId": "epargne",
  "weakestAxisAdvice": "Votre taux d'épargne est insuffisant. Visez 15 % minimum.",
  "axes": [
    {
      "id": "diversification",
      "label": "Diversification",
      "score": 16,
      "maxScore": 20,
      "detail": "4 catégories d'actifs présentes",
      "missingData": false
    },
    {
      "id": "matelas",
      "label": "Matelas de sécurité",
      "score": 12,
      "maxScore": 15,
      "detail": "3 mois de dépenses couverts",
      "missingData": false
    },
    {
      "id": "endettement",
      "label": "Endettement",
      "score": 18,
      "maxScore": 20,
      "detail": "Ratio dette/patrimoine : 28 %",
      "missingData": false
    },
    {
      "id": "epargne",
      "label": "Épargne",
      "score": 8,
      "maxScore": 20,
      "detail": "Taux d'épargne : 8 %",
      "missingData": false
    },
    {
      "id": "age_risque",
      "label": "Âge & Risque",
      "score": 12,
      "maxScore": 15,
      "detail": "Profil cohérent avec l'horizon d'investissement",
      "missingData": false
    },
    {
      "id": "progression",
      "label": "Progression",
      "score": 6,
      "maxScore": 10,
      "detail": "Patrimoine en hausse sur 3 snapshots",
      "missingData": false
    }
  ]
}
```

| Champ | Description |
|-------|-------------|
| `totalScore` | Score global (0–105) |
| `maxScore` | Maximum atteignable (100 axes + 5 bonus objectifs) |
| `profile` | `FRAGILE` (<30) · `PRUDENT` (30–49) · `EQUILIBRE` (50–69) · `DYNAMIQUE` (70–84) · `OPTIMISE` (≥85) |
| `weakestAxisId` | ID de l'axe avec le moins bon score relatif |
| `weakestAxisAdvice` | Conseil actionnable pour l'axe le plus faible |
| `axes[].missingData` | `true` si des données manquent pour cet axe |

---

## Droits d'accès

| Action | Rôle requis |
|--------|-------------|
| Gérer ses positions et ordres | USER, ADMIN |
| Consulter / déclencher ses propres snapshots | USER, ADMIN |
| Gérer le référentiel d'instruments (CRUD) | USER, ADMIN |
| Mettre à jour les cours manuellement | ADMIN uniquement |
| Activer / désactiver le prix fixe | ADMIN uniquement |
| Déclencher le scheduler complet | ADMIN uniquement |
| Générer un snapshot pour tous les utilisateurs | ADMIN uniquement |
| Consulter le référentiel INSEE | USER, ADMIN |
| Consulter / mettre à jour ses objectifs | USER, ADMIN |
| Consulter son score patrimonial | USER, ADMIN |
| Accéder aux données d'un autre utilisateur | ADMIN uniquement |
| CRUD snapshots admin | ADMIN uniquement — voir [`docs/api/admin-snapshots.md`](admin-snapshots.md) |
