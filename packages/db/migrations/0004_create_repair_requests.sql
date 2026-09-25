CREATE TABLE IF NOT EXISTS repair_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  room_id INT UNSIGNED NOT NULL,
  category VARCHAR(50) NULL,
  description TEXT NOT NULL,
  status ENUM('pending', 'approved', 'assigned', 'completed') NOT NULL DEFAULT 'pending',
  assigned_admin_id INT UNSIGNED NULL,
  student_remarks TEXT NULL,
  admin_remarks TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repair_status (status),
  KEY idx_repair_student (student_id),
  CONSTRAINT fk_repair_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_repair_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_repair_admin FOREIGN KEY (assigned_admin_id) REFERENCES admins (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
