package com.myfinance.repository;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.domain.Position;
import com.myfinance.domain.PositionOrder;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PositionOrderRepository extends JpaRepository<PositionOrder, Long> {

    List<PositionOrder> findByPositionOrderByOrderDateDesc(Position position);

    void deleteByPosition(Position position);

    /** Charge tous les ordres d'une liste de positions en une seule requête, triés par date croissante. */
    @Query("SELECT po FROM PositionOrder po WHERE po.position IN :positions ORDER BY po.orderDate ASC")
    List<PositionOrder> findByPositionInOrderByOrderDateAsc(@Param("positions") List<Position> positions);

    /** Tous les ordres dont la position est libellée dans une devise non-EUR (pour la migration amountEur). */
    @Query("SELECT po FROM PositionOrder po WHERE po.position.currency IS NOT NULL AND po.position.currency != 'EUR' ORDER BY po.orderDate ASC")
    List<PositionOrder> findAllNonEurOrders();

    /** Date du premier ordre sur toutes les positions utilisant un instrument donné (pour borner le backfill). */
    @Query("SELECT MIN(po.orderDate) FROM PositionOrder po WHERE po.position.instrument = :instrument")
    Optional<LocalDate> findMinOrderDateByInstrument(@Param("instrument") Instrument instrument);

    /** Premier ordre par instrument (toutes positions) — pour l'UI admin (résumé global). */
    @Query("SELECT po.position.instrument.id, MIN(po.orderDate) FROM PositionOrder po WHERE po.position.instrument IS NOT NULL GROUP BY po.position.instrument.id")
    List<Object[]> findMinOrderDatesGroupedByInstrument();

    /** Tous les ordres CRYPTO d'un utilisateur avec cryptoOperationType renseigné, triés chronologiquement.
     *  Utilisé par CryptoTaxService pour calculer le PTA et les plus-values. */
    @Query("SELECT po FROM PositionOrder po " +
           "WHERE po.position.user = :user " +
           "AND po.position.category = :category " +
           "AND po.cryptoOperationType IS NOT NULL " +
           "ORDER BY po.orderDate ASC, po.id ASC")
    List<PositionOrder> findCryptoOperationsByUserOrderByDateAsc(
            @Param("user") User user,
            @Param("category") AssetCategory category);

    /** Dates des ordres BUY sur BOURSE et CRYPTO pour un utilisateur — pour le calcul du DCA-Master streak mensuel. */
    @Query("SELECT po.orderDate FROM PositionOrder po WHERE po.position.user = :user AND po.orderType = com.myfinance.domain.OrderType.BUY AND po.position.category IN (com.myfinance.domain.AssetCategory.BOURSE, com.myfinance.domain.AssetCategory.CRYPTO) ORDER BY po.orderDate ASC")
    List<java.time.LocalDate> findBuyDatesForBourseOrCrypto(@Param("user") User user);

    /** Somme des montants d'un type d'ordre dans une enveloppe fiscale donnée — pour PATRIOTE_PEA. */
    @Query("SELECT COALESCE(SUM(po.amountEur), 0) FROM PositionOrder po WHERE po.position.user = :user AND po.position.fiscalEnvelope = :envelope AND po.orderType = :orderType")
    java.math.BigDecimal sumAmountByEnvelopeAndOrderType(
            @Param("user") User user,
            @Param("envelope") com.myfinance.domain.FiscalEnvelope envelope,
            @Param("orderType") com.myfinance.domain.OrderType orderType);
}
