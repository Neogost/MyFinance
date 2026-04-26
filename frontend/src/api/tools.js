import api from './client'

export function simulateTax({ year, salarySource, includedIncomes } = {}) {
  const params = new URLSearchParams()
  if (year) params.append('year', year)
  if (salarySource) params.append('salarySource', salarySource)
  if (includedIncomes) includedIncomes.forEach(id => params.append('includedIncomes', id))
  return api.get('/api/tax-simulator', { params }).then(r => r.data)
}

export function simulateTaxForUser(userId) {
  return api.get(`/api/tax-simulator/users/${userId}`).then(r => r.data)
}

export const getLoanSimulations   = ()     => api.get('/api/loan-simulations').then(r => r.data)
export const createLoanSimulation = (data) => api.post('/api/loan-simulations', data).then(r => r.data)
export const deleteLoanSimulation = (id)   => api.delete(`/api/loan-simulations/${id}`)
