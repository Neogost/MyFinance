// Configuration des familles et codes d'erreur HTTP
const FAMILIES = {
  3: {
    label: '3xx',
    couleur: 'blue',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  4: {
    label: '4xx',
    couleur: 'amber',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  5: {
    label: '5xx',
    couleur: 'red',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    btnPrimary: 'bg-red-600 hover:bg-red-700 text-white',
  },
}

const DETAILS = {
  // ── 3xx ────────────────────────────────────────────────────────────────
  301: { titre: 'Redirection permanente',   desc: 'Cette ressource a été déplacée définitivement vers une nouvelle adresse.' },
  302: { titre: 'Redirection temporaire',   desc: 'Cette ressource est temporairement disponible à une autre adresse.' },
  304: { titre: 'Non modifié',              desc: 'Le contenu n\'a pas changé depuis votre dernière visite.' },
  307: { titre: 'Redirection temporaire',   desc: 'La requête doit être répétée à une autre adresse, en conservant la méthode HTTP.' },
  308: { titre: 'Redirection permanente',   desc: 'La ressource a été déplacée définitivement. La méthode HTTP doit être conservée.' },
  // ── 4xx ────────────────────────────────────────────────────────────────
  400: { titre: 'Requête invalide',         desc: 'Les données envoyées sont incorrectes ou malformées. Vérifiez les informations saisies.' },
  401: { titre: 'Session expirée',          desc: 'Votre session a expiré ou vous n\'êtes pas authentifié. Veuillez vous reconnecter.' },
  403: { titre: 'Accès refusé',             desc: 'Vous ne disposez pas des droits nécessaires pour accéder à cette ressource.' },
  404: { titre: 'Ressource introuvable',    desc: 'La ressource demandée n\'existe pas ou a été supprimée.' },
  405: { titre: 'Méthode non autorisée',    desc: 'L\'action demandée n\'est pas permise sur cette ressource.' },
  409: { titre: 'Conflit de données',       desc: 'L\'opération est en conflit avec l\'état actuel des données (doublon, contrainte).' },
  422: { titre: 'Données non traitables',   desc: 'Le format de la requête est correct, mais les données ne peuvent pas être traitées.' },
  429: { titre: 'Trop de tentatives',       desc: 'Vous avez effectué trop de requêtes consécutives. Veuillez patienter avant de réessayer.' },
  // ── 5xx ────────────────────────────────────────────────────────────────
  500: { titre: 'Erreur interne du serveur', desc: 'Une erreur inattendue s\'est produite côté serveur. L\'équipe technique a été notifiée.' },
  501: { titre: 'Non implémenté',            desc: 'Cette fonctionnalité n\'est pas encore disponible sur le serveur.' },
  502: { titre: 'Passerelle incorrecte',     desc: 'Le serveur a reçu une réponse invalide d\'un service en amont.' },
  503: { titre: 'Service indisponible',      desc: 'Le serveur est temporairement indisponible, probablement en maintenance. Réessayez dans quelques instants.' },
  504: { titre: 'Délai expiré',             desc: 'Le serveur n\'a pas répondu dans les délais impartis. Vérifiez votre connexion réseau.' },
}

// Icônes SVG par famille
function IconeErreur({ famille }) {
  if (famille === 3) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
  if (famille === 4) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
  // 5xx
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  )
}

/**
 * Composant de page d'erreur HTTP.
 *
 * @param {number}   status      Code HTTP (ex. 404, 500). Obligatoire.
 * @param {string}   [message]   Message personnalisé (remplace la description par défaut).
 * @param {boolean}  [fullPage]  Si true, occupe tout l'écran (défaut : false, inline).
 * @param {Function} [onRetry]   Callback du bouton "Réessayer". Absent = bouton masqué.
 * @param {Function} [onHome]    Callback du bouton "Tableau de bord". Absent = bouton masqué.
 */
export default function ErrorPage({ status, message, fullPage = false, onRetry, onHome }) {
  const famille = status ? Math.floor(status / 100) : 5
  const theme   = FAMILIES[famille] ?? FAMILIES[5]
  const detail  = DETAILS[status]

  const titre = detail?.titre ?? (famille === 3 ? 'Redirection' : famille === 4 ? 'Erreur client' : 'Erreur serveur')
  const desc  = message ?? detail?.desc ?? 'Une erreur inattendue s\'est produite.'

  const contenu = (
    <div data-testid="error-page" data-family={famille} className={`rounded-2xl border ${theme.bg} ${theme.border} p-10 flex flex-col items-center text-center gap-5 max-w-lg w-full mx-auto`}>

      {/* Icône + code */}
      <div className={`${theme.text} flex flex-col items-center gap-2`}>
        <IconeErreur famille={famille} />
        <span className={`text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${theme.badge}`}>
          HTTP {status ?? '???'}
        </span>
      </div>

      {/* Titre */}
      <div>
        <p className="text-5xl font-black text-gray-200 leading-none select-none mb-3">
          {status ?? '???'}
        </p>
        <h1 className="text-xl font-bold text-gray-800">{titre}</h1>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 leading-relaxed max-w-sm">{desc}</p>

      {/* Actions */}
      {(onRetry || onHome) && (
        <div className="flex gap-3 mt-2 flex-wrap justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${theme.btnPrimary}`}
            >
              Réessayer
            </button>
          )}
          {onHome && (
            <button
              onClick={onHome}
              className="px-5 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:border-gray-400 transition"
            >
              Tableau de bord
            </button>
          )}
        </div>
      )}
    </div>
  )

  if (!fullPage) return contenu

  return (
    <div data-testid="error-page-fullpage" className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      {contenu}
    </div>
  )
}
