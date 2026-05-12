import { useState, useEffect } from 'react'
import { getFamilyMembers, getPastDonations } from '../../../api/estate'
import { useAnalytics } from '../../../hooks/useAnalytics'
import DonationTab from './DonationTab'
import SuccessionTab from './SuccessionTab'
import StrategyTab from './StrategyTab'
import FamilyMembersModal from './FamilyMembersModal'

const TABS = [
  { key: 'donation',   label: 'Donation'       },
  { key: 'succession', label: 'Succession'     },
  { key: 'strategy',   label: 'Stratégie 15 ans' },
]

export default function EstateSimulatorPage() {
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('tools.estate_simulator') }, [])

  const [tab,          setTab]          = useState('donation')
  const [members,      setMembers]      = useState([])
  const [pastDonations,setPastDonations]= useState([])
  const [showFamily,   setShowFamily]   = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [m, d] = await Promise.all([getFamilyMembers(), getPastDonations()])
        setMembers(m)
        setPastDonations(d)
      } catch {
        setError('Impossible de charger les données.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p className="text-gray-400 text-sm">Chargement…</p>

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Donation & succession</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Simulez une donation, estimez les droits à payer et optimisez la transmission de votre patrimoine.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {/* ── Onglets ── */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); trackEvent('BUTTON_CLICK', `tools.estate.tab_${t.key}`) }}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenu ── */}
      {tab === 'donation' && (
        <DonationTab
          members={members}
          pastDonations={pastDonations}
          onPastDonationsChange={setPastDonations}
          onOpenFamily={() => setShowFamily(true)}
        />
      )}

      {tab === 'succession' && <SuccessionTab />}

      {tab === 'strategy' && <StrategyTab />}

      {/* ── Modal famille ── */}
      {showFamily && (
        <FamilyMembersModal
          members={members}
          onClose={() => setShowFamily(false)}
          onMembersChange={m => { setMembers(m); trackEvent('FEATURE_USE', 'tools.estate.update_family') }}
        />
      )}

      {/* ── Disclaimer ── */}
      <p className="text-xs text-gray-400 mt-8 text-center">
        Calculs indicatifs basés sur les barèmes fiscaux français en vigueur (loi de finances 2025).
        Toute donation doit être validée par un notaire. L'application ne constitue pas un conseil patrimonial.
      </p>

      {/* ── Section pédagogique ── */}
      <EstateExplainer />
    </div>
  )
}

function ComingSoon({ title, description }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
      <p className="text-3xl mb-3">🚧</p>
      <p className="text-base font-semibold text-gray-600 mb-2">{title}</p>
      <p className="text-sm max-w-md mx-auto">{description}</p>
    </div>
  )
}

// ── Section pédagogique ───────────────────────────────────────────────────────

