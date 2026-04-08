# Architecture Investment Tracker

Cette page décrit l’architecture de l’application **MyFinance** et de ses fonctionnalités

## 1. Description générale

- Application web personnelle pour gérer un portefeuille d’investissements.
- Frontend en **React 19**.
- Backend en **Spring Boot 3.5 / Java 17**.
- Base de données **SQLite** locale.
- Scheduler pour mise à jour automatique des données boursière et crypto-currency

## 2. Diagramme d’architecture

Le diagramme suivant décrit la structure et logique applicative de MyFinance.

```mermaid
%% Contenu copié depuis docs/architecture/diagram/activity-diagram.mmd
mindmap
  root((MyFinance))
    Gestion des utilisateurs
        Créer un utilisateur
        Modifier un utilisateur
        Supprimer un utilisateur
        Créer un regroupement famillial
    Gestion du patrimoine
        Choisir la consultation personnelle ou de regroupement famillial
        Actualisation manuelle d'une position
            Modification d'une position existante
            Création d'une position
            Fermeture d'une position
        Ajouter une source de revenue
    Gestion des automatisation
        Saisir une position a suivre
            Crypto-monnaie
            Bourse
        Suivi automatisé
            Analyse des cours de crypto-monnaie
            Analyse des cours de bourses
    Consultation des positions
        Graphique du patrimoine brut
        Graphique du patrimoine net
        Graphique des plus value
        Graphique de la diversification par secteur de marché
        Graphique de diversification par secteur géographique
        Graphique du suivi des revenues
        Graphique du suivi des dépenses
    Importation de données
        Format Json
    Exportation de données
        Format Json
        Format Excel
````

## Description fonctionnelle

MyFinance à pour objectif de permettre a ses utilisateurs de gérer son patrimoine financier et toutes les actions associées.

### Gestion des utilisateurs

Les droits associés à chaque utilisateurs est décrit dans la section de [gestion des utilisateurs](/docs/architecture/userManagement.md).

### Gestion du patrimoine

Chaque utilisateur à la possibilité de gérer son patrmoine personnelle ou celui de son regroupement familial.

#### Actualisation manuel d'une position

Chaque utilisateurs ont la possibilité de saisir manuellement des ordres et positions pris. Ces positions sont ensuite intégré afin de calculé les impacts sur le patrimoine de l'utilisateur et sa valorisation.

Une Position est un ordre d'achat ou de vente sur une entité financière. Cette ordre peut etre créditeur ou débiteur.

##### Création d'une position

```mermaid
%% Contenu copié depuis docs/architecture/diagram/activity-asset-management-add-diagram.mmd
stateDiagram 
%% state
    state "Choisi un type de position" as chooseType
    state "Type de position" as if_typeOfPosition 

    state "Saisie un titre" as chooseTitle
    state "Saisie une valeur" as chooseValue
    state "Saisie une quantité" as chooseQuantity
    state "Liste des ISBN existants" as listOfExistingISBN
    state "Saisie un nouveau ISBN" as setISBN
    state "Liste des Token existants" as listOfExistingToken
    state "Saisie un nouveau Token" as setToken
    state "Date d'exécution" as chooseDateExecution
    state "Verification des données saisies" as verifyData
    state "Sauvegarde de la position" as saveData
    state "Erreur de saisies" as errorFromUser


    [*] --> chooseType
    chooseType --> if_typeOfPosition
    if_typeOfPosition --> listOfExistingISBN: type = Bourse
    listOfExistingISBN --> setISBN : Création d'un ISBN
    listOfExistingISBN --> chooseTitle : Réutilisation d'un ISBN existant
    setISBN --> chooseTitle

    if_typeOfPosition --> listOfExistingToken : type = Crypto-monnaie
    listOfExistingToken --> setToken : Création d'un Token
    listOfExistingToken --> chooseTitle : Réutilisation d'un Token existant
    setToken --> chooseTitle

    if_typeOfPosition --> chooseTitle : type = Autresx
    chooseTitle --> chooseValue
    chooseValue --> chooseQuantity
    chooseQuantity --> chooseDateExecution
    chooseDateExecution --> verifyData
    verifyData --> saveData : OK
    verifyData --> errorFromUser : KO
    
    
     saveData--> [*]
     errorFromUser--> chooseType
```


Structure d'une de position :
```mermaid
%% Extrait du contenu copié depuis /docs/architecture/diagram/class-diagram.mmd
classDiagram
    class Ordre {
        +Integer userId
        +DateTime createdAt
        +DateTime dateOfExecution
        +TypeEnum type
        +String token
        +String isbn
        +String title
        +Float value
        +float quantity

    }

    class TypeEnum {
        +String libelle
    }

    class Isbn {
        +String id
        +String name
        +String title
    }

    class Token {
        +String id
        +String name
        +String trigramme
    }

    Ordre *-- Isbn
    Ordre *-- TypeEnum
    Ordre *-- Token
