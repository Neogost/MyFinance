package com.myfinance.repository;

import com.myfinance.domain.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {

    Optional<ExchangeRate> findByCurrency(String currency);

    List<ExchangeRate> findAllByOrderByCurrencyAsc();
}
