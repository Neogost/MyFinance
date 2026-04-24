package com.myfinance.service;

import com.myfinance.domain.Possession;
import com.myfinance.domain.PossessionCategoryEnum;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.repository.PossessionRepository;
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
public class PossessionService {

    private final PossessionRepository possessionRepository;

    // ── Lecture ────────────────────────────────────────────────

    public List<PossessionDto> findAllByUser(User user) {
        return possessionRepository.findByUserOrderByCategoryAscLabelAsc(user)
                .stream()
                .map(PossessionDto::from)
                .toList();
    }

    public PossessionDto findById(Long id, User currentUser) {
        return PossessionDto.from(getWithOwnershipCheck(id, currentUser));
    }

    public PossessionSummaryDto getSummary(User user) {
        List<PossessionDto> dtos = findAllByUser(user);

        BigDecimal totalPurchase = dtos.stream()
                .map(PossessionDto::purchasePrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalEffective = dtos.stream()
                .map(PossessionDto::effectiveCurrentValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDepreciation = totalPurchase.subtract(totalEffective).setScale(2, RoundingMode.HALF_UP);

        BigDecimal globalRate = totalPurchase.compareTo(BigDecimal.ZERO) > 0
                ? totalDepreciation.divide(totalPurchase, 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<PossessionCategoryEnum, List<PossessionDto>> byCategory =
                dtos.stream().collect(Collectors.groupingBy(PossessionDto::category));

        List<PossessionCategorySummaryDto> categorySummaries = byCategory.entrySet().stream()
                .map(entry -> {
                    List<PossessionDto> items = entry.getValue();
                    BigDecimal catPurchase = items.stream()
                            .map(PossessionDto::purchasePrice)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal catEffective = items.stream()
                            .map(PossessionDto::effectiveCurrentValue)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new PossessionCategorySummaryDto(
                            entry.getKey(),
                            items.size(),
                            catPurchase.setScale(2, RoundingMode.HALF_UP),
                            catEffective.setScale(2, RoundingMode.HALF_UP),
                            catPurchase.subtract(catEffective).setScale(2, RoundingMode.HALF_UP)
                    );
                })
                .sorted(Comparator.comparing(s -> s.category().name()))
                .toList();

        return new PossessionSummaryDto(
                totalPurchase.setScale(2, RoundingMode.HALF_UP),
                totalEffective.setScale(2, RoundingMode.HALF_UP),
                totalDepreciation,
                globalRate,
                categorySummaries
        );
    }

    // ── Création ───────────────────────────────────────────────

    public PossessionDto create(CreatePossessionRequest request, User user) {
        Possession possession = Possession.builder()
                .user(user)
                .category(request.category())
                .label(request.label())
                .purchasePrice(request.purchasePrice())
                .purchaseDate(request.purchaseDate())
                .estimatedCurrentValue(request.estimatedCurrentValue())
                .notes(request.notes())
                .build();

        PossessionDto dto = PossessionDto.from(possessionRepository.save(possession));
        log.info("[user:{}] Possession créée #{} [catégorie: {}]", user.getId(), dto.id(), request.category());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public PossessionDto update(Long id, UpdatePossessionRequest request, User currentUser) {
        Possession possession = getWithOwnershipCheck(id, currentUser);

        possession.setCategory(request.category());
        possession.setLabel(request.label());
        possession.setPurchasePrice(request.purchasePrice());
        possession.setPurchaseDate(request.purchaseDate());
        possession.setEstimatedCurrentValue(request.estimatedCurrentValue());
        possession.setNotes(request.notes());

        PossessionDto dto = PossessionDto.from(possessionRepository.save(possession));
        log.info("[user:{}] Possession modifiée #{} [catégorie: {}]", currentUser.getId(), id, request.category());
        return dto;
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id, User currentUser) {
        getWithOwnershipCheck(id, currentUser);
        possessionRepository.deleteById(id);
        log.info("[user:{}] Possession supprimée #{}", currentUser.getId(), id);
    }

    // ── Vérification propriété ─────────────────────────────────

    private Possession getWithOwnershipCheck(Long id, User currentUser) {
        Possession possession = possessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Possession introuvable : " + id));

        boolean isOwner = possession.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès non autorisé à cette possession");
        }
        return possession;
    }
}
