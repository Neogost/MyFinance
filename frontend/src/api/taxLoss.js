import api from './client'

export const getTaxLossHarvesting = ({ year, taxOption, tmi, mvReporteesCto, mvReporteesCrypto } = {}) =>
  api.get('/api/tax-loss-harvesting', {
    params: {
      ...(year            != null && { year }),
      ...(taxOption       != null && { taxOption }),
      ...(tmi             != null && { tmi }),
      ...(mvReporteesCto  != null && mvReporteesCto  > 0 && { mvReporteesCto }),
      ...(mvReporteesCrypto != null && mvReporteesCrypto > 0 && { mvReporteesCrypto }),
    }
  }).then(r => r.data)

export const getCryptoCessions = (year) =>
  api.get('/api/tax-loss-harvesting/cessions/crypto', { params: year ? { year } : {} }).then(r => r.data)

export const getCtoCessions = (year) =>
  api.get('/api/tax-loss-harvesting/cessions', { params: year ? { year } : {} }).then(r => r.data)

export const exportCtoCessionsCsv = (year) =>
  api.get('/api/tax-loss-harvesting/cessions.csv', {
    params: year ? { year } : {},
    responseType: 'blob',
  }).then(r => r.data)
