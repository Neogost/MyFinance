# Optimisation fiscale fin d'année (Tax-loss harvesting)

> **Statut : 📝 Spécifié, non implémenté**
> Document de spécification pour livraison V1.

## 1. Objectif

Détecter en novembre-décembre les positions BOURSE/CRYPTO en moins-value latente que l'utilisateur peut **vendre avant le 31 décembre** pour compenser ses plus-values déjà réalisées sur l'année et **réduire son imposition au PFU**.

L'objectif n'est **pas** d'exécuter les ordres (l'app ne fait pas de courtage) mais de :
- Calculer le potentiel d'économie (€ d'impôt évité)
- Identifier les positions candidates triées par impact
- Donner les ordres précis à passer chez le broker (« vendre 12 parts de l'ETF X »)
- Avertir des limites fiscales (cloisonnement crypto/actions, exclusion PEA/AV, etc.)

Accessible depuis **Outils → Optimisation fiscale fin d'année** dans la navigation, et via un **bandeau saisonnier** en haut de la page Patrimoine entre le 1er novembre et le 31 décembre.

---

## 2. Cadre fiscal — rappel

### 2.1 Règle générale (article 150-0 D CGI)

Les moins-values de cession de valeurs mobilières sont imputables :
- **Sur les plus-values de même nature** réalisées au cours de la même année
- **Et sur les 10 années suivantes** (report fiscal automatique)

### 2.2 Cloisonnement par enveloppe

| Enveloppe | Moins-values utilisables ? | Compensation possible avec |
|---|---|---|
| **CTO** (Compte-Titres Ordinaire) | ✅ Oui | +values cessions actions/ETF/obligations CTO |
| **CRYPTO** (article 150 VH bis CGI) | ✅ Oui | +values cessions crypto **uniquement** (cloisonné) |
| **PEA** | ❌ Non | Régime spécifique — exonération après 5 ans, pas de compensation |
| **AV** (Assurance-vie) | ❌ Non | Imposition uniquement aux rachats avec abattement après 8 ans |
| **PER** | ❌ Non | Phase de capitalisation non taxée |
| **PEE_PERCO** | ❌ Non | Régime spécifique entreprise |

### 2.3 Calcul d'économie

```
Économie d'impôt = min(PV_réalisées_annuelle, MV_compensables) × 30 %
```

Où **30 %** = PFU (12,8 % IR + 17,2 % prélèvements sociaux). Si l'utilisateur a opté pour l'imposition au barème, remplacer 30 % par `TMI + 17,2 %`.

### 2.4 Délais de rachat ("wash sale")

**La France n'a pas de wash sale rule** comme les USA. Vendre puis racheter le même titre le lendemain est légal. Cependant :
- **Bonne pratique** : attendre quelques jours (15-30) pour qu'en cas de contrôle, l'opération ne soit pas requalifiée d'« abus de droit » (article L. 64 LPF)
- **Risque opérationnel** : le cours peut bouger entre la vente et le rachat
- L'application **affiche un avertissement** sans interdire

---

## 3. Données utilisées

L'app a déjà tout ce qu'il faut, **aucune nouvelle entité requise**.

| Donnée | Source | Champ |
|---|---|---|
| Positions actives | `positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, ACTIVE)` | filtré sur catégories BOURSE + CRYPTO |
| Enveloppe fiscale | `Position.fiscalEnvelope` | exclure PEA, AV, PER, PEE_PERCO |
| Montant investi | `PositionDto.computed.investedAmountEur` | déjà calculé |
| Valeur courante | `PositionDto.computed.currentValueEur` | déjà calculé (cours actuels + taux) |
| Plus/moins-value latente | `PositionDto.computed.capitalGainEur` | `currentValue − invested` |
| Plus-values réalisées de l'année | Ordres SELL de l'année courante avec `amountEur` − coût d'acquisition proportionnel | À calculer |

---

## 4. Logique de calcul

### 4.1 Service `TaxLossHarvestingService`

```java
public TaxLossSummaryDto computeSummary(User user, int year) {
    // 1. Récupère toutes les positions actives BOURSE + CRYPTO
    List<PositionDto> positions = positionService.findAllByUser(user, null, ACTIVE);

    // 2. Sépare CTO et CRYPTO (cloisonnement fiscal)
    BasketAnalysis cto    = analyseBasket(positions, ENVELOPPES_CTO_ELIGIBLES, year);
    BasketAnalysis crypto = analyseBasket(positions, AssetCategory.CRYPTO, year);

    return new TaxLossSummaryDto(cto, crypto, currentYearOrCustom(year));
}

private BasketAnalysis analyseBasket(List<PositionDto> positions, ..., int year) {
    // PV réalisées de l'année (somme des SELL.amountEur − coût acquisition proportionnel)
    BigDecimal pvRealisees = computeRealizedGains(positions, year);

    // MV latentes triées par valeur absolue desc
    List<TaxLossCandidateDto> candidates = positions.stream()
            .filter(p -> p.computed().capitalGainEur().compareTo(ZERO) < 0)
            .sorted(byCapitalGainAsc) // les plus gros perdants d'abord
            .map(this::toCandidate)
            .toList();

    BigDecimal mvLatentesTotal = candidates.stream()
            .map(c -> c.unrealizedLossEur())
            .reduce(ZERO, BigDecimal::add);

    BigDecimal compensable = pvRealisees.min(mvLatentesTotal.abs());
    BigDecimal economie = compensable.multiply(new BigDecimal("0.30")); // PFU 30%

    return new BasketAnalysis(pvRealisees, mvLatentesTotal, compensable, economie, candidates);
}
```

### 4.2 Calcul des PV réalisées de l'année

Pour chaque position concernée, parcourir ses ordres SELL de l'année et calculer la PV :

```
PV_ordre = SELL.amountEur − (SELL.quantity × prix_moyen_acquisition)

prix_moyen_acquisition = somme(BUY.amountEur jusqu'à la date du SELL)
                       / somme(BUY.quantity jusqu'à la date du SELL)
```

⚠ Cette logique est déjà dans `CryptoTaxService.runAlgorithm()` pour la CRYPTO — **réutiliser** plutôt que dupliquer. Pour les actions/ETF, étendre la même logique au CTO.

### 4.3 Calcul du nombre de parts à vendre

Pour optimisation : ne pas vendre toute la position si une partie suffit.

```
Si MV_position > PV_à_compenser :
    parts_à_vendre = parts_actuelles × (PV_à_compenser / |MV_position|)
Sinon :
    parts_à_vendre = parts_actuelles  (vendre tout)
```

---

## 5. DTOs

```java
public record TaxLossSummaryDto(
    BasketAnalysisDto cto,
    BasketAnalysisDto crypto,
    int year
) {}

public record BasketAnalysisDto(
    String basketLabel,                      // "Compte-titres ordinaire" ou "Crypto-monnaies"
    BigDecimal realizedGainsYearEur,         // PV déjà encaissées en année N
    BigDecimal totalUnrealizedLossEur,       // somme des MV latentes (négatif)
    BigDecimal compensableAmountEur,         // ce qui peut servir
    BigDecimal estimatedTaxSavingEur,        // compensable × 30%
    List<TaxLossCandidateDto> candidates
) {}

public record TaxLossCandidateDto(
    Long positionId,
    String label,
    String partner,
    AssetCategory category,
    FiscalEnvelope envelope,
    BigDecimal currentQuantity,              // parts détenues actuellement
    BigDecimal unrealizedLossEur,            // MV latente (négatif)
    BigDecimal recommendedSellQuantity,      // parts à vendre pour optimiser
    BigDecimal recommendedRealizedLossEur,   // MV qui sera réalisée
    BigDecimal estimatedTaxSavingEur         // économie sur cette position
) {}
```

---

## 6. Endpoints API

| Méthode | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/api/tax-loss-harvesting?year={year}` | Authentifié | Synthèse + candidats CTO + crypto pour l'année (défaut : année courante) |

Réponse : `TaxLossSummaryDto`.

Pas de POST/PUT — l'app ne déclenche aucune transaction.

---

## 7. Interface utilisateur

### 7.1 Page principale `TaxLossHarvestingPage`

Accessible via **Outils → Optimisation fiscale fin d'année**.

```
┌──────────────────────────────────────────────────────────┐
│  💰 Optimisation fiscale fin d'année                      │
│  Pour l'année 2026  [▾]                                  │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐        │
│  │   COMPTE-TITRES      │  │      CRYPTO          │       │
│  │   ──────────────     │  │   ──────────────    │        │
│  │   PV réalisées YTD   │  │   PV réalisées YTD   │       │
│  │   +5 000 €           │  │      +1 200 €        │       │
│  │   MV latentes        │  │   MV latentes        │       │
│  │   −7 800 €           │  │      −400 €          │       │
│  │   ──────────────     │  │   ──────────────    │        │
│  │   Économie possible  │  │   Économie possible  │       │
│  │   💡 1 500 €          │  │   💡 120 €            │      │
│  └─────────────────────┘  └─────────────────────┘        │
│                                                          │
│  📋 Candidats Compte-titres                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Position │ Détenu │ MV latente │ Vendre │ Écon. │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ ETF Z    │ 100p   │ −3 000 €   │ 100p   │ 900 €  │    │
│  │ Action Y │ 50p    │ −2 500 €   │ 50p    │ 750 €  │    │
│  │ ETF X    │ 200p   │ −2 300 €   │ 0p ⚠   │  ─    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ⚠ Pour ETF X, la PV à compenser est déjà épuisée.       │
│    Vendre malgré tout reportera la MV sur 10 ans.        │
│                                                          │
│  💡 Conseils :                                            │
│  • Attendre 15-30 jours avant rachat (recommandé)        │
│  • Compensation crypto/actions interdite (cloisonné)     │
│  • PEA et AV exclus du calcul (régimes spécifiques)      │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Bandeau saisonnier sur la page Patrimoine

Affiché entre le **1er novembre et le 31 décembre**, masqué le reste de l'année.

```
┌──────────────────────────────────────────────────────────┐
│ 💡 Vous pouvez économiser jusqu'à 1 620 € d'impôts en    │
│    vendant 2 positions en moins-value avant le 31/12.    │
│                                       Voir l'optimisation→│
└──────────────────────────────────────────────────────────┘
```

Cliquable, redirige vers la page principale. Dismissable pour la session (pas en permanence — on remontre l'année suivante).

### 7.3 Modal "détail position"

Au clic sur une ligne du tableau : modal montrant l'historique d'achats de la position, le prix moyen, et l'impact financier précis de la cession suggérée.

---

## 8. Composants frontend

```
frontend/src/components/tools/
├── TaxLossHarvestingPage.jsx        Page principale (2 cards + tableaux)
├── TaxLossBasketCard.jsx            Card synthèse CTO ou CRYPTO
├── TaxLossCandidatesTable.jsx       Tableau triable
└── TaxLossDetailModal.jsx           Modal détail position
```

Bandeau saisonnier : composant `TaxLossSeasonalBanner.jsx` à intégrer en tête de `PatrimoinePage.jsx`, conditionné par `LocalDate.now()` ∈ [Nov-1, Dec-31].

---

## 9. Cas d'usage typiques

### Cas 1 : utilisateur avec PV réalisées
*« J'ai vendu mon Apple cette année, +5 000 €. J'ai un ETF Asie en MV de 8 000 €. »*
→ App suggère : vendre toutes les parts ETF Asie qui correspondent à 5 000 € de MV, économie 1 500 €. Reste 3 000 € de MV non compensée → reportée 10 ans.

### Cas 2 : aucune PV réalisée mais MV latentes
*« Je n'ai rien vendu cette année mais mon portefeuille a perdu. »*
→ App affiche : aucune compensation immédiate possible. Si vente quand même, MV reportée sur 10 ans (utile en cas de PV future).

### Cas 3 : MV crypto vs PV actions
*« J'ai une MV sur le Bitcoin, j'ai pris une PV sur un ETF. »*
→ App **bloque** la suggestion : compensation crypto ↔ actions interdite. Affiche les 2 baskets séparément.

### Cas 4 : tout est en PEA
*« Mes seules MV sont sur mon PEA. »*
→ App n'affiche aucun candidat. Bannière explicative : « PEA exclu du calcul (régime spécifique d'exonération) ».

---

## 10. Tests à prévoir

### Backend (`TaxLossHarvestingServiceTest`)
- PV réalisées de l'année calculées correctement (cas SELL partiel, multiple BUY)
- MV latentes filtrées par enveloppe (PEA exclu)
- Cloisonnement CTO ↔ CRYPTO respecté
- `recommendedSellQuantity` calculé correctement (vente partielle)
- Aucun candidat → DTO retourné quand même avec montants à 0
- Ordre de tri des candidats (MV la plus grande en premier)

### Frontend
- Bandeau saisonnier visible entre 1er nov et 31 déc, masqué sinon
- Tableau trié par impact desc
- Modal s'ouvre avec les bonnes données
- Card "économie possible" recalculée en temps réel

### Intégration
- Scénario : créer 3 positions, 1 SELL → vérifier la suggestion via API réelle (`@SpringBootTest`)

---

## 11. Évolutions possibles (V2+)

- **Mode "barème IR"** : choix utilisateur PFU vs barème, calcul économie selon TMI
- **Historique des optimisations** : tracker les ventes effectivement faites suite à la suggestion
- **Prévision pluriannuelle** : intégration avec le report 10 ans pour suggérer dès qu'une grosse PV est réalisée
- **Notification push** (PWA) : 15 décembre, *« Plus que 16 jours pour optimiser »*
- **Export PDF** : récap des opérations à passer chez le broker
- **Intégration `CryptoTaxService`** : compatibilité avec le formulaire 2086 (déjà en place)

---

## 12. Limites et avertissements

- **Conseils indicatifs uniquement** — disclaimer obligatoire en pied de page
- L'app ne tient pas compte des frais de transaction du broker (à anticiper côté utilisateur)
- L'app ne suggère pas un instrument de remplacement après vente (éviter de jouer le rôle de conseiller en investissement)
- Si l'utilisateur a coché *option imposition au barème* (champ à ajouter sur `User`), recalcul avec son TMI
