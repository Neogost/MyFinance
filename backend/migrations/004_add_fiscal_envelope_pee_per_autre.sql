-- Migration 004 : ajout des enveloppes fiscales PEE_PERCO, PER, AUTRE
-- SQLite ne supporte pas ALTER TABLE ... MODIFY CONSTRAINT
-- → recréation de la table positions avec la contrainte CHECK étendue

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- 1. Nouvelle table avec contrainte étendue
CREATE TABLE positions_new (
    id                         integer,
    annual_rate                numeric(38,2),
    category                   varchar(255) not null check (category in ('BOURSE','CRYPTO','IMMO_PAPIER','IMMO_PHYSIQUE','LIVRET','LIQUIDITE')),
    created_at                 timestamp    not null,
    currency                   varchar(255) not null,
    current_balance            numeric(38,2),
    fiscal_envelope            varchar(255) check (fiscal_envelope in ('CTO','PEA','AV','FLAT_TAX','PEE_PERCO','PER','AUTRE','NONE')),
    include_in_income_projection boolean    not null,
    label                      varchar(255) not null,
    partner                    varchar(255),
    status                     varchar(255) not null check (status in ('ACTIVE','CLOSED')),
    user_id                    bigint       not null,
    address                    varchar(255),
    asset_sub_type             varchar(255) check (asset_sub_type in ('ETF','ACTION','OBLIGATION','FOREX','WARRANT','FONDS_EUROS','TRACKERS','SCPI')),
    commission_rate            numeric(38,2),
    estimated_current_value    numeric(38,2),
    ownership_type             varchar(255) check (ownership_type in ('PLEINE_PROPRIETE','NUE_PROPRIETE','USUFRUIT')),
    instrument_id              bigint,
    acquisition_date           date,
    acquisition_price          DOUBLE,
    primary key (id)
);

-- 2. Copie des données
INSERT INTO positions_new SELECT * FROM positions;

-- 3. Suppression de l'ancienne table
DROP TABLE positions;

-- 4. Renommage
ALTER TABLE positions_new RENAME TO positions;

COMMIT;

PRAGMA foreign_keys = ON;
