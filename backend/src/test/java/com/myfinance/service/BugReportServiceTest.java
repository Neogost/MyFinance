package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.BugCommentRepository;
import com.myfinance.repository.BugReportRepository;
import com.myfinance.repository.BugVoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class BugReportServiceTest {

    @Mock BugReportRepository bugReportRepository;
    @Mock BugVoteRepository bugVoteRepository;
    @Mock BugCommentRepository bugCommentRepository;
    @InjectMocks BugReportService bugReportService;

    User reporter;
    User otherUser;
    User admin;
    BugReport bug;

    @BeforeEach
    void setUp() {
        reporter  = User.builder().id(1L).login("alice").firstName("Alice").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("bob").firstName("Bob").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").firstName("Admin").role(RoleEnum.ADMIN).build();

        bug = BugReport.builder()
                .id(1L).title("Graphique vide").description("Le graphique ne charge pas.")
                .userImpact(BugSeverity.HIGH).status(BugStatus.OPEN)
                .reporter(reporter).build();

        // Défaut : aucun vote pour l'utilisateur courant dans findAll (surchargeable par test)
        lenient().when(bugVoteRepository.findByVoter(any())).thenReturn(List.of());
    }

    // ── findAll ────────────────────────────────────────────────────

    @Test
    void findAll_sansFiltre_retourneTousLesBugs() {
        when(bugReportRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(bug));
        when(bugVoteRepository.calculateScore(bug)).thenReturn(1);
        when(bugCommentRepository.countByBugReport(bug)).thenReturn(0);
        // Reporter consulte la liste : isReporter=true, vote=null (défaut stub)
        List<BugReportSummaryDto> result = bugReportService.findAll(null, reporter);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).title()).isEqualTo("Graphique vide");
        assertThat(result.get(0).score()).isEqualTo(1);
        assertThat(result.get(0).isReporter()).isTrue();
        assertThat(result.get(0).userVote()).isNull();
    }

    @Test
    void findAll_retourneUserVote_siUtilisateurAVote() {
        BugVote vote = BugVote.builder().bugReport(bug).voter(otherUser).voteType(VoteType.UP).build();
        when(bugReportRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(bug));
        when(bugVoteRepository.calculateScore(bug)).thenReturn(2);
        when(bugCommentRepository.countByBugReport(bug)).thenReturn(0);
        when(bugVoteRepository.findByVoter(otherUser)).thenReturn(List.of(vote));

        List<BugReportSummaryDto> result = bugReportService.findAll(null, otherUser);

        assertThat(result.get(0).userVote()).isEqualTo(VoteType.UP);
        assertThat(result.get(0).isReporter()).isFalse();
    }

    @Test
    void findAll_avecFiltreStatut_utiliseLeRepo() {
        when(bugReportRepository.findByStatusOrderByCreatedAtDesc(BugStatus.OPEN)).thenReturn(List.of(bug));
        when(bugVoteRepository.calculateScore(bug)).thenReturn(1);
        when(bugCommentRepository.countByBugReport(bug)).thenReturn(0);

        List<BugReportSummaryDto> result = bugReportService.findAll(BugStatus.OPEN, reporter);

        assertThat(result).hasSize(1);
        verify(bugReportRepository).findByStatusOrderByCreatedAtDesc(BugStatus.OPEN);
        verify(bugReportRepository, never()).findAllByOrderByCreatedAtDesc();
    }

    @Test
    void findAll_triParScoreDecroissant() {
        BugReport bug2 = BugReport.builder().id(2L).title("Autre bug").description("Desc.")
                .userImpact(BugSeverity.LOW).status(BugStatus.OPEN).reporter(reporter).build();

        when(bugReportRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(bug, bug2));
        when(bugVoteRepository.calculateScore(bug)).thenReturn(1);
        when(bugVoteRepository.calculateScore(bug2)).thenReturn(5);
        when(bugCommentRepository.countByBugReport(any())).thenReturn(0);

        List<BugReportSummaryDto> result = bugReportService.findAll(null, reporter);

        assertThat(result).extracting(BugReportSummaryDto::score)
                .containsExactly(5, 1); // score 5 en premier
    }

    // ── findById ───────────────────────────────────────────────────

    @Test
    void findById_retourneLeDetailAvecVoteUtilisateur() {
        BugVote vote = BugVote.builder().voteType(VoteType.UP).build();
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));
        when(bugVoteRepository.findByBugReportAndVoter(bug, otherUser)).thenReturn(Optional.of(vote));
        when(bugVoteRepository.calculateScore(bug)).thenReturn(2);
        when(bugCommentRepository.findByBugReportOrderByCreatedAtAsc(bug)).thenReturn(List.of());

        BugReportDetailDto result = bugReportService.findById(1L, otherUser);

        assertThat(result.userVote()).isEqualTo(VoteType.UP);
        assertThat(result.score()).isEqualTo(2);
    }

    @Test
    void findById_leve404_siBugIntrouvable() {
        when(bugReportRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bugReportService.findById(99L, reporter))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── create ─────────────────────────────────────────────────────

    @Test
    void create_sauvegardeBugEtVoteInitial() {
        CreateBugReportRequest request = new CreateBugReportRequest(
                "Graphique vide", "Le graphique ne charge pas.",
                null, null, null, BugSeverity.HIGH, "session-abc", null);

        when(bugReportRepository.save(any())).thenAnswer(inv -> {
            BugReport b = inv.getArgument(0);
            return BugReport.builder().id(10L).title(b.getTitle()).description(b.getDescription())
                    .userImpact(b.getUserImpact()).status(BugStatus.OPEN).reporter(reporter).build();
        });
        when(bugVoteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BugReportSummaryDto result = bugReportService.create(request, reporter);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.score()).isEqualTo(1); // vote initial
        verify(bugVoteRepository).save(argThat(v -> v.getVoteType() == VoteType.UP));
    }

    // ── vote ───────────────────────────────────────────────────────

    @Test
    void vote_leve403_siReporterVoteSurSonPropeBug() {
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));

        assertThatThrownBy(() -> bugReportService.vote(1L, VoteType.DOWN, reporter))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(bugVoteRepository, never()).save(any());
    }

    @Test
    void vote_upsertLeVote() {
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));
        when(bugVoteRepository.calculateScore(bug)).thenReturn(0);
        when(bugVoteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        VoteResultDto result = bugReportService.vote(1L, VoteType.DOWN, otherUser);

        verify(bugVoteRepository).deleteByBugReportAndVoter(bug, otherUser);
        verify(bugVoteRepository).save(argThat(v -> v.getVoteType() == VoteType.DOWN));
        assertThat(result.userVote()).isEqualTo(VoteType.DOWN);
    }

    @Test
    void removeVote_leve403_siReporter() {
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));

        assertThatThrownBy(() -> bugReportService.removeVote(1L, reporter))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void removeVote_supprimeLeVote() {
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));
        when(bugVoteRepository.calculateScore(bug)).thenReturn(1);

        VoteResultDto result = bugReportService.removeVote(1L, otherUser);

        verify(bugVoteRepository).deleteByBugReportAndVoter(bug, otherUser);
        assertThat(result.userVote()).isNull();
    }

    // ── addComment ─────────────────────────────────────────────────

    @Test
    void addComment_affichePrenomPourUser() {
        BugComment saved = BugComment.builder().id(5L).bugReport(bug)
                .author(otherUser).content("Je confirme.").build();

        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));
        when(bugCommentRepository.save(any())).thenReturn(saved);

        BugCommentDto result = bugReportService.addComment(
                1L, new CreateBugCommentRequest("Je confirme."), otherUser);

        assertThat(result.authorDisplay()).isEqualTo("Bob");
    }

    @Test
    void addComment_afficheLLoginPourAdmin() {
        BugComment saved = BugComment.builder().id(6L).bugReport(bug)
                .author(admin).content("Corrigé en v1.9.").build();

        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));
        when(bugCommentRepository.save(any())).thenReturn(saved);

        BugCommentDto result = bugReportService.addComment(
                1L, new CreateBugCommentRequest("Corrigé en v1.9."), admin);

        assertThat(result.authorDisplay()).contains("admin").contains("ADMIN");
    }

    // ── patch admin ────────────────────────────────────────────────

    @Test
    void patch_leve400_siAucunChamp() {
        assertThatThrownBy(() -> bugReportService.patch(1L, new PatchBugReportRequest(null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void patch_modifieStatutEtPriorite() {
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));
        when(bugReportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bugVoteRepository.calculateScore(bug)).thenReturn(1);
        when(bugCommentRepository.findByBugReportOrderByCreatedAtAsc(bug)).thenReturn(List.of());

        BugReportAdminDetailDto result = bugReportService.patch(1L,
                new PatchBugReportRequest(BugStatus.IN_PROGRESS, BugSeverity.HIGH));

        assertThat(result.status()).isEqualTo(BugStatus.IN_PROGRESS);
        assertThat(result.priority()).isEqualTo(BugSeverity.HIGH);
    }

    // ── adminUpdate ────────────────────────────────────────────────

    @Test
    void adminUpdate_modifieLeContenu() {
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));
        when(bugReportRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bugVoteRepository.calculateScore(bug)).thenReturn(1);
        when(bugCommentRepository.findByBugReportOrderByCreatedAtAsc(bug)).thenReturn(List.of());

        var request = new UpdateBugReportAdminRequest(
                "Nouveau titre", "Nouvelle description.", null, null, null, BugSeverity.MEDIUM);

        BugReportAdminDetailDto result = bugReportService.adminUpdate(1L, request);

        assertThat(result.title()).isEqualTo("Nouveau titre");
        assertThat(result.userImpact()).isEqualTo(BugSeverity.MEDIUM);
        verify(bugReportRepository).save(argThat(b ->
                b.getTitle().equals("Nouveau titre") && b.getUserImpact() == BugSeverity.MEDIUM));
    }

    @Test
    void adminUpdate_leve404_siBugIntrouvable() {
        when(bugReportRepository.findById(99L)).thenReturn(Optional.empty());

        var request = new UpdateBugReportAdminRequest(
                "Titre", "Description.", null, null, null, BugSeverity.LOW);

        assertThatThrownBy(() -> bugReportService.adminUpdate(99L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── delete ─────────────────────────────────────────────────────

    @Test
    void delete_supprimeLeBugEtCascadeApplicative() {
        when(bugReportRepository.findById(1L)).thenReturn(Optional.of(bug));

        bugReportService.delete(1L);

        verify(bugVoteRepository).deleteByBugReport(bug);
        verify(bugCommentRepository).deleteByBugReport(bug);
        verify(bugReportRepository).deleteById(1L);
    }

    @Test
    void delete_leve404_siBugIntrouvable() {
        when(bugReportRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bugReportService.delete(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(bugReportRepository, never()).deleteById(any());
    }
}
