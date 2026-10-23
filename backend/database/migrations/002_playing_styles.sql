CREATE TABLE IF NOT EXISTS PLAYING_STYLES (
  ID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  NAME VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_playing_style_name (NAME)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO PLAYING_STYLES (NAME) VALUES
('Goal Poacher'), ('Dummy Runner'), ('Fox in the Box'), ('Target Man'),
('Deep-Lying Forward'), ('Creative Playmaker'), ('Prolific Winger'),
('Roaming Flank'), ('Cross Specialist'), ('Classic No. 10'), ('Hole Player'),
('Box-to-Box'), ('The Destroyer'), ('Orchestrator'), ('Anchor Man'),
('Build Up'), ('Extra Frontman'), ('Offensive Full-back'), ('Full-back Finisher'),
('Defensive Full-back'), ('Offensive Goalkeeper'), ('Defensive Goalkeeper');

ALTER TABLE ASSIGNMENTS
  ADD COLUMN PLAYING_STYLE_ID INT UNSIGNED NULL,
  ADD CONSTRAINT fk_assignment_playing_style FOREIGN KEY (PLAYING_STYLE_ID)
    REFERENCES PLAYING_STYLES(ID) ON DELETE RESTRICT;
