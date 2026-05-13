# Comparateur d'enveloppes fiscales

Cet outil compare le rendement net après impôt de quatre enveloppes d'investissement (PEA, CTO, Assurance-vie, PER) pour un même effort d'épargne sur une durée choisie.

> ![Vue principale du comparateur](/docs/outils/enveloppes/enveloppes-overview.png) — Page comparateur avec les 4 cartes de résultat, le graphique d'évolution et les paramètres

---

## Paramètres de simulation

Renseignez dans le panneau de gauche :

| Paramètre | Description |
|-----------|------------|
| **Versement mensuel** | Montant épargné chaque mois dans chaque enveloppe |
| **Durée (ans)** | Horizon d'investissement |
| **TMI actuelle** | Votre tranche marginale d'imposition (pour le PER) |
| **TMI retraite** | Taux estimé à la sortie du PER |
| **Situation** | Célibataire ou couple (abattement AV différent) |
| **Option fiscale** | PFU 30 % ou barème progressif pour le CTO |

> ![Panneau de paramètres](/docs/outils/enveloppes/enveloppes-params.png) — Panneau gauche avec tous les curseurs et sélecteurs de paramètres

### Mode "même taux"

Activez ce mode pour utiliser un rendement identique sur les 4 enveloppes : seule la fiscalité différencie alors les résultats.

### Mode "taux différenciés"

Configurez un rendement spécifique par enveloppe (ex : actions plus rentables que le fonds euros AV).

---

## Résultats

### Cartes de classement

Quatre cartes affichent le **capital net après impôt** pour chaque enveloppe, classées de la meilleure à la moins bonne pour vos paramètres.

> ![Cartes de résultat](/docs/outils/enveloppes/enveloppes-cartes.png) — 4 cartes avec médaille de classement (🥇🥈🥉), capital net, capital brut et impôt payé

### Graphique d'évolution

Courbes d'évolution du capital net au fil des années pour visualiser à partir de quand chaque enveloppe devient avantageuse.

> ![Graphique d'évolution](/docs/outils/enveloppes/enveloppes-graphique.png) — Graphique multi-courbes avec une couleur par enveloppe (bleu PEA, vert AV, violet PER, gris CTO)

### Tableau comparatif

Détail des indicateurs par enveloppe : capital brut, capital net, impôt total, rendement annualisé net, rang.

---

## Comprendre les règles par enveloppe

| Enveloppe | Règle clé |
|-----------|----------|
| **PEA** | Exonéré d'IR après 5 ans (17,2 % PS uniquement). Plafonné 150 000 €. Actions européennes. |
| **CTO** | PFU 30 % sur les plus-values à la sortie. Dividendes taxés chaque année. Pas de plafond. |
| **AV** | Abattement 4 600 € (9 200 € couple) après 8 ans. Taux réduit 24,7 % si versements ≤ 150 000 €. |
| **PER** | Déduction TMI à l'entrée. Bloqué jusqu'à la retraite. Sortie taxée au barème. |

---

## Conseils d'utilisation

- Commencez toujours par ouvrir un **PEA le plus tôt possible** — le compteur des 5 ans démarre à l'ouverture, pas aux versements
- Le **PER est très avantageux si votre TMI baisse à la retraite** (exemple : 41 % actif → 11 % retraite)
- Pour les versements importants, **l'AV complémente le PEA** une fois le plafond atteint
- Le **CTO est incontournable** pour les actifs hors Europe (ETF S&P 500, cryptos non PEA)
