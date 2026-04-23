package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.dto.CreateInstrumentRequest;
import com.myfinance.dto.InstrumentDto;
import com.myfinance.dto.UpdateInstrumentPriceRequest;
import com.myfinance.repository.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InstrumentService {

    private final InstrumentRepository instrumentRepository;

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

        return instruments.stream().map(InstrumentDto::from).toList();
    }

    public InstrumentDto findById(Long id) {
        return InstrumentDto.from(getOrThrow(id));
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
                .build();

        return InstrumentDto.from(instrumentRepository.save(instrument));
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

        return InstrumentDto.from(instrumentRepository.save(instrument));
    }

    // ── Prix fixe ─────────────────────────────────────────────

    public InstrumentDto updateStablePrice(Long id, boolean stablePrice) {
        Instrument instrument = getOrThrow(id);
        instrument.setStablePrice(stablePrice);
        return InstrumentDto.from(instrumentRepository.save(instrument));
    }

    // ── Cours manuels ──────────────────────────────────────────

    public List<InstrumentDto> findActiveInstruments() {
        return instrumentRepository.findAllWithActivePositions()
                .stream().map(InstrumentDto::from).toList();
    }

    public List<InstrumentDto> updatePrices(List<UpdateInstrumentPriceRequest> requests) {
        return requests.stream().map(req -> {
            Instrument instrument = getOrThrow(req.instrumentId());
            instrument.setLastPrice(req.lastPrice());
            instrument.setLastPriceUpdatedAt(LocalDateTime.now());
            return InstrumentDto.from(instrumentRepository.save(instrument));
        }).toList();
    }

    // ── Helpers ────────────────────────────────────────────────

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
}
