package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.InstrumentRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PositionService {

    private final PositionRepository positionRepository;
    private final PositionOrderRepository positionOrderRepository;
    private final InstrumentRepository instrumentRepository;

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

        return positions.stream()
                .map(p -> {
                    List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(p);
                    return PositionDto.fromWithoutOrders(p, orders);
                })
                .toList();
    }

    public PositionDto findById(Long id, User currentUser) {
        Position position = getPositionWithOwnershipCheck(id, currentUser);
        List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(position);
        return PositionDto.from(position, orders);
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
                .address(request.address())
                .estimatedCurrentValue(request.estimatedCurrentValue())
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
        return PositionDto.from(saved, List.of());
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
        position.setAddress(request.address());
        position.setEstimatedCurrentValue(request.estimatedCurrentValue());
        position.setCommissionRate(request.commissionRate());
        position.setAnnualRate(request.annualRate());
        position.setIncludeInIncomeProjection(Boolean.TRUE.equals(request.includeInIncomeProjection()));

        Position saved = positionRepository.save(position);
        List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(saved);
        return PositionDto.from(saved, orders);
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
        return PositionDto.from(saved, List.of());
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
        return PositionDto.from(saved, orders);
    }

    // ── Fermeture ──────────────────────────────────────────────

    public PositionDto close(Long id, User currentUser) {
        Position position = getPositionWithOwnershipCheck(id, currentUser);
        position.setStatus(PositionStatus.CLOSED);
        Position saved = positionRepository.save(position);
        List<PositionOrder> orders = positionOrderRepository.findByPositionOrderByOrderDateDesc(saved);
        return PositionDto.from(saved, orders);
    }

    // ── Suppression ────────────────────────────────────────────

    @Transactional
    public void delete(Long id, User currentUser) {
        Position position = getPositionWithOwnershipCheck(id, currentUser);
        positionOrderRepository.deleteByPosition(position);
        positionRepository.delete(position);
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

        BigDecimal amountEur = computeAmountEur(request.amount(), request.exchangeRate());

        PositionOrder order = PositionOrder.builder()
                .position(position)
                .orderType(request.orderType())
                .quantity(request.quantity())
                .unitPrice(request.unitPrice())
                .amount(request.amount())
                .amountEur(amountEur)
                .exchangeRate(request.exchangeRate())
                .orderDate(request.orderDate())
                .notes(request.notes())
                .build();

        return PositionOrderDto.from(positionOrderRepository.save(order));
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

        BigDecimal amountEur = computeAmountEur(request.amount(), request.exchangeRate());

        order.setOrderType(request.orderType());
        order.setQuantity(request.quantity());
        order.setUnitPrice(request.unitPrice());
        order.setAmount(request.amount());
        order.setAmountEur(amountEur);
        order.setExchangeRate(request.exchangeRate());
        order.setOrderDate(request.orderDate());
        order.setNotes(request.notes());

        return PositionOrderDto.from(positionOrderRepository.save(order));
    }

    public void deleteOrder(Long positionId, Long orderId, User currentUser) {
        getPositionWithOwnershipCheck(positionId, currentUser);
        getOrderBelongingToPosition(orderId, positionId);
        positionOrderRepository.deleteById(orderId);
    }

    // ── Helpers privés ─────────────────────────────────────────

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

    /**
     * Calcule le montant en EUR à partir du montant en devise et du taux de change.
     * Si pas de taux (devise EUR), amountEur = amount.
     */
    private BigDecimal computeAmountEur(BigDecimal amount, BigDecimal exchangeRate) {
        if (exchangeRate == null || exchangeRate.compareTo(BigDecimal.ZERO) == 0) {
            return amount;
        }
        return amount.divide(exchangeRate, 2, RoundingMode.HALF_UP);
    }
}
