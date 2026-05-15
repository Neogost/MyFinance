package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.BugCommentRepository;
import com.myfinance.repository.BugReportRepository;
import com.myfinance.repository.BugVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BugReportService {

    // Statuts qui ferment le bug : commentaires refusés pour éviter le spam sur
    // des tickets archivés ou rejetés (cf. finding N14).
    private static final Set<BugStatus> CLOSED_STATUSES =
            EnumSet.of(BugStatus.CLOSED, BugStatus.REJECTED, BugStatus.DUPLICATE);

    // Rate-limit applicatif basé sur les comptages BDD : pas de map mémoire
    // (les commentaires sont rares — coût de 2 COUNT négligeable, et survit aux restarts).
    private static final int MAX_COMMENTS_PER_USER_PER_HOUR = 10;
    private static final int MAX_COMMENTS_PER_BUG_PER_USER_PER_HOUR = 3;

    private final BugReportRepository bugReportRepository;
    private final BugVoteRepository bugVoteRepository;
    private final BugCommentRepository bugCommentRepository;

    // ── Lecture utilisateur ────────────────────────────────────────

    public List<BugReportSummaryDto> findAll(BugStatus statusFilter, User currentUser) {
        // Un seul appel pour tous les votes de l'utilisateur courant (évite le N+1)
        Map<Long, VoteType> userVotes = bugVoteRepository.findByVoter(currentUser).stream()
                .collect(Collectors.toMap(v -> v.getBugReport().getId(), BugVote::getVoteType));

        List<BugReport> bugs = statusFilter != null
                ? bugReportRepository.findByStatusOrderByCreatedAtDesc(statusFilter)
                : bugReportRepository.findAllByOrderByCreatedAtDesc();

        return bugs.stream()
                .map(b -> BugReportSummaryDto.from(b, score(b), bugCommentRepository.countByBugReport(b),
                        userVotes.get(b.getId()),
                        b.getReporter().getId().equals(currentUser.getId())))
                .sorted(Comparator.comparingInt(BugReportSummaryDto::score).reversed())
                .toList();
    }

    public BugReportDetailDto findById(Long id, User currentUser) {
        BugReport bug = getOrThrow(id);
        VoteType userVote = bugVoteRepository.findByBugReportAndVoter(bug, currentUser)
                .map(BugVote::getVoteType)
                .orElse(null);
        List<BugCommentDto> comments = bugCommentRepository.findByBugReportOrderByCreatedAtAsc(bug)
                .stream()
                .map(c -> BugCommentDto.from(c, false))
                .toList();
        return BugReportDetailDto.from(bug, score(bug), userVote, comments);
    }

    // ── Création ───────────────────────────────────────────────────

    @Transactional
    public BugReportSummaryDto create(CreateBugReportRequest request, User reporter) {
        BugReport bug = BugReport.builder()
                .title(request.title())
                .description(request.description())
                .expectedResult(request.expectedResult())
                .reproductionSteps(request.reproductionSteps())
                .approximateDateTime(request.approximateDateTime())
                .userImpact(request.userImpact())
                .sessionId(request.sessionId())
                .browserInfo(request.browserInfo())
                .reporter(reporter)
                .build();

        bug = bugReportRepository.save(bug);

        // Vote initial UP automatique au nom du reporter (score démarre à 1)
        bugVoteRepository.save(BugVote.builder()
                .bugReport(bug)
                .voter(reporter)
                .voteType(VoteType.UP)
                .build());

        // Reporter = isReporter=true, userVote=UP (vote initial automatique)
        return BugReportSummaryDto.from(bug, 1, 0, VoteType.UP, true);
    }

    // ── Vote ───────────────────────────────────────────────────────

    @Transactional
    public VoteResultDto vote(Long id, VoteType voteType, User voter) {
        BugReport bug = getOrThrow(id);

        if (bug.getReporter().getId().equals(voter.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Impossible de voter sur son propre bug");
        }

        // Upsert : supprimer le vote existant s'il y en a un, puis insérer le nouveau
        bugVoteRepository.deleteByBugReportAndVoter(bug, voter);
        bugVoteRepository.save(BugVote.builder()
                .bugReport(bug)
                .voter(voter)
                .voteType(voteType)
                .build());

        return new VoteResultDto(score(bug), voteType);
    }

    @Transactional
    public VoteResultDto removeVote(Long id, User voter) {
        BugReport bug = getOrThrow(id);

        if (bug.getReporter().getId().equals(voter.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Impossible de modifier le vote initial sur son propre bug");
        }

        bugVoteRepository.deleteByBugReportAndVoter(bug, voter);
        return new VoteResultDto(score(bug), null);
    }

    // ── Commentaires ───────────────────────────────────────────────

    public BugCommentDto updateComment(Long bugId, Long commentId, CreateBugCommentRequest request, User currentUser) {
        getOrThrow(bugId);
        BugComment comment = bugCommentRepository.findByIdAndBugReportId(commentId, bugId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Commentaire introuvable"));

        if (!isAdmin(currentUser) && !comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Vous ne pouvez pas modifier le commentaire d'un autre utilisateur");
        }

        comment.setContent(request.content().trim());
        return BugCommentDto.from(bugCommentRepository.save(comment), isAdmin(currentUser));
    }

    public BugCommentDto addComment(Long id, CreateBugCommentRequest request, User author) {
        BugReport bug = getOrThrow(id);

        if (CLOSED_STATUSES.contains(bug.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ce bug est " + bug.getStatus() + " — les commentaires sont fermés.");
        }

        // Rate-limit applicatif : limite globale + limite par bug pour empêcher le spam.
        // Les admins en sont exemptés (ils peuvent avoir besoin de commenter rapidement).
        if (!isAdmin(author)) {
            LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
            long globalCount = bugCommentRepository.countByAuthorAndCreatedAtAfter(author, oneHourAgo);
            if (globalCount >= MAX_COMMENTS_PER_USER_PER_HOUR) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Trop de commentaires postés ces dernières minutes — réessayez plus tard.");
            }
            long perBugCount = bugCommentRepository.countByBugReportAndAuthorAndCreatedAtAfter(
                    bug, author, oneHourAgo);
            if (perBugCount >= MAX_COMMENTS_PER_BUG_PER_USER_PER_HOUR) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Trop de commentaires sur ce bug ces dernières minutes — réessayez plus tard.");
            }
        }

        BugComment comment = BugComment.builder()
                .bugReport(bug)
                .author(author)
                .content(request.content())
                .build();
        return BugCommentDto.from(bugCommentRepository.save(comment), isAdmin(author));
    }

    // ── Lecture admin ──────────────────────────────────────────────

    public List<BugReportAdminSummaryDto> findAllAdmin(BugStatus statusFilter, BugSeverity priorityFilter) {
        List<BugReport> bugs = statusFilter != null
                ? bugReportRepository.findByStatusOrderByCreatedAtDesc(statusFilter)
                : bugReportRepository.findAllByOrderByCreatedAtDesc();

        return bugs.stream()
                .filter(b -> priorityFilter == null || priorityFilter.equals(b.getPriority()))
                .map(b -> BugReportAdminSummaryDto.from(b, score(b), bugCommentRepository.countByBugReport(b)))
                .sorted(Comparator.comparingInt(BugReportAdminSummaryDto::score).reversed())
                .toList();
    }

    public BugReportAdminDetailDto findByIdAdmin(Long id) {
        BugReport bug = getOrThrow(id);
        List<BugCommentDto> comments = bugCommentRepository.findByBugReportOrderByCreatedAtAsc(bug)
                .stream()
                .map(c -> BugCommentDto.from(c, true))
                .toList();
        return BugReportAdminDetailDto.from(bug, score(bug), comments);
    }

    // ── Modification admin ─────────────────────────────────────────

    public BugReportAdminDetailDto patch(Long id, PatchBugReportRequest request) {
        if (request.status() == null && request.priority() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Au moins un champ (status ou priority) doit être fourni");
        }

        BugReport bug = getOrThrow(id);
        Optional.ofNullable(request.status()).ifPresent(bug::setStatus);
        Optional.ofNullable(request.priority()).ifPresent(bug::setPriority);

        bugReportRepository.save(bug);
        return findByIdAdmin(id);
    }

    @Transactional
    public BugReportAdminDetailDto adminUpdate(Long id, UpdateBugReportAdminRequest request) {
        BugReport bug = getOrThrow(id);
        bug.setTitle(request.title());
        bug.setDescription(request.description());
        bug.setExpectedResult(request.expectedResult());
        bug.setReproductionSteps(request.reproductionSteps());
        bug.setApproximateDateTime(request.approximateDateTime());
        bug.setUserImpact(request.userImpact());
        bugReportRepository.save(bug);
        return findByIdAdmin(id);
    }

    // ── Suppression admin ──────────────────────────────────────────

    @Transactional
    public void delete(Long id) {
        BugReport bug = getOrThrow(id);
        // Cascade applicative : supprime votes et commentaires avant le bug
        bugVoteRepository.deleteByBugReport(bug);
        bugCommentRepository.deleteByBugReport(bug);
        bugReportRepository.deleteById(id);
    }

    // ── Helpers ────────────────────────────────────────────────────

    private BugReport getOrThrow(Long id) {
        return bugReportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Bug introuvable : " + id));
    }

    private int score(BugReport bug) {
        Integer raw = bugVoteRepository.calculateScore(bug);
        return raw != null ? raw : 0;
    }

    private boolean isAdmin(User user) {
        return user.getRole() == RoleEnum.ADMIN;
    }
}
