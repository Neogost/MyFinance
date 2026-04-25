export const DOC_TREE = [
  {
    id: 'demarrage-rapide',
    label: 'Démarrage rapide',
    load: () => import('./demarrage-rapide.md?raw').then(m => m.default),
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
    load: () => import('./depenses.md?raw').then(m => m.default),
  },
  {
    id: 'dettes',
    label: 'Dettes',
    load: () => import('./dettes.md?raw').then(m => m.default),
  },
  {
    id: 'outils',
    label: 'Outils',
    children: [
      {
        id: 'outils-simulateur-impots',
        label: "Simulateur d'impôts",
        load: () => import('./outils/simulateur-impots.md?raw').then(m => m.default),
      },
      {
        id: 'outils-bilan-financier',
        label: 'Bilan financier & autres',
        load: () => import('./outils/bilan-financier.md?raw').then(m => m.default),
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
