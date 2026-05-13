# Optimisation fiscale fin d'année

Cet outil identifie les positions en moins-value dans votre portefeuille qui peuvent être vendues avant le 31 décembre pour réduire votre imposition sur les plus-values réalisées dans l'année.

> ![Vue principale tax-loss harvesting](/docs/outils/tlh/tlh-overview.png) — Page d'optimisation avec le résumé des gains/pertes, les candidats CTO et le résumé crypto

---

## Principe

En France (compte-titres ordinaire et crypto), les moins-values réalisées dans l'année **s'imputent sur les plus-values** de la même année. Si vos gains sont supérieurs à vos pertes, vous payez le PFU (30 %) sur la différence. En vendant des positions en rouge avant le 31 décembre, vous réduisez cette base imposable.

**Attention :** vous pouvez racheter les mêmes titres le lendemain — votre portefeuille reste identique, mais vous avez économisé de l'impôt.

---

## Résumé de l'année

En haut de page, trois indicateurs synthétisent votre situation fiscale pour l'année sélectionnée :

- **Gains réalisés** : plus-values déjà encaissées (ventes effectuées)
- **Pertes réalisées** : moins-values déjà matérialisées
- **Solde net** : base imposable actuelle (si positif = vous payez des impôts)

> ![Résumé fiscal de l'année](/docs/outils/tlh/tlh-resume.png) — Trois cartes : gains en vert, pertes en rouge, solde net avec l'impôt estimé

---

## Candidats CTO

Liste de vos positions en compte-titres ordinaire actuellement en moins-value, triées par potentiel d'économie d'impôt.

Pour chaque candidat :
- **Moins-value latente** : écart entre prix de revient moyen et valeur actuelle
- **Économie potentielle** : impôt évité si vous réalisez la perte (moins-value × 30 %)
- **Enveloppe** : PEA ou CTO (les pertes PEA ne s'imputent pas sur le CTO)

> ![Table des candidats CTO](/docs/outils/tlh/tlh-candidats.png) — Tableau avec les positions candidates : nom, PRU, valeur actuelle, moins-value latente et économie estimée

---

## Candidats crypto

Même logique pour vos positions crypto. La règle de calcul de la plus-value crypto (art. 150 VH bis CGI) est prise en compte automatiquement.

> ![Section crypto](/docs/outils/tlh/tlh-crypto.png) — Section crypto avec les candidats et le rappel de la règle de calcul spécifique

---

## Simuler une vente

Cliquez sur une position candidate pour simuler l'impact précis d'une vente :
- Moins-value qui serait réalisée
- Nouveau solde net imposable
- Impôt économisé
- Impôt restant à payer sur le solde résiduel

> ![Modal de simulation](/docs/outils/tlh/tlh-simulation.png) — Modal de simulation avec le curseur de montant vendu et le calcul dynamique de l'économie

---

## Fenêtre d'action

Cette stratégie n'est efficace que si les ventes sont réalisées **avant le 31 décembre**. L'outil affiche un bandeau d'alerte dès le mois de novembre pour rappeler la fenêtre d'opportunité.

---

## Limites et points d'attention

- Seul le **CTO** et les **cryptomonnaies** sont concernés (PEA, AV, PER ne sont pas soumis au PFU annuel)
- Les pertes sur CTO **ne compensent pas** les gains crypto (compartiments fiscaux séparés)
- Les moins-values non utilisées sont **reportables 10 ans** sur les plus-values futures (CTO uniquement)
- Cette simulation est indicative — confirmez avec un conseiller fiscal avant de procéder
