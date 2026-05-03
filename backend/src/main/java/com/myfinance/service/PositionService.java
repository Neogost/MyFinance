package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.ExchangeRateRepository;
import com.myfinance.repository.InstrumentAllocationRepository;
import com.myfinance.repository.InstrumentRepository;
import com.myfinance.repository.InstrumentSectorAllocationRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import com.myfinance.repository.PositionSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PositionService {

    private final PositionRepository positionRepository;
    private final PositionOrderRepository positionOrderRepository;
    private final PositionSnapshotRepository positionSnapshotRepository;
    private final InstrumentRepository instrumentRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final InstrumentAllocationRepository instrumentAllocationRepository;
    private final InstrumentSectorAllocationRepository instrumentSectorAllocationRepository;
    private final com.myfinance.repository.OtherIncomeRepository otherIncomeRepository;
    private final ExchangeRateHistoryService exchangeRateHistoryService;

    // ── Lecture : positions ────────────────────────────────────

    public List<PositionDto> findAllByUser(User user, AssetCategory category, PositionStatus status) {
        List<Position> positions;

        if (category != null && status != null) {
            positions = positionRepository.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(user, category, status);
        } else if (category != null) {
            positions = positionRepository.findByUserAndCategoryOrderByCreatedAtDesc(user, category);
        } else if (status != null) {
            positions = positionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, status);
        } else {
            positions = positionRepository.findByUserOrderByCreatedAtDesc(user);
        }

        Map<String, BigDecimal> exchangeRates = loadExchangeRates();

        // Batch-load des allocations géographiques et sectorielles pour les positions BOURSE
        List<Instrument> bourseInstruments = positions.stream()
                .filter(p -> p.getCategory() == AssetCategory.BOURSE && p.getInstrument() != null)
                .map(Position::getInstrument)
                .distinct()
                .toList();

        Map<Long, List<InstrumentAllocationDto>> countryAllocMap = bourseInstruments.isEmpty()
                ? Map.of()
                : instrumentAllocationRepository.findByInstrumentInOrderByPercentageDesc(bourseInstruments)
                        .stream()
                        .collect(Collectors.groupingBy(
                                a -> a.getInstrument().getId(),
                                Collectors.mapping(InstrumentAllocationDto::from, Collectors.toList())));

        Map<Long, List<InstrumentSectorAllocationDto>> sectorAllocMap = bourseInstruments.isEmpty()
                ? Map.of()
                : instrumentSectorAllocationRepository.findByInstrumentInOrderByPercentageDesc(bourseInstruments)
                        .stream()
                        .collect(Collectors.groupingBy(
                                a -> a.getInstrument().getId(),
                                Collectors.mapping(InstrumentSectorAllocationDto::from, Collectors.toList())));

        return positions.stream()
                .map(p -> {
                    List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(p);
                    if (p.getCategory() == AssetCategory.BOURSE && p.getInstrument() != null) {
                        Long instrId = p.getInstrument().getId();
                        InstrumentDto instrDto = InstrumentDto.from(
                                p.getInstrument(),
                                countryAllocMap.getOrDefault(instrId, List.of()),
                                sectorAllocMap.getOrDefault(instrId, List.of()));
                        return PositionDto.fromWithoutOrders(p, orders, exchangeRates, instrDto);
                    }
                    return PositionDto.fromWithoutOrders(p, orders, exchangeRates);
                })
                .toList();
    }

    public PositionDto findById(Long id, User currentUser) {
        Position position = getPositionWithOwnershipCheck(id, currentUser);
        List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(position);
        return PositionDto.from(position, orders, loadExchangeRates());
    }

    // ── Création ───────────────────────────────────────────────

    public PositionDto create(CreatePositionRequest request, User user) {
        Instrument instrument = resolveInstrument(request.instrumentId());

        Position position = Position.builder()
                .user(user)
                .category(request.category())
                .partner(request.partner())
                .label(request.label())
                .currency(request.currency() != null ? request.currency() : "EUR")
                .fiscalEnvelope(request.fiscalEnvelope())
                .instrument(instrument)
                .assetSubType(request.assetSubType())
                .ownershipType(request.ownershipType())
                .propertyUsage(request.propertyUsage())
                .address(request.address())
                .estimatedCurrentValue(request.estimatedCurrentValue())
                .acquisitionDate(request.acquisitionDate())
                .acquisitionPrice(request.acquisitionPrice())
                .commissionRate(request.commissionRate())
                .annualRate(request.annualRate())
                .currentBalance(request.category() == AssetCategory.LIQUIDITE
                        ? (request.currentBalance() != null ? request.currentBalance() : BigDecimal.ZERO)
                        : null)
                .includeInIncomeProjection(Boolean.TRUE.equals(request.includeInIncomeProjection()))
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        Position saved = positionRepository.save(position);
        log.info("[user:{}] Position créée #{} [catégorie: {}, label: {}]",
                user.getId(), saved.getId(), request.category(), request.label());
        return PositionDto.from(saved, List.of(), loadExchangeRates());
    }

    // ── Modification ───────────────────────────────────────────

    public PositionDto update(Long id, UpdatePositionRequest request, User currentUser) {
        Position position = getPositionWithOwnershipCheck(id, currentUser);
        Instrument instrument = resolveInstrument(request.instrumentId());

        position.setPartner(request.partner());
        position.setLabel(request.label());
        position.setCurrency(request.currency());
        position.setFiscalEnvelope(request.fiscalEnvelope());
        position.setInstrument(instrument);
        position.setAssetSubType(request.assetSubType());
        position.setOwnershipType(request.ownershipType());
        position.setPropertyUsage(request.propertyUsage());
        position.setAddress(request.address());
        position.setEstimatedCurrentValue(request.estimatedCurrentValue());
        position.setAcquisitionDate(request.acquisitionDate());
        position.setAcquisitionPrice(request.acquisitionPrice());
        position.setCommissionRate(request.commissionRate());
        position.setAnnualRate(request.annualRate());
        position.setIncludeInIncomeProjection(Boolean.TRUE.equals(request.includeInIncomeProjection()));

        Position saved = positionRepository.save(position);
        log.info("[user:{}] Position modifiée #{}", currentUser.getId(), id);
        List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(saved);
        return PositionDto.from(saved, orders, loadExchangeRates());
    }

    // ── Mise à jour solde (LIQUIDITE) ──────────────────────────

    public PositionDto updateBalance(Long id, UpdateBalanceRequest request, User currentUser) {
        Position position = getPositionWithOwnershipCheck(id, currentUser);

        if (position.getCategory() != AssetCategory.LIQUIDITE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La mise à jour du solde n'est applicable qu'aux positions de type LIQUIDITE");
        }

        position.setCurrentBalance(request.currentBalance());
        Position saved = positionRepository.save(position);
        return PositionDto.from(saved, List.of(), loadExchangeRates());
    }

    // ── Mise à jour valeur estimée (IMMO_PHYSIQUE) ─────────────

    public PositionDto updateEstimatedValue(Long id, UpdateEstimatedValueRequest request, User currentUser) {
        Position position = getPositionWithOwnershipCheck(id, currentUser);

        if (position.getCategory() != AssetCategory.IMMO_PHYSIQUE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La mise à jour de la valeur estimée n'est applicable qu'aux positions de type IMMO_PHYSIQUE");
        }

        position.setEstimatedCurrentValue(request.estimatedCurrentValue());
        Position saved = positionRepository.save(position);
        List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(saved);
        return PositionDto.from(saved, orders, loadExchangeRates());
    }

    // ── Fermeture ──────────────────────────────────────────────

    public PositionDto close(Long id, User currentUser) {
        Position position = getPositionWithOwnershipCheck(id, currentUser);
        position.setStatus(PositionStatus.CLOSED);
        Position saved = positionRepository.save(position);
        log.info("[user:{}] Position fermée #{}", currentUser.getId(), id);
        List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(saved);
        return PositionDto.from(saved, orders, loadExchangeRates());
    }

    // ── Suppression ────────────────────────────────────────────

    @Transactional
    public void delete(Long id, User currentUser) {
        Position position = getPositionWithOwnershipCheck(id, currentUser);
        // Détacher les revenus locatifs liés avant suppression (SQLite n'applique pas ON DELETE SET NULL sans PRAGMA)
        otherIncomeRepository.findByPosition(position)
                .forEach(income -> {
                    income.setPosition(null);
                    otherIncomeRepository.save(income);
                });
        positionSnapshotRepository.deleteByPosition(position);
        positionOrderRepository.deleteByPosition(position);
        positionRepository.delete(position);
        log.info("[user:{}] Position supprimée #{}", currentUser.getId(), id);
    }

    // ── Ordres ─────────────────────────────────────────────────

    public List<PositionOrderDto> findOrdersByPosition(Long positionId, User currentUser) {
        Position position = getPositionWithOwnershipCheck(positionId, currentUser);
        return positionOrderRepository.findByPositionOrderByOrderDateDesc(position)
                .stream()
                .map(PositionOrderDto::from)
                .toList();
    }

    public PositionOrderDto createOrder(Long positionId, CreatePositionOrderRequest request, User currentUser) {
        Position position = getPositionWithOwnershipCheck(positionId, currentUser);

        if (position.getCategory() == AssetCategory.LIQUIDITE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Les positions de type LIQUIDITE n'acceptent pas d'ordres. Utilisez PUT /balance.");
        }

        // Validation : quantity et unitPrice obligatoires pour BOURSE et CRYPTO
        if ((position.getCategory() == AssetCategory.BOURSE
                || position.getCategory() == AssetCategory.CRYPTO)
                && (request.quantity() == null || request.unitPrice() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La quantité et le prix unitaire sont obligatoires pour les positions BOURSE et CRYPTO");
        }

        PositionOrder order = PositionOrder.builder()
                .position(position)
                .orderType(request.orderType())
                .quantity(request.quantity())
                .unitPrice(request.unitPrice())
                .amount(request.amount())
                .amountEur(computeAmountEur(request.amount(), position.getCurrency(), request.orderDate()))
                .orderDate(request.orderDate())
                .notes(request.notes())
                .build();

        PositionOrderDto dto = PositionOrderDto.from(positionOrderRepository.save(order));
        log.info("[user:{}] Ordre créé #{} [position #{}, type: {}]",
                currentUser.getId(), dto.id(), positionId, request.orderType());
        return dto;
    }

    public PositionOrderDto updateOrder(Long positionId, Long orderId, UpdatePositionOrderRequest request, User currentUser) {
        Position position = getPositionWithOwnershipCheck(positionId, currentUser);
        PositionOrder order = getOrderBelongingToPosition(orderId, positionId);

        // Validation : quantity et unitPrice obligatoires pour BOURSE et CRYPTO
        if ((position.getCategory() == AssetCategory.BOURSE
                || position.getCategory() == AssetCategory.CRYPTO)
                && (request.quantity() == null || request.unitPrice() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La quantité et le prix unitaire sont obligatoires pour les positions BOURSE et CRYPTO");
        }

        order.setOrderType(request.orderType());
        order.setQuantity(request.quantity());
        order.setUnitPrice(request.unitPrice());
        order.setAmount(request.amount());
        order.setAmountEur(computeAmountEur(request.amount(), position.getCurrency(), request.orderDate()));
        order.setOrderDate(request.orderDate());
        order.setNotes(request.notes());

        PositionOrderDto dto = PositionOrderDto.from(positionOrderRepository.save(order));
        log.info("[user:{}] Ordre modifié #{} [position #{}]", currentUser.getId(), orderId, positionId);
        return dto;
    }

    public void deleteOrder(Long positionId, Long orderId, User currentUser) {
        getPositionWithOwnershipCheck(positionId, currentUser);
        getOrderBelongingToPosition(orderId, positionId);
        positionOrderRepository.deleteById(orderId);
        log.info("[user:{}] Ordre supprimé #{} [position #{}]", currentUser.getId(), orderId, positionId);
    }

    // ── Helpers privés ─────────────────────────────────────────

    /**
     * Calcule amountEur à partir du montant en devise native, de la devise et de la date de l'ordre.
     * Utilise exchange_rate_history (taux du jour de l'ordre) avec fallback sur le taux courant
     * si l'historique ne remonte pas encore assez loin.
     * Convention : amountEur = amount / rate (identique à ExchangeRate.rate).
     */
    BigDecimal computeAmountEur(BigDecimal amount, String currency, LocalDate orderDate) {
        if (currency == null || "EUR".equalsIgnoreCase(currency)) return amount;
        Optional<BigDecimal> historicRate = exchangeRateHistoryService.getRateAt(currency, orderDate);
        if (historicRate.isPresent()) {
            return amount.divide(historicRate.get(), 4, RoundingMode.HALF_UP);
        }
        // Fallback : taux courant (exchange_rate_history pas encore alimenté pour cette date)
        BigDecimal currentRate = exchangeRateRepository.findByCurrency(currency)
                .map(er -> er.getRate())
                .orElse(BigDecimal.ONE);
        log.warn("[Ordre] Taux historique {} absent au {}, fallback taux courant ({})", currency, orderDate, currentRate);
        return amount.divide(currentRate, 4, RoundingMode.HALF_UP);
    }

    private Position getPositionWithOwnershipCheck(Long id, User currentUser) {
        Position position = positionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Position introuvable : " + id));

        boolean isOwner = position.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès non autorisé à cette position");
        }
        return position;
    }

    private PositionOrder getOrderBelongingToPosition(Long orderId, Long positionId) {
        PositionOrder order = positionOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Ordre introuvable : " + orderId));

        if (!order.getPosition().getId().equals(positionId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Ordre introuvable pour cette position");
        }
        return order;
    }

    private Instrument resolveInstrument(Long instrumentId) {
        if (instrumentId == null) return null;
        return instrumentRepository.findById(instrumentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Instrument introuvable : " + instrumentId));
    }

    /** Charge tous les taux de change sous forme de Map devise → taux */
    private Map<String, BigDecimal> loadExchangeRates() {
        return exchangeRateRepository.findAll().stream()
                .collect(Collectors.toMap(ExchangeRate::getCurrency, ExchangeRate::getRate));
    }
}
