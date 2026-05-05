# Notes de version

## v1.7.0 — 5 mai 2026

> Performance patrimoniale complète (TWR, MWR, volatilité, Sharpe, drawdown, underwater chart, comparaison N−1), historique des cours avec édition manuelle (admin), tableau de bord restructuré, contrat de location, charges courantes dans le simulateur d'emprunt et simulateurs publics sans connexion.

### ✨ Nouveautés

#### Performance patrimoniale (Patrimoine → Performance)

Nouveau module complet de mesure de la performance du patrimoine financier — accessible à tous les utilisateurs authentifiés via le menu **Patrimoine ▾**.

**Quatre indicateurs principaux** affichés en haut de page :

- **TWR annualisé** (Time-Weighted Return) — performance pure des actifs, indépendante du timing et du volume de vos versements. C'est la métrique standard pour comparer à un indice (CW8, S&P 500…).
- **MWR annualisé** (Money-Weighted Return) — performance que vous avez réellement vécue, qui intègre le timing de vos versements. Un MWR < TWR signifie que vos gros versements sont arrivés à un moment moins favorable.
- **Volatilité annualisée** — amplitude des variations mensuelles (écart-type × √12). Un portefeuille 100 % ETF monde tourne autour de 12–15 %/an ; une crypto heavy peut dépasser 40 %.
- **Ratio de Sharpe** — rendement obtenu par unité de risque pris (Sharpe > 1 = excellent, 0,5–1 = correct, < 0,5 = médiocre). Couleur dynamique : rouge < 0, ambre < 0,5, neutre < 1, vert ≥ 1.

