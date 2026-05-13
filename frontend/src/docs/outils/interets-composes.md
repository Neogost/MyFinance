# Intérêts composés

Le simulateur d'intérêts composés projette la croissance d'un capital dans le temps, avec ou sans versements réguliers.

> ![Vue du simulateur](/docs/outils/interets/interets-overview.png) — Page intérêts composés avec le graphique d'évolution, le résumé et les paramètres

---

## Paramètres

| Paramètre | Description |
|-----------|------------|
| **Capital initial** | Somme déjà investie au départ (peut être 0) |
| **Versement mensuel** | Montant ajouté chaque mois |
| **Durée (ans)** | Horizon de projection |
| **Taux annuel (%)** | Rendement brut annuel estimé |
| **Fréquence de capitalisation** | Mensuelle ou annuelle |

> ![Panneau de paramètres](/docs/outils/interets/interets-params.png) — Curseurs et champs numériques pour chaque paramètre, avec la mise à jour dynamique du résultat

---

## Résultat

Le simulateur affiche :
- **Capital final** : valeur totale du portefeuille à l'échéance
- **Total versé** : somme cumulée de vos apports (capital initial + versements)
- **Intérêts générés** : la différence — c'est "l'argent de l'argent"
- **Barre de répartition** : visuel proportionnel versements / intérêts

> ![Résultat du simulateur](/docs/outils/interets/interets-resultat.png) — Cartes avec capital final, total versé, intérêts générés et barre de répartition colorée

---

## Graphique d'évolution

Le graphique en aires superposées montre :
- La zone bleue : capital cumulé des versements
- La zone verte : intérêts cumulés

À partir d'un certain point, les intérêts dépassent les versements — c'est **l'effet de levier des intérêts composés**.

> ![Graphique en aires](/docs/outils/interets/interets-graphique.png) — Graphique d'évolution sur la durée avec deux zones colorées : versements (bleu) et intérêts (vert)

---

## Mode inversé

Activez le **mode inversé** pour calculer le versement mensuel nécessaire pour atteindre un objectif de capital donné.

> ![Mode inversé](/docs/outils/interets/interets-inverse.png) — Formulaire inversé avec le champ objectif et le résultat "versement mensuel nécessaire"

---

## Notes méthodologiques

- La capitalisation est mensuelle par défaut : chaque mois, les intérêts produits s'ajoutent au capital
- Le taux annuel est converti en taux mensuel équivalent : `(1 + r_annuel)^(1/12) − 1`
- **Cette projection ne tient pas compte de l'inflation ni de la fiscalité** — pour une comparaison nette, utilisez le comparateur d'enveloppes fiscales
