# Enregistrer un mouvement

Un **mouvement** (ou ordre) trace l'historique d'une position : achat, vente, dépôt, intérêt, dividende, airdrop, abondement…

## Types de mouvements

| Type | Applicable à | Impact sur la valeur |
|------|--------------|----------------------|
| BUY | BOURSE, CRYPTO | +quantité, +montant investi |
| SELL | BOURSE, CRYPTO | −quantité, −montant investi (au prorata) |
| DEPOSIT | LIVRET, LIQUIDITE, ASSURANCE_VIE, AUTRE | +montant (investi) |
| WITHDRAWAL | LIVRET, LIQUIDITE, ASSURANCE_VIE, AUTRE | −montant (investi) |
| INTEREST | Tous sauf LIQUIDITE | +montant (hors investi → plus-value pure) |
| DIVIDEND | BOURSE, CRYPTO | +montant (hors investi → plus-value pure) |
| AIRDROP | CRYPTO | +quantité (hors investi → plus-value pure) |
| ABONDEMENT | BOURSE (PEE/PERCO) | +quantité (hors investi → plus-value pure) |

> L'**ABONDEMENT** représente les unités offertes par l'employeur dans le cadre de l'épargne salariale (PEE, PERCO). Les unités sont ajoutées au compte sans augmenter le montant investi — elles génèrent donc une plus-value pure.

## Ajouter un mouvement

1. Ouvrez une position depuis la page Patrimoine (cliquez sur la carte)
2. Dans le panneau **Mouvements**, cliquez sur **Ajouter un mouvement**
3. Choisissez le type de mouvement
4. Renseignez la date, le montant en EUR et la quantité (si applicable)
5. Pour un achat en **devise étrangère**, indiquez le taux de change utilisé (ex : 1,08 pour USD→EUR)
6. Ajoutez des notes optionnelles

> 📷 `public/docs/patrimoine/order-form.png` — Formulaire d'ajout de mouvement avec les champs type, date, montant, quantité et taux de change

## Calcul de la valeur et de la plus-value

Pour les positions BOURSE et CRYPTO :

```
Valeur actuelle  = quantité totale × prix unitaire actuel
Montant investi  = somme des BUY/DEPOSIT − somme des SELL/WITHDRAWAL
Plus-value       = valeur actuelle − montant investi
Rendement (%)    = plus-value / montant investi × 100
```

Les AIRDROP, ABONDEMENT, INTEREST et DIVIDEND ne sont **pas** inclus dans le montant investi.

> 📷 `public/docs/patrimoine/position-card.png` — Carte de position avec valeur actuelle, montant investi, plus-value et rendement en %

## Modifier ou supprimer un mouvement

Chaque mouvement peut être **modifié** ou **supprimé** depuis le panneau d'historique. La valeur de la position est recalculée instantanément.

> 📷 `public/docs/patrimoine/order-panel.png` — Panneau d'historique des mouvements avec les boutons modifier et supprimer par ligne

## Mise à jour du cours (LIQUIDITE)

Pour une position LIQUIDITE, il n'y a pas de mouvement : le solde est mis à jour directement via le bouton **Mettre à jour le solde** sur la carte de position.