function EstateExplainer() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-10 border-t border-gray-200 pt-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition w-full text-left"
      >
        <span className="text-base">{open ? '▲' : '▼'}</span>
        Comment ça marche ? Comprendre la donation et la succession
      </button>

      {open && (
        <div className="mt-6 space-y-6 text-sm text-gray-700">

          {/* Principe donation */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <p className="font-bold text-blue-800 dark:text-blue-300 text-base mb-3">
              🎁 C'est quoi une donation ?
            </p>
            <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
              Une donation, c'est simple : tu donnes quelque chose de ton vivant à quelqu'un que tu aimes.
              Un appartement à ton fils, de l'argent à ta fille, des actions à ton petit-enfant.
              C'est différent d'un héritage (qui se passe après ton décès) — tu choisis toi-même
              quand et combien tu donnes, et tu peux en profiter ensemble.
            </p>
          </div>

          {/* Pourquoi des droits */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">💸 Pourquoi l'État prend sa part ?</p>
            <p className="text-gray-600 leading-relaxed">
              En France, quand tu reçois un cadeau important (maison, gros héritage…), l'État considère
              que c'est une richesse qui circule et il prélève des <strong>droits de donation</strong>
              ou des <strong>droits de succession</strong>. Ces droits sont calculés sur
              la valeur de ce que tu reçois, selon un barème progressif.
            </p>
            <p className="text-gray-600 leading-relaxed mt-2">
              Bonne nouvelle : il existe des <strong>abattements</strong> — des montants exonérés d'impôt.
              Si tu donnes à ton enfant 60 000 €, il ne paiera rien : l'abattement est de 100 000 € !
            </p>
          </div>

          {/* Exemple concret */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-4">📖 Un exemple très concret</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide mb-1">Tu donnes</p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">300 000 €</p>
                <p className="text-xs text-gray-500 mt-1">Un appartement à ton fils</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Abattement</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">100 000 €</p>
                <p className="text-xs text-gray-500 mt-1">Exonéré automatiquement</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs text-red-500 dark:text-red-400 font-semibold uppercase tracking-wide mb-1">Droits à payer</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">~38 000 €</p>
                <p className="text-xs text-gray-500 mt-1">Sur les 200 000 € restants</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
              Sur les 200 000 € taxables, le barème est progressif (comme l'impôt sur le revenu) :
              5 % jusqu'à 8 072 €, 10 % jusqu'à 12 109 €, 15 % jusqu'à 15 932 €,
              puis <strong>20 % jusqu'à 552 324 €</strong>. C'est ce taux de 20 % qui s'applique à l'essentiel.
            </p>
          </div>

          {/* Abattements tableau */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">🔢 Les abattements selon le lien familial</p>
            <p className="text-gray-600 mb-3 leading-relaxed">
              Plus tu es proche, plus l'abattement est généreux. Et bonne nouvelle :
              ces abattements se <strong>renouvellent tous les 15 ans</strong> !
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Lien de parenté</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Abattement</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Enfant (par parent)', '100 000 €'],
                    ['Conjoint / Partenaire PACS (donation)', '80 724 €'],
                    ['Petit-enfant', '31 865 €'],
                    ['Frère / Sœur', '15 932 €'],
                    ['Neveu / Nièce', '7 967 €'],
                    ['Autre (sans lien)', '1 594 €'],
                    ['+ Bonus handicap', '+159 325 €'],
                  ].map(([lien, montant]) => (
                    <tr key={lien} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{lien}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{montant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Le démembrement */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">🏠 Le démembrement : l'astuce des pros</p>
            <p className="text-gray-600 leading-relaxed mb-3">
              Imagine que tu coupes un bien en deux parts :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">L'usufruit (tu gardes)</p>
                <p className="text-xs text-gray-600">Tu continues à utiliser le bien et à percevoir les loyers.
                C'est ta part tant que tu vis.</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="font-semibold text-indigo-800 dark:text-indigo-300 mb-1">La nue-propriété (tu donnes)</p>
                <p className="text-xs text-gray-600">Ton enfant devient propriétaire « sur papier » dès maintenant.
                Il recevra le bien entier à ton décès, sans payer de droits supplémentaires.</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed bg-indigo-50 rounded-lg p-3">
              <strong>L'avantage fiscal :</strong> on ne taxe que la nue-propriété, qui vaut <em>moins</em> que
              le bien entier. Et ce pourcentage dépend de ton âge : à 55 ans, la nue-propriété vaut
              seulement 50 % de la valeur du bien. Sur un appart de 300 000 €, tu ne transmets
              fiscalement que 150 000 € — souvent absorbé par l'abattement → <strong>0 € de droits</strong>.
            </p>
          </div>

          {/* Les 15 ans */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">⏰ La règle des 15 ans</p>
            <p className="text-gray-600 leading-relaxed">
              Les abattements se renouvellent tous les 15 ans. Ça veut dire que si tu donnes
              100 000 € à ton fils aujourd'hui, tu pourras lui en redonner autant en franchise
              de droits dans 15 ans. C'est la stratégie des familles qui anticipent :
              donner tôt, donner régulièrement, maximiser les abattements cumulés sur toute une vie.
            </p>
            <p className="text-gray-600 leading-relaxed mt-2">
              Exemple : un couple avec deux enfants peut transmettre <strong>400 000 €</strong> sans payer
              aucun droit (100k × 2 parents × 2 enfants) — et recommencer tous les 15 ans.
            </p>
          </div>

          {/* La succession */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">📜 Et la succession, c'est quoi ?</p>
            <p className="text-gray-600 leading-relaxed mb-2">
              La succession, c'est la transmission de tout ton patrimoine au moment de ton décès.
              La loi française protège certains héritiers : on parle de <strong>réserve héréditaire</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-700 mb-1">Réserve héréditaire</p>
                <p className="text-xs text-gray-500">Ce qui revient obligatoirement aux enfants,
                quoi que tu décides. Un enfant seul a droit à 50 % ; deux enfants se partagent 2/3 ;
                trois ou plus se partagent 3/4.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-700 mb-1">Quotité disponible</p>
                <p className="text-xs text-gray-500">Le reste (50 %, 33 % ou 25 %) que tu peux
                attribuer librement à qui tu veux : conjoint, ami, association, neveu…</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed mt-3">
              <strong>Le conjoint survivant est exonéré de droits de succession</strong> (depuis 2007).
              En revanche, les enfants bénéficient de leur abattement de 100 000 € chacun,
              puis paient sur le reste selon le même barème que la donation.
            </p>
          </div>

          {/* Conseils clés */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 text-sm text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold mb-2">Les 3 règles d'or</p>
            <p>• <strong>Donner tôt</strong> : plus tu commences jeune, plus tu profites du renouvellement des abattements (tous les 15 ans).</p>
            <p>• <strong>Démembrer à 50–60 ans</strong> : la nue-propriété vaut 50 % — c'est le moment optimal pour transmettre l'immobilier avec 0 € de droits.</p>
            <p>• <strong>Consulter un notaire</strong> : chaque situation est unique. La fiscalité évolue chaque année avec la loi de finances. Ces chiffres sont indicatifs.</p>
          </div>

        </div>
      )}
    </div>
  )
}
