package com.myfinance.service;

import com.myfinance.domain.ExchangeRate;
import com.myfinance.dto.ExchangeRateDto;
import com.myfinance.dto.ExchangeRateUsageDto;
import com.myfinance.dto.UpdateExchangeRateRequest;
import com.myfinance.repository.ExchangeRateHistoryRepository;
import com.myfinance.repository.ExchangeRateRepository;
import com.myfinance.repository.InstrumentRepository;
import com.myfinance.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeRateService {

    private final ExchangeRateRepository        exchangeRateRepository;
    private final ExchangeRateHistoryRepository rateHistoryRepository;
    private final InstrumentRepository          instrumentRepository;
    private final PositionRepository            positionRepository;

    // ── Lecture ────────────────────────────────────────────────

    public List<ExchangeRateDto> findAll() {
        return exchangeRateRepository.findAllByOrderByCurrencyAsc()
                .stream().map(ExchangeRateDto::from).toList();
    }

    /**
     * Retourne tous les taux sous forme de Map devise → taux,
     * pour être injectés dans les calculs de valorisation des positions.
     */
    public Map<String, BigDecimal> getRatesAsMap() {
        return exchangeRateRepository.findAll().stream()
                .collect(Collectors.toMap(ExchangeRate::getCurrency, ExchangeRate::getRate));
    }

    // ── Mise à jour groupée (upsert par devise) ────────────────

    public List<ExchangeRateDto> updateRates(List<UpdateExchangeRateRequest> requests) {
        List<ExchangeRateDto> result = requests.stream().map(req -> {
            ExchangeRate er = exchangeRateRepository.findByCurrency(req.currency())
                    .orElse(ExchangeRate.builder().currency(req.currency()).build());
            er.setRate(req.rate());
            er.setLastUpdatedAt(LocalDateTime.now());
            return ExchangeRateDto.from(exchangeRateRepository.save(er));
        }).toList();
        log.info("[system] Taux de change mis à jour - {} devise(s)", result.size());
        return result;
    }

    // ── Suppression ────────────────────────────────────────────

    /** Compte les instruments et positions qui utilisent cette devise. */
    public ExchangeRateUsageDto checkUsage(String currency) {
        long instruments = instrumentRepository.countByCurrency(currency);
        long positions   = positionRepository.countByInstrumentCurrency(currency);
        return new ExchangeRateUsageDto(currency, instruments, positions);
    }

    /**
     * Supprime le taux courant et l'historique complet de la devise.
     * Les instruments/positions qui l'utilisent ne sont pas supprimés.
     */
    @Transactional
    public void delete(String currency) {
        ExchangeRate er = exchangeRateRepository.findByCurrency(currency)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Devise introuvable : " + currency));
        rateHistoryRepository.deleteByCurrency(currency);
        exchangeRateRepository.delete(er);
        log.info("[ExchangeRate] Devise {} supprimée (taux courant + historique)", currency);
    }
}
