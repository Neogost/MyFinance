package com.myfinance.service.achievement;

import com.myfinance.domain.*;
import com.myfinance.repository.*;
import com.myfinance.domain.InstrumentAllocation;
import com.myfinance.service.PatrimoineScoreService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Évalue et persiste les hauts faits pour les utilisateurs.
 * <p>Architecture hybride :
 * <ul>
 *   <li>Batch quotidien (3h) : tous les utilisateurs actifs.</li>
 *   <li>Appel direct depuis les controllers (PIONNIER, PERSONNALISTE, PROFIL_PARFAIT, VAMPIRE) pour les retours immédiats.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AchievementService {

    /** Nombre de snapshots consécutifs requis pour confirmer un badge 🟥. */
    private static final int SNAP_CONFIRMATIONS = 3;

    @Value("${scheduler.enabled:false}")
    private boolean schedulerEnabled;

    private final AchievementCatalog               catalog;
    private final UserAchievementRepository        achievementRepo;
    private final UserRepository                   userRepository;
    private final PortfolioSnapshotRepository      snapshotRepo;
    private final PositionRepository               positionRepo;
    private final InstrumentAllocationRepository   allocationRepo;
    private final PatrimoineScoreService           scoreService;
    private final MonthlyPaySlipRepository         paySlipRepo;
    private final PositionOrderRepository          orderRepo;
    private final AnalyticsEventRepository         analyticsRepo;
    private final LoanSimulationRepository         loanRepo;
    private final SalaryContractRepository         salaryRepo;
    private final OtherIncomeRepository            otherIncomeRepo;
    private final PatrimoineTargetRepository       targetRepo;
    private final LoginEventRepository             loginRepo;

    // ── Batch ─────────────────────────────────────────────────────────────────

    @Scheduled(cron = "${scheduler.achievements.cron:0 0 3 * * *}")
    public void runBatch() {
        if (!schedulerEnabled) return;
        List<User> users = userRepository.findAll();
        log.info("[Achievements] Démarrage batch — {} utilisateurs", users.size());
        int totalUnlocked = 0;
        for (User user : users) {
            try {
                totalUnlocked += evaluateAndPersist(user).size();
            } catch (Exception e) {
                log.warn("[Achievements] Erreur batch user {}: {}", user.getId(), e.getMessage());
            }
        }
        log.info("[Achievements] Batch terminé — {} niveaux débloqués", totalUnlocked);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Évalue tous les badges pour un utilisateur et persiste les nouveaux niveaux.
     * @return liste des niveaux nouvellement confirmés
     */
    @Transactional
    public List<UserAchievement> evaluateAndPersist(User user) {
        updatePatrimoineTracking(user);
        List<UserAchievement> newlyUnlocked = new ArrayList<>();
        for (AchievementDefinition def : catalog.all()) {
            int earned = evaluateSingle(user, def);
            if (earned > 0) {
                newlyUnlocked.addAll(persistNewLevels(user, def, earned));
            }
        }
        if (!newlyUnlocked.isEmpty()) {
            log.info("[Achievements] {} nouveaux niveaux pour user {}", newlyUnlocked.size(), user.getId());
        }
        return newlyUnlocked;
    }

    /**
     * Évalue les badges, persiste les nouveaux niveaux et retourne l'état complet
     * dans UNE SEULE transaction — évite SQLITE_BUSY_SNAPSHOT causé par deux
     * transactions consécutives (write puis read) sur la même requête HTTP.
     */
    @Transactional
    public List<UserAchievement> evaluateAndGetAll(User user) {
        evaluateAndPersist(user);
        return achievementRepo.findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(user);
    }

    /** Badges confirmés d'un utilisateur, du plus récent au plus ancien. */
    @Transactional(readOnly = true)
    public List<UserAchievement> getConfirmedForUser(User user) {
        return achievementRepo.findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(user);
    }

    /** Nombre de badges nouvellement débloqués depuis lastAchievementSeenAt. */
    @Transactional(readOnly = true)
    public long countUnseen(User user) {
        if (user.getLastAchievementSeenAt() == null) {
            return achievementRepo.countByUserAndConfirmedAtIsNotNull(user);
        }
        return getConfirmedForUser(user).stream()
                .filter(a -> a.getConfirmedAt() != null && a.getConfirmedAt().isAfter(user.getLastAchievementSeenAt()))
                .count();
    }

    /** Marque tous les badges comme "vus" — met à jour lastAchievementSeenAt. */
    @Transactional
    public void markAllSeen(User user) {
        user.setLastAchievementSeenAt(LocalDateTime.now());
        userRepository.save(user);
    }

    // ── Évaluation par badge ──────────────────────────────────────────────────

    private int evaluateSingle(User user, AchievementDefinition def) {
        try {
            return switch (def.code()) {
                case TO_THE_MOON         -> evalSnapshotThreshold(user, def, this::totalPatrimoine);
                case BARON_BOURSE        -> evalSnapshotThreshold(user, def, s -> categoryValue(s, AssetCategory.BOURSE));
                case CRYPTO_ADDICT       -> evalSnapshotThreshold(user, def, s -> categoryValue(s, AssetCategory.CRYPTO));
                case MAGNAT_IMMO         -> evalSnapshotThreshold(user, def, s -> categoryValue(s, AssetCategory.IMMO_PHYSIQUE));
                case PABLO_ESCOBAR       -> evalSnapshotThreshold(user, def, s -> categoryValue(s, AssetCategory.LIQUIDITE));
                case TOUCHE_A_TOUT       -> evalToucheATout(user, def);
                case GLOBE_TROTTER       -> evalGlobeTrotter(user, def);
                case SCORE_MAXIMAL       -> evalScoreMaximal(user, def);
                case PHENIX              -> evalPhenix(user, def);
                case DECOLLAGE           -> evalDecollage(user, def);
                case VOIE_RICHESSE       -> evalVoieRichesse(user, def);
                case GRAND_STRATEGE      -> evalAnalyticsCount(user, def, EventType.PAGE_VIEW, "tools.%");
                case PHOTOGRAPHE         -> evalSnapshotCount(user, def);
                case QUOTIDIEN           -> evalLoginStreak(user, def);
                case COMPTABLE_METICULEUX -> evalPayslipStreak(user, def);
                case DCA_MASTER          -> evalDcaMaster(user, def);
                case ARCHITECTE          -> evalLoanSimulations(user, def);
                case HABITUE             -> evalAnciennete(user, def);
                case SURVIVALISTE        -> evalAnalyticsCount(user, def, EventType.PAGE_VIEW, "tools.crisis%");
                case PIONNIER            -> evalPionnier(user, def);
                case PERSONNALISTE       -> evalPersonnaliste(user, def);
                case PROFIL_PARFAIT      -> evalProfilParfait(user, def);
                case FUNAMBULE           -> evalAnalyticsCount(user, def, EventType.PAGE_VIEW, "tools.lombard%");
                case THE_ANSWER          -> evalTheAnswer(user, def);
                case VAMPIRE             -> evalVampire(user, def);
            };
        } catch (Exception e) {
            log.debug("[Achievements] Évaluation {} échouée pour user {}: {}", def.code(), user.getId(), e.getMessage());
            return 0;
        }
    }

    // ── Évaluateurs 🟥 — validation différée sur 3 snapshots ─────────────────

    private int evalSnapshotThreshold(User user, AchievementDefinition def,
                                      java.util.function.Function<PortfolioSnapshot, BigDecimal> extractor) {
        List<PortfolioSnapshot> last3 = snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user);
        if (last3.size() < SNAP_CONFIRMATIONS) return 0;

        int confirmedLevel = 0;
        for (AchievementLevel lvl : def.levels()) {
            if (lvl.threshold() == null) continue;
            long qualifying = last3.stream()
                    .filter(s -> { BigDecimal v = extractor.apply(s); return v != null && v.compareTo(lvl.threshold()) >= 0; })
                    .count();
            if (qualifying >= SNAP_CONFIRMATIONS) confirmedLevel = lvl.level();
            else break;
        }
        return confirmedLevel;
    }

    private BigDecimal totalPatrimoine(PortfolioSnapshot snap) {
        return snap.getTotalCurrentValueEur() != null ? snap.getTotalCurrentValueEur() : BigDecimal.ZERO;
    }

    private BigDecimal categoryValue(PortfolioSnapshot snap, AssetCategory category) {
        return snap.getPositionSnapshots().stream()
                .filter(ps -> ps.getPosition() != null && category == ps.getPosition().getCategory())
                .map(PositionSnapshot::getCurrentValueEur)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ── Évaluateurs 🟧 — snapshot avec règles ────────────────────────────────

    private int evalToucheATout(User user, AchievementDefinition def) {
        // V1 : comptage simple des catégories avec au moins une position ACTIVE
        long cats = positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE)
                .stream().map(Position::getCategory).distinct().count();
        return levelForValue(def, BigDecimal.valueOf(cats));
    }

    private int evalGlobeTrotter(User user, AchievementDefinition def) {
        List<Position> active = positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE);
        List<Instrument> instruments = active.stream()
                .map(Position::getInstrument)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (instruments.isEmpty()) return 0;
        Set<String> countries = allocationRepo.findByInstrumentInOrderByPercentageDesc(instruments)
                .stream()
                .map(InstrumentAllocation::getCountry)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return levelForValue(def, BigDecimal.valueOf(countries.size()));
    }

    private int evalScoreMaximal(User user, AchievementDefinition def) {
        int score = scoreService.computeScore(user).totalScore();
        return levelForValue(def, BigDecimal.valueOf(score));
    }

    private int evalPhenix(User user, AchievementDefinition def) {
        if (user.getAllTimeHighEur() == null) return 0;
        List<PortfolioSnapshot> snaps = snapshotRepo.findByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;

        BigDecimal ath = user.getAllTimeHighEur();
        BigDecimal drawdownThreshold = ath.multiply(new BigDecimal("0.80")); // -20 %
        BigDecimal current = snaps.get(0).getTotalCurrentValueEur();
        if (current == null || current.compareTo(ath.multiply(new BigDecimal("0.95"))) < 0) return 0;

        // Vérifier qu'il y a eu un drawdown significatif dans l'historique
        boolean hadDrawdown = snaps.stream()
                .filter(s -> s.getTotalCurrentValueEur() != null)
                .anyMatch(s -> s.getTotalCurrentValueEur().compareTo(drawdownThreshold) < 0);
        return hadDrawdown ? 1 : 0;
    }

    private int evalDecollage(User user, AchievementDefinition def) {
        if (user.getInitialNetWorthEur() == null || user.getInitialNetWorthEur().compareTo(BigDecimal.ZERO) <= 0) return 0;
        List<PortfolioSnapshot> snaps = snapshotRepo.findByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        BigDecimal current = snaps.get(0).getTotalCurrentValueEur();
        if (current == null) return 0;
        BigDecimal multiplier = current.divide(user.getInitialNetWorthEur(), 2, java.math.RoundingMode.HALF_UP);
        return levelForValue(def, multiplier);
    }

    // ── Évaluateurs 🟨 — compteurs événementiels ─────────────────────────────

    private int evalVoieRichesse(User user, AchievementDefinition def) {
        double monthly = 0.0;
        Optional<SalaryContract> contract = salaryRepo.findByUserAndEndDateIsNull(user);
        double base = 0.0;
        if (contract.isPresent() && contract.get().getAnnualGrossSalary() != null) {
            // Approximation net : brut annuel × 0,72 / 12
            base += contract.get().getAnnualGrossSalary().doubleValue() * 0.72 / 12;
        }
        double otherTotal = otherIncomeRepo.findByUserOrderByDateDesc(user).stream()
                .filter(i -> i.getAmount() != null)
                .mapToDouble(i -> i.getAmount())
                .sum();
        return levelForValue(def, BigDecimal.valueOf(base + otherTotal));
    }

    private int evalAnalyticsCount(User user, AchievementDefinition def, EventType type, String pattern) {
        long count = analyticsRepo.countByUserAndEventTypeAndEventNameLike(user, type, pattern);
        return levelForValue(def, BigDecimal.valueOf(count));
    }

    private int evalSnapshotCount(User user, AchievementDefinition def) {
        return levelForValue(def, BigDecimal.valueOf(snapshotRepo.countByUser(user)));
    }

    private int evalLoginStreak(User user, AchievementDefinition def) {
        List<LoginEvent> logins = loginRepo.findSuccessfulByLoginOrderByTimestampDesc(user.getLogin());
        Set<LocalDate> dates = logins.stream()
                .map(e -> e.getTimestamp().toLocalDate())
                .collect(Collectors.toCollection(TreeSet::new));

        int streak = 0;
        LocalDate check = LocalDate.now();
        while (dates.contains(check)) {
            streak++;
            check = check.minusDays(1);
        }
        return levelForValue(def, BigDecimal.valueOf(streak));
    }

    private int evalPayslipStreak(User user, AchievementDefinition def) {
        List<MonthlyPaySlip> slips = paySlipRepo.findByContractUserOrderByPeriodAsc(user);
        Set<YearMonth> months = slips.stream()
                .map(s -> YearMonth.from(s.getPeriod()))
                .collect(Collectors.toSet());
        return levelForValue(def, BigDecimal.valueOf(longestConsecutiveMonths(months)));
    }

    private int evalDcaMaster(User user, AchievementDefinition def) {
        List<LocalDate> buyDates = orderRepo.findBuyDatesForBourseOrCrypto(user);
        Set<YearMonth> months = buyDates.stream()
                .map(YearMonth::from)
                .collect(Collectors.toSet());
        return levelForValue(def, BigDecimal.valueOf(longestConsecutiveMonths(months)));
    }

    private int evalLoanSimulations(User user, AchievementDefinition def) {
        return levelForValue(def, BigDecimal.valueOf(loanRepo.countByUser(user)));
    }

    private int evalAnciennete(User user, AchievementDefinition def) {
        // Utilise la première connexion enregistrée comme date de création du compte
        List<LoginEvent> logins = loginRepo.findSuccessfulByLoginOrderByTimestampDesc(user.getLogin());
        if (logins.isEmpty()) return 0;
        LocalDateTime oldest = logins.get(logins.size() - 1).getTimestamp();
        long years = ChronoUnit.YEARS.between(oldest, LocalDateTime.now());
        return levelForValue(def, BigDecimal.valueOf(years));
    }

    // ── Évaluateurs 🟩 — déclenchement immédiat ──────────────────────────────

    private int evalPionnier(User user, AchievementDefinition def) {
        long positions = positionRepo.findByUserOrderByCreatedAtDesc(user).size();
        return positions > 0 ? 1 : 0;
    }

    private int evalPersonnaliste(User user, AchievementDefinition def) {
        return targetRepo.existsByUser(user) ? 1 : 0;
    }

    private int evalProfilParfait(User user, AchievementDefinition def) {
        boolean complete = user.getFirstName()       != null && !user.getFirstName().isBlank()
                        && user.getLastName()        != null && !user.getLastName().isBlank()
                        && user.getBirthDate()       != null
                        && user.getFiscalParts()     != null
                        && user.getSafetyNetMode()   != null;
        return complete ? 1 : 0;
    }

    private int evalTheAnswer(User user, AchievementDefinition def) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        BigDecimal v = snaps.get(0).getTotalCurrentValueEur();
        if (v == null) return 0;
        BigDecimal diff = v.subtract(new BigDecimal("42000")).abs();
        return diff.compareTo(new BigDecimal("100")) <= 0 ? 1 : 0;
    }

    private int evalVampire(User user, AchievementDefinition def) {
        long events = analyticsRepo.countByUserAndEventTypeAndEventNameLike(
                user, EventType.BUTTON_CLICK, "%dark_mode%");
        return events > 0 ? 1 : 0;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Retourne le plus haut niveau dont le seuil est atteint ou dépassé. */
    private int levelForValue(AchievementDefinition def, BigDecimal value) {
        int level = 0;
        for (AchievementLevel lvl : def.levels()) {
            if (lvl.threshold() == null) { level = lvl.level(); break; } // unique
            if (value.compareTo(lvl.threshold()) >= 0) level = lvl.level();
            else break;
        }
        return level;
    }

    /** Longueur de la séquence de mois consécutifs la plus longue dans un set. */
    private int longestConsecutiveMonths(Set<YearMonth> months) {
        if (months.isEmpty()) return 0;
        YearMonth latest = months.stream().max(Comparator.naturalOrder()).get();
        int streak = 0;
        YearMonth check = latest;
        while (months.contains(check)) {
            streak++;
            check = check.minusMonths(1);
        }
        return streak;
    }

    /** Persiste les niveaux entre (currentMax+1) et earnedLevel inclus. */
    private List<UserAchievement> persistNewLevels(User user, AchievementDefinition def, int earnedLevel) {
        int currentMax = achievementRepo.findMaxConfirmedLevel(user, def.code()).orElse(0);
        List<UserAchievement> created = new ArrayList<>();
        for (int lvl = currentMax + 1; lvl <= earnedLevel; lvl++) {
            if (achievementRepo.existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(user, def.code(), lvl)) continue;
            UserAchievement ua = UserAchievement.builder()
                    .user(user).achievementCode(def.code()).level(lvl)
                    .confirmedAt(LocalDateTime.now()).build();
            achievementRepo.save(ua);
            created.add(ua);
            log.info("[Achievement] {} niveau {} débloqué pour user={}", def.code(), lvl, user.getId());
        }
        return created;
    }

    /** Met à jour l'ATH et le patrimoine initial si pas encore renseigné. */
    private void updatePatrimoineTracking(User user) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return;
        BigDecimal current = snaps.get(0).getTotalCurrentValueEur();
        if (current == null) return;

        boolean changed = false;
        if (user.getAllTimeHighEur() == null || current.compareTo(user.getAllTimeHighEur()) > 0) {
            user.setAllTimeHighEur(current);
            changed = true;
        }
        if (user.getInitialNetWorthEur() == null) {
            // Premier patrimoine connu = dernier snapshot dans la liste (le plus ancien car DESC)
            BigDecimal initial = snaps.get(snaps.size() - 1).getTotalCurrentValueEur();
            if (initial != null) { user.setInitialNetWorthEur(initial); changed = true; }
        }
        if (changed) userRepository.save(user);
    }
}
