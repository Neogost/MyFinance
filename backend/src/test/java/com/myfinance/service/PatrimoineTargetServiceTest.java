package com.myfinance.service;

import com.myfinance.domain.BreakdownDimension;
import com.myfinance.domain.PatrimoineTarget;
import com.myfinance.domain.PatrimoineTargetBreakdown;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.PatrimoineTargetsDto;
import com.myfinance.dto.SaveTargetsRequest;
import com.myfinance.dto.TargetBreakdownInput;
import com.myfinance.repository.PatrimoineTargetBreakdownRepository;
import com.myfinance.repository.PatrimoineTargetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatrimoineTargetServiceTest {

    @Mock PatrimoineTargetRepository patrimoineTargetRepository;
    @Mock PatrimoineTargetBreakdownRepository patrimoineTargetBreakdownRepository;
    @InjectMocks PatrimoineTargetService patrimoineTargetService;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("jean.dupont").role(RoleEnum.USER).build();
    }

    // ── getTargets ─────────────────────────────────────────────

    @Test
    void getTargets_retourneObjetVide_siAucunObjectif() {
        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());

        PatrimoineTargetsDto result = patrimoineTargetService.getTargets(user);

        assertThat(result.targets()).isEmpty();
        assertThat(result.breakdowns()).isEmpty();
    }

    @Test
    void getTargets_retourneTargetsEtBreakdowns() {
        PatrimoineTarget bourse = PatrimoineTarget.builder()
                .id(1L).user(user).category("BOURSE").targetAmountEur(50000.0).build();
        PatrimoineTarget livret = PatrimoineTarget.builder()
                .id(2L).user(user).category("LIVRET").targetAmountEur(20000.0).build();

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of(bourse, livret));
        when(patrimoineTargetBreakdownRepository.findByTargetIn(List.of(bourse, livret))).thenReturn(List.of(
                PatrimoineTargetBreakdown.builder().id(10L).target(bourse)
                        .dimension(BreakdownDimension.SECTOR).breakdownKey("Technology")
                        .targetPercentage(BigDecimal.valueOf(30)).build(),
                PatrimoineTargetBreakdown.builder().id(11L).target(bourse)
                        .dimension(BreakdownDimension.SECTOR).breakdownKey("Healthcare")
                        .targetPercentage(BigDecimal.valueOf(20)).build()
        ));

        PatrimoineTargetsDto result = patrimoineTargetService.getTargets(user);

        assertThat(result.targets()).containsEntry("BOURSE", 50000.0).containsEntry("LIVRET", 20000.0);
        assertThat(result.breakdowns()).containsKey("BOURSE").doesNotContainKey("LIVRET");
        assertThat(result.breakdowns().get("BOURSE")).hasSize(2);
    }

    // ── saveTargets ────────────────────────────────────────────

    @Test
    void saveTargets_supprimeAnciensPuisInsereNouveaux() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0, "LIVRET", 20000.0), Map.of(), Map.of());

        when(patrimoineTargetRepository.findByUser(user))
                .thenReturn(List.of(
                        PatrimoineTarget.builder().id(1L).user(user).category("OLD").targetAmountEur(1.0).build()))
                .thenReturn(List.of()); // 2e appel via getTargets en fin de saveTargets
        when(patrimoineTargetRepository.save(any(PatrimoineTarget.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        patrimoineTargetService.saveTargets(user, request);

        verify(patrimoineTargetBreakdownRepository).deleteByTargetIn(anyList());
        verify(patrimoineTargetRepository).deleteByUser(user);
        verify(patrimoineTargetRepository, times(2)).save(any(PatrimoineTarget.class));
    }

    @Test
    void saveTargets_ignoreLesValeursNullesEtNegatives() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0, "LIVRET", 0.0), Map.of(), Map.of());

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());
        when(patrimoineTargetRepository.save(any(PatrimoineTarget.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        patrimoineTargetService.saveTargets(user, request);

        ArgumentCaptor<PatrimoineTarget> captor = ArgumentCaptor.forClass(PatrimoineTarget.class);
        verify(patrimoineTargetRepository).save(captor.capture());
        assertThat(captor.getValue().getCategory()).isEqualTo("BOURSE");
    }

    @Test
    void saveTargets_avecRequestNulle_supprimeTout() {
        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());

        PatrimoineTargetsDto result = patrimoineTargetService.saveTargets(user, null);

        verify(patrimoineTargetRepository).deleteByUser(user);
        verify(patrimoineTargetRepository, never()).save(any(PatrimoineTarget.class));
        assertThat(result.targets()).isEmpty();
    }

    @Test
    void saveTargets_persisteLesBreakdownsAttachesAUneCategorieExistante() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0),
                Map.of(),
                Map.of("BOURSE", List.of(
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(30)),
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Healthcare", BigDecimal.valueOf(20))
                )));

        PatrimoineTarget saved = PatrimoineTarget.builder().id(99L).user(user)
                .category("BOURSE").targetAmountEur(50000.0).build();

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());
        when(patrimoineTargetRepository.save(any(PatrimoineTarget.class))).thenReturn(saved);

        patrimoineTargetService.saveTargets(user, request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PatrimoineTargetBreakdown>> captor = ArgumentCaptor.forClass(List.class);
        verify(patrimoineTargetBreakdownRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(2);
        assertThat(captor.getValue()).allMatch(b -> b.getDimension() == BreakdownDimension.SECTOR);
        assertThat(captor.getValue()).allMatch(b -> b.getTarget().getId().equals(99L));
    }

    @Test
    void saveTargets_ignoreLesBreakdownsSansObjectifParent() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of(), // pas de target BOURSE
                Map.of(),
                Map.of("BOURSE", List.of(
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(30))
                )));

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());

        patrimoineTargetService.saveTargets(user, request);

        verify(patrimoineTargetBreakdownRepository, never()).saveAll(anyList());
    }

    // ── Validations ────────────────────────────────────────────

    @Test
    void saveTargets_leve400_siSommeSuperieureA100() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0),
                Map.of(),
                Map.of("BOURSE", List.of(
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(70)),
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Healthcare", BigDecimal.valueOf(40))
                )));

        assertThatThrownBy(() -> patrimoineTargetService.saveTargets(user, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(patrimoineTargetRepository, never()).deleteByUser(any());
    }

    @Test
    void saveTargets_leve400_siDimensionSectorPourCategorieAutreQueBourse() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("CRYPTO", 5000.0),
                Map.of(),
                Map.of("CRYPTO", List.of(
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(50))
                )));

        assertThatThrownBy(() -> patrimoineTargetService.saveTargets(user, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void saveTargets_leve400_siCurrencyPourCrypto() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("CRYPTO", 5000.0),
                Map.of(),
                Map.of("CRYPTO", List.of(
                        new TargetBreakdownInput(BreakdownDimension.CURRENCY, "USD", BigDecimal.valueOf(80))
                )));

        assertThatThrownBy(() -> patrimoineTargetService.saveTargets(user, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void saveTargets_accepteInstrument_pourCrypto() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("CRYPTO", 5000.0),
                Map.of(),
                Map.of("CRYPTO", List.of(
                        new TargetBreakdownInput(BreakdownDimension.INSTRUMENT, "BTC", BigDecimal.valueOf(40)),
                        new TargetBreakdownInput(BreakdownDimension.INSTRUMENT, "ETH", BigDecimal.valueOf(30))
                )));

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());
        when(patrimoineTargetRepository.save(any(PatrimoineTarget.class)))
                .thenAnswer(inv -> {
                    PatrimoineTarget t = inv.getArgument(0);
                    t.setId(42L);
                    return t;
                });

        patrimoineTargetService.saveTargets(user, request);

        verify(patrimoineTargetBreakdownRepository).saveAll(anyList());
    }

    @Test
    void saveTargets_accepteCountryCurrencyAssetSubtype_pourBourse() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0),
                Map.of(),
                Map.of("BOURSE", List.of(
                        new TargetBreakdownInput(BreakdownDimension.COUNTRY, "FR", BigDecimal.valueOf(60)),
                        new TargetBreakdownInput(BreakdownDimension.CURRENCY, "EUR", BigDecimal.valueOf(70)),
                        new TargetBreakdownInput(BreakdownDimension.ASSET_SUBTYPE, "ETF", BigDecimal.valueOf(80))
                )));

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());
        when(patrimoineTargetRepository.save(any(PatrimoineTarget.class)))
                .thenAnswer(inv -> {
                    PatrimoineTarget t = inv.getArgument(0);
                    t.setId(42L);
                    return t;
                });

        patrimoineTargetService.saveTargets(user, request);

        verify(patrimoineTargetBreakdownRepository).saveAll(anyList());
    }

    @Test
    void saveTargets_leve400_siCleEnDoublon() {
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0),
                Map.of(),
                Map.of("BOURSE", List.of(
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(30)),
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "technology", BigDecimal.valueOf(20))
                )));

        assertThatThrownBy(() -> patrimoineTargetService.saveTargets(user, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void saveTargets_acceptePlusieursDimensions_dontLaSommeUnitaireRespecte100() {
        // SECTOR seul autorisé en V2 mais on vérifie que la somme est calculée par dimension, pas globalement
        SaveTargetsRequest request = new SaveTargetsRequest(
                Map.of("BOURSE", 50000.0),
                Map.of(),
                new HashMap<>(Map.of("BOURSE", List.of(
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Technology", BigDecimal.valueOf(60)),
                        new TargetBreakdownInput(BreakdownDimension.SECTOR, "Healthcare", BigDecimal.valueOf(40))
                ))));

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());
        when(patrimoineTargetRepository.save(any(PatrimoineTarget.class)))
                .thenAnswer(inv -> {
                    PatrimoineTarget t = inv.getArgument(0);
                    t.setId(42L);
                    return t;
                });

        patrimoineTargetService.saveTargets(user, request);

        verify(patrimoineTargetBreakdownRepository).saveAll(anyList());
    }
}
