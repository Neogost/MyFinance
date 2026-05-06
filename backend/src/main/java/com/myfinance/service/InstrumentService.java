package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.domain.InstrumentAllocation;
import com.myfinance.domain.InstrumentSectorAllocation;
import com.myfinance.domain.OrderType;
import com.myfinance.domain.Position;
import com.myfinance.domain.User;
import com.myfinance.dto.InstrumentSectorAllocationDto;
import com.myfinance.repository.InstrumentSectorAllocationRepository;
import com.myfinance.dto.CreateInstrumentRequest;
import com.myfinance.dto.InstrumentAllocationDto;
import com.myfinance.dto.InstrumentDto;
import com.myfinance.dto.InstrumentPricePointDto;
import com.myfinance.dto.OrderMarkerDto;
import com.myfinance.dto.UpdateInstrumentPriceRequest;
import com.myfinance.repository.InstrumentAllocationRepository;
import com.myfinance.repository.InstrumentPriceHistoryRepository;
import com.myfinance.repository.InstrumentRepository;
import com.myfinance.repository.PositionOrderRepository;
import com.myfinance.repository.PositionRepository;
import com.myfinance.repository.PositionSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InstrumentService {

    private final InstrumentRepository                 instrumentRepository;
    private final InstrumentAllocationRepository       allocationRepository;
    private final InstrumentSectorAllocationRepository sectorAllocationRepository;
    private final PositionRepository                   positionRepository;
    private final PositionSnapshotRepository           positionSnapshotRepository;
    private final InstrumentPriceHistoryRepository     priceHistoryRepository;
    private final PositionOrderRepository              positionOrderRepository;

    // ── Lecture ────────────────────────────────────────────────

    public List<InstrumentDto> findAll(String q, AssetCategory category) {
        List<Instrument> instruments;

        if (q != null && q.length() >= 2 && category != null) {
            instruments = instrumentRepository.searchByQueryAndCategory(q, category);
        } else if (q != null && q.length() >= 2) {
            instruments = instrumentRepository.searchByQuery(q);
        } else if (category != null) {
            instruments = instrumentRepository.findByCategoryOrderByNameAsc(category);
        } else {
            instruments = instrumentRepository.findAll();
        }

        return withAllocations(instruments);
    }

    public InstrumentDto findById(Long id) {
        Instrument instrument = getOrThrow(id);
        return withAllocations(List.of(instrument)).get(0);
    }

    // ── Création ───────────────────────────────────────────────

    public InstrumentDto create(CreateInstrumentRequest request) {
        validateRequest(request, null);

        Instrument instrument = Instrument.builder()
                .category(request.category())
                .isin(request.isin())
                .ticker(request.ticker())
                .name(request.name())
                .currency(request.currency())
                .stablePrice(Boolean.TRUE.equals(request.stablePrice()))
                .boursoramaSymbol(request.boursoramaSymbol())
                .cryptoType(request.cryptoType())
                .cryptoNetwork(request.cryptoNetwork())
                .build();

        InstrumentDto dto = InstrumentDto.from(instrumentRepository.save(instrument));
        log.info("[system] Instrument créé #{} [catégorie: {}, nom: {}]", dto.id(), request.category(), request.name());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public InstrumentDto update(Long id, CreateInstrumentRequest request) {
        Instrument instrument = getOrThrow(id);
        validateRequest(request, id);

        instrument.setCategory(request.category());
        instrument.setIsin(request.isin());
        instrument.setTicker(request.ticker());
        instrument.setName(request.name());
        instrument.setCurrency(request.currency());
        instrument.setStablePrice(Boolean.TRUE.equals(request.stablePrice()));
        instrument.setBoursoramaSymbol(request.boursoramaSymbol());
        instrument.setCryptoType(request.cryptoType());
        instrument.setCryptoNetwork(request.cryptoNetwork());

        InstrumentDto dto = InstrumentDto.from(instrumentRepository.save(instrument));
        log.info("[system] Instrument modifié #{} [nom: {}]", id, request.name());
        return dto;
    }

    // ── Prix fixe ─────────────────────────────────────────────

    public InstrumentDto updateStablePrice(Long id, boolean stablePrice) {
        Instrument instrument = getOrThrow(id);
        instrument.setStablePrice(stablePrice);
        log.info("[system] Instrument #{} - prix fixe: {}", id, stablePrice);
        return InstrumentDto.from(instrumentRepository.save(instrument));
    }

    // ── Cours manuels ──────────────────────────────────────────

    public List<InstrumentDto> findActiveInstruments() {
        return instrumentRepository.findAllWithActivePositions()
                .stream().map(InstrumentDto::from).toList();
    }

    public List<InstrumentDto> updatePrices(List<UpdateInstrumentPriceRequest> requests) {
        List<InstrumentDto> result = requests.stream().map(req -> {
            Instrument instrument = getOrThrow(req.instrumentId());
            instrument.setLastPrice(req.lastPrice());
            instrument.setLastPriceUpdatedAt(LocalDateTime.now());
            return InstrumentDto.from(instrumentRepository.save(instrument));
        }).toList();
        log.info("[system] Cours mis à jour pour {} instrument(s)", result.size());
        return result;
    }

    // ── Allocations manuelles ──────────────────────────────────

    @Transactional
    public List<InstrumentAllocationDto> updateAllocations(Long id, List<InstrumentAllocationDto> entries) {
        Instrument instrument = getOrThrow(id);
        allocationRepository.deleteByInstrument(instrument);
        if (entries.isEmpty()) return List.of();

        List<InstrumentAllocation> allocations = entries.stream()
                .filter(e -> e.country() != null && !e.country().isBlank())
                .map(e -> InstrumentAllocation.builder()
                        .instrument(instrument)
                        .country(e.country().trim())
                        .percentage(e.percentage())
                        .fetchedAt(LocalDateTime.now())
                        .build())
                .toList();
        allocationRepository.saveAll(allocations);
        return allocations.stream().map(InstrumentAllocationDto::from).toList();
    }

    @Transactional
    public List<InstrumentSectorAllocationDto> updateSectorAllocations(Long id, List<InstrumentSectorAllocationDto> entries) {
        Instrument instrument = getOrThrow(id);
        sectorAllocationRepository.deleteByInstrument(instrument);
        if (entries.isEmpty()) return List.of();

        List<InstrumentSectorAllocation> allocations = entries.stream()
                .filter(e -> e.sector() != null && !e.sector().isBlank())
                .map(e -> InstrumentSectorAllocation.builder()
                        .instrument(instrument)
                        .sector(e.sector().trim())
                        .percentage(e.percentage())
                        .fetchedAt(LocalDateTime.now())
                        .build())
                .toList();
        sectorAllocationRepository.saveAll(allocations);
        return allocations.stream().map(InstrumentSectorAllocationDto::from).toList();
    }

    // ── Scoring patrimonial ────────────────────────────────────

    public record AllocationsBundle(
            Map<Long, List<InstrumentAllocationDto>> byCountry,
            Map<Long, List<InstrumentSectorAllocationDto>> bySector) {}

    public AllocationsBundle loadAllocationsForScore(List<Long> instrumentIds) {
        if (instrumentIds.isEmpty()) return new AllocationsBundle(Map.of(), Map.of());
        List<Instrument> instruments = instrumentRepository.findAllById(instrumentIds);

        Map<Long, List<InstrumentAllocationDto>> byCountry = allocationRepository
                .findByInstrumentInOrderByPercentageDesc(instruments)
                .stream()
                .collect(Collectors.groupingBy(
                        a -> a.getInstrument().getId(),
                        Collectors.mapping(InstrumentAllocationDto::from, Collectors.toList())
                ));
        Map<Long, List<InstrumentSectorAllocationDto>> bySector = sectorAllocationRepository
                .findByInstrumentInOrderByPercentageDesc(instruments)
                .stream()
                .collect(Collectors.groupingBy(
                        a -> a.getInstrument().getId(),
                        Collectors.mapping(InstrumentSectorAllocationDto::from, Collectors.toList())
                ));
        return new AllocationsBundle(byCountry, bySector);
    }

    // ── Suppression ────────────────────────────────────────────

    @Transactional
    public void deleteInstrument(Long id) {
        Instrument instrument = getOrThrow(id);
        String name = instrument.getName();

        // Supprimer les snapshots de position avant de supprimer les positions (contrainte FK)
        List<Position> positions = positionRepository.findByInstrument(instrument);
        if (!positions.isEmpty()) {
            positionSnapshotRepository.deleteByPositionIn(positions);
            positionRepository.deleteAll(positions);
        }

        // Supprimer les allocations puis l'instrument
        allocationRepository.deleteByInstrument(instrument);
        sectorAllocationRepository.deleteByInstrument(instrument);
        instrumentRepository.delete(instrument);

        log.info("[system] Instrument supprimé #{} [nom: {}, {} position(s) supprimée(s)]",
                id, name, positions.size());
    }

    // ── Helpers ────────────────────────────────────────────────

    private List<InstrumentDto> withAllocations(List<Instrument> instruments) {
        if (instruments.isEmpty()) return List.of();

        List<Long> ids = instruments.stream().map(Instrument::getId).toList();

        Map<Long, List<InstrumentAllocationDto>> countryById = allocationRepository
                .findByInstrumentInOrderByPercentageDesc(instruments)
                .stream()
                .collect(Collectors.groupingBy(
                        a -> a.getInstrument().getId(),
                        Collectors.mapping(InstrumentAllocationDto::from, Collectors.toList())
                ));
        Map<Long, List<InstrumentSectorAllocationDto>> sectorById = sectorAllocationRepository
                .findByInstrumentInOrderByPercentageDesc(instruments)
                .stream()
                .collect(Collectors.groupingBy(
                        a -> a.getInstrument().getId(),
                        Collectors.mapping(InstrumentSectorAllocationDto::from, Collectors.toList())
                ));
        Map<Long, Long> orderCountById = instrumentRepository.countOrdersByInstrumentIds(ids)
                .stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (Long) row[1]
                ));
        return instruments.stream()
                .map(i -> InstrumentDto.from(i,
                        countryById.getOrDefault(i.getId(), List.of()),
                        sectorById.getOrDefault(i.getId(), List.of()),
                        orderCountById.getOrDefault(i.getId(), 0L)))
                .toList();
    }

    private Instrument getOrThrow(Long id) {
        return instrumentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Instrument introuvable : " + id));
    }

    /**
     * Valide les contraintes métier sur un instrument.
     * @param excludeId id à exclure du contrôle d'unicité (null en création)
     */
    private void validateRequest(CreateInstrumentRequest request, Long excludeId) {
        if (request.category() == AssetCategory.BOURSE) {
            if (request.isin() == null || request.isin().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "L'ISIN est obligatoire pour un instrument de type BOURSE");
            }
            instrumentRepository.findByIsin(request.isin()).ifPresent(existing -> {
                if (excludeId == null || !existing.getId().equals(excludeId)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Un instrument avec l'ISIN " + request.isin() + " existe déjà");
                }
            });
        }

        if (request.category() == AssetCategory.CRYPTO) {
            if (request.ticker() == null || request.ticker().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Le ticker est obligatoire pour un instrument de type CRYPTO");
            }
            instrumentRepository.findByTicker(request.ticker()).ifPresent(existing -> {
                if (excludeId == null || !existing.getId().equals(excludeId)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Un instrument avec le ticker " + request.ticker() + " existe déjà");
                }
            });
        }
    }

    // ── Historique des prix (accessible à tous les utilisateurs) ─

    public List<InstrumentPricePointDto> getPriceHistory(Long instrumentId, LocalDate from, LocalDate to) {
        Instrument instrument = instrumentRepository.findById(instrumentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Instrument introuvable : " + instrumentId));

        LocalDate effectiveTo   = to   != null ? to   : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusYears(3);

        return priceHistoryRepository
                .findByInstrumentAndPriceDateBetweenOrderByPriceDateAsc(instrument, effectiveFrom, effectiveTo)
                .stream()
                .map(InstrumentPricePointDto::from)
                .toList();
    }

    /** Tous les ordres BUY/SELL de l'utilisateur sur toutes ses positions liées à cet instrument.
     *  Utilisé pour afficher les marqueurs d'achat/vente sur le graphique d'évolution du cours. */
    public List<OrderMarkerDto> getOrderMarkers(Long instrumentId, User user) {
        Instrument instrument = instrumentRepository.findById(instrumentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Instrument introuvable : " + instrumentId));

        List<Position> userPositions = positionRepository.findByInstrument(instrument)
                .stream()
                .filter(p -> p.getUser().getId().equals(user.getId()))
                .toList();

        if (userPositions.isEmpty()) return List.of();

        return positionOrderRepository.findByPositionInOrderByOrderDateAsc(userPositions)
                .stream()
                .filter(o -> o.getOrderType() == OrderType.BUY
                         || o.getOrderType() == OrderType.SELL
                         || o.getOrderType() == OrderType.DIVIDEND
                         || o.getOrderType() == OrderType.INTEREST)
                .map(OrderMarkerDto::from)
                .toList();
    }
}
