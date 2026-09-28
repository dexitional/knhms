CREATE TABLE IF NOT EXISTS seller_payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id INT UNSIGNED NOT NULL,
  kind ENUM('registration', 'monthly') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  months TINYINT UNSIGNED NULL,
  covers_from DATE NULL,
  covers_to DATE NULL,
  method ENUM('momo', 'cash', 'bank', 'other') NOT NULL,
  reference VARCHAR(100) NULL,
  note VARCHAR(255) NULL,
  recorded_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_seller_payments_seller (seller_id, created_at),
  CONSTRAINT fk_seller_payments_seller FOREIGN KEY (seller_id) REFERENCES sellers (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_seller_payments_recorded_by FOREIGN KEY (recorded_by) REFERENCES admins (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
