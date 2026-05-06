package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.AssetCategory;
import com.myfinance.dto.InstrumentDto;
import com.myfinance.dto.InstrumentPricePointDto;
import com.myfinance.dto.UpdateInstrumentPriceRequest;
import com.myfinance.service.InstrumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import com.myfinance.support.WithMockCustomUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InstrumentController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class InstrumentControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean InstrumentService instrumentService;

    InstrumentDto etfDto;
    InstrumentDto bitcoinDto;

    @BeforeEach
    void setUp() {
        etfDto = new InstrumentDto(
                1L, AssetCategory.BOURSE, "FR0010315770", null,
                "Lyxor PEA Nasdaq-100", "EUR",
                new BigDecimal("88.44"), LocalDateTime.of(2026, 4, 1, 8, 0), false, "QQQ.PA", null, null, List.of(), List.of(), 0L, null, null);

        bitcoinDto = new InstrumentDto(
                2L, AssetCategory.CRYPTO, null, "BTC",
                "Bitcoin", "USD",
                new BigDecimal("60000"), LocalDateTime.of(2026, 4, 1, 9, 0), false, null, "bitcoin", null, List.of(), List.of(), 0L, null, null);
    }

    // ── GET /api/instruments ───────────────────────────────────

    @Test
    @WithMockUser
    void list_retourne200AvecLaListe() throws Exception {
        when(instrumentService.findAll(null, null)).thenReturn(List.of(etfDto, bitcoinDto));

        mockMvc.perform(get("/api/instruments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].isin").value("FR0010315770"))
                .andExpect(jsonPath("$[1].ticker").value("BTC"));
    }

    // ── GET /api/instruments/{id} ──────────────────────────────

    @Test
    @WithMockUser
    void getById_retourne200() throws Exception {
        when(instrumentService.findById(1L)).thenReturn(etfDto);

        mockMvc.perform(get("/api/instruments/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Lyxor PEA Nasdaq-100"));
    }

    @Test
    @WithMockUser
    void getById_introuvable_retourne404() throws Exception {
        when(instrumentService.findById(99L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/instruments/99"))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/instruments/active ────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void listActive_asAdmin_retourne200AvecInstrumentsActifs() throws Exception {
        when(instrumentService.findActiveInstruments()).thenReturn(List.of(etfDto, bitcoinDto));

        mockMvc.perform(get("/api/instruments/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].category").value("BOURSE"))
                .andExpect(jsonPath("$[1].category").value("CRYPTO"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void listActive_asUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/instruments/active"))
                .andExpect(status().isForbidden());
    }

    @Test
    void listActive_nonAuthentifie_retourne401() throws Exception {
        mockMvc.perform(get("/api/instruments/active"))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT /api/instruments/prices ────────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void updatePrices_asAdmin_retourne200AvecInstrumentsMisAJour() throws Exception {
        InstrumentDto updated = new InstrumentDto(
                1L, AssetCategory.BOURSE, "FR0010315770", null,
                "Lyxor PEA Nasdaq-100", "EUR",
                new BigDecimal("95.00"), LocalDateTime.now(), false, "QQQ.PA", null, null, List.of(), List.of(), 0L, null, null);

        when(instrumentService.updatePrices(any())).thenReturn(List.of(updated));

        List<UpdateInstrumentPriceRequest> body = List.of(
                new UpdateInstrumentPriceRequest(1L, new BigDecimal("95.00")));

        mockMvc.perform(put("/api/instruments/prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].lastPrice").value(95.00));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updatePrices_instrumentIntrouvable_retourne404() throws Exception {
        when(instrumentService.updatePrices(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        List<UpdateInstrumentPriceRequest> body = List.of(
                new UpdateInstrumentPriceRequest(99L, new BigDecimal("10.00")));

        mockMvc.perform(put("/api/instruments/prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isNotFound());
    }

    // ── PATCH /api/instruments/{id}/stable-price ───────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateStablePrice_asAdmin_retourne200() throws Exception {
        InstrumentDto stable = new InstrumentDto(
                1L, AssetCategory.BOURSE, "FR0010315770", null,
                "Lyxor PEA Nasdaq-100", "EUR",
                new BigDecimal("88.44"), LocalDateTime.of(2026, 4, 1, 8, 0), true, "QQQ.PA", null, null, List.of(), List.of(), 0L, null, null);

        when(instrumentService.updateStablePrice(1L, true)).thenReturn(stable);

        mockMvc.perform(patch("/api/instruments/1/stable-price")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stablePrice\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stablePrice").value(true));
    }

    @Test
    @WithMockUser(roles = "USER")
    void updateStablePrice_asUser_retourne403() throws Exception {
        mockMvc.perform(patch("/api/instruments/1/stable-price")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stablePrice\": true}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER")
    void updatePrices_asUser_retourne403() throws Exception {
        List<UpdateInstrumentPriceRequest> body = List.of(
                new UpdateInstrumentPriceRequest(1L, new BigDecimal("95.00")));

        mockMvc.perform(put("/api/instruments/prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /api/instruments/{id} ───────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_asAdmin_retourne204() throws Exception {
        mockMvc.perform(delete("/api/instruments/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_instrumentIntrouvable_retourne404() throws Exception {
        org.mockito.Mockito.doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND))
                .when(instrumentService).deleteInstrument(99L);

        mockMvc.perform(delete("/api/instruments/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "USER")
    void delete_asUser_retourne403() throws Exception {
        mockMvc.perform(delete("/api/instruments/1"))
                .andExpect(status().isForbidden());
    }

    // ── PUT /api/instruments/{id} — H1 (ADMIN uniquement) ──────

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_asAdmin_retourne200() throws Exception {
        com.myfinance.dto.CreateInstrumentRequest request = new com.myfinance.dto.CreateInstrumentRequest(
                AssetCategory.BOURSE, "FR0010315770", null, "Lyxor PEA Nasdaq-100 v2", "EUR", false, "QQQ.PA", null, null);
        when(instrumentService.update(eq(1L), any())).thenReturn(etfDto);

        mockMvc.perform(put("/api/instruments/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    // ── H2 : whitelist sur boursoramaSymbol ────────────────────

    @Test
    @WithMockUser
    void create_boursoramaSymbolAvecPathTraversal_retourne400() throws Exception {
        // Tentative d'injection : caractères / et .. (path traversal vers une autre URL)
        com.myfinance.dto.CreateInstrumentRequest req = new com.myfinance.dto.CreateInstrumentRequest(
                AssetCategory.BOURSE, "FR0010315770", null, "Hack", "EUR", false, "1rTESE/../../malicious.example.com", null, null); 

        mockMvc.perform(post("/api/instruments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void create_boursoramaSymbolAvecCharactereSpecial_retourne400() throws Exception {
        // % et ? sont aussi des caractères dangereux pour une URL
        com.myfinance.dto.CreateInstrumentRequest req = new com.myfinance.dto.CreateInstrumentRequest(
                AssetCategory.BOURSE, "FR0010315770", null, "Hack", "EUR", false, "1rTESE?evil=true", null, null); 

        mockMvc.perform(post("/api/instruments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void create_boursoramaSymbolValide_retourne201() throws Exception {
        // Symbole conforme à la whitelist (lettres + chiffres + . - _) → OK
        com.myfinance.dto.CreateInstrumentRequest req = new com.myfinance.dto.CreateInstrumentRequest(
                AssetCategory.BOURSE, "FR0010315770", null, "ETF Lyxor", "EUR", false, "1rTESE", null, null); 
        when(instrumentService.create(any())).thenReturn(etfDto);

        mockMvc.perform(post("/api/instruments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(roles = "USER")
    void update_asUser_retourne403() throws Exception {
        // Un utilisateur non-admin ne doit PAS pouvoir modifier un instrument partagé.
        // Sans cette restriction, un utilisateur pourrait altérer name/currency/boursoramaSymbol
        // d'instruments référencés par les positions d'autres utilisateurs (data poisoning).
        com.myfinance.dto.CreateInstrumentRequest request = new com.myfinance.dto.CreateInstrumentRequest(
                AssetCategory.BOURSE, "FR0010315770", null, "ARNAQUE", "EUR", false, null, null, null);

        mockMvc.perform(put("/api/instruments/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // ── Validation H5 — bornes sur les Lists d'allocations ────

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateAllocations_plusDe200Entrees_retourne400() throws Exception {
        java.util.List<com.myfinance.dto.InstrumentAllocationDto> trop = new java.util.ArrayList<>();
        for (int i = 0; i < 201; i++) {
            trop.add(new com.myfinance.dto.InstrumentAllocationDto("Pays" + i, new BigDecimal("0.5")));
        }

        mockMvc.perform(put("/api/instruments/1/allocations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(trop)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateAllocations_pourcentageHorsBornes_retourne400() throws Exception {
        // 150 % > 100 → invalide
        java.util.List<com.myfinance.dto.InstrumentAllocationDto> entries = java.util.List.of(
                new com.myfinance.dto.InstrumentAllocationDto("France", new BigDecimal("150")));

        mockMvc.perform(put("/api/instruments/1/allocations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(entries)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateAllocations_paysVide_retourne400() throws Exception {
        java.util.List<com.myfinance.dto.InstrumentAllocationDto> entries = java.util.List.of(
                new com.myfinance.dto.InstrumentAllocationDto("", new BigDecimal("50")));

        mockMvc.perform(put("/api/instruments/1/allocations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(entries)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateSectorAllocations_plusDe50Entrees_retourne400() throws Exception {
        java.util.List<com.myfinance.dto.InstrumentSectorAllocationDto> trop = new java.util.ArrayList<>();
        for (int i = 0; i < 51; i++) {
            trop.add(new com.myfinance.dto.InstrumentSectorAllocationDto("Secteur" + i, new BigDecimal("0.5")));
        }

        mockMvc.perform(put("/api/instruments/1/sector-allocations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(trop)))
                .andExpect(status().isBadRequest());
    }

    // ── GET /api/instruments/{id}/price-history ────────────────

    @Test
    @WithMockUser
    void getPriceHistory_retourne200AvecListe() throws Exception {
        var point = new InstrumentPricePointDto(
                java.time.LocalDate.of(2024, 1, 15),
                new BigDecimal("42000.00")
        );
        when(instrumentService.getPriceHistory(eq(1L), any(), any()))
                .thenReturn(java.util.List.of(point));

        mockMvc.perform(get("/api/instruments/1/price-history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].date").value("2024-01-15"))
                .andExpect(jsonPath("$[0].price").value(42000.00));
    }

    @Test
    @WithMockUser
    void getPriceHistory_avecParametreFrom_passeLaDate() throws Exception {
        when(instrumentService.getPriceHistory(eq(1L), any(), any()))
                .thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/instruments/1/price-history")
                        .param("from", "2023-01-01")
                        .param("to",   "2024-01-01"))
                .andExpect(status().isOk());

        verify(instrumentService).getPriceHistory(
                eq(1L),
                eq(java.time.LocalDate.of(2023, 1, 1)),
                eq(java.time.LocalDate.of(2024, 1, 1))
        );
    }

    @Test
    void getPriceHistory_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/instruments/1/price-history"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/instruments/{id}/order-markers ────────────────

    @Test
    @WithMockCustomUser
    void getOrderMarkers_retourne200AvecListe() throws Exception {
        var marker = new com.myfinance.dto.OrderMarkerDto(
                java.time.LocalDate.of(2024, 3, 10),
                com.myfinance.domain.OrderType.BUY,
                new BigDecimal("8000.00"),
                new BigDecimal("0.2"),
                "Bitcoin Ledger"
        );
        when(instrumentService.getOrderMarkers(eq(1L), any()))
                .thenReturn(java.util.List.of(marker));

        mockMvc.perform(get("/api/instruments/1/order-markers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].orderType").value("BUY"))
                .andExpect(jsonPath("$[0].positionLabel").value("Bitcoin Ledger"));
    }

    @Test
    void getOrderMarkers_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/instruments/1/order-markers"))
                .andExpect(status().isUnauthorized());
    }
}
