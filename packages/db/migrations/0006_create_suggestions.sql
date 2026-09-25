CREATE TABLE IF NOT EXISTS suggestions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  subject VARCHAR(150) NULL,
  message TEXT NOT NULL,
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('new', 'reviewed') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_suggestions_student (student_id),
  CONSTRAINT fk_suggestions_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
