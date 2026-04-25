package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.DebtBalanceEntryRepository;
import com.myfinance.repository.DebtRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DebtServiceTest {

    @Mock DebtRepository debtRepository;
    @Mock DebtBalanceEntryRepository balanceEntryRepository;
    @InjectMocks DebtService debtService;

    User owner;
    User otherUser;
    User admin;
    Debt debt;

    @BeforeEach
    void setUp() {
        owner     = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("other").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").role(RoleEnum.ADMIN).build();

        debt = Debt.builder()
                .id(1L)
                .user(owner)
                .type(DebtTypeEnum.IMMOBILIER)
                .label("Crédit appart")
                .initialCapital(new BigDecimal("200000.00"))
                .annualRate(new BigDecimal("0.03250"))
                .monthlyPayment(new BigDecimal("900.00"))
                .startDate(LocalDate.of(2020, 1, 1))
                .currency("EUR")
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLaListe() {
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(owner)).thenReturn(List.of(debt));

        List<DebtDto> result = debtService.findAllByUser(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).label()).isEqualTo("Crédit appart");
    }

    // ── findById ───────────────────────────────────────────────

    @Test
    void findById_retourneLDto() {
        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));

        DebtDto result = debtService.findById(1L, owner);

        assertThat(result.id()).isEqualTo(1L);
    }

    @Test
    void findById_leve404_siIntrouvable() {
        when(debtRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> debtService.findById(99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void findById_leve403_siAutreUtilisateur() {
        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));

        assertThatThrownBy(() -> debtService.findById(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void findById_autorisePourAdmin() {
        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));

        assertThatNoException().isThrownBy(() -> debtService.findById(1L, admin));
    }

    // ── getSummary ─────────────────────────────────────────────

    @Test
    void getSummary_retourneLesTotaux() {
        when(debtRepository.findByUserOrderByTypeAscLabelAsc(owner)).thenReturn(List.of(debt));

        DebtSummaryDto summary = debtService.getSummary(owner);

        assertThat(summary.totalCount()).isEqualTo(1);
        assertThat(summary.totalRemainingCapital()).isPositive();
        assertThat(summary.byType()).hasSize(1);
        assertThat(summary.byType().get(0).type()).isEqualTo(DebtTypeEnum.IMMOBILIER);
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLDto() {
        CreateDebtRequest request = new CreateDebtRequest(
                DebtTypeEnum.ETUDIANT, "Prêt étudiant", "BNP",
                LocalDate.of(2021, 9, 1), null,
                new BigDecimal("15000.00"), new BigDecimal("0.0150"),
                null, new BigDecimal("150.00"), null, "EUR", null);

        when(debtRepository.save(any(Debt.class))).thenAnswer(inv -> {
            Debt d = inv.getArgument(0);
            return Debt.builder().id(2L).user(owner)
                    .type(d.getType()).label(d.getLabel())
                    .initialCapital(d.getInitialCapital())
                    .annualRate(d.getAnnualRate())
                    .monthlyPayment(d.getMonthlyPayment())
                    .startDate(d.getStartDate())
                    .currency("EUR")
                    .build();
        });

        DebtDto result = debtService.create(request, owner);

        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.type()).isEqualTo(DebtTypeEnum.ETUDIANT);
        verify(debtRepository).save(any(Debt.class));
    }

    @Test
    void create_utiliseCurrencyParDefaut_siNull() {
        CreateDebtRequest request = new CreateDebtRequest(
                DebtTypeEnum.VEHICULE, "Crédit auto", null,
                null, null,
                new BigDecimal("20000.00"), new BigDecimal("0.0200"),
                null, new BigDecimal("350.00"), null, null, null);

        when(debtRepository.save(any(Debt.class))).thenAnswer(inv -> {
            Debt d = inv.getArgument(0);
            return Debt.builder().id(3L).user(owner)
                    .type(d.getType()).label(d.getLabel())
                    .initialCapital(d.getInitialCapital())
                    .annualRate(d.getAnnualRate())
                    .monthlyPayment(d.getMonthlyPayment())
                    .currency(d.getCurrency())
                    .build();
        });

        DebtDto result = debtService.create(request, owner);

        assertThat(result.currency()).isEqualTo("EUR");
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLaDette() {
        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));
        when(debtRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateDebtRequest request = new UpdateDebtRequest(
                DebtTypeEnum.IMMOBILIER, "Crédit modifié", "Société Générale",
                LocalDate.of(2020, 1, 1), null,
                new BigDecimal("200000.00"), new BigDecimal("0.03250"),
                new BigDecimal("0.00350"), new BigDecimal("920.00"), null, "EUR", null);

        DebtDto result = debtService.update(1L, request, owner);

        assertThat(result.label()).isEqualTo("Crédit modifié");
        assertThat(result.lender()).isEqualTo("Société Générale");
    }

    @Test
    void update_leve404_siIntrouvable() {
        when(debtRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> debtService.update(99L,
                new UpdateDebtRequest(DebtTypeEnum.AUTRE, "X", null, null, null,
                        BigDecimal.ONE, BigDecimal.ZERO, null, null, null, "EUR", null), owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_leve403_siAutreUtilisateur() {
        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));

        assertThatThrownBy(() -> debtService.update(1L,
                new UpdateDebtRequest(DebtTypeEnum.IMMOBILIER, "Test", null, null, null,
                        new BigDecimal("200000"), BigDecimal.ZERO, null, null, null, "EUR", null), otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(debtRepository, never()).save(any());
    }

    @Test
    void update_autorisePourAdmin() {
        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));
        when(debtRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> debtService.update(1L,
                new UpdateDebtRequest(DebtTypeEnum.IMMOBILIER, "Test", null, null, null,
                        new BigDecimal("200000"), BigDecimal.ZERO, null, null, null, "EUR", null), admin));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLaDette() {
        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));

        debtService.delete(1L, owner);

        verify(balanceEntryRepository).deleteByDebt(debt);
        verify(debtRepository).delete(debt);
    }

    @Test
    void delete_leve403_siPasLeProprietaire() {
        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));

        assertThatThrownBy(() -> debtService.delete(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(debtRepository, never()).delete(any());
    }

    // ── balance entries ────────────────────────────────────────

    @Test
    void getBalanceEntries_retourneLaListe() {
        DebtBalanceEntry entry = DebtBalanceEntry.builder()
                .id(1L).debt(debt)
                .entryDate(LocalDate.of(2024, 6, 1))
                .balance(new BigDecimal("185000.00"))
                .build();

        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));
        when(balanceEntryRepository.findByDebtOrderByEntryDateDesc(debt)).thenReturn(List.of(entry));

        List<DebtBalanceEntryDto> result = debtService.getBalanceEntries(1L, owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).balance()).isEqualByComparingTo("185000.00");
    }

    @Test
    void addBalanceEntry_sauvegardeEtMetsAJourOverride() {
        CreateDebtBalanceEntryRequest request = new CreateDebtBalanceEntryRequest(
                LocalDate.of(2024, 6, 1), new BigDecimal("185000.00"), "Relevé bancaire juin");

        DebtBalanceEntry saved = DebtBalanceEntry.builder()
                .id(1L).debt(debt)
                .entryDate(request.entryDate())
                .balance(request.balance())
                .note(request.note())
                .build();

        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));
        when(balanceEntryRepository.save(any())).thenReturn(saved);
        when(balanceEntryRepository.findFirstByDebtOrderByEntryDateDesc(debt)).thenReturn(Optional.of(saved));
        when(debtRepository.save(any())).thenReturn(debt);

        DebtBalanceEntryDto result = debtService.addBalanceEntry(1L, request, owner);

        assertThat(result.balance()).isEqualByComparingTo("185000.00");
        verify(debtRepository).save(debt);
    }

    @Test
    void deleteBalanceEntry_repasseEnModeProjection_siPlusDentree() {
        DebtBalanceEntry entry = DebtBalanceEntry.builder()
                .id(1L).debt(debt)
                .entryDate(LocalDate.of(2024, 6, 1))
                .balance(new BigDecimal("185000.00"))
                .build();
        debt.setRemainingCapitalOverride(new BigDecimal("185000.00"));

        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));
        when(balanceEntryRepository.findById(1L)).thenReturn(Optional.of(entry));
        when(balanceEntryRepository.findFirstByDebtOrderByEntryDateDesc(debt)).thenReturn(Optional.empty());
        when(debtRepository.save(any())).thenReturn(debt);

        debtService.deleteBalanceEntry(1L, 1L, owner);

        verify(balanceEntryRepository).deleteById(1L);
        assertThat(debt.getRemainingCapitalOverride()).isNull();
    }

    @Test
    void deleteBalanceEntry_leve404_siEntreeIntrouvable() {
        when(debtRepository.findById(1L)).thenReturn(Optional.of(debt));
        when(balanceEntryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> debtService.deleteBalanceEntry(1L, 99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
