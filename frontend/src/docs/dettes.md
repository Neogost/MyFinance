# Dettes

La section **Dettes** permet de suivre tous vos crédits en cours : immobilier, véhicule, consommation, étudiant…

## Types de dettes

| Type | Exemples |
|------|----------|
| IMMOBILIER | Crédit immobilier résidence principale, investissement locatif |
| VEHICULE | Crédit auto, moto |
| ETUDIANT | Prêt étudiant |
| CONSOMMATION | Crédit à la consommation, rachat de crédit |
| AUTRE | Prêt familial, découvert structurel… |

## Ajouter une dette

1. Allez dans **Dettes**
2. Cliquez sur **Ajouter une dette**
3. Renseignez le type, le libellé, l'établissement prêteur
4. Saisissez le capital initial, le taux d'intérêt annuel, la date de début et la durée
5. Ajoutez l'assurance mensuelle si applicable
6. Pour un crédit immobilier, liez la dette à la position IMMO_PHYSIQUE correspondante

> ![Formulaire d'ajout](/docs/dettes/debt-form.png) — Formulaire de création d'une dette avec les champs capital, taux, durée et le sélecteur de bien immobilier associé

## Tableau d'amortissement automatique

MyFinance calcule automatiquement à chaque mois le **capital restant dû** selon la formule d'amortissement classique, sans aucune saisie de votre part.

> ![Ammortissement](/docs/dettes/debt-card-amortissement.png) — Carte de dette avec l'accordéon du tableau d'amortissement sur 12 mois

## Override manuel du capital restant

Si votre relevé bancaire indique un capital différent de la projection calculée (remboursement anticipé, renégociation…), vous pouvez **corriger manuellement** le capital restant.

L'historique des corrections est conservé. Supprimer une correction revient au capital précédent.

> ![Overide manuel](/docs/dettes/debt-manual-override.png) — Panneau d'historique des mises à jour manuelles du capital restant

## Indicateurs clés

- **Capital restant dû** : montant encore à rembourser
- **Mensualité totale** : mensualité hors assurance + assurance
- **Progression** : pourcentage du capital remboursé
- **Date de libération** : date de fin de remboursement estimée

> ![Page et KPI](/docs/dettes/debts-page.png) — Page des dettes avec les 4 KPIs globaux, les barres de répartition par type et la liste groupée

## Widget Dettes (tableau de bord)

Le widget Dettes du tableau de bord affiche en un coup d'œil :
- Le **ratio d'endettement** mensuel (règle des 33 %)
- La **date de libération** estimée (année de fin du dernier crédit)
- Les **intérêts restants** estimés sur toute la durée
- La **progression globale** et par type de crédit

> ![Widget du Dashboard](/docs/dettes/dette-widget.png) — Widget Dettes dans le tableau de bord avec le ratio d'endettement et les barres de progression

## Lien avec le bilan financier

Le capital restant de toutes les dettes est intégré dans le **Passif** du bilan financier, réduisant la valeur nette patrimoniale.
