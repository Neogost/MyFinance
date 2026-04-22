package com.myfinance.service;

import com.myfinance.domain.PatrimoineTarget;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.repository.PatrimoineTargetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatrimoineTargetServiceTest {

    @Mock PatrimoineTargetRepository patrimoineTargetRepository;
    @InjectMocks PatrimoineTargetService patrimoineTargetService;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("jean.dupont").role(RoleEnum.USER).build();
    }

    // ── getTargets ─────────────────────────────────────────────

    @Test
    void getTargets_retourneMapVide_siAucunObjectif() {
        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());

        Map<String, Double> result = patrimoineTargetService.getTargets(user);

        assertThat(result).isEmpty();
    }

    @Test
    void getTargets_retourneLaMap_avecLesObjectifsExistants() {
        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of(
                PatrimoineTarget.builder().id(1L).user(user).category("BOURSE").targetAmountEur(50000.0).build(),
                PatrimoineTarget.builder().id(2L).user(user).category("LIVRET").targetAmountEur(20000.0).build()
        ));

        Map<String, Double> result = patrimoineTargetService.getTargets(user);

        assertThat(result).hasSize(2);
        assertThat(result.get("BOURSE")).isEqualTo(50000.0);
        assertThat(result.get("LIVRET")).isEqualTo(20000.0);
    }

    // ── saveTargets ────────────────────────────────────────────

    @Test
    void saveTargets_supprimeLesAnciensPuisInsereLeNouveaux() {
        Map<String, Double> targets = Map.of("BOURSE", 50000.0, "LIVRET", 20000.0);

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of(
                PatrimoineTarget.builder().id(1L).user(user).category("BOURSE").targetAmountEur(50000.0).build(),
                PatrimoineTarget.builder().id(2L).user(user).category("LIVRET").targetAmountEur(20000.0).build()
        ));

        patrimoineTargetService.saveTargets(user, targets);

        verify(patrimoineTargetRepository).deleteByUser(user);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PatrimoineTarget>> captor = ArgumentCaptor.forClass(List.class);
        verify(patrimoineTargetRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(2);
    }

    @Test
    void saveTargets_ignoreLesValeursNullesEtNegatives() {
        Map<String, Double> targets = Map.of("BOURSE", 50000.0, "LIVRET", 0.0);

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of(
                PatrimoineTarget.builder().id(1L).user(user).category("BOURSE").targetAmountEur(50000.0).build()
        ));

        patrimoineTargetService.saveTargets(user, targets);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PatrimoineTarget>> captor = ArgumentCaptor.forClass(List.class);
        verify(patrimoineTargetRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
        assertThat(captor.getValue().get(0).getCategory()).isEqualTo("BOURSE");
    }

    @Test
    void saveTargets_avecMapNulle_supprimeTousLesObjectifs() {
        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of());

        Map<String, Double> result = patrimoineTargetService.saveTargets(user, null);

        verify(patrimoineTargetRepository).deleteByUser(user);
        verify(patrimoineTargetRepository, never()).saveAll(any());
        assertThat(result).isEmpty();
    }

    @Test
    void saveTargets_retourneLaMapMiseAJour() {
        Map<String, Double> targets = Map.of("CRYPTO", 5000.0);

        when(patrimoineTargetRepository.findByUser(user)).thenReturn(List.of(
                PatrimoineTarget.builder().id(1L).user(user).category("CRYPTO").targetAmountEur(5000.0).build()
        ));

        Map<String, Double> result = patrimoineTargetService.saveTargets(user, targets);

        assertThat(result).containsEntry("CRYPTO", 5000.0);
    }
}
