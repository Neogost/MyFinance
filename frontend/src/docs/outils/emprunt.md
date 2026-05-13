# Simulateur d'emprunt

Ce simulateur calcule les mensualités, le coût total et le tableau d'amortissement d'un crédit immobilier ou à la consommation.

> ![Vue principale du simulateur d'emprunt](/docs/outils/emprunt/emprunt-overview.png) — Page emprunt avec le résumé KPI, la répartition capital/intérêts et le tableau d'amortissement

---

## Paramètres principaux

| Paramètre | Description |
|-----------|------------|
| **Montant emprunté** | Capital total à financer |
| **Taux d'intérêt (%)** | Taux nominal annuel hors assurance |
| **Durée (mois ou ans)** | Durée totale du crédit |
| **Type de bien** | Immobilier ancien, neuf ou crédit à la consommation (impacte les frais de notaire) |

> ![Formulaire principal](/docs/outils/emprunt/emprunt-params.png) — Formulaire avec les 4 champs principaux et l'aperçu dynamique de la mensualité

---

## Frais et assurance

Dépliez la section **Options avancées** pour affiner la simulation :

- **Taux d'assurance** : généralement 0,2 % à 0,5 % du capital annuellement
- **Frais de dossier** : frais bancaires fixes
- **Différé** : période sans remboursement du capital (mensualités intérêts seulement)
- **Frais de notaire** : calculés automatiquement selon le type de bien

> ![Options avancées](/docs/outils/emprunt/emprunt-avances.png) — Section dépliée avec taux assurance, frais bancaires et différé partiel/total

---

## Résultats

### KPI principaux

- **Mensualité** (hors et avec assurance)
- **Coût total des intérêts**
- **Coût total de l'assurance**
- **TAEG** (Taux Annuel Effectif Global — inclut tous les frais)
- **Taux d'endettement** : mensualité ÷ revenus nets (seuil réglementaire HCSF : 35 %)

> ![KPI résultats](/docs/outils/emprunt/emprunt-kpi.png) — Cartes de résultat avec mensualité, TAEG, taux d'endettement et coût total

### Graphique de répartition

Graphique en camembert ou barres montrant la répartition entre capital remboursé, intérêts et assurance sur la durée totale.

> ![Répartition capital/intérêts](/docs/outils/emprunt/emprunt-graph.png) — Graphique de répartition avec les 3 composantes en couleur

### Tableau d'amortissement

Détail mois par mois : mensualité, part intérêts, part capital, capital restant dû.

> ![Tableau d'amortissement](/docs/outils/emprunt/emprunt-tableau.png) — Tableau avec les premières et dernières lignes du tableau d'amortissement

---

## Remboursements anticipés

Ajoutez des remboursements anticipés pour simuler l'impact sur la durée ou les mensualités :
- **Réduire la durée** : même mensualité, prêt terminé plus tôt
- **Réduire la mensualité** : durée identique, mensualité allégée

> ![Remboursement anticipé](/docs/outils/emprunt/emprunt-anticipe.png) — Section remboursement anticipé avec date, montant et choix du mode

---

## Comparaison

Activez la **comparaison** pour mettre côte à côte deux scénarios (ex : durée 15 ans vs 20 ans, ou deux taux différents).

> ![Comparaison deux scénarios](/docs/outils/emprunt/emprunt-comparaison.png) — Tableau de comparaison côte à côte avec les différences surlignées

---

## Sauvegarder une simulation

Cliquez sur **Sauvegarder** pour conserver vos paramètres. Les simulations sauvegardées apparaissent dans la liste en haut et peuvent être rechargées à tout moment.
