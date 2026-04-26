import { MONTHS_FR_SHORT } from './constants.js'

export function fmt(n) {
  return n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) ?? '—'
}

export function fmtPct(n) {
  if (n == null) return '—'
  return `${parseFloat(n).toFixed(2)} %`
}

export function formatDate(iso) {
  if (!iso) return '—'
  const [year, month, day] = iso.split('-')
  return `${parseInt(day)} ${MONTHS_FR_SHORT[parseInt(month) - 1]} ${year}`
}
