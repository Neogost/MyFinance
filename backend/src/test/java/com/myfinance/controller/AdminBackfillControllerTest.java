package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.BackfillReport;
import com.myfinance.service.ExchangeRateBackfillService;
import com.myfinance.service.InstrumentBackfillService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminBackfillController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class AdminBackfillControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean InstrumentBackfillService instrumentBackfillService;
    @MockitoBean ExchangeRateBackfillService exchangeRateBackfillService;
    @MockitoBean com.myfinance.service.InstrumentPriceHistoryService priceHistoryService;

    private BackfillReport sampleReport(BackfillReport.Scope scope) {
        return new BackfillReport(scope, "1", "Sample",
                LocalDate.of(2024, 1, 1), LocalDate.of(2024, 12, 31),
                100, 5, 2, List.of("Erreur exemple"), 250L);
    }

    // ── backfill-prices (CRYPTO) ──────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void backfillCryptoPrices_admin_retourne200() throws Exception {
        when(instrumentBackfillService.backfillCrypto(eq(1L)))
                .thenReturn(sampleReport(BackfillReport.Scope.INSTRUMENT_PRICES));

        mockMvc.perform(post("/api/admin/instruments/1/backfill-prices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("INSTRUMENT_PRICES"))
                .andExpect(jsonPath("$.linesInserted").value(100));
    }

    @Test
    void backfillCryptoPrices_nonAuth_retourne401() throws Exception {
        mockMvc.perform(post("/api/admin/instruments/1/backfill-prices"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void backfillCryptoPrices_nonAdmin_retourne403() throws Exception {
        mockMvc.perform(post("/api/admin/instruments/1/backfill-prices"))
                .andExpect(status().isForbidden());
    }

    // ── import-prices (BOURSE CSV) ────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void importBoursePrices_admin_retourne200() throws Exception {
        when(instrumentBackfillService.importCsv(eq(1L), any()))
                .thenReturn(sampleReport(BackfillReport.Scope.INSTRUMENT_PRICES));

        MockMultipartFile file = new MockMultipartFile(
                "file", "test.csv", "text/csv",
                "date;price\n2024-01-02;432,15\n".getBytes());

        mockMvc.perform(multipart("/api/admin/instruments/1/import-prices").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("INSTRUMENT_PRICES"));
    }

    @Test
    void importBoursePrices_nonAuth_retourne401() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv", "x".getBytes());

        mockMvc.perform(multipart("/api/admin/instruments/1/import-prices").file(file))
                .andExpect(status().isUnauthorized());
    }

    // ── exchange-rates/{currency}/backfill ────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void backfillExchangeRate_admin_retourne200() throws Exception {
        when(exchangeRateBackfillService.backfill(eq("USD"), any(), any()))
                .thenReturn(sampleReport(BackfillReport.Scope.EXCHANGE_RATES));

        mockMvc.perform(post("/api/admin/exchange-rates/USD/backfill"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("EXCHANGE_RATES"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void backfillExchangeRate_avecParamsFromTo_retourne200() throws Exception {
        when(exchangeRateBackfillService.backfill(eq("USD"), eq(LocalDate.of(2024, 1, 1)), eq(LocalDate.of(2024, 6, 30))))
                .thenReturn(sampleReport(BackfillReport.Scope.EXCHANGE_RATES));

        mockMvc.perform(post("/api/admin/exchange-rates/USD/backfill")
                        .param("from", "2024-01-01")
                        .param("to", "2024-06-30"))
                .andExpect(status().isOk());
    }

    @Test
    void backfillExchangeRate_nonAuth_retourne401() throws Exception {
        mockMvc.perform(post("/api/admin/exchange-rates/USD/backfill"))
                .andExpect(status().isUnauthorized());
    }

    // ── price-history-summary ─────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void priceHistorySummary_admin_retourne200() throws Exception {
        when(priceHistoryService.getSummaryForAllInstruments())
                .thenReturn(java.util.Map.of(
                        1L, new com.myfinance.dto.PriceHistorySummaryDto(
                                432, LocalDate.of(2024, 1, 2), LocalDate.of(2026, 4, 30))));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/instruments/price-history-summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.1.dayCount").value(432));
    }
}
