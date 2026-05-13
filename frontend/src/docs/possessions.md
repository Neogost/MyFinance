# Possessions

Les possessions représentent vos **grands actifs non-financiers** (véhicule, électronique, mobilier, œuvres d'art…). Contrairement aux positions financières qui ont une valeur de marché, les possessions se déprécient dans le temps selon une courbe définie.

> ![Liste des possessions](/docs/possessions/possessions-liste.png) — Vue liste des possessions avec valeur actuelle estimée, décote cumulée et catégorie

---

## Pourquoi renseigner ses possessions ?

- Elles apparaissent dans le **Passif** du bilan financier (avec leur valeur après décote)
- Elles sont incluses dans la **déclaration de patrimoine**
- Elles influencent le **scoring patrimonial** (axe diversification)

---

## Ajouter une possession

Cliquez sur **+ Ajouter** et renseignez :

| Champ | Description |
|-------|------------|
| **Nom** | Libellé libre (ex : "Renault Clio 2021") |
| **Catégorie** | Voiture, Moto, Électronique, Mobilier, Art, Autre |
| **Valeur d'achat (€)** | Prix payé à l'acquisition |
| **Date d'acquisition** | Sert à calculer la durée de dépréciation |
| **Durée de vie estimée (ans)** | Nombre d'années avant valeur nulle (ex : 7 ans pour une voiture) |
| **Taux de décote annuelle (%)** | Alternative à la durée de vie pour une décote personnalisée |

> ![Formulaire d'ajout de possession](/docs/possessions/possessions-form.png) — Formulaire de création avec les champs valeur d'achat, date et taux de décote

---

## Calcul de la valeur actuelle

La valeur estimée est calculée automatiquement :

```
Valeur actuelle = Valeur d'achat × (1 − taux annuel)^années écoulées
```

Exemple : une voiture achetée 20 000 € avec 15 % de décote par an vaut 12 325 € après 3 ans.

---

## Valeur manuelle

Si vous connaissez la valeur de revente réelle (ex : cote Argus d'un véhicule), vous pouvez **saisir une valeur manuelle** qui remplace le calcul automatique jusqu'à la prochaine mise à jour.

> ![Override valeur manuelle](/docs/possessions/possessions-override.png) — Champ de valeur manuelle avec l'indicateur "valeur forcée" et la valeur calculée en comparaison

---

## Synthèse

En bas de la page, un récapitulatif affiche :
- **Valeur totale actuelle** de toutes les possessions
- **Répartition par catégorie** en pourcentage
- **Décote cumulée** depuis l'acquisition (argent "perdu" sur ces actifs)
