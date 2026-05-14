import { useState, useEffect } from 'react'
import { getActiveBanners } from '../../api/infoBanners'
import InfoBannerItem from './InfoBannerItem'

const SESSION_KEY = 'dismissedBannerIds'

function getDismissed() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]')
  } catch {
    return []
  }
}

function addDismissed(id) {
  const dismissed = getDismissed()
  if (!dismissed.includes(id)) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...dismissed, id]))
  }
}

// currentPage en prop : refetch à chaque navigation pour afficher les bannières créées en cours de session
export default function InfoBannerStack({ currentPage }) {
  const [banners, setBanners] = useState([])

  useEffect(() => {
    getActiveBanners()
      .then(all => {
        const dismissed = getDismissed()
        // Remplace la liste entière : retire les expirées, reflète les modifications
        setBanners(all.filter(b => !dismissed.includes(b.id)))
      })
      .catch(() => {})
  }, [currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDismiss(id) {
    addDismissed(id)
    setBanners(bs => bs.filter(b => b.id !== id))
  }

  if (banners.length === 0) return null

  return (
    <div className="w-full">
      {banners.map(b => (
        <InfoBannerItem key={b.id} banner={b} onDismiss={handleDismiss} />
      ))}
    </div>
  )
}
