package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.BackfillReport;
import com.myfinance.dto.PriceHistoryEntryDto;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    @MockitoBean com.myfinance.repository.PositionOrderRepository positionOrderRepository;

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

    // ── price-history (GET / PUT / DELETE) ───────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPriceHistory_admin_retourne200AvecEntrees() throws Exception {
        when(priceHistoryService.getHistory(eq(1L), any(), any()))
                .thenReturn(List.of(new PriceHistoryEntryDto(
                        LocalDate.of(2024, 1, 2), new BigDecimal("432.15"), "BOURSORAMA")));

        mockMvc.perform(get("/api/admin/instruments/1/price-history")
                        .param("from", "2024-01-01").param("to", "2024-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].priceDate").value("2024-01-02"))
                .andExpect(jsonPath("$[0].price").value(432.15))
                .andExpect(jsonPath("$[0].source").value("BOURSORAMA"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void upsertPriceHistory_admin_retourne200AvecDto() throws Exception {
        when(priceHistoryService.upsertManual(eq(1L), any(), any()))
                .thenReturn(new PriceHistoryEntryDto(
                        LocalDate.of(2024, 6, 15), new BigDecimal("450.00"), "MANUAL"));

        mockMvc.perform(put("/api/admin/instruments/1/price-history/2024-06-15")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"price\": 450.00}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("MANUAL"))
                .andExpect(jsonPath("$.price").value(450.0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deletePriceHistory_admin_retourne204() throws Exception {
        doNothing().when(priceHistoryService).deleteEntry(eq(1L), any());

        mockMvc.perform(delete("/api/admin/instruments/1/price-history/2024-06-15"))
                .andExpect(status().isNoContent());
    }

    @Test
    void getPriceHistory_nonAuth_retourne401() throws Exception {
        mockMvc.perform(get("/api/admin/instruments/1/price-history")
                        .param("from", "2024-01-01").param("to", "2024-12-31"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void getPriceHistory_nonAdmin_retourne403() throws Exception {
        mockMvc.perform(get("/api/admin/instruments/1/price-history")
                        .param("from", "2024-01-01").param("to", "2024-12-31"))
                .andExpect(status().isForbidden());
    }

    // ── price-history-summary ─────────────────────────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void priceHistorySummary_admin_retourne200() throws Exception {
        when(priceHistoryService.getSummaryForAllInstruments())
                .thenReturn(java.util.Map.of(
                        1L, new com.myfinance.dto.PriceHistorySummaryDto(
                                432, LocalDate.of(2024, 1, 2), LocalDate.of(2026, 4, 30), null)));
        java.util.List<Object[]> firstOrders = new java.util.ArrayList<>();
        firstOrders.add(new Object[]{1L, LocalDate.of(2021, 4, 9)});
        when(positionOrderRepository.findMinOrderDatesGroupedByInstrument()).thenReturn(firstOrders);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/instruments/price-history-summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.1.dayCount").value(432));
    }
}
