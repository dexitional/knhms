CREATE TABLE IF NOT EXISTS seller_billing_settings (
  id TINYINT UNSIGNED NOT NULL,
  business_registration_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  business_monthly_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  food_vendor_registration_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  food_vendor_monthly_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_instructions VARCHAR(1000) NULL,
  updated_by INT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_seller_billing_settings_single_row CHECK (id = 1),
  CONSTRAINT fk_seller_billing_settings_updated_by FOREIGN KEY (updated_by) REFERENCES admins (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
