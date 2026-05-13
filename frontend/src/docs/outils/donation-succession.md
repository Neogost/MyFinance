# Donation & succession

Le simulateur Donation & succession vous aide à planifier la transmission de votre patrimoine. Il repose sur trois onglets complémentaires : **Donation**, **Succession** et **Stratégie 15 ans**.

> ![Vue générale du simulateur](/docs/outils/donation/donation-overview.png) — Page Donation & succession avec les trois onglets et la cellule familiale à gauche

---

## Prérequis : la cellule familiale

Avant de simuler, renseignez vos proches via le bouton **Gérer** dans la section "Cellule familiale" :

- **Conjoint / partenaire** : précisez le type d'union (Marié, Pacsé, Concubin) et le régime matrimonial (Communauté, Séparation)
- **Enfants** : date de naissance (nécessaire pour le démembrement) et situation de handicap éventuelle
- **Autres héritiers** : petits-enfants, frères/sœurs, neveux/nièces…

> ![Gestion de la cellule familiale](/docs/outils/donation/cellule-familiale.png) — Modal de gestion de la cellule avec la liste des membres et le formulaire d'ajout

> ![Formulaire d'ajout d'un membre](/docs/outils/donation/membre-form.png) — Formulaire avec le type de relation, date de naissance et case handicap

---

## Donations passées

Si vous avez déjà effectué des donations dans les 15 dernières années, enregistrez-les via **Mémoriser une donation**. Elles seront automatiquement déduites des abattements disponibles dans toutes les simulations.

> ![Section donations passées](/docs/outils/donation/donations-passees.png) — Section avec la liste des donations enregistrées et le formulaire d'ajout (bénéficiaire, montant, date)

---

## Onglet Donation

Simulez la transmission d'un bien à un ou plusieurs bénéficiaires.

### Mode simple (1 donateur → N bénéficiaires)

1. Choisissez le bien à donner (nom, valeur, type : pleine propriété ou démembrement)
2. Sélectionnez les bénéficiaires et leur quote-part
3. Cliquez **Simuler**

### Mode couple (2 donateurs → N bénéficiaires)

Activez le **mode couple** pour simuler une donation conjointe. Chaque parent bénéficie de ses propres abattements (100 000 € par enfant pour chacun).

> ![Formulaire de donation](/docs/outils/donation/donation-form.png) — Formulaire avec le sélecteur de bien, la valeur, le type (PP/démembrement) et les bénéficiaires avec sliders de quote-part

### Résultat

Pour chaque bénéficiaire, le simulateur affiche :
- Abattement disponible (tenant compte des donations passées)
- Part taxable
- Droits de donation estimés
- Frais de notaire estimés (barème dégressif)
- **Montant net reçu**

> ![Résultat de la simulation de donation](/docs/outils/donation/donation-result.png) — Cartes de résultat par bénéficiaire avec abattement, droits et net reçu

---

## Onglet Succession

Simulation de votre succession au jour J, basée sur votre patrimoine actuel et votre cellule familiale.

### Composition de la masse successorale

```
Masse successorale = Patrimoine net
                   − Part du conjoint (régime communauté)
                   + Donations rapportées (< 15 ans)
```

> ![Calcul de la masse successorale](/docs/outils/succession/masse-successorale.png) — Section gauche avec le détail : positions financières, possessions, dettes, part du conjoint et donations rapportées

### Réserve héréditaire et quotité disponible

- **Réserve héréditaire** : part garantie aux enfants par la loi (1/2 pour 1 enfant, 2/3 pour 2, 3/4 pour 3 ou plus)
- **Quotité disponible** : part dont vous pouvez disposer librement par testament

### Résultat par héritier

Chaque héritier dispose d'une carte détaillant :
- Part brute attribuée (avec décomposition : part régime matrimonial + part successorale pour le conjoint)
- Abattement applicable et abattement déjà utilisé
- Part taxable et droits de succession
- **Net reçu**

> ![Carte héritier](/docs/outils/succession/heritier-card.png) — Carte d'un héritier (conjoint) avec le détail : part régime matrimonial, part successorale, exonération

### Simulation avec testament

Dépliez la section **Simulation avec testament** pour tester 3 scénarios :

| Scénario | Description |
|----------|------------|
| Légal (défaut) | Répartition légale sans testament |
| Conjoint protégé | Quotité disponible entière au conjoint |
| Enfants favorisés | Conjoint renonce à sa part successorale |

> ![Simulation testament](/docs/outils/succession/testament.png) — Section testament avec les 3 boutons de scénario et le tableau comparatif par héritier

---

## Onglet Stratégie 15 ans

Planifiez des cycles de donations sur la durée de vie pour optimiser la transmission.

Les abattements de donation (100 000 € par enfant par parent) se **renouvellent tous les 15 ans**. En anticipant plusieurs cycles, vous pouvez transmettre des sommes importantes sans aucun droit.

> ![Vue stratégie 15 ans](/docs/outils/strategie/strategie-overview.png) — Vue complète avec la frise chronologique des cycles, le graphique comparatif et les 3 cartes de scénario

### Lecture des 3 scénarios

- **Sans anticipation** : droits estimés si tout est transmis au décès (hover pour voir le calcul détaillé)
- **Donations PP** : total transmissible sans droits en pleine propriété sur tous les cycles
- **+ Démembrement** : valeur PP équivalente si vous transmettez en nue-propriété (vous conservez l'usufruit)

> ![Graphique comparatif](/docs/outils/strategie/graphique-comparatif.png) — Bar chart empilé : vert (transmis aux héritiers) et rouge (droits perdus) pour chaque scénario

### Simulation assurance-vie

Dépliez **Assurance-vie — simulation complémentaire** pour estimer l'économie réalisée via un contrat d'assurance-vie (abattement de 152 500 € par bénéficiaire, art. 990 I CGI).

> ![Simulation AV](/docs/outils/strategie/simulation-av.png) — Section AV avec les inputs montant et nombre de bénéficiaires, et le résultat comparatif (droits AV vs droits succession classique)

### Barème des droits

Dépliez **Barème des droits de succession** pour consulter les 7 tranches de 5 % à 45 % applicables en ligne directe (art. 777 CGI).
