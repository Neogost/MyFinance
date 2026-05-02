package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.FiscalEnvelope;
import com.myfinance.domain.PositionStatus;
import com.myfinance.domain.User;
import com.myfinance.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PatrimoineScoreService {

    private final PositionService positionService;
    private final PatrimoineTargetService patrimoineTargetService;
    private final DebtService debtService;
    private final RecurringExpenseService recurringExpenseService;
    private final PortfolioSnapshotService portfolioSnapshotService;
    private final InstrumentService instrumentService;

    public PatrimoineScoreDto computeScore(User user) {
        List<PositionDto> positions = positionService.findAllByUser(user, null, PositionStatus.ACTIVE);
        Map<String, Double> targets = patrimoineTargetService.getTargets(user).targets();
        DebtSummaryDto debtSummary = debtService.getSummary(user);
        ExpenseSummaryDto expenseSummary = recurringExpenseService.getSummary(user);
        List<PortfolioSnapshotDto> snapshots = portfolioSnapshotService.findAllByUser(user);

        // Agrégation des valeurs par catégorie
        Map<String, Double> valueByCategory = new HashMap<>();
        for (PositionDto p : positions) {
            double val = p.computed() != null && p.computed().currentValueEur() != null
                    ? p.computed().currentValueEur().doubleValue() : 0.0;
            if (val > 0) {
                valueByCategory.merge(p.category().name(), val, Double::sum);
            }
        }
        double totalValue = valueByCategory.values().stream().mapToDouble(Double::doubleValue).sum();
        double liquidValue = valueByCategory.getOrDefault("LIQUIDITE", 0.0)
                + valueByCategory.getOrDefault("LIVRET", 0.0);
        // Chargement des allocations géo/sectorielles pour les positions BOURSE
        List<Long> bourseInstrumentIds = positions.stream()
                .filter(p -> p.category() == AssetCategory.BOURSE && p.instrument() != null
                        && p.instrument().id() != null)
                .map(p -> p.instrument().id())
                .distinct()
                .collect(Collectors.toList());
        InstrumentService.AllocationsBundle allocations =
                instrumentService.loadAllocationsForScore(bourseInstrumentIds);

        List<PatrimoineScoreDto.AxeScoreDto> axes = List.of(
                scoreDiversification(valueByCategory, totalValue, targets, positions, allocations),
                scoreSafetyNet(user, liquidValue, expenseSummary),
                scoreEndettement(debtSummary, expenseSummary, totalValue),
                scoreEpargne(expenseSummary),
                scoreOptimisationFiscale(positions),
                scoreProgression(snapshots)
        );

        int bonusScore = targets.size() >= 3 ? 5 : 0;
        int totalScore = axes.stream().mapToInt(PatrimoineScoreDto.AxeScoreDto::score).sum() + bonusScore;

        PatrimoineScoreDto.AxeScoreDto weakest = axes.stream()
                .filter(a -> a.maxScore() > 0)
                .min(Comparator.comparingDouble(a -> (double) a.score() / a.maxScore()))
                .orElse(null);

        PatrimoineScoreDto result = new PatrimoineScoreDto(
                totalScore,
                105,
                computeProfile(totalScore),
                weakest != null ? weakest.id() : null,
                weakest != null ? weakest.detail() : null,
                axes
        );
        log.info("[user:{}] Score patrimonial calculé: {}/105 [profil: {}]",
                user.getId(), totalScore, result.profile());
        return result;
    }

    // ── Axe 1 : Diversification (20 pts) ──────────────────────────

    private PatrimoineScoreDto.AxeScoreDto scoreDiversification(
            Map<String, Double> valueByCategory, double totalValue, Map<String, Double> targets,
            List<PositionDto> positions, InstrumentService.AllocationsBundle allocations) {
        int score = 0;

        // Liquidités exclues : elles ne reflètent pas la diversification des investissements
        Map<String, Double> investMap = valueByCategory.entrySet().stream()
                .filter(e -> !e.getKey().equals("LIQUIDITE"))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        double investTotal = investMap.values().stream().mapToDouble(Double::doubleValue).sum();

        long countCat = investMap.size();
        if (countCat >= 4) score += 8;
        else if (countCat == 3) score += 4;
        else if (countCat == 2) score += 2;

        double maxPct = 0;
        String maxCat = null;
        if (investTotal > 0) {
            for (Map.Entry<String, Double> e : investMap.entrySet()) {
                double pct = e.getValue() / investTotal;
                if (pct > maxPct) { maxPct = pct; maxCat = e.getKey(); }
            }
            if (maxPct <= 0.60) score += 7;
        }

        long onTrack = 0;
        if (!targets.isEmpty() && investTotal > 0) {
            onTrack = targets.entrySet().stream()
                    .filter(e -> e.getValue() != null && e.getValue() > 0)
                    .filter(e -> investMap.getOrDefault(e.getKey(), 0.0) >= e.getValue() * 0.5)
                    .count();
            if (onTrack >= 3) score += 5;
            else if (onTrack >= 2) score += 3;
            else if (onTrack >= 1) score += 1;
        }

        StringBuilder detail = new StringBuilder();
        detail.append(String.format("%d catégorie(s) d'investissement active(s) sur 5 (hors liquidités).", countCat));
        if (maxCat != null && maxPct > 0.60) {
            detail.append(String.format(" %s représente %.0f%% du total (seuil max 60%%).", maxCat, maxPct * 100));
        } else if (maxCat != null) {
            detail.append(String.format(" Concentration max : %s à %.0f%%.", maxCat, maxPct * 100));
        }
        if (!targets.isEmpty()) {
            detail.append(String.format(" %d/%d objectif(s) à mi-chemin ou dépassés.", onTrack, targets.size()));
        }

        // Sous-score géographique (+3 pts max, conditionnel)
        double bourseTotal = valueByCategory.getOrDefault("BOURSE", 0.0);
        if (bourseTotal > 0 && !allocations.byCountry().isEmpty()) {
            Map<String, Double> geoExp = new HashMap<>();
            double covered = 0;
            for (PositionDto p : positions) {
                if (p.category() != AssetCategory.BOURSE || p.instrument() == null) continue;
                double v = posValue(p);
                if (v <= 0) continue;
                List<InstrumentAllocationDto> allocs = allocations.byCountry().get(p.instrument().id());
                if (allocs != null && !allocs.isEmpty()) {
                    covered += v;
                    allocs.forEach(a -> geoExp.merge(a.country(), v * a.percentage().doubleValue() / 100, Double::sum));
                }
            }
            if (covered / bourseTotal >= 0.30 && !geoExp.isEmpty()) {
                double geoTotal = geoExp.values().stream().mapToDouble(Double::doubleValue).sum();
                double maxCountryPct = geoExp.values().stream().mapToDouble(Double::doubleValue).max().orElse(0) / geoTotal;
                int geoBonus = 0;
                if (maxCountryPct <= 0.60) geoBonus += 2;
                if (geoExp.size() >= 5) geoBonus += 1;
                score = Math.min(20, score + geoBonus);
                String topCountry = geoExp.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(e -> String.format("%s (%.0f%%)", e.getKey(), e.getValue() / geoTotal * 100))
                        .orElse("?");
                detail.append(String.format(" Géo : %d pays, 1er = %s.", geoExp.size(), topCountry));
            }
        }

        // Sous-score sectoriel (+2 pts max, conditionnel)
        if (bourseTotal > 0 && !allocations.bySector().isEmpty()) {
            Map<String, Double> secExp = new HashMap<>();
            double covered = 0;
            for (PositionDto p : positions) {
                if (p.category() != AssetCategory.BOURSE || p.instrument() == null) continue;
                double v = posValue(p);
                if (v <= 0) continue;
                List<InstrumentSectorAllocationDto> allocs = allocations.bySector().get(p.instrument().id());
                if (allocs != null && !allocs.isEmpty()) {
                    covered += v;
                    allocs.forEach(a -> secExp.merge(a.sector(), v * a.percentage().doubleValue() / 100, Double::sum));
                }
            }
            if (covered / bourseTotal >= 0.30 && !secExp.isEmpty()) {
                double secTotal = secExp.values().stream().mapToDouble(Double::doubleValue).sum();
                long sigSectors = secExp.values().stream().filter(v -> v / secTotal >= 0.01).count();
                int secBonus = sigSectors >= 5 ? 2 : sigSectors >= 3 ? 1 : 0;
                score = Math.min(20, score + secBonus);
                detail.append(String.format(" Secteurs : %d détectés.", sigSectors));
            }
        }

        return new PatrimoineScoreDto.AxeScoreDto("DIVERSIFICATION", "Diversification", Math.min(score, 20), 20, detail.toString(), false);
    }

    private static double posValue(PositionDto p) {
        return p.computed() != null && p.computed().currentValueEur() != null
                ? p.computed().currentValueEur().doubleValue() : 0.0;
    }

    // ── Axe 2 : Matelas de sécurité (15 pts) ──────────────────────

    private PatrimoineScoreDto.AxeScoreDto scoreSafetyNet(User user, double liquidValue, ExpenseSummaryDto expenses) {
        if (user.getSafetyNetMode() == null) {
            return new PatrimoineScoreDto.AxeScoreDto("MATELAS", "Matelas de sécurité", 0, 15,
                    "Matelas de sécurité non configuré dans Mon Profil — définissez votre objectif pour activer cet axe.", true);
        }

        double target = switch (user.getSafetyNetMode()) {
            case MONTHS_EXPENSES -> {
                Float monthly = expenses.totalMonthlyExpenses();
                Double months = user.getSafetyNetMonths();
                yield (monthly != null && months != null) ? monthly * months : 0;
            }
            case MONTHS_SALARY -> {
                Float income = expenses.monthlyNetIncome();
                Double months = user.getSafetyNetMonths();
                yield (income != null && months != null) ? income * months : 0;
            }
            case FIXED_AMOUNT -> {
                Double amount = user.getSafetyNetAmount();
                yield amount != null ? amount : 0;
            }
        };

        if (target <= 0) {
            return new PatrimoineScoreDto.AxeScoreDto("MATELAS", "Matelas de sécurité", 0, 15,
                    "Impossible de calculer l'objectif — vérifiez la configuration du matelas dans Mon Profil.", true);
        }

        double coverage = liquidValue / target;
        int score;
        if (coverage >= 1.0) score = 15;
        else if (coverage >= 0.66) score = 10;
        else if (coverage >= 0.33) score = 5;
        else score = 0;

        String detail = String.format(
                "Liquidités + Livrets : %.0f € — objectif : %.0f € — couverture : %.0f%%.",
                liquidValue, target, coverage * 100);

        return new PatrimoineScoreDto.AxeScoreDto("MATELAS", "Matelas de sécurité", score, 15, detail, false);
    }

    // ── Axe 3 : Endettement (20 pts) ──────────────────────────────

    private PatrimoineScoreDto.AxeScoreDto scoreEndettement(
            DebtSummaryDto debt, ExpenseSummaryDto expenses, double totalValue) {
        int score = 0;

        double monthlyCost = debt.totalMonthlyCost() != null ? debt.totalMonthlyCost().doubleValue() : 0;
        Float monthlyIncome = expenses.monthlyNetIncome();
        double remainingCapital = debt.totalRemainingCapital() != null
                ? debt.totalRemainingCapital().doubleValue() : 0;

        if (monthlyCost == 0) {
            score += 16;
        } else if (monthlyIncome != null && monthlyIncome > 0) {
            double debtRate = monthlyCost / monthlyIncome;
            if (debtRate < 0.20) score += 16;
            else if (debtRate < 0.33) score += 12;
            else if (debtRate < 0.40) score += 5;
        }

        if (remainingCapital == 0) {
            score += 4;
        } else if (totalValue > 0) {
            double ratio = remainingCapital / totalValue;
            if (ratio < 0.30) score += 4;
            else if (ratio < 0.60) score += 2;
        }

        String detail;
        if (monthlyCost == 0) {
            detail = "Aucune dette — score maximal sur cet axe.";
        } else if (monthlyIncome != null && monthlyIncome > 0) {
            double debtRate = monthlyCost / monthlyIncome * 100;
            double patrimoineRatio = totalValue > 0 ? remainingCapital / totalValue * 100 : 0;
            detail = String.format(
                    "Taux d'endettement : %.1f%% (seuil max 33%%). Ratio dette/patrimoine : %.1f%%.",
                    debtRate, patrimoineRatio);
        } else {
            detail = String.format(
                    "Mensualités : %.0f €/mois. Revenus non disponibles pour calculer le taux d'endettement.", monthlyCost);
        }

        boolean endettementMissing = monthlyCost > 0 && (monthlyIncome == null || monthlyIncome <= 0);
        return new PatrimoineScoreDto.AxeScoreDto("ENDETTEMENT", "Endettement", Math.min(score, 20), 20, detail, endettementMissing);
    }

    // ── Axe 4 : Capacité d'épargne (20 pts) ───────────────────────

    private PatrimoineScoreDto.AxeScoreDto scoreEpargne(ExpenseSummaryDto expenses) {
        Float savingsRate = expenses.savingsRate();
        int score;
        if (savingsRate == null) score = 0;
        else if (savingsRate > 20) score = 20;
        else if (savingsRate > 10) score = 14;
        else if (savingsRate > 5) score = 8;
        else score = 0;

        String detail = savingsRate != null
                ? String.format("Taux d'épargne : %.1f%% (revenus nets − dépenses récurrentes).", savingsRate)
                : "Revenus non disponibles — renseignez un contrat salarial actif pour calculer le taux d'épargne.";

        return new PatrimoineScoreDto.AxeScoreDto("EPARGNE", "Capacité d'épargne", score, 20, detail, savingsRate == null);
    }

    // ── Axe 5 : Optimisation fiscale (15 pts) ─────────────────────

    private PatrimoineScoreDto.AxeScoreDto scoreOptimisationFiscale(List<PositionDto> positions) {
        List<PositionDto> eligibles = positions.stream()
                .filter(p -> p.category() == AssetCategory.BOURSE || p.category() == AssetCategory.IMMO_PAPIER)
                .filter(p -> p.computed() != null && p.computed().currentValueEur() != null)
                .toList();

        if (eligibles.isEmpty()) {
            return new PatrimoineScoreDto.AxeScoreDto("OPTIMISATION_FISCALE", "Optimisation fiscale", 15, 15,
                    "Aucune position BOURSE ou IMMO_PAPIER — axe non applicable.", false);
        }

        double totalEligible = eligibles.stream()
                .mapToDouble(p -> p.computed().currentValueEur().doubleValue())
                .sum();

        double taxAdvantagedValue = eligibles.stream()
                .filter(p -> p.fiscalEnvelope() == FiscalEnvelope.PEA
                          || p.fiscalEnvelope() == FiscalEnvelope.AV
                          || p.fiscalEnvelope() == FiscalEnvelope.PEE_PERCO)
                .mapToDouble(p -> p.computed().currentValueEur().doubleValue())
                .sum();

        double pct = totalEligible > 0 ? taxAdvantagedValue / totalEligible : 0;

        int score;
        if (pct >= 0.80) score = 15;
        else if (pct >= 0.60) score = 10;
        else if (pct >= 0.40) score = 5;
        else score = 0;

        String detail = String.format(
                "%.0f %% de BOURSE+IMMO_PAPIER en enveloppe avantageuse (PEA, AV, PEE) — %.0f € sur %.0f € total.",
                pct * 100, taxAdvantagedValue, totalEligible);

        return new PatrimoineScoreDto.AxeScoreDto("OPTIMISATION_FISCALE", "Optimisation fiscale", score, 15, detail, false);
    }

    // ── Axe 6 : Progression patrimoniale (10 pts) ─────────────────

    private PatrimoineScoreDto.AxeScoreDto scoreProgression(List<PortfolioSnapshotDto> snapshots) {
        if (snapshots.size() < 2) {
            return new PatrimoineScoreDto.AxeScoreDto("PROGRESSION", "Progression", 0, 10,
                    String.format("%d relevé(s) disponible(s) — il en faut au moins 2 pour calculer la progression.",
                            snapshots.size()), true);
        }

        PortfolioSnapshotDto newest = snapshots.get(0);
        PortfolioSnapshotDto oldest = snapshots.get(Math.min(snapshots.size() - 1, 5));

        if (newest.totalCurrentValueEur() == null || oldest.totalCurrentValueEur() == null) {
            return new PatrimoineScoreDto.AxeScoreDto("PROGRESSION", "Progression", 0, 10,
                    "Données manquantes sur certains relevés — recalculez vos relevés existants.", true);
        }

        double newVal = newest.totalCurrentValueEur().doubleValue();
        double oldVal = oldest.totalCurrentValueEur().doubleValue();

        if (oldVal <= 0) {
            return new PatrimoineScoreDto.AxeScoreDto("PROGRESSION", "Progression", 0, 10,
                    "Valeur initiale nulle — impossible de calculer la progression.", true);
        }

        double growth = (newVal - oldVal) / oldVal;
        int score;
        if (growth > 0.02) score = 10;
        else if (growth > 0.01) score = 6;
        else if (growth >= 0) score = 3;
        else score = 0;

        int nbSnapshots = Math.min(snapshots.size(), 6);
        String sign = growth >= 0 ? "+" : "";
        String detail = String.format(
                "Évolution sur %d relevé(s) : %s%.1f%% (de %.0f € à %.0f €).",
                nbSnapshots, sign, growth * 100, oldVal, newVal);

        return new PatrimoineScoreDto.AxeScoreDto("PROGRESSION", "Progression", score, 10, detail, false);
    }

    // ── Helpers ────────────────────────────────────────────────────

    private String computeProfile(int totalScore) {
        if (totalScore > 82) return "OPTIMISE";
        if (totalScore > 69) return "DYNAMIQUE";
        if (totalScore > 54) return "EQUILIBRE";
        if (totalScore > 34) return "PRUDENT";
        return "FRAGILE";
    }
}
