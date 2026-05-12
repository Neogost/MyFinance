package com.myfinance.domain;

/** Type de bien donné, conditionne les taxes notariales additionnelles. */
public enum BienType {
    MOBILIER,    // espèces, titres, meubles — émoluments + formalités
    IMMOBILIER   // bien immobilier — ajout taxe publicité foncière + CSI
}
