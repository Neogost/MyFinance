# API — Simulations d'emprunt

## Endpoints

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/loan-simulations` | Authentifié | Liste les simulations sauvegardées de l'utilisateur (triées par date desc) |
| `POST` | `/api/loan-simulations` | Authentifié | Sauvegarder une simulation |
| `DELETE` | `/api/loan-simulations/{id}` | Authentifié | Supprimer une simulation |

---

## GET `/api/loan-simulations`

Retourne les simulations sauvegardées de l'utilisateur connecté, triées de la plus récente à la plus ancienne.

**Réponse 200**

```json
[
  {
    "id": 1,
    "name": "Appartement Paris 75011",
    "savedAt": "2026-04-26T10:30:00",
    "parameters": {
      "propertyPrice": 320000,
      "loanAmount": 260000,
      "loanDuration": 20,
      "annualRate": 3.45,
      "insuranceRate": 0.2,
      "...": "..."
    }
  }
]
```

---

## POST `/api/loan-simulations`

Sauvegarde une simulation. Le champ `parameters` est un objet libre contenant l'intégralité des paramètres du simulateur — il est stocké tel quel en base (colonne TEXT JSON) et retourné sans transformation.

**Corps de la requête**

```json
{
  "name": "Appartement Paris 75011",
  "parameters": {
    "propertyPrice": 320000,
    "loanAmount": 260000,
    "loanDuration": 20,
    "annualRate": 3.45,
    "insuranceRate": 0.2,
    "insuranceBase": "initial",
    "personalContrib": 40000,
    "participants": [{ "id": 1, "name": "Emprunteur 1", "percent": 100 }],
    "ptzEnabled": false,
    "earlyRepayments": [],
    "...": "..."
  }
}
```

**Réponse 201** — simulation créée (même format que GET)

**Erreurs**
- `400` — `name` vide ou `parameters` null

---

## DELETE `/api/loan-simulations/{id}`

Supprime la simulation identifiée par `{id}`.

**Réponse 204** — supprimée

**Erreurs**
- `403` — la simulation appartient à un autre utilisateur
- `404` — simulation introuvable

---

## Modèle de données

### Entité `LoanSimulation`

| Champ | Type SQL | Nullable | Description |
|-------|----------|----------|-------------|
| `id` | INTEGER PK | Non | Identifiant auto-incrémenté |
| `user_id` | INTEGER FK | Non | Utilisateur propriétaire |
| `name` | TEXT | Non | Nom saisi par l'utilisateur |
| `saved_at` | DATETIME | Non | Date/heure de sauvegarde (UTC) |
| `parameters_json` | TEXT | Non | JSON des paramètres du simulateur |

### DTO `LoanSimulationDto`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Long | Identifiant |
| `name` | String | Nom de la simulation |
| `savedAt` | String | ISO 8601 (ex : `2026-04-26T10:30:00`) |
| `parameters` | Object | Tous les paramètres du simulateur |

### Règles d'ownership

- Un utilisateur ne peut accéder qu'à ses propres simulations.
- Un `ADMIN` peut supprimer la simulation de n'importe quel utilisateur.
