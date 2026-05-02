package com.myfinance.service;

import com.myfinance.domain.BonusTypeEnum;
import com.myfinance.domain.ContractBonus;
import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.SalaryEvolutionPointDto;
import com.myfinance.repository.ContractBonusRepository;
import com.myfinance.repository.MonthlyPaySlipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MonthlyPaySlipRepository monthlyPaySlipRepository;
    private final ContractBonusRepository contractBonusRepository;

    // ── Évolution salariale ────────────────────────────────────

    /**
     * Retourne l'évolution salariale de l'utilisateur, tous contrats confondus,
     * triée chronologiquement. Les bulletins d'un même mois (chevauchement de contrats)
     * sont agrégés : les montants sont sommés, les noms d'entreprises concaténés.
     * Le champ bonusGrossAmount contient la somme des primes brutes applicables à chaque période.
     */
    public List<SalaryEvolutionPointDto> getSalaryEvolution(User user) {
        List<ContractBonus> allBonuses = contractBonusRepository.findByContractUser(user);

        return monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user)
                .stream()
                .collect(Collectors.groupingBy(MonthlyPaySlip::getPeriod))
                .entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> aggreger(entry.getKey(), entry.getValue(), allBonuses))
                .toList();
    }

    // ── Agrégation d'un mois ───────────────────────────────────

    private SalaryEvolutionPointDto aggreger(LocalDate period, List<MonthlyPaySlip> slips,
                                              List<ContractBonus> allBonuses) {
        String companyName = slips.stream()
                .map(s -> s.getContract().getCompanyName())
                .distinct()
                .collect(Collectors.joining(" + "));

        float gross    = (float) slips.stream().mapToDouble(s -> s.getGrossSalary()         ).sum();
        float taxable  = (float) slips.stream().mapToDouble(s -> s.getTaxableNetSalary()    ).sum();
        float net      = (float) slips.stream().mapToDouble(s -> s.getNetSalary()           ).sum();
        float tax      = (float) slips.stream().mapToDouble(s -> s.getIncomeTaxWithholding()).sum();
        float bonus    = computeBonusForPeriod(period, allBonuses);

        return new SalaryEvolutionPointDto(period, companyName, gross, taxable, net, tax, bonus);
    }

    // ── Calcul des primes pour une période ─────────────────────

    private float computeBonusForPeriod(LocalDate period, List<ContractBonus> bonuses) {
        float total = 0f;
        for (ContractBonus bonus : bonuses) {
            total += switch (bonus.getType()) {
                case EXCEPTIONNELLE -> {
                    // Versée le mois de paymentDate
                    LocalDate pd = bonus.getPaymentDate();
                    yield (pd != null
                            && pd.getYear() == period.getYear()
                            && pd.getMonthValue() == period.getMonthValue())
                            ? bonus.getGrossAmount() : 0f;
                }
                case ANNUELLE -> {
                    // Versée chaque année au mois paymentMonth, tant que le contrat est actif
                    yield (bonus.getPaymentMonth() != null
                            && bonus.getPaymentMonth() == period.getMonthValue()
                            && contractActiveInYear(bonus.getContract(), period.getYear()))
                            ? bonus.getGrossAmount() : 0f;
                }
                case MENSUELLE -> {
                    // Active entre startDate (inclus) et endDate (inclus, null = indéfini)
                    LocalDate start = bonus.getStartDate();
                    LocalDate end   = bonus.getEndDate();
                    LocalDate pEnd  = period.withDayOfMonth(period.lengthOfMonth());
                    yield (start != null && !start.isAfter(pEnd)
                            && (end == null || !end.isBefore(period.withDayOfMonth(1))))
                            ? bonus.getGrossAmount() : 0f;
                }
            };
        }
        return total;
    }

    private boolean contractActiveInYear(SalaryContract contract, int year) {
        if (contract.getStartDate() != null && contract.getStartDate().getYear() > year) return false;
        if (contract.getEndDate()   != null && contract.getEndDate().getYear()   < year) return false;
        return true;
    }
}
