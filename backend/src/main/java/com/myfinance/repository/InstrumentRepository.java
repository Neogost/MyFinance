package com.myfinance.repository;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InstrumentRepository extends JpaRepository<Instrument, Long> {

    List<Instrument> findByCategoryOrderByNameAsc(AssetCategory category);

    Optional<Instrument> findByIsin(String isin);

    Optional<Instrument> findByTicker(String ticker);

    boolean existsByIsin(String isin);

    boolean existsByTicker(String ticker);

    /** Recherche libre sur isin, ticker ou name (insensible à la casse) */
    @Query("""
            SELECT i FROM Instrument i
            WHERE LOWER(CAST(i.isin AS string)) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(CAST(i.ticker AS string)) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(i.name) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY i.name ASC
            """)
    List<Instrument> searchByQuery(@Param("q") String q);

    /** Recherche filtrée par catégorie */
    @Query("""
            SELECT i FROM Instrument i
            WHERE i.category = :category
              AND (LOWER(CAST(i.isin AS string)) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(CAST(i.ticker AS string)) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(i.name) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY i.name ASC
            """)
    List<Instrument> searchByQueryAndCategory(@Param("q") String q, @Param("category") AssetCategory category);

    /** Instruments liés à au moins une position ACTIVE — utilisés pour la mise à jour manuelle des cours */
    @Query("""
            SELECT DISTINCT i FROM Instrument i
            JOIN Position p ON p.instrument = i
            WHERE p.status = 'ACTIVE'
            ORDER BY i.category ASC, i.name ASC
            """)
    List<Instrument> findAllWithActivePositions();
}
