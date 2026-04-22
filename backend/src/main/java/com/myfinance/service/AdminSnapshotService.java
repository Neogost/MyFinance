package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminSnapshotService {

    private final PortfolioSnapshotRepository portfolioSnapshotRepository;
    private final PositionRepository positionRepository;
    private final UserRepository userRepository;

    // ── Lecture ────────────────────────────────────────────────

    public List<AdminSnapshotDetailDto> findAllByUser(Long userId) {
        User user = getUser(userId);
        return portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)
                .stream()
                .map(AdminSnapshotDetailDto::fromSummary)
                .toList();
    }

    public AdminSnapshotDetailDto findById(Long id) {
        return AdminSnapshotDetailDto.from(getSnapshot(id));
    }

    public List<PositionAdminRefDto> findAllPositionsByUser(Long userId) {
        User user = getUser(userId);
        return positionRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(p -> new PositionAdminRefDto(p.getId(), p.getLabel(), p.getPartner(), p.getCategory(), p.getStatus()))
                .toList();
    }



    // ── Création manuelle ──────────────────────────────────────

    @Transactional
    public AdminSnapshotDetailDto create(ManualSnapshotRequest request) {
        User user = getUser(request.userId());

        checkNoDuplicateMonth(user, request.snapshotDate(), null);

        Set<Long> userPositionIds = positionRepository
                .findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(Position::getId)
                .collect(Collectors.toSet());

        PortfolioSnapshot snapshot = PortfolioSnapshot.builder()
                .user(user)
                .snapshotDate(request.snapshotDate())
                .totalInvestedEur(BigDecimal.ZERO)
                .totalCurrentValueEur(BigDecimal.ZERO)
                .totalCapitalGainEur(BigDecimal.ZERO)
                .build();

        buildPositionSnapshots(snapshot, request.positions(), userPositionIds);
        computeTotals(snapshot);

        return AdminSnapshotDetailDto.from(portfolioSnapshotRepository.save(snapshot));
    }

    // ── Mise à jour ────────────────────────────────────────────

    @Transactional
    public AdminSnapshotDetailDto update(Long id, ManualSnapshotRequest request) {
        PortfolioSnapshot snapshot = getSnapshot(id);
        User user = getUser(request.userId());

        if (!snapshot.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "L'utilisateur du snapshot ne correspond pas à la requête");
        }

        checkNoDuplicateMonth(user, request.snapshotDate(), id);

        snapshot.setSnapshotDate(request.snapshotDate());
        snapshot.getPositionSnapshots().clear();

        Set<Long> userPositionIds = positionRepository
                .findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(Position::getId)
                .collect(Collectors.toSet());

        buildPositionSnapshots(snapshot, request.positions(), userPositionIds);
        computeTotals(snapshot);

        return AdminSnapshotDetailDto.from(portfolioSnapshotRepository.save(snapshot));
    }

    // ── Suppression ────────────────────────────────────────────

    @Transactional
    public void delete(Long id) {
        PortfolioSnapshot snapshot = getSnapshot(id);
        portfolioSnapshotRepository.delete(snapshot);
    }

    // ── Helpers privés ─────────────────────────────────────────

    private void buildPositionSnapshots(PortfolioSnapshot snapshot,
                                         List<ManualPositionSnapshotRequest> positions,
                                         Set<Long> userPositionIds) {
        for (ManualPositionSnapshotRequest req : positions) {
            if (!userPositionIds.contains(req.positionId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "La position " + req.positionId() + " n'appartient pas à cet utilisateur");
            }

            Position position = positionRepository.findById(req.positionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Position introuvable : " + req.positionId()));

            BigDecimal capitalGain = req.investedAmountEur() != null
                    ? req.currentValueEur().subtract(req.investedAmountEur())
                    : null;

            PositionSnapshot posSnap = PositionSnapshot.builder()
                    .portfolioSnapshot(snapshot)
                    .position(position)
                    .investedAmountEur(req.investedAmountEur())
                    .currentValueEur(req.currentValueEur())
                    .capitalGainEur(capitalGain)
                    .units(req.units())
                    .unitPriceEur(req.unitPriceEur())
                    .build();

            snapshot.getPositionSnapshots().add(posSnap);
        }
    }

    private void computeTotals(PortfolioSnapshot snapshot) {
        BigDecimal totalInvested = snapshot.getPositionSnapshots().stream()
                .map(PositionSnapshot::getInvestedAmountEur)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCurrentValue = snapshot.getPositionSnapshots().stream()
                .map(PositionSnapshot::getCurrentValueEur)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        boolean anyInvested = snapshot.getPositionSnapshots().stream()
                .anyMatch(p -> p.getInvestedAmountEur() != null);

        snapshot.setTotalInvestedEur(anyInvested ? totalInvested : null);
        snapshot.setTotalCurrentValueEur(totalCurrentValue);
        snapshot.setTotalCapitalGainEur(anyInvested ? totalCurrentValue.subtract(totalInvested) : null);
    }

    private void checkNoDuplicateMonth(User user, LocalDate date, Long excludeId) {
        LocalDate start = date.withDayOfMonth(1);
        LocalDate end = start.plusMonths(1).minusDays(1);

        portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(user, start, end)
                .ifPresent(existing -> {
                    if (excludeId == null || !existing.getId().equals(excludeId)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "Un snapshot existe déjà pour " + start.getMonth() + " " + start.getYear());
                    }
                });
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + userId));
    }

    private PortfolioSnapshot getSnapshot(Long id) {
        return portfolioSnapshotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Snapshot introuvable : " + id));
    }
}
