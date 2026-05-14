package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.LogExcerptDto;
import com.myfinance.repository.BugReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LogExcerptServiceTest {

    @TempDir Path tempDir;
    @Mock BugReportRepository bugReportRepository;
    @InjectMocks LogExcerptService logExcerptService;

    static final LocalDateTime REF = LocalDateTime.of(2026, 5, 14, 11, 35, 42);
    // Fenêtre ±1 min : [11:34:42 .. 11:36:42]

    User reporter;
    BugReport bug;

    @BeforeEach
    void setUp() {
        reporter = User.builder().id(1L).login("alice").firstName("Alice").role(RoleEnum.USER).build();
        bug = BugReport.builder()
                .id(1L).title("Bug test").description("Desc.")
                .userImpact(BugSeverity.HIGH).status(BugStatus.OPEN)
                .reporter(reporter).approximateDateTime(REF)
                .createdAt(REF.plusMinutes(10)).updatedAt(REF.plusMinutes(10))
                .build();
    }

    // ── logsDirectory vide ─────────────────────────────────────────

    @Test
    void extract_logsDirectoryVide_retourneNonDisponible() {
        ReflectionTestUtils.setField(logExcerptService, "logsDirectory", "");
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));

        LogExcerptDto result = logExcerptService.extract(1L, 1);

        assertThat(result.available()).isFalse();
        assertThat(result.lines()).isEmpty();
    }

    // ── fichier introuvable ────────────────────────────────────────

    @Test
    void extract_fichierIntrouvable_retourneNonDisponible() throws IOException {
        ReflectionTestUtils.setField(logExcerptService, "logsDirectory", tempDir.toString());
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));
        // Aucun fichier créé dans tempDir

        LogExcerptDto result = logExcerptService.extract(1L, 1);

        assertThat(result.available()).isFalse();
    }

    // ── filtrage des lignes dans la fenêtre ────────────────────────

    @Test
    void extract_retourneLignesDansLaFenetre() throws IOException {
        ReflectionTestUtils.setField(logExcerptService, "logsDirectory", tempDir.toString());
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));

        writeLogFile("myfinance.2026-05-14.log", List.of(
                "2026-05-14 11:33:00 INFO  com.myfinance.Foo           : avant fenêtre",
                "2026-05-14 11:34:42 INFO  com.myfinance.Bar           : début fenêtre",
                "2026-05-14 11:35:00 INFO  com.myfinance.Baz           : dans fenêtre",
                "2026-05-14 11:36:42 INFO  com.myfinance.Qux           : fin fenêtre",
                "2026-05-14 11:37:00 INFO  com.myfinance.Out           : après fenêtre"
        ));

        LogExcerptDto result = logExcerptService.extract(1L, 1);

        assertThat(result.available()).isTrue();
        assertThat(result.lineCount()).isEqualTo(3);
        assertThat(result.lines()).containsExactly(
                "2026-05-14 11:34:42 INFO  com.myfinance.Bar           : début fenêtre",
                "2026-05-14 11:35:00 INFO  com.myfinance.Baz           : dans fenêtre",
                "2026-05-14 11:36:42 INFO  com.myfinance.Qux           : fin fenêtre"
        );
    }

    // ── lignes de continuation (stack trace) ───────────────────────

    @Test
    void extract_inclutLignesContinuationSiParenteDansLaFenetre() throws IOException {
        ReflectionTestUtils.setField(logExcerptService, "logsDirectory", tempDir.toString());
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));

        writeLogFile("myfinance.2026-05-14.log", List.of(
                "2026-05-14 11:35:00 ERROR com.myfinance.Service        : Erreur",
                "    at com.myfinance.Service.method(Service.java:42)",  // continuation dans fenêtre
                "    at com.myfinance.Other.call(Other.java:10)",
                "2026-05-14 11:37:00 INFO  com.myfinance.Foo            : hors fenêtre",
                "    at com.myfinance.Foo.run(Foo.java:5)"               // continuation hors fenêtre
        ));

        LogExcerptDto result = logExcerptService.extract(1L, 1);

        assertThat(result.lines()).hasSize(3);
        assertThat(result.lines().get(1)).startsWith("    at com.myfinance.Service");
        assertThat(result.lines().get(2)).startsWith("    at com.myfinance.Other");
    }

    // ── fallback sur createdAt si approximateDateTime est null ─────

    @Test
    void extract_utiliseCreatedAt_siApproximateDateTimeNul() throws IOException {
        ReflectionTestUtils.setField(logExcerptService, "logsDirectory", tempDir.toString());
        BugReport bugSansDate = BugReport.builder()
                .id(2L).title("Bug sans date").description("Desc.")
                .userImpact(BugSeverity.LOW).status(BugStatus.OPEN)
                .reporter(reporter).approximateDateTime(null)
                .createdAt(REF.plusMinutes(10)).updatedAt(REF.plusMinutes(10))
                .build();
        when(bugReportRepository.findById(2L)).thenReturn(Optional.of(bugSansDate));

        // Référence = createdAt = 11:45:42 → fenêtre [11:44:42..11:46:42]
        writeLogFile("myfinance.2026-05-14.log", List.of(
                "2026-05-14 11:35:00 INFO  com.myfinance.Foo : hors fenêtre",
                "2026-05-14 11:45:00 INFO  com.myfinance.Bar : dans fenêtre (createdAt)"
        ));

        LogExcerptDto result = logExcerptService.extract(2L, 1);

        assertThat(result.available()).isTrue();
        assertThat(result.lines()).hasSize(1);
        assertThat(result.lines().get(0)).contains("dans fenêtre");
    }

    // ── 404 si bug introuvable ─────────────────────────────────────

    @Test
    void extract_leve404_siBugIntrouvable() {
        ReflectionTestUtils.setField(logExcerptService, "logsDirectory", tempDir.toString());
        when(bugReportRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> logExcerptService.extract(99L, 1))
                .hasFieldOrPropertyWithValue("statusCode",
                        org.springframework.http.HttpStatus.NOT_FOUND);
    }

    // ── helpers ────────────────────────────────────────────────────

    private void writeLogFile(String filename, List<String> lines) throws IOException {
        Files.writeString(tempDir.resolve(filename), String.join("\n", lines) + "\n");
    }
}