```

##### Modification d'une position

Les utilisateurs peuvent modifier une position prise a n'importe quel moment. Suite a ces modifications et la validation de celle-ci, le système réintegre les éléments calculé a partir de cette mise à jour.
```mermaid
%% Contenu copié depuis docs/architecture/diagram/activity-asset-management-edit-diagram.mmd
stateDiagram
    direction LR
    %% state
    state "Selection d'une position" as selectOrder
    state "Modifier une information" as modifyOrder
    state "Verification des données" as verifyModifyOrder
    state "Erreur de saisies" as errorFromUser
    state "Sauvegarde de la modification" as saveOrder

    [*] --> selectOrder
    selectOrder --> modifyOrder
    modifyOrder --> verifyModifyOrder
    verifyModifyOrder --> saveOrder : OK
    verifyModifyOrder --> errorFromUser : KO
    errorFromUser --> selectOrder
    saveOrder --> [*]
```

##### Suppression d'une position

Les utilisateurs peuvent supprimer une position prise à n'importe quel moment. Suite a cette suppression, le systeme recalculs les données.

```mermaid
%% Contenu copié depuis docs/architecture/diagram/activity-asset-management-delete-diagram.mmd
stateDiagram
    direction LR
    %% state
    state "Selection d'une position" as selectOrder
    state "Demande de suppression d'une position" as askDeleteOrder
    state "Annulation de la suppression" as cancelDeleteAction
    state "Confirmation de suppression" as validateDeleteOrder
    state "Suppression de la position" as deleteOrder


    [*] --> selectOrder
    selectOrder --> askDeleteOrder
    askDeleteOrder --> validateDeleteOrder
    askDeleteOrder --> cancelDeleteAction
    cancelDeleteAction --> selectOrder
    validateDeleteOrder --> deleteOrder
    deleteOrder --> [*]
```

#### Ajouter une source de revenue

Chaque utilisateur peut ajouter à son profil des données de rémunération. La gestion des revenus est décrite en détail dans [`docs/architecture/salary.md`](salary.md).

**Implémenté :** contrats salariaux (`SalaryContract`) avec projections théoriques, bulletins de paie mensuels réels (`MonthlyPaySlip`), et revenus complémentaires (`OtherIncome` : locatif, dividende, aide sociale, autre).



```mermaid
%% Contenu copié depuis docs/architecture/diagram/activity-income-management-add-diagram.mmd
stateDiagram
    %% state
    state "Selection du type de revenu" as typeOfIncome
    state "Saisie des données de salaire" as dataFromSalary
    state "Saisie des données de dividende" as dataFromDividend
    state "Verification des données" as verifyData
    state "Sauvegarde" as save
    state "Erreur de saisie" as errorFromUser

    [*] --> typeOfIncome
    typeOfIncome --> dataFromSalary : type = Salary
    typeOfIncome --> dataFromDividend : type = dividende
    dataFromSalary --> verifyData
    dataFromDividend --> verifyData
    verifyData --> save : OK
    verifyData --> errorFromUser : KO
    errorFromUser --> typeOfIncome
    save --> [*]
```

Structure d'une source de revenue de type Salaire et/ou dividende :

```mermaid
%% Extrait depuis docs/architecture/diagram/class-diagram.mmd
classDiagram
    class User {
        +Long id
        +String firstName
        +String lastName
        +LocalDate birthDate
        +String login
        +String password
        +RoleEnum role
    }

    class AnnualIncome {
        +Long id
        +Date startPeriod
        +Date endPeriod
        +Float grossPay
        +Float netPay
        +Float takeHomePay
        +Float incomeTax
    }

    class Income {
        +Long id
        +Date startPeriod
        +Date endPeriod
        +Float grossPay
        +Float netPay
        +Float takeHomePay
        +Float incomeTax
    }

    class Dividend {
        +Long id
        +Float value
        +Date date
    }

    User "1" o-- "0..*" AnnualIncome : annualIncomes
    AnnualIncome "1" o-- "0..*" Income : monthlyIncomes
    User "1" o-- "0..*" Dividend : dividends
```
L'entité `AnnualIncome` permet à l'utilisateur de saisir ses revenues salarial annuel. Les salaires mensuel `Income` sont là pour completer et ajuster le déclaratif effectué annuellement par l'utilisateur. Les Salaire ont regroupé par Année via l'année de début et fin de période.

