package com.myfinance.service;

import com.myfinance.domain.KpiType;
import com.myfinance.domain.PatrimoineKpiTarget;
import com.myfinance.domain.User;
import com.myfinance.dto.SaveKpiTargetsRequest;
import com.myfinance.repository.PatrimoineKpiTargetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PatrimoineKpiTargetService {

    private final PatrimoineKpiTargetRepository repository;

    public Map<KpiType, Double> getTargets(User user) {
        return repository.findByUser(user).stream()
                .collect(Collectors.toMap(PatrimoineKpiTarget::getKpiType, PatrimoineKpiTarget::getTargetValue));
    }

    @Transactional
    public Map<KpiType, Double> saveTargets(User user, SaveKpiTargetsRequest request) {
        repository.deleteByUser(user);

        if (request != null && request.targets() != null) {
            var toSave = request.targets().entrySet().stream()
                    .filter(e -> e.getKey() != null && e.getValue() != null && e.getValue() >= 0)
                    .map(e -> PatrimoineKpiTarget.builder()
                            .user(user)
                            .kpiType(e.getKey())
                            .targetValue(e.getValue())
                            .build())
                    .toList();
            repository.saveAll(toSave);
        }

        Map<KpiType, Double> result = getTargets(user);
        log.info("[user:{}] Objectifs KPI mis à jour - {} KPI(s)", user.getId(), result.size());
        return result;
    }
}
