package com.myfinance.service.achievement;

import com.myfinance.config.PatrimoineReferentiel;
import com.myfinance.domain.*;
import com.myfinance.repository.*;
import com.myfinance.domain.InstrumentAllocation;
import com.myfinance.domain.InstrumentSectorAllocation;
import com.myfinance.service.DebtService;
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

    private final AchievementCatalog                    catalog;
    private final UserAchievementRepository             achievementRepo;
    private final UserRepository                        userRepository;
    private final PortfolioSnapshotRepository           snapshotRepo;
    private final PositionRepository                    positionRepo;
    private final InstrumentAllocationRepository        allocationRepo;
    private final InstrumentSectorAllocationRepository  sectorAllocationRepo;
    private final PatrimoineScoreService                scoreService;
    private final MonthlyPaySlipRepository              paySlipRepo;
    private final PositionOrderRepository               orderRepo;
    private final AnalyticsEventRepository              analyticsRepo;
    private final LoanSimulationRepository              loanRepo;
    private final SalaryContractRepository              salaryRepo;
    private final OtherIncomeRepository                 otherIncomeRepo;
    private final PatrimoineTargetRepository            targetRepo;
    private final LoginEventRepository                  loginRepo;
    private final RecurringExpenseRepository            expenseRepo;
    private final DebtRepository                        debtRepo;
    private final DebtService                           debtService;
    private final PatrimoineReferentiel                  referentiel;

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
                // ── V2 Trivial ────────────────────────────────────────────────
                case THE_FIRST_MILLION   -> evalSnapshotThreshold(user, def, this::totalPatrimoine);
                case PIERRE_PAPIER       -> evalSnapshotThreshold(user, def, s -> categoryValue(s, AssetCategory.IMMO_PAPIER));
                case LA_FOURMI           -> evalSnapshotThreshold(user, def, s -> categoryValue(s, AssetCategory.LIVRET));
                case PAS_TOUS_MEME_PANIER -> evalPasTousMemeParier(user, def);
                case LE_COSMOPOLITE      -> evalCosmopolite(user, def);
                case LE_PREVOYANT        -> evalEnveloppePresence(user, def, FiscalEnvelope.PER);
                case LE_ROYAL_FLUSH      -> evalRoyalFlush(user, def);
                case MULTI_SOURCES       -> evalMultiSources(user, def);
                case MULTI_PROPRIETAIRE  -> evalMultiProprietaire(user, def);
                case PREMIER_TOIT        -> evalCategoryPresence(user, def, AssetCategory.IMMO_PHYSIQUE);
                case LE_DIVERSIFICATEUR  -> evalDiversificateurCrypto(user, def);
                case PREMIER_REMBOURSEMENT -> evalPremierRemboursement(user, def);
                case LIBERTE_CONQUISE    -> evalLibertéConquise(user, def);
                case LORD_DU_MANOIR      -> evalLordDuManoir(user, def);
                case LE_COLLECTIONNEUR   -> evalCollectionneur(user, def);
                case LE_CHASSEUR         -> evalChasseur(user, def);
                case L_ENCYCLOPEDISTE    -> evalEncyclopediste(user, def);
                // ── V2 Faible ─────────────────────────────────────────────────
                case FORTERESSE_SECURITE -> evalForteresseSécurité(user, def);
                case LE_DESENDET         -> evalDesendet(user, def);
                case LE_BOUCLIER         -> evalBouclier(user, def);
                case AV_VETERAN          -> evalAvVeteran(user, def);
                case L_ACCOMPLISSEUR     -> evalAccomplisseur(user, def);
                case LE_RETOUR           -> evalRetour(user, def);
                case LE_FIDELE           -> evalFidele(user, def);
                case COMEBACK_KID        -> evalComebackKid(user, def);
                case SORTIE_DU_ROUGE     -> evalSortieRouge(user, def);
                case LEVIER_MAITRISE     -> evalLevierMaitrise(user, def);
                case L_INTER_SECTORIEL   -> evalInterSectoriel(user, def);
                // ── V2 Moyen ──────────────────────────────────────────────────
                case LE_RENTIER          -> evalRentier(user, def);
                case LEAN_FIRE           -> evalFireMultiple(user, def, 12);
                case FAT_FIRE            -> evalFireMultiple(user, def, 25);
                case FREE_AT_LAST        -> evalFreeAtLast(user, def);
                case FIRE_STARTER        -> evalFireStarter(user, def);
                case PATRIOTE_PEA        -> evalPatriotePea(user, def);
                case LE_VETERAN          -> evalVeteranPosition(user, def);
                case L_ANNALISTE         -> evalAnnaliste(user, def);
                // ── V2 Plus lourd ─────────────────────────────────────────────
                case BULL_RUN            -> evalBullRun(user, def);
                case DIAMOND_HANDS       -> evalDiamondHands(user, def);
                case LE_SANG_FROID       -> evalSangFroid(user, def);
                case LE_REBALANCER       -> evalRebalancer(user, def);
                case L_ASCENSION         -> evalAscension(user, def);
                case LE_DISCIPLE         -> evalDisciple(user, def);
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

    // ── V2 Trivial ───────────────────────────────────────────────────────────

    private int evalPasTousMemeParier(User user, AchievementDefinition def) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        PortfolioSnapshot snap = snaps.get(0);
        BigDecimal total = totalPatrimoine(snap);
        if (total.compareTo(BigDecimal.ZERO) == 0) return 0;
        BigDecimal max = snap.getPositionSnapshots().stream()
                .filter(ps -> ps.getPosition() != null && ps.getCurrentValueEur() != null)
                .collect(Collectors.groupingBy(ps -> ps.getPosition().getCategory(),
                        Collectors.reducing(BigDecimal.ZERO, PositionSnapshot::getCurrentValueEur, BigDecimal::add)))
                .values().stream().max(Comparator.naturalOrder()).orElse(BigDecimal.ZERO);
        BigDecimal ratio = max.multiply(BigDecimal.valueOf(100)).divide(total, 2, java.math.RoundingMode.HALF_UP);
        return ratio.compareTo(new BigDecimal("50")) < 0 ? 1 : 0;
    }

    private int evalCosmopolite(User user, AchievementDefinition def) {
        long currencies = positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE).stream()
                .map(Position::getInstrument).filter(Objects::nonNull)
                .map(i -> i.getCurrency()).filter(Objects::nonNull)
                .filter(c -> !"EUR".equalsIgnoreCase(c))
                .distinct().count();
        return levelForValue(def, BigDecimal.valueOf(currencies));
    }

    private int evalEnveloppePresence(User user, AchievementDefinition def, FiscalEnvelope env) {
        boolean has = positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE).stream()
                .anyMatch(p -> env == p.getFiscalEnvelope());
        return has ? 1 : 0;
    }

    private int evalRoyalFlush(User user, AchievementDefinition def) {
        Set<FiscalEnvelope> envelopes = positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE)
                .stream().map(Position::getFiscalEnvelope).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        boolean royal = envelopes.containsAll(Set.of(FiscalEnvelope.PEA, FiscalEnvelope.AV, FiscalEnvelope.PER, FiscalEnvelope.CTO));
        return royal ? 1 : 0;
    }

    private int evalMultiSources(User user, AchievementDefinition def) {
        long types = otherIncomeRepo.findByUserOrderByDateDesc(user).stream()
                .map(OtherIncome::getType).filter(Objects::nonNull).distinct().count();
        return types >= 3 ? 1 : 0;
    }

    private int evalMultiProprietaire(User user, AchievementDefinition def) {
        long count = positionRepo.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE).size();
        return levelForValue(def, BigDecimal.valueOf(count));
    }

    private int evalCategoryPresence(User user, AchievementDefinition def, AssetCategory cat) {
        boolean has = !positionRepo.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(user, cat, PositionStatus.ACTIVE).isEmpty();
        return has ? 1 : 0;
    }

    private int evalDiversificateurCrypto(User user, AchievementDefinition def) {
        long cryptos = positionRepo.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(user, AssetCategory.CRYPTO, PositionStatus.ACTIVE)
                .stream().map(Position::getInstrument).filter(Objects::nonNull).distinct().count();
        return levelForValue(def, BigDecimal.valueOf(cryptos));
    }

    private int evalPremierRemboursement(User user, AchievementDefinition def) {
        boolean any = debtRepo.findByUserOrderByTypeAscLabelAsc(user).stream().anyMatch(d ->
                d.getRemainingCapitalOverride() != null && d.getRemainingCapitalOverride().compareTo(BigDecimal.ZERO) <= 0);
        return any ? 1 : 0;
    }

    private int evalLibertéConquise(User user, AchievementDefinition def) {
        boolean noDebt = debtRepo.findByUserOrderByTypeAscLabelAsc(user).isEmpty();
        return (noDebt && snapshotRepo.countByUser(user) > 0) ? 1 : 0;
    }

    private int evalLordDuManoir(User user, AchievementDefinition def) {
        boolean hasImmo = !positionRepo.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE).isEmpty();
        boolean hasImmoDebt = debtRepo.findByUserOrderByTypeAscLabelAsc(user).stream()
                .anyMatch(d -> DebtTypeEnum.IMMOBILIER == d.getType());
        return (hasImmo && hasImmoDebt) ? 1 : 0;
    }

    private int evalCollectionneur(User user, AchievementDefinition def) {
        long count = achievementRepo.countByUserAndConfirmedAtIsNotNull(user);
        return levelForValue(def, BigDecimal.valueOf(count));
    }

    private int evalChasseur(User user, AchievementDefinition def) {
        Set<AchievementCode> secretCodes = catalog.all().stream()
                .filter(AchievementDefinition::secret).map(AchievementDefinition::code)
                .collect(Collectors.toSet());
        long confirmed = achievementRepo.findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(user).stream()
                .filter(a -> secretCodes.contains(a.getAchievementCode())).count();
        return confirmed >= secretCodes.size() ? 1 : 0;
    }

    private int evalEncyclopediste(User user, AchievementDefinition def) {
        long distinctCodes = achievementRepo.findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(user).stream()
                .map(UserAchievement::getAchievementCode).distinct().count();
        return levelForValue(def, BigDecimal.valueOf(distinctCodes));
    }

    // ── V2 Faible ────────────────────────────────────────────────────────────

    private int evalForteresseSécurité(User user, AchievementDefinition def) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty() || user.getSafetyNetMode() == null) return 0;
        PortfolioSnapshot snap = snaps.get(0);
        double liquid = categoryValue(snap, AssetCategory.LIQUIDITE).doubleValue()
                      + categoryValue(snap, AssetCategory.LIVRET).doubleValue();
        double target = computeSafetyNetTarget(user);
        return (target > 0 && liquid >= target) ? 1 : 0;
    }

    private int evalDesendet(User user, AchievementDefinition def) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        double patrimoine = totalPatrimoine(snaps.get(0)).doubleValue();
        if (patrimoine <= 0) return 0;
        double totalDebt = debtRepo.findByUserOrderByTypeAscLabelAsc(user).stream()
                .mapToDouble(d -> d.getRemainingCapitalOverride() != null
                        ? Math.max(0, d.getRemainingCapitalOverride().doubleValue())
                        : Math.max(0, d.getInitialCapital() != null ? d.getInitialCapital().doubleValue() : 0))
                .sum();
        if (totalDebt == 0) return def.levels().size(); // 0% dette → Diamant
        double ratio = totalDebt / patrimoine * 100;
        // Seuils inversés : 100-ratio > threshold ; threshold = 100-seuil dette
        // Bronze ≥ 70 = dette < 30 % ; Argent ≥ 85 = dette < 15 % ; etc.
        double inverseRatio = 100 - ratio;
        return levelForValue(def, BigDecimal.valueOf(inverseRatio));
    }

    private int evalBouclier(User user, AchievementDefinition def) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        double liquid = categoryValue(snaps.get(0), AssetCategory.LIQUIDITE).doubleValue()
                      + categoryValue(snaps.get(0), AssetCategory.LIVRET).doubleValue();
        double monthly = monthlyExpenses(user);
        if (monthly <= 0) return 0;
        double months = liquid / monthly;
        return levelForValue(def, BigDecimal.valueOf(months));
    }

    private int evalAvVeteran(User user, AchievementDefinition def) {
        boolean veteran = positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE).stream()
                .anyMatch(p -> FiscalEnvelope.AV == p.getFiscalEnvelope()
                        && p.getCreatedAt() != null
                        && p.getCreatedAt().isBefore(java.time.LocalDateTime.now().minusYears(8)));
        return veteran ? 1 : 0;
    }

    private int evalAccomplisseur(User user, AchievementDefinition def) {
        List<PatrimoineTarget> targets = targetRepo.findByUser(user).stream()
                .filter(t -> t.getTargetAmountEur() != null && t.getTargetAmountEur() > 0)
                .toList();
        if (targets.isEmpty()) return 0;
        List<PortfolioSnapshot> snaps = snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        Map<String, Double> catValues = snaps.get(0).getPositionSnapshots().stream()
                .filter(ps -> ps.getPosition() != null && ps.getCurrentValueEur() != null)
                .collect(Collectors.groupingBy(ps -> ps.getPosition().getCategory().name(),
                        Collectors.summingDouble(ps -> ps.getCurrentValueEur().doubleValue())));
        boolean achieved = targets.stream().anyMatch(t -> {
            Double actual = catValues.get(t.getCategory());
            return actual != null && actual >= t.getTargetAmountEur();
        });
        return achieved ? 1 : 0;
    }

    private int evalRetour(User user, AchievementDefinition def) {
        List<LoginEvent> logins = loginRepo.findSuccessfulByLoginOrderByTimestampDesc(user.getLogin());
        if (logins.size() < 2) return 0;
        for (int i = 0; i < logins.size() - 1; i++) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(
                    logins.get(i + 1).getTimestamp(), logins.get(i).getTimestamp());
            if (days >= 30) return 1;
        }
        return 0;
    }

    private int evalFidele(User user, AchievementDefinition def) {
        List<LoginEvent> logins = loginRepo.findSuccessfulByLoginOrderByTimestampDesc(user.getLogin());
        Set<YearMonth> months = logins.stream()
                .map(e -> YearMonth.from(e.getTimestamp())).collect(Collectors.toSet());
        YearMonth current = YearMonth.now();
        for (int i = 0; i < 12; i++) {
            if (!months.contains(current.minusMonths(i))) return 0;
        }
        return 1;
    }

    private int evalComebackKid(User user, AchievementDefinition def) {
        if (user.getAllTimeHighEur() == null) return 0;
        List<PortfolioSnapshot> snaps = snapshotRepo.findByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        BigDecimal ath = user.getAllTimeHighEur();
        BigDecimal current = snaps.get(0).getTotalCurrentValueEur();
        if (current == null || current.compareTo(ath.multiply(new BigDecimal("0.95"))) < 0) return 0;
        BigDecimal drawdownThreshold = ath.multiply(new BigDecimal("0.85")); // -15 %
        boolean hadDrawdown = snaps.stream()
                .filter(s -> s.getTotalCurrentValueEur() != null)
                .anyMatch(s -> s.getTotalCurrentValueEur().compareTo(drawdownThreshold) < 0);
        return hadDrawdown ? 1 : 0;
    }

    private int evalSortieRouge(User user, AchievementDefinition def) {
        if (user.getInitialNetWorthEur() == null || user.getInitialNetWorthEur().compareTo(new BigDecimal("1000")) >= 0) return 0;
        List<PortfolioSnapshot> snaps = snapshotRepo.findByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        BigDecimal current = snaps.get(0).getTotalCurrentValueEur();
        return (current != null && current.compareTo(new BigDecimal("10000")) >= 0) ? 1 : 0;
    }

    private int evalLevierMaitrise(User user, AchievementDefinition def) {
        List<Position> immoPos = positionRepo.findByUserAndCategoryAndStatusOrderByCreatedAtDesc(user, AssetCategory.IMMO_PHYSIQUE, PositionStatus.ACTIVE);
        Set<Long> immoIds = immoPos.stream().filter(p -> p.getEstimatedCurrentValue() != null)
                .map(Position::getId).collect(Collectors.toSet());
        if (immoIds.isEmpty()) return 0;
        return debtRepo.findByUserOrderByTypeAscLabelAsc(user).stream()
                .filter(d -> DebtTypeEnum.IMMOBILIER == d.getType() && d.getPositionId() != null
                        && immoIds.contains(d.getPositionId()))
                .anyMatch(d -> {
                    Position pos = immoPos.stream().filter(p -> p.getId().equals(d.getPositionId())).findFirst().orElse(null);
                    if (pos == null || pos.getEstimatedCurrentValue() == null) return false;
                    double capital = d.getRemainingCapitalOverride() != null ? d.getRemainingCapitalOverride().doubleValue()
                            : (d.getInitialCapital() != null ? d.getInitialCapital().doubleValue() : 0);
                    double value = pos.getEstimatedCurrentValue().doubleValue();
                    if (value <= 0) return false;
                    double ltv = capital / value * 100;
                    return ltv >= 30 && ltv <= 70;
                }) ? 1 : 0;
    }

    private int evalInterSectoriel(User user, AchievementDefinition def) {
        List<Position> active = positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE);
        List<Instrument> instruments = active.stream().map(Position::getInstrument)
                .filter(Objects::nonNull).distinct().toList();
        if (instruments.isEmpty()) return 0;
        long sectors = sectorAllocationRepo.findByInstrumentInOrderByPercentageDesc(instruments).stream()
                .map(InstrumentSectorAllocation::getSector).filter(Objects::nonNull).distinct().count();
        return levelForValue(def, BigDecimal.valueOf(sectors));
    }

    // ── V2 Moyen ─────────────────────────────────────────────────────────────

    private int evalRentier(User user, AchievementDefinition def) {
        double salary = 0.0;
        Optional<SalaryContract> contract = salaryRepo.findByUserAndEndDateIsNull(user);
        if (contract.isPresent() && contract.get().getAnnualGrossSalary() != null) {
            salary = contract.get().getAnnualGrossSalary().doubleValue() * 0.72 / 12;
        }
        if (salary <= 0) return 0;
        double passive = otherIncomeRepo.findByUserOrderByDateDesc(user).stream()
                .filter(i -> i.getAmount() != null && (OtherIncomeTypeEnum.LOCATIF == i.getType() || OtherIncomeTypeEnum.DIVIDENDE == i.getType()))
                .mapToDouble(i -> i.getAmount()).sum();
        double ratio = passive / salary * 100;
        return levelForValue(def, BigDecimal.valueOf(ratio));
    }

    private int evalFireMultiple(User user, AchievementDefinition def, int multiple) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        double patrimoine = totalPatrimoine(snaps.get(0)).doubleValue();
        double annualExpenses = monthlyExpenses(user) * 12;
        if (annualExpenses <= 0) return 0;
        return patrimoine >= annualExpenses * multiple ? 1 : 0;
    }

    private int evalFreeAtLast(User user, AchievementDefinition def) {
        double passive = otherIncomeRepo.findByUserOrderByDateDesc(user).stream()
                .filter(i -> i.getAmount() != null && (OtherIncomeTypeEnum.LOCATIF == i.getType() || OtherIncomeTypeEnum.DIVIDENDE == i.getType()))
                .mapToDouble(i -> i.getAmount()).sum();
        double monthly = monthlyExpenses(user);
        return (monthly > 0 && passive >= monthly) ? 1 : 0;
    }

    private int evalFireStarter(User user, AchievementDefinition def) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        double patrimoine = totalPatrimoine(snaps.get(0)).doubleValue();
        double fireTarget = monthlyExpenses(user) * 12 * 25;
        if (fireTarget <= 0) return 0;
        double pct = patrimoine / fireTarget * 100;
        return levelForValue(def, BigDecimal.valueOf(pct));
    }

    private int evalPatriotePea(User user, AchievementDefinition def) {
        BigDecimal buys  = orderRepo.sumAmountByEnvelopeAndOrderType(user, FiscalEnvelope.PEA, OrderType.BUY);
        BigDecimal sells = orderRepo.sumAmountByEnvelopeAndOrderType(user, FiscalEnvelope.PEA, OrderType.SELL);
        BigDecimal net = (buys != null ? buys : BigDecimal.ZERO)
                        .subtract(sells != null ? sells : BigDecimal.ZERO);
        return levelForValue(def, net.max(BigDecimal.ZERO));
    }

    private int evalVeteranPosition(User user, AchievementDefinition def) {
        boolean veteran = positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE).stream()
                .anyMatch(p -> p.getCreatedAt() != null
                        && p.getCreatedAt().isBefore(java.time.LocalDateTime.now().minusYears(10)));
        return veteran ? 1 : 0;
    }

    private int evalAnnaliste(User user, AchievementDefinition def) {
        Set<Integer> years = snapshotRepo.findByUserOrderBySnapshotDateDesc(user).stream()
                .map(s -> s.getSnapshotDate().getYear()).collect(Collectors.toSet());
        int currentYear = java.time.LocalDate.now().getYear();
        int consecutive = 0;
        for (int y = currentYear; years.contains(y); y--) consecutive++;
        return levelForValue(def, BigDecimal.valueOf(consecutive));
    }

    // ── V2 Plus lourd ────────────────────────────────────────────────────────

    /** Performance YTD du portefeuille BOURSE depuis le 1er janvier. */
    private int evalBullRun(User user, AchievementDefinition def) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findByUserOrderBySnapshotDateDesc(user);
        if (snaps.size() < 2) return 0;
        PortfolioSnapshot current = snaps.get(0);
        LocalDate jan1 = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        PortfolioSnapshot baseline = snaps.stream()
                .filter(s -> !s.getSnapshotDate().isAfter(jan1))
                .findFirst().orElse(null);
        if (baseline == null) return 0;
        double baseVal = categoryValue(baseline, AssetCategory.BOURSE).doubleValue();
        if (baseVal <= 0) return 0;
        double currentVal = categoryValue(current, AssetCategory.BOURSE).doubleValue();
        double perf = (currentVal - baseVal) / baseVal * 100;
        return levelForValue(def, BigDecimal.valueOf(perf));
    }

    /** Position BOURSE ou CRYPTO active détenue sans interruption depuis N ans. */
    private int evalDiamondHands(User user, AchievementDefinition def) {
        long maxYears = positionRepo.findByUserAndStatusOrderByCreatedAtDesc(user, PositionStatus.ACTIVE)
                .stream()
                .filter(p -> (AssetCategory.BOURSE == p.getCategory() || AssetCategory.CRYPTO == p.getCategory())
                        && p.getCreatedAt() != null)
                .mapToLong(p -> ChronoUnit.YEARS.between(p.getCreatedAt().toLocalDate(), LocalDate.now()))
                .max().orElse(0);
        return levelForValue(def, BigDecimal.valueOf(maxYears));
    }

    /** Aucune vente lors d'un repli mensuel > 10 % du portefeuille investissable. */
    private int evalSangFroid(User user, AchievementDefinition def) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findByUserWithPositionsOrderBySnapshotDateAsc(user);
        if (snaps.size() < 2) return 0;
        for (int i = 1; i < snaps.size(); i++) {
            PortfolioSnapshot prev = snaps.get(i - 1);
            PortfolioSnapshot curr = snaps.get(i);
            BigDecimal prevVal = investableValue(prev);
            if (prevVal.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal drop = prevVal.subtract(investableValue(curr))
                    .divide(prevVal, 4, java.math.RoundingMode.HALF_UP);
            if (drop.compareTo(new BigDecimal("0.10")) >= 0) {
                boolean hadSell = orderRepo.existsByPositionUserAndOrderTypeAndOrderDateBetween(
                        user, OrderType.SELL, prev.getSnapshotDate(), curr.getSnapshotDate());
                if (!hadSell) return 1;
            }
        }
        return 0;
    }

    /** Vente dans une catégorie et achat dans une autre catégorie dans la même semaine. */
    private int evalRebalancer(User user, AchievementDefinition def) {
        List<PositionOrder> orders = orderRepo.findByPositionUserWithPositionOrderByOrderDateAsc(user);
        for (PositionOrder sell : orders) {
            if (OrderType.SELL != sell.getOrderType() || sell.getPosition() == null) continue;
            AssetCategory sellCat = sell.getPosition().getCategory();
            if (sellCat == null) continue;
            LocalDate sellDate = sell.getOrderDate();
            LocalDate windowEnd = sellDate.plusDays(7);
            boolean found = orders.stream()
                    .filter(o -> OrderType.BUY == o.getOrderType() && o.getPosition() != null)
                    .filter(o -> !o.getOrderDate().isBefore(sellDate) && !o.getOrderDate().isAfter(windowEnd))
                    .anyMatch(o -> sellCat != o.getPosition().getCategory());
            if (found) return 1;
        }
        return 0;
    }

    /** Décile de patrimoine INSEE dans la tranche d'âge de l'utilisateur. */
    private int evalAscension(User user, AchievementDefinition def) {
        if (user.getBirthDate() == null) return 0;
        List<PortfolioSnapshot> snaps = snapshotRepo.findTop3ByUserOrderBySnapshotDateDesc(user);
        if (snaps.isEmpty()) return 0;
        int age = (int) ChronoUnit.YEARS.between(user.getBirthDate(), LocalDate.now());
        double patrimoine = totalPatrimoine(snaps.get(0)).doubleValue();
        int decile = computeInseeDecile(age, patrimoine);
        if (decile <= 0) return 0;
        if (!Objects.equals(user.getLastKnownDecile(), decile)) {
            user.setLastKnownDecile(decile);
            userRepository.save(user);
        }
        return levelForValue(def, BigDecimal.valueOf(decile));
    }

    /** Taux d'épargne sur la période couverte par les snapshots (max 12 mois). */
    private int evalDisciple(User user, AchievementDefinition def) {
        List<PortfolioSnapshot> snaps = snapshotRepo.findByUserOrderBySnapshotDateDesc(user);
        if (snaps.size() < 2) return 0;
        PortfolioSnapshot current = snaps.get(0);
        LocalDate cutoff = current.getSnapshotDate().minusMonths(12);
        PortfolioSnapshot baseline = snaps.stream()
                .filter(s -> !s.getSnapshotDate().isAfter(cutoff))
                .findFirst().orElse(snaps.get(snaps.size() - 1));
        if (baseline == current) return 0;
        double delta = totalPatrimoine(current).doubleValue() - totalPatrimoine(baseline).doubleValue();
        if (delta <= 0) return 0;
        Optional<SalaryContract> contract = salaryRepo.findByUserAndEndDateIsNull(user);
        if (contract.isEmpty() || contract.get().getAnnualGrossSalary() == null) return 0;
        double monthlySalary = contract.get().getAnnualGrossSalary().doubleValue() * 0.72 / 12;
        if (monthlySalary <= 0) return 0;
        long months = ChronoUnit.MONTHS.between(baseline.getSnapshotDate(), current.getSnapshotDate());
        if (months <= 0) return 0;
        double savingsRate = delta / (months * monthlySalary) * 100;
        return levelForValue(def, BigDecimal.valueOf(savingsRate));
    }

    /** Retourne le rang décile INSEE (1–10) du patrimoine dans la tranche d'âge. */
    private int computeInseeDecile(int age, double patrimoine) {
        if (referentiel.getTranches() == null) return 0;
        PatrimoineReferentiel.Tranche tranche = referentiel.getTranches().stream()
                .filter(t -> age >= t.getAgeMin() && age <= t.getAgeMax())
                .findFirst().orElse(null);
        if (tranche == null) return 0;
        long[] seuils = { tranche.getD1(), tranche.getD2(), tranche.getD3(), tranche.getD4(),
                          tranche.getD5(), tranche.getD6(), tranche.getD7(), tranche.getD8(), tranche.getD9() };
        for (int i = 0; i < seuils.length; i++) {
            if (patrimoine < seuils[i]) return i + 1;
        }
        return 10;
    }

    /** Valeur investissable = BOURSE + CRYPTO (pour le calcul de drawdown). */
    private BigDecimal investableValue(PortfolioSnapshot snap) {
        return snap.getPositionSnapshots().stream()
                .filter(ps -> ps.getPosition() != null
                        && (AssetCategory.BOURSE == ps.getPosition().getCategory()
                            || AssetCategory.CRYPTO == ps.getPosition().getCategory()))
                .map(PositionSnapshot::getCurrentValueEur)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ── Helpers communs V2 ───────────────────────────────────────────────────

    private double monthlyExpenses(User user) {
        return expenseRepo.findByUserOrderByCategoryAscLabelAsc(user).stream()
                .filter(e -> e.getAmount() != null)
                .mapToDouble(e -> FrequencyEnum.ANNUAL == e.getFrequency()
                        ? e.getAmount() / 12.0 : e.getAmount())
                .sum();
    }

    private double computeSafetyNetTarget(User user) {
        if (user.getSafetyNetMode() == null) return 0;
        switch (user.getSafetyNetMode()) {
            case FIXED_AMOUNT:
                return user.getSafetyNetAmount() != null ? user.getSafetyNetAmount() : 0;
            case MONTHS_EXPENSES:
                return user.getSafetyNetMonths() != null ? user.getSafetyNetMonths() * monthlyExpenses(user) : 0;
            case MONTHS_SALARY: {
                Optional<SalaryContract> c = salaryRepo.findByUserAndEndDateIsNull(user);
                double monthly = c.isPresent() && c.get().getAnnualGrossSalary() != null
                        ? c.get().getAnnualGrossSalary().doubleValue() * 0.72 / 12 : 0;
                return user.getSafetyNetMonths() != null ? user.getSafetyNetMonths() * monthly : 0;
            }
            default: return 0;
        }
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
