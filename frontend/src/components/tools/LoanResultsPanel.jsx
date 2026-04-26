import { ComposedChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { fmt, fmtPct, DONUT_COLORS, CURRENT_YEAR } from './loanSimulatorUtils'
import AmortizationTable from './AmortizationTable'

export default function LoanResultsPanel({ calc, loan, scenarios, tableState }) {
  // Valeurs dérivées calculées localement depuis les props :
  const { monthlyPrincipal, monthlyInsurance } = calc.amortization
  const monthlyTotal      = monthlyPrincipal + monthlyInsurance
  const effectiveYears    = Math.ceil(calc.amortization.actualMonths / 12)
  const durationReduced   = calc.amortization.actualMonths < loan.loanDuration * 12
  const hasCharges        = calc.monthlyPropertyTax > 0 || loan.condoFees > 0
  const debtColor         = calc.debtRatio > 35 ? 'text-red-600 bg-red-50 border-red-100'
    : calc.debtRatio > 33 ? 'text-amber-600 bg-amber-50 border-amber-100'
    : 'text-green-700 bg-green-50 border-green-100'

  // Destructurer calc pour le JSX
  const {
    totalCreditCost, totalProjectCost, totalInterest, totalInsurance, taeg,
    debtRatio, maxLoanCapacity, acquisitionCost, totalPrepayments,
    ptzMonthlyPayment, totalMonthlyAfterDeferral, totalMonthlyCost, monthlyPropertyTax,
    comparison, resale, rentVsBuy, amortization,
    donutData, capitalChartData, breakdownChartData,
  } = calc

  // Destructurer loan
  const { loanAmount, loanDuration, annualRate, ptzEnabled, ptzAmount, insuranceBase, condoFees, monthlyIncome, participants, percentBalanced, requiredContrib, hasRepayments } = loan

  // Destructurer scenarios
  const { showComparison, showResale, showRentComparison, resaleYear, resalePrice, propertyAppreciation, resaleAgencyFeesPct, monthlyRent, rentIncreaseRate, investmentReturnRate, compDuration, compRate } = scenarios

  // Destructurer tableState
  const { showTable, setShowTable, showMonthly, setShowMonthly, tableMaxHeight, tableBodyRef } = tableState

  return (
    <div className="flex-1 space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 overflow-hidden">
              <p className="text-xs text-gray-500 mb-1 truncate">Mensualité principale</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{fmt(monthlyTotal)}<span className="text-xs font-normal text-gray-400">/mois</span></p>
              <p className="text-xs text-gray-400 mt-1">Crédit {fmt(monthlyPrincipal)} + Ass. {fmt(monthlyInsurance)}</p>
              {ptzEnabled && ptzMonthlyPayment > 0 && (
                <p className="text-xs font-semibold text-violet-600 mt-1">
                  + PTZ {fmt(ptzMonthlyPayment)}<br />= <span className="text-gray-900">{fmt(totalMonthlyAfterDeferral)}/mois</span>
                </p>
              )}
              {durationReduced && hasRepayments && (
                <p className="text-xs text-emerald-600 mt-1">✓ {effectiveYears} ans</p>
              )}
            </div>

            <div className={`rounded-xl border p-3 md:p-4 overflow-hidden ${debtColor}`}>
              <p className="text-xs mb-1 opacity-70 truncate">Taux d'endettement</p>
              <p className="text-lg md:text-xl font-bold">{fmtPct(debtRatio)}</p>
              <p className="text-xs mt-1 opacity-80">
                {debtRatio > 35 ? '⚠ Dépasse le seuil HCSF (35 %)' : debtRatio > 33 ? 'Proche du seuil HCSF (35 %)' : '✓ Sous le seuil HCSF (35 %)'}
              </p>
              {maxLoanCapacity > 0 && monthlyIncome > 0 && (
                <p className="text-xs mt-1 opacity-70">Capacité max : {fmt(maxLoanCapacity)}</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 overflow-hidden">
              <p className="text-xs text-gray-500 mb-1 truncate">Coût total du crédit</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{fmt(totalCreditCost)}</p>
              <p className="text-xs text-gray-400 mt-1 leading-tight">{fmt(totalInterest)} intérêts<br />{fmt(totalInsurance)} assurance</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 overflow-hidden">
              <p className="text-xs text-gray-500 mb-1 truncate">Coût total du projet</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{fmt(totalProjectCost)}</p>
              <p className="text-xs text-gray-400 mt-1">Acquisition {fmt(acquisitionCost)}<br />+ Crédit {fmt(totalInterest + totalInsurance)}</p>
            </div>
          </div>

          {/* Bannière TAEG + coût mensuel total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-800 text-white rounded-xl p-4 flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">TAEG estimé</p>
                <p className="text-2xl font-bold">{taeg != null ? fmtPct(taeg) : '—'}</p>
                <p className="text-xs text-gray-400 mt-1">Intègre intérêts, assurance et frais bancaires</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-400 mb-0.5">Durée effective</p>
                <p className="text-lg font-semibold">
                  {effectiveYears} ans{durationReduced && hasRepayments && (
                    <span className="ml-1 text-xs text-emerald-400">({loanDuration - effectiveYears} an{loanDuration - effectiveYears > 1 ? 's' : ''} gagnés)</span>
                  )}
                </p>
                {insuranceBase === 'remaining' && (
                  <p className="text-xs text-indigo-300 mt-1">Assurance sur capital restant</p>
                )}
              </div>
            </div>

            <div className={`rounded-xl p-4 border ${hasCharges ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100 shadow-sm'}`}>
              <p className="text-xs text-gray-500 mb-1">Coût mensuel total</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalMonthlyCost)}</p>
              <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                <div className="flex justify-between"><span>Crédit + assurance</span><span>{fmt(totalMonthlyAfterDeferral)}</span></div>
                {condoFees > 0 && <div className="flex justify-between"><span>Charges copropriété</span><span>{fmt(condoFees)}</span></div>}
                {monthlyPropertyTax > 0 && <div className="flex justify-between"><span>Taxe foncière</span><span>{fmt(monthlyPropertyTax)}</span></div>}
                {!hasCharges && <span className="italic">Ajouter charges et taxe foncière dans le panneau gauche</span>}
              </div>
            </div>
          </div>

          {/* Comparaison de scénarios */}
          {showComparison && comparison && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Comparaison de scénarios</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs text-gray-500 font-semibold">Paramètre</th>
                    <th className="text-right py-2 text-xs text-indigo-600 font-semibold">Scénario principal</th>
                    <th className="text-right py-2 text-xs text-emerald-600 font-semibold">Scénario comparé</th>
                    <th className="text-right py-2 text-xs text-gray-400 font-semibold">Différence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: 'Durée', main: `${loanDuration} ans`, comp: `${compDuration} ans`, diff: null },
                    { label: 'Taux nominal', main: fmtPct(annualRate), comp: fmtPct(compRate), diff: null },
                    { label: 'TAEG estimé', main: fmtPct(taeg), comp: fmtPct(comparison.taeg), diff: taeg != null && comparison.taeg != null ? comparison.taeg - taeg : null, isRate: true },
                    { label: 'Mensualité', main: fmt(monthlyTotal), comp: fmt(comparison.monthlyTotal), diff: comparison.monthlyTotal - monthlyTotal, isNeg: true },
                    { label: 'Taux d\'endettement', main: fmtPct(debtRatio), comp: fmtPct(comparison.debtRatio), diff: comparison.debtRatio - debtRatio, isRate: true, isNeg: true },
                    { label: 'Total intérêts', main: fmt(totalInterest), comp: fmt(comparison.totalInterest), diff: comparison.totalInterest - totalInterest },
                    { label: 'Total assurance', main: fmt(totalInsurance), comp: fmt(comparison.totalInsurance), diff: comparison.totalInsurance - totalInsurance },
                    { label: 'Coût total crédit', main: fmt(totalCreditCost), comp: fmt(comparison.totalCreditCost), diff: comparison.totalCreditCost - totalCreditCost },
                  ].map(({ label, main, comp, diff, isNeg, isRate }) => {
                    const diffColor = diff == null ? ''
                      : (isNeg ? diff < 0 : diff > 0) ? 'text-emerald-600' : diff === 0 ? 'text-gray-400' : 'text-red-500'
                    const diffFmt = diff == null ? '—'
                      : isRate ? `${diff > 0 ? '+' : ''}${diff.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
                      : `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('fr-FR')} €`
                    return (
                      <tr key={label}>
                        <td className="py-2 text-gray-600">{label}</td>
                        <td className="py-2 text-right font-semibold text-indigo-600">{main}</td>
                        <td className="py-2 text-right font-semibold text-emerald-600">{comp}</td>
                        <td className={`py-2 text-right text-xs font-semibold ${diffColor}`}>{diffFmt}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">Le scénario comparé utilise le même montant emprunté, le même taux d'assurance et les mêmes frais. Seuls le taux et la durée diffèrent.</p>
            </div>
          )}

          {/* Répartition par participant */}
          {participants.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Mensualités par co-emprunteur
                {!percentBalanced && <span className="ml-2 text-xs text-red-400 normal-case font-normal">⚠ total ≠ 100 %</span>}
              </h3>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(participants.length, 4)}, 1fr)` }}>
                {participants.map(p => {
                  const share      = totalMonthlyAfterDeferral * p.percent / 100
                  const sharePrinc = monthlyPrincipal           * p.percent / 100
                  const shareIns   = monthlyInsurance            * p.percent / 100
                  const sharePtz   = ptzEnabled ? ptzMonthlyPayment * p.percent / 100 : 0
                  return (
                    <div key={p.id} className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                      <p className="text-xs font-semibold text-indigo-700 truncate mb-1 amount">{p.name}</p>
                      <p className="text-xs text-gray-500 mb-2">{p.percent} % de l'emprunt</p>
                      <p className="text-lg font-bold text-gray-900">{fmt(share)}<span className="text-xs font-normal text-gray-400">/mois</span></p>
                      <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                        <div className="flex justify-between"><span>Crédit</span><span>{fmt(sharePrinc)}</span></div>
                        <div className="flex justify-between"><span>Assurance</span><span>{fmt(shareIns)}</span></div>
                        {ptzEnabled && sharePtz > 0 && (
                          <div className="flex justify-between text-violet-500"><span>PTZ</span><span>{fmt(sharePtz)}</span></div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Simulation de revente */}
          {showResale && resale && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Simulation de revente — An {resaleYear} ({CURRENT_YEAR + resaleYear})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Produit de la vente</p>
                  <div className="flex justify-between"><span className="text-gray-500">Prix de revente estimé</span><span className="font-medium">{fmt(resale.effectiveResalePrice)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">− Frais d'agence ({resaleAgencyFeesPct} %)</span><span className="text-red-500">− {fmt(resale.resaleFees)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">− Capital restant dû</span><span className="text-red-500">− {fmt(resale.remainingCapital)}</span></div>
                  {resale.ira > 0 && <div className="flex justify-between"><span className="text-gray-500">− IRA (remb. anticipé)</span><span className="text-red-500">− {fmt(resale.ira)}</span></div>}
                  <div className={`flex justify-between font-semibold border-t border-gray-200 pt-2 mt-1 ${resale.netProceeds >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    <span>Produit net de cession</span><span>{fmt(resale.netProceeds)}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Coûts non récupérables</p>
                  <div className="flex justify-between"><span className="text-gray-500">Apport initial + frais achat</span><span>{fmt(resale.initialCashOut)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Intérêts payés</span><span>{fmt(resale.interestPaid)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Assurance payée</span><span>{fmt(resale.insurancePaid)}</span></div>
                  {resale.chargesPaid > 0 && <div className="flex justify-between"><span className="text-gray-500">Charges / taxe foncière</span><span>{fmt(resale.chargesPaid)}</span></div>}
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-2 mt-1 text-gray-700">
                    <span>Total sorti de poche</span><span>{fmt(resale.totalNonRecoverable)}</span>
                  </div>
                </div>
              </div>
              <div className={`mt-4 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${resale.netGain >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Gain / perte net après {resaleYear} an{resaleYear > 1 ? 's' : ''}</p>
                  <p className={`text-2xl font-bold ${resale.netGain >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {resale.netGain >= 0 ? '+' : ''}{fmt(resale.netGain)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-0.5">Produit net vs capital engagé</p>
                  <p className={`text-lg font-semibold ${resale.netProceeds >= resale.initialCashOut ? 'text-green-700' : 'text-red-500'}`}>
                    {resale.initialCashOut > 0 ? `${((resale.netProceeds / resale.initialCashOut - 1) * 100).toFixed(1)} % sur l'apport` : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {resalePrice === 0 ? `Appréciation ${propertyAppreciation} %/an supposée` : 'Prix de revente manuel'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Louer vs Acheter */}
          {showRentComparison && rentVsBuy && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Louer vs Acheter — Patrimoine net sur {rentVsBuy.horizon} ans</h3>
              <p className="text-xs text-gray-400 mb-4">
                Locataire investit l'apport ({fmt(requiredContrib)}) + économies mensuelles à {investmentReturnRate} %/an.
                Propriétaire : valeur nette du bien (appréciation {propertyAppreciation} %/an − dette − {resaleAgencyFeesPct} % frais revente).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className={`rounded-lg p-4 border ${rentVsBuy.advantage >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className="text-xs text-gray-500 mb-1">Patrimoine acheteur (an {rentVsBuy.horizon})</p>
                  <p className="text-xl font-bold text-indigo-700">{fmt(rentVsBuy.finalBuyWealth)}</p>
                </div>
                <div className={`rounded-lg p-4 border ${rentVsBuy.advantage < 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                  <p className="text-xs text-gray-500 mb-1">Patrimoine locataire (an {rentVsBuy.horizon})</p>
                  <p className="text-xl font-bold text-emerald-700">{fmt(rentVsBuy.finalRentWealth)}</p>
                </div>
                <div className="bg-gray-800 text-white rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    {rentVsBuy.advantage >= 0 ? 'Avantage acheteur' : 'Avantage locataire'}
                  </p>
                  <p className="text-xl font-bold">{fmt(Math.abs(rentVsBuy.advantage))}</p>
                  {rentVsBuy.crossoverYear != null
                    ? <p className="text-xs text-gray-400 mt-1">Achat rentable dès l'an {rentVsBuy.crossoverYear}</p>
                    : <p className="text-xs text-gray-400 mt-1">Achat jamais rentable sur l'horizon</p>}
                </div>
              </div>
              <div className="h-40 md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rentVsBuy.yearlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} interval={Math.max(0, Math.floor(rentVsBuy.yearlyData.length / 8) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} width={65}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M €` : v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${v} €`} />
                  <Tooltip formatter={(v, name) => [fmt(v), name === 'achat' ? 'Patrimoine acheteur' : 'Patrimoine locataire']} contentStyle={{ fontSize: 12 }} />
                  <Legend formatter={v => v === 'achat' ? 'Acheteur (valeur nette bien)' : 'Locataire (portefeuille investi)'} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="achat"     stroke="#6366f1" strokeWidth={2} dot={false} name="achat" />
                  <Line type="monotone" dataKey="location"  stroke="#10b981" strokeWidth={2} dot={false} name="location" strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Hypothèses : loyer {fmt(monthlyRent)}/mois, hausse {rentIncreaseRate} %/an — rendement placement {investmentReturnRate} %/an net — appréciation bien {propertyAppreciation} %/an.
                Le locataire investit l'apport initial + toute économie mensuelle (si mensualité achat &gt; loyer).
              </p>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Répartition des coûts globaux</h3>
              <div className="h-48 md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [fmt(value), name]} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Capital restant dû</h3>
              <div className="h-48 md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={capitalChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} interval={Math.max(0, Math.floor(capitalChartData.length / 5) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} width={58}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M €` : v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${v} €`} />
                  <Tooltip formatter={(v, name) => [fmt(v), name === 'capitalMain' ? 'Capital principal' : 'Capital PTZ']} contentStyle={{ fontSize: 12 }} />
                  {ptzEnabled && <Legend formatter={v => v === 'capitalMain' ? 'Prêt principal' : 'PTZ'} wrapperStyle={{ fontSize: 11 }} />}
                  <Area type="monotone" dataKey="capitalMain" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} name="capitalMain" dot={false} />
                  {ptzEnabled && <Area type="monotone" dataKey="capitalPtz" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} name="capitalPtz" dot={false} />}
                </ComposedChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Répartition annuelle — intérêts vs amortissement du capital</h3>
            <div className="h-48 md:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={breakdownChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} interval={Math.max(0, Math.floor(breakdownChartData.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} width={58}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${v} €`} />
                <Tooltip formatter={(v, name) => [fmt(v), name === 'interets' ? 'Intérêts' : 'Amortissement']} contentStyle={{ fontSize: 12 }} />
                <Legend formatter={v => v === 'interets' ? 'Intérêts' : 'Amortissement capital'} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="interets"      stackId="a" fill="#f97316" fillOpacity={0.85} name="interets" />
                <Bar dataKey="amortissement" stackId="a" fill="#6366f1" fillOpacity={0.85} name="amortissement" radius={[3, 3, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          </div>

          <AmortizationTable
            amortization={amortization}
            showTable={showTable} setShowTable={setShowTable}
            showMonthly={showMonthly} setShowMonthly={setShowMonthly}
            tableMaxHeight={tableMaxHeight} tableBodyRef={tableBodyRef}
            ptzEnabled={ptzEnabled} hasRepayments={hasRepayments}
            loanAmount={loanAmount} totalInterest={totalInterest} totalInsurance={totalInsurance}
            ptzAmount={ptzAmount} totalPrepayments={totalPrepayments}
            currentYear={CURRENT_YEAR}
          />
    </div>
  )
}
