# Crédit Lombard

Le simulateur de crédit Lombard vous aide à évaluer la capacité d'emprunt sur la garantie de votre portefeuille financier, et à comparer le coût de cette stratégie face à une vente directe.

> ![Vue principale crédit Lombard](/docs/outils/lombard/lombard-overview.png) — Page Lombard avec le résumé de la capacité d'emprunt, la comparaison cession/Lombard et le tableau d'amortissement

---

## Principe

Le crédit Lombard permet d'**emprunter en mettant votre portefeuille en garantie** sans le vendre. La banque accorde un prêt proportionnel à la valeur du portefeuille (LTV : Loan-To-Value).

**Avantage principal :** vous conservez vos investissements (et leurs gains futurs) tout en obtenant des liquidités. Vous évitez de déclencher la fiscalité sur les plus-values.

---

## Paramètres

| Paramètre | Description |
|-----------|------------|
| **Valeur du portefeuille** | Valeur totale des actifs mis en garantie |
| **LTV (%)** | Ratio maximum autorisé par la banque (typiquement 50-70 % selon les actifs) |
| **Montant emprunté** | Peut être inférieur au maximum autorisé |
| **Taux d'intérêt** | Taux du crédit Lombard (généralement EURIBOR + marge) |
| **Durée** | Durée de remboursement |

> ![Formulaire Lombard](/docs/outils/lombard/lombard-params.png) — Formulaire avec la valeur du portefeuille, le curseur LTV et le montant emprunté

---

## Résultats

### Capacité d'emprunt

```
Montant maximum = Valeur portefeuille × LTV
```

Exemple : portefeuille de 100 000 € avec LTV 60 % → peut emprunter jusqu'à 60 000 €.

> ![Résumé capacité](/docs/outils/lombard/lombard-capacite.png) — Carte avec le montant max, le montant sélectionné et la marge de sécurité

### Comparaison Cession vs Lombard

Le simulateur compare deux options pour obtenir la même somme :

| | Vente directe | Crédit Lombard |
|--|--------------|---------------|
| Liquidités obtenues | Montant − impôt PV | Montant emprunté |
| Impôt immédiat | PFU 30 % sur les PV | Aucun |
| Gains perdus | Futurs gains du portefeuille vendu | Aucun (vous gardez tout) |
| Coût | Impôt | Intérêts |

> ![Comparaison cession/Lombard](/docs/outils/lombard/lombard-comparaison.png) — Tableau comparatif côte à côte avec les flux financiers de chaque option

---

## Risque : l'appel de marge

Si la valeur du portefeuille chute en dessous du seuil de sécurité, la banque peut exiger un remboursement partiel immédiat (**appel de marge**). Le simulateur affiche le **niveau de déclenchement** basé sur vos paramètres.

> ![Indicateur appel de marge](/docs/outils/lombard/lombard-marge.png) — Jauge avec la valeur actuelle, le niveau d'alerte et le niveau d'appel de marge

---

## Tableau d'amortissement

Visualisez mois par mois le remboursement du capital et des intérêts.

---

## Cas d'usage typiques

- **Achat immobilier** sans vendre son portefeuille boursier en pleine croissance
- **Financement d'un projet** (travaux, véhicule) en conservant ses plus-values latentes
- **Opportunité d'investissement** à saisir rapidement sans liquidités disponibles

**Ce crédit n'est pas adapté** si vous comptez sur la vente future du portefeuille pour rembourser — le risque d'appel de marge en cas de baisse des marchés peut forcer une vente au plus mauvais moment.
