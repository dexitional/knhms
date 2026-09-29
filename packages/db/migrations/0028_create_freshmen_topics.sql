CREATE TABLE IF NOT EXISTS freshmen_topics (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  body MEDIUMTEXT NULL,
  layout ENUM('text', 'steps', 'cards') NOT NULL DEFAULT 'text',
  items JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_freshmen_topics_section (section_id, sort_order),
  CONSTRAINT fk_freshmen_topics_section FOREIGN KEY (section_id) REFERENCES freshmen_sections (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
