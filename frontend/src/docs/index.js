export const DOC_TREE = [
  {
    id: 'demarrage-rapide',
    label: 'Démarrage rapide',
    load: () => import('./demarrage-rapide.md?raw').then(m => m.default),
  },
  {
    id: 'tableau-de-bord',
    label: 'Tableau de bord',
    load: () => import('./tableau-de-bord.md?raw').then(m => m.default),
  },
  {
    id: 'profil',
    label: 'Mon profil',
    load: () => import('./profil.md?raw').then(m => m.default),
  },
  {
    id: 'patrimoine',
    label: 'Patrimoine',
    children: [
      {
        id: 'patrimoine-positions',
        label: 'Gérer ses positions',
        load: () => import('./patrimoine/positions.md?raw').then(m => m.default),
      },
      {
        id: 'patrimoine-mouvements',
        label: 'Enregistrer un mouvement',
        load: () => import('./patrimoine/mouvements.md?raw').then(m => m.default),
      },
      {
        id: 'patrimoine-snapshots',
        label: 'Relevés de patrimoine',
        load: () => import('./patrimoine/snapshots.md?raw').then(m => m.default),
      },
    ],
  },
  {
    id: 'revenus',
    label: 'Revenus',
    children: [
      {
        id: 'revenus-salariat',
        label: 'Contrats salariaux',
        load: () => import('./revenus/salariat.md?raw').then(m => m.default),
      },
      {
        id: 'revenus-complementaires',
        label: 'Revenus complémentaires',
        load: () => import('./revenus/complementaires.md?raw').then(m => m.default),
      },
    ],
  },
  {
    id: 'depenses',
    label: 'Dépenses',
    children: [
      {
        id: 'depenses-recurrentes',
        label: 'Dépenses récurrentes',
        load: () => import('./depenses.md?raw').then(m => m.default),
      },
      {
        id: 'abonnements',
        label: 'Calendrier des abonnements',
        load: () => import('./abonnements.md?raw').then(m => m.default),
      },
    ],
  },
  {
    id: 'passifs',
    label: 'Passifs',
    children: [
      {
        id: 'possessions',
        label: 'Grandes possessions',
        load: () => import('./possessions.md?raw').then(m => m.default),
      },
      {
        id: 'dettes',
        label: 'Dettes & crédits',
        load: () => import('./dettes.md?raw').then(m => m.default),
      },
    ],
  },
  {
    id: 'outils',
    label: 'Outils',
    children: [
      {
        id: 'outils-fiscalite',
        label: 'Fiscalité',
        children: [
          {
            id: 'outils-simulateur-impots',
            label: "Simulateur d'impôts",
            load: () => import('./outils/simulateur-impots.md?raw').then(m => m.default),
          },
          {
            id: 'outils-crypto-tax',
            label: 'Crypto · Formulaire 2086',
            load: () => import('./outils/crypto-tax.md?raw').then(m => m.default),
          },
          {
            id: 'outils-tax-loss-harvesting',
            label: "Optimisation fin d'année",
            load: () => import('./outils/tax-loss-harvesting.md?raw').then(m => m.default),
          },
          {
            id: 'outils-enveloppes-fiscales',
            label: 'Enveloppes fiscales',
            load: () => import('./outils/enveloppes-fiscales.md?raw').then(m => m.default),
          },
        ],
      },
      {
        id: 'outils-patrimoine',
        label: 'Patrimoine & transmission',
        children: [
          {
            id: 'outils-bilan-financier',
            label: 'Bilan financier',
            load: () => import('./outils/bilan-financier.md?raw').then(m => m.default),
          },
          {
            id: 'outils-declaration-patrimoine',
            label: 'Déclaration de patrimoine',
            load: () => import('./outils/declaration-patrimoine.md?raw').then(m => m.default),
          },
          {
            id: 'outils-donation-succession',
            label: 'Donation & succession',
            load: () => import('./outils/donation-succession.md?raw').then(m => m.default),
          },
        ],
      },
      {
        id: 'outils-simulateurs',
        label: 'Simulateurs',
        children: [
          {
            id: 'outils-interets-composes',
            label: 'Intérêts composés',
            load: () => import('./outils/interets-composes.md?raw').then(m => m.default),
          },
          {
            id: 'outils-emprunt',
            label: 'Emprunt',
            load: () => import('./outils/emprunt.md?raw').then(m => m.default),
          },
          {
            id: 'outils-lombard',
            label: 'Crédit Lombard',
            load: () => import('./outils/lombard.md?raw').then(m => m.default),
          },
          {
            id: 'outils-retraite',
            label: 'Retraite',
            load: () => import('./outils/retraite.md?raw').then(m => m.default),
          },
          {
            id: 'outils-scenario-crise',
            label: 'Scénario de crise',
            load: () => import('./outils/scenario-crise.md?raw').then(m => m.default),
          },
        ],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    children: [
      {
        id: 'administration-instruments',
        label: 'Instruments financiers',
        load: () => import('./administration/instruments.md?raw').then(m => m.default),
      },
    ],
  },
]

export function flattenTree(tree) {
  return tree.flatMap(node =>
    node.children
      ? [node, ...flattenTree(node.children)]
      : [node]
  )
}

export function findFirstLeaf(tree) {
  for (const node of tree) {
    if (node.load) return node
    if (node.children) {
      const leaf = findFirstLeaf(node.children)
      if (leaf) return leaf
    }
  }
  return null
}
