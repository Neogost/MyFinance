package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.AchievementCode;
import com.myfinance.domain.AchievementSensitivity;
import com.myfinance.domain.UserAchievement;
import com.myfinance.dto.AchievementDto;
import com.myfinance.dto.UserAchievementsDto;
import com.myfinance.service.achievement.AchievementCatalog;
import com.myfinance.service.achievement.AchievementDefinition;
import com.myfinance.service.achievement.AchievementLevel;
import com.myfinance.service.achievement.AchievementService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AchievementController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class AchievementControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean AchievementService achievementService;
    @MockitoBean AchievementCatalog catalog;

    // ── GET /api/achievements/me ───────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void getMyAchievements_retourne200AvecListe() throws Exception {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.PIONNIER, "🌟", "Le Pionnier",
                "Première position créée", AchievementSensitivity.NULLE, false,
                List.of(AchievementLevel.unique()));

        UserAchievement ua = UserAchievement.builder()
                .achievementCode(AchievementCode.PIONNIER)
                .level(1)
                .confirmedAt(LocalDateTime.now())
                .build();

        when(catalog.all()).thenReturn(List.of(def));
        when(catalog.totalBadges()).thenReturn(1);
        when(achievementService.evaluateAndGetAll(any())).thenReturn(List.of(ua));
        when(achievementService.countUnseen(any())).thenReturn(1L);

        mockMvc.perform(get("/api/achievements/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUnlockedLevels").value(1))
                .andExpect(jsonPath("$.unseenCount").value(1))
                .andExpect(jsonPath("$.achievements[0].code").value("PIONNIER"))
                .andExpect(jsonPath("$.achievements[0].confirmedLevel").value(1));
    }

    @Test
    @WithMockCustomUser
    void getMyAchievements_badgeSecretNonDebloque_masqueLesInfos() throws Exception {
        AchievementDefinition def = new AchievementDefinition(
                AchievementCode.VAMPIRE, "🌃", "Le Vampire",
                "Mode nuit activé", AchievementSensitivity.NULLE, true,
                List.of(AchievementLevel.unique()));

        when(catalog.all()).thenReturn(List.of(def));
        when(catalog.totalBadges()).thenReturn(1);
        when(achievementService.evaluateAndGetAll(any())).thenReturn(List.of());
        when(achievementService.countUnseen(any())).thenReturn(0L);

        mockMvc.perform(get("/api/achievements/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.achievements[0].name").value("???"))
                .andExpect(jsonPath("$.achievements[0].emoji").value("❓"))
                .andExpect(jsonPath("$.achievements[0].confirmedLevel").value(0));
    }

    @Test
    void getMyAchievements_nonAuthentifie_retourne401() throws Exception {
        mockMvc.perform(get("/api/achievements/me"))
                .andExpect(status().isUnauthorized());
    }

    // ── PUT /api/achievements/me/seen ─────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void markSeen_retourne204() throws Exception {
        doNothing().when(achievementService).markAllSeen(any());
        mockMvc.perform(put("/api/achievements/me/seen"))
                .andExpect(status().isNoContent());
    }
}
