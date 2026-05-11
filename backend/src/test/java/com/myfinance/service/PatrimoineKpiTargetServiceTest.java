package com.myfinance.service;

import com.myfinance.domain.KpiType;
import com.myfinance.domain.PatrimoineKpiTarget;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.SaveKpiTargetsRequest;
import com.myfinance.repository.PatrimoineKpiTargetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatrimoineKpiTargetServiceTest {

    @Mock PatrimoineKpiTargetRepository repository;
    @InjectMocks PatrimoineKpiTargetService service;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("test").role(RoleEnum.USER).build();
    }

    // ── getTargets ────────────────────────────────────────────────────────────

    @Test
    void getTargets_retourneMapVideQuandAucuneCible() {
        when(repository.findByUser(user)).thenReturn(List.of());

        Map<KpiType, Double> result = service.getTargets(user);

        assertThat(result).isEmpty();
    }

    @Test
    void getTargets_retourneToutesLesCiblesConfigurees() {
        when(repository.findByUser(user)).thenReturn(List.of(
                PatrimoineKpiTarget.builder().kpiType(KpiType.IMMO_RENDEMENT_BRUT).targetValue(5.0).build(),
                PatrimoineKpiTarget.builder().kpiType(KpiType.IMMO_LTV).targetValue(60.0).build()));

        Map<KpiType, Double> result = service.getTargets(user);

        assertThat(result)
                .containsEntry(KpiType.IMMO_RENDEMENT_BRUT, 5.0)
                .containsEntry(KpiType.IMMO_LTV, 60.0)
                .hasSize(2);
    }

    // ── saveTargets : remplacement complet ────────────────────────────────────

    @Test
    void saveTargets_supprimeLesAnciennesAvantSauvegarde() {
        SaveKpiTargetsRequest req = new SaveKpiTargetsRequest(Map.of(
                KpiType.IMMO_RENDEMENT_BRUT, 4.5));
        when(repository.findByUser(user)).thenReturn(List.of(
                PatrimoineKpiTarget.builder().kpiType(KpiType.IMMO_RENDEMENT_BRUT).targetValue(4.5).build()));

        service.saveTargets(user, req);

        verify(repository).deleteByUser(user);
        verify(repository).saveAll(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void saveTargets_filtreLesValeursNegativesEtNull() {
        Map<KpiType, Double> targets = new HashMap<>();
        targets.put(KpiType.IMMO_RENDEMENT_BRUT, 4.0);
        targets.put(KpiType.IMMO_LTV, -10.0);   // négatif → exclu
        targets.put(KpiType.IMMO_PAPIER_RENDEMENT, null);  // null → exclu
        SaveKpiTargetsRequest req = new SaveKpiTargetsRequest(targets);
        when(repository.findByUser(user)).thenReturn(List.of(
                PatrimoineKpiTarget.builder().kpiType(KpiType.IMMO_RENDEMENT_BRUT).targetValue(4.0).build()));

        service.saveTargets(user, req);

        ArgumentCaptor<List<PatrimoineKpiTarget>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .hasSize(1)  // seul IMMO_RENDEMENT_BRUT passe le filtre
                .extracting(PatrimoineKpiTarget::getKpiType)
                .containsExactly(KpiType.IMMO_RENDEMENT_BRUT);
    }

    @Test
    void saveTargets_requestNull_supprimeSansSauvegarder() {
        when(repository.findByUser(user)).thenReturn(List.of());

        Map<KpiType, Double> result = service.saveTargets(user, null);

        verify(repository).deleteByUser(user);
        verify(repository, never()).saveAll(any());
        assertThat(result).isEmpty();
    }

    @Test
    void saveTargets_requestAvecTargetsNull_supprimeSansSauvegarder() {
        SaveKpiTargetsRequest req = new SaveKpiTargetsRequest(null);
        when(repository.findByUser(user)).thenReturn(List.of());

        service.saveTargets(user, req);

        verify(repository).deleteByUser(user);
        verify(repository, never()).saveAll(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void saveTargets_targetZero_acceptee() {
        // 0 est valide (≥ 0)
        SaveKpiTargetsRequest req = new SaveKpiTargetsRequest(Map.of(KpiType.IMMO_LTV, 0.0));
        when(repository.findByUser(user)).thenReturn(List.of(
                PatrimoineKpiTarget.builder().kpiType(KpiType.IMMO_LTV).targetValue(0.0).build()));

        service.saveTargets(user, req);

        ArgumentCaptor<List<PatrimoineKpiTarget>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
    }
}
