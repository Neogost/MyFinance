package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.LoginEventType;
import com.myfinance.dto.LoginEventDto;
import com.myfinance.service.LoginHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminLoginHistoryController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class AdminLoginHistoryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean LoginHistoryService loginHistoryService;

    Page<LoginEventDto> page;

    @BeforeEach
    void setUp() {
        List<LoginEventDto> events = List.of(
                new LoginEventDto(1L, "kevin", LoginEventType.SUCCESS, "127.0.0.1", "Mozilla/5.0", null, LocalDateTime.now()),
                new LoginEventDto(2L, "kevin", LoginEventType.FAILURE, "127.0.0.1", "Mozilla/5.0", 2, LocalDateTime.now())
        );
        page = new PageImpl<>(events, PageRequest.of(0, 50), 2);
    }

    // ── GET /api/admin/login-history ───────────────────────────

    @Test
    @WithMockUser(roles = "ADMIN")
    void getHistory_asAdmin_retourne200() throws Exception {
        when(loginHistoryService.getHistory(any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(page);

        mockMvc.perform(get("/api/admin/login-history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].login").value("kevin"))
                .andExpect(jsonPath("$.content[0].eventType").value("SUCCESS"))
                .andExpect(jsonPath("$.page.totalElements").value(2));
    }

    @Test
    void getHistory_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/admin/login-history"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void getHistory_avecRoleUser_retourne403() throws Exception {
        mockMvc.perform(get("/api/admin/login-history"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getHistory_avecFiltres_retourne200() throws Exception {
        when(loginHistoryService.getHistory(eq("kevin"), eq(LoginEventType.FAILURE), any(), any(), anyInt(), anyInt()))
                .thenReturn(page);

        mockMvc.perform(get("/api/admin/login-history")
                        .param("login", "kevin")
                        .param("type", "FAILURE"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getHistory_avecPagination_retourne200() throws Exception {
        when(loginHistoryService.getHistory(any(), any(), any(), any(), eq(1), eq(20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(1, 20), 0));

        mockMvc.perform(get("/api/admin/login-history")
                        .param("page", "1")
                        .param("size", "20"))
                .andExpect(status().isOk());
    }
}
