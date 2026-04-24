package com.myfinance.service;

import com.myfinance.domain.Debt;
import com.myfinance.domain.DebtBalanceEntry;
import com.myfinance.domain.DebtTypeEnum;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.repository.DebtBalanceEntryRepository;
import com.myfinance.repository.DebtRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DebtService {

    private final DebtRepository debtRepository;
    private final DebtBalanceEntryRepository balanceEntryRepository;

    // ── Lecture ────────────────────────────────────────────────

    public List<DebtDto> findAllByUser(User user) {
        return debtRepository.findByUserOrderByTypeAscLabelAsc(user)
                .stream()
                .map(DebtDto::from)
                .toList();
    }

    public DebtDto findById(Long id, User currentUser) {
        return DebtDto.from(getWithOwnershipCheck(id, currentUser));
    }

    public DebtSummaryDto getSummary(User user) {
        List<DebtDto> dtos = findAllByUser(user);

        BigDecimal totalRemaining = dtos.stream()
                .map(DebtDto::remainingCapital)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPayment = dtos.stream()
                .filter(d -> d.monthlyPayment() != null)
                .map(DebtDto::monthlyPayment)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalInsurance = dtos.stream()
                .map(DebtDto::monthlyInsuranceCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCost = dtos.stream()
                .map(DebtDto::monthlyTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<DebtTypeEnum, List<DebtDto>> byType = dtos.stream()
                .collect(Collectors.groupingBy(DebtDto::type));

        List<DebtTypeSummaryDto> typeSummaries = byType.entrySet().stream()
                .map(entry -> {
                    List<DebtDto> items = entry.getValue();
                    BigDecimal typeRemaining = items.stream()
                            .map(DebtDto::remainingCapital)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal typePayment = items.stream()
                            .filter(d -> d.monthlyPayment() != null)
                            .map(DebtDto::monthlyPayment)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal typeInsurance = items.stream()
                            .map(DebtDto::monthlyInsuranceCost)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new DebtTypeSummaryDto(
                            entry.getKey(),
                            items.size(),
                            typeRemaining.setScale(2, RoundingMode.HALF_UP),
                            typePayment.setScale(2, RoundingMode.HALF_UP),
                            typeInsurance.setScale(2, RoundingMode.HALF_UP)
                    );
                })
                .sorted(Comparator.comparing(s -> s.type().name()))
                .toList();

        return new DebtSummaryDto(
                dtos.size(),
                totalRemaining.setScale(2, RoundingMode.HALF_UP),
                totalPayment.setScale(2, RoundingMode.HALF_UP),
                totalInsurance.setScale(2, RoundingMode.HALF_UP),
                totalCost.setScale(2, RoundingMode.HALF_UP),
                typeSummaries
        );
    }

    // ── Création ───────────────────────────────────────────────

    public DebtDto create(CreateDebtRequest request, User user) {
        Debt debt = Debt.builder()
                .user(user)
                .type(request.type())
                .label(request.label())
                .lender(request.lender())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .initialCapital(request.initialCapital())
                .annualRate(request.annualRate())
                .insuranceRate(request.insuranceRate())
                .monthlyPayment(request.monthlyPayment())
                .remainingCapitalOverride(request.remainingCapitalOverride())
                .currency(request.currency() != null ? request.currency() : "EUR")
                .positionId(request.positionId())
                .build();

        DebtDto dto = DebtDto.from(debtRepository.save(debt));
        log.info("[user:{}] Dette créée #{} [type: {}]", user.getId(), dto.id(), request.type());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public DebtDto update(Long id, UpdateDebtRequest request, User currentUser) {
        Debt debt = getWithOwnershipCheck(id, currentUser);

        debt.setType(request.type());
        debt.setLabel(request.label());
        debt.setLender(request.lender());
        debt.setStartDate(request.startDate());
        debt.setEndDate(request.endDate());
        debt.setInitialCapital(request.initialCapital());
        debt.setAnnualRate(request.annualRate());
        debt.setInsuranceRate(request.insuranceRate());
        debt.setMonthlyPayment(request.monthlyPayment());
        debt.setRemainingCapitalOverride(request.remainingCapitalOverride());
        if (request.currency() != null) debt.setCurrency(request.currency());
        debt.setPositionId(request.positionId());

        DebtDto dto = DebtDto.from(debtRepository.save(debt));
        log.info("[user:{}] Dette modifiée #{} [type: {}]", currentUser.getId(), id, request.type());
        return dto;
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id, User currentUser) {
        getWithOwnershipCheck(id, currentUser);
        debtRepository.deleteById(id);
        log.info("[user:{}] Dette supprimée #{}", currentUser.getId(), id);
    }

    // ── Historique des soldes ──────────────────────────────────

    public List<DebtBalanceEntryDto> getBalanceEntries(Long debtId, User currentUser) {
        Debt debt = getWithOwnershipCheck(debtId, currentUser);
        return balanceEntryRepository.findByDebtOrderByEntryDateDesc(debt)
                .stream()
                .map(DebtBalanceEntryDto::from)
                .toList();
    }

    public DebtBalanceEntryDto addBalanceEntry(Long debtId, CreateDebtBalanceEntryRequest request, User currentUser) {
        Debt debt = getWithOwnershipCheck(debtId, currentUser);

        DebtBalanceEntry entry = DebtBalanceEntry.builder()
                .debt(debt)
                .entryDate(request.entryDate())
                .balance(request.balance())
                .note(request.note())
                .build();

        DebtBalanceEntry saved = balanceEntryRepository.save(entry);

        // Met à jour le capital restant override avec la valeur la plus récente
        balanceEntryRepository.findFirstByDebtOrderByEntryDateDesc(debt)
                .ifPresent(latest -> {
                    debt.setRemainingCapitalOverride(latest.getBalance());
                    debtRepository.save(debt);
                });

        log.info("[user:{}] Entrée de solde ajoutée #{} [dette #{}]", currentUser.getId(), saved.getId(), debtId);
        return DebtBalanceEntryDto.from(saved);
    }

    public void deleteBalanceEntry(Long debtId, Long entryId, User currentUser) {
        Debt debt = getWithOwnershipCheck(debtId, currentUser);

        DebtBalanceEntry entry = balanceEntryRepository.findById(entryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Entrée introuvable : " + entryId));

        if (!entry.getDebt().getId().equals(debt.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Cette entrée n'appartient pas à cette dette");
        }

        balanceEntryRepository.deleteById(entryId);
        log.info("[user:{}] Entrée de solde supprimée #{} [dette #{}]", currentUser.getId(), entryId, debtId);

        // Recalcule le dernier override actif après suppression
        balanceEntryRepository.findFirstByDebtOrderByEntryDateDesc(debt)
                .ifPresentOrElse(
                        latest -> {
                            debt.setRemainingCapitalOverride(latest.getBalance());
                            debtRepository.save(debt);
                        },
                        () -> {
                            // Plus aucune entrée manuelle → repasse en mode projection
                            debt.setRemainingCapitalOverride(null);
                            debtRepository.save(debt);
                        }
                );
    }

    // ── Vérification propriété ─────────────────────────────────

    private Debt getWithOwnershipCheck(Long id, User currentUser) {
        Debt debt = debtRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Dette introuvable : " + id));

        boolean isOwner = debt.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès non autorisé à cette dette");
        }
        return debt;
    }
}
