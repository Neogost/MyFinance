# Dépenses récurrentes

La section **Dépenses** permet de lister toutes vos charges régulières pour calculer votre **capacité d'épargne** mensuelle.

## Catégories

| Catégorie | Exemples |
|-----------|----------|
| LOGEMENT | Loyer, charges de copropriété, taxe foncière |
| ALIMENTATION | Courses, restaurants |
| TRANSPORT | Carburant, assurance auto, transports en commun |
| SANTE | Mutuelle, consultations |
| LOISIRS | Abonnements, sport, voyages |
| ABONNEMENTS | Internet, téléphonie, streaming |
| EDUCATION | Frais de scolarité, formations |
| EPARGNE_FORCEE | Versements automatiques sur livrets, PEA… |
| AUTRE | Toute dépense non catégorisée |

## Fréquences

Chaque dépense peut être **mensuelle** ou **annuelle**. Les dépenses annuelles sont ramenées à un équivalent mensuel pour le calcul de la capacité d'épargne.

## Ajouter une dépense

1. Allez dans **Dépenses**
2. Cliquez sur **Ajouter une dépense**
3. Choisissez la catégorie, la fréquence et saisissez le montant
4. Un **aperçu en temps réel** affiche le montant mensuel et annuel projeté

> 📷 `public/docs/depenses/expense-form.png` — Formulaire d'ajout de dépense avec l'aperçu de projection en temps réel

## Colocation

Pour les dépenses partagées (loyer en colocation, factures communes), renseignez le **pourcentage à votre charge** (ex : 50 %). Le montant projeté est automatiquement ajusté.

> 📷 `public/docs/depenses/expense-form-colocation.png` — Formulaire avec le curseur de pourcentage de colocation et l'indicateur de partage

## Tableau de bord des dépenses

La page affiche :
- **4 KPIs** : total mensuel, total annuel, nombre de dépenses actives, capacité d'épargne
- **Répartition par catégorie** : barres de progression avec montant et pourcentage
- **Liste groupée** par catégorie avec les dépenses actives et suspendues

> 📷 `public/docs/depenses/expenses-page.png` — Page des dépenses avec les KPIs, les barres de répartition et la liste groupée par catégorie

## Capacité d'épargne

La **capacité d'épargne** est calculée comme :

```
Capacité d'épargne = revenu net mensuel − total dépenses mensuelles actives
```

Le revenu net utilisé est le **net d'impôt** du contrat salarial actif (si le profil fiscal est renseigné), ou le **net imposable** à défaut. Les revenus complémentaires ne sont pas inclus dans ce calcul.
