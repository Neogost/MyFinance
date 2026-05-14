package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.service.BugReportService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BugReportController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class BugReportControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean BugReportService bugReportService;

    BugReportSummaryDto summary;
    BugReportDetailDto detail;

    @BeforeEach
    void setUp() {
        summary = new BugReportSummaryDto(1L, "Graphique vide", BugStatus.OPEN,
                BugSeverity.HIGH, null, 1, 0, LocalDateTime.now(), "Alice", VoteType.UP, true);

        detail = new BugReportDetailDto(1L, "Graphique vide", "Description.",
                null, null, null, BugSeverity.HIGH, null, BugStatus.OPEN,
                1, VoteType.UP, 0, LocalDateTime.now(), "Alice", List.of());
    }

    // ── GET /api/bug-reports ───────────────────────────────────────

    @Test
    @WithMockCustomUser
    void findAll_retourne200() throws Exception {
        when(bugReportService.findAll(any(), any())).thenReturn(List.of(summary));

        mockMvc.perform(get("/api/bug-reports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Graphique vide"))
                .andExpect(jsonPath("$[0].score").value(1));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/bug-reports")).andExpect(status().isUnauthorized());
    }

    // ── GET /api/bug-reports/{id} ──────────────────────────────────

    @Test
    @WithMockCustomUser
    void findById_retourne200() throws Exception {
        when(bugReportService.findById(eq(1L), any())).thenReturn(detail);

        mockMvc.perform(get("/api/bug-reports/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userVote").value("UP"))
                .andExpect(jsonPath("$.comments").isArray());
    }

    @Test
    @WithMockCustomUser
    void findById_retourne404_siBugIntrouvable() throws Exception {
        when(bugReportService.findById(eq(99L), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(get("/api/bug-reports/99")).andExpect(status().isNotFound());
    }

    // ── POST /api/bug-reports ──────────────────────────────────────

    @Test
    @WithMockCustomUser
    void create_retourne201() throws Exception {
        CreateBugReportRequest req = new CreateBugReportRequest(
                "Graphique vide", "Description.", null, null, null, BugSeverity.HIGH, "sess-123");

        when(bugReportService.create(any(), any())).thenReturn(summary);

        mockMvc.perform(post("/api/bug-reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.score").value(1));
    }

    @ParameterizedTest(name = "create_leve400 — {0}")
    @MethodSource("requêtesInvalides")
    @WithMockCustomUser
    void create_leve400_siRequêteInvalide(String desc, CreateBugReportRequest req) throws Exception {
        mockMvc.perform(post("/api/bug-reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    static Stream<Arguments> requêtesInvalides() {
        return Stream.of(
                Arguments.of("titre vide",
                        new CreateBugReportRequest("", "Desc.", null, null, null, BugSeverity.HIGH, null)),
                Arguments.of("description vide",
                        new CreateBugReportRequest("Titre", "", null, null, null, BugSeverity.HIGH, null)),
                Arguments.of("impact null",
                        new CreateBugReportRequest("Titre", "Desc.", null, null, null, null, null))
        );
    }

    // ── PUT /api/bug-reports/{id}/vote ─────────────────────────────

    @Test
    @WithMockCustomUser
    void vote_retourne200() throws Exception {
        when(bugReportService.vote(eq(1L), eq(VoteType.UP), any()))
                .thenReturn(new VoteResultDto(2, VoteType.UP));

        mockMvc.perform(put("/api/bug-reports/1/vote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VoteRequest(VoteType.UP))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(2))
                .andExpect(jsonPath("$.userVote").value("UP"));
    }

    @Test
    @WithMockCustomUser
    void vote_retourne403_siVotePropeBug() throws Exception {
        when(bugReportService.vote(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(put("/api/bug-reports/1/vote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VoteRequest(VoteType.DOWN))))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /api/bug-reports/{id}/vote ─────────────────────────

    @Test
    @WithMockCustomUser
    void removeVote_retourne200() throws Exception {
        when(bugReportService.removeVote(eq(1L), any()))
                .thenReturn(new VoteResultDto(0, null));

        mockMvc.perform(delete("/api/bug-reports/1/vote"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userVote").isEmpty());
    }

    // ── POST /api/bug-reports/{id}/comments ───────────────────────

    @Test
    @WithMockCustomUser
    void addComment_retourne201() throws Exception {
        BugCommentDto comment = new BugCommentDto(5L, "Alice", "Je confirme.", LocalDateTime.now());
        when(bugReportService.addComment(eq(1L), any(), any())).thenReturn(comment);

        mockMvc.perform(post("/api/bug-reports/1/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateBugCommentRequest("Je confirme."))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorDisplay").value("Alice"));
    }

    @Test
    @WithMockCustomUser
    void addComment_leve400_siContenuVide() throws Exception {
        mockMvc.perform(post("/api/bug-reports/1/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateBugCommentRequest(""))))
                .andExpect(status().isBadRequest());
    }
}
