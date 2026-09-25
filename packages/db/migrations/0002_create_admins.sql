CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  staff_number VARCHAR(50) NOT NULL,
  role ENUM('super_admin', 'admin', 'staff') NOT NULL DEFAULT 'staff',
  position VARCHAR(100) NULL,
  phone_number VARCHAR(20) NULL,
  photo_url VARCHAR(500) NULL,
  institutional_email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_staff_number (staff_number),
  UNIQUE KEY uq_admins_email (institutional_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
