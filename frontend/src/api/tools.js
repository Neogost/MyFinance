import axios from 'axios'

const api = axios.create({ baseURL: '/', withCredentials: true })

export function simulateTax({ year, salarySource, includedIncomes } = {}) {
  const params = new URLSearchParams()
  if (year) params.append('year', year)
  if (salarySource) params.append('salarySource', salarySource)
  if (includedIncomes) includedIncomes.forEach(id => params.append('includedIncomes', id))
  return api.get('/api/tax-simulator', { params }).then(r => r.data)
}
