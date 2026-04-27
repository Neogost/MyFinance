package com.myfinance.controller;

import com.myfinance.dto.ExchangeRateDto;
import com.myfinance.dto.UpdateExchangeRateRequest;
import com.myfinance.service.ExchangeRateService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/exchange-rates")
@RequiredArgsConstructor
@Validated
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
    public List<ExchangeRateDto> updateRates(
            @Size(max = 200, message = "Au maximum 200 devises par mise à jour")
            @Valid @RequestBody List<UpdateExchangeRateRequest> requests,
            Authentication authentication) {
        log.info("[admin:{}] Mise à jour des taux de change ({} devise(s))",
                authentication.getName(), requests.size());
        return exchangeRateService.updateRates(requests);
    }
}
