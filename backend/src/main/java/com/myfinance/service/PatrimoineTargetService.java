package com.myfinance.service;

import com.myfinance.domain.PatrimoineTarget;
import com.myfinance.domain.User;
import com.myfinance.repository.PatrimoineTargetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatrimoineTargetService {

    private final PatrimoineTargetRepository patrimoineTargetRepository;

    public Map<String, Double> getTargets(User user) {
        return patrimoineTargetRepository.findByUser(user)
                .stream()
                .collect(Collectors.toMap(PatrimoineTarget::getCategory, PatrimoineTarget::getTargetAmountEur));
    }

    @Transactional
    public Map<String, Double> saveTargets(User user, Map<String, Double> targets) {
        patrimoineTargetRepository.deleteByUser(user);

        if (targets != null) {
            var toSave = targets.entrySet().stream()
                    .filter(e -> e.getValue() != null && e.getValue() > 0)
                    .map(e -> PatrimoineTarget.builder()
                            .user(user)
                            .category(e.getKey())
                            .targetAmountEur(e.getValue())
                            .build())
                    .toList();
            patrimoineTargetRepository.saveAll(toSave);
        }

        return getTargets(user);
    }
}
