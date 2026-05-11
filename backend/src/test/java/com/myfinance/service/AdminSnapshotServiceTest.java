package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminSnapshotServiceTest {

    @Mock PortfolioSnapshotRepository portfolioSnapshotRepository;
    @Mock PositionRepository positionRepository;
    @Mock UserRepository userRepository;
    @InjectMocks AdminSnapshotService adminSnapshotService;

    User user;
    Position livret;
    Position liquidite;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).firstName("Alice").lastName("Dupont")
                .login("alice").role(RoleEnum.USER).build();

        livret = Position.builder()
                .id(10L).user(user)
                .category(AssetCategory.LIVRET)
                .label("Livret A").currency("EUR")
                .annualRate(new BigDecimal("3.00"))
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        liquidite = Position.builder()
                .id(20L).user(user)
                .category(AssetCategory.LIQUIDITE)
                .label("Cash").currency("EUR")
                .currentBalance(new BigDecimal("500"))
                .includeInIncomeProjection(false)
                .status(PositionStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLesSnapshotsEnResume() {
        PortfolioSnapshot snap = PortfolioSnapshot.builder()
                .id(1L).user(user)
                .snapshotDate(LocalDate.of(2026, 3, 1))
                .totalInvestedEur(new BigDecimal("5000"))
                .totalCurrentValueEur(new BigDecimal("5200"))
                .totalCapitalGainEur(new BigDecimal("200"))
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(portfolioSnapshotRepository.findByUserOrderBySnapshotDateDesc(user))
                .thenReturn(List.of(snap));

        List<AdminSnapshotDetailDto> result = adminSnapshotService.findAllByUser(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).positions()).isNull();
        assertThat(result.get(0).userFullName()).isEqualTo("Alice Dupont");
    }

    @Test
    void findAllByUser_leve404_siUtilisateurInexistant() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminSnapshotService.findAllByUser(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── findActivePositionsByUser ──────────────────────────────

    @Test
    void findActivePositionsByUser_retourneLesPositionsActives() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(positionRepository.findByUserOrderByCreatedAtDesc(user))
                .thenReturn(List.of(livret, liquidite));

        List<PositionAdminRefDto> result = adminSnapshotService.findAllPositionsByUser(1L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(10L);
        assertThat(result.get(0).label()).isEqualTo("Livret A");
        assertThat(result.get(1).id()).isEqualTo(20L);
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_construitEtSauvegardeLeSnapshot() {
        LocalDate date = LocalDate.of(2026, 4, 15);
        ManualSnapshotRequest request = new ManualSnapshotRequest(
                1L, date,
                List.of(
                        new ManualPositionSnapshotRequest(10L, new BigDecimal("3000"),
                                new BigDecimal("3200"), null, null),
                        new ManualPositionSnapshotRequest(20L, new BigDecimal("500"),
                                new BigDecimal("500"), null, null)
                )
        );

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user))
                .thenReturn(List.of(livret, liquidite));
        when(positionRepository.findById(10L)).thenReturn(Optional.of(livret));
        when(positionRepository.findById(20L)).thenReturn(Optional.of(liquidite));
        when(portfolioSnapshotRepository.save(any())).thenAnswer(inv -> {
            PortfolioSnapshot snap = inv.getArgument(0);
            snap.setId(5L);
            return snap;
        });

        AdminSnapshotDetailDto result = adminSnapshotService.create(request);

        assertThat(result.id()).isEqualTo(5L);
        assertThat(result.snapshotDate()).isEqualTo(date);
        assertThat(result.totalInvestedEur()).isEqualByComparingTo("3500");
        assertThat(result.totalCurrentValueEur()).isEqualByComparingTo("3700");
        assertThat(result.totalCapitalGainEur()).isEqualByComparingTo("200");
        assertThat(result.positions()).hasSize(2);
    }

    @Test
    void create_leve409_siSnapshotDejaExistantSurLeMeme_mois() {
        LocalDate date = LocalDate.of(2026, 4, 10);
        PortfolioSnapshot existing = PortfolioSnapshot.builder().id(99L).user(user)
                .snapshotDate(date).totalInvestedEur(BigDecimal.ZERO)
                .totalCurrentValueEur(BigDecimal.ZERO).totalCapitalGainEur(BigDecimal.ZERO).build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(any(), any(), any()))
                .thenReturn(Optional.of(existing));

        ManualSnapshotRequest request = new ManualSnapshotRequest(1L, date, List.of());

        assertThatThrownBy(() -> adminSnapshotService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void create_leve400_siPositionNAppartientPasALUtilisateur() {
        ManualSnapshotRequest request = new ManualSnapshotRequest(
                1L, LocalDate.of(2026, 4, 1),
                List.of(new ManualPositionSnapshotRequest(99L, BigDecimal.TEN, BigDecimal.TEN, null, null))
        );

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(any(), any(), any()))
                .thenReturn(Optional.empty());
        // livret et liquidite appartiennent à user (id 1), pas positionAutreUser (id 99)
        when(positionRepository.findByUserOrderByCreatedAtDesc(user))
                .thenReturn(List.of(livret, liquidite));

        assertThatThrownBy(() -> adminSnapshotService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLeSnapshot() {
        PortfolioSnapshot snap = PortfolioSnapshot.builder().id(3L).user(user)
                .snapshotDate(LocalDate.now()).totalInvestedEur(BigDecimal.ZERO)
                .totalCurrentValueEur(BigDecimal.ZERO).totalCapitalGainEur(BigDecimal.ZERO).build();

        when(portfolioSnapshotRepository.findById(3L)).thenReturn(Optional.of(snap));

        adminSnapshotService.delete(3L);

        verify(portfolioSnapshotRepository).delete(snap);
    }

    @Test
    void delete_leve404_siSnapshotInexistant() {
        when(portfolioSnapshotRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminSnapshotService.delete(999L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Tests additionnels — branches non couvertes
    // ═══════════════════════════════════════════════════════════════════════════

    // ── findById ──────────────────────────────────────────────────────────────

    @Test
    void findById_retourneLeSnapshot() {
        PortfolioSnapshot snap = PortfolioSnapshot.builder()
                .id(5L).user(user).snapshotDate(LocalDate.of(2026, 4, 1))
                .totalInvestedEur(new BigDecimal("3000"))
                .totalCurrentValueEur(new BigDecimal("3500"))
                .totalCapitalGainEur(new BigDecimal("500"))
                .positionSnapshots(new java.util.ArrayList<>())
                .build();
        when(portfolioSnapshotRepository.findById(5L)).thenReturn(Optional.of(snap));

        AdminSnapshotDetailDto result = adminSnapshotService.findById(5L);

        assertThat(result.id()).isEqualTo(5L);
        assertThat(result.totalCurrentValueEur()).isEqualByComparingTo("3500");
    }

    @Test
    void findById_leve404_siSnapshotInexistant() {
        when(portfolioSnapshotRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminSnapshotService.findById(999L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── update ────────────────────────────────────────────────────────────────

    @Test
    void update_metAJourLeSnapshot() {
        PortfolioSnapshot snap = PortfolioSnapshot.builder()
                .id(5L).user(user).snapshotDate(LocalDate.of(2026, 3, 1))
                .totalInvestedEur(new BigDecimal("3000"))
                .totalCurrentValueEur(new BigDecimal("3000"))
                .totalCapitalGainEur(BigDecimal.ZERO)
                .positionSnapshots(new java.util.ArrayList<>())
                .build();
        when(portfolioSnapshotRepository.findById(5L)).thenReturn(Optional.of(snap));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user))
                .thenReturn(List.of(livret));
        when(positionRepository.findById(10L)).thenReturn(Optional.of(livret));
        when(portfolioSnapshotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ManualSnapshotRequest req = new ManualSnapshotRequest(
                1L, LocalDate.of(2026, 4, 15),
                List.of(new ManualPositionSnapshotRequest(10L,
                        new BigDecimal("3500"), new BigDecimal("3700"), null, null)));

        AdminSnapshotDetailDto result = adminSnapshotService.update(5L, req);

        assertThat(result.snapshotDate()).isEqualTo(LocalDate.of(2026, 4, 15));
        assertThat(result.totalInvestedEur()).isEqualByComparingTo("3500");
    }

    @Test
    void update_leve400_siUserDuRequestNeCorrespondPas() {
        PortfolioSnapshot snap = PortfolioSnapshot.builder()
                .id(5L).user(user).snapshotDate(LocalDate.of(2026, 3, 1))
                .totalInvestedEur(BigDecimal.ZERO).totalCurrentValueEur(BigDecimal.ZERO)
                .totalCapitalGainEur(BigDecimal.ZERO)
                .positionSnapshots(new java.util.ArrayList<>())
                .build();
        User autre = User.builder().id(99L).login("other").role(RoleEnum.USER).build();

        when(portfolioSnapshotRepository.findById(5L)).thenReturn(Optional.of(snap));
        when(userRepository.findById(99L)).thenReturn(Optional.of(autre));

        ManualSnapshotRequest req = new ManualSnapshotRequest(
                99L, LocalDate.of(2026, 4, 1), List.of());

        assertThatThrownBy(() -> adminSnapshotService.update(5L, req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("ne correspond pas");
                });
    }

    @Test
    void update_leve404_siSnapshotInexistant() {
        when(portfolioSnapshotRepository.findById(999L)).thenReturn(Optional.empty());

        ManualSnapshotRequest req = new ManualSnapshotRequest(
                1L, LocalDate.of(2026, 4, 1), List.of());

        assertThatThrownBy(() -> adminSnapshotService.update(999L, req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_excludeIdSurMemeMois_acceptee() {
        // Update sur le même snapshot, le mois est déjà occupé par lui-même → OK (excludeId)
        PortfolioSnapshot snap = PortfolioSnapshot.builder()
                .id(5L).user(user).snapshotDate(LocalDate.of(2026, 4, 5))
                .totalInvestedEur(BigDecimal.ZERO).totalCurrentValueEur(BigDecimal.ZERO)
                .totalCapitalGainEur(BigDecimal.ZERO)
                .positionSnapshots(new java.util.ArrayList<>())
                .build();
        when(portfolioSnapshotRepository.findById(5L)).thenReturn(Optional.of(snap));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(any(), any(), any()))
                .thenReturn(Optional.of(snap));  // même snapshot trouvé → excludeId match
        when(positionRepository.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(portfolioSnapshotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ManualSnapshotRequest req = new ManualSnapshotRequest(
                1L, LocalDate.of(2026, 4, 20), List.of());

        assertThatNoException().isThrownBy(() -> adminSnapshotService.update(5L, req));
    }

    @Test
    void update_leve409_siAutreSnapshotMemeMois() {
        // Update vers un mois où existe DÉJÀ un autre snapshot
        PortfolioSnapshot snap = PortfolioSnapshot.builder()
                .id(5L).user(user).snapshotDate(LocalDate.of(2026, 3, 1))
                .totalInvestedEur(BigDecimal.ZERO).totalCurrentValueEur(BigDecimal.ZERO)
                .totalCapitalGainEur(BigDecimal.ZERO)
                .positionSnapshots(new java.util.ArrayList<>())
                .build();
        PortfolioSnapshot autreSnap = PortfolioSnapshot.builder()
                .id(99L).user(user).snapshotDate(LocalDate.of(2026, 4, 1))
                .totalInvestedEur(BigDecimal.ZERO).totalCurrentValueEur(BigDecimal.ZERO)
                .totalCapitalGainEur(BigDecimal.ZERO).build();
        when(portfolioSnapshotRepository.findById(5L)).thenReturn(Optional.of(snap));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(any(), any(), any()))
                .thenReturn(Optional.of(autreSnap));  // ID different → conflit

        ManualSnapshotRequest req = new ManualSnapshotRequest(
                1L, LocalDate.of(2026, 4, 15), List.of());

        assertThatThrownBy(() -> adminSnapshotService.update(5L, req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    // ── computeTotals : aucune position investie → null ──────────────────────

    @Test
    void create_aucunInvestedAmount_totalInvestedNull() {
        // Toutes les positions sont LIQUIDITE/IMMO sans investedAmountEur
        ManualSnapshotRequest request = new ManualSnapshotRequest(
                1L, LocalDate.of(2026, 4, 1),
                List.of(new ManualPositionSnapshotRequest(20L, null,
                        new BigDecimal("500"), null, null)));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(portfolioSnapshotRepository.findByUserAndSnapshotDateBetween(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(positionRepository.findByUserOrderByCreatedAtDesc(user))
                .thenReturn(List.of(liquidite));
        when(positionRepository.findById(20L)).thenReturn(Optional.of(liquidite));
        when(portfolioSnapshotRepository.save(any())).thenAnswer(inv -> {
            PortfolioSnapshot s = inv.getArgument(0);
            s.setId(7L);
            return s;
        });

        AdminSnapshotDetailDto result = adminSnapshotService.create(request);

        assertThat(result.totalInvestedEur()).isNull();   // anyInvested = false
        assertThat(result.totalCapitalGainEur()).isNull();
        assertThat(result.totalCurrentValueEur()).isEqualByComparingTo("500");
    }

    // ── findById_inexistant ──────────────────────────────────────────────────
    // (déjà couvert par delete_leve404 et update_leve404 pour getSnapshot helper)
}
