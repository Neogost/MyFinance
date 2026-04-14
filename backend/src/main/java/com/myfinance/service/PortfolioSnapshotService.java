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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PortfolioSnapshotService {

    private final PortfolioSnapshotRepository portfolioSnapshotRepository;
    private final PositionSnapshotRepository positionSnapshotRepository;
    private final PositionRepository positionRepository;
    private final PositionOrderRepository positionOrderRepository;

    // ── Lecture ────────────────────────────────────────────────

    public List<PortfolioSnapshotDto> findAllByUser(User user) {
        return portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user)
                .stream()
                .map(PortfolioSnapshotDto::fromSummary)
                .toList();
    }

    public PortfolioSnapshotDto findById(Long id, User currentUser) {
        PortfolioSnapshot snapshot = getSnapshotWithOwnershipCheck(id, currentUser);
        return PortfolioSnapshotDto.from(snapshot);
    }

    // ── Création manuelle ──────────────────────────────────────

    @Transactional
    public PortfolioSnapshotDto create(CreateSnapshotRequest request, User user) {
        LocalDate snapshotDate = request.snapshotDate();

        // Vérifier qu'il n'existe pas déjà un snapshot pour ce mois
        LocalDate startOfMonth = snapshotDate.withDayOfMonth(1);
        LocalDate endOfMonth = startOfMonth.plusMonths(1).minusDays(1);
        portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(user, startOfMonth, endOfMonth)
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Un snapshot existe déjà pour le mois " + startOfMonth.getMonth()
                                    + " " + startOfMonth.getYear());
                });

        return buildAndSaveSnapshot(user, snapshotDate);
    }

    // ── Recalcul ───────────────────────────────────────────────

    @Transactional
    public PortfolioSnapshotDto recalculate(Long id, User currentUser) {
        PortfolioSnapshot snapshot = getSnapshotWithOwnershipCheck(id, currentUser);

        // Supprimer les anciens PositionSnapshot
        positionSnapshotRepository.deleteAll(snapshot.getPositionSnapshots());
        snapshot.getPositionSnapshots().clear();

        // Recalculer
        List<Position> positions = positionRepository.findByUserAndStatusOrderByCreatedAtDesc(
                currentUser, PositionStatus.ACTIVE);

        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalCurrentValue = BigDecimal.ZERO;

        for (Position position : positions) {
            List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(position);
            PositionComputedDto computed = computePositionTotals(position, orders);

            PositionSnapshot posSnap = PositionSnapshot.builder()
                    .portfolioSnapshot(snapshot)
                    .position(position)
                    .investedAmountEur(computed.investedAmountEur())
                    .currentValueEur(computed.currentValueEur())
                    .capitalGainEur(computed.capitalGainEur())
                    .units(computed.units())
                    .unitPriceEur(computeUnitPriceEur(position))
                    .build();

            snapshot.getPositionSnapshots().add(posSnap);
            totalInvested = totalInvested.add(computed.investedAmountEur());
            totalCurrentValue = totalCurrentValue.add(computed.currentValueEur());
        }

        snapshot.setTotalInvestedEur(totalInvested);
        snapshot.setTotalCurrentValueEur(totalCurrentValue);
        snapshot.setTotalCapitalGainEur(totalCurrentValue.subtract(totalInvested));

        return PortfolioSnapshotDto.from(portfolioSnapshotRepository.save(snapshot));
    }

    // ── Scheduler automatique ──────────────────────────────────

    /**
     * Déclenché automatiquement le 1er de chaque mois à 01h00.
     * Désactivé en profil dev via application-dev.properties.
     */
    @Transactional
    public void createMonthlySnapshot(User user) {
        LocalDate today = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = today.plusMonths(1).minusDays(1);

        // Ne pas créer si déjà existant
        portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(user, today, endOfMonth)
                .ifPresent(existing -> {
                    // Snapshot déjà présent — on sort silencieusement
                    return;
                });

        buildAndSaveSnapshot(user, today);
    }

    // ── Helpers privés ─────────────────────────────────────────

    private PortfolioSnapshotDto buildAndSaveSnapshot(User user, LocalDate snapshotDate) {
        List<Position> positions = positionRepository.findByUserAndStatusOrderByCreatedAtDesc(
                user, PositionStatus.ACTIVE);

        PortfolioSnapshot snapshot = PortfolioSnapshot.builder()
                .user(user)
                .snapshotDate(snapshotDate)
                .totalInvestedEur(BigDecimal.ZERO)
                .totalCurrentValueEur(BigDecimal.ZERO)
                .totalCapitalGainEur(BigDecimal.ZERO)
                .build();

        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalCurrentValue = BigDecimal.ZERO;

        for (Position position : positions) {
            List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(position);
            PositionComputedDto computed = computePositionTotals(position, orders);

            PositionSnapshot posSnap = PositionSnapshot.builder()
                    .portfolioSnapshot(snapshot)
                    .position(position)
                    .investedAmountEur(computed.investedAmountEur())
                    .currentValueEur(computed.currentValueEur())
                    .capitalGainEur(computed.capitalGainEur())
                    .units(computed.units())
                    .unitPriceEur(computeUnitPriceEur(position))
                    .build();

            snapshot.getPositionSnapshots().add(posSnap);
            totalInvested = totalInvested.add(computed.investedAmountEur());
            totalCurrentValue = totalCurrentValue.add(computed.currentValueEur());
        }

        snapshot.setTotalInvestedEur(totalInvested);
        snapshot.setTotalCurrentValueEur(totalCurrentValue);
        snapshot.setTotalCapitalGainEur(totalCurrentValue.subtract(totalInvested));

        return PortfolioSnapshotDto.from(portfolioSnapshotRepository.save(snapshot));
    }

    /** Délègue à PositionDto la logique de calcul */
    private PositionComputedDto computePositionTotals(Position position, List<PositionOrder> orders) {
        // Réutilise la logique définie dans PositionDto
        return PositionDto.computeForSnapshot(position, orders);
    }

    /** Prix unitaire en EUR au moment du snapshot — pour BOURSE et CRYPTO uniquement */
    private BigDecimal computeUnitPriceEur(Position position) {
        if (position.getInstrument() == null || position.getInstrument().getLastPrice() == null) {
            return null;
        }
        // Si la devise de l'instrument est EUR, le prix est déjà en EUR
        // Sinon, idéalement on appliquerait le taux de change (simplifié ici)
        return position.getInstrument().getLastPrice();
    }

    private PortfolioSnapshot getSnapshotWithOwnershipCheck(Long id, User currentUser) {
        PortfolioSnapshot snapshot = portfolioSnapshotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Snapshot introuvable : " + id));

        boolean isOwner = snapshot.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès non autorisé à ce snapshot");
        }
        return snapshot;
    }
}
