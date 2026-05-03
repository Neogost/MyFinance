package com.myfinance.service;

import com.myfinance.domain.ExchangeRate;
import com.myfinance.domain.PositionOrder;
import com.myfinance.dto.MigrateAmountEurReport;
import com.myfinance.repository.ExchangeRateRepository;
import com.myfinance.repository.PositionOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Migration one-shot des champs amountEur incorrects sur PositionOrder.
 * Bug historique : createOrder() et updateOrder() assignaient amountEur = amount
 * sans appliquer le taux de change, laissant le montant en devise native.
 * Ce service recalcule amountEur = amount / exchange_rate_history(currency, orderDate).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MigrateAmountEurService {

    private static final int MAX_SAMPLES = 10;

    private final PositionOrderRepository orderRepository;
    private final ExchangeRateHistoryService rateHistoryService;
    private final ExchangeRateRepository exchangeRateRepository;

    /**
     * @param dryRun si true, analyse sans rien modifier en base.
     * @return rapport détaillant les ordres examinés, à mettre à jour, mis à jour et fallbacks.
     */
    public MigrateAmountEurReport migrate(boolean dryRun) {
        log.info("[MigrateAmountEur] Démarrage {} — dryRun={}", dryRun ? "(simulation)" : "(réel)", dryRun);

        List<PositionOrder> nonEurOrders = orderRepository.findAllNonEurOrders();
        int examined = nonEurOrders.size();
        int toUpdate = 0, updated = 0, fallbacks = 0;
        List<String> samples = new ArrayList<>();

        for (PositionOrder order : nonEurOrders) {
            String currency = order.getPosition().getCurrency();
            boolean[] usedFallback = {false};
            BigDecimal newAmountEur = computeAmountEur(order, currency, usedFallback);
            if (usedFallback[0]) fallbacks++;

            boolean changed = newAmountEur.compareTo(order.getAmountEur()) != 0;

            if (changed) {
                toUpdate++;
                if (samples.size() < MAX_SAMPLES) {
                    samples.add(String.format(
                            "Ordre #%d (position #%d, %s, %s) : amountEur %s → %s",
                            order.getId(), order.getPosition().getId(),
                            currency, order.getOrderDate(),
                            order.getAmountEur().toPlainString(), newAmountEur.toPlainString()
                    ));
                }
                if (!dryRun) {
                    order.setAmountEur(newAmountEur);
                    orderRepository.save(order);
                    updated++;
                }
            }
        }

        log.info("[MigrateAmountEur] {} ordres examinés, {} à corriger, {} corrigés, {} fallbacks taux courant",
                examined, toUpdate, updated, fallbacks);

        return new MigrateAmountEurReport(dryRun, examined, toUpdate, updated, fallbacks, samples);
    }

    private BigDecimal computeAmountEur(PositionOrder order, String currency, boolean[] usedFallback) {
        Optional<BigDecimal> historicRate = rateHistoryService.getRateAt(currency, order.getOrderDate());
        if (historicRate.isPresent()) {
            return order.getAmount().divide(historicRate.get(), 4, RoundingMode.HALF_UP);
        }
        // Fallback : taux courant
        usedFallback[0] = true;
        BigDecimal currentRate = exchangeRateRepository.findByCurrency(currency)
                .map(ExchangeRate::getRate)
                .orElse(BigDecimal.ONE);
        log.warn("[MigrateAmountEur] Taux historique {} absent au {}, fallback taux courant ({})",
                currency, order.getOrderDate(), currentRate);
        return order.getAmount().divide(currentRate, 4, RoundingMode.HALF_UP);
    }
}
