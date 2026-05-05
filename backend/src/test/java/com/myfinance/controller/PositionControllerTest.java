package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.service.PositionService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PositionController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class PositionControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean PositionService positionService;

    PositionDto livretDto;
    PositionDto liquiditeDto;
    PositionComputedDto zeroComputed;

    @BeforeEach
    void setUp() {
        zeroComputed = new PositionComputedDto(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, null, null);

        livretDto = new PositionDto(
                1L, AssetCategory.LIVRET, "BNP Parisbas", "Livret A", "EUR",
                FiscalEnvelope.NONE, null, null, null, null, null, null, null, null,
                null, new BigDecimal("3.00"), null, true, PositionStatus.ACTIVE,
                null, LocalDateTime.now(), null, zeroComputed);

        liquiditeDto = new PositionDto(
                2L, AssetCategory.LIQUIDITE, "Swile", "Ticket Restaurant", "EUR",
                null, null, null, null, null, null, null, null, null, null, null,
                new BigDecimal("525.79"), false, PositionStatus.ACTIVE,
                null, LocalDateTime.now(), null,
                new PositionComputedDto(
                        new BigDecimal("525.79"), new BigDecimal("525.79"),
                        BigDecimal.ZERO, null, null));
    }

    // ── GET /api/positions ─────────────────────────────────────

    @Test
    @WithMockCustomUser
    void findAll_retourne200AvecLaListe() throws Exception {
        when(positionService.findAllByUser(any(), any(), any())).thenReturn(List.of(livretDto, liquiditeDto));

        mockMvc.perform(get("/api/positions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].category").value("LIVRET"))
                .andExpect(jsonPath("$[1].category").value("LIQUIDITE"));
    }

    @Test
    @WithMockCustomUser
    void findAll_avecFiltreCategorie_retourne200() throws Exception {
        when(positionService.findAllByUser(any(), eq(AssetCategory.LIVRET), any()))
                .thenReturn(List.of(livretDto));

        mockMvc.perform(get("/api/positions").param("category", "LIVRET"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].label").value("Livret A"));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/positions"))
                .andExpect(status().isUnauthorized());
    }

    // ── GET /api/positions/{id} ────────────────────────────────

    @Test
    @WithMockCustomUser
    void findById_retourne200() throws Exception {
        when(positionService.findById(eq(1L), any())).thenReturn(livretDto);

        mockMvc.perform(get("/api/positions/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.label").value("Livret A"))
                .andExpect(jsonPath("$.annualRate").value(3.0));
    }

    @Test
    @WithMockCustomUser
    void findById_retourne404_siIntrouvable() throws Exception {
        when(positionService.findById(eq(99L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/positions/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockCustomUser
    void findById_retourne403_siAccesNonAutorise() throws Exception {
        when(positionService.findById(eq(1L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(get("/api/positions/1"))
                .andExpect(status().isForbidden());
    }

    // ── POST /api/positions ────────────────────────────────────

    @Test
    @WithMockCustomUser
    void create_livret_retourne201() throws Exception {
        CreatePositionRequest request = new CreatePositionRequest(
                AssetCategory.LIVRET, "BNP Parisbas", "Livret A", "EUR",
                FiscalEnvelope.NONE, null, null, null, null, null, null, null, null,
                null, new BigDecimal("3.00"), null, true);

        when(positionService.create(any(), any())).thenReturn(livretDto);

        mockMvc.perform(post("/api/positions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("LIVRET"))
                .andExpect(jsonPath("$.label").value("Livret A"));
    }

    @Test
    @WithMockCustomUser
    void create_liquidite_retourne201() throws Exception {
        CreatePositionRequest request = new CreatePositionRequest(
                AssetCategory.LIQUIDITE, "Swile", "Ticket Restaurant", "EUR",
                null, null, null, null, null, null, null, null, null, null, null,
                new BigDecimal("525.79"), false);

        when(positionService.create(any(), any())).thenReturn(liquiditeDto);

        mockMvc.perform(post("/api/positions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("LIQUIDITE"))
                .andExpect(jsonPath("$.currentBalance").value(525.79));
    }

    @Test
    @WithMockCustomUser
    void create_sansLabel_retourne400() throws Exception {
        CreatePositionRequest request = new CreatePositionRequest(
                AssetCategory.LIVRET, "BNP Parisbas", "", "EUR",
                null, null, null, null, null, null, null, null, null, null, null, null, false);

        mockMvc.perform(post("/api/positions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── PUT /api/positions/{id} ────────────────────────────────

    @Test
    @WithMockCustomUser
    void update_retourne200() throws Exception {
        UpdatePositionRequest request = new UpdatePositionRequest(
                "BNP Parisbas", "Livret A modifié", "EUR",
                FiscalEnvelope.NONE, null, null, null, null, null, null, null, null,
                null, new BigDecimal("3.50"), true, null);

        PositionDto updated = new PositionDto(
                1L, AssetCategory.LIVRET, "BNP Parisbas", "Livret A modifié", "EUR",
                FiscalEnvelope.NONE, null, null, null, null, null, null, null, null,
                null, new BigDecimal("3.50"), null, true, PositionStatus.ACTIVE,
                null, LocalDateTime.now(), null, zeroComputed);

        when(positionService.update(eq(1L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/positions/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.label").value("Livret A modifié"))
                .andExpect(jsonPath("$.annualRate").value(3.5));
    }

    // ── PUT /api/positions/{id}/balance ────────────────────────

    @Test
    @WithMockCustomUser
    void updateBalance_retourne200() throws Exception {
        UpdateBalanceRequest request = new UpdateBalanceRequest(new BigDecimal("612.00"));

        PositionDto updated = new PositionDto(
                2L, AssetCategory.LIQUIDITE, "Swile", "Ticket Restaurant", "EUR",
                null, null, null, null, null, null, null, null, null, null, null,
                new BigDecimal("612.00"), false, PositionStatus.ACTIVE,
                null, LocalDateTime.now(), null,
                new PositionComputedDto(
                        new BigDecimal("612.00"), new BigDecimal("612.00"),
                        BigDecimal.ZERO, null, null));

        when(positionService.updateBalance(eq(2L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/positions/2/balance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(612.0));
    }

    @Test
    @WithMockCustomUser
    void updateBalance_retourne400_siPasLiquidite() throws Exception {
        when(positionService.updateBalance(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST));

        mockMvc.perform(put("/api/positions/1/balance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateBalanceRequest(new BigDecimal("100")))))
                .andExpect(status().isBadRequest());
    }

    // ── PUT /api/positions/{id}/estimated-value ────────────────

    @Test
    @WithMockCustomUser
    void updateEstimatedValue_retourne200() throws Exception {
        UpdateEstimatedValueRequest request = new UpdateEstimatedValueRequest(new BigDecimal("120000"));

        PositionDto updated = new PositionDto(
                4L, AssetCategory.IMMO_PHYSIQUE, null, "Appartement", "EUR",
                null, null, null, OwnershipType.PLEINE_PROPRIETE, null, "12 Rue X",
                new BigDecimal("120000"), null, null, null, null, null, false, PositionStatus.ACTIVE,
                null, LocalDateTime.now(), null,
                new PositionComputedDto(BigDecimal.ZERO, new BigDecimal("120000"),
                        new BigDecimal("120000"), null, null));

        when(positionService.updateEstimatedValue(eq(4L), any(), any())).thenReturn(updated);

        mockMvc.perform(put("/api/positions/4/estimated-value")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estimatedCurrentValue").value(120000.0));
    }

    // ── PUT /api/positions/{id}/close ──────────────────────────

    @Test
    @WithMockCustomUser
    void close_retourne200AvecStatusClosed() throws Exception {
        PositionDto closed = new PositionDto(
                1L, AssetCategory.LIVRET, "BNP Parisbas", "Livret A", "EUR",
                FiscalEnvelope.NONE, null, null, null, null, null, null, null, null,
                null, new BigDecimal("3.00"), null, true, PositionStatus.CLOSED,
                null, LocalDateTime.now(), null, zeroComputed);

        when(positionService.close(eq(1L), any())).thenReturn(closed);

        mockMvc.perform(put("/api/positions/1/close"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }

    // ── DELETE /api/positions/{id} ─────────────────────────────

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/positions/1"))
                .andExpect(status().isNoContent());

        verify(positionService).delete(eq(1L), any());
    }

    @Test
    @WithMockCustomUser
    void delete_retourne403_siAccesNonAutorise() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN))
                .when(positionService).delete(eq(1L), any());

        mockMvc.perform(delete("/api/positions/1"))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/positions/{id}/orders ─────────────────────────

    @Test
    @WithMockCustomUser
    void findOrders_retourne200() throws Exception {
        PositionOrderDto orderDto = new PositionOrderDto(
                100L, OrderType.DEPOSIT, null, null,
                new BigDecimal("500"), new BigDecimal("500"),
                LocalDate.of(2026, 4, 1), "Versement", null, null, null);

        when(positionService.findOrdersByPosition(eq(1L), any())).thenReturn(List.of(orderDto));

        mockMvc.perform(get("/api/positions/1/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].orderType").value("DEPOSIT"))
                .andExpect(jsonPath("$[0].amountEur").value(500.0));
    }

    // ── POST /api/positions/{id}/orders ────────────────────────

    @Test
    @WithMockCustomUser
    void createOrder_retourne201() throws Exception {
        CreatePositionOrderRequest request = new CreatePositionOrderRequest(
                OrderType.DEPOSIT, null, null, new BigDecimal("500.00"),
                LocalDate.of(2026, 4, 1), "Versement", null, null, null, null, null);

        PositionOrderDto created = new PositionOrderDto(
                100L, OrderType.DEPOSIT, null, null,
                new BigDecimal("500"), new BigDecimal("500"),
                LocalDate.of(2026, 4, 1), "Versement", null, null, null);

        when(positionService.createOrder(eq(1L), any(), any())).thenReturn(created);

        mockMvc.perform(post("/api/positions/1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.orderType").value("DEPOSIT"));
    }

    @Test
    @WithMockCustomUser
    void createOrder_retourne400_siLiquidite() throws Exception {
        CreatePositionOrderRequest request = new CreatePositionOrderRequest(
                OrderType.DEPOSIT, null, null, new BigDecimal("100"),
                LocalDate.now(), null, null, null, null, null, null);

        when(positionService.createOrder(eq(2L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST));

        mockMvc.perform(post("/api/positions/2/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── DELETE /api/positions/{id}/orders/{orderId} ────────────

    @Test
    @WithMockCustomUser
    void deleteOrder_retourne204() throws Exception {
        mockMvc.perform(delete("/api/positions/1/orders/100"))
                .andExpect(status().isNoContent());

        verify(positionService).deleteOrder(eq(1L), eq(100L), any());
    }
}
