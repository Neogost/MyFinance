package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.BenchmarkDto;
import com.myfinance.dto.PerformanceDto;
import com.myfinance.repository.InstrumentRepository;
import com.myfinance.service.BenchmarkService;
import com.myfinance.service.PerformanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/patrimoine/performance")
@RequiredArgsConstructor
@Tag(name = "Performance patrimoniale", description = "TWR + MWR — tous utilisateurs authentifiés")
public class PerformanceController {

    private final PerformanceService    performanceService;
    private final BenchmarkService      benchmarkService;
    private final InstrumentRepository  instrumentRepository;

    @Operation(summary = "Performance du patrimoine (TWR + MWR)")
    @ApiResponse(responseCode = "200", description = "Performance calculée",
            content = @Content(schema = @Schema(implementation = PerformanceDto.class)))
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PerformanceDto> getPerformance(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(performanceService.computeGlobal(currentUser, from, to));
    }

    @Operation(summary = "TWR d'un instrument benchmark sur la même période")
    @ApiResponse(responseCode = "200", description = "TWR benchmark calculé")
    @ApiResponse(responseCode = "404", description = "Instrument non trouvé")
    @GetMapping("/benchmark")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BenchmarkDto> getBenchmark(
            @RequestParam Long instrumentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return instrumentRepository.findById(instrumentId)
                .map(instrument -> ResponseEntity.ok(benchmarkService.compute(instrument, from, to)))
                .orElse(ResponseEntity.notFound().build());
    }
}
