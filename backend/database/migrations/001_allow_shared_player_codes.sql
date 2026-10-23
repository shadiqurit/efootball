-- Only for databases created with the old uq_player_code index.
-- PLAYER_ID is the identity; different players may share name-derived codes.
ALTER TABLE PLAYERS DROP INDEX uq_player_code, ADD INDEX ix_player_code (PLAYER_CODE);
