package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.InfoBannerType;
import com.myfinance.dto.InfoBannerDto;
import com.myfinance.service.InfoBannerService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InfoBannerController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class InfoBannerControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean InfoBannerService infoBannerService;

    InfoBannerDto dto;

    @BeforeEach
    void setUp() {
        dto = new InfoBannerDto(1L, "Maintenance", "Fenêtre de maintenance ce soir.", InfoBannerType.MAINTENANCE);
    }

    // ── GET /api/info-banners/active ───────────────────────────────

    @Test
    @WithMockCustomUser
    void getActive_retourne200AvecListe() throws Exception {
        when(infoBannerService.findActive(any())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/info-banners/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].type").value("MAINTENANCE"))
                .andExpect(jsonPath("$[0].title").value("Maintenance"));
    }

    @Test
    @WithMockCustomUser
    void getActive_retourne200ListeVide() throws Exception {
        when(infoBannerService.findActive(any())).thenReturn(List.of());

        mockMvc.perform(get("/api/info-banners/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getActive_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/info-banners/active"))
                .andExpect(status().isUnauthorized());
    }
}
