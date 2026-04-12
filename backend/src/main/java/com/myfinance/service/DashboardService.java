package com.myfinance.service;

import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.User;
import com.myfinance.dto.SalaryEvolutionPointDto;
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

    // ── Évolution salariale ────────────────────────────────────

    /**
     * Retourne l'évolution salariale de l'utilisateur, tous contrats confondus,
     * triée chronologiquement. Les bulletins d'un même mois (chevauchement de contrats)
     * sont agrégés : les montants sont sommés, les noms d'entreprises concaténés.
     */
    public List<SalaryEvolutionPointDto> getSalaryEvolution(User user) {
        return monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user)
                .stream()
                .collect(Collectors.groupingBy(MonthlyPaySlip::getPeriod))
                .entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> aggreger(entry.getKey(), entry.getValue()))
                .toList();
    }

    // ── Agrégation d'un mois ───────────────────────────────────

    private SalaryEvolutionPointDto aggreger(LocalDate period, List<MonthlyPaySlip> slips) {
        String companyName = slips.stream()
                .map(s -> s.getContract().getCompanyName())
                .distinct()
                .collect(Collectors.joining(" + "));

        float gross    = (float) slips.stream().mapToDouble(s -> s.getGrossSalary()         ).sum();
        float taxable  = (float) slips.stream().mapToDouble(s -> s.getTaxableNetSalary()    ).sum();
        float net      = (float) slips.stream().mapToDouble(s -> s.getNetSalary()           ).sum();
        float tax      = (float) slips.stream().mapToDouble(s -> s.getIncomeTaxWithholding()).sum();

        return new SalaryEvolutionPointDto(period, companyName, gross, taxable, net, tax);
    }
}
