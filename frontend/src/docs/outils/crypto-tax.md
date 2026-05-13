# Fiscalité crypto (Formulaire 2086)

Cet outil calcule votre imposition sur les cessions de cryptomonnaies selon les règles françaises (art. 150 VH bis CGI) et génère les éléments nécessaires à votre déclaration sur le **formulaire 2086**.

> ![Page fiscalité crypto](/docs/outils/crypto/crypto-overview.png) — Vue principale avec le résumé annuel, le graphique des cessions et la liste des opérations

---

## Prérequis

Avant de simuler, vérifiez deux points dans la section **État du portefeuille** :

1. **PTA (Prix Total d'Acquisition)** : somme de tout ce que vous avez investi en crypto depuis l'origine. Si vous n'avez pas l'historique complet, utilisez le bouton pour le confirmer manuellement.
2. **Valorisation actuelle** : valeur totale de votre portefeuille crypto au moment de la simulation.

> ![Section état du portefeuille](/docs/outils/crypto/crypto-etat.png) — Panneau état avec le PTA affiché, la valorisation et le toggle de confirmation de l'historique

---

## La règle de calcul française

En France, la plus-value n'est pas calculée sur le montant brut retiré, mais sur la **proportion du portefeuille vendue** :

```
Plus-value = Cession − (PTA × Cession ÷ Valeur du portefeuille)
```

**Exemple :** vous avez investi 1 000 €, votre portefeuille vaut 1 500 €, vous vendez 1 000 €.
→ Vous vendez 2/3 du portefeuille → 2/3 de votre mise revient aussi (666 €).
→ Plus-value imposable = 1 000 − 666 = **334 €**

---

## Saisir une opération

Cliquez sur **+ Ajouter une opération** et sélectionnez le type :

| Type | Description |
|------|------------|
| **SELL_FIAT** | Vente de crypto contre euros (imposable) |
| **BUY_FIAT** | Achat de crypto avec des euros |
| **BUY_CRYPTO** | Échange crypto → crypto (imposable depuis 2020) |
| **SELL_CRYPTO** | Échange crypto → crypto |

> ![Formulaire d'ajout d'opération](/docs/outils/crypto/crypto-form.png) — Formulaire avec les champs type, date, montant cession, valeur du portefeuille et PTA au moment de la cession

---

## Résultats annuels

Sélectionnez une **année fiscale** et une **option d'imposition** :

- **Flat tax (PFU)** : 30 % (12,8 % IR + 17,2 % PS) — recommandé dans la plupart des cas
- **Barème progressif** : intégration au revenu imposable — avantageux si votre TMI est faible

> ![Résumé annuel](/docs/outils/crypto/crypto-resultat.png) — Résumé avec le total des cessions, la plus-value nette, l'impôt estimé et l'option sélectionnée

---

## Export formulaire 2086

Le bouton **Exporter CSV** génère un fichier au format du formulaire 2086, prêt à être intégré dans votre déclaration en ligne ou transmis à votre comptable.

> ![Bouton export CSV](/docs/outils/crypto/crypto-export.png) — Bouton d'export et aperçu des premières lignes du formulaire 2086 généré

---

## Points d'attention

- Les **échanges crypto → crypto** sont imposables depuis le 1er janvier 2020
- Chaque cession doit être déclarée **même si le montant est faible**
- Les **moins-values** compensent les plus-values de la même année mais ne sont pas reportables sur les années suivantes (à la différence des valeurs mobilières)
- L'**assurance-vie crypto** et le **PEA crypto** n'existent pas en France — toutes les cryptos sont en compte-titres ordinaire
