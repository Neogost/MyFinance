package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.DebtDto;
import com.myfinance.dto.KpiValueDto;
import com.myfinance.dto.PositionComputedDto;
import com.myfinance.dto.PositionDto;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatrimoineKpiServiceTest {

    @Mock PositionService positionService;
    @Mock DebtService debtService;
    @Mock OtherIncomeRepository otherIncomeRepository;
    @Mock PositionRepository positionRepository;
    @Mock PositionOrderRepository positionOrderRepository;
    @Mock PatrimoineKpiTargetService kpiTargetService;

    @InjectMocks PatrimoineKpiService service;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("test").role(RoleEnum.USER).build();
    }

    // ── getKpiValues : aucun KPI configuré ────────────────────────────────────

    @Test
    void getKpiValues_aucunKpiConfigure_retourneListeVide() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of());

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result).isEmpty();
    }

    // ── IMMO_RENDEMENT_BRUT ──────────────────────────────────────────────────

    @Test
    void rendementBrut_aucunBienImmoPhysique_retourneHasDataFalse() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(KpiType.IMMO_RENDEMENT_BRUT, 5.0));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of());

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result).hasSize(1);
        KpiValueDto kpi = result.get(0);
        assertThat(kpi.kpiType()).isEqualTo(KpiType.IMMO_RENDEMENT_BRUT);
        assertThat(kpi.actualValue()).isNull();
        assertThat(kpi.targetValue()).isEqualTo(5.0);
        assertThat(kpi.hasData()).isFalse();
        assertThat(kpi.higherIsBetter()).isTrue();
    }

    @Test
    void rendementBrut_avecLoyersAnnuels12Mois_calculeRendement() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(KpiType.IMMO_RENDEMENT_BRUT, 5.0));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of(immoBien(200_000)));
        // 12 mois de loyers à 800€ → 9600€/an → rendement 4.8%
        List<OtherIncome> loyers = month12Loyers(800f);
        when(otherIncomeRepository.findByUserAndPeriodStartIsNullAndDateBetween(eq(user), any(), any()))
                .thenReturn(loyers);

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result.get(0).actualValue()).isCloseTo(4.8, within(0.01));
        assertThat(result.get(0).hasData()).isTrue();
    }

    @Test
    void rendementBrut_avecMoinsDe12Mois_annualise() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(KpiType.IMMO_RENDEMENT_BRUT, 5.0));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of(immoBien(120_000)));
        // 3 mois de loyer 600€ → annualisé : 600×3 / 3 ×12 = 7200€/an → 6%
        List<OtherIncome> loyers = List.of(
                locatif(600f, LocalDate.now().minusMonths(1)),
                locatif(600f, LocalDate.now().minusMonths(2)),
                locatif(600f, LocalDate.now().minusMonths(3)));
        when(otherIncomeRepository.findByUserAndPeriodStartIsNullAndDateBetween(eq(user), any(), any()))
                .thenReturn(loyers);

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result.get(0).actualValue()).isCloseTo(6.0, within(0.01));
    }

    @Test
    void rendementBrut_ignoreLesAutresTypesDeRevenu() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(KpiType.IMMO_RENDEMENT_BRUT, 5.0));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of(immoBien(100_000)));
        // Un dividende ne doit pas être compté
        List<OtherIncome> revenus = List.of(
                OtherIncome.builder().type(OtherIncomeTypeEnum.DIVIDENDE).amount(500f).date(LocalDate.now()).build());
        when(otherIncomeRepository.findByUserAndPeriodStartIsNullAndDateBetween(eq(user), any(), any()))
                .thenReturn(revenus);

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result.get(0).actualValue()).isEqualTo(0.0);  // pas de LOCATIF → 0 €
    }

    // ── IMMO_LTV ──────────────────────────────────────────────────────────────

    @Test
    void ltv_aucunImmo_retourneHasDataFalse() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(KpiType.IMMO_LTV, 70.0));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of());
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PAPIER, PositionStatus.ACTIVE))
                .thenReturn(List.of());

        List<KpiValueDto> result = service.getKpiValues(user);

        KpiValueDto kpi = result.get(0);
        assertThat(kpi.actualValue()).isNull();
        assertThat(kpi.hasData()).isFalse();
        assertThat(kpi.higherIsBetter()).isFalse();  // LTV : lower is better
    }

    @Test
    void ltv_calculeRatioDetteSurValeurImmo() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(KpiType.IMMO_LTV, 70.0));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of(immoBien(300_000)));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PAPIER, PositionStatus.ACTIVE))
                .thenReturn(List.of(immoBien(50_000)));
        // Total immo : 350_000, dette : 175_000 → LTV 50%
        when(debtService.findAllByUser(user)).thenReturn(List.of(
                debtImmo(175_000),
                debtConsommation(20_000)));  // ignorée (pas IMMOBILIER)

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result.get(0).actualValue()).isCloseTo(50.0, within(0.01));
        assertThat(result.get(0).hasData()).isTrue();
    }

    @Test
    void ltv_aucuneDetteImmo_retourneZero() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(KpiType.IMMO_LTV, 70.0));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE))
                .thenReturn(List.of(immoBien(200_000)));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PAPIER, PositionStatus.ACTIVE))
                .thenReturn(List.of());
        when(debtService.findAllByUser(user)).thenReturn(List.of());

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result.get(0).actualValue()).isEqualTo(0.0);
        assertThat(result.get(0).hasData()).isTrue();
    }

    // ── IMMO_PAPIER_RENDEMENT ─────────────────────────────────────────────────

    @Test
    void immoPapierRendement_aucunInvesti_retourneHasDataFalse() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(KpiType.IMMO_PAPIER_RENDEMENT, 4.0));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PAPIER, PositionStatus.ACTIVE))
                .thenReturn(List.of());

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result.get(0).actualValue()).isNull();
        assertThat(result.get(0).hasData()).isFalse();
    }

    @Test
    void immoPapierRendement_calculeRendementSurInvesti() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(KpiType.IMMO_PAPIER_RENDEMENT, 4.0));
        when(positionService.findAllByUser(user, AssetCategory.IMMO_PAPIER, PositionStatus.ACTIVE))
                .thenReturn(List.of(immoPapierInvesti(50_000)));

        // Position pour récupérer ordres
        Position pos = Position.builder().id(10L).category(AssetCategory.IMMO_PAPIER).build();
        when(positionRepository.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(
                user, AssetCategory.IMMO_PAPIER, PositionStatus.ACTIVE))
                .thenReturn(List.of(pos));
        // 2000€ de dividendes dans les 12 derniers mois
        when(positionOrderRepository.findByPositionOrderByOrderDateDesc(pos))
                .thenReturn(List.of(
                        dividend(LocalDate.now().minusMonths(3), 1000),
                        dividend(LocalDate.now().minusMonths(6), 1000),
                        // ancien dividende ignoré (>12 mois)
                        dividend(LocalDate.now().minusMonths(15), 5000)));

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result.get(0).actualValue()).isCloseTo(4.0, within(0.01));  // 2000/50000 = 4%
        assertThat(result.get(0).hasData()).isTrue();
    }

    // ── Combinaison : les 3 KPI configurés ───────────────────────────────────

    @Test
    void getKpiValues_les3KpiConfigures_retourneLes3() {
        when(kpiTargetService.getTargets(user)).thenReturn(Map.of(
                KpiType.IMMO_RENDEMENT_BRUT, 5.0,
                KpiType.IMMO_LTV, 70.0,
                KpiType.IMMO_PAPIER_RENDEMENT, 4.0));
        // Aucune donnée — chaque KPI retourne hasData=false
        when(positionService.findAllByUser(any(), any(), any())).thenReturn(List.of());

        List<KpiValueDto> result = service.getKpiValues(user);

        assertThat(result)
                .hasSize(3)
                .extracting(KpiValueDto::kpiType)
                .containsExactlyInAnyOrder(
                        KpiType.IMMO_RENDEMENT_BRUT, KpiType.IMMO_LTV, KpiType.IMMO_PAPIER_RENDEMENT);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private PositionDto immoBien(long valeur) {
        return new PositionDto(
                1L, AssetCategory.IMMO_PHYSIQUE, null, null, "EUR", null,
                null, null,
                null, null, null, null, null, null,
                null, null, null, null, PositionStatus.ACTIVE,
                null, null, null,
                new PositionComputedDto(BigDecimal.valueOf(valeur), BigDecimal.valueOf(valeur),
                        BigDecimal.ZERO, null, null));
    }

    private PositionDto immoPapierInvesti(long investi) {
        return new PositionDto(
                2L, AssetCategory.IMMO_PAPIER, null, null, "EUR", null,
                null, null,
                null, null, null, null, null, null,
                null, null, null, null, PositionStatus.ACTIVE,
                null, null, null,
                new PositionComputedDto(BigDecimal.valueOf(investi), BigDecimal.valueOf(investi),
                        BigDecimal.ZERO, null, null));
    }

    private OtherIncome locatif(float amount, LocalDate date) {
        return OtherIncome.builder()
                .type(OtherIncomeTypeEnum.LOCATIF).amount(amount).date(date).build();
    }

    /** Génère 12 entrées de loyer mensuel (un mois distinct chacune). */
    private List<OtherIncome> month12Loyers(float amount) {
        List<OtherIncome> result = new java.util.ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            result.add(locatif(amount, LocalDate.now().minusMonths(i)));
        }
        return result;
    }

    private DebtDto debtImmo(long remaining) {
        return new DebtDto(1L, DebtTypeEnum.IMMOBILIER, "Crédit", "Bank",
                null, null, null, null, null, null,
                BigDecimal.valueOf(remaining), true, null, null, null, null, "EUR", null, null);
    }

    private DebtDto debtConsommation(long remaining) {
        return new DebtDto(2L, DebtTypeEnum.CONSOMMATION, "Conso", "Bank",
                null, null, null, null, null, null,
                BigDecimal.valueOf(remaining), true, null, null, null, null, "EUR", null, null);
    }

    private PositionOrder dividend(LocalDate date, long amount) {
        return PositionOrder.builder()
                .orderType(OrderType.DIVIDEND)
                .orderDate(date)
                .amountEur(BigDecimal.valueOf(amount))
                .build();
    }
}
