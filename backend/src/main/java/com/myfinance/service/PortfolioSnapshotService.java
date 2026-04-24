package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioSnapshotService {

    private final PortfolioSnapshotRepository portfolioSnapshotRepository;
    private final PositionSnapshotRepository positionSnapshotRepository;
    private final PositionRepository positionRepository;
    private final PositionOrderRepository positionOrderRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final UserRepository userRepository;

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
                    log.warn("[user:{}] Snapshot refusé - mois {} {} déjà existant",
                            user.getId(), startOfMonth.getMonth(), startOfMonth.getYear());
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Un snapshot existe déjà pour le mois " + startOfMonth.getMonth()
                                    + " " + startOfMonth.getYear());
                });

        PortfolioSnapshotDto dto = buildAndSaveSnapshot(user, snapshotDate);
        log.info("[user:{}] Snapshot patrimonial créé #{} [{}]", user.getId(), dto.id(), snapshotDate);
        return dto;
    }

    // ── Création groupée (admin) ───────────────────────────────

    @Transactional
    public BulkSnapshotResultDto createForAllUsers(CreateSnapshotRequest request) {
        LocalDate snapshotDate = request.snapshotDate();
        LocalDate startOfMonth = snapshotDate.withDayOfMonth(1);
        LocalDate endOfMonth   = startOfMonth.plusMonths(1).minusDays(1);

        int created = 0, skipped = 0, failed = 0;

        for (User user : userRepository.findAll()) {
            boolean alreadyExists = portfolioSnapshotRepository
                    .findByUserAndSnapshotDateBetween(user, startOfMonth, endOfMonth)
                    .isPresent();
            if (alreadyExists) {
                skipped++;
                continue;
            }
            try {
                buildAndSaveSnapshot(user, snapshotDate);
                created++;
            } catch (Exception e) {
                log.error("Échec du relevé pour l'utilisateur {} : {}", user.getId(), e.getMessage());
                failed++;
            }
        }
        return new BulkSnapshotResultDto(created, skipped, failed);
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

        Map<String, BigDecimal> exchangeRates = loadExchangeRates();

        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalCurrentValue = BigDecimal.ZERO;

        for (Position position : positions) {
            List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(position);
            PositionComputedDto computed = computePositionTotals(position, orders, exchangeRates);

            PositionSnapshot posSnap = PositionSnapshot.builder()
                    .portfolioSnapshot(snapshot)
                    .position(position)
                    .investedAmountEur(computed.investedAmountEur())
                    .currentValueEur(computed.currentValueEur())
                    .capitalGainEur(computed.capitalGainEur())
                    .units(computed.units())
                    .unitPriceEur(computeUnitPriceEur(position, exchangeRates))
                    .build();

            snapshot.getPositionSnapshots().add(posSnap);
            totalInvested = totalInvested.add(computed.investedAmountEur());
            totalCurrentValue = totalCurrentValue.add(computed.currentValueEur());
        }

        snapshot.setTotalInvestedEur(totalInvested);
        snapshot.setTotalCurrentValueEur(totalCurrentValue);
        snapshot.setTotalCapitalGainEur(totalCurrentValue.subtract(totalInvested));

        PortfolioSnapshotDto dto = PortfolioSnapshotDto.from(portfolioSnapshotRepository.save(snapshot));
        log.info("[user:{}] Snapshot #{} recalculé [{} position(s)]",
                currentUser.getId(), id, snapshot.getPositionSnapshots().size());
        return dto;
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

        Map<String, BigDecimal> exchangeRates = loadExchangeRates();

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
            PositionComputedDto computed = computePositionTotals(position, orders, exchangeRates);

            PositionSnapshot posSnap = PositionSnapshot.builder()
                    .portfolioSnapshot(snapshot)
                    .position(position)
                    .investedAmountEur(computed.investedAmountEur())
                    .currentValueEur(computed.currentValueEur())
                    .capitalGainEur(computed.capitalGainEur())
                    .units(computed.units())
                    .unitPriceEur(computeUnitPriceEur(position, exchangeRates))
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
    private PositionComputedDto computePositionTotals(Position position, List<PositionOrder> orders,
                                                       Map<String, BigDecimal> exchangeRates) {
        return PositionDto.computeForSnapshot(position, orders, exchangeRates);
    }

    /**
     * Prix unitaire en EUR au moment du snapshot — pour BOURSE et CRYPTO uniquement.
     * Applique le taux de change si la devise de l'instrument n'est pas EUR.
     */
    private BigDecimal computeUnitPriceEur(Position position, Map<String, BigDecimal> exchangeRates) {
        if (position.getInstrument() == null || position.getInstrument().getLastPrice() == null) {
            return null;
        }
        BigDecimal lastPrice = position.getInstrument().getLastPrice();
        String currency = position.getInstrument().getCurrency();
        if (!"EUR".equals(currency) && exchangeRates != null) {
            BigDecimal rate = exchangeRates.get(currency);
            if (rate != null && rate.compareTo(BigDecimal.ZERO) > 0) {
                return lastPrice.divide(rate, 2, RoundingMode.HALF_UP);
            }
        }
        return lastPrice;
    }

    /** Charge tous les taux de change sous forme de Map devise → taux */
    private Map<String, BigDecimal> loadExchangeRates() {
        return exchangeRateRepository.findAll().stream()
                .collect(Collectors.toMap(ExchangeRate::getCurrency, ExchangeRate::getRate));
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
