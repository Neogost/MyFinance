package com.myfinance.controller;

import com.myfinance.domain.AssetCategory;
import com.myfinance.dto.CreateInstrumentRequest;
import com.myfinance.dto.InstrumentDto;
import com.myfinance.dto.UpdateInstrumentPriceRequest;
import com.myfinance.service.InstrumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/instruments")
@RequiredArgsConstructor
public class InstrumentController {

    private final InstrumentService instrumentService;

    /** GET /api/instruments?q=&category= */
    @GetMapping
    public List<InstrumentDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) AssetCategory category) {
        return instrumentService.findAll(q, category);
    }

    /** GET /api/instruments/{id} */
    @GetMapping("/{id}")
    public InstrumentDto getById(@PathVariable Long id) {
        return instrumentService.findById(id);
    }

    /** POST /api/instruments */
    @PostMapping
    public ResponseEntity<InstrumentDto> create(@Valid @RequestBody CreateInstrumentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(instrumentService.create(request));
    }

    /** PUT /api/instruments/{id} */
    @PutMapping("/{id}")
    public InstrumentDto update(
            @PathVariable Long id,
            @Valid @RequestBody CreateInstrumentRequest request) {
        return instrumentService.update(id, request);
    }

    /** GET /api/instruments/active — instruments liés à au moins une position ACTIVE */
    @GetMapping("/active")
    @PreAuthorize("hasRole('ADMIN')")
    public List<InstrumentDto> listActive() {
        return instrumentService.findActiveInstruments();
    }

    /** PUT /api/instruments/prices — mise à jour groupée des cours (ADMIN) */
    @PutMapping("/prices")
    @PreAuthorize("hasRole('ADMIN')")
    public List<InstrumentDto> updatePrices(@Valid @RequestBody List<UpdateInstrumentPriceRequest> requests) {
        return instrumentService.updatePrices(requests);
    }
}
