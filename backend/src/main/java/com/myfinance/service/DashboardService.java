package com.myfinance.service;

import com.myfinance.domain.User;
import com.myfinance.dto.SalaryEvolutionPointDto;
import com.myfinance.repository.MonthlyPaySlipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MonthlyPaySlipRepository monthlyPaySlipRepository;

    // ── Évolution salariale ────────────────────────────────────

    /**
     * Retourne tous les bulletins de paie de l'utilisateur, tous contrats confondus,
     * triés chronologiquement. Chaque point correspond à un mois saisi réellement.
     */
    public List<SalaryEvolutionPointDto> getSalaryEvolution(User user) {
        return monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user)
                .stream()
                .map(SalaryEvolutionPointDto::from)
                .toList();
    }
}
