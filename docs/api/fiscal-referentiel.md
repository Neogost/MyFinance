# API — Référentiel fiscal

Base URL : `http://localhost:8080`

Swagger UI interactif disponible sur : `http://localhost:8080/swagger-ui.html`

Ces endpoints exposent les paramètres fiscaux publics chargés depuis les fichiers YAML de configuration. Ils ne nécessitent pas de rôle ADMIN.

---

## Vue d'ensemble

| Méthode | URL | Rôle | Description |
|---------|-----|------|-------------|
| `GET` | `/api/fiscal/bareme-kilometrique` | Authentifié | Barème kilométrique fiscal en vigueur (voitures) |

---

## GET /api/fiscal/bareme-kilometrique

Retourne le barème kilométrique fiscal utilisé pour calculer les frais de transport en mode frais réels (déduction professionnelle). Chargé depuis `bareme-kilometrique.yml` au démarrage de l'application.

**Accès** : authentifié

```http
GET /api/fiscal/bareme-kilometrique
```

### Réponse — 200 OK

```json
{
  "annee": 2025,
  "avertissement": "Ce barème est fourni à titre indicatif. Vérifiez les valeurs officielles sur impots.gouv.fr.",
  "multiplicateurElectrique": 1.20,
  "voitures": [
    {
      "cvMax": 3,
      "label": "3 CV et moins",
      "tranches": [
        { "kmMax": 5000,  "taux": 0.529, "forfait": 0.0 },
        { "kmMax": 20000, "taux": 0.316, "forfait": 1065.0 },
        { "kmMax": null,  "taux": 0.370, "forfait": 0.0 }
      ]
    },
    {
      "cvMax": 4,
      "label": "4 CV",
      "tranches": [
        { "kmMax": 5000,  "taux": 0.606, "forfait": 0.0 },
        { "kmMax": 20000, "taux": 0.340, "forfait": 1330.0 },
        { "kmMax": null,  "taux": 0.407, "forfait": 0.0 }
      ]
    }
  ]
}
```

### Champs

| Champ | Type | Description |
|-------|------|-------------|
| `annee` | `integer` | Année fiscale du barème |
| `avertissement` | `string` | Message d'avertissement affiché dans l'UI |
| `multiplicateurElectrique` | `number` | Multiplicateur pour les véhicules électriques (ex : `1.20` = +20 %) |
| `voitures[].cvMax` | `integer` | Puissance fiscale maximale de la tranche (ex : `3` = jusqu'à 3 CV) |
| `voitures[].label` | `string` | Libellé affiché (ex : `"3 CV et moins"`) |
| `voitures[].tranches[].kmMax` | `integer\|null` | Kilométrage maximum de la tranche (`null` = illimité — dernière tranche) |
| `voitures[].tranches[].taux` | `number` | Taux par kilomètre (€/km) |
| `voitures[].tranches[].forfait` | `number` | Forfait fixe ajouté au calcul (€), `0.0` si tranche linéaire |

### Formule de calcul

```
fraisKm = km × taux + forfait                    (tranche linéaire : forfait = 0)
         ou km × taux + forfait                   (tranche avec forfait intermédiaire)

Si véhicule électrique : fraisKm × multiplicateurElectrique
```

Exemple pour 8 000 km avec 5 CV (tranche 5 000–20 000 km) :
```
fraisKm = 8000 × 0.389 + 1667 = 4779 €
```

> Le barème est mis à jour annuellement dans `bareme-kilometrique.yml`. Un redémarrage de l'application est nécessaire pour prendre en compte la nouvelle version.

---

## Codes d'erreur communs

| Code | Raison |
|------|--------|
| 401 | Non authentifié |