**Sélecteur de période** avec 6 presets : **Global** (depuis le premier ordre), **YTD** (1er janvier de l'année courante), **1 an**, **3 ans**, **5 ans**, **Personnalisée** (date pickers libres). Le calcul s'adapte automatiquement.

**Performance par catégorie** (Bourse / Crypto / Livrets) — une carte par catégorie présente avec son TWR, son MWR, sa valeur actuelle et sa plus-value.

**Performance par position** — tableau groupé par **partenaire** (broker, banque, plateforme), trié par valeur décroissante. Chaque partenaire affiche ses positions par catégorie avec TWR, MWR, valeur, plus-value, et un sous-total agrégé. Style aligné sur la vue Patrimoine.

**Graphique de performance cumulée (base 100)** — courbe d'évolution de la valeur d'1 € investi au début de la période, mois par mois. Permet de visualiser la trajectoire complète sur la période sélectionnée.

**Comparaison à un benchmark** — sélecteur intégré au graphique avec deux modes :
- **Indice** : recherche d'un instrument du référentiel (CW8, S&P 500…) → TWR pur de l'instrument superposé en courbe pointillée orange
- **Taux fixe** : saisie d'un taux annuel (ex : 7 %/an correspondant à la moyenne historique du MSCI World) → courbe de croissance théorique superposée

**Profil de drawdown (underwater chart)** — graphique en aire rouge sous le graphique TWR. À chaque mois, la profondeur = (valeur − pic historique) / pic. Quand la courbe est à 0 %, le portefeuille est à son plus-haut. La largeur et la profondeur de la zone rouge révèlent la sévérité et la durée des pertes traversées — un complément visuel au KPI *Drawdown max*. Affiché uniquement si le drawdown dépasse −1 % au moins une fois.

**Toggle "vs période précédente"** — bouton discret affiché au-dessus des KPIs (toutes les périodes sauf Global). Quand il est actif, chaque carte KPI affiche en bas une ligne de comparaison : valeur de la période N−1 au même format, et delta coloré (+2,4 pt en vert, −1,0 pt en rouge). La période de référence est la même fenêtre décalée d'un an. Pour TWR/MWR/Drawdown, une hausse est favorable (vert) ; pour la Volatilité, une baisse est favorable (vert). Le second appel API se fait à la demande (lazy) et s'adapte automatiquement quand la période change.

**Décomposition du gain** dans la section Synthèse — barre empilée séparant la **plus-value de marché** (appréciation des cours) des **revenus perçus** (dividendes, intérêts, airdrops réinvestis), avec montants signés et pourcentages du versé.

**Détail mois par mois** — section dépliable qui expose le calcul Modified Dietz ligne par ligne (V_début, V_fin, flux net, Σ w·F, R_m). Permet de valider chaque sous-période contre un calcul Excel.

**Section pédagogique** dépliable en bas de page : explique TWR et MWR avec un exemple concret sur 3 ans (Alice qui investit avant la baisse vs Bob qui investit après) — pour comprendre pourquoi deux investisseurs sur le même fonds peuvent avoir des MWR radicalement différents.

#### Composants de saisie de date personnalisés

Deux nouveaux composants remplacent le calendrier natif du navigateur (souvent peu intégré au design) :

- **`DateInput`** : popover calendrier stylé Tailwind avec navigation mois/année rapide (clic sur le mois → grille des 12 mois ; clic sur l'année → grille de 12 ans, navigation par décennie).
- **`DateRangeInput`** : double calendrier indépendant (gauche = début, droite = fin) avec aperçu de plage au survol et navigation rapide identique. Phase de sélection ① / ② mise en évidence visuellement.

Les deux composants supportent `minDate` / `maxDate` pour griser les jours hors plage (utilisé dans la page Performance pour interdire les dates futures).

Les anciens `<input type="date">` du reste de l'application bénéficient d'un nouveau style global : icône calendrier teintée indigo (light + dark), font normalisée.

#### Toggles individuels de diversification (Tableau de bord)

Le panneau de personnalisation du dashboard expose désormais **un toggle indépendant par dimension** de diversification (Bourse, Crypto, Immobilier physique). Vous pouvez afficher uniquement celles qui vous intéressent au lieu d'un unique toggle global.

#### Contrat de location (Revenus → Complémentaires)

Les revenus de type **Locatif** peuvent désormais être saisis comme un contrat de bail plutôt qu'une entrée mensuelle manuelle.

- **Période du bail** : date de début, date de fin (vide = contrat en cours)
- **Jour de perception** : jour du mois de versement du loyer (1–28)
- En mode contrat, le champ "date de perception unique" est remplacé et le montant est labellisé "par mois"
- Le simulateur d'impôts calcule automatiquement le montant annuel proratisé (loyer × mois dans l'année fiscale, gestion des entrées/sorties en cours d'année)
- La liste affiche un badge "Contrat · le X" et la période du bail ; le montant est affiché avec "/mois"

#### Charges courantes dans le simulateur d'emprunt (Outils → Simulateur)

Nouvelle section "Charges courantes" dans le panneau "Charges propriétaire" :

- **4 champs** : électricité, gaz, eau, autres (ordures, internet, divers) en €/mois
- Intégrés dans le **coût mensuel total** (panneau gauche + panneau résultats)
- **Taux d'effort réel** affiché (`coût total / revenu net`) quand le revenu est renseigné
- Valeurs persistées dans les simulations sauvegardées

#### Graphique salarial annuel enrichi (Tableau de bord)

Trois cases à cocher optionnelles sur le graphique "Évolution salariale annuelle" (visibles uniquement si des données existent) :

- **Primes** (rose) : EXCEPTIONNELLE par date, ANNUELLE par mois de versement, MENSUELLE × mois actifs
- **Avantages en nature** (violet) : montant mensuel × mois actifs du contrat
- **Revenus complémentaires** (bleu) : revenus ponctuels par année, contrats locatifs × mois chevauchants

Les barres s'empilent sur le graphique. Le tooltip affiche chaque revenu complémentaire **individuellement** (label + montant), un sous-total si plusieurs sources, puis le **Total** et le **dont net d'impôt + extras** cumulés.

#### Simulateurs accessibles sans connexion

4 simulateurs utilisables librement sans créer de compte, accessibles depuis le bouton "Simulateurs" de la page d'accueil :

- **Simulateur d'emprunt** : toutes les fonctionnalités de calcul disponibles — la sauvegarde, le pré-remplissage du revenu depuis le profil et la gestion des co-emprunteurs sont masqués en mode anonyme
- **Intérêts composés** : entièrement autonome, aucune donnée de profil requise
- **Simulateur de retraite** : paramètres officiels chargés sans connexion ; le pré-remplissage depuis le contrat salarial actif est activé si connecté
- **Comparateur d'enveloppes fiscales** : la TMI est pré-remplie depuis le simulateur d'impôts si connecté, sinon saisie manuelle

Le tracking analytics fonctionne en mode anonyme (events tracés avec `user=null`).

### 🛠️ Sous le capot

#### Historique de prix et de taux de change (Administration → Instruments)

Pour permettre les calculs de performance historique, deux nouvelles tables stockent l'évolution quotidienne des cours :

- **`instrument_price_history`** — un cours par instrument et par jour (alimenté quotidiennement par le scheduler Boursorama et CoinGecko)
- **`exchange_rate_history`** — un taux par devise et par jour (alimenté quotidiennement par Frankfurter / BCE)

**Backfill manuel pour l'historique antérieur au déploiement** :
- **CRYPTO** : bouton "↻ Backfill" dans la gestion des instruments → CoinGecko remonte tout l'historique disponible
- **BOURSE** : bouton "📤 Import CSV" → import au format `date;price` (dates ISO ou françaises, décimales `,` ou `.`, tolère le copier/coller depuis Boursorama)
- **Devises** : bouton "↻ Histo" dans la modal des taux de change → Frankfurter depuis 1999

#### Correction de la conversion devise sur les ordres en devise étrangère

Bug corrigé sur les positions en devise non-EUR (USD, GBP, CHF…) : le champ `amountEur` des ordres existants contenait en réalité le montant en devise native (le taux de change n'était pas appliqué à la création de l'ordre).

Les nouveaux ordres sont désormais correctement convertis en euros au taux du jour de l'ordre. Les ordres déjà saisis avant la correction ont été recalculés rétroactivement.

### 🐛 Corrections

- **Vue Patrimoine — alignement des boutons** : dans un groupe mixte (ex : LIVRET + BOURSE), la colonne "Taux" était présente dans le header mais absente des lignes BOURSE, décalant les boutons vers la gauche. Les boutons sont maintenant correctement alignés à droite quelle que soit la catégorie.

---

## v1.6.0 — 2 mai 2026 — Stratégie patrimoniale V2, analytics et export CSV

> Objectifs de diversification multi-dimensions pour la Bourse, la Crypto et l'Immobilier, section Objectifs & Stratégie dans le tableau de bord, KPI IMMO, classification des instruments crypto, liaison revenus locatifs, analytics d'usage, export CSV et gestion du compte.

### ✨ Nouveautés

#### Objectifs de diversification multi-dimensions (Patrimoine → Stratégie & Objectifs)

La modal Stratégie permet de définir des **répartitions cibles** par dimension pour chaque catégorie d'actifs :

**Bourse — 5 dimensions :**
- **Sectoriel** (Technology, Healthcare…) — basé sur les allocations sectorielles des instruments
- **Géographique** (FR, US…) — basé sur les allocations pays des instruments
- **Continental** (Europe, Amérique du Nord, Asie…) — agrégation automatique depuis les pays
- **Devise** (EUR, USD…)
- **Type d'actif** (ETF, ACTION, OBLIGATION…)

**Crypto — 3 dimensions :**
- **Type de crypto** (Stablecoin, Store of Value, Smart Contract, Layer 2, DeFi…)
- **Réseau / Blockchain** (Bitcoin, Ethereum, Solana, Polygon…)
- **Par instrument** (BTC, ETH, SOL…) — suggestions tirées de votre portefeuille en temps réel

**Immobilier physique :**
- **Utilisation du bien** (Résidence principale, Locatif, Secondaire…)

**Liquidités / Livrets — plafond :**
- Montant maximum à ne pas dépasser par catégorie — alerte sur la carte si le plafond est atteint

Pour chaque dimension : saisie en pourcentages avec total live, suggestions automatiques depuis le portefeuille, panel comparatif réel vs cible avec écart colorisé (vert ≤ 2 pts, indigo ≤ 5 pts, ambre ≤ 10 pts, rouge au-delà).

#### Section Objectifs & Stratégie dans le tableau de bord

Nouvelle section dans le tableau de bord regroupant les widgets stratégiques :

- **Score patrimonial** et **Radar stratégie** — déplacés depuis la section Patrimoine
- **KPI Immobilier** : jauges avec cibles configurables pour le rendement brut locatif, le ratio LTV et le rendement des SCPI
- **Diversification** : donuts BOURSE, CRYPTO et IMMO_PHYSIQUE affichés uniquement si des objectifs sont configurés

La section est personnalisable (4 toggles indépendants dans le panneau de personnalisation).

#### KPI Immobilier (Patrimoine → Stratégie & Objectifs → IMMO)

Définissez des objectifs chiffrés sur vos actifs immobiliers :

- **Rendement brut locatif** : loyers annuels / valeur du bien — calculé automatiquement depuis les revenus LOCATIF associés
- **Ratio LTV** : capital restant dû / valeur estimée — calculé depuis les dettes liées
- **Rendement SCPI** — objectif de distribution attendu

#### Liaison revenus locatifs → bien immobilier physique

Les revenus de type LOCATIF peuvent désormais être rattachés à un bien IMMO_PHYSIQUE précis.

- **Sélection du bien** dans le formulaire de saisie d'un revenu locatif
- Le lien est utilisé pour calculer le **rendement brut locatif** du bien dans les KPI IMMO
- La suppression d'un bien détache proprement les revenus associés (pas de perte de données)

#### Utilisation du bien (Patrimoine → Positions IMMO)

Les positions IMMO_PHYSIQUE disposent d'un nouveau champ **Utilisation du bien** :
Résidence principale, Locatif, Résidence secondaire / Loisirs, Autre.

#### Classification des instruments crypto (Administration → Instruments)

Deux nouveaux champs optionnels sur les instruments CRYPTO :

- **Type** : Stablecoin, Store of Value, Smart Contract, Layer 2, DeFi, Autre
- **Réseau** : Bitcoin, Ethereum, Solana, Polygon, Avalanche, BNB Chain, Arbitrum, Optimism, Base, Autre

Ces champs alimentent les dimensions de diversification CRYPTO.

#### Export CSV du patrimoine (Patrimoine → Export CSV)

Exportez vos données de patrimoine en un clic depuis la page Patrimoine.

- **Deux modes** : tout exporter (toutes positions + mouvements) ou sélectionner manuellement les positions à inclure
- **Toggle positions clôturées** : incluez ou excluez les positions fermées dans l'export
- **Deux fichiers générés** simultanément :
  - `positions_YYYY-MM-DD.csv` — une ligne par position avec nom, catégorie, enveloppe, valeur actuelle, investi, plus-value, ISIN/ticker, propriété…
  - `mouvements_YYYY-MM-DD.csv` — une ligne par mouvement (achat, vente, dépôt…) avec date, quantité, prix, frais, taux de change, notes
- **Compatible Excel** directement : séparateur point-virgule, encodage UTF-8, décimales avec virgule

#### Suppression de compte et de données (Mon profil → Zone de danger)

La zone de danger du profil propose deux options de suppression distinctes.

- **Supprimer uniquement mes données** : efface l'ensemble des données (positions, mouvements, revenus, dépenses, dettes, simulations…) sans supprimer le compte
- **Supprimer mon compte et mes données** : suppression définitive et complète du compte utilisateur
- **Confirmation en 2 étapes** : résumé des éléments concernés par catégorie, case à cocher, puis saisie de l'identifiant

#### Contrats à temps partiel (Revenus → Salariat)

Il est maintenant possible de déclarer un contrat à **temps partiel** en précisant la quotité de travail.

- **Saisie du salaire en ETP** : le salaire (ou l'indice majoré pour les contrats publics) est toujours saisi en équivalent temps plein — la quotité s'applique automatiquement
- **Quotité au % près** : de 10 % à 100 % (ex : 70 % = 7/10e, 80 % = 4/5e, 50 % = mi-temps)
- **Badge orange** dans l'en-tête du contrat, visible uniquement si la quotité est inférieure à 100 %
- **Projections cohérentes** : brut mensuel, net imposable, net d'impôt, taux horaire/journalier — tous calculés sur le brut temps partiel réel

#### Analytics d'usage (Administration → Analytics)

Système de suivi du comportement utilisateur et de la santé technique, 100 % auto-hébergé.

- **Page admin Analytics** (3 onglets) :
  - **Engagement** : top features, top boutons, pages les plus vues, filtres de recherche, timeline d'un event au clic, indicateurs de tendance
  - **Parcours** : reconstitution de la session d'un utilisateur — timeline unifiée mélangeant événements et erreurs dans l'ordre chronologique
  - **Santé** : KPIs d'erreurs, graphique erreurs/jour, tableau groupé par type d'erreur avec stack trace et sessions concernées
- **Session ID copiable** depuis les erreurs, avec lien direct vers l'onglet Parcours
- **Nettoyage manuel** : sélection du seuil de rétention (events et erreurs séparément) + option "Tout supprimer"
- **Opt-out** dans Mon profil avec détail des types d'actions suivies
- **Instrumentation complète** : 26 pages, toutes les actions CRUD, soumissions de formulaires, toggles

#### Patrimoine — Allocations géographiques et sectorielles en vue groupée

- **Tooltip géographique** sur chaque position en vue groupée : répartition par pays chargée depuis le référentiel instruments
- **Tooltip sectoriel** : répartition par secteur d'activité
- Chargement optimisé en lot (batch) pour éviter les requêtes individuelles par position

### 🐛 Corrections

- **Pied de page** : le numéro de version est désormais toujours visible dès le premier rendu, sans attendre la réponse de l'API `/api/version`
- **Mise à jour automatique des cours** : correction de la récupération des prix Boursorama après migration d'URL (suivi des redirections HTTP 301)
- **Suppression d'un bien IMMO_PHYSIQUE** : ne provoque plus d'erreur si des revenus LOCATIF y sont rattachés — le lien est nettoyé proprement avant suppression

---

## v1.5.0 — 1 mai 2026 — Simulateurs, responsive mobile et améliorations revenus

> Cette version introduit deux nouveaux simulateurs patrimoniaux, une mise en conformité complète sur mobile, des améliorations significatives de la gestion des revenus salariaux, et un audit complet du mode sombre.

### ✨ Nouveautés

#### Comparateur d'enveloppes fiscales (Outils → Enveloppes fiscales)

Répondez à la question : *« Pour un même investissement, quelle enveloppe me laisse le plus d'argent après impôts ? »*

- **4 enveloppes comparées** : PEA, CTO, Assurance-vie et PER — chacune avec ses règles fiscales propres
- **Rendements différenciés par enveloppe** : un slider par enveloppe (CTO/PEA → actions monde, AV → mix fonds euros + UC, PER → profil équilibré) ou un mode « même taux partout » pour isoler l'impact fiscal pur
- **Fiscalité complète** : exonération IR PEA après 5 ans, abattement AV après 8 ans (4 600 € / 9 200 €), déduction TMI à l'entrée du PER avec taxation à la sortie au barème retraite, PFU 30 % ou option barème
- **Réinvestissement de l'économie d'impôt PER** : l'économie fiscale annuelle est capitalisée séparément et comparée nette de PFU — donne une vision équitable de l'avantage PER
- **Profil fiscal pré-rempli** depuis votre simulateur d'impôts (TMI actuelle et à la retraite)
- **Frais d'enveloppe paramétrables** par enveloppe (frais de gestion UC typiques : 0,6 %/an)
- **Graphique d'évolution** du capital brut sur la durée + comparaison par jalons (5 / 10 / 20 ans)
- **Tableau récapitulatif** : capital brut, frais cumulés, économie fiscale à l'entrée, impôt à la sortie, capital net et rendement brut par enveloppe
- **Tooltips pédagogiques** sur chaque concept : TMI, PFU vs barème, abattement AV, plafond PEA, plafond PER, dividendes CTO, réinvestissement éco. PER

#### Simulateur Retraite (Outils → Simulateur retraite)

Estimez votre future pension et planifiez l'effort d'épargne PER pour combler le manque.

- **Régime Général + Agirc-Arrco (privé)** : SAM sur les 25 meilleures années plafonnées au PASS, taux de liquidation 50 % au taux plein, points Agirc-Arrco accumulés sur la carrière, coefficient de solidarité −10 % si départ sans surcote
- **CNRACL + RAFP (fonction publique)** : pension calculée sur l'indice majoré des 6 derniers mois × 75 % au taux plein, RAFP forfaitaire
- **Décote/surcote** : 1,25 %/trimestre manquant ou supplémentaire, barèmes 2023 par génération
- **Pré-remplissage automatique** : date de naissance, type de contrat, salaire/indice majoré depuis le contrat salarial actif, TMI depuis le simulateur d'impôts
- **Comparaison 4 âges de départ** (60 / 62 / 64 / 67 ans) : trimestres validés, pension nette, taux de remplacement, capital PER nécessaire, verdict
- **Graphique** évolution des revenus nets (salaire actif → pension, avec ligne de départ retraite)
- **Bloc PER** : capital cible et versement mensuel calculés pour combler le delta entre pension et objectif (taux de remplacement % ou montant mensuel fixe)
- **Tooltips pédagogiques** sur tous les concepts : trimestres, SAM, PASS, Agirc-Arrco, coefficient de solidarité, RAFP, taux de remplacement, règle des 4 %…

#### Primes mensuelles (Revenus → Salariat → Primes)

Un nouveau type de prime **Mensuelle** est disponible en complément des primes Annuelles et Exceptionnelles.

- **Montant mensuel brut** saisi directement (ex. : prime transport, astreinte mensuelle)
- **Période de validité** : date de début obligatoire + date de fin optionnelle — si aucune date de fin, la prime est considérée comme indéfinie
- **Indicateur actif/terminé** : point vert si la prime est en cours, gris si expirée
- **Projection automatique** : les primes mensuelles actives sont intégrées dans les projections de revenus (équivalent annuel ×12) ; les primes expirées sont exclues
- **Totaux séparés** dans le panneau primes : total annuel (primes Annuelles) et total mensuel (primes Mensuelles)

#### Consultation et édition manuelle de l'historique des cours (Admin → Instruments)

Bouton **📊 Consulter** sur chaque ligne de la colonne "Historique" dans la page admin des instruments. Ouvre une modal dédiée pour visualiser, compléter et corriger l'historique de prix d'un instrument.

**Modal "Historique des cours" :**
- **Sélecteur de plage** libre (défaut : 12 derniers mois) avec bouton Charger
- **Graphique Recharts** (LineChart) montrant l'évolution du cours sur la période
- **Détection automatique des trous** : bannière amber listant les intervalles > 7 jours consécutifs sans cours
- **Tableau des entrées** en ordre décroissant : date | prix | badge source (BOURSORAMA / COINGECKO / MANUAL_CSV / MANUAL) | éditer | supprimer
- **Édition inline** : cliquer sur ✏ rend le prix éditable directement dans la ligne (Entrée = valide, Échap = annule) — source passe à `MANUAL`
- **Formulaire d'ajout** : saisie date + prix → upsert, la source est automatiquement `MANUAL`
- À la fermeture, rafraîchit le résumé "Historique" si des modifications ont eu lieu

**Backend :** 3 nouveaux endpoints ADMIN sur `AdminBackfillController` :
- `GET /api/admin/instruments/{id}/price-history?from=&to=`
- `PUT /api/admin/instruments/{id}/price-history/{date}` — upsert (source = MANUAL)
- `DELETE /api/admin/instruments/{id}/price-history/{date}`

**Tests :** +9 backend (4 service + 5 controller) · 929 tests total

### 🔧 Améliorations

#### Performance patrimoniale — suppression du warning "premier mois exclu"
Le message *"Mois de YYYY-MM exclu du chaînage TWR : c'est le mois du premier versement"* n'apparaît plus dans la section Avertissements. C'est un comportement intentionnel de la formule (V_début = 0 est instable), pas une anomalie. La date de début effective reste visible dans la section Synthèse.

#### Tableau de bord — graphique Évolution du patrimoine extensible
Le graphique occupe désormais toute la hauteur disponible de sa carte (flex-grow + `height="100%"` sur le `ResponsiveContainer`), s'adaptant naturellement à la hauteur des widgets FIRE et Performance YTD empilés à droite. Fin de l'espace blanc inutilisé sous le graphique.

#### Responsive mobile — mise en conformité complète
- **Modals** : pattern *bottom drawer* sur toutes les modals (glisse depuis le bas sur mobile, centrée sur desktop) avec `z-60` au-dessus de la navigation
- **Tableaux** : scroll horizontal + colonnes secondaires masquées sur mobile sur toutes les pages
- **Formulaires** : champs empilés en 1 colonne sur mobile (fin de la mise en page serrée sur petit écran)
- **Simulateurs** : layouts 2 panneaux corrigés, sections "Comparaison de scénarios" masquées quand inutilisables sur mobile
- **Montants** : `fmt()` limité à 2 décimales (plus de "2 995,081 €")
- **Simulateur de crise** — Impact par catégorie : labels longs sur ligne dédiée, montants compacts (`k€`)
- **Widget Matelas de sécurité** : les montants répondent désormais au toggle "masquer les valeurs"

#### Dark mode — contraste et accessibilité
- **Badges colorés** : les textes sur fonds colorés translucides (indigo, amber, green, red, blue, orange, teal, violet, purple) sont maintenant lisibles en mode sombre — `dark:text-{color}-300` sur tous les badges concernés dans 16 fichiers
- **Accessibilité daltoniens** : les badges d'écart dans les bulletins de paie affichent désormais ▲ (positif) et ▼ (négatif) en complément de la couleur rouge/vert
- **Toggle React uniquement** : le mode sombre répond désormais uniquement au toggle de l'application — fin du changement automatique selon la préférence OS (OS scheduled dark mode)

#### Bulletins de paie — comparaison historique
- Les colonnes **« vs théorique »** (brut et net) comparent désormais avec le salaire **en vigueur au moment du bulletin**, et non plus avec le salaire actuel du contrat
- Pour chaque bulletin, la révision salariale active à sa date est automatiquement sélectionnée — si aucune révision n'était en vigueur, c'est le salaire de base du contrat qui sert de référence

#### Landing page — refonte visuelle
- **Screenshot hero** : capture du tableau de bord intégrée sous les boutons d'action
- **Carousel** : 5 captures de l'application (Patrimoine, Évolution, Bilan financier, Simulateur d'impôts, Dépenses) avec transition fondu, barre de progression 5 secondes et dots animés
- **Simulateurs** : liste des 9 outils disponibles en grille avec description courte
- **Étapes de démarrage** : ligne pointillée reliant les 3 étapes sur desktop
- **Notes de version** : lien accessible depuis le footer avant connexion
- **Footer** : numéro de version affiché dynamiquement
- **PWA** : icônes carrées (180 / 167 / 152 / 192 / 512 px), splash screens iOS pour 11 résolutions (iPhone SE → iPad Pro 13"), métadonnées Open Graph, `application-name`, `format-detection`

#### Page Contact — refonte
- Avatar agrandi (80 px) avec bordure indigo et barre de couleur en haut de carte
- Liens de contact en blocs pleine largeur (cible tap mobile confortable)
- Bouton "Copier" l'adresse email avec retour visuel ✓
- Icônes SVG officielles LinkedIn et GitHub (couleurs de marque)
- Bouton "← Retour" dans le header et lien "← Accueil" dans le footer
- Padding adaptatif `p-5 md:p-8` sur mobile

### 🐛 Corrections

- **Projections contrats PUBLIC avec révision d'indice** : l'indice majoré (IM) de la révision active était ignoré — le calcul utilisait toujours l'IM de base du contrat même après un avancement d'échelon
- **Modales de contrat salarial en dark mode** : les modales "Modifier le contrat" (privé, public, choix du type) apparaissaient en blanc en mode sombre à cause d'une classe `dark:bg-gray-800` qui écrasait les variables CSS du thème
- **Révision salariale** : la modale de création/modification apparaissait également en blanc en dark mode (même cause)

---

## v1.4.0 — 28 avril 2026 — Lombard, contrats publics, personnalisation et sécurité

> Cette version introduit le support des contrats de la **fonction publique**, un nouveau simulateur de crédit Lombard, des outils de personnalisation du tableau de bord, et plusieurs améliorations de transparence et de sécurité.

### ✨ Nouveautés

#### Contrats fonction publique (Revenus → Salariat)

Il est maintenant possible de saisir un contrat de la **fonction publique** en plus des contrats d'entreprise privée.

À la création d'un contrat, un écran de sélection propose :
- 🏢 **Entreprise privée** — formulaire habituel (salaire brut annuel)
- 🏛️ **Fonction publique** — nouveau formulaire dédié

Pour les contrats publics, le salaire n'est pas saisi directement : vous renseignez votre **indice majoré (IM)** et l'application calcule automatiquement le traitement brut annuel en appliquant la **valeur du point d'indice** en vigueur à la date du contrat. L'historique complet des revalorisations depuis 2002 est intégré.

- Deux statuts supportés : **Titulaire** (cotisations CNRACL + CSG spécifiques) et **Contractuel** (régime général comme le privé)
- Un aperçu du brut calculé s'affiche en temps réel sous le champ indice
- Les **révisions salariales** fonctionnent de la même façon : saisissez le nouvel indice majoré et le brut est recalculé automatiquement à la date d'entrée en vigueur

#### Simulateur de crédit Lombard (Outils → Simulateur de crédit Lombard)

Empruntez en mettant votre portefeuille en collatéral, sans vendre vos actifs.

- **3 scénarios LTV** (Prudent / Réaliste / Optimiste) + mode personnalisé éditable par catégorie
- Modes **In fine** ou **Amortissable** avec mensualité, coût total et tableau d'amortissement
- **Effet de levier** : simule le réinvestissement du capital emprunté et compare gain net (après PFU) au coût des intérêts
- **Sensibilité aux taux variables** : impact d'une variation EURIBOR de ±3 points
- **Comparaison parallèle** des 3 scénarios LTV pour un même projet
- **Stress test couplé au levier** : applique les chutes de marché historiques (2008, COVID, dot-com, Crypto Winter) et révèle l'effet boule de neige (margin call + perte sur réinvestissement)
- **Vente vs Lombard** : calcul d'imposition plus-value et manque à gagner sur rendement attendu
- **Tooltips pédagogiques** sur tous les concepts clés (LTV, margin call, in fine, PFU…)

#### Widget Patrimoine net (Tableau de bord)

Vue synthétique brut / dettes / net avec :

- Δ depuis le dernier relevé (badge vert/rouge)
- Barre d'endettement avec seuil 33 %
- Détail des dettes : libellé, type, capital restant, mensualité, progression de remboursement, date de libération

#### Personnalisation du tableau de bord

Bouton **Personnaliser** en haut du dashboard pour activer/désactiver chaque widget. Vos préférences sont sauvegardées localement.

#### Score patrimonial : axe Optimisation fiscale

L'axe « Cohérence âge/risque » est remplacé par **Optimisation fiscale** : mesure la part de BOURSE / IMMO_PAPIER placée en enveloppe avantageuse (PEA, AV, PEE) plutôt qu'en CTO. Plus actionnable et indépendant de votre âge.

#### Performance patrimoniale — TWR / MWR (Administration, en travaux)

Une nouvelle page de **mesure du rendement annualisé** du patrimoine financier est disponible dans le menu Administration (réservée aux administrateurs, fonctionnalité en cours de développement).

- **TWR** (Time-Weighted Return) : performance pure de l'actif, neutralise les versements — comparable à un benchmark
- **MWR** (Money-Weighted Return / XIRR) : rendement réellement vécu, tient compte du timing de vos investissements
- Sélecteur de période : Globale, YTD, 1 an, 3 ans, 5 ans
- Graphique d'évolution du TWR cumulé vs un benchmark de référence configurable (ex. 8 %/an)
- Tableaux par catégorie (Bourse, Crypto, Immo papier, Livret) et par position triés par performance
- ⚠️ Les calculs s'appuient sur vos relevés mensuels — la précision dépend de leur régularité

### 🎨 Améliorations

- **Tooltips explicatifs** dans Mon Profil : chaque champ (informations personnelles, profil fiscal, matelas de sécurité) explique où la donnée est utilisée dans l'application
- **Masquage automatique** des sections du Dashboard sans données : si vous n'avez pas de bulletins de paie, dépenses ou passifs, les widgets correspondants ne s'affichent plus
- **Mode "masquer les valeurs"** étendu à la déclaration de patrimoine et au simulateur de crise — toutes les valeurs monétaires sont désormais floutées
- **Diversification patrimoniale** : les liquidités (compte courant) ne sont plus comptées comme une catégorie de diversification — focus sur les vrais investissements
- **Duplication d'un bulletin de paie** : bouton « Dupliquer » sur chaque ligne du panneau bulletins — ouvre la modal de saisie pré-remplie avec les montants du bulletin existant, seule la période reste à sélectionner
- **Saisie du brut annuel au centime** : le champ « Salaire brut annuel » du formulaire contrat n'est plus limité aux multiples de 100 €

### 🔒 Sécurité

- Renforcement des en-têtes HTTP (`Referrer-Policy`, `Permissions-Policy`)
- Anti-énumération sur les invitations de groupe familial
- Cookie de session forcé en `Secure=true` en production
- Protection contre l'injection SSRF via les symboles Boursorama
- Validation et bornage des champs sur 22 DTOs (Create / Update)
- Audit trail admin sur 15 actions sensibles

### 🐛 Corrections

- **Comparaison « vs théorique » du Net versé** dans les bulletins de paie : le badge d'écart était toujours vide car le code comparait à un champ inexistant (`monthlyNetSalary`) au lieu du bon champ (`monthlyNetAfterTax`)
- **Suppression d'un contrat salarial** : correction de l'erreur "No EntityManager" qui empêchait la suppression lorsque le contrat avait des révisions associées
- **Suppression d'une dette** : correction de la même erreur "No EntityManager"
- **Pages d'erreur 500** : les ressources statiques manquantes renvoient désormais un 404 silencieux

### 🛠 Sous le capot

- **JaCoCo** ajouté pour la couverture de tests backend (rapport HTML, seuil 70 % lignes / 60 % branches)
- **Maven Surefire Report** pour le rapport HTML d'exécution des tests
- 746 tests backend + 923 tests frontend

---

## v1.3.0 — 27 avril 2026 — Mode nuit, audit sécurité et frais réels détaillés

> Version riche en améliorations transversales : mode sombre, audit de sécurité complet, déclaration de frais réels, et refactor frontend en profondeur.

### ✨ Nouveautés

#### Mode nuit (dark mode)

Toggle lune/soleil dans la barre de navigation. Le thème sombre s'applique à toute l'application et est persisté localement (avec détection automatique de la préférence système au premier accès).

#### Frais réels détaillés (Mon Profil → Profil fiscal)

Saisie complète des frais professionnels avec barème kilométrique fiscal automatique :

- Transport véhicule (CV fiscal, électrique avec ×1.20)
- Transport en commun, frais de repas (calcul automatique avec déduction tickets-restaurant), télétravail (allocation employeur)
- Vêtements pro, formation, matériel, téléphone, double résidence
- **Comparaison forfait 10 % vs frais réels** en temps réel pour savoir lequel est plus avantageux

#### Sauvegarde des simulations d'emprunt

Les simulations d'emprunt immobilier sont désormais persistées en base. Bouton "Sauvegarder" pour nommer une simulation, "Mes simulations" pour les charger ou supprimer.

#### Affichage de la version

Le numéro de version de l'application est affiché dans le pied de page (desktop) et au bas du menu mobile.

### 🎨 Améliorations

- **Investissement locatif** dans le simulateur d'emprunt — calcul du rendement net, comparaison achat vs location, projection sur 30 ans
- **Champ Instrument obligatoire** lors de la création d'une position BOURSE/CRYPTO

### 🔒 Sécurité

Audit de sécurité complet — 15 vulnérabilités identifiées et corrigées :

- **Critiques** : mot de passe admin initial via env var, anti-énumération de comptes au /register, rate-limit IP sur /register et /login, cookie XSRF explicite
- **Élevées** : restriction PUT /api/instruments/{id} aux ADMIN, validation des entrées sur /api/profile/*, récupération des vraies IPs derrière le proxy, bornage des Map/List
- **Modérées** : politique de mot de passe renforcée, contrôle de session concurrente + timeout 4h, blocage Swagger UI hors profil dev, validation /login sans username, purge des hashs après approve/reject

### 🐛 Corrections

- **Simulateur d'impôts** : rechargement de l'utilisateur depuis la base à chaque simulation (les modifications de profil fiscal étaient parfois ignorées)
- **Gestion d'erreurs API** : `AccessDeniedException` et `MethodArgumentNotValidException` retournent désormais des codes HTTP appropriés

### 🛠 Sous le capot

- Refactor frontend en 3 phases — abstractions partagées (`useCrud`, composants communs), migration de tous les modules CRUD, restructuration des grosses pages (PatrimoinePage, LoanSimulatorPage)
- Stack de tests Vitest + React Testing Library installée (880 tests Vitest)
- 514 → 706 tests backend, 0 → 880 tests frontend
- Documentation : refonte complète des diagrammes Mermaid, audit `docs/api/` et `docs/architecture/`, création de `docs/architecture/tools/`

---

## v1.2.1 — 26 avril 2026 — Correctifs

### 🐛 Corrections

- Mise à jour des tests `ProfileService` et `ProfileController` après l'introduction du profil self-service (tests cassés silencieusement par la v1.2.0)

---

## v1.2.0 — 26 avril 2026 — Profil self-service et investissement locatif

> L'utilisateur peut désormais éditer son profil sans passer par un admin, et le simulateur d'emprunt s'enrichit d'une analyse d'investissement locatif.

### ✨ Nouveautés

#### Profil self-service (Mon Profil)

Édition autonome des informations personnelles et du profil fiscal sans intervention d'un administrateur :

- **Informations personnelles** : prénom, nom, date de naissance, commune et code postal de naissance, poste actuel
- **Profil fiscal** : nombre de parts fiscales, mode de déduction (forfait 10 % ou frais réels)

#### Investissement locatif (Simulateur d'emprunt)

Section dédiée à l'analyse de rentabilité d'un projet locatif :

- Loyer mensuel, charges, taxe foncière, vacance locative
- Régime fiscal (micro-foncier, réel)
- **Cash-flow mensuel** et **rendement net** affichés en temps réel
- Comparaison achat-revente vs location-location sur la durée du prêt

---

## v1.1.1 — 25 avril 2026 — Correctifs

### 🐛 Corrections

- **Documentation** : correction des chemins d'images dans la documentation utilisateur
- **Authentification** : l'erreur 401 sur l'endpoint `/api/auth/login` n'est plus interceptée par le gestionnaire global (n'affichait plus le message "Identifiants incorrects")

---

## v1.1.0 — 25 avril 2026 — Lancement officiel

> Première version stable de MyFinance, application personnelle de gestion de finances et de patrimoine, déployée sur NAS QNAP en réseau local.

### ✨ Fonctionnalités principales au lancement

#### Authentification et utilisateurs

- Connexion par session cookie + BCrypt
- CRUD utilisateurs réservé aux administrateurs
- Changement de mot de passe self-service

#### Gestion des revenus

- **Contrats salariaux** avec révisions, primes (exceptionnelles et annuelles), avantages en nature et astreintes
- **Calcul du net imposable réel** via cotisations légales 2025, statut cadre/non-cadre et option prévoyance
- **Bulletins de paie mensuels** réels (saisie manuelle)
- **Revenus complémentaires** (locatifs, dividendes, aides sociales, autres) avec leurs paramètres fiscaux

#### Simulateur des impôts (IRPP)

- Barème progressif officiel et quotient familial
- Choix de la source salariale (projection contrat ou bulletins réels)
- Sélection des revenus complémentaires à inclure
- **Affichage de l'impôt mensuel estimé** (montant annuel ÷ 12)

#### Patrimoine

- Positions (BOURSE, CRYPTO, IMMO_PAPIER, IMMO_PHYSIQUE, LIVRET, LIQUIDITE) avec instruments financiers
- Ordres d'achat/vente avec calcul automatique du prix moyen pondéré et de la plus-value latente
- Relevés mensuels (snapshots) pour suivre l'évolution dans le temps

#### Interface

- Application web responsive (Tailwind CSS v4)
- Tableau de bord avec graphiques Recharts (évolution salariale, projection FIRE, répartition patrimoniale)
- Architecture monorepo (`backend/` Spring Boot 3.5 + `frontend/` React/Vite)

### 🛠 Sous le capot

- Java 17, Spring Boot 3.5, SQLite (mono-utilisateur)
- React 18 + Vite, Tailwind CSS v4
- Documentation architecture et API dans `docs/`
- Premiers tests unitaires backend (UserService, UserController, services revenus et impôts)

---
