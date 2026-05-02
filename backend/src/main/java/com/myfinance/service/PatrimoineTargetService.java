package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.BreakdownDimension;
import com.myfinance.domain.PatrimoineTarget;
import com.myfinance.domain.PatrimoineTargetBreakdown;
import com.myfinance.domain.User;
import com.myfinance.dto.PatrimoineTargetsDto;
import com.myfinance.dto.SaveTargetsRequest;
import com.myfinance.dto.TargetBreakdownDto;
import com.myfinance.dto.TargetBreakdownInput;
import com.myfinance.repository.PatrimoineTargetBreakdownRepository;
import com.myfinance.repository.PatrimoineTargetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PatrimoineTargetService {

    /** Dimensions autorisées par catégorie (une dimension peut couvrir plusieurs catégories). */
    private static final Map<BreakdownDimension, Set<AssetCategory>> ALLOWED_DIMENSIONS = Map.of(
            BreakdownDimension.SECTOR,         Set.of(AssetCategory.BOURSE),
            BreakdownDimension.COUNTRY,        Set.of(AssetCategory.BOURSE),
            BreakdownDimension.CONTINENT,      Set.of(AssetCategory.BOURSE),
            BreakdownDimension.CURRENCY,       Set.of(AssetCategory.BOURSE, AssetCategory.CRYPTO),
            BreakdownDimension.ASSET_SUBTYPE,  Set.of(AssetCategory.BOURSE),
            BreakdownDimension.CRYPTO_TYPE,    Set.of(AssetCategory.CRYPTO),
            BreakdownDimension.CRYPTO_NETWORK, Set.of(AssetCategory.CRYPTO),
            BreakdownDimension.PROPERTY_USAGE, Set.of(AssetCategory.IMMO_PHYSIQUE)
    );

    private final PatrimoineTargetRepository patrimoineTargetRepository;
    private final PatrimoineTargetBreakdownRepository patrimoineTargetBreakdownRepository;

    public PatrimoineTargetsDto getTargets(User user) {
        List<PatrimoineTarget> rows = patrimoineTargetRepository.findByUser(user);

        Map<String, Double> targets = rows.stream()
                .collect(Collectors.toMap(PatrimoineTarget::getCategory, PatrimoineTarget::getTargetAmountEur));

        Map<String, Double> maxTargets = rows.stream()
                .filter(r -> r.getTargetMaxAmountEur() != null)
                .collect(Collectors.toMap(PatrimoineTarget::getCategory, PatrimoineTarget::getTargetMaxAmountEur));

        Map<Long, String> idToCategory = rows.stream()
                .collect(Collectors.toMap(PatrimoineTarget::getId, PatrimoineTarget::getCategory));

        Map<String, List<TargetBreakdownDto>> breakdowns = new HashMap<>();
        if (!rows.isEmpty()) {
            patrimoineTargetBreakdownRepository.findByTargetIn(rows)
                    .forEach(b -> {
                        String category = idToCategory.get(b.getTarget().getId());
                        if (category != null) {
                            breakdowns.computeIfAbsent(category, k -> new java.util.ArrayList<>())
                                    .add(TargetBreakdownDto.from(b));
                        }
                    });
        }

        return new PatrimoineTargetsDto(targets, maxTargets, breakdowns);
    }

    @Transactional
    public PatrimoineTargetsDto saveTargets(User user, SaveTargetsRequest request) {
        Map<String, Double> targets = request != null && request.targets() != null
                ? request.targets() : Map.of();
        Map<String, Double> maxTargets = request != null && request.maxTargets() != null
                ? request.maxTargets() : Map.of();
        Map<String, List<TargetBreakdownInput>> breakdownsByCategory =
                request != null && request.breakdowns() != null ? request.breakdowns() : Map.of();

        validateBreakdowns(breakdownsByCategory);

        // Suppression complète des anciennes lignes (cascade ON DELETE supprime les breakdowns)
        List<PatrimoineTarget> existing = patrimoineTargetRepository.findByUser(user);
        if (!existing.isEmpty()) {
            patrimoineTargetBreakdownRepository.deleteByTargetIn(existing);
        }
        patrimoineTargetRepository.deleteByUser(user);

        // Insertion des nouveaux objectifs (montants > 0 uniquement)
        Map<String, PatrimoineTarget> savedByCategory = new LinkedHashMap<>();
        targets.entrySet().stream()
                .filter(e -> e.getValue() != null && e.getValue() > 0)
                .forEach(e -> {
                    Double maxAmt = maxTargets.get(e.getKey());
                    PatrimoineTarget t = patrimoineTargetRepository.save(PatrimoineTarget.builder()
                            .user(user)
                            .category(e.getKey())
                            .targetAmountEur(e.getValue())
                            .targetMaxAmountEur(maxAmt != null && maxAmt > 0 ? maxAmt : null)
                            .build());
                    savedByCategory.put(e.getKey(), t);
                });

        // Insertion des breakdowns rattachés à un objectif existant
        List<PatrimoineTargetBreakdown> toSaveBreakdowns = new java.util.ArrayList<>();
        breakdownsByCategory.forEach((category, items) -> {
            PatrimoineTarget parent = savedByCategory.get(category);
            if (parent == null || items == null) return;
            items.stream()
                    .filter(i -> i != null && i.targetPercentage() != null
                            && i.targetPercentage().compareTo(BigDecimal.ZERO) > 0
                            && i.key() != null && !i.key().isBlank())
                    .forEach(i -> toSaveBreakdowns.add(PatrimoineTargetBreakdown.builder()
                            .target(parent)
                            .dimension(i.dimension())
                            .breakdownKey(i.key().trim())
                            .targetPercentage(i.targetPercentage())
                            .build()));
        });
        if (!toSaveBreakdowns.isEmpty()) {
            patrimoineTargetBreakdownRepository.saveAll(toSaveBreakdowns);
        }

        log.info("[user:{}] Objectifs patrimoniaux mis à jour - {} catégorie(s), {} sous-objectif(s)",
                user.getId(), savedByCategory.size(), toSaveBreakdowns.size());
        return getTargets(user);
    }

    private void validateBreakdowns(Map<String, List<TargetBreakdownInput>> breakdownsByCategory) {
        breakdownsByCategory.forEach((category, items) -> {
            if (items == null || items.isEmpty()) return;

            // Vérifier que la dimension est autorisée pour la catégorie cible
            for (TargetBreakdownInput item : items) {
                if (item == null || item.dimension() == null) continue;
                Set<AssetCategory> allowed = ALLOWED_DIMENSIONS.get(item.dimension());
                if (allowed == null || allowed.stream().noneMatch(c -> c.name().equals(category))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Dimension " + item.dimension() + " non autorisée pour la catégorie " + category);
                }
            }

            // La somme des pourcentages par dimension doit être ≤ 100
            Map<BreakdownDimension, BigDecimal> sumByDimension = new HashMap<>();
            for (TargetBreakdownInput item : items) {
                if (item == null || item.targetPercentage() == null || item.dimension() == null) continue;
                sumByDimension.merge(item.dimension(), item.targetPercentage(), BigDecimal::add);
            }
            sumByDimension.forEach((dim, sum) -> {
                if (sum.compareTo(BigDecimal.valueOf(100)) > 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Somme des pourcentages > 100 pour " + category + " / " + dim);
                }
            });

            // Pas de doublons (category, dimension, key)
            Map<String, Long> duplicates = items.stream()
                    .filter(i -> i != null && i.dimension() != null && i.key() != null)
                    .collect(Collectors.groupingBy(
                            i -> i.dimension().name() + "::" + i.key().trim().toLowerCase(),
                            Collectors.counting()));
            duplicates.forEach((k, count) -> {
                if (count > 1) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Sous-objectif en doublon pour " + category + " : " + k);
                }
            });
        });
    }
}
