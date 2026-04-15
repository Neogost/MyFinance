package com.myfinance.controller;

import com.myfinance.dto.ExchangeRateDto;
import com.myfinance.dto.UpdateExchangeRateRequest;
import com.myfinance.service.ExchangeRateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exchange-rates")
@RequiredArgsConstructor
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    /** GET /api/exchange-rates — liste tous les taux (ADMIN) */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<ExchangeRateDto> list() {
        return exchangeRateService.findAll();
    }

    /** PUT /api/exchange-rates — mise à jour groupée, upsert par devise (ADMIN) */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<ExchangeRateDto> updateRates(@Valid @RequestBody List<UpdateExchangeRateRequest> requests) {
        return exchangeRateService.updateRates(requests);
    }
}
