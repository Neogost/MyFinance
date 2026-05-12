package com.myfinance.domain;

/**
 * Type d'union conjugale — pertinent uniquement quand FamilyRelationEnum = CONJOINT.
 * Détermine les droits successoraux et fiscaux.
 */
public enum UnionType {
    MARIAGE,       // Mariage civil — héritier légal (1/4 PP ou 100% usufruit) + exonération
    PACS,          // PACS — exonéré mais pas héritier légal sans testament
    CONCUBINAGE    // Union libre — pas d'héritage par défaut, droits 60% si testament
}
