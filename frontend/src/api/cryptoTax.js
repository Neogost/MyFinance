import api from './client'

export const getCryptoTaxState = () =>
  api.get('/api/crypto-tax/state').then(r => r.data)

export const getCryptoTaxSummary = ({ year, taxOption = 'PFU', tmi } = {}) => {
  const params = new URLSearchParams()
  if (year) params.append('year', year)
  params.append('taxOption', taxOption)
  if (tmi != null) params.append('tmi', tmi)
  return api.get('/api/crypto-tax/summary', { params }).then(r => r.data)
}

export const getCryptoCessions = (year) => {
  const params = year ? { year } : {}
  return api.get('/api/crypto-tax/cessions', { params }).then(r => r.data)
}

export const confirmCryptoHistory = (confirmed) =>
  api.put('/api/crypto-tax/historical-data-confirmation', { confirmed })

export const exportCryptoTaxCsv = (year) =>
  api.get('/api/crypto-tax/form-2086.csv', {
    params: year ? { year } : {},
    responseType: 'blob',
  }).then(r => r.data)
