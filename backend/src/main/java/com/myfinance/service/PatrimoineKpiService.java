package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.DebtTypeEnum;
import com.myfinance.domain.KpiType;
import com.myfinance.domain.OrderType;
import com.myfinance.domain.OtherIncomeTypeEnum;
import com.myfinance.domain.PositionStatus;
import com.myfinance.domain.User;
import com.myfinance.dto.KpiValueDto;
import com.myfinance.dto.PositionDto;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PatrimoineKpiService {

    private final PositionService positionService;
    private final DebtService debtService;
    private final OtherIncomeRepository otherIncomeRepository;
    private final PositionRepository positionRepository;
    private final PositionOrderRepository positionOrderRepository;
    private final PatrimoineKpiTargetService kpiTargetService;

    public List<KpiValueDto> getKpiValues(User user) {
        Map<KpiType, Double> targets = kpiTargetService.getTargets(user);
        List<KpiValueDto> result = new ArrayList<>();

        // Calculer uniquement les KPI configurés
        if (targets.containsKey(KpiType.IMMO_RENDEMENT_BRUT)) {
            result.add(computeRendementBrut(user, targets.get(KpiType.IMMO_RENDEMENT_BRUT)));
        }
        if (targets.containsKey(KpiType.IMMO_LTV)) {
            result.add(computeLtv(user, targets.get(KpiType.IMMO_LTV)));
        }
        if (targets.containsKey(KpiType.IMMO_PAPIER_RENDEMENT)) {
            result.add(computeImmoPapierRendement(user, targets.get(KpiType.IMMO_PAPIER_RENDEMENT)));
        }
        return result;
    }

    // ── Rendement locatif brut : loyers annuels / valeur IMMO_PHYSIQUE ──

    private KpiValueDto computeRendementBrut(User user, Double target) {
        // Valeur totale des biens IMMO_PHYSIQUE actifs
        List<PositionDto> immoBiens = positionService.findAllByUser(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE);
        double totalValeur = immoBiens.stream()
                .mapToDouble(p -> p.computed() != null && p.computed().currentValueEur() != null
                        ? p.computed().currentValueEur().doubleValue() : 0)
                .sum();

        if (totalValeur <= 0) {
            return new KpiValueDto(KpiType.IMMO_RENDEMENT_BRUT, null, target, true, false);
        }

        // Loyers annuels : somme des revenus LOCATIF des 12 derniers mois
        LocalDate since = LocalDate.now().minusMonths(12);
        double loyersAnnuels = otherIncomeRepository
                .findByUserAndPeriodStartIsNullAndDateBetween(user, since, LocalDate.now()).stream()
                .filter(o -> o.getType() == OtherIncomeTypeEnum.LOCATIF)
                .mapToDouble(o -> o.getAmount() != null ? o.getAmount() : 0)
                .sum();

        // Annualiser si moins de 12 mois de données disponibles
        long nbMois = otherIncomeRepository.findByUserAndPeriodStartIsNullAndDateBetween(user, since, LocalDate.now()).stream()
                .filter(o -> o.getType() == OtherIncomeTypeEnum.LOCATIF)
                .map(o -> o.getDate().getMonthValue() + "-" + o.getDate().getYear())
                .distinct().count();
        if (nbMois > 0 && nbMois < 12) {
            loyersAnnuels = loyersAnnuels / nbMois * 12;
        }

        double rendement = loyersAnnuels / totalValeur * 100;
        return new KpiValueDto(KpiType.IMMO_RENDEMENT_BRUT, rendement, target, true, true);
    }

    // ── LTV : dette immobilière / valeur IMMO (physique + papier) ──

    private KpiValueDto computeLtv(User user, Double target) {
        List<PositionDto> immoPhysique = positionService.findAllByUser(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE);
        List<PositionDto> immoPapier   = positionService.findAllByUser(user, AssetCategory.IMMO_PAPIER,   PositionStatus.ACTIVE);

        double totalImmo = valeurTotale(immoPhysique) + valeurTotale(immoPapier);
        if (totalImmo <= 0) {
            return new KpiValueDto(KpiType.IMMO_LTV, null, target, false, false);
        }

        double totalDette = debtService.findAllByUser(user).stream()
                .filter(d -> d.type() == DebtTypeEnum.IMMOBILIER && d.remainingCapital() != null)
                .mapToDouble(d -> d.remainingCapital().doubleValue())
                .sum();

        double ltv = totalDette / totalImmo * 100;
        return new KpiValueDto(KpiType.IMMO_LTV, ltv, target, false, true);
    }

    // ── Rendement IMMO_PAPIER : dividendes 12 mois / investi ──

    private KpiValueDto computeImmoPapierRendement(User user, Double target) {
        List<PositionDto> positions = positionService.findAllByUser(user, AssetCategory.IMMO_PAPIER, PositionStatus.ACTIVE);

        double totalInvesti = positions.stream()
                .mapToDouble(p -> p.computed() != null && p.computed().investedAmountEur() != null
                        ? p.computed().investedAmountEur().doubleValue() : 0)
                .sum();

        if (totalInvesti <= 0) {
            return new KpiValueDto(KpiType.IMMO_PAPIER_RENDEMENT, null, target, true, false);
        }

        LocalDate since = LocalDate.now().minusMonths(12);
        double dividendes = positionRepository
                .findByUserAndCategoryAndStatusOrderByCreatedAtDesc(user, AssetCategory.IMMO_PAPIER, PositionStatus.ACTIVE)
                .stream()
                .flatMap(pos -> positionOrderRepository.findByPositionOrderByOrderDateDesc(pos).stream()
                        .filter(o -> o.getOrderType() == OrderType.DIVIDEND
                                && o.getOrderDate() != null
                                && !o.getOrderDate().isBefore(since)
                                && o.getAmountEur() != null))
                .mapToDouble(o -> o.getAmountEur().doubleValue())
                .sum();

        double rendement = dividendes / totalInvesti * 100;
        return new KpiValueDto(KpiType.IMMO_PAPIER_RENDEMENT, rendement, target, true, true);
    }

    private static double valeurTotale(List<PositionDto> positions) {
        return positions.stream()
                .mapToDouble(p -> p.computed() != null && p.computed().currentValueEur() != null
                        ? p.computed().currentValueEur().doubleValue() : 0)
                .sum();
    }
}
