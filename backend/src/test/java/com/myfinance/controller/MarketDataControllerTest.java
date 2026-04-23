package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.dto.MarketDataReportDto;
import com.myfinance.service.MarketDataService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MarketDataController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class MarketDataControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean MarketDataService marketDataService;

    @Test
    @WithMockCustomUser(role = "ADMIN")
    void runManually_adminAuthentifie_retourne200AvecRapport() throws Exception {
        MarketDataReportDto report = new MarketDataReportDto(
                2, 5, 1, 30, 3, 1, 0,
                List.of("Cours Yahoo indisponible pour AAPL (Apple)"),
                LocalDateTime.of(2025, 1, 1, 2, 0)
        );
        when(marketDataService.runFullUpdate()).thenReturn(report);

        mockMvc.perform(post("/api/admin/market-data/run"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.instrumentsUpdated").value(5))
                .andExpect(jsonPath("$.instrumentsFailed").value(1))
                .andExpect(jsonPath("$.ratesUpdated").value(30))
                .andExpect(jsonPath("$.snapshotsCreated").value(3))
                .andExpect(jsonPath("$.errors.length()").value(1));
    }

    @Test
    void runManually_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(post("/api/admin/market-data/run"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockCustomUser
    void runManually_roleUser_retourne403() throws Exception {
        mockMvc.perform(post("/api/admin/market-data/run"))
                .andExpect(status().isForbidden());
    }
}
